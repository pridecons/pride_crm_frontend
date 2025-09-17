"use client";

import LoadingState from "@/components/LoadingState";
import React from "react";

const isBlank = (v) =>
    v == null || (typeof v === "string" && v.trim() === "");

// Show "local@….." when the email is long; keep full email in title (hover)
const formatEmailForCell = (value, header) => {
    const raw = String(value ?? "").trim();
    if (!raw) return { text: "", title: undefined };

    // Only for email columns
    if (!/email/i.test(String(header || ""))) {
        return { text: raw, title: raw };
    }

    // Short enough → show as-is
    if (raw.length <= 18) return { text: raw, title: raw };

    // Long email → "local@….."
    const at = raw.indexOf("@");
    if (at === -1) return { text: raw.slice(0, 10) + "…..", title: raw }; // fallback if no "@"
    const local = raw.slice(0, at);
    return { text: `${local}@…..`, title: raw };
};

export default function LeadsDataTable({
    leads = [],
    loading = false,
    columns = [],           // you can pass { header: 'Actions', render: ..., align: 'center' } etc.
    page = 1,
    limit = 10,
    total = 0,
    onPageChange = () => { },
}) {
    const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 10)));
    const start = Math.min((page - 1) * limit + 1, Math.max(total, 1));
    const end = Math.min(page * limit, total);

    const widthFor = (h) => {
        const key = String(h || "").toLowerCase();
        if (key.includes("client")) return "20%";
        if (key.includes("email")) return "22%";     // 🔹 NEW
        if (key.includes("mobile") || key.includes("phone")) return "14%";
        if (key.includes("response")) return "18%";
        if (key.includes("source")) return "10%";
        if (key.includes("action")) return "12%";
        return undefined;
    };

    const alignClass = (col) => {
        const header = String(col?.header || "").toLowerCase();
        if (header.includes("client")) return "text-left";   // 👈 force name left
        const a = (col?.align || "center").toLowerCase();
        if (a === "left") return "text-left";
        if (a === "right") return "text-right";
        return "text-center";
    };


    // helpful when a cell renders a flex container (e.g., action icons)
    const justifyClass = (col) => {
        const a = (col?.align || "center").toLowerCase();
        if (a === "left") return "justify-start";
        if (a === "right") return "justify-end";
        return "justify-center";
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {loading ? (
                <LoadingState message="Loading leads..." />
            ) : (
                <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none]">
                    <table className="w-full text-sm border-collapse">
                        <colgroup>
                            {columns.map((col) => (
                                <col key={col.header} style={{ width: widthFor(col.header) }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={idx}
                                        className={`sticky top-0 z-20 px-4 py-3 font-semibold uppercase tracking-wide text-xs bg-blue-600 text-white ${alignClass(
                                            col
                                        )}`}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {leads.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="px-4 py-8 text-center text-gray-500"
                                    >
                                        No data available — <span className="text-gray-400">—</span>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, rIdx) => (
                                    <tr
                                        key={lead.id ?? rIdx}
                                        className={`hover:bg-blue-50 transition-colors duration-150 ${rIdx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                            }`}
                                    >
                                        {columns.map((col, cIdx) => {
                                            const out = col.render ? col.render(lead) : null;

                                            // Plain value
                                            // Plain value
                                            if (
                                                typeof out === "string" ||
                                                typeof out === "number" ||
                                                out == null
                                            ) {
                                                const { text, title } = formatEmailForCell(out, col.header);

                                                return (
                                                    <td
                                                        key={cIdx}
                                                        className={`px-4 py-3 align-middle whitespace-nowrap truncate ${String(col?.header || "").toLowerCase().includes("client")
                                                                ? "text-left" // keep Client left aligned
                                                                : alignClass(col)
                                                            }`}
                                                        title={!isBlank(out) ? title : undefined}  // hover shows full email
                                                    >
                                                        {isBlank(out) ? (
                                                            <span className="text-gray-400">—</span>
                                                        ) : (
                                                            text
                                                        )}
                                                    </td>
                                                );
                                            }

                                            // JSX value — also center flex content
                                            return (
                                                <td
                                                    key={cIdx}
                                                    className={`px-4 py-3 align-middle whitespace-nowrap ${String(col?.header || "").toLowerCase().includes("client")
                                                        ? "text-left"
                                                        : alignClass(col)
                                                        }`}
                                                >
                                                    <div
                                                        className={`flex ${String(col?.header || "").toLowerCase().includes("client")
                                                            ? "justify-start"   // 👈 left-align content
                                                            : justifyClass(col)
                                                            } items-center gap-2`}
                                                    >
                                                        {out}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-auto shrink-0 bg-gray-50 px-6 py-1 border-t border-gray-200 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                    Showing {start} to {end} of {total} entries
                </span>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        className={`px-4 py-2 rounded-lg border transition ${page === 1
                            ? "border-blue-300 text-gray-400 cursor-not-allowed"
                            : "border-blue-400 text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        Previous
                    </button>
                    <span className="text-gray-700">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className={`px-4 py-2 rounded-lg border transition ${page >= totalPages
                            ? "border-blue-300 text-gray-400 cursor-not-allowed"
                            : "border-blue-400 text-gray-700 hover:bg-gray-100"
                            }`}
                    >
                        Next
                    </button>
                </div>
            </div>
            <style jsx>{`
  .no-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome, Safari, new Edge */
  }
`}</style>
        </div>
    );
}
