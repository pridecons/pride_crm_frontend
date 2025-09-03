import React, { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";

/**
 * UsersDropdown
 * Props:
 *  - value: controlled selected employee_code (string)
 *  - onChange: function(code: string | "") -> void
 */
export const UsersDropdown = ({ value = "", onChange }) => {
  const [users, setUsers] = useState([]);
  const [internal, setInternal] = useState(value || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // keep internal in sync with controlled value
  useEffect(() => {
    setInternal(value || "");
  }, [value]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        "/users/?skip=0&limit=100&active_only=false"
      );
      setUsers(response.data?.data || response.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (event) => {
    const code = event.target.value;
    setInternal(code);
    onChange?.(code); // ✅ bubble employee_code to parent (sets user_id)
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-2">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 text-sm">Loading users...</span>
      </div>
    );

  if (error)
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-600 font-medium text-sm">Error</div>
        <p className="text-red-700 mt-1 text-sm">{error}</p>
        <button
          onClick={fetchUsers}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="mb-0">
      <label
        htmlFor="users-select"
        className="block text-xs font-medium text-gray-700 mb-1"
      >
        Select User
      </label>
      <select
        id="users-select"
        value={internal}
        onChange={handleUserChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Users</option>
        {users.map((user) => (
          <option key={user.employee_code} value={user.employee_code}>
            {user.name} 
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * LeadSourceDropdown
 * Props:
 *  - value: controlled selected source_id (string|number)
 *  - onChange: function(id: string) -> void
 */
export const LeadSourceDropdown = ({ value = "", onChange }) => {
  const [sources, setSources] = useState([]);
  const [internal, setInternal] = useState(value || "");

  useEffect(() => {
    setInternal(value || "");
  }, [value]);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await axiosInstance.get(
          "/lead-config/sources/?skip=0&limit=100"
        );
        // normalize payload (supports array or {data:[]})
        const arr = response.data?.data || response.data || [];
        setSources(arr);
      } catch (error) {
        console.error("Error fetching sources:", error);
      }
    };
    fetchSources();
  }, []);

  const handleChange = (e) => {
    const id = e.target.value;
    setInternal(id);
    onChange?.(id); // ✅ bubble to parent (sets source_id)
  };

  return (
    <div>
      <label
        htmlFor="sources-select"
        className="block text-xs font-medium text-gray-700 mb-1"
      >
        Lead Source
      </label>
      <select
        id="sources-select"
        value={internal}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Source</option>
        {sources.map((source) => (
          <option key={source.id} value={String(source.id)}>
            {source.name}
          </option>
        ))}
      </select>
    </div>
  );
};