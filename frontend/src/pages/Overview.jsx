import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "../api";

import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";

import { useStream } from "../content/StreamContext";


// =========================================================
// COLORS
// =========================================================

const riskColors = {
  LOW: "#16a34a",
  MEDIUM: "#f59e0b",
  HIGH: "#dc2626",
};

const metricColors = [
  "#2563eb",
  "#7c3aed",
  "#f59e0b",
  "#16a34a",
  "#dc2626",
  "#0f766e",
];


// =========================================================
// OVERVIEW
// =========================================================

export default function Overview() {

  // =======================================================
  // LIVE STREAM STATE
  //
  // IMPORTANT:
  // items       = latest transactions kept for table
  // streamCount = TOTAL transactions processed
  // highRiskCount = TOTAL high-risk transactions
  // =======================================================

  const {
    items,
    running,
    busy,
    streamCount,
    highRiskCount,
  } = useStream();


  // =======================================================
  // MODEL DATA
  // =======================================================

  const [metrics, setMetrics] = useState(null);

  const [health, setHealth] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);


  // =======================================================
  // LOAD MODEL DATA
  // =======================================================

  const loadModelData = useCallback(
    async () => {

      try {

        const [
          metricsData,
          healthData,
        ] = await Promise.all([
          api("/api/metrics"),
          api("/api/health"),
        ]);


        setMetrics(metricsData);

        setHealth(healthData);

        setLastUpdated(new Date());

        setError("");

      } catch (err) {

        console.error(
          "Overview loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard data"
        );

      } finally {

        setLoading(false);

      }

    },
    []
  );


  // =======================================================
  // MODEL DATA REFRESH
  // =======================================================

  useEffect(() => {

    void loadModelData();


    const timer =
      window.setInterval(
        () => {
          void loadModelData();
        },
        5000
      );


    return () =>
      window.clearInterval(timer);

  }, [loadModelData]);


  // =======================================================
  // LIVE TRANSACTIONS
  //
  // This is ONLY the transactions currently stored
  // for the recent table.
  //
  // It can contain maximum 50.
  //
  // DO NOT use this for total stream count.
  // =======================================================

  const liveTransactions =
    useMemo(() => {

      if (!Array.isArray(items)) {
        return [];
      }

      return items;

    }, [items]);


  // =======================================================
  // TOTAL STREAM TRANSACTIONS
  //
  // IMPORTANT CHANGE:
  //
  // BEFORE:
  // liveTransactions.length
  //
  // NOW:
  // streamCount
  //
  // Therefore:
  //
  // 1 transaction  -> 1
  // 5 transactions -> 5
  // 50 transactions -> 50
  // 243 transactions -> 243
  // 1000 transactions -> 1000
  // =======================================================

  const streamTransactions =
    streamCount;


  // =======================================================
  // TOTAL HIGH-RISK / FRAUD ALERTS
  //
  // IMPORTANT:
  // Use highRiskCount from StreamContext.
  //
  // Do NOT calculate this from items because items
  // contains only the latest 50 transactions.
  // =======================================================

  const fraudAlerts =
    highRiskCount;


  // =======================================================
  // FRAUD RATE
  // =======================================================

  const fraudRate =
    streamTransactions > 0
      ? (
          fraudAlerts /
          streamTransactions
        ) * 100
      : 0;


  // =======================================================
  // RISK DISTRIBUTION
  //
  // This chart currently represents the transactions
  // stored in `items`.
  //
  // Since items contains the latest 50, this chart
  // represents the CURRENT/RECENT distribution.
  // =======================================================

  const riskData = useMemo(() => {

    let low = 0;

    let medium = 0;

    let high = 0;


    liveTransactions.forEach(
      (tx) => {

        const risk =
          String(
            tx?.risk_level ||
            tx?.risk ||
            "LOW"
          ).toUpperCase();


        if (risk === "HIGH") {

          high++;

        } else if (
          risk === "MEDIUM"
        ) {

          medium++;

        } else {

          low++;

        }

      }
    );


    return [
      {
        name: "LOW",
        value: low,
      },
      {
        name: "MEDIUM",
        value: medium,
      },
      {
        name: "HIGH",
        value: high,
      },
    ].filter(
      (item) =>
        item.value > 0
    );

  }, [liveTransactions]);


  // =======================================================
  // LATENCY DATA
  // =======================================================

  const latencyData =
    useMemo(() => {

      return liveTransactions
        .slice(-20)
        .map(
          (tx, index) => {

            const latency =
              Number(
                tx?.latency_ms ??
                tx?.latency ??
                0
              );


            return {

              sequence:
                tx?.sequence ??
                tx?.seq ??
                index + 1,

              latency,

              status:
                latency > 50
                  ? "SLOW"
                  : "NORMAL",

            };

          }
        );

    }, [liveTransactions]);


  // =======================================================
  // AVERAGE LATENCY
  // =======================================================

  const avgLatency =
    useMemo(() => {

      if (
        liveTransactions.length === 0
      ) {

        return 0;

      }


      const total =
        liveTransactions.reduce(
          (sum, tx) =>
            sum +
            Number(
              tx?.latency_ms ??
              tx?.latency ??
              0
            ),
          0
        );


      return (
        total /
        liveTransactions.length
      );

    }, [liveTransactions]);


  // =======================================================
  // THROUGHPUT
  //
  // Current frontend approximation.
  // =======================================================

  const throughput =
    liveTransactions.length > 0
      ? liveTransactions.length
      : 0;


  // =======================================================
  // MODEL METRICS
  // =======================================================

  const metricData =
    useMemo(() => {

      if (!metrics) {
        return [];
      }


      return [

        {
          name: "Accuracy",
          value: Number(
            metrics.accuracy || 0
          ),
        },

        {
          name: "Precision",
          value: Number(
            metrics.precision || 0
          ),
        },

        {
          name: "Recall",
          value: Number(
            metrics.recall || 0
          ),
        },

        {
          name: "F1 Score",
          value: Number(
            metrics.f1_score || 0
          ),
        },

        {
          name: "PR-AUC",
          value: Number(
            metrics.pr_auc || 0
          ),
        },

        {
          name: "ROC-AUC",
          value: Number(
            metrics.roc_auc || 0
          ),
        },

      ];

    }, [metrics]);


  // =======================================================
  // AVERAGE FRAUD PROBABILITY
  // =======================================================

  const avgProbability =
    useMemo(() => {

      if (
        liveTransactions.length === 0
      ) {

        return 0;

      }


      const total =
        liveTransactions.reduce(
          (sum, tx) =>
            sum +
            Number(
              tx?.fraud_probability ??
              tx?.probability ??
              0
            ),
          0
        );


      const average =
        total /
        liveTransactions.length;


      return average <= 1
        ? average * 100
        : average;

    }, [liveTransactions]);


  // =======================================================
  // RECENT TRANSACTIONS
  //
  // Only latest 8 displayed.
  // =======================================================

  const recentTransactions =
    useMemo(() => {

      return liveTransactions
        .slice()
        .reverse()
        .slice(0, 8);

    }, [liveTransactions]);


  // =======================================================
  // UI
  // =======================================================

  return (

    <div className="dashboard-page">


      {/* ===================================================
          HEADER
      =================================================== */}

      <header className="page-header">

        <div>

          <div className="eyebrow">

            <span className="pulse-dot" />

            REAL-TIME FRAUD DETECTION

          </div>


          <h1>
            FraudGuard Control Center
          </h1>


          <p>
            One dashboard for model quality,
            fraud risk and live
            pseudo-streaming performance.
          </p>

        </div>


        <div className="header-actions">


          {/* API STATUS */}

          <div className="system-pill">

            <span
              className={
                health?.status === "ok"
                  ? "online-dot"
                  : "offline-dot"
              }
            />


            {health?.status === "ok"
              ? "API ONLINE"
              : "API OFFLINE"}

          </div>


          {/* UPDATED */}

          <div className="updated-box">

            <span>
              UPDATED
            </span>


            <strong>

              {lastUpdated
                ? lastUpdated.toLocaleTimeString()
                : "—"}

            </strong>

          </div>


          {/* REFRESH */}

          <button
            className="secondary icon-button"
            onClick={() =>
              void loadModelData()
            }
            disabled={loading}
            title="Refresh dashboard"
          >

            <RefreshCw
              size={16}
              className={
                loading
                  ? "spin"
                  : ""
              }
            />

          </button>

        </div>

      </header>


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (

        <div className="alert">

          <AlertTriangle
            size={18}
          />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ===================================================
          MODEL PERFORMANCE
      =================================================== */}

      <section className="section-title">

        <div>

          <h2>
            Model performance
          </h2>


          <p>
            Measured on the backend
            evaluation/test data.
            Values are percentages.
          </p>

        </div>


        <span className="model-tag">

          <BrainCircuit
            size={14}
          />


          {health?.model_loaded
            ? "MODEL LOADED"
            : "MODEL NOT LOADED"}

        </span>

      </section>


      <section className="metrics metrics-model">


        <MetricCard
          label="Accuracy"
          value={
            metrics
              ? `${Number(
                  metrics.accuracy
                ).toFixed(2)}%`
              : "—"
          }
          helper="Overall classification correctness"
          tone="blue"
          icon={
            <Target size={18} />
          }
        />


        <MetricCard
          label="Precision"
          value={
            metrics
              ? `${Number(
                  metrics.precision
                ).toFixed(2)}%`
              : "—"
          }
          helper="Fraud alerts that were correct"
          tone="purple"
          icon={
            <CheckCircle2
              size={18}
            />
          }
        />


        <MetricCard
          label="Recall"
          value={
            metrics
              ? `${Number(
                  metrics.recall
                ).toFixed(2)}%`
              : "—"
          }
          helper="Fraud cases successfully found"
          tone="orange"
          icon={
            <TrendingUp
              size={18}
            />
          }
        />


        <MetricCard
          label="F1 Score"
          value={
            metrics
              ? `${Number(
                  metrics.f1_score
                ).toFixed(2)}%`
              : "—"
          }
          helper="Precision-recall balance"
          tone="green"
          icon={
            <Activity
              size={18}
            />
          }
        />


        <MetricCard
          label="PR-AUC"
          value={
            metrics
              ? `${Number(
                  metrics.pr_auc
                ).toFixed(2)}%`
              : "—"
          }
          helper="Strong metric for imbalanced fraud data"
          tone="red"
          icon={
            <ShieldAlert
              size={18}
            />
          }
        />


        <MetricCard
          label="ROC-AUC"
          value={
            metrics
              ? `${Number(
                  metrics.roc_auc
                ).toFixed(2)}%`
              : "—"
          }
          helper="Ranking quality across thresholds"
          tone="blue"
          icon={
            <TrendingUp
              size={18}
            />
          }
        />

      </section>


      {/* ===================================================
          LIVE STREAM KPIs
      =================================================== */}

      <section className="metrics metrics-primary dashboard-kpis">


        {/* TOTAL TRANSACTIONS */}

        <MetricCard
          label="Stream transactions"

          value={
            streamTransactions.toLocaleString()
          }

          helper={
            running
              ? "Transactions currently streaming"
              : "Transactions in current stream session"
          }

          tone="blue"

          icon={
            <Activity
              size={18}
            />
          }
        />


        {/* FRAUD ALERTS */}

        <MetricCard
          label="Fraud alerts"

          value={
            fraudAlerts.toLocaleString()
          }

          helper="HIGH-risk predictions"

          tone="red"

          icon={
            <ShieldAlert
              size={18}
            />
          }
        />


        {/* FRAUD RATE */}

        <MetricCard
          label="Fraud rate"

          value={`${fraudRate.toFixed(2)}%`}

          helper="High-risk share of live stream"

          tone="orange"

          icon={
            <TrendingUp
              size={18}
            />
          }
        />


        {/* LATENCY */}

        <MetricCard
          label="Avg latency"

          value={`${avgLatency.toFixed(2)} ms`}

          helper={`${throughput.toFixed(
            2
          )} transactions/sec`}

          tone="green"

          icon={
            <Clock3
              size={18}
            />
          }
        />

      </section>


      {/* ===================================================
          MODEL SCORE + RISK
      =================================================== */}

      <section className="dashboard-grid charts-two">


        {/* MODEL SCORE */}

        <div className="panel chart-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Model score comparison
              </h2>

              <p>
                Higher is better for each
                evaluation metric.
              </p>

            </div>

          </div>


          {metricData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height={320}
            >

              <BarChart
                data={metricData}
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 5,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />


                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                  }}
                />


                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 10,
                  }}
                />


                <Tooltip
                  formatter={(value) => [
                    `${Number(
                      value
                    ).toFixed(2)}%`,
                    "Score",
                  ]}
                />


                <Bar
                  dataKey="value"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                >

                  {metricData.map(
                    (_, index) => (

                      <Cell
                        key={index}
                        fill={
                          metricColors[
                            index
                          ]
                        }
                      />

                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          ) : (

            <div className="empty-chart">
              Metrics unavailable.
            </div>

          )}

        </div>


        {/* RISK DISTRIBUTION */}

        <div className="panel chart-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Risk distribution
              </h2>

              <p>
                Current live-stream
                classification mix.
              </p>

            </div>

          </div>


          {riskData.length > 0 ? (

            <>

              <div className="donut-wrap">

                <ResponsiveContainer
                  width="100%"
                  height={250}
                >

                  <PieChart>

                    <Pie
                      data={riskData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={68}
                      outerRadius={94}
                      paddingAngle={3}
                    >

                      {riskData.map(
                        (item) => (

                          <Cell
                            key={
                              item.name
                            }
                            fill={
                              riskColors[
                                item.name
                              ]
                            }
                          />

                        )
                      )}

                    </Pie>


                    <Tooltip />

                  </PieChart>

                </ResponsiveContainer>


                <div className="donut-center">

                  <strong>
                    {streamTransactions.toLocaleString()}
                  </strong>

                  <span>
                    transactions
                  </span>

                </div>

              </div>


              <div className="risk-legend">

                {riskData.map(
                  (item) => (

                    <div
                      key={
                        item.name
                      }
                    >

                      <span>

                        <i
                          style={{
                            background:
                              riskColors[
                                item.name
                              ],
                          }}
                        />

                        {item.name}

                      </span>


                      <strong>
                        {item.value.toLocaleString()}
                      </strong>

                    </div>

                  )
                )}

              </div>

            </>

          ) : (

            <div className="empty-chart">

              Start the live stream
              to populate risk data.

            </div>

          )}

        </div>

      </section>


      {/* ===================================================
          LATENCY + QUALITY
      =================================================== */}

      <section className="dashboard-grid charts-two">


        {/* LATENCY */}

        <div className="panel chart-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Streaming latency
              </h2>

              <p>
                Latest prediction latency.
                SLA limit: 50 ms.
              </p>

            </div>


            <span className="legend-pill">

              {running
                ? "LIVE"
                : "STREAM READY"}

            </span>

          </div>


          {latencyData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height={280}
            >

              <BarChart
                data={latencyData}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                />


                <XAxis
                  dataKey="sequence"
                  tick={{
                    fontSize: 9,
                  }}
                />


                <YAxis
                  tick={{
                    fontSize: 9,
                  }}
                />


                <Tooltip
                  formatter={(value) => [
                    `${Number(
                      value
                    ).toFixed(2)} ms`,
                    "Latency",
                  ]}
                />


                <Bar
                  dataKey="latency"
                  name="Latency (ms)"
                  radius={[
                    4,
                    4,
                    0,
                    0,
                  ]}
                >

                  {latencyData.map(
                    (
                      item,
                      index
                    ) => (

                      <Cell
                        key={`${item.sequence}-${index}`}
                        fill={
                          item.status ===
                          "SLOW"
                            ? "#dc2626"
                            : "#2563eb"
                        }
                      />

                    )
                  )}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          ) : (

            <div className="empty-chart">

              <Clock3
                size={22}
              />

              <span>
                Start the live stream
                to generate latency data.
              </span>

            </div>

          )}

        </div>


        {/* DETECTION QUALITY */}

        <div className="panel chart-panel">

          <div className="panel-heading">

            <div>

              <h2>
                Detection quality snapshot
              </h2>

              <p>
                Evaluation counts behind
                the model metrics.
              </p>

            </div>

          </div>


          <div className="quality-list">


            <div>

              <span>
                Test transactions
              </span>

              <strong>

                {metrics?.total_transactions !=
                null

                  ? Number(
                      metrics.total_transactions
                    ).toLocaleString()

                  : "—"}

              </strong>

            </div>


            <div>

              <span>
                Actual fraud
              </span>

              <strong>

                {metrics?.actual_fraud !=
                null

                  ? Number(
                      metrics.actual_fraud
                    ).toLocaleString()

                  : "—"}

              </strong>

            </div>


            <div>

              <span>
                Fraud detected
              </span>

              <strong className="text-green">

                {metrics?.fraud_detected !=
                null

                  ? Number(
                      metrics.fraud_detected
                    ).toLocaleString()

                  : "—"}

              </strong>

            </div>


            <div>

              <span>
                Fraud missed
              </span>

              <strong className="text-red">

                {metrics?.fraud_missed !=
                null

                  ? Number(
                      metrics.fraud_missed
                    ).toLocaleString()

                  : "—"}

              </strong>

            </div>


            <div>

              <span>
                False alerts
              </span>

              <strong className="text-orange">

                {metrics?.false_alerts !=
                null

                  ? Number(
                      metrics.false_alerts
                    ).toLocaleString()

                  : "—"}

              </strong>

            </div>


            <div>

              <span>
                Average live probability
              </span>

              <strong>
                {avgProbability.toFixed(2)}%
              </strong>

            </div>


          </div>


          {/* CONFUSION MATRIX */}

          {metrics?.confusion_matrix && (

            <div className="mini-cm">

              <div className="cm-title">
                Confusion matrix
              </div>


              <div className="cm-grid">


                <div className="cm-box tn">

                  <span>
                    TN
                  </span>

                  <strong>

                    {Number(
                      metrics
                        .confusion_matrix
                        .true_negative ??
                      0
                    ).toLocaleString()}

                  </strong>

                </div>


                <div className="cm-box fp">

                  <span>
                    FP
                  </span>

                  <strong>

                    {Number(
                      metrics
                        .confusion_matrix
                        .false_positive ??
                      0
                    ).toLocaleString()}

                  </strong>

                </div>


                <div className="cm-box fn">

                  <span>
                    FN
                  </span>

                  <strong>

                    {Number(
                      metrics
                        .confusion_matrix
                        .false_negative ??
                      0
                    ).toLocaleString()}

                  </strong>

                </div>


                <div className="cm-box tp">

                  <span>
                    TP
                  </span>

                  <strong>

                    {Number(
                      metrics
                        .confusion_matrix
                        .true_positive ??
                      0
                    ).toLocaleString()}

                  </strong>

                </div>

              </div>

            </div>

          )}

        </div>

      </section>


      {/* ===================================================
          RECENT LIVE TRANSACTIONS
      =================================================== */}

      <section className="panel recent-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Recent stream transactions
            </h2>

            <p>
              Newest predictions from
              the current live stream.
            </p>

          </div>


          <span className="live-badge">

            {running
              ? "LIVE STREAM"
              : "STREAM READY"}

          </span>

        </div>


        {recentTransactions.length >
        0 ? (

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>
                    Transaction
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Merchant
                  </th>

                  <th>
                    Probability
                  </th>

                  <th>
                    Risk
                  </th>

                  <th>
                    Latency
                  </th>

                  <th>
                    Decision
                  </th>

                </tr>

              </thead>


              <tbody>

                {recentTransactions.map(
                  (tx, index) => (

                    <tr
                      key={`${tx?.transaction_id || "tx"}-${index}`}
                    >


                      {/* TRANSACTION */}

                      <td>

                        <strong>

                          {tx?.transaction_id ||
                            "—"}

                        </strong>


                        <small>

                          {tx?.account_id ||
                            ""}

                        </small>

                      </td>


                      {/* AMOUNT */}

                      <td>

                        ₹
                        {Number(
                          tx?.amount || 0
                        ).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}

                      </td>


                      {/* MERCHANT */}

                      <td>

                        {tx?.merchant_category ||
                          "—"}

                      </td>


                      {/* PROBABILITY */}

                      <td>

                        <strong>

                          {(
                            Number(
                              tx?.fraud_probability ??
                              tx?.probability ??
                              0
                            ) * 100
                          ).toFixed(2)}

                          %

                        </strong>

                      </td>


                      {/* RISK */}

                      <td>

                        <StatusBadge
                          risk={
                            tx?.risk_level ||
                            tx?.risk ||
                            "LOW"
                          }
                        />

                      </td>


                      {/* LATENCY */}

                      <td>

                        {Number(
                          tx?.latency_ms ??
                          tx?.latency ??
                          0
                        ).toFixed(2)}

                        {" "}
                        ms

                      </td>


                      {/* DECISION */}

                      <td>

                        {tx?.decision ||
                          "—"}

                      </td>


                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <div className="empty">

            No live stream transactions yet.

            <br />

            Open Live Monitor and start
            the stream.

          </div>

        )}

      </section>


    </div>

  );
}