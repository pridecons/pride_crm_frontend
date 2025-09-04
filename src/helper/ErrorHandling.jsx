// import toast from "react-hot-toast";

// export const ErrorHandling = ({ error="", defaultError = "Something went wrong" }) => {
//   let msg = defaultError;

//   if(error){
//   try {
//     if (!error) {
//       msg = defaultError;
//     } else if (typeof error === "string") {
//       // Direct string error
//       msg = error;
//     } else if (typeof error === "object") {
//       const detail = error?.response?.data?.detail;

//       if (Array.isArray(detail)) {
//         // If detail is an array → pick first .msg/.message/.detail or stringify
//         msg =
//           detail[0]?.msg ||
//           detail[0]?.message ||
//           detail[0]?.detail ||
//           JSON.stringify(detail);
//       } else if (typeof detail === "object") {
//         // If detail is an object → check known keys
//         msg = detail?.message || detail?.msg || JSON.stringify(detail);
//       } else if (typeof detail === "string") {
//         // If detail is plain string
//         msg = detail;
//       } else {
//         // Fallbacks from other error fields
//         msg =
//           error?.response?.data?.message ||
//           error?.message ||
//           error?.data?.message ||
//           JSON.stringify(error);
//       }
//     }
//   } catch (e) {
//     msg = defaultError;
//   }
//   }else{
//      msg = defaultError;
//   }

//   console.error("Error handle:", msg);
//   toast.error(msg);
// };

import toast from "react-hot-toast";

export const ErrorHandling = ({ 
  error = "", 
  defaultError = "Something went wrong" 
}) => {
  let msg = defaultError;
  
  // Early return if no error
  if (!error) {
    console.error("Error handle:", msg);
    toast.error(msg);
    return;
  }

  try {
    // Case 1: Direct string error
    if (typeof error === "string") {
      msg = error || defaultError;
    }
    // Case 2: Error is an object
    else if (typeof error === "object" && error !== null) {
      
      // Handle Axios/HTTP response errors
      if (error.response && error.response.data) {
        const responseData = error.response.data;
        
        // FastAPI validation errors (422) - Array format
        if (Array.isArray(responseData.detail)) {
          // Pick first error message from validation array
          const firstError = responseData.detail[0];
          msg = firstError?.msg || 
                firstError?.message || 
                firstError?.detail ||
                `Validation error: ${firstError?.loc?.join('.') || 'field'}`;
        }
        // Single detail object
        else if (responseData.detail && typeof responseData.detail === "object") {
          msg = responseData.detail.message || 
                responseData.detail.msg || 
                JSON.stringify(responseData.detail);
        }
        // Simple detail string (most FastAPI errors)
        else if (responseData.detail && typeof responseData.detail === "string") {
          msg = responseData.detail;
        }
        // Other response data formats
        else {
          msg = responseData.message || 
                responseData.msg || 
                responseData.error || 
                JSON.stringify(responseData);
        }
        
        // Add status code if available
        if (error.response.status) {
          const statusText = getStatusText(error.response.status);
          msg = `${statusText}: ${msg}`;
        }
      }
      // Handle network/connection errors
      else if (error.request) {
        msg = "Network error. Please check your internet connection.";
      }
      // Handle other error object formats
      else if (error.message) {
        msg = error.message;
      }
      // Handle database/server errors
      else if (error.data && error.data.message) {
        msg = error.data.message;
      }
      // Last resort - stringify the error
      else {
        // Avoid [object Object] display
        const errorStr = JSON.stringify(error);
        msg = errorStr !== "{}" ? errorStr : defaultError;
      }
    }
    // Case 3: Error is neither string nor object
    else {
      msg = String(error) || defaultError;
    }
    
  } catch (parseError) {
    console.error("Error parsing error:", parseError);
    msg = defaultError;
  }

  // Clean up the message
  msg = cleanErrorMessage(msg);
  
  console.error("Error handle:", msg);
  toast.error(msg);
};

// Helper function to get user-friendly status text
const getStatusText = (status) => {
  const statusMessages = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden", 
    404: "Not Found",
    409: "Conflict",
    422: "Validation Error",
    500: "Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout"
  };
  
  return statusMessages[status] || `Error ${status}`;
};

// Helper function to clean and format error messages
const cleanErrorMessage = (msg) => {
  if (!msg || typeof msg !== "string") {
    return "Something went wrong";
  }
  
  // Remove common technical prefixes
  msg = msg
    .replace(/^Error:\s*/i, "")
    .replace(/^Exception:\s*/i, "")
    .replace(/^HTTPException:\s*/i, "")
    .trim();
  
  // Handle common FastAPI error patterns
  if (msg.includes("422 Unprocessable Entity")) {
    return "Please check your input data";
  }
  
  if (msg.includes("500 Internal Server Error")) {
    return "Server error occurred. Please try again later.";
  }
  
  if (msg.includes("401 Unauthorized")) {
    return "Please log in to continue";
  }
  
  if (msg.includes("404 Not Found")) {
    return "Requested resource not found";
  }
  
  // Limit message length
  if (msg.length > 200) {
    msg = msg.substring(0, 197) + "...";
  }
  
  return msg;
};

// Alternative function for different error scenarios
export const handleAPIError = (error, customMessage = null) => {
  if (customMessage) {
    toast.error(customMessage);
    return;
  }
  
  ErrorHandling({ error });
};

// Specific handlers for common error types
export const handleValidationError = (error) => {
  ErrorHandling({ 
    error, 
    defaultError: "Please check your input and try again" 
  });
};

export const handleNetworkError = () => {
  toast.error("Network connection failed. Please check your internet.");
};

export const handleAuthError = () => {
  toast.error("Session expired. Please log in again.");
  // Redirect to login if needed
  // window.location.href = '/login';
};