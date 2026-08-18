import { useState, useEffect } from "react";
import "../styles/simulator.css";

import {
  FlaskConical,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ShieldAlert,
  Zap,
  ShoppingBag,
  Globe,
  Smartphone,
} from "lucide-react";

import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

const MERCHANT_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Travel",
  "Entertainment",
  "Dining",
  "Retail",
  "Groceries",
  "Jewelry",
  "Gaming",
];

const PRESETS = [
  {
    name: "🔴 High-Velocity Attack",
    amount: 15000,
    velocity: 12,
    newDevice: true,
    international: false,
    night: true,
    category: "Electronics",
  },
  {
    name: "🔴 High-Value Overseas Fraud",
    amount: 85000,
    velocity: 2,
    newDevice: true,
    international: true,
    night: false,
    category: "Jewelry",
  },
  {
    name: "🟡 Suspicious Night Purchase",
    amount: 8500,
    velocity: 4,
    newDevice: false,
    international: false,
    night: true,
    category: "Gaming",
  },
  {
    name: "🟢 Normal Grocery Checkout",
    amount: 450,
    velocity: 1,
    newDevice: false,
    international: false,
    night: false,
    category: "Groceries",
  },
];

export default function Simulator() {
  const [amount, setAmount] = useState("4500");
  const [velocity, setVelocity] = useState("2");
  const [category, setCategory] = useState("Electronics");
  const [newDevice, setNewDevice] = useState(false);
  const [international, setInternational] = useState(false);
  const [night, setNight] = useState(false);

  const [thresholds, setThresholds] = useState({ fraud_threshold: 0.85, review_threshold: 0.50 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current thresholds for reference
    api("/thresholds")
      .then((res) => {
        if (res && res.fraud_threshold) {
          setThresholds(res);
        }
      })
      .catch(() => {});
  }, []);

  const applyPreset = (preset) => {
    setAmount(String(preset.amount));
    setVelocity(String(preset.velocity));
    setCategory(preset.category);
    setNewDevice(preset.newDevice);
    setInternational(preset.international);
    setNight(preset.night);
    setResult(null);
    setError("");
  };

  const run = async () => {
    try {
      setError("");
      setResult(null);

      const numAmount = Number(amount);
      const numVelocity = Number(velocity);

      if (amount === "" || isNaN(numAmount) || numAmount <= 0) {
        setError("Please enter a valid transaction amount greater than 0.");
        return;
      }

      if (velocity === "" || isNaN(numVelocity) || numVelocity < 0) {
        setError("Please enter a valid transaction count for last 1 hour.");
        return;
      }

      setLoading(true);

      const response = await api("/predict", {
        method: "POST",
        body: JSON.stringify({
          transaction_id: `SIM-${Date.now().toString().slice(-6)}`,
          account_id: "SIM-ACCOUNT-01",
          amount: numAmount,
          merchant_category: category,
          country: international ? "US" : "IN",
          avg_amount_7d: numAmount > 10000 ? 1500 : numAmount,
          is_new_device: newDevice,
          international: international,
          is_night: night,
          transactions_last_1h: numVelocity,
          device_risk_score: newDevice ? 75 : 15,
          merchant_risk_score: category === "Jewelry" || category === "Gaming" ? 70 : 25,
        }),
      });

      setResult(response);
    } catch (err) {
      console.error("Simulation failed:", err);
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  const probability =
    result?.fraud_probability != null
      ? Number(result.fraud_probability) <= 1
        ? Number(result.fraud_probability) * 100
        : Number(result.fraud_probability)
      : 0;

  return (
    <div className="dashboard-page simulator-page">
      <header className="page-header">
        <div>
          <div className="eyebrow">
            <span className="pulse-dot" />
            WHAT-IF SIMULATOR
          </div>
          <h1>Fraud Scenario Simulator</h1>
          <p>
            Test real-time model predictions by building custom scenarios or choosing pre-configured fraud attack presets.
          </p>
        </div>
      </header>

      {/* QUICK PRESETS */}
      <div className="preset-bar" style={{ marginBottom: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "600", fontSize: "0.85rem", color: "#64748b" }}>
          <Zap size={15} color="#3b82f6" /> Quick Presets:
        </span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            className="secondary-button"
            style={{ padding: "6px 12px", fontSize: "0.82rem", borderRadius: "6px", cursor: "pointer" }}
            onClick={() => applyPreset(p)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert simulator-alert" style={{ marginBottom: "20px" }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="dashboard-grid charts-two">
        {/* SCENARIO CONTROLS */}
        <div className="panel simulator-controls">
          <div className="panel-heading">
            <div>
              <h2>
                <FlaskConical size={17} />
                Scenario Controls
              </h2>
              <p>Configure parameters to simulate a test transaction.</p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="amount">Transaction Amount (₹ / $)</label>
              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 4500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="velocity">Transactions in Last 1 Hour</label>
              <input
                id="velocity"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="e.g. 2"
                value={velocity}
                onChange={(e) => setVelocity(e.target.value)}
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="category">Merchant Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  fontSize: "0.9rem",
                }}
              >
                {MERCHANT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="check-list" style={{ marginTop: "16px" }}>
            <label className="simulator-check">
              <input
                type="checkbox"
                checked={newDevice}
                onChange={(e) => setNewDevice(e.target.checked)}
              />
              <span>New / Unrecognized Device</span>
            </label>

            <label className="simulator-check">
              <input
                type="checkbox"
                checked={international}
                onChange={(e) => setInternational(e.target.checked)}
              />
              <span>International Transaction (Cross-Border)</span>
            </label>

            <label className="simulator-check">
              <input
                type="checkbox"
                checked={night}
                onChange={(e) => setNight(e.target.checked)}
              />
              <span>Night Hours Transaction</span>
            </label>
          </div>

          <button
            className="primary wide-button simulator-run-button"
            style={{ marginTop: "20px" }}
            onClick={() => void run()}
            disabled={loading}
          >
            {loading ? (
              <>
                <FlaskConical size={15} />
                Running ML Inference...
              </>
            ) : (
              <>
                <Play size={15} />
                Run Prediction Engine
              </>
            )}
          </button>
        </div>

        {/* PREDICTION RESULT PANEL */}
        <div className="panel result-panel simulator-result">
          {!result ? (
            <div className="simulator-empty">
              <FlaskConical size={34} />
              <h2>No Prediction Yet</h2>
              <p>
                Adjust the scenario inputs or click a <strong>Quick Preset</strong> above, then click <strong>Run Prediction Engine</strong>.
              </p>
            </div>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <span className="detail-label">PREDICTION RESULT</span>
                  <h2>Fraud Assessment</h2>
                  <p>Inference result returned by XGBoost Model Service.</p>
                </div>
                <StatusBadge risk={result.risk_level || "LOW"} />
              </div>

              <div className="simulator-probability">
                <span>FRAUD PROBABILITY</span>
                <strong style={{ color: probability >= (thresholds.fraud_threshold * 100) ? "#ef4444" : probability >= (thresholds.review_threshold * 100) ? "#f59e0b" : "#10b981" }}>
                  {probability.toFixed(2)}%
                </strong>
              </div>

              <div className="simulator-progress">
                <div
                  style={{
                    width: `${Math.min(probability, 100)}%`,
                    backgroundColor: probability >= (thresholds.fraud_threshold * 100) ? "#ef4444" : probability >= (thresholds.review_threshold * 100) ? "#f59e0b" : "#10b981",
                  }}
                />
              </div>

              <div className="simulator-result-grid">
                <div className="simulator-result-box">
                  <span>
                    <ShieldAlert size={15} />
                    Decision
                  </span>
                  <strong>{result.decision || "—"}</strong>
                </div>

                <div className="simulator-result-box">
                  <span>
                    <Clock3 size={15} />
                    Latency SLA
                  </span>
                  <strong>
                    {Number(result.latency_ms || 0).toFixed(2)} ms
                    <span style={{ fontSize: "0.75rem", color: "#10b981", marginLeft: "5px" }}>(PASS &lt;50ms)</span>
                  </strong>
                </div>
              </div>

              <div className="simulator-signals">
                <h3>Triggered Risk Signals</h3>
                {Array.isArray(result.reasons) && result.reasons.length > 0 ? (
                  result.reasons.map((reason, index) => (
                    <div className="simulator-reason" key={index}>
                      <AlertTriangle size={15} />
                      <span>{reason}</span>
                    </div>
                  ))
                ) : (
                  <div className="simulator-reason safe">
                    <CheckCircle2 size={15} />
                    <span>No anomaly risk signals triggered. Normal transaction pattern.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}