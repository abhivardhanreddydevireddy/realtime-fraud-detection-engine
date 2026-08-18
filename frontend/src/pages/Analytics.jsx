import React, { useMemo } from "react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { useStream } from "../content/StreamContext";
import "./Analytics.css";

// =====================================================
// HELPERS
// =====================================================

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}


// =====================================================
// FRAUD DETECTION
// =====================================================

function getFraud(tx) {
  // Direct fraud fields
  if (
    tx?.is_fraud === 1 ||
    tx?.is_fraud === true ||
    tx?.is_fraud === "1" ||
    tx?.fraud === 1 ||
    tx?.fraud === true ||
    tx?.prediction === 1 ||
    tx?.prediction === true
  ) {
    return true;
  }

  // Decision returned by backend
  const decision = String(
    tx?.decision ??
      tx?.prediction_label ??
      tx?.classification ??
      ""
  )
    .toLowerCase()
    .trim();

  if (
    decision === "fraud" ||
    decision === "decline" ||
    decision === "blocked" ||
    decision === "block" ||
    decision === "reject" ||
    decision === "rejected" ||
    decision === "high risk" ||
    decision === "high-risk" ||
    decision === "fraudulent"
  ) {
    return true;
  }

  // Fraud probability
  const probability = Number(
    tx?.fraud_probability ??
      tx?.fraudProbability ??
      tx?.fraud_prob ??
      tx?.probability
  );

  if (
    Number.isFinite(probability) &&
    probability >= 0.5
  ) {
    return true;
  }

  return false;
}


// =====================================================
// RISK
// =====================================================

function getRisk(tx) {
  const value =
    tx?.risk_level ??
    tx?.risk ??
    tx?.prediction_label ??
    tx?.classification ??
    "";

  return String(value)
    .toLowerCase()
    .trim()
    .replace(/_/g, "-");
}


// =====================================================
// LATENCY
// =====================================================

function getLatency(tx) {
  return number(
    tx?.latency_ms ??
      tx?.prediction_latency_ms ??
      tx?.processing_time_ms ??
      tx?.latency ??
      0
  );
}


// =====================================================
// HOUR
// =====================================================

function getHour(tx) {
  const hour = number(
    tx?.transaction_hour ??
      tx?.hour ??
      tx?.transactionHour ??
      0
  );

  return Math.max(
    0,
    Math.min(23, Math.floor(hour))
  );
}


// =====================================================
// CITY
// =====================================================

function getCity(tx) {
  return (
    tx?.transaction_city ??
    tx?.city ??
    tx?.transactionCity ??
    tx?.location ??
    "Unknown"
  );
}


// =====================================================
// MERCHANT
// =====================================================

function getMerchant(tx) {
  return (
    tx?.merchant_category ??
    tx?.merchant ??
    tx?.merchantCategory ??
    "Unknown"
  );
}


// =====================================================
// AMOUNT
// =====================================================

function getAmount(tx) {
  return number(
    tx?.amount ??
      tx?.transaction_amount ??
      tx?.transactionAmount ??
      0
  );
}


// =====================================================
// TRANSACTION ID
// =====================================================

function getTransactionId(tx, index) {
  return (
    tx?.transaction_id ??
    tx?.transactionId ??
    tx?.id ??
    `TX-${index + 1}`
  );
}


// =====================================================
// STAT CARD
// =====================================================

function StatCard({
  icon,
  title,
  value,
  subtitle,
  type = "blue",
}) {
  return (
    <div className={`live-stat-card ${type}`}>

      <div className="live-stat-icon">
        {icon}
      </div>

      <div className="live-stat-title">
        {title}
      </div>

      <div className="live-stat-value">
        {value}
      </div>

      <div className="live-stat-subtitle">
        {subtitle}
      </div>

    </div>
  );
}


// =====================================================
// EMPTY CHART
// =====================================================

function EmptyChart({ message }) {
  return (
    <div className="empty-chart">

      <div className="empty-chart-icon">
        📊
      </div>

      <div>
        {message}
      </div>

    </div>
  );
}


// =====================================================
// CUSTOM TOOLTIP
// =====================================================

