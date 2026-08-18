import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { api } from "../api";

const StreamContext = createContext(null);

// Maximum number of transactions kept in frontend memory.
// This is ONLY a limit.
// It does NOT mean we always display 243.
const MAX_STREAM_TRANSACTIONS = 243;

export function StreamProvider({ children }) {
  // Latest live transactions
  const [items, setItems] = useState([]);

  // Complete live stream history used by analytics
  const [streamHistory, setStreamHistory] = useState([]);

  // Cumulative counters
  const [streamCount, setStreamCount] = useState(0);
  const [fraudCount, setFraudCount] = useState(0);
  const [highRiskCount, setHighRiskCount] = useState(0);

  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);

  const timer = useRef(null);
  const busyRef = useRef(false);

  // =========================================================
  // FRAUD DETECTION
  // =========================================================

  function getFraudValue(tx) {
    const keys = [
      "predicted_fraud",
      "prediction",
      "is_fraud",
      "fraud",
      "fraud_flag",
      "fraudulent",
      "label",
      "target",
    ];

    for (const key of keys) {
      if (
        tx?.[key] !== undefined &&
        tx?.[key] !== null
      ) {
        const value = tx[key];

        if (
          value === true ||
          value === 1 ||
          value === "1" ||
          String(value).toLowerCase() === "fraud" ||
          String(value).toLowerCase() === "true"
        ) {
          return 1;
        }

        if (
          String(value).toLowerCase() === "legitimate" ||
          String(value).toLowerCase() === "normal" ||
          String(value).toLowerCase() === "false"
        ) {
          return 0;
        }

        const number = Number(value);

        if (number === 1) return 1;
        if (number === 0) return 0;
      }
    }

    return 0;
  }

  // =========================================================
  // HIGH RISK
  // =========================================================

  function getHighRisk(tx) {
    const riskLevel =
      tx?.risk_level ??
      tx?.risk ??
      tx?.risk_category;

    if (riskLevel) {
      const value = String(riskLevel).toLowerCase();

      if (
        value === "high" ||
        value === "critical" ||
        value === "high-risk" ||
        value === "high risk"
      ) {
        return true;
      }
    }

    const probability = Number(
      tx?.fraud_probability ??
        tx?.probability ??
        tx?.fraud_score ??
        0
    );

    return probability >= 0.5;
  }

  // =========================================================
  // GET TRANSACTION ID
  // =========================================================

  function getTransactionId(tx) {
    return (
      tx?.transaction_id ??
      tx?.id ??
      null
    );
  }

  // =========================================================
  // ADD TRANSACTION
  // =========================================================

  const addTransaction = useCallback((tx) => {
    if (!tx) return;

    const transactionId =
      getTransactionId(tx);

    const fraud = getFraudValue(tx);
    const highRisk = getHighRisk(tx);

    // =======================================================
    // LIVE TRANSACTIONS
    //
    // IMPORTANT:
    // We keep MAX 243.
    //
    // If there are:
    // 1   -> 1
    // 5   -> 5
    // 13  -> 13
    // 100 -> 100
    // 243 -> 243
    // 300 -> latest 243
    // =======================================================

    setItems((current) => {
      const withoutDuplicate =
        current.filter((item) => {
          const existingId =
            getTransactionId(item);

          if (
            transactionId !== null &&
            existingId !== null
          ) {
            return existingId !== transactionId;
          }

          return item !== tx;
        });

      return [
        tx,
        ...withoutDuplicate,
      ].slice(
        0,
        MAX_STREAM_TRANSACTIONS
      );
    });

    // =======================================================
    // ANALYTICS HISTORY
    // =======================================================

    setStreamHistory((current) => {
      const exists =
        transactionId !== null &&
        current.some(
          (item) =>
            getTransactionId(item) ===
            transactionId
        );

      if (exists) {
        return current;
      }

      return [
        ...current,
        tx,
      ].slice(
        -MAX_STREAM_TRANSACTIONS
      );
    });

    // =======================================================
    // CUMULATIVE COUNTERS
    // =======================================================

    setStreamCount(
      (count) => count + 1
    );

    if (fraud === 1) {
      setFraudCount(
        (count) => count + 1
      );
    }

    if (highRisk) {
      setHighRiskCount(
        (count) => count + 1
      );
    }
  }, []);

  // =========================================================
  // GET NEXT TRANSACTION
  // =========================================================

  const next = useCallback(async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      const response =
        await api("/stream/next");

      const tx =
        response?.transaction ??
        response;

      if (!tx) {
        throw new Error(
          "No transaction returned by API"
        );
      }

      addTransaction(tx);

    } catch (error) {
      console.error(
        "Failed to get next transaction:",
        error
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [addTransaction]);

  // =========================================================
  // RUN BATCH
  // =========================================================

  const runBatch = useCallback(async () => {
    if (busyRef.current) {
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      for (let i = 0; i < 10; i++) {
        const response =
          await api("/stream/next");

        const tx =
          response?.transaction ??
          response;

        if (tx) {
          addTransaction(tx);
        }
      }
    } catch (error) {
      console.error(
        "Failed to run batch:",
        error
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [addTransaction]);

  // =========================================================
  // RESET STREAM
  // =========================================================

  const reset = useCallback(async () => {
    try {
      if (timer.current !== null) {
        window.clearInterval(
          timer.current
        );

        timer.current = null;
      }

      setRunning(false);

      await api("/stream/reset", {
        method: "POST",
      });

      setItems([]);
      setStreamHistory([]);

      setStreamCount(0);
      setFraudCount(0);
      setHighRiskCount(0);

    } catch (error) {
      console.error(
        "Failed to reset stream:",
        error
      );
    }
  }, []);

  // =========================================================
  // START / STOP AUTO STREAM
  // =========================================================

  const toggleAuto = useCallback(() => {
    if (running) {
      // STOP
      if (timer.current !== null) {
        window.clearInterval(
          timer.current
        );

        timer.current = null;
      }

      setRunning(false);

      return;
    }

    // START
    setRunning(true);

    // Immediately get one transaction
    void next();

    // Every 1.5 seconds
    timer.current =
      window.setInterval(() => {
        void next();
      }, 1500);

  }, [running, next]);

  // =========================================================
  // CLEANUP
  // =========================================================

  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearInterval(
          timer.current
        );

        timer.current = null;
      }
    };
  }, []);

  // =========================================================
  // PROVIDER
  // =========================================================

  return (
    <StreamContext.Provider
      value={{
        items,

        streamHistory,

        streamCount,
        fraudCount,
        highRiskCount,

        running,
        busy,

        next,
        runBatch,
        reset,
        toggleAuto,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
}

// =========================================================
// CUSTOM HOOK
// =========================================================

export function useStream() {
  const context =
    useContext(StreamContext);

  if (context === null) {
    throw new Error(
      "useStream must be used inside StreamProvider"
    );
  }

  return context;
}