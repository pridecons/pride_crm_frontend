// utils/error-handling.js
import toast from "react-hot-toast";

/**
 * Normalize & show API errors from many shapes (Axios/FastAPI/custom).
 * Usage:
 *   ErrorHandling({ error });                 // generic
 *   ErrorHandling({ error, defaultError: "Failed to save" });
 * Returns: the final message string
 */
export const ErrorHandling = ({
  error = "",
  defaultError = "Something went wrong",
  includeStatus = true,
  maxLen = 200,
} = {}) => {
  let msg = defaultError;

  try {
    // 1) No error at all
    if (!error) {
      msg = defaultError;
      toast.error(msg);
      return msg;
    }

    // 2) Quick path: direct string
    if (typeof error === "string") {
      msg = error || defaultError;
      msg = cleanErrorMessage(msg, { maxLen });
      toast.error(msg);
      return msg;
    }

    // 3) Try to locate an Axios-like response anywhere (covers error, error.error, error.error2…)
    const resp = pickFirstResponse(error);
    if (resp && resp.data) {
      const { data, status } = resp;

      // Try common FastAPI/our patterns first
      msg =
        extractFromFastApiDetail(data) ??
        data.message ??
        data.msg ??
        data.error ??
        // Sometimes backend returns { detail: {...full object...} }
        (typeof data.detail === "object" ? JSON.stringify(data.detail) : null) ??
        // Fallback to full data string
        (typeof data === "string" ? data : JSON.stringify(data)) ??
        defaultError;

      // Add a user-friendly status label once (if desired)
      if (includeStatus && status) {
        const statusText = getStatusText(status);
        msg = prependStatusOnce(msg, statusText, status);
        // Optionally add the code if not already there
      }

      msg = cleanErrorMessage(msg, { maxLen });
      toast.error(msg);
      return msg;
    }

    // 4) Network error (request exists but no response)
    if (error.request && !error.response) {
      msg = "Network error. Please check your internet connection.";
      msg = cleanErrorMessage(msg, { maxLen });
      toast.error(msg);
      return msg;
    }

    // 5) Generic JS Error object
    if (error.message) {
      msg = error.message || defaultError;
      msg = cleanErrorMessage(msg, { maxLen });
      toast.error(msg);
      return msg;
    }

    // 6) Last resort: stringify non-empty objects
    const str = tryStringify(error);
    msg = str || defaultError;
  } catch (_) {
    msg = defaultError;
  }

  msg = cleanErrorMessage(msg, { maxLen });
  toast.error(msg);
  return msg;
};

/* --------------------------------- helpers -------------------------------- */

const getStatusText = (status) => {
  const map = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Validation Error",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };
  return map[status] || `Error ${status}`;
};

/**
 * Avoid adding duplicate "Status: " prefixes.
 * e.g. "Bad Request: message" (only once)
 */
const prependStatusOnce = (msg, statusText, statusCode) => {
  if (!msg || typeof msg !== "string") return msg;

  const norm = msg.toLowerCase();
  const alreadyHas =
    norm.startsWith(statusText.toLowerCase()) ||
    norm.startsWith(`error ${statusCode}`) ||
    norm.startsWith(`${statusCode} `);

  return alreadyHas ? msg : `${statusText}: ${msg}`;
};

/**
 * Find an Axios-like response anywhere inside possibly nested error objects.
 * Tries common wrappers, then a shallow deep-scan for `.response`.
 */
const pickFirstResponse = (err) => {
  const candidates = [
    err,
    err?.error,
    err?.error2,
    err?.error3,
    err?.originalError,
    err?.cause,
  ];
  for (const c of candidates) {
    if (c?.response?.data !== undefined) return c.response;
  }
  // shallow deep-scan one level down (avoid heavy recursion)
  if (isPlainObject(err)) {
    for (const v of Object.values(err)) {
      if (v?.response?.data !== undefined) return v.response;
    }
  }
  return null;
};

const isPlainObject = (v) =>
  v && typeof v === "object" && !Array.isArray(v) && v.constructor === Object;

/**
 * Extract common FastAPI shapes from response.data
 * Returns a string or null if nothing found.
 */
const extractFromFastApiDetail = (data) => {
  if (!data) return null;

  // If detail is a string
  if (typeof data.detail === "string") {
    return data.detail;
  }

  // If detail is an object { message | msg | ... }
  if (isPlainObject(data.detail)) {
    return (
      data.detail.message ??
      data.detail.msg ??
      // Sometimes backend returns a nested reason e.g. { detail: { detail: "..." } }
      (typeof data.detail.detail === "string" ? data.detail.detail : null)
    );
  }

  // If detail is an array (FastAPI 422 validation errors or our arrays)
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    // Find first item with best message
    const first = data.detail[0];
    if (typeof first === "string") return first;

    if (isPlainObject(first)) {
      // Prefer msg/message; fallback to loc if available
      return (
        first.msg ??
        first.message ??
        (Array.isArray(first.loc)
          ? `Validation error: ${first.loc.join(".")}`
          : tryStringify(first))
      );
    }
    return String(first);
  }

  // Some APIs wrap their message not in "detail" but in "errors" array
  if (Array.isArray(data.errors) && data.errors.length) {
    const first = data.errors[0];
    return first?.message ?? first?.msg ?? tryStringify(first);
  }

  // Nothing specific found
  return null;
};

const tryStringify = (val) => {
  try {
    const s = JSON.stringify(val);
    return s !== "{}" ? s : "";
  } catch {
    return "";
  }
};

/**
 * Clean up noisy tech prefixes and clamp length.
 */
const cleanErrorMessage = (msg, { maxLen = 200 } = {}) => {
  if (!msg || typeof msg !== "string") return "Something went wrong";

  let out = msg
    .replace(/^Error:\s*/i, "")
    .replace(/^Exception:\s*/i, "")
    .replace(/^HTTPException:\s*/i, "")
    .replace(/^(Request failed with status code \d+\s*:\s*)/i, "")
    .trim();

  // Common FastAPI phrases → friendlier
  if (/422\s*Unprocessable\s*Entity/i.test(out)) {
    out = "Please check your input data";
  } else if (/500\s*Internal\s*Server\s*Error/i.test(out)) {
    out = "Server error occurred. Please try again later.";
  } else if (/401\s*Unauthorized/i.test(out)) {
    out = "Please log in to continue";
  } else if (/404\s*Not\s*Found/i.test(out)) {
    out = "Requested resource not found";
  }

  if (out.length > maxLen) out = `${out.slice(0, maxLen - 3)}...`;
  return out;
};

/* ----------------------------- convenience APIs ---------------------------- */


