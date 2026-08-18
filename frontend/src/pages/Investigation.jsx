import {
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Activity,
  Clock3,
  Eye,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  CreditCard,
} from "lucide-react";

import { useStream } from "../content/StreamContext";
import "../styles/Investigation.css";
import StatusBadge from "../components/StatusBadge";
import MetricCard from "../components/MetricCard";

// =========================================================
// HELPERS
// =========================================================

const getRisk = (tx) => {
  return String(
    tx?.risk_level ??
      tx?.risk ??
      "LOW"
  ).toUpperCase();
};

const getProbability = (tx) => {
  const value = Number(
    tx?.fraud_probability ??
      tx?.probability ??
      0
  );

  return value <= 1
    ? value * 100
    : value;
};

const getLatency = (tx) => {
  return Number(
    tx?.latency_ms ??
      tx?.latency ??
      0
  );
};

// =========================================================
// COMPONENT
// =========================================================

export default function Investigation() {
  const {
    items,
    running,
  } = useStream();

  // =========================================================
  // STATE
  // =========================================================

  const [selectedId, setSelectedId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  // =========================================================
  // TRANSACTIONS
  //
  // items already contains maximum 243.
  //
  // We do NOT slice to 243 here.
  // If items has 1 -> display 1.
  // If items has 13 -> display 13.
  // =========================================================

  const transactions = useMemo(() => {
    if (!Array.isArray(items)) {
      return [];
    }

    return [...items].reverse();
  }, [items]);

  // =========================================================
  // FILTERED TRANSACTIONS
  // =========================================================

  const filteredTransactions =
    useMemo(() => {
      const searchText =
        search
          .toLowerCase()
          .trim();

      return transactions.filter(
        (tx) => {
          const risk =
            getRisk(tx);

          const transactionId =
            String(
              tx?.transaction_id ??
                ""
            ).toLowerCase();

          const accountId =
            String(
              tx?.account_id ??
                ""
            ).toLowerCase();

          const merchant =
            String(
              tx?.merchant_category ??
                ""
            ).toLowerCase();

          const matchesSearch =
            !searchText ||
            transactionId.includes(
              searchText
            ) ||
            accountId.includes(
              searchText
            ) ||
            merchant.includes(
              searchText
            );

          const matchesFilter =
            filter === "ALL" ||
            risk === filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      transactions,
      search,
      filter,
    ]);

  // =========================================================
  // SELECT TRANSACTION
  // =========================================================

  const handleInvestigate = () => {
    const enteredId =
      search.trim();

    if (!enteredId) {
      setSelectedId(null);
      return;
    }

    const found =
      transactions.find(
        (tx) =>
          String(
            tx?.transaction_id ??
              ""
          ).toLowerCase() ===
          enteredId.toLowerCase()
      );

    if (found) {
      setSelectedId(
        found.transaction_id
      );
    } else {
      setSelectedId(null);

      alert(
        `Transaction "${enteredId}" was not found in the current stream.`
      );
    }
  };

  // =========================================================
  // SELECTED TRANSACTION
  // =========================================================

  const selectedTransaction =
    useMemo(() => {
      if (!selectedId) {
        return null;
      }

      return (
        transactions.find(
          (tx) =>
            String(
              tx?.transaction_id
            ) ===
            String(selectedId)
        ) ?? null
      );
    }, [
      transactions,
      selectedId,
    ]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const total =
    transactions.length;

  const high =
    transactions.filter(
      (tx) =>
        getRisk(tx) === "HIGH"
    ).length;

  const medium =
    transactions.filter(
      (tx) =>
        getRisk(tx) === "MEDIUM"
    ).length;

  const low =
    transactions.filter(
      (tx) =>
        getRisk(tx) === "LOW"
    ).length;

  // =========================================================
  // SELECTED DATA
  // =========================================================

  const selectedRisk =
    selectedTransaction
      ? getRisk(selectedTransaction)
      : "LOW";

  const selectedProbability =
    selectedTransaction
      ? getProbability(
          selectedTransaction
        )
      : 0;

  const selectedLatency =
    selectedTransaction
      ? getLatency(
          selectedTransaction
        )
      : 0;

  // =========================================================
  // EMPTY STREAM
  // =========================================================

  if (transactions.length === 0) {
    return (
      <div className="dashboard-page">

        <header className="page-header">

          <div>
            <div className="eyebrow">
              <span className="pulse-dot" />
              FRAUD INVESTIGATION
            </div>

            <h1>
              Investigation Center
            </h1>

            <p>
              Inspect suspicious transactions
              detected by the live fraud
              detection engine.
            </p>
          </div>

          <div className="system-pill">
            <span className="offline-dot" />
            NO TRANSACTIONS
          </div>

        </header>

        <div className="panel empty-investigation">

          <ShieldAlert size={42} />

          <h2>
            No transactions available
          </h2>

          <p>
            Start the live stream from
            Live Monitor to investigate
            transactions.
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="dashboard-page">

      {/* HEADER */}

      <header className="page-header">

        <div>

          <div className="eyebrow">

            <span className="pulse-dot" />

            FRAUD INVESTIGATION

          </div>

          <h1>
            Investigation Center
          </h1>

          <p>
            Inspect suspicious transactions
            detected by the live fraud
            detection engine.
          </p>

        </div>

        <div className="system-pill">

          <span
            className={
              running
                ? "online-dot"
                : "offline-dot"
            }
          />

          {running
            ? "STREAM LIVE"
            : "STREAM READY"}

        </div>

      </header>

      {/* SUMMARY CARDS */}

      <section className="metrics metrics-primary">

        <MetricCard
          label="Transactions"
          value={total.toLocaleString()}
          helper="Current stream session"
          tone="blue"
          icon={
            <Activity size={18} />
          }
        />

        <MetricCard
          label="High risk"
          value={high.toLocaleString()}
          helper="Requires investigation"
          tone="red"
          icon={
            <ShieldAlert size={18} />
          }
        />

        <MetricCard
          label="Medium risk"
          value={medium.toLocaleString()}
          helper="Potentially suspicious"
          tone="orange"
          icon={
            <AlertTriangle size={18} />
          }
        />

        <MetricCard
          label="Low risk"
          value={low.toLocaleString()}
          helper="Normal transactions"
          tone="green"
          icon={
            <ShieldCheck size={18} />
          }
        />

      </section>

      {/* SEARCH */}

      <section className="panel investigation-search-panel">

        <div className="investigation-search-header">

          <div>

            <h2>
              Find a transaction
            </h2>

            <p>
              Enter a transaction ID to
              investigate it.
            </p>

          </div>

          <Search size={24} />

        </div>

        <div className="transaction-search-row">

          <div className="transaction-search-input">

            <Search size={18} />

            <input
              type="text"
              value={search}
              placeholder="Example: STREAM-000417"
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleInvestigate();
                }
              }}
            />

          </div>

          <button
            type="button"
            className="investigate-button"
            onClick={
              handleInvestigate
            }
          >
            Investigate
          </button>

          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setSearch("");
              setSelectedId(null);
            }}
          >
            Clear
          </button>

        </div>

        <div className="investigation-filters">

          {[
            "ALL",
            "HIGH",
            "MEDIUM",
            "LOW",
          ].map((risk) => (
            <button
              key={risk}
              type="button"
              className={
                filter === risk
                  ? "filter-btn active"
                  : "filter-btn"
              }
              onClick={() =>
                setFilter(risk)
              }
            >
              {risk}
            </button>
          ))}

        </div>

      </section>

      {/* TRANSACTION LIST */}

      <section className="panel transaction-browser">

        <div className="panel-heading">

          <div>

            <h2>
              Transactions
            </h2>

            <p>
              Click a transaction to
              investigate it directly.
            </p>

          </div>

          <span className="transaction-count">

            {filteredTransactions.length.toLocaleString()}{" "}

            {filteredTransactions.length === 1
              ? "transaction"
              : "transactions"}

          </span>

        </div>

        <div className="transaction-list">

          {filteredTransactions.length > 0 ? (

            filteredTransactions.map(
              (tx, index) => {

                const risk =
                  getRisk(tx);

                const probability =
                  getProbability(tx);

                const transactionId =
                  tx?.transaction_id ??
                  `TX-${index + 1}`;

                const isSelected =
                  String(selectedId) ===
                  String(transactionId);

                return (
                  <button
                    key={`${transactionId}-${index}`}
                    type="button"
                    className={
                      isSelected
                        ? "transaction-item selected"
                        : "transaction-item"
                    }
                    onClick={() => {
                      setSelectedId(
                        transactionId
                      );

                      setSearch(
                        transactionId
                      );
                    }}
                  >

                    <div className="transaction-item-top">

                      <strong
                        title={transactionId}
                      >
                        {transactionId}
                      </strong>

                      <StatusBadge
                        risk={risk}
                      />

                    </div>

                    <div className="transaction-item-middle">

                      <div className="transaction-value">

                        <span>
                          Amount
                        </span>

                        <strong>
                          ₹
                          {Number(
                            tx?.amount ?? 0
                          ).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </strong>

                      </div>

                      <div className="transaction-value probability">

                        <span>
                          Fraud probability
                        </span>

                        <strong>
                          {probability.toFixed(2)}
                          %
                        </strong>

                      </div>

                    </div>

                    <div className="transaction-item-bottom">

                      <span
                        className="merchant-name"
                        title={
                          tx?.merchant_category ??
                          "Unknown merchant"
                        }
                      >
                        {tx?.merchant_category ??
                          "Unknown merchant"}
                      </span>

                      <span className="view-label">

                        <Eye size={14} />

                        Investigate

                      </span>

                    </div>

                  </button>
                );
              }
            )

          ) : (

            <div className="empty-list">
              No matching transactions.
            </div>

          )}

        </div>

      </section>

      {/* INVESTIGATION DETAIL */}

      <section className="panel investigation-detail">

        {!selectedTransaction ? (

          <div className="investigation-placeholder">

            <div className="placeholder-icon">
              <Search size={28} />
            </div>

            <h2>
              No transaction selected
            </h2>

            <p>
              Enter a transaction ID above
              and click <strong>Investigate</strong>,
              or click a transaction from
              the list.
            </p>

            <div className="placeholder-example">

              Example:

              <strong>
                STREAM-000417
              </strong>

            </div>

          </div>

        ) : (

          <>

            <div className="investigation-detail-header">

              <div>

                <span className="detail-label">
                  TRANSACTION
                </span>

                <h2>
                  {selectedTransaction.transaction_id}
                </h2>

              </div>

              <StatusBadge
                risk={selectedRisk}
              />

            </div>

            <div className="risk-score-card">

              <div className="risk-score-header">

                <div>

                  <span>
                    FRAUD PROBABILITY
                  </span>

                  <strong>
                    {selectedProbability.toFixed(2)}
                    %
                  </strong>

                </div>

                <span
                  className={`risk-label ${selectedRisk.toLowerCase()}`}
                >
                  {selectedRisk}
                </span>

              </div>

              <div className="risk-progress">

                <div
                  className={`risk-progress-bar ${selectedRisk.toLowerCase()}`}
                  style={{
                    width: `${Math.min(
                      selectedProbability,
                      100
                    )}%`,
                  }}
                />

              </div>

              <p>

                {selectedRisk === "HIGH"
                  ? "This transaction requires immediate investigation."
                  : selectedRisk === "MEDIUM"
                  ? "This transaction shows suspicious characteristics."
                  : "This transaction currently appears to be low risk."}

              </p>

            </div>

            <div className="detail-section">

              <h3>
                Transaction details
              </h3>

              <div className="detail-grid">

                <div className="detail-box">

                  <span>
                    <CreditCard size={16} />
                    Amount
                  </span>

                  <strong>
                    ₹
                    {Number(
                      selectedTransaction.amount ??
                        0
                    ).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </strong>

                </div>

                <div className="detail-box">

                  <span>
                    <TrendingUp size={16} />
                    Decision
                  </span>

                  <strong>
                    {selectedTransaction.decision ??
                      "—"}
                  </strong>

                </div>

                <div className="detail-box">

                  <span>
                    <User size={16} />
                    Account
                  </span>

                  <strong>
                    {selectedTransaction.account_id ??
                      "—"}
                  </strong>

                </div>

                <div className="detail-box">

                  <span>
                    <Activity size={16} />
                    Merchant
                  </span>

                  <strong>
                    {selectedTransaction.merchant_category ??
                      "—"}
                  </strong>

                </div>

                <div className="detail-box">

                  <span>
                    <Clock3 size={16} />
                    Latency
                  </span>

                  <strong>
                    {selectedLatency.toFixed(2)} ms
                  </strong>

                </div>

                <div className="detail-box">

                  <span>
                    <ShieldAlert size={16} />
                    Risk
                  </span>

                  <strong
                    className={`risk-text ${selectedRisk.toLowerCase()}`}
                  >
                    {selectedRisk}
                  </strong>

                </div>

              </div>

            </div>

            <div className="investigation-note">

              <div className="note-icon">

                {selectedRisk === "HIGH" ? (
                  <AlertTriangle size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )}

              </div>

              <div>

                <strong>
                  Model assessment
                </strong>

                <p>

                  The fraud detection model
                  assigned this transaction a{" "}

                  <strong>
                    {selectedProbability.toFixed(2)}
                    %
                  </strong>{" "}

                  fraud probability and
                  classified it as{" "}

                  <strong>
                    {selectedRisk}
                  </strong>{" "}
                  risk.

                </p>

              </div>

            </div>

          </>

        )}

      </section>

    </div>
  );
}