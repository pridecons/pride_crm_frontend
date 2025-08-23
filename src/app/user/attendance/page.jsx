"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, Clock, DivideCircle, Calendar, Search, Filter } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import toast from "react-hot-toast";

const API_URL = "/attendance/";

export default function AttendancePage() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  const ATTENDANCE_STATUS = ["PRESENT", "ABSENT", "LEAVE", "HALF DAY"];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axiosInstance.get(API_URL);
      setEmployees(res.data || []);
      setFilteredEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to load employees");
    }
  };

  const applyFilters = () => {
    let data = employees;
    if (searchTerm) {
      data = data.filter((emp) =>
        (emp.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedRole) {
      data = data.filter((emp) => emp.role === selectedRole);
    }
    if (selectedBranch) {
      data = data.filter((emp) => String(emp.branch_id) === selectedBranch);
    }
    setFilteredEmployees(data);
    setCurrentPage(1);
  };

  const handleAttendanceChange = (empCode, value) => {
    setAttendance((prev) => ({ ...prev, [empCode]: value }));
  };

  const handleBulkMark = (status) => {
    const updated = {};
    filteredEmployees.forEach((emp) => {
      updated[emp.employee_code] = status;
    });
    setAttendance((prev) => ({ ...prev, ...updated }));
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error("Please select a date");
      return;
    }

    const unmarked = filteredEmployees.filter((emp) => !attendance[emp.employee_code]);
    if (unmarked.length > 0) {
      toast.error(`Mark attendance for all employees (${unmarked.length} left)`);
      return;
    }

    setLoading(true);
    try {
      for (const emp of filteredEmployees) {
        const payload = {
          employee_code: emp.employee_code,
          date: selectedDate,
          check_in: new Date().toISOString(),
          check_out: new Date().toISOString(),
          status: attendance[emp.employee_code],
        };
        await axiosInstance.post(API_URL, payload);
      }
      toast.success("Attendance saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save attendance");
    } finally {
      setLoading(false);
    }
  };

  // ----- derived data -----
  const roles = Array.from(new Set(employees.map((e) => e.role).filter(Boolean)));
  const branches = Array.from(
    new Set(employees.map((e) => String(e.branch_id || "")).filter((v) => v && v !== "null"))
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const totalMarked = Object.keys(attendance).filter((k) => attendance[k]).length;
  const presentCount = Object.values(attendance).filter((s) => s === "PRESENT").length;
  const absentCount = Object.values(attendance).filter((s) => s === "ABSENT").length;
  const halfdayCount = Object.values(attendance).filter((s) => s === "HALF DAY").length;
  const leaveCount = Object.values(attendance).filter((s) => s === "LEAVE").length;

  const getStatusColor = (status) => {
    switch (status) {
      case "PRESENT":
        return "text-green-600 bg-green-50 border-green-200";
      case "ABSENT":
        return "text-red-600 bg-red-50 border-red-200";
      case "LEAVE":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "HALF DAY":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Attendance Management</h1>
          <p className="text-gray-600">Track and manage employee attendance efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <StatCard title="Total Employees" value={filteredEmployees.length} color="blue" Icon={Users} />
          <StatCard title="PRESENT" value={presentCount} color="green" Icon={CheckCircle} />
          <StatCard title="ABSENT" value={absentCount} color="red" Icon={XCircle} />
          <StatCard title="HALF DAY" value={halfdayCount} color="orange" Icon={DivideCircle} />
          <StatCard title="LEAVE" value={leaveCount} color="yellow" Icon={Clock} />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8">
            <div className="flex flex-wrap gap-6 justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <label className="font-semibold text-lg block mb-2">Select Date:</label>
                  <input
                    type="date"
                    className="bg-white text-gray-700 px-4 py-3 rounded-xl shadow-md focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-200"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                {ATTENDANCE_STATUS.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleBulkMark(status)}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-200 border border-white/30 hover:scale-105"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="p-8 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-800">Filter Employees</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white min-w-32"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 bg-white min-w-36"
              >
                <option value="">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    Branch {branch}
                  </option>
                ))}
              </select>
              <button
                onClick={applyFilters}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                <tr>
                  {["#", "Employee Code", "Name", "Role", "Branch", "Attendance Status"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left font-semibold text-gray-700 text-sm uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentEmployees.length > 0 ? (
                  currentEmployees.map((emp, idx) => (
                    <tr key={emp.employee_code} className="hover:bg-blue-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 text-gray-600 font-medium">{startIndex + idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {emp.employee_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{emp.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {emp.branch_id ? `Branch ${emp.branch_id}` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={attendance[emp.employee_code] || ""}
                          onChange={(e) => handleAttendanceChange(emp.employee_code, e.target.value)}
                          className={`border-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:ring-4 focus:outline-none ${
                            attendance[emp.employee_code]
                              ? getStatusColor(attendance[emp.employee_code])
                              : "border-gray-200 bg-white text-gray-600"
                          }`}
                        >
                          <option value="">Select Status</option>
                          {ATTENDANCE_STATUS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-lg">No employees found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 bg-gray-50 border-t flex justify-center">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 border rounded-lg transition-all duration-200 ${
                      currentPage === i + 1
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Submit Section */}
          <div className="p-8 text-center bg-gradient-to-r from-gray-50 to-blue-50">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedDate}
              className="px-12 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving Attendance...
                </span>
              ) : (
                "Save Attendance"
              )}
            </button>
            <p className="text-gray-600 mt-3 text-sm">
              {totalMarked} of {filteredEmployees.length} employees marked
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, Icon, color }) => {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-100 border-blue-200",
    green: "text-green-600 bg-green-100 border-green-200",
    red: "text-red-600 bg-red-100 border-red-200",
    orange: "text-orange-600 bg-orange-100 border-orange-200",
    yellow: "text-yellow-600 bg-yellow-100 border-yellow-200",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 transform hover:scale-105">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
          <p
            className={`text-3xl font-bold ${
              color === "blue"
                ? "text-blue-600"
                : color === "green"
                ? "text-green-600"
                : color === "red"
                ? "text-red-600"
                : color === "orange"
                ? "text-orange-600"
                : "text-yellow-600"
            }`}
          >
            {value}
          </p>
        </div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${colorClasses[color]}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
};
