// =========================================================
// FRAUDGUARD API
// =========================================================

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "https://realtime-fraud-detection-engine.onrender.com/api";

const cleanBaseUrl = rawBaseUrl.replace(/\/$/, "");
const API_BASE_URL = cleanBaseUrl.endsWith("/api") ? cleanBaseUrl : `${cleanBaseUrl}/api`;



// =========================================================
// GENERIC API FUNCTION
// =========================================================

export async function api(endpoint, options = {}) {

  // Prevent /api/api/... duplication
  const cleanEndpoint = endpoint.startsWith("/api")
    ? endpoint.substring(4)
    : endpoint;

  const response = await fetch(
    `${API_BASE_URL}${cleanEndpoint}`,
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  if (!response.ok) {

    let message = `API Error: ${response.status}`;

    try {

      const errorData = await response.json();

      if (errorData?.detail) {
        message = errorData.detail;
      }

    } catch {
      // Ignore JSON parsing error
    }

    throw new Error(message);
  }

  return response.json();
}


// =========================================================
// HEALTH
// =========================================================

export async function getHealth() {

  return api("/health");
}


// =========================================================
// OVERVIEW
// =========================================================

export async function getOverview() {

  return api("/overview");
}


// =========================================================
// MODEL METRICS
// =========================================================

export async function getMetrics() {

  return api("/metrics");
}


// =========================================================
// TRANSACTIONS
// =========================================================

export async function getTransactions(limit = 50) {

  return api(`/transactions?limit=${limit}`);
}


// =========================================================
// STREAM NEXT
// =========================================================

export async function getNextStreamTransaction() {

  return api("/stream/next");
}


// =========================================================
// RESET STREAM
// =========================================================

export async function resetStream() {

  return api(
    "/stream/reset",
    {
      method: "POST",
    }
  );
}


// =========================================================
// STREAM ANALYTICS
// =========================================================

export async function getAnalytics() {

  return api("/stream/analytics");
}


// =========================================================
// CUSTOMERS
// =========================================================

export async function getCustomers() {

  return api("/customers");
}


// =========================================================
// CUSTOMER DETAILS
// =========================================================

export async function getCustomer(accountId) {

  return api(
    `/customers/${encodeURIComponent(accountId)}`
  );
}


// =========================================================
// TRAINING DATA STATS
// =========================================================

export async function getTrainingDataStats() {

  return api("/training-data/stats");
}


// =========================================================
// TRAINING DATA RECORDS
// =========================================================

export async function getTrainingDataRecords(limit = 20) {

  return api(
    `/training-data/records?limit=${limit}`
  );
}


// =========================================================
// MANUAL PREDICTION
// =========================================================

export async function predictTransaction(transaction) {

  return api(
    "/predict",
    {
      method: "POST",

      body: JSON.stringify(transaction),
    }
  );
}


// =========================================================

// THRESHOLDS API
// =========================================================

export async function getThresholds() {
  return api("/thresholds");
}

export async function updateThresholds(thresholds) {
  return api("/thresholds", {
    method: "POST",
    body: JSON.stringify(thresholds),
  });
}


// =========================================================
// HIGH RISK ACCOUNTS API
// =========================================================

export async function getHighRiskAccounts(minAlerts = 1) {
  return api(`/accounts/high-risk?min_alerts=${minAlerts}`);
}


// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  api,
  getHealth,
  getOverview,
  getMetrics,
  getTransactions,
  getNextStreamTransaction,
  resetStream,
  getAnalytics,
  getCustomers,
  getCustomer,
  getTrainingDataStats,
  getTrainingDataRecords,
  predictTransaction,
  getThresholds,
  updateThresholds,
  getHighRiskAccounts,
};