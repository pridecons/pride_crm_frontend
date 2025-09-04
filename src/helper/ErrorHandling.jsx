import toast from "react-hot-toast";

export const ErrorHandling = ({ error="", defaultError = "Something went wrong" }) => {
  console.log("error 0 ",error)
  let msg = defaultError;
  console.log("msg 1",msg)

  if(error){
  try {
    if (!error) {
      msg = defaultError;
    } else if (typeof error === "string") {
      // Direct string error
      msg = error;
      console.log("error 2",error)
    } else if (typeof error === "object") {
      console.log("object 3",error)
      const detail = error?.response?.data?.detail;
      console.log("object 4",detail)

      if (Array.isArray(detail)) {
        // If detail is an array → pick first .msg/.message/.detail or stringify
        msg =
          detail[0]?.msg ||
          detail[0]?.message ||
          detail[0]?.detail ||
          JSON.stringify(detail);
          console.log("Array 5",msg)
      } else if (typeof detail === "object") {
        // If detail is an object → check known keys
        msg = detail?.errors || detail?.errors?.[0] || detail?.message || detail?.msg || JSON.stringify(detail);
        console.log("object 6",msg)
      } else if (typeof detail === "string") {
        // If detail is plain string
        msg = detail;
        console.log("string 7",msg)
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
  }else{
     msg = defaultError;
  }

  console.error("Error handle:", msg);
  toast.error(msg);
};
