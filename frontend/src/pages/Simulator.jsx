import { useState } from "react";
import "../styles/simulator.css";

import {
  FlaskConical,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";

import { api } from "../api";

import StatusBadge from "../components/StatusBadge";

export default function Simulator() {
  // =====================================================
  // SCENARIO INPUTS
  // =====================================================

  const [amount, setAmount] = useState("");

  const [newDevice, setNewDevice] = useState(false);

  const [international, setInternational] =
    useState(false);

  const [night, setNight] = useState(false);

  const [velocity, setVelocity] = useState("");

  // =====================================================
  // RESULT
  // =====================================================

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  // =====================================================
  // RUN PREDICTION
  // =====================================================

  const run = async () => {
    try {
      setError("");
      setResult(null);

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (
        amount === "" ||
        Number(amount) < 0
      ) {
        setError(
          "Please enter a valid transaction amount."
        );
        return;
      }

      if (
        velocity === "" ||
        Number(velocity) < 0
      ) {
        setError(
          "Please enter a valid transaction velocity."
        );
        return;
      }

      setLoading(true);

      // -----------------------------------------------
      // SEND TO BACKEND
      // -----------------------------------------------

      const response = await api(
        "/api/predict",
        {
          method: "POST",

          body: JSON.stringify({
            transaction_id: "SIM-001",

            account_id: "SIM-ACCOUNT",

            amount: Number(amount),

            merchant_category:
              "Electronics",

            country: international
              ? "US"
              : "IN",

            avg_amount_7d: Number(amount),

            is_new_device:
              newDevice,

            international:
              international,

            is_night:
              night,

            transactions_last_1h:
              Number(velocity),

            device_risk_score:
              newDevice
                ? 75
                : 15,

            merchant_risk_score: 25,
          }),
        }
      );

      setResult(response);

    } catch (err) {
      console.error(
        "Simulation failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Simulation failed"
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // PROBABILITY
  // =====================================================

  const probability =
    result?.fraud_probability != null
      ? Number(
          result.fraud_probability
        ) <= 1
        ? Number(
            result.fraud_probability
          ) * 100
        : Number(
            result.fraud_probability
          )
      : 0;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="dashboard-page simulator-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="page-header">

        <div>

          <div className="eyebrow">

            <span className="pulse-dot" />

            WHAT-IF SIMULATOR

          </div>

          <h1>
            Fraud scenario simulator
          </h1>

          <p>
            Enter your own transaction
            conditions and see how the
            fraud detection model responds.
          </p>

        </div>

      </header>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="alert simulator-alert">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>
      )}

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div className="dashboard-grid charts-two">

        {/* =================================================
            SCENARIO CONTROLS
        ================================================= */}

        <div className="panel simulator-controls">

          <div className="panel-heading">

            <div>

              <h2>

                <FlaskConical
                  size={17}
                />

                Scenario controls

              </h2>

              <p>
                Enter values to create a
                test transaction.
              </p>

            </div>

          </div>

          {/* =================================================
              INPUTS
          ================================================= */}

          <div className="form-grid">

            {/* AMOUNT */}

            <div className="field">

              <label htmlFor="amount">
                Transaction amount
              </label>

              <input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value
                  )
                }
              />

            </div>

            {/* VELOCITY */}

            <div className="field">

              <label htmlFor="velocity">
                Transactions in last 1 hour
              </label>

              <input
                id="velocity"
                type="number"
                min="0"
                step="1"
                placeholder="Enter transaction count"
                value={velocity}
                onChange={(e) =>
                  setVelocity(
                    e.target.value
                  )
                }
              />

            </div>

          </div>

          {/* =================================================
              CHECKBOXES
          ================================================= */}

          <div className="check-list">

            <label className="simulator-check">

              <input
                type="checkbox"
                checked={newDevice}
                onChange={(e) =>
                  setNewDevice(
                    e.target.checked
                  )
                }
              />

              <span>
                New device
              </span>

            </label>

            <label className="simulator-check">

              <input
                type="checkbox"
                checked={international}
                onChange={(e) =>
                  setInternational(
                    e.target.checked
                  )
                }
              />

              <span>
                International transaction
              </span>

            </label>

            <label className="simulator-check">

              <input
                type="checkbox"
                checked={night}
                onChange={(e) =>
                  setNight(
                    e.target.checked
                  )
                }
              />

              <span>
                Night transaction
              </span>

            </label>

          </div>

          {/* =================================================
              RUN BUTTON
          ================================================= */}

          <button
            className="primary wide-button simulator-run-button"
            onClick={() =>
              void run()
            }
            disabled={loading}
          >

            {loading ? (
              <>
                <FlaskConical
                  size={15}
                />

                Running prediction...
              </>
            ) : (
              <>
                <Play
                  size={15}
                />

                Run prediction
              </>
            )}

          </button>

        </div>

        {/* =================================================
            RESULT
        ================================================= */}

        <div className="panel result-panel simulator-result">

          {!result ? (

            <div className="simulator-empty">

              <FlaskConical
                size={34}
              />

              <h2>
                No prediction yet
              </h2>

              <p>
                Enter your transaction
                conditions and click
                <strong>
                  {" "}Run prediction
                </strong>.
              </p>

            </div>

          ) : (

            <>

              {/* RESULT HEADER */}

              <div className="panel-heading">

                <div>

                  <span className="detail-label">
                    PREDICTION RESULT
                  </span>

                  <h2>
                    Fraud assessment
                  </h2>

                  <p>
                    Result returned by the
                    FastAPI model service.
                  </p>

                </div>

                <StatusBadge
                  risk={
                    result.risk_level ||
                    "LOW"
                  }
                />

              </div>

              {/* =================================================
                  PROBABILITY
              ================================================= */}

              <div className="simulator-probability">

                <span>
                  FRAUD PROBABILITY
                </span>

                <strong>
                  {probability.toFixed(2)}%
                </strong>

              </div>

              {/* =================================================
                  PROGRESS
              ================================================= */}

              <div className="simulator-progress">

                <div
                  style={{
                    width: `${Math.min(
                      probability,
                      100
                    )}%`,
                  }}
                />

              </div>

              {/* =================================================
                  DECISION + LATENCY
              ================================================= */}

              <div className="simulator-result-grid">

                <div className="simulator-result-box">

                  <span>
                    <ShieldAlert
                      size={15}
                    />

                    Decision
                  </span>

                  <strong>
                    {result.decision ||
                      "—"}
                  </strong>

                </div>

                <div className="simulator-result-box">

                  <span>
                    <Clock3
                      size={15}
                    />

                    Latency
                  </span>

                  <strong>
                    {Number(
                      result.latency_ms ||
                        0
                    ).toFixed(2)}{" "}
                    ms
                  </strong>

                </div>

              </div>

              {/* =================================================
                  RISK SIGNALS
              ================================================= */}

              <div className="simulator-signals">

                <h3>
                  Risk signals
                </h3>

                {Array.isArray(
                  result.reasons
                ) &&
                result.reasons.length > 0 ? (

                  result.reasons.map(
                    (reason, index) => (

                      <div
                        className="simulator-reason"
                        key={index}
                      >

                        <AlertTriangle
                          size={15}
                        />

                        <span>
                          {reason}
                        </span>

                      </div>

                    )
                  )

                ) : (

                  <div className="simulator-reason safe">

                    <CheckCircle2
                      size={15}
                    />

                    <span>
                      No additional risk
                      signals returned.
                    </span>

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