import {
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Zap,
} from "lucide-react";

import { useStream } from "../content/StreamContext";

import StatusBadge from "../components/StatusBadge";

export default function Live() {

  const {
    items,
    running,
    busy,
    next,
    runBatch,
    reset,
    toggleAuto,
  } = useStream();


  return (

    <div>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="page-header">

        <div>

          <div className="eyebrow">
            LIVE STREAM
          </div>

          <h1>
            Live transaction monitor
          </h1>

          <p>
            Replay historical transactions
            one-by-one as a pseudo-real-time
            fraud stream.
          </p>

        </div>


        <div className="header-actions">

          {/* RESET */}

          <button
            className="secondary"
            onClick={() => void reset()}
            disabled={busy}
          >

            <RotateCcw size={14} />

            Reset

          </button>


          {/* RUN 10 */}

          <button
            className="secondary"
            onClick={() => void runBatch()}
            disabled={busy}
          >

            <Zap size={14} />

            Run 10

          </button>


          {/* AUTO STREAM */}

          <button
            className="primary"
            onClick={toggleAuto}
            disabled={busy}
          >

            {running ? (
              <Pause size={14} />
            ) : (
              <Play size={14} />
            )}

            {running
              ? "Stop"
              : "Auto stream"}

          </button>

        </div>

      </div>


      {/* ====================================================
          STREAM PANEL
      ==================================================== */}

      <div className="panel">

        <div className="panel-heading">

          <div>

            <h2>
              Streaming feed
            </h2>

            <p>
              {items.length} transactions
              visible in this session.
            </p>

          </div>


          <button
            className="secondary"
            onClick={() => void next()}
            disabled={busy}
          >

            <RefreshCcw size={14} />

            Next

          </button>

        </div>


        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="table-wrap">

          <table>

            <thead>

              <tr>

                <th>
                  Sequence
                </th>

                <th>
                  Transaction
                </th>

                <th>
                  Amount
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

              {items.map((tx, index) => (

                <tr
                  key={
                    `${tx.transaction_id}-${index}`
                  }
                >

                  <td>
                    #
                    {tx.stream_sequence ??
                      "—"}
                  </td>


                  <td>

                    <strong>
                      {tx.transaction_id}
                    </strong>

                    <small>
                      {tx.account_id}
                    </small>

                  </td>


                  <td>

                    ₹
                    {Number(
                      tx.amount || 0
                    ).toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 2,
                      }
                    )}

                  </td>


                  <td>

                    <strong>

                      {(
                        Number(
                          tx.fraud_probability ||
                            0
                        ) * 100
                      ).toFixed(2)}

                      %

                    </strong>

                  </td>


                  <td>

                    <StatusBadge
                      risk={
                        tx.risk_level
                      }
                    />

                  </td>


                  <td>

                    {Number(
                      tx.latency_ms || 0
                    ).toFixed(2)}

                    {" ms"}

                  </td>


                  <td>

                    {tx.decision || "—"}

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>


        {/* ==================================================
            EMPTY
        ================================================== */}

        {items.length === 0 && (

          <div className="empty">

            Press Next, Run 10, or Auto
            stream to populate the feed.

          </div>

        )}

      </div>

    </div>
  );
}