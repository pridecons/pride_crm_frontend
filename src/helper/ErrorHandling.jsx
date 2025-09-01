import toast from 'react-hot-toast';

export const ErrorHandling = ({ error, defaultError = "Something went wrong"}) => {
  let msg = defaultError;

  try {
    if (!error) {
      msg = defaultError;
    } else if (typeof error === "string") {
      msg = error;
    } else if (typeof error === "object") {
      msg =
        error?.response?.data?.detail?.message ||
        error?.response?.data?.detail ||
        error?.message ||
        error?.data?.message ||
        JSON.stringify(error);
    }
  } catch (e) {
    msg = defaultError;
  }

  console.error("Error:", msg);
    toast.error(msg);
};
