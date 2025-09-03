import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
/* ====================== EMPLOYEE DATA ACCURACY (UI SHELL) ====================== */
function EmployeeWithDataAccuracy() {
    const [employees, setEmployees] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const { data } = await axiosInstance.get("/employee?skip=0&limit=100");
                setEmployees(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Failed to fetch employees", error);
            }
        };
        fetchEmployees();
    }, []);

    const handleApply = () => setApplied(true);
    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setApplied(false);
    };

    return (
        <div className="mt-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                    Employee with Data Accuracy
                </h2>

                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-gray-500 mb-1">Lead Source</label>
                        <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Lead Source</option>
                            <option value="referral">Referral</option>
                            <option value="website">Website</option>
                            <option value="social">Social Media</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 mb-1">Role</label>
                        <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select Role</option>
                            <option value="90000">90000</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-3">
                        <div>
                            <label className="block text-gray-500 mb-1">From</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    setApplied(false);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 mb-1">To</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => {
                                    setToDate(e.target.value);
                                    setApplied(false);
                                }}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                            />
                        </div>

                        {applied ? (
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                            >
                                Clear
                            </button>
                        ) : fromDate || toDate ? (
                            fromDate && toDate ? (
                                <button
                                    onClick={handleApply}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                                >
                                    Apply
                                </button>
                            ) : (
                                <button
                                    onClick={handleClear}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                                >
                                    Clear
                                </button>
                            )
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}


export default EmployeeWithDataAccuracy;