import pandas as pd
import os

# =========================================================
# DATASET PATH
# =========================================================

path = r"C:\Users\dharm\OneDrive\Desktop\npm\backend\data\fraud_transactions_100k_adjusted_ml_ready.csv"

print("=" * 70)
print("DATASET INSPECTION")
print("=" * 70)

print("Path:")
print(path)

print("\nPath exists:")
print(os.path.exists(path))

if not os.path.exists(path):
    print("\nERROR: Dataset not found!")
    exit()


# =========================================================
# LOAD DATASET
# =========================================================

df = pd.read_csv(path)

print("\nDataset loaded successfully!")


# =========================================================
# BASIC INFORMATION
# =========================================================

print("\n" + "=" * 70)
print("BASIC INFORMATION")
print("=" * 70)

print("Rows:", len(df))
print("Columns:", len(df.columns))


# =========================================================
# COLUMN NAMES
# =========================================================

print("\n" + "=" * 70)
print("COLUMNS")
print("=" * 70)

for i, column in enumerate(df.columns, start=1):
    print(f"{i}. {column}")


# =========================================================
# DATA TYPES
# =========================================================

print("\n" + "=" * 70)
print("DATA TYPES")
print("=" * 70)

print(df.dtypes)


# =========================================================
# MISSING VALUES
# =========================================================

print("\n" + "=" * 70)
print("MISSING VALUES")
print("=" * 70)

missing = df.isnull().sum()

print(
    missing[missing > 0]
    if missing.sum() > 0
    else "No missing values"
)


# =========================================================
# SAMPLE
# =========================================================

print("\n" + "=" * 70)
print("FIRST 5 RECORDS")
print("=" * 70)

print(df.head())


# =========================================================
# POSSIBLE TARGET COLUMNS
# =========================================================

print("\n" + "=" * 70)
print("POSSIBLE TARGET COLUMNS")
print("=" * 70)

target_candidates = [
    "is_fraud",
    "fraud",
    "fraud_flag",
    "label",
    "target",
    "Class",
    "class"
]

for column in target_candidates:

    if column in df.columns:

        print("\nTARGET FOUND:", column)

        print(
            df[column].value_counts(
                dropna=False
            )
        )


# =========================================================
# ALL UNIQUE VALUES FOR SMALL CATEGORICAL COLUMNS
# =========================================================

print("\n" + "=" * 70)
print("CATEGORICAL VALUES")
print("=" * 70)

categorical_candidates = [
    "transaction_type",
    "merchant_category",
    "currency",
    "customer_home_city",
    "transaction_city",
    "merchant_risk_zone"
]

for column in categorical_candidates:

    if column in df.columns:

        print(f"\n{column}")

        print(
            df[column]
            .dropna()
            .unique()
        )


# =========================================================
# MODEL FEATURES
# =========================================================

model_features = [
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
    "cross_border_risk"
]


# =========================================================
# COMPARE DATASET WITH MODEL
# =========================================================

print("\n" + "=" * 70)
print("MODEL FEATURE COMPATIBILITY")
print("=" * 70)

missing_features = [
    feature
    for feature in model_features
    if feature not in df.columns
]

extra_features = [
    column
    for column in df.columns
    if column not in model_features
]


print("\nMissing model features:")

if missing_features:
    for feature in missing_features:
        print("  MISSING:", feature)
else:
    print("  NONE")


print("\nExtra dataset columns:")

if extra_features:
    for column in extra_features:
        print("  EXTRA:", column)
else:
    print("  NONE")


print("\n" + "=" * 70)
print("INSPECTION FINISHED")
print("=" * 70)