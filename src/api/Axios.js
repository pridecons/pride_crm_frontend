import axios from "axios";
import Cookies from "js-cookie";

export const BASE_URL = `${process.env.NEXT_PUBLIC_URL}/api/v1`;
export const BASE_URL_full = `${process.env.NEXT_PUBLIC_URL}/api/v1`;
export const WS_BASE_URL_full=`${process.env.NEXT_PUBLIC_WS_URL}/api/v1`

export const authAxiosInstance = axios.create({
  baseURL: BASE_URL_full,
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
  baseURL: BASE_URL_full,
  headers: {
    "Content-Type": "multipart/form-data",
  },
  maxRedirects: 5,
});


export const axiosInstance = axios.create({
  baseURL: BASE_URL_full,
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

        const { data } = await axios.post(`${BASE_URL_full}/auth/refresh`, {
          refresh_token,
        });

        // Save new tokens
        Cookies.set("access_token", data.access_token, { secure: true });
        Cookies.set("refresh_token", data.refresh_token, { secure: true });

        // Retry original request with new access token
        originalReq.headers = {
          ...originalReq.headers,
          Authorization: `Bearer ${data.access_token}`,
        };

        return axiosInstance(originalReq); // <-- retry with correct instance
      } catch (refreshErr) {
        // Failed refresh - logout
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

