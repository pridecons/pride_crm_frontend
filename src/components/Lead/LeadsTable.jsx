"use client";

import LoadingState from "@/components/LoadingState";

export default function LeadsDataTable({
    leads = [],
    loading = false,
    columns = [],
    page = 1,
    limit = 10,
    total = 0,
    onPageChange = () => { },
    tabs = [],            // ← default to empty array
    activeTab,
    onTabClick,
}) {
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    return (
        <div>
            {loading ? (
                <LoadingState message="Loading leads..." />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <colgroup>
                            {columns.map(col => (
                                <col
                                    key={col.header}
                                    style={
                                        col.header === "Response"
                                            ? { width: "200px" }
                                            : undefined
                                    }
                                />
                            ))}
                        </colgroup>
                        <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white sticky top-0 z-10">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className="px-3 py-3 font-semibold uppercase tracking-wide text-xs"
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead, idx) => (
                                <tr
                                    key={lead.id}
                                    className={`hover:bg-blue-50 transition-colors duration-150 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                        }`}
                                >
                                    {columns.map((col, i) => (
                                        <td key={i} className="px-3 py-3">
                                            {col.render(lead)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                    Showing {start} to {end} of {total} entries
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className={`px-4 py-2 rounded-lg border transition ${page === 1
                            ? "border-gray-200 text-gray-400"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        Previous
                    </button>
                    <span className="text-gray-700">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        className={`px-4 py-2 rounded-lg border transition ${page === totalPages
                            ? "border-gray-200 text-gray-400"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
