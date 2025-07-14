import axios from "axios";

export const BASE_URL = "http://127.0.0.1:8000";

const axiosInstance = axios.create({
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

const axiosInstanceMultipart = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "multipart/form-data",
  },
  maxRedirects: 5,
});

// GET Request
export const GetRequest = async (url) => {
  try {
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const ServerGetRequest = async (url) => {
  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      cache: "no-store", // 👈 Important for router.refresh() to work
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("ServerGetRequest error:", error);
    return null;
  }
};

// POST Request
export const PostRequest = async (url, data) => {
  try {
    const response = await axiosInstance.post(url, data);
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
};

export const PostRequestMultipart = async (url, data) => {
  try {
    const response = await axiosInstanceMultipart.post(url, data);
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
};

// Authenticated POST Request
export const AuthPostRequest = async (url, data) => {
  try {
    const response = await axios.post(`${BASE_URL}${url}`, data);
    return response.data;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
};

// UPDATE (PUT) Request
export const PutRequest = async (url, data) => {
  try {
    const response = await axiosInstance.put(url, data);
    return response.data;
  } catch (error) {
    console.error("Error updating data:", error);
    throw error;
  }
};
export const PutRequestMultipart = async (url, data) => {
  try {
    const response = await axiosInstanceMultipart.put(url, data);
    return response.data;
  } catch (error) {
    console.error("Error updating data:", error);
    throw error;
  }
};

// UPDATE (PATCH) Request (for partial updates)
export const PatchRequest = async (url, data) => {
  try {
    const response = await axiosInstance.patch(url, data);
    return response.data;
  } catch (error) {
    console.error("Error updating data (PATCH):", error);
    throw error;
  }
};

// DELETE Request
export const DeleteRequest = async (url) => {
  try {
    const response = await axiosInstance.delete(url);
    return response.data;
  } catch (error) {
    console.error("Error deleting data:", error);
    throw error;
  }
};

export default axiosInstance;
