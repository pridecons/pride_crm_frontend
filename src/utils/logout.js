// src/utils/logout.js
"use client";

import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";

export function doLogout(router) {
  try {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    Cookies.remove("user_info");
    // drop auth header for future calls
    try { delete axiosInstance.defaults.headers.common["Authorization"]; } catch {}
    // optional cleanup
    if (typeof window !== "undefined") {
      sessionStorage.clear?.();
      localStorage.removeItem("globalSearchQuery");
    }
  } finally {
    router.push("/login");
  }
}