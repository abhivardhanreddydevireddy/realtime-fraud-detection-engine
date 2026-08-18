import os
import sys
import time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
)
from xgboost import XGBClassifier


def train():
    print("=" * 70)
    print("FRAUDGUARD ML MODEL TRAINING PIPELINE")
    print("=" * 70)

    # 1. Locate dataset
    base_dir = Path(__file__).resolve().parent.parent
    data_path = base_dir / "data" / "fraud_transactions_100k_adjusted_ml_ready.csv"
    output_model_path = base_dir / "models" / "final_fraud_model.pkl"

    if not data_path.exists():
        print(f"[ERROR] Dataset file not found at: {data_path}")
        sys.exit(1)

    print(f"[1/5] Loading historical transaction dataset from: {data_path.name}")
    df = pd.read_csv(data_path)
    print(f"      Loaded {len(df):,} records with {len(df.columns)} columns.")

    # 2. Identify target and features
    target_column = None
    for col in ["is_fraud", "fraud", "fraud_flag", "label", "target"]:
        if col in df.columns:
            target_column = col
            break

    if not target_column:
        print("[ERROR] Target column not found in dataset!")
        sys.exit(1)

    y = df[target_column].astype(int)

    # Exclude non-feature identifier columns
    ignore_cols = {
        target_column, "transaction_id", "account_id", "customer_id",
        "timestamp", "created_at", "date", "time"
    }
    feature_cols = [c for c in df.columns if c not in ignore_cols]
    X = df[feature_cols]

    print(f"[2/5] Prepared {len(feature_cols)} input features.")
    fraud_count = y.sum()
    normal_count = len(y) - fraud_count
    fraud_ratio = (fraud_count / len(y)) * 100
    print(f"      Class distribution: Normal={normal_count:,}, Fraud={fraud_count:,} ({fraud_ratio:.2f}% imbalanced)")

    # Identify categorical vs numerical columns
    categorical_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()
    numerical_cols = X.select_dtypes(include=["int64", "float64", "int32", "float32"]).columns.tolist()

    print(f"      Categorical features ({len(categorical_cols)}): {categorical_cols}")
    print(f"      Numerical features ({len(numerical_cols)}): {len(numerical_cols)} columns")

    # 3. Build ColumnTransformer preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
        ],
        remainder="passthrough",
    )

    # Calculate class imbalance weighting factor scale_pos_weight
    scale_pos_weight = float(normal_count / max(1, fraud_count))

    # XGBoost Classifier with imbalance handling
    model = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        eval_metric="logloss",
        n_jobs=-1,
    )

    full_pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", model),
        ]
    )

    # 4. Train-Test Split & Pipeline Fitting
    print("[3/5] Splitting data and training model pipeline...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    start_time = time.perf_counter()
    full_pipeline.fit(X_train, y_train)
    fit_duration = time.perf_counter() - start_time
    print(f"      Model training completed in {fit_duration:.2f} seconds.")

    # 5. Model Evaluation & Threshold Tuning
    print("[4/5] Evaluating performance metrics & optimizing threshold...")
    y_proba = full_pipeline.predict_proba(X_test)[:, 1]

    # Evaluate at default 0.50 threshold
    y_pred_default = (y_proba >= 0.50).astype(int)
    acc = accuracy_score(y_test, y_pred_default)
    prec = precision_score(y_test, y_pred_default, zero_division=0)
    rec = recall_score(y_test, y_pred_default, zero_division=0)
    f1 = f1_score(y_test, y_pred_default, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)
    pr_auc = average_precision_score(y_test, y_proba)

    print("\n" + "-" * 50)
    print("EVALUATION RESULTS (Default Threshold = 0.50):")
    print(f"  Accuracy       : {acc * 100:.2f}%")
    print(f"  Precision      : {prec * 100:.2f}%")
    print(f"  Recall         : {rec * 100:.2f}%")
    print(f"  F1-Score       : {f1 * 100:.2f}%")
    print(f"  ROC-AUC        : {roc_auc:.4f}")
    print(f"  PR-AUC         : {pr_auc:.4f}")
    print("-" * 50)

    # Precision-Recall Curve Threshold Tuning
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = 2 * (precisions * recalls) / np.maximum(precisions + recalls, 1e-10)
    best_idx = np.argmax(f1_scores)
    best_threshold = float(thresholds[best_idx]) if best_idx < len(thresholds) else 0.50
    best_f1 = float(f1_scores[best_idx])

    print(f"      Optimal Decision Threshold (F1-maximized): {best_threshold:.4f} (F1: {best_f1 * 100:.2f}%)")

    # 6. Save Trained Model
    print(f"[5/5] Saving model pipeline to: {output_model_path}")
    output_model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(full_pipeline, output_model_path)
    print("=" * 70)
    print("SUCCESS: Model training pipeline completed and artifact saved!")
    print("=" * 70)


if __name__ == "__main__":
    train()
