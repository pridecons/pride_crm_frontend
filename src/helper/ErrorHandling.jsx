import toast from "react-hot-toast";

export const ErrorHandling = ({ error={}, defaultError = "Something went wrong" }) => {
  let msg = defaultError;

  try {
    if (!error) {
      msg = defaultError;
    } else if (typeof error === "string") {
      // Direct string error
      msg = error;
    } else if (typeof error === "object") {
      const detail = error?.response?.data?.detail;

      if (Array.isArray(detail)) {
        // If detail is an array → pick first .msg/.message/.detail or stringify
        msg =
          detail[0]?.msg ||
          detail[0]?.message ||
          detail[0]?.detail ||
          JSON.stringify(detail);
      } else if (typeof detail === "object") {
        // If detail is an object → check known keys
        msg = detail?.message || detail?.msg || JSON.stringify(detail);
      } else if (typeof detail === "string") {
        // If detail is plain string
        msg = detail;
      } else {
        // Fallbacks from other error fields
        msg =
          error?.response?.data?.message ||
          error?.message ||
          error?.data?.message ||
          JSON.stringify(error);
      }
    }
  } catch (e) {
    msg = defaultError;
  }

  console.error("Error handle:", msg);
  toast.error(msg);
};
