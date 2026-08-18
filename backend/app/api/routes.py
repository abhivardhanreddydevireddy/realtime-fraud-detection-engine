from fastapi import APIRouter, HTTPException

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    average_precision_score,
    roc_auc_score,
    confusion_matrix,
)

from ..models.schemas import (
    CustomerProfile,
    HealthResponse,
    PredictionResponse,
    TransactionInput,
)

from ..services.ml_service import ml_service


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/api",
    tags=["FraudGuard"],
)


# =========================================================
# HEALTH
# =========================================================

@router.get(
    "/health",
    response_model=HealthResponse,
)
def health():

    return {
        "status": "ok",
        "service": "fraudguard-api",
        "model_loaded": ml_service.model_loaded,
    }


# =========================================================
# OVERVIEW
# =========================================================

@router.get("/overview")
def overview():

    return ml_service.get_overview()


_METRICS_CACHE = {}

@router.get("/metrics")
def metrics(
    threshold: float | None = None,
):
    if threshold is None:
        threshold = ml_service.FRAUD_THRESHOLD

    threshold_key = round(float(threshold), 4)
    if threshold_key in _METRICS_CACHE:
        return _METRICS_CACHE[threshold_key]

    # -----------------------------------------------------
    # CHECK MODEL
    # -----------------------------------------------------


    if (
        ml_service.model is None
        or not ml_service.model_loaded
    ):

        raise HTTPException(
            status_code=500,
            detail="Fraud model is not loaded",
        )

    # -----------------------------------------------------
    # CHECK TRAINING / EVALUATION DATA
    # -----------------------------------------------------

    if (
        ml_service.training_data is None
        or ml_service.training_data.empty
    ):

        raise HTTPException(
            status_code=500,
            detail="Training data is not loaded",
        )

    try:

        df = ml_service.training_data.copy()

        # -------------------------------------------------
        # FIND TARGET COLUMN
        # -------------------------------------------------

        target_candidates = [
            "is_fraud",
            "fraud",
            "fraud_flag",
            "label",
            "target",
        ]

        target_column = None

        for column in target_candidates:

            if column in df.columns:

                target_column = column
                break

        if target_column is None:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Fraud target column not found. "
                    f"Available columns: {list(df.columns)}"
                ),
            )

        # -------------------------------------------------
        # TARGET
        # -------------------------------------------------

        y_true = (
            df[target_column]
            .fillna(0)
            .astype(int)
        )

        # -------------------------------------------------
        # GET MODEL FEATURES
        # -------------------------------------------------

        if hasattr(
            ml_service.model,
            "feature_names_in_",
        ):

            model_features = list(
                ml_service.model.feature_names_in_
            )

        elif hasattr(
            ml_service,
            "feature_names",
        ):

            model_features = list(
                ml_service.feature_names
            )

        else:

            raise HTTPException(
                status_code=500,
                detail="Unable to determine model features",
            )

        # -------------------------------------------------
        # CHECK MISSING FEATURES
        # -------------------------------------------------

        missing_features = [

            feature

            for feature
            in model_features

            if feature not in df.columns

        ]

        if missing_features:

            raise HTTPException(
                status_code=500,
                detail=(
                    "Missing model features: "
                    + ", ".join(
                        missing_features
                    )
                ),
            )

        # -------------------------------------------------
        # INPUT FEATURES
        # -------------------------------------------------

        X = df[
            model_features
        ]

        # -------------------------------------------------
        # PREDICT PROBABILITIES
        # -------------------------------------------------

        probabilities = (
            ml_service.model
            .predict_proba(X)[:, 1]
        )

        # -------------------------------------------------
        # CLASS PREDICTION
        # -------------------------------------------------

        if threshold is None:
            threshold = ml_service.FRAUD_THRESHOLD

        threshold = max(0.01, min(0.99, float(threshold)))

        y_pred = (
            probabilities >= threshold
        ).astype(int)

        # -------------------------------------------------
        # ACCURACY
        # -------------------------------------------------

        accuracy = accuracy_score(
            y_true,
            y_pred,
        )

        # -------------------------------------------------
        # PRECISION
        # -------------------------------------------------

        precision = precision_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        # -------------------------------------------------
        # RECALL
        # -------------------------------------------------

        recall = recall_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        # -------------------------------------------------
        # F1 SCORE
        # -------------------------------------------------

        f1 = f1_score(
            y_true,
            y_pred,
            zero_division=0,
        )

        # -------------------------------------------------
        # PR-AUC
        # -------------------------------------------------

        pr_auc = average_precision_score(
            y_true,
            probabilities,
        )

        # -------------------------------------------------
        # ROC-AUC
        # -------------------------------------------------

        roc_auc = roc_auc_score(
            y_true,
            probabilities,
        )

        # -------------------------------------------------
        # CONFUSION MATRIX
        # -------------------------------------------------

        cm = confusion_matrix(
            y_true,
            y_pred,
            labels=[0, 1],
        )

        true_negative = int(
            cm[0][0]
        )

        false_positive = int(
            cm[0][1]
        )

        false_negative = int(
            cm[1][0]
        )

        true_positive = int(
            cm[1][1]
        )

        # -------------------------------------------------
        # COUNTS
        # -------------------------------------------------

        total_transactions = int(
            len(y_true)
        )

        actual_fraud = int(
            y_true.sum()
        )

        fraud_detected = (
            true_positive
        )

        fraud_missed = (
            false_negative
        )

        false_alerts = (
            false_positive
        )

        # -------------------------------------------------
        # RETURN RESPONSE
        # -------------------------------------------------

        res = {


            "accuracy": round(
                float(accuracy * 100),
                2,
            ),

            "precision": round(
                float(precision * 100),
                2,
            ),

            "recall": round(
                float(recall * 100),
                2,
            ),

            "f1_score": round(
                float(f1 * 100),
                2,
            ),

            "pr_auc": round(
                float(pr_auc * 100),
                2,
            ),

            "roc_auc": round(
                float(roc_auc * 100),
                2,
            ),

            "total_transactions": (
                total_transactions
            ),

            "actual_fraud": (
                actual_fraud
            ),

            "fraud_detected": (
                fraud_detected
            ),

            "fraud_missed": (
                fraud_missed
            ),

            "false_alerts": (
                false_alerts
            ),

            "confusion_matrix": {

                "true_negative": (
                    true_negative
                ),

                "false_positive": (
                    false_positive
                ),

                "false_negative": (
                    false_negative
                ),

                "true_positive": (
                    true_positive
                ),
            },

            "threshold": threshold,

            "model_loaded": (
                ml_service.model_loaded
            ),
        }

        _METRICS_CACHE[threshold_key] = res
        return res

    except HTTPException:


        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Metric calculation failed: {str(exc)}",
        )


