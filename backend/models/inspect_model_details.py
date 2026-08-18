import os
import sys
import traceback
import joblib
import sklearn
import sklearn.compose._column_transformer as ct


# =========================================================
# Compatibility fix for older sklearn pickle
# =========================================================

class _RemainderColsList(list):
    pass


ct._RemainderColsList = _RemainderColsList


# =========================================================
# MODEL PATH
# =========================================================

path = r'C:\Users\dharm\OneDrive\Desktop\npm\backend\models\final_fraud_model.pkl'


print("=" * 70)
print("MODEL INSPECTION STARTED")
print("=" * 70)

print("Python version :", sys.version)
print("Scikit-learn  :", sklearn.__version__)
print("Model path    :", path)
print("Path exists   :", os.path.exists(path))


if not os.path.exists(path):
    print("\nERROR: Model file does not exist!")
    sys.exit(1)


# =========================================================
# LOAD MODEL
# =========================================================

try:

    print("\nLoading model...")

    model = joblib.load(path)

    print("Model loaded successfully!")

except Exception:

    print("\nERROR WHILE LOADING MODEL")
    traceback.print_exc()
    sys.exit(1)


# =========================================================
# BASIC MODEL INFORMATION
# =========================================================

print("\n" + "=" * 70)
print("MODEL INFORMATION")
print("=" * 70)

print("MODEL TYPE:")
print(type(model))

print("\nPIPELINE STEPS:")

if hasattr(model, "named_steps"):

    print(list(model.named_steps.keys()))

else:

    print("No named_steps found")


print("\nCLASSES:")

if hasattr(model, "classes_"):

    print(model.classes_)

else:

    print("classes_ not found")


print("\nHAS predict:")
print(hasattr(model, "predict"))

print("\nHAS predict_proba:")
print(hasattr(model, "predict_proba"))


# =========================================================
# FEATURE NAMES
# =========================================================

print("\n" + "=" * 70)
print("FEATURE NAMES")
print("=" * 70)

if hasattr(model, "feature_names_in_"):

    feature_names = list(model.feature_names_in_)

    print("Number of features:", len(feature_names))

    for i, feature in enumerate(feature_names, start=1):

        print(f"{i}. {feature}")

else:

    print("feature_names_in_ not found")


# =========================================================
# PREPROCESSOR
# =========================================================

print("\n" + "=" * 70)
print("PREPROCESSOR")
print("=" * 70)


if not hasattr(model, "named_steps"):

    print("Model does not contain named_steps.")
    sys.exit(1)


if "preprocessor" not in model.named_steps:

    print("ERROR: 'preprocessor' step not found.")

    print(
        "Available steps:",
        list(model.named_steps.keys())
    )

    sys.exit(1)


pre = model.named_steps["preprocessor"]


print("Preprocessor type:")
print(type(pre))


# =========================================================
# TRANSFORMERS
# =========================================================

print("\n" + "=" * 70)
print("TRANSFORMERS")
print("=" * 70)


for transformer_name, transformer, columns in pre.transformers_:

    print("\n---------------------------------------------")

    print("NAME:")
    print(transformer_name)

    print("\nTYPE:")
    print(type(transformer))

    print("\nCOLUMNS:")

    try:

        print(list(columns))

    except Exception:

        print(columns)


    # -----------------------------------------------------
    # Encoder categories
    # -----------------------------------------------------

    if hasattr(transformer, "categories_"):

        print("\nCATEGORIES:")

        for i, categories in enumerate(
            transformer.categories_
        ):

            print(
                f"Category {i}:",
                list(categories)
            )


    # -----------------------------------------------------
    # Feature names
    # -----------------------------------------------------

    if hasattr(
        transformer,
        "get_feature_names_out"
    ):

        print("\nOUTPUT FEATURE NAMES:")

        try:

            output_features = (
                transformer
                .get_feature_names_out()
            )

            print(
                "Number:",
                len(output_features)
            )

            for feature in output_features:

                print(" ", feature)

        except Exception as exc:

            print(
                "Could not get output features:",
                exc
            )


# =========================================================
# NUMERIC / CATEGORICAL COLUMNS
# =========================================================

print("\n" + "=" * 70)
print("NUMERIC / CATEGORICAL COLUMNS")
print("=" * 70)


for transformer_name, transformer, columns in pre.transformers_:

    if transformer_name == "num":

        print("\nNUMERIC COLUMNS:")

        print(list(columns))

    elif transformer_name == "cat":

        print("\nCATEGORICAL COLUMNS:")

        print(list(columns))


# =========================================================
# MODEL DETAILS
# =========================================================

print("\n" + "=" * 70)
print("FINAL MODEL")
print("=" * 70)


if hasattr(model, "named_steps"):

    for name, step in model.named_steps.items():

        print(
            f"{name} -> {type(step).__name__}"
        )


print("\n" + "=" * 70)
print("MODEL INSPECTION FINISHED")
print("=" * 70)