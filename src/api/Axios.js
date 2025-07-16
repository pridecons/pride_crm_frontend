import axios from "axios";
import Cookies from "js-cookie";

export const BASE_URL = "http://127.0.0.1:8000/api/v1";

export const authAxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store",
  },
  maxRedirects: 5,
});

export const authAxiosInstanceMultipart = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "multipart/form-data",
  },
  maxRedirects: 5,
});


export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// automatically attach access token
axiosInstance.interceptors.request.use((config) => {
  const access_token = Cookies.get("access_token");
  if (access_token) {
    // ensure headers object exists
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${access_token}`;
  }
  return config;
});

// on 401, refresh and retry
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalReq = error.config;
    if (
      error.response &&
      error.response.status === 401 &&
      !originalReq._retry
    ) {
      originalReq._retry = true;

      try {
        const refresh_token = Cookies.get("refresh_token");
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh`,
          { refresh_token }
        );

        // update cookies
        Cookies.set("access_token", data.access_token, { secure: true });
        Cookies.set("refresh_token", data.refresh_token, { secure: true });

        // patch and retry
        originalReq.headers = originalReq.headers || {};
        originalReq.headers["Authorization"] = `Bearer ${data.access_token}`;
        return authAxios(originalReq);
      } catch (refreshErr) {
        // if even refresh fails, clear and force login
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
