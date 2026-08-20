import time
from pathlib import Path
from typing import Any, Generator

import joblib
import pandas as pd


class MLService:

    def __init__(self):

        # =====================================================
        # MODEL
        # =====================================================

        self.model_loaded = False

        self.model_version = "final-fraud-model-v1"

        # =====================================================
        # FRAUD DECISION THRESHOLDS
        # =====================================================

        # Optimal F1-maximized threshold from model training: ~0.9229
        # Probability >= 0.9229 -> HIGH / FRAUD ALERT
        # Probability >= 0.50   -> MEDIUM / REVIEW
        # Probability < 0.50    -> LOW / APPROVE

        self.FRAUD_THRESHOLD = 0.9229

        self.REVIEW_THRESHOLD = 0.50

        # =====================================================
        # PROJECT PATHS
        # =====================================================

        self.project_root = Path(__file__).resolve().parents[3]

        self.backend_dir = Path(__file__).resolve().parents[2]

        self.model_candidates = [

            self.project_root
            / "models"
            / "final_fraud_model.pkl",

            self.backend_dir
            / "models"
            / "final_fraud_model.pkl",
        ]

        self.model_path = next(

            (
                path
                for path in self.model_candidates
                if path.exists()
            ),

            self.model_candidates[0],
        )

        # =====================================================
        # DATA PATH
        # =====================================================

        self.training_data = None

        self.data_path = (

            self.project_root
            / "backend"
            / "data"
            / "fraud_transactions_100k_adjusted_ml_ready.csv"
        )

        if not self.data_path.exists():

            self.data_path = (

                self.backend_dir
                / "data"
                / "fraud_transactions_100k_adjusted_ml_ready.csv"
            )

        # =====================================================
        # MODEL STATE
        # =====================================================

        self.model = None

        self.model_load_error = None

        # =====================================================
        # DASHBOARD / STREAM STORAGE
        # =====================================================

        self.recent_transactions: list[
            dict[str, Any]
        ] = []

        self.stream_transactions: list[
            dict[str, Any]
        ] = []

        self.total_transactions_processed = 0

        self.total_fraud_processed = 0

        # =====================================================
        # REAL TIME PERFORMANCE
        # =====================================================

        self.LATENCY_LIMIT_MS = 50.0

        self.latency_history: list[float] = []

        self.max_latency_history = 10000

        self.sla_violations = 0

        self.total_stream_transactions = 0

        self.stream_start_time: float | None = None

        self.last_transaction_time: float | None = None

        # =====================================================
        # STREAMING STATE
        # =====================================================

        self.stream_index = 0

        self.streaming_generator = None

        # =====================================================
        # MODEL FEATURES
        # =====================================================

        self.feature_names = [

            "amount",

            "transaction_type",

            "merchant_category",

            "currency",

            "avg_transaction_amount",

            "transactions_last_1h",

            "transactions_last_24h",

            "time_since_last_transaction",

            "usual_transaction_hour",

            "customer_home_city",

            "transaction_city",

            "distance_from_home_km",

            "international",

            "known_device",

            "device_change_count",

            "previous_transactions_with_merchant",

            "new_merchant",

            "merchant_risk_zone",

            "card_age_days",

            "account_age_days",

            "failed_transaction_count",

            "successful_transaction_count",

            "cash_withdrawal_count",

            "international_transaction_count",

            "device_risk_score",

            "merchant_risk_score",

            "previous_fraud_count",

            "account_risk_score",

            "velocity_risk_score",

            "location_risk_score",

            "transaction_hour",

            "hour_deviation",

            "amount_to_average_ratio",

            "rapid_transaction_flag",

            "cross_border_risk",
        ]

    # =========================================================
    # LATENCY
    # =========================================================

    def _record_latency(
        self,
        latency_ms: float,
    ):

        latency_ms = float(latency_ms)

        self.latency_history.append(
            latency_ms
        )

        if (
            len(self.latency_history)
            > self.max_latency_history
        ):

            self.latency_history.pop(0)

        if (
            latency_ms
            > self.LATENCY_LIMIT_MS
        ):

            self.sla_violations += 1

    # =========================================================
    # PERCENTILE
    # =========================================================

    def _percentile(
        self,
        values: list[float],
        percentile: float,
    ) -> float:

        if not values:
            return 0.0

        sorted_values = sorted(values)

        index = int(
            (
                percentile
                / 100
            )
            * len(sorted_values)
        )

        index = max(
            0,
            min(
                index,
                len(sorted_values) - 1,
            ),
        )

        return float(
            sorted_values[index]
        )

    # =========================================================
    # LATENCY STATISTICS
    # =========================================================

    def get_latency_statistics(self):

        if not self.latency_history:

            return {

                "avg_latency_ms": 0.0,

                "min_latency_ms": 0.0,

                "max_latency_ms": 0.0,

                "p50_latency_ms": 0.0,

                "p95_latency_ms": 0.0,

                "p99_latency_ms": 0.0,

                "latency_limit_ms":
                    self.LATENCY_LIMIT_MS,

                "sla_violations": 0,

                "sla_compliance_percent":
                    100.0,
            }

        values = self.latency_history

        average = (
            sum(values)
            / len(values)
        )

        violations = sum(

            1

            for value in values

            if value
            > self.LATENCY_LIMIT_MS
        )

        compliance = (

            (
                len(values)
                - violations
            )
            / len(values)

        ) * 100

        return {

            "avg_latency_ms": round(
                average,
                3,
            ),

            "min_latency_ms": round(
                min(values),
                3,
            ),

            "max_latency_ms": round(
                max(values),
                3,
            ),

            "p50_latency_ms": round(
                self._percentile(
                    values,
                    50,
                ),
                3,
            ),

            "p95_latency_ms": round(
                self._percentile(
                    values,
                    95,
                ),
                3,
            ),

            "p99_latency_ms": round(
                self._percentile(
                    values,
                    99,
                ),
                3,
            ),

            "latency_limit_ms":
                self.LATENCY_LIMIT_MS,

            "sla_violations":
                self.sla_violations,

            "sla_compliance_percent":
                round(
                    compliance,
                    2,
                ),
        }

    # =========================================================
    # THROUGHPUT
    # =========================================================

    def get_throughput(self) -> float:

        if (

            self.stream_start_time
            is None

            or self.total_stream_transactions
            == 0

        ):

            return 0.0

        elapsed = (

            time.perf_counter()
            - self.stream_start_time
        )

        if elapsed <= 0:
            return 0.0

        return (

            self.total_stream_transactions
            / elapsed
        )

    # =========================================================
    # REAL TIME STATISTICS
    # =========================================================

    def get_realtime_statistics(self):

        latency_stats = (
            self.get_latency_statistics()
        )

        current_latency = 0.0

        if self.latency_history:

            current_latency = (
                self.latency_history[-1]
            )

        return {

            **latency_stats,

            "current_latency_ms":
                round(
                    current_latency,
                    3,
                ),

            "throughput_tps":
                round(
                    self.get_throughput(),
                    2,
                ),

            "total_stream_transactions":
                self.total_stream_transactions,

            "high_risk_transactions":
                sum(

                    1

                    for x
                    in self.stream_transactions

                    if x.get(
                        "risk_level"
                    )
                    == "HIGH"
                ),

            "real_time_status":

                (
                    "PASS"

                    if current_latency
                    <= self.LATENCY_LIMIT_MS

                    else "SLOW"
                ),

            "fraud_threshold":
                self.FRAUD_THRESHOLD,

            "review_threshold":
                self.REVIEW_THRESHOLD,
        }

    # =========================================================
    # RESET STREAM
    # =========================================================

    def reset_stream(self):

        self.stream_index = 0

        self.streaming_generator = None

        self.stream_transactions = []

        self.total_stream_transactions = 0

        self.sla_violations = 0

        self.latency_history = []

        self.stream_start_time = None

        self.last_transaction_time = None

        print(
            "[STREAM] Stream reset"
        )

    # =========================================================
    # GENERATOR
    # =========================================================

    def transaction_generator(
        self,
    ) -> Generator[
        dict[str, Any],
        None,
        None,
    ]:

        if (

            self.training_data is None

            or self.training_data.empty
        ):

            return

        total_rows = len(
            self.training_data
        )

        while True:

            index = (

                self.stream_index
                % total_rows
            )

            row = (
                self.training_data.iloc[
                    index
                ]
            )

            tx = (
                self._row_to_transaction(
                    row,
                    index,
                )
            )

            self.stream_index += 1

            yield tx

    # =========================================================
    # ROW TO TRANSACTION
    # =========================================================

    def _row_to_transaction(
        self,
        row: pd.Series,
        index: int,
    ) -> dict[str, Any]:

        return {

            "transaction_id":
                str(
                    row.get(
                        "transaction_id",
                        f"STREAM-{index + 1:06d}",
                    )
                ),

            "account_id":
                str(
                    row.get(
                        "account_id",
                        f"AC-{index + 1:05d}",
                    )
                ),

            "timestamp":
                str(
                    row.get(
                        "timestamp",
                        "2024-01-01T00:00:00Z",
                    )
                ),

            "amount":
                float(
                    row.get(
                        "amount",
                        0.0,
                    )
                    or 0.0
                ),

            "merchant_category":
                str(
                    row.get(
                        "merchant_category",
                        "Other",
                    )
                    or "Other"
                ),

            "country":
                str(
                    row.get(
                        "country",
                        "IN",
                    )
                    or "IN"
                ),

            "avg_amount_7d":
                float(
                    row.get(
                        "avg_amount_7d",
                        row.get(
                            "amount",
                            0.0,
                        )
                        or 0.0,
                    )
                    or 0.0
                ),

            "is_new_device":
                bool(
                    row.get(
                        "is_new_device",
                        0,
                    )
                ),

            "international":
                bool(
                    row.get(
                        "international",
                        0,
                    )
                ),

            "is_night":
                bool(
                    row.get(
                        "is_night",
                        0,
                    )
                ),

            "transactions_last_1h":
                int(
                    row.get(
                        "transactions_last_1h",
                        0,
                    )
                    or 0
                ),

            "transactions_last_24h":
                int(
                    row.get(
                        "transactions_last_24h",
                        0,
                    )
                    or 0
                ),

            "device_risk_score":
                float(
                    row.get(
                        "device_risk_score",
                        0.0,
                    )
                    or 0.0
                ),

            "merchant_risk_score":
                float(
                    row.get(
                        "merchant_risk_score",
                        0.0,
                    )
                    or 0.0
                ),

            "previous_fraud_count":
                int(
                    row.get(
                        "previous_fraud_count",
                        0,
                    )
                    or 0
                ),

            "failed_attempts_24h":
                int(
                    row.get(
                        "failed_attempts_24h",
                        0,
                    )
                    or 0
                ),

            "card_age_days":
                int(
                    row.get(
                        "card_age_days",
                        365,
                    )
                    or 365
                ),

            "account_age_days":
                int(
                    row.get(
                        "account_age_days",
                        540,
                    )
                    or 540
                ),

            "transaction_hour":
                int(
                    row.get(
                        "transaction_hour",
                        22
                        if bool(
                            row.get(
                                "is_night",
                                0,
                            )
                        )
                        else 14,
                    )
                ),
        }

    # =========================================================
    # COMPATIBILITY
    # =========================================================

    def _ensure_compatibility(self):

        try:

            import sklearn.compose._column_transformer as column_transformer

            if not hasattr(
                column_transformer,
                "_RemainderColsList",
            ):

                class _RemainderColsList(
                    list
                ):
                    pass

                column_transformer._RemainderColsList = (
                    _RemainderColsList
                )

        except Exception:

            pass

    # =========================================================
    # LOAD MODEL + DATA
    # =========================================================

    def load(self):

        self._ensure_compatibility()

        self.model_loaded = False

        self.model = None

        self.model_load_error = None

        # =====================================================
        # LOAD MODEL
        # =====================================================

        if self.model_path.exists():

            try:

                self.model = joblib.load(
                    self.model_path
                )

                self.model_loaded = True

                print(
                    "[OK] Loaded trained fraud model: "
                    f"{self.model_path}"
                )

                print(
                    "[OK] Model type: "
                    f"{type(self.model).__name__}"
                )

                if hasattr(
                    self.model,
                    "feature_names_in_",
                ):

                    print(
                        "[OK] Model features: "
                        f"{list(self.model.feature_names_in_)}"
                    )

            except Exception as exc:

                self.model_load_error = exc

                print(
                    "[WARNING] Model loading failed: "
                    f"{exc}"
                )

        else:

            print(
                "[WARNING] Model not found: "
                f"{self.model_path}"
            )

        # =====================================================
        # LOAD DATA
        # =====================================================

        if self.data_path.exists():

            self.training_data = (
                pd.read_csv(
                    self.data_path
                )
            )

            print(
                "[OK] Loaded training data: "
                f"{len(self.training_data)} records"
            )

        else:

            print(
                "[WARNING] Training data not found: "
                f"{self.data_path}"
            )

    # =========================================================
    # MODEL FEATURES
    # =========================================================

    def _build_model_features(
        self,
        transaction: dict[str, Any],
    ) -> dict[str, Any]:

        amount = self._get_numeric(
            transaction,
            "amount",
            0.0,
        )

        avg_amount = self._get_numeric(
            transaction,
            "avg_amount_7d",
            amount,
        )

        transactions_last_1h = (
            self._get_int(
                transaction,
                "transactions_last_1h",
                0,
            )
        )

        transactions_last_24h = (
            self._get_int(
                transaction,
                "transactions_last_24h",
                max(
                    transactions_last_1h * 3,
                    1,
                ),
            )
        )

        country = str(
            transaction.get(
                "country"
            )
            or "IN"
        )

        merchant = str(
            transaction.get(
                "merchant_category"
            )
            or "Other"
        )

        is_new_device = bool(
            transaction.get(
                "is_new_device"
            )
        )

        is_international = bool(
            transaction.get(
                "international"
            )
        )

        is_night = bool(
            transaction.get(
                "is_night"
            )
        )

        device_risk = (
            self._get_numeric(
                transaction,
                "device_risk_score",
                0.0,
            )
        )

        merchant_risk = (
            self._get_numeric(
                transaction,
                "merchant_risk_score",
                0.0,
            )
        )

        transaction_hour = (
            self._get_int(
                transaction,
                "transaction_hour",
                22 if is_night else 14,
            )
        )

        usual_hour = (
            self._get_int(
                transaction,
                "usual_transaction_hour",
                14 if not is_night else 22,
            )
        )

        home_city = (
            self._infer_city(
                country,
                str(
                    transaction.get(
                        "account_id"
                    )
                    or "AC-1000"
                ),
            )
        )

        current_city = home_city

        amount_ratio = (

            amount / avg_amount

            if avg_amount > 0

            else 1.0
        )

        return {

            "amount":
                amount,

            "transaction_type":
                (
                    "POS"

                    if merchant
                    not in {
                        "ATM",
                        "Cash Withdrawal",
                    }

                    else "ATM"
                ),

            "merchant_category":
                merchant,

            "currency":
                self._infer_currency(
                    country
                ),

            "avg_transaction_amount":
                avg_amount,

            "transactions_last_1h":
                transactions_last_1h,

            "transactions_last_24h":
                transactions_last_24h,

            "time_since_last_transaction":
                max(
                    0.0,
                    60.0
                    - (
                        transactions_last_1h
                        * 8.0
                    ),
                ),

            "usual_transaction_hour":
                usual_hour,

            "customer_home_city":
                home_city,

            "transaction_city":
                current_city,

            "distance_from_home_km":
                (
                    0.0

                    if not is_international

                    else 2500.0
                ),

            "international":
                (
                    1
                    if is_international
                    else 0
                ),

            "known_device":
                (
                    0
                    if is_new_device
                    else 1
                ),

            "device_change_count":
                (
                    1
                    if is_new_device
                    else 0
                ),

            "previous_transactions_with_merchant":
                max(
                    0,
                    transactions_last_1h - 1,
                ),

            "new_merchant":
                0,

            "merchant_risk_zone":
                (
                    "High"

                    if merchant_risk >= 70

                    else (
                        "Medium"

                        if merchant_risk >= 40

                        else "Low"
                    )
                ),

            "card_age_days":
                self._get_int(
                    transaction,
                    "card_age_days",
                    365,
                ),

            "account_age_days":
                self._get_int(
                    transaction,
                    "account_age_days",
                    540,
                ),

            "failed_transaction_count":
                self._get_int(
                    transaction,
                    "failed_attempts_24h",
                    0,
                ),

            "successful_transaction_count":
                max(
                    1,
                    transactions_last_24h,
                ),

            "cash_withdrawal_count":
                0,

            "international_transaction_count":
                (
                    1
                    if is_international
                    else 0
                ),

            "device_risk_score":
                device_risk,

            "merchant_risk_score":
                merchant_risk,

            "previous_fraud_count":
                self._get_int(
                    transaction,
                    "previous_fraud_count",
                    0,
                ),

            "account_risk_score":
                self._get_numeric(
                    transaction,
                    "account_risk_score",
                    max(
                        0.0,
                        device_risk * 0.7,
                    ),
                ),

            "velocity_risk_score":
                self._get_numeric(
                    transaction,
                    "velocity_risk_score",
                    max(
                        0.0,
                        transactions_last_1h
                        * 12.0,
                    ),
                ),

            "location_risk_score":
                self._get_numeric(
                    transaction,
                    "location_risk_score",
                    (
                        80.0
                        if is_international
                        else 20.0
                    ),
                ),

            "transaction_hour":
                transaction_hour,

            "hour_deviation":
                abs(
                    transaction_hour
                    - usual_hour
                ),

            "amount_to_average_ratio":
                amount_ratio,

            "rapid_transaction_flag":
                (
                    1
                    if transactions_last_1h >= 5
                    else 0
                ),

            "cross_border_risk":
                (
                    1
                    if is_international
                    else 0
                ),
        }

    # =========================================================
    # NUMERIC HELPER
    # =========================================================

    def _get_numeric(
        self,
        transaction,
        key,
        default=0.0,
    ):

        value = transaction.get(
            key,
            default,
        )

        try:

            return float(

                default
                if value is None
                else value
            )

        except (
            TypeError,
            ValueError,
        ):

            return float(default)

    # =========================================================
    # INTEGER HELPER
    # =========================================================

    def _get_int(
        self,
        transaction,
        key,
        default=0,
    ):

        value = transaction.get(
            key,
            default,
        )

        try:

            return int(

                default
                if value is None
                else value
            )

        except (
            TypeError,
            ValueError,
        ):

            return int(default)

    # =========================================================
    # CURRENCY
    # =========================================================

    def _infer_currency(
        self,
        country,
    ):

        country = (
            country or "IN"
        ).upper()

        if country == "IN":

            return "INR"

        if country == "US":

            return "USD"

        if country == "GB":

            return "GBP"

        return "USD"

    # =========================================================
    # CITY
    # =========================================================

    def _infer_city(
        self,
        country,
        fallback="Mumbai",
    ):

        cities = [

            "Ahmedabad",

            "Bengaluru",

            "Chennai",

            "Delhi",

            "Hyderabad",

            "Kolkata",

            "Mumbai",

            "Pune",
        ]

        if (
            country or "IN"
        ).upper() == "IN":

            return cities[
                abs(hash(fallback))
                % len(cities)
            ]

        return "Mumbai"

    # =========================================================
    # PREDICTION
    # =========================================================

    def predict(
        self,
        transaction,
    ):

        start = time.perf_counter()

        if (

            self.model_loaded

            and self.model
        ):

            try:

                # =============================================
                # BUILD FEATURES
                # =============================================

                features = (
                    self._build_model_features(
                        transaction
                    )
                )

                # =============================================
                # CREATE MODEL INPUT
                # =============================================

                model_input = (
                    pd.DataFrame(
                        [features]
                    )
                )

                # =============================================
                # KEEP MODEL FEATURE ORDER
                # =============================================

                if hasattr(
                    self.model,
                    "feature_names_in_",
                ):

                    model_input = (
                        model_input[
                            self.model.feature_names_in_
                        ]
                    )

                # =============================================
                # PREDICT PROBABILITY
                # =============================================

                probability = float(

                    self.model.predict_proba(
                        model_input
                    )[0, 1]
                )

                # =============================================
                # FRAUD DECISION
                # =============================================

                if (
                    probability
                    >= self.FRAUD_THRESHOLD
                ):

                    risk = "HIGH"

                    decision = (
                        "FRAUD ALERT"
                    )

                elif (
                    probability
                    >= self.REVIEW_THRESHOLD
                ):

                    risk = "MEDIUM"

                    decision = "REVIEW"

                else:

                    risk = "LOW"

                    decision = "APPROVE"

                # =============================================
                # GENERATE REASONS
                # =============================================

                reasons = (
                    self._generate_reasons(
                        transaction,
                        probability,
                    )
                )

            except Exception as exc:

                print(
                    "[WARNING] Model prediction failed: "
                    f"{exc}"
                )

                (
                    probability,
                    risk,
                    decision,
                    reasons,
                ) = self._rule_prediction(
                    transaction
                )

        else:

            (
                probability,
                risk,
                decision,
                reasons,
            ) = self._rule_prediction(
                transaction
            )

        # =====================================================
        # LATENCY
        # =====================================================

        latency_ms = (

            time.perf_counter()
            - start

        ) * 1000

        # =====================================================
        # RESULT
        # =====================================================

        return {

            "fraud_probability":
                min(
                    0.99,
                    probability,
                ),

            "risk_level":
                risk,

            "decision":
                decision,

            "latency_ms":
                round(
                    latency_ms,
                    3,
                ),

            "reasons":
                reasons[:6],

            "model_version":
                self.model_version,

            "fraud_threshold":
                self.FRAUD_THRESHOLD,

            "review_threshold":
                self.REVIEW_THRESHOLD,
        }

    # =========================================================
    # RULE FALLBACK
    # =========================================================

    def _rule_prediction(
        self,
        transaction,
    ):

        score = 0.02

        reasons = []

        # =====================================================
        # NEW DEVICE
        # =====================================================

        if transaction.get(
            "is_new_device"
        ):

            score += 0.18

            reasons.append(
                "New device detected."
            )

        # =====================================================
        # INTERNATIONAL
        # =====================================================

        if transaction.get(
            "international"
        ):

            score += 0.12

            reasons.append(
                "International transaction."
            )

        # =====================================================
        # NIGHT TRANSACTION
        # =====================================================

        if transaction.get(
            "is_night"
        ):

            score += 0.10

            reasons.append(
                "Transaction during night hours."
            )

        # =====================================================
        # HIGH VELOCITY
        # =====================================================

        if (
            (transaction.get("transactions_last_1h") or 0)
            >= 5
        ):

            score += 0.22

            reasons.append(
                "High transaction velocity."
            )

        # =====================================================
        # DEVICE RISK
        # =====================================================

        if (
            (transaction.get("device_risk_score") or 0)
            >= 60
        ):

            score += 0.15

            reasons.append(
                "Elevated device risk score."
            )

        # =====================================================
        # MERCHANT RISK
        # =====================================================

        if (
            (transaction.get("merchant_risk_score") or 0)
            >= 60
        ):

            score += 0.10

            reasons.append(
                "Elevated merchant risk score."
            )


        # =====================================================
        # AMOUNT ANOMALY
        # =====================================================

        avg = transaction.get(
            "avg_amount_7d"
        )

        if (

            avg

            and avg > 0

            and transaction.get(
                "amount",
                0,
            )
            / avg
            >= 5
        ):

            ratio = (

                transaction.get(
                    "amount",
                    0,
                )
                / avg
            )

            score += 0.20

            reasons.append(

                f"Amount is {ratio:.1f}× "
                "the recent average."
            )

        # =====================================================
        # PROBABILITY
        # =====================================================

        probability = min(
            0.99,
            score,
        )

        # =====================================================
        # DECISION USING SAME THRESHOLDS
        # =====================================================

        if (
            probability
            >= self.FRAUD_THRESHOLD
        ):

            risk = "HIGH"

            decision = (
                "FRAUD ALERT"
            )

        elif (
            probability
            >= self.REVIEW_THRESHOLD
        ):

            risk = "MEDIUM"

            decision = "REVIEW"

        else:

            risk = "LOW"

            decision = "APPROVE"

        # =====================================================
        # DEFAULT REASON
        # =====================================================

        if not reasons:

            reasons.append(
                "No strong anomaly detected."
            )

        return (

            probability,

            risk,

            decision,

            reasons,
        )

    # =========================================================
    # REASONS
    # =========================================================

    def _generate_reasons(
        self,
        transaction,
        probability,
    ):

        reasons = []

        # =====================================================
        # NEW DEVICE
        # =====================================================

        if transaction.get(
            "is_new_device"
        ):

            reasons.append(
                "New device detected."
            )

        # =====================================================
        # INTERNATIONAL
        # =====================================================

        if transaction.get(
            "international"
        ):

            reasons.append(
                "International transaction."
            )

        # =====================================================
        # NIGHT
        # =====================================================

        if transaction.get(
            "is_night"
        ):

            reasons.append(
                "Transaction during night hours."
            )

        # =====================================================
        # VELOCITY
        # =====================================================

        if (

            transaction.get(
                "transactions_last_1h",
                0,
            )

            >= 5
        ):

            reasons.append(
                "High transaction velocity."
            )

        # =====================================================
        # DEVICE RISK
        # =====================================================

        if (

            transaction.get(
                "device_risk_score",
                0,
            )

            >= 60
        ):

            reasons.append(
                "Elevated device risk score."
            )

        # =====================================================
        # MERCHANT RISK
        # =====================================================

        if (

            transaction.get(
                "merchant_risk_score",
                0,
            )

            >= 60
        ):

            reasons.append(
                "Elevated merchant risk score."
            )

        # =====================================================
        # AMOUNT RATIO
        # =====================================================

        avg = transaction.get(
            "avg_amount_7d"
        )

        if avg and avg > 0:

            ratio = (

                transaction.get(
                    "amount",
                    0,
                )
                / avg
            )

            if ratio >= 5:

                reasons.append(

                    f"Amount is {ratio:.1f}× "
                    "the 7-day average."
                )

        # =====================================================
        # DEFAULT
        # =====================================================

        if not reasons:

            reasons.append(

                "Model prediction based on "
                "transaction patterns."
            )

        return reasons

    # =========================================================
    # RECORD PREDICTION
    # =========================================================

    def record_prediction(
        self,
        transaction,
    ):

        result = self.predict(
            transaction
        )

        self.total_transactions_processed += 1

        if (
            result["risk_level"]
            == "HIGH"
        ):

            self.total_fraud_processed += 1

        self._record_latency(
            result["latency_ms"]
        )

        record = {

            **transaction,

            "transaction_id":
                str(
                    transaction.get(
                        "transaction_id",
                        "TX-AUTO",
                    )
                ),

            "account_id":
                str(
                    transaction.get(
                        "account_id",
                        "AC-AUTO",
                    )
                ),

            "timestamp":
                str(
                    transaction.get(
                        "timestamp",
                        "",
                    )
                ),

            "fraud_probability":
                result[
                    "fraud_probability"
                ],

            "risk_level":
                result[
                    "risk_level"
                ],

            "decision":
                result[
                    "decision"
                ],

            "latency_ms":
                result[
                    "latency_ms"
                ],

            "latency_status":
                (
                    "PASS"

                    if result[
                        "latency_ms"
                    ]
                    <= self.LATENCY_LIMIT_MS

                    else "SLOW"
                ),

            "reasons":
                result[
                    "reasons"
                ],

            "model_version":
                result[
                    "model_version"
                ],

            "fraud_threshold":
                self.FRAUD_THRESHOLD,

            "review_threshold":
                self.REVIEW_THRESHOLD,
        }

        self.recent_transactions.insert(
            0,
            record,
        )

        self.recent_transactions = (
            self.recent_transactions[
                :200
            ]
        )

        return result

    # =========================================================
    # STREAM NEXT
    # =========================================================

    def stream_next(self):

        if (
            self.streaming_generator
            is None
        ):

            self.streaming_generator = (
                self.transaction_generator()
            )

        try:

            transaction = next(
                self.streaming_generator
            )

        except StopIteration:

            self.streaming_generator = (
                self.transaction_generator()
            )

            transaction = next(
                self.streaming_generator
            )

        if (
            self.stream_start_time
            is None
        ):

            self.stream_start_time = (
                time.perf_counter()
            )

        result = self.predict(
            transaction
        )

        self.total_stream_transactions += 1

        sequence = (
            self.total_stream_transactions
        )

        self._record_latency(
            result["latency_ms"]
        )

        if (
            result["risk_level"]
            == "HIGH"
        ):

            self.total_fraud_processed += 1

        record = {

            **transaction,

            **result,

            "latency_status":
                (
                    "PASS"

                    if result[
                        "latency_ms"
                    ]
                    <= self.LATENCY_LIMIT_MS

                    else "SLOW"
                ),

            "stream_sequence":
                sequence,
        }

        self.stream_transactions.append(
            record
        )

        self.stream_transactions = (
            self.stream_transactions[
                -1000:
            ]
        )

        self.recent_transactions.insert(
            0,
            record
        )

        self.recent_transactions = (
            self.recent_transactions[
                :200
            ]
        )

        self.last_transaction_time = (
            time.perf_counter()
        )

        return record

    # =========================================================
    # STREAM ANALYTICS
    # =========================================================

    def get_stream_analytics(self):

        records = list(
            self.stream_transactions
        )

        latency_data = []

        probability_data = []

        risk_counts = {

            "LOW": 0,

            "MEDIUM": 0,

            "HIGH": 0,
        }

        status_counts = {

            "PASS": 0,

            "SLOW": 0,
        }

        fraud_alerts = []

        for record in records:

            sequence = int(

                record.get(
                    "stream_sequence",
                    0,
                )
            )

            latency = float(

                record.get(
                    "latency_ms",
                    0,
                )
                or 0
            )

            probability = float(

                record.get(
                    "fraud_probability",
                    0,
                )
                or 0
            )

            risk = str(

                record.get(
                    "risk_level",
                    "LOW",
                )
            )

            status = (

                "PASS"

                if latency
                <= self.LATENCY_LIMIT_MS

                else "SLOW"
            )

            latency_data.append({

                "sequence":
                    sequence,

                "transaction_id":
                    str(
                        record.get(
                            "transaction_id",
                            "",
                        )
                    ),

                "latency":
                    round(
                        latency,
                        3,
                    ),

                "status":
                    status,
            })

            probability_data.append({

                "sequence":
                    sequence,

                "transaction_id":
                    str(
                        record.get(
                            "transaction_id",
                            "",
                        )
                    ),

                "probability":
                    round(
                        probability * 100,
                        3,
                    ),
            })

            if risk in risk_counts:

                risk_counts[
                    risk
                ] += 1

            status_counts[
                status
            ] += 1

            if risk == "HIGH":

                fraud_alerts.append({

                    "sequence":
                        sequence,

                    "transaction_id":
                        str(
                            record.get(
                                "transaction_id",
                                "",
                            )
                        ),

                    "account_id":
                        str(
                            record.get(
                                "account_id",
                                "",
                            )
                        ),

                    "probability":
                        round(
                            probability * 100,
                            3,
                        ),

                    "amount":
                        round(
                            float(
                                record.get(
                                    "amount",
                                    0,
                                )
                                or 0
                            ),
                            2,
                        ),

                    "decision":
                        str(
                            record.get(
                                "decision",
                                "FRAUD ALERT",
                            )
                        ),
                })

        return {

            "total_stream_transactions":
                len(records),

            "latency":
                latency_data,

            "fraud_probability":
                probability_data,

            "risk_distribution": [

                {
                    "risk": "LOW",

                    "count":
                        risk_counts[
                            "LOW"
                        ],
                },

                {
                    "risk": "MEDIUM",

                    "count":
                        risk_counts[
                            "MEDIUM"
                        ],
                },

                {
                    "risk": "HIGH",

                    "count":
                        risk_counts[
                            "HIGH"
                        ],
                },
            ],

            "latency_status": [

                {
                    "status": "PASS",

                    "count":
                        status_counts[
                            "PASS"
                        ],
                },

                {
                    "status": "SLOW",

                    "count":
                        status_counts[
                            "SLOW"
                        ],
                },
            ],

            "fraud_alerts":
                fraud_alerts,

            "performance":
                self.get_realtime_statistics(),

            "thresholds": {

                "fraud_threshold":
                    self.FRAUD_THRESHOLD,

                "review_threshold":
                    self.REVIEW_THRESHOLD,
            },
        }

    # =========================================================
    # OVERVIEW
    # =========================================================

    def get_overview(self):

        stream_records = (
            self.stream_transactions
        )

        latency = [

            x["latency_ms"]

            for x in stream_records
        ]

        average_latency = (

            sum(latency)
            / len(latency)

            if latency

            else 0
        )

        fraud_alerts = sum(

            1

            for x in stream_records

            if x.get(
                "risk_level"
            )
            == "HIGH"
        )

        total = len(
            stream_records
        )

        return {

            "transactions":
                total,

            "fraud_alerts":
                fraud_alerts,

            "fraud_rate":
                (
                    fraud_alerts
                    / total

                    if total

                    else 0
                ),

            "avg_latency_ms":
                round(
                    average_latency,
                    3,
                ),

            "stream_status":
                (
                    "ACTIVE"

                    if total > 0

                    else "READY"
                ),

            "fraud_threshold":
                self.FRAUD_THRESHOLD,

            "review_threshold":
                self.REVIEW_THRESHOLD,

            "model_version":
                self.model_version,
        }

    # =========================================================
    # DYNAMIC THRESHOLD TUNING
    # =========================================================

    def update_thresholds(
        self,
        fraud_threshold: float,
        review_threshold: float,
    ):
        fraud_threshold = max(0.01, min(0.99, float(fraud_threshold)))
        review_threshold = max(0.01, min(fraud_threshold - 0.01, float(review_threshold)))

        self.FRAUD_THRESHOLD = fraud_threshold
        self.REVIEW_THRESHOLD = review_threshold

        return {
            "status": "updated",
            "thresholds": {
                "fraud_threshold": self.FRAUD_THRESHOLD,
                "review_threshold": self.REVIEW_THRESHOLD,
            },
        }

    # =========================================================
    # HIGH RISK ACCOUNTS FLAGGING ENGINE
    # =========================================================

    def get_high_risk_accounts(
        self,
        min_fraud_alerts: int = 1,
    ):
        recent = self.stream_transactions
        account_map = {}

        for tx in recent:
            aid = tx.get("account_id")
            if not aid:
                continue

            if aid not in account_map:
                account_map[aid] = {
                    "account_id": aid,
                    "total_transactions": 0,
                    "fraud_alerts": 0,
                    "total_amount": 0.0,
                    "last_risk_level": "LOW",
                    "last_seen": tx.get("timestamp"),
                }

            account_map[aid]["total_transactions"] += 1
            account_map[aid]["total_amount"] += float(tx.get("amount", 0.0))

            if tx.get("risk_level") == "HIGH" or tx.get("decision") == "FRAUD ALERT":
                account_map[aid]["fraud_alerts"] += 1

            account_map[aid]["last_risk_level"] = tx.get("risk_level", "LOW")

        flagged = [
            acc
            for acc in account_map.values()
            if acc["fraud_alerts"] >= min_fraud_alerts
            or acc["last_risk_level"] in ["HIGH", "CRITICAL"]
        ]

        flagged.sort(
            key=lambda x: (x["fraud_alerts"], x["total_amount"]),
            reverse=True,
        )

        return {
            "high_risk_accounts": flagged,
            "total_flagged": len(flagged),
        }


# =============================================================
# GLOBAL INSTANCE
# =============================================================

ml_service = MLService()