# =========================================================
# RECENT STREAM TRANSACTIONS
# =========================================================

@router.get("/transactions")
def transactions(
    limit: int = 50,
):

    limit = max(
        1,
        min(
            limit,
            200,
        ),
    )

    return ml_service.stream_transactions[
        -limit:
    ][::-1]


# =========================================================
# PREDICT MANUALLY
# =========================================================

@router.post(
    "/predict",
    response_model=PredictionResponse,
)
def predict(
    transaction: TransactionInput,
):

    result = ml_service.record_prediction(
        transaction.model_dump()
    )

    return {

        "transaction_id": str(
            transaction.transaction_id
            or "NEW-TX"
        ),

        "account_id": str(
            transaction.account_id
            or "NEW-ACCOUNT"
        ),

        **result,
    }


# =========================================================
# STREAM NEXT
# =========================================================

@router.get("/stream/next")
def stream_next():

    if (
        ml_service.training_data is None
        or ml_service.training_data.empty
    ):

        raise HTTPException(
            status_code=404,
            detail="No training data available",
        )

    result = ml_service.stream_next()

    return {

        "transaction": result,

        "stream_sequence": result[
            "stream_sequence"
        ],

        "latency_ms": result[
            "latency_ms"
        ],

        "latency_status": result[
            "latency_status"
        ],

        "risk_level": result[
            "risk_level"
        ],

        "decision": result[
            "decision"
        ],
    }


# =========================================================
# STREAM ANALYTICS
# =========================================================

@router.get(
    "/stream/analytics"
)
def stream_analytics():

    return ml_service.get_stream_analytics()


# =========================================================
# RESET STREAM
# =========================================================