function CustomTooltip({
  active,
  payload,
  label,
}) {
  if (
    !active ||
    !payload ||
    !payload.length
  ) {
    return null;
  }

  return (
    <div className="custom-tooltip">

      <strong>{label}</strong>

      {payload.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
        >
          {item.name}:{" "}

          <strong>
            {typeof item.value === "number"
              ? item.value.toFixed(2)
              : item.value}
          </strong>
        </div>
      ))}

    </div>
  );
}


// =====================================================
// MAIN COMPONENT
// =====================================================

export default function Analytics() {

  const {
    items = [],
    streamHistory = [],
    streamCount,
    running,
  } = useStream();


  // ===================================================
  // TRANSACTIONS
  // ===================================================

  const transactions = useMemo(() => {
    const list = streamHistory.length > 0 ? streamHistory : items;

    if (!Array.isArray(list)) {
      return [];
    }

    return list.filter(
      (item) =>
        item &&
        typeof item === "object"
    );

  }, [items, streamHistory]);


  // ===================================================
  // BASIC METRICS
  // ===================================================

  const streamedCount =
    streamCount > 0 ? streamCount : transactions.length;



  const fraudCount = useMemo(() => {

    return transactions.filter(
      (tx) => getFraud(tx)
    ).length;

  }, [transactions]);


  const highRiskCount = useMemo(() => {

    return transactions.filter(
      (tx) => {

        const risk =
          getRisk(tx);

        return (
          risk === "high" ||
          risk === "high-risk"
        );
      }
    ).length;

  }, [transactions]);


  // ===================================================
  // LATENCY
  // ===================================================

  const latencyValues = useMemo(() => {

    return transactions
      .map(getLatency)
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      );

  }, [transactions]);


  const averageLatency = useMemo(() => {

    if (!latencyValues.length) {
      return 0;
    }

    const total =
      latencyValues.reduce(
        (sum, value) =>
          sum + value,
        0
      );

    return (
      total /
      latencyValues.length
    );

  }, [latencyValues]);


  const fraudRate =
    streamedCount > 0
      ? (fraudCount /
          streamedCount) *
        100
      : 0;


  // ===================================================
  // FRAUD BY HOUR
  // ===================================================

  const fraudByHour = useMemo(() => {

    const hours = Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        transactions: 0,
        fraud: 0,
        fraudRate: 0,
      })
    );


    transactions.forEach((tx) => {

      const hour =
        getHour(tx);

      hours[hour].transactions += 1;

      if (getFraud(tx)) {
        hours[hour].fraud += 1;
      }

    });


    return hours.map(
      (item) => ({
        ...item,

        label:
          `${String(item.hour).padStart(
            2,
            "0"
          )}:00`,

        fraudRate:
          item.transactions > 0
            ? (item.fraud /
                item.transactions) *
              100
            : 0,
      })
    );

  }, [transactions]);


  // ===================================================
  // FRAUD BY CITY
  // ===================================================

  const fraudByCity = useMemo(() => {

    const map = {};

    transactions.forEach((tx) => {

      const city =
        String(getCity(tx)).trim() ||
        "Unknown";


      if (!map[city]) {

        map[city] = {
          city,
          transactions: 0,
          fraud: 0,
        };

      }


      map[city].transactions += 1;


      if (getFraud(tx)) {
        map[city].fraud += 1;
      }

    });


    return Object.values(map)
      .map((item) => ({
        ...item,

        fraudRate:
          item.transactions > 0
            ? (item.fraud /
                item.transactions) *
              100
            : 0,
      }))
      .sort(
        (a, b) =>
          b.transactions -
          a.transactions
      )
      .slice(0, 10);

  }, [transactions]);


  // ===================================================
  // AMOUNT DISTRIBUTION
  // ===================================================

  const amountDistribution = useMemo(() => {

    const ranges = [
      {
        name: "₹0–₹100",
        min: 0,
        max: 100,
      },
      {
        name: "₹100–₹500",
        min: 100,
        max: 500,
      },
      {
        name: "₹500–₹1K",
        min: 500,
        max: 1000,
      },
      {
        name: "₹1K–₹5K",
        min: 1000,
        max: 5000,
      },
      {
        name: "₹5K–₹10K",
        min: 5000,
        max: 10000,
      },
      {
        name: "₹10K+",
        min: 10000,
        max: Infinity,
      },
    ];


    return ranges.map(
      (range) => {

        const count =
          transactions.filter(
            (tx) => {

              const amount =
                getAmount(tx);

              return (
                amount >= range.min &&
                amount < range.max
              );

            }
          ).length;


        return {
          name: range.name,
          transactions: count,
        };

      }
    );

  }, [transactions]);


  // ===================================================
  // MERCHANT CATEGORY
  // ===================================================

  const fraudByMerchant =
    useMemo(() => {

      const map = {};


      transactions.forEach(
        (tx) => {

          const merchant =
            String(
              getMerchant(tx)
            ).trim() ||
            "Unknown";


          if (!map[merchant]) {

            map[merchant] = {
              merchant,
              transactions: 0,
              fraud: 0,
            };

          }


          map[merchant]
            .transactions += 1;


          if (getFraud(tx)) {
            map[merchant]
              .fraud += 1;
          }

        }
      );


      return Object.values(map)
        .map((item) => ({
          ...item,

          fraudRate:
            item.transactions > 0
              ? (item.fraud /
                  item.transactions) *
                100
              : 0,
        }))
        .sort(
          (a, b) =>
            b.transactions -
            a.transactions
        )
        .slice(0, 10);

    }, [transactions]);


  // ===================================================
  // RISK DISTRIBUTION
  // ===================================================

  const riskDistribution =
    useMemo(() => {

      let low = 0;
      let medium = 0;
      let high = 0;


      transactions.forEach(
        (tx) => {

          const risk =
            getRisk(tx);


          if (
            risk === "high" ||
            risk === "high-risk"
          ) {

            high++;

          } else if (
            risk === "medium" ||
            risk === "medium-risk"
          ) {

            medium++;

          } else {

            low++;

          }

        }
      );


      return [
        {
          name: "Low",
          value: low,
        },
        {
          name: "Medium",
          value: medium,
        },
        {
          name: "High",
          value: high,
        },
      ].filter(
        (item) =>
          item.value > 0
      );

    }, [transactions]);


  // ===================================================
  // LATENCY DATA
  // ===================================================

  const latencyChartData =
    useMemo(() => {

      return transactions
        .slice()
        .reverse()
        .map((tx, index) => ({
          index: index + 1,
          latency: getLatency(tx),
        }))
        .filter(
          (item) =>
            item.latency > 0
        );

    }, [transactions]);


  // ===================================================
  // COLORS
  // ===================================================

  const riskColors = {
    Low: "#16a34a",
    Medium: "#f59e0b",
    High: "#dc2626",
  };


  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="live-analytics-page">


      {/* =============================================
          HEADER
      ============================================= */}

      <div className="live-page-header">

        <div>

          <div className="section-label">
            STREAM ANALYTICS
          </div>

          <h1>
            Live stream analytics
          </h1>

          <p>
            Real-time analytics generated
            only from transactions processed
            in the current Live Stream.
          </p>

        </div>


        <div
          className={
            running
              ? "stream-status live"
              : "stream-status stopped"
          }
        >

          <span />

          {running
            ? "STREAM RUNNING"
            : "STREAM STOPPED"}

        </div>

      </div>


      {/* =============================================
          STAT CARDS
      ============================================= */}

      <div className="live-stat-grid">

        <StatCard
          icon="⚡"
          title="STREAMED TRANSACTIONS"
          value={streamedCount}
          subtitle="Current live stream"
          type="blue"
        />


        <StatCard
          icon="🛡"
          title="FRAUD ALERTS"
          value={fraudCount}
          subtitle="Fraud detected"
          type="red"
        />


        <StatCard
          icon="⚠"
          title="HIGH-RISK TRANSACTIONS"
          value={highRiskCount}
          subtitle="High-risk predictions"
          type="orange"
        />


        <StatCard
          icon="◷"
          title="AVG LATENCY"
          value={`${averageLatency.toFixed(
            2
          )} ms`}
          subtitle="Processing time"
          type="green"
        />

      </div>


      {/* =============================================
          INFO CARDS
      ============================================= */}

      <div className="live-info-row">

        <div className="live-info-card">

          <span>
            Current live fraud rate
          </span>

          <strong>
            {fraudRate.toFixed(2)}%
          </strong>

        </div>


        <div className="live-info-card">

          <span>
            Live transactions
          </span>

          <strong>
            {streamedCount}
          </strong>

        </div>


        <div className="live-info-card">

          <span>
            Fraud transactions
          </span>

          <strong className="danger-text">
            {fraudCount}
          </strong>

        </div>


        <div className="live-info-card">

          <span>
            Data source
          </span>

          <strong>
            LIVE STREAM
          </strong>

        </div>

      </div>


      {/* =============================================
          ROW 1
      ============================================= */}

      <div className="chart-grid">


        {/* FRAUD BY HOUR */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Fraud rate by hour
              </h2>

              <p>
                Calculated from live streamed
                transactions only.
              </p>

            </div>

            <div className="chart-icon">
              ◷
            </div>

          </div>


          {streamedCount === 0 ? (

            <EmptyChart
              message="Start the live stream to generate hourly analytics."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={330}
            >

              <LineChart
                data={fraudByHour}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis
                  dataKey="label"
                  interval={2}
                />


                <YAxis
                  domain={[0, "auto"]}
                  tickFormatter={(value) =>
                    `${Number(value).toFixed(
                      1
                    )}%`
                  }
                />


                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />


                <Legend />


                <Line
                  type="monotone"
                  dataKey="fraudRate"
                  name="Fraud Rate %"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>


        {/* CITY */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Fraud by transaction city
              </h2>

              <p>
                Transactions and fraud detected
                by city.
              </p>

            </div>

            <div className="chart-icon">
              📍
            </div>

          </div>


          {fraudByCity.length === 0 ? (

            <EmptyChart
              message="No transaction city data available yet."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={330}
            >

              <BarChart
                data={fraudByCity}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 55,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis
                  dataKey="city"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />


                <YAxis
                  allowDecimals={false}
                />


                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />


                <Legend />


                <Bar
                  dataKey="transactions"
                  name="Transactions"
                  fill="#2563eb"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />


                <Bar
                  dataKey="fraud"
                  name="Fraud"
                  fill="#dc2626"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>


      {/* =============================================
          ROW 2
      ============================================= */}

      <div className="chart-grid">


        {/* AMOUNT */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Transaction amount distribution
              </h2>

              <p>
                Amount ranges from the current
                live stream.
              </p>

            </div>

            <div className="chart-icon">
              ₹
            </div>

          </div>


          {streamedCount === 0 ? (

            <EmptyChart
              message="No live transactions available."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={330}
            >

              <BarChart
                data={amountDistribution}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis
                  dataKey="name"
                />


                <YAxis
                  allowDecimals={false}
                />


                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />


                <Legend />


                <Bar
                  dataKey="transactions"
                  name="Live Transactions"
                  fill="#16a34a"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>


        {/* RISK */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Live risk distribution
              </h2>

              <p>
                Risk classification of current
                streamed transactions.
              </p>

            </div>

            <div className="chart-icon">
              🛡
            </div>

          </div>


          {streamedCount === 0 ? (

            <EmptyChart
              message="Start streaming to see risk distribution."
            />

          ) : riskDistribution.length === 0 ? (

            <EmptyChart
              message="No risk information available."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={330}
            >

              <PieChart>

                <Pie
                  data={riskDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={125}
                  paddingAngle={3}
                  label
                >

                  {riskDistribution.map(
                    (item) => (

                      <Cell
                        key={item.name}
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


                <Legend />

              </PieChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>


      {/* =============================================
          ROW 3
      ============================================= */}

      <div className="chart-grid">


        {/* MERCHANT */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Fraud by merchant category
              </h2>

              <p>
                Transactions and fraud detected
                by merchant category.
              </p>

            </div>

            <div className="chart-icon">
              🏪
            </div>

          </div>


          {fraudByMerchant.length === 0 ? (

            <EmptyChart
              message="No merchant category data available."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={350}
            >

              <BarChart
                data={fraudByMerchant}
                layout="vertical"
                margin={{
                  top: 10,
                  right: 30,
                  left: 80,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis
                  type="number"
                  allowDecimals={false}
                />


                <YAxis
                  type="category"
                  dataKey="merchant"
                  width={110}
                />


                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />


                <Legend />


                <Bar
                  dataKey="transactions"
                  name="Transactions"
                  fill="#7c3aed"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />


                <Bar
                  dataKey="fraud"
                  name="Fraud"
                  fill="#dc2626"
                  radius={[
                    0,
                    6,
                    6,
                    0,
                  ]}
                />

              </BarChart>

            </ResponsiveContainer>

          )}

        </div>


        {/* LATENCY */}

        <div className="chart-card">

          <div className="chart-header">

            <div>

              <h2>
                Streaming latency
              </h2>

              <p>
                Prediction processing latency
                from the live stream.
              </p>

            </div>

            <div className="chart-live">
              LIVE
            </div>

          </div>


          {latencyChartData.length === 0 ? (

            <EmptyChart
              message="Latency data is not available in the streamed response."
            />

          ) : (

            <ResponsiveContainer
              width="100%"
              height={350}
            >

              <LineChart
                data={latencyChartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 20,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                />


                <XAxis
                  dataKey="index"
                  allowDecimals={false}
                  label={{
                    value:
                      "Live transaction",
                    position:
                      "insideBottom",
                    offset: -5,
                  }}
                />


                <YAxis
                  label={{
                    value: "ms",
                    angle: -90,
                    position:
                      "insideLeft",
                  }}
                />


                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />


                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Latency (ms)"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 5,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>


      {/* =============================================
          RECENT TRANSACTIONS
      ============================================= */}

      <div className="recent-card">

        <div className="chart-header">

          <div>

            <h2>
              Recent stream transactions
            </h2>

            <p>
              Latest transactions received from
              the live stream.
            </p>

          </div>


          <div className="stream-count">
            {streamedCount} LIVE
          </div>

        </div>


        {transactions.length === 0 ? (

          <EmptyChart
            message="No transactions have been streamed yet."
          />

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>
                  <th>Transaction</th>
                  <th>Amount</th>
                  <th>City</th>
                  <th>Merchant</th>
                  <th>Hour</th>
                  <th>Risk</th>
                  <th>Result</th>
                </tr>

              </thead>


              <tbody>

                {transactions
                  .slice(0, 15)
                  .map(
                    (tx, index) => {

                      const fraud =
                        getFraud(tx);

                      const risk =
                        getRisk(tx);

                      return (

                        <tr
                          key={
                            getTransactionId(
                              tx,
                              index
                            )
                          }
                        >

                          <td>
                            {getTransactionId(
                              tx,
                              index
                            )}
                          </td>


                          <td>
                            ₹
                            {getAmount(
                              tx
                            ).toFixed(2)}
                          </td>


                          <td>
                            {getCity(tx)}
                          </td>


                          <td>
                            {getMerchant(tx)}
                          </td>


                          <td>
                            {String(
                              getHour(tx)
                            ).padStart(
                              2,
                              "0"
                            )}
                            :00
                          </td>


                          <td>
                            <span
                              className={`risk-badge ${
                                risk === "high" ||
                                risk === "high-risk"
                                  ? "high"
                                  : risk ===
                                      "medium" ||
                                    risk ===
                                      "medium-risk"
                                  ? "medium"
                                  : "low"
                              }`}
                            >
                              {risk
                                ? risk.toUpperCase()
                                : "LOW"}
                            </span>
                          </td>


                          <td>

                            <span
                              className={
                                fraud
                                  ? "result-badge fraud"
                                  : "result-badge safe"
                              }
                            >

                              {fraud
                                ? "FRAUD"
                                : "SAFE"}

                            </span>

                          </td>

                        </tr>

                      );

                    }
                  )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}