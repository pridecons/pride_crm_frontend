"use client";
import React, { useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import DownloadPDF from "./downloadpdf";

/** Small helpers */
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

const StatusBadge = ({ label }) => {
  const tone =
    label === "OPEN"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : label === "CLOSED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${tone}`}
    >
      {label}
    </span>
  );
};

function RationalTable({
  rationalList,
  filteredData,
  openModal,
  openImageModal,
  openStatusDropdown,
  setOpenStatusDropdown,
  handleStatusChange,
  statusOptions,
}) {
  const { hasPermission } = usePermissions();

  // which rows are expanded
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleRow = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleKeyToggle = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleRow(id);
    }
  };

  const safeRecommendation = (raw) => {
    if (!raw || raw.length === 0 || raw[0] === "[]") return "-";
    try {
      // Already a clean array of strings
      if (Array.isArray(raw) && raw.every((r) => typeof r === "string" && !r.includes("[") && !r.includes("]")))
        return raw.join(", ");

      // Sometimes arrives as chunked JSON-like tokens
      const joined = Array.isArray(raw) ? raw.join("") : String(raw);
      const fixed = joined.replace(/""/g, '","');
      const parsed = JSON.parse(fixed);
      return Array.isArray(parsed) ? parsed.join(", ") : "-";
    } catch {
      return "-";
    }
  };

  const empty = rationalList.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* table title / count */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50">
        <div className="text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-800">{filteredData.length}</span>{" "}
          {filteredData.length === 1 ? "item" : "items"}
        </div>
        {/* Space reserved for future bulk actions */}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 backdrop-blur border-b border-slate-200">
              <th className="sticky left-0 z-20 bg-slate-50/80 text-left py-3.5 px-6 font-semibold text-slate-700">
                Stock Name
              </th>
              <th className="py-3.5 px-6 text-left font-semibold text-slate-700">Entry Price</th>
              <th className="py-3.5 px-6 text-left font-semibold text-slate-700">Stop Loss</th>
              <th className="py-3.5 px-6 text-left font-semibold text-slate-700">Target</th>
              <th className="py-3.5 px-6 text-left font-semibold text-slate-700">Date</th>
              <th className="py-3.5 px-6 text-center font-semibold text-slate-700">Status</th>
              <th className="py-3.5 px-6 text-center font-semibold text-slate-700">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((item, idx) => {
              const isOpen = expanded.has(item.id);
              const zebra = idx % 2 === 0 ? "bg-white" : "bg-slate-50/40";
              return (
                <React.Fragment key={item.id}>
                  {/* Main row */}
                  <tr
                    className={`${zebra} group hover:bg-slate-50 focus-within:bg-slate-50 cursor-pointer transition-colors`}
                    aria-expanded={isOpen}
                    onClick={() => toggleRow(item.id)}
                  >
                    <td
                      className="sticky left-0 z-10 bg-inherit py-4 px-6 font-semibold uppercase text-slate-800"
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyToggle(e, item.id)}
                      title={item.stock_name}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[220px] sm:max-w-[360px]">{item.stock_name}</span>
                        {isOpen ? (
                          <ChevronUp size={16} className="shrink-0 text-slate-500" />
                        ) : (
                          <ChevronDown size={16} className="shrink-0 text-slate-500" />
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6 text-slate-700">{item.entry_price}</td>
                    <td className="py-4 px-6 text-slate-700">{item.stop_loss}</td>
                    <td className="py-4 px-6 text-slate-700">{item.targets || "-"}</td>
                    <td className="py-4 px-6 text-slate-700">{formatDate(item.created_at)}</td>

                    {/* Status (with dropdown) */}
                    <td
                      className="py-4 px-6 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasPermission("rational_status") ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenStatusDropdown(openStatusDropdown === item.id ? null : item.id)
                            }
                            className="inline-flex items-center gap-1.5"
                          >
                            <StatusBadge
                              label={
                                statusOptions.find((opt) => opt.value === item.status)?.label ||
                                item.status ||
                                "N/A"
                              }
                            />
                            <ChevronDown size={14} className="text-slate-500" />
                          </button>

                          {openStatusDropdown === item.id && (
                            <div className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
                              {statusOptions.map(({ label, value }) => {
                                const active = item.status === value;
                                return (
                                  <button
                                    key={value}
                                    onClick={() => {
                                      handleStatusChange(item.id, value);
                                      setOpenStatusDropdown(null);
                                    }}
                                    className={`w-full text-left px-3.5 py-2 text-sm transition-colors ${
                                      active
                                        ? "bg-blue-50 text-blue-700"
                                        : "hover:bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    {label} {active && <span className="ml-1">✓</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <StatusBadge label={item.status || "N/A"} />
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-center">
                      {!item.rational && hasPermission("rational_edit") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(item);
                          }}
                          className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Accordion row */}
                  <tr className={`${isOpen ? "table-row" : "hidden"}`}>
                    <td colSpan={7} className="px-6 pb-4 pt-0">
                      <div
                        className={`
                          overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm
                          transition-[max-height,opacity] duration-300 ease-in-out
                          ${isOpen ? "opacity-100" : "opacity-0"}
                        `}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Target 2</p>
                            <p className="mt-0.5 font-medium text-slate-800">{item.targets2 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Target 3</p>
                            <p className="mt-0.5 font-medium text-slate-800">{item.targets3 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Recommendation</p>
                            <p className="mt-0.5 font-medium text-slate-800">
                              {safeRecommendation(item.recommendation_type)}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Rational</p>
                            <p className="mt-0.5 font-medium text-slate-800 whitespace-pre-wrap">
                              {item.rational || "-"}
                            </p>
                          </div>

                          {hasPermission("rational_graf_model_view") && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">Graph</p>
                              {item.graph ? (
                                <button
                                  onClick={() => openImageModal(item.graph)}
                                  className="mt-1 inline-flex text-blue-700 hover:underline text-sm"
                                >
                                  View
                                </button>
                              ) : (
                                <span className="mt-1 inline-block text-slate-400 text-sm">No Graph</span>
                              )}
                            </div>
                          )}

                          {hasPermission("rational_pdf_model_view") && (
                            <div>
                              <p className="text-xs uppercase tracking-wide text-slate-500">PDF</p>
                              {item.pdf ? (
                                <span className="mt-1 inline-flex">
                                  <DownloadPDF
                                    id={item.id}
                                    className="text-blue-700 hover:underline text-sm"
                                  />
                                </span>
                              ) : (
                                <span className="mt-1 inline-block text-slate-400 text-sm">No PDF</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {/* Empty state */}
            {empty && (
              <tr>
                <td colSpan={7} className="py-14">
                  <div className="mx-auto max-w-md text-center">
                    <div className="text-lg font-semibold text-slate-800">No rationals found</div>
                    {hasPermission("rational_add_recommadation") && (
                      <button
                        onClick={() => openModal()}
                        className="mt-4 inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                      >
                        Add First Rational
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RationalTable;