@router.post("/stream/reset")
def reset_stream():

    ml_service.reset_stream()

    return {
        "status": "reset",
        "message": "Pseudo-stream reset successfully",
    }


# =========================================================
# ANALYTICS
# =========================================================

@router.get("/analytics")
def analytics():

    return ml_service.get_stream_analytics()


# =========================================================
# CUSTOMERS
# =========================================================

@router.get("/customers")
def customers_list():

    recent = (
        ml_service.stream_transactions
    )

    customer_ids = {}

    for x in recent:

        account_id = x.get(
            "account_id"
        )

        if account_id not in customer_ids:

            customer_ids[
                account_id
            ] = {

                "transaction_count": 0,

                "fraud_count": 0,
            }

        customer_ids[
            account_id
        ][
            "transaction_count"
        ] += 1

        if (
            x.get("risk_level")
            == "HIGH"
        ):

            customer_ids[
                account_id
            ][
                "fraud_count"
            ] += 1

    customers = [

        {

            "account_id": aid,

            "transaction_count": stats[
                "transaction_count"
            ],

            "fraud_count": stats[
                "fraud_count"
            ],
        }

        for aid, stats
        in sorted(
            customer_ids.items()
        )
    ]

    return {

        "customers": customers,

        "total": len(
            customers
        ),
    }


# =========================================================
# CUSTOMER DETAILS
# =========================================================

@router.get(
    "/customers/{account_id}",
    response_model=CustomerProfile,
)
def customer(
    account_id: str,
):

    records = [

        x

        for x
        in ml_service.stream_transactions

        if x["account_id"]
        == account_id
    ]

    if not records:

        raise HTTPException(
            status_code=404,
            detail="Customer not found",
        )

    return {

        "account_id": account_id,

        "transaction_count": len(
            records
        ),

        "average_amount": (
            sum(
                x["amount"]
                for x in records
            )
            / len(records)
        ),

        "fraud_history": sum(
            x["risk_level"]
            == "HIGH"
            for x in records
        ),

        "new_device_count": sum(
            x.get(
                "is_new_device",
                False,
            )
            for x in records
        ),

        "international_count": sum(
            x.get(
                "country",
                "IN",
            ) != "IN"
            for x in records
        ),

        "typical_categories": list(
            dict.fromkeys(
                x[
                    "merchant_category"
                ]
                for x in records
            )
        )[:5],

        "recent_transactions": (
            records[-10:][::-1]
        ),
    }


# =========================================================
# TRAINING DATA STATS
# =========================================================

@router.get(
    "/training-data/stats"
)
def training_data_stats():

    if (
        ml_service.training_data
        is None
    ):

        raise HTTPException(
            status_code=404,
            detail="No training data loaded",
        )

    df = ml_service.training_data

    return {

        "total_records": len(df),

        "columns": list(
            df.columns
        ),
    }


# =========================================================
# TRAINING DATA RECORDS
# =========================================================

@router.get(
    "/training-data/records"
)
def training_data_records(
    limit: int = 20,
):

    if (
        ml_service.training_data
        is None
    ):

        raise HTTPException(
            status_code=404,
            detail="No training data loaded",
        )

    limit = max(
        1,
        min(
            limit,
            100,
        ),
    )

    return {

        "total_records": len(
            ml_service.training_data
        ),

        "records": (
            ml_service
            .training_data
            .head(limit)
            .to_dict(
                orient="records"
            )
        ),
    }


# =========================================================
# THRESHOLDS API
# =========================================================

@router.get("/thresholds")
def get_thresholds():
    return {
        "fraud_threshold": ml_service.FRAUD_THRESHOLD,
        "review_threshold": ml_service.REVIEW_THRESHOLD,
    }


@router.post("/thresholds")
def update_thresholds(payload: dict):
    fraud_t = payload.get("fraud_threshold", ml_service.FRAUD_THRESHOLD)
    review_t = payload.get("review_threshold", ml_service.REVIEW_THRESHOLD)
    return ml_service.update_thresholds(fraud_t, review_t)


# =========================================================
# HIGH RISK ACCOUNTS API
# =========================================================

@router.get("/accounts/high-risk")
def get_high_risk_accounts(min_alerts: int = 1):
    return ml_service.get_high_risk_accounts(min_alerts)