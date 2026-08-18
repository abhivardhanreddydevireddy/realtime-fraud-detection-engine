import os
import sys
import joblib
import traceback

import sklearn.compose._column_transformer as ct

# compatibility shim for older pickles
class _RemainderColsList(list):
    pass

ct._RemainderColsList = _RemainderColsList

path = r'C:\Users\ajith\OneDrive\Videos\fraudguard_fullstack_framework (2)\fraudguard_fullstack_framework (1)\backend\models\final_fraud_model.pkl'
print('python', sys.version)
print('sklearn', __import__('sklearn').__version__)
print('path exists', os.path.exists(path))

try:
    model = joblib.load(path)
    print('TYPE', type(model))
    if hasattr(model, 'named_steps'):
        print('NAMED_STEPS', list(model.named_steps.keys()))
    if hasattr(model, 'steps'):
        print('STEPS', [s[0] for s in model.steps])
    if hasattr(model, 'feature_names_in_'):
        print('FEATURE_NAMES', list(model.feature_names_in_))
    if hasattr(model, 'classes_'):
        print('CLASSES', getattr(model, 'classes_'))
    print('HAS_PREDICT', hasattr(model, 'predict'))
    print('HAS_PREDICT_PROBA', hasattr(model, 'predict_proba'))
    print('HAS_TRANSFORM', hasattr(model, 'transform'))
    if hasattr(model, 'get_params'):
        params = model.get_params()
        print('PARAM_KEYS', list(params.keys())[:50])
except Exception:
    traceback.print_exc()
