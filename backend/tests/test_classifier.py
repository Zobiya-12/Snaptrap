import json

import attack_corpus
import classifier

BALANCED = {"brute": 30, "cred": 30, "scan": 30, "sqli": 30, "slow": 30}


def test_feature_vector_matches_feature_names():
    f = classifier.extract_features({"payload": "' OR 1=1--", "service": "HTTP", "threat_score": 70})
    assert len(f) == len(classifier.FEATURE_NAMES)


def test_corpus_is_labelled_and_balanced():
    rows = attack_corpus.generate(50, seed=1)
    assert len(rows) == 50
    assert {r["attack_type"] for r in rows} == set(attack_corpus.TYPES)
    assert all(0 <= r["threat_score"] <= 100 for r in rows)


def test_training_on_tiny_imbalanced_data_does_not_crash(isolated_model, seed_attacks):
    # 20 rows, one class with a single sample: used to raise inside train_test_split
    seed_attacks({"brute": 5, "cred": 5, "scan": 5, "slow": 4, "sqli": 1})
    isolated_model.train_model()
    metrics = json.load(open(isolated_model.METRICS_PATH))
    assert metrics["evaluated_on"] == "training data"
    assert metrics["samples"] == 20


def test_training_with_enough_data_uses_holdout(isolated_model, seed_attacks):
    seed_attacks(BALANCED)
    isolated_model.train_model()
    metrics = json.load(open(isolated_model.METRICS_PATH))
    assert metrics["evaluated_on"] == "holdout"
    assert 0 <= metrics["accuracy"] <= 100


def test_classify_single_returns_live_path_keys(isolated_model, seed_attacks):
    seed_attacks(BALANCED)
    isolated_model.train_model()
    r = isolated_model.classify_single({"payload": "' UNION SELECT * FROM users--", "service": "DB",
                                        "threat_score": 80, "attacker_ip": "1.2.3.4"})
    assert set(r) == {"attack_type", "confidence", "is_novel", "is_uncertain", "warning", "top_class"}
    assert 0 <= r["confidence"] <= 1


def test_reclassify_all_fills_predictions(isolated_model, seed_attacks):
    from db import get_conn
    seed_attacks(BALANCED)
    isolated_model.train_model()
    saved = isolated_model.reclassify_all()
    assert saved == 150
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM ml_predictions"); n = cur.fetchone()[0]
    cur.close(); conn.close()
    assert n == 150


def test_batch_in_process_matches_worker_pool(isolated_model):
    """ML_WORKERS=1 (in-process, for small hosts) must give the same answers as the pool."""
    import pickle
    from sklearn.ensemble import RandomForestClassifier
    train = attack_corpus.generate(300, seed=1)
    X = [classifier.extract_features(a, {}) for a in train]
    y = [a["attack_type"] for a in train]
    model = RandomForestClassifier(n_estimators=20, random_state=0).fit(X, y)
    with open(isolated_model.MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    batch = attack_corpus.generate(60, seed=2)
    in_process = isolated_model.classify_batch_parallel(batch, max_workers=1)
    pooled = isolated_model.classify_batch_parallel(batch, max_workers=2)
    assert in_process == pooled


def test_ml_workers_env_var_is_respected(isolated_model, monkeypatch):
    monkeypatch.setenv("ML_WORKERS", "1")
    # no model on disk -> early return, but the env var must parse without error
    assert isolated_model.classify_batch_parallel([{"payload": "x"}]) == [("unknown", 0.0)]
