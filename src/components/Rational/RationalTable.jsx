import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePermissions } from '@/context/PermissionsContext';
import DownloadPDF from "./downloadpdf";    


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
  const [expanded, setExpanded] = useState(new Set());
  const toggleRow = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  const { hasPermission } = usePermissions();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full whitespace-nowrap">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th className="text-left py-4 px-6 sticky left-0 bg-white z-10 shadow-right">Stock Name</th>
              <th className="text-left py-4 px-6">Entry Price</th>
              <th className="text-left py-4 px-6">Stop Loss</th>
              <th className="text-left py-4 px-6">Target</th>
              <th className="text-left py-4 px-6">Date</th>
              <th className="text-center py-4 px-6">Status</th>
              <th className="text-center py-4 px-6">Action</th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const isOpen = expanded.has(item.id);
              return (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleRow(item.id)}
                    aria-expanded={isOpen}
                  >
                    <td className="py-4 px-6 font-semibold sticky left-0 bg-white z-10 shadow-right uppercase">
                      <div className="flex items-center gap-2">
                        {item.stock_name}
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </td>
                    <td className="py-4 px-6">{item.entry_price}</td>
                    <td className="py-4 px-6">{item.stop_loss}</td>
                    <td className="py-4 px-6">{item.targets || "-"}</td>
                    <td className="py-4 px-6">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "-"}
                    </td>
                    <td
                      className="py-4 px-6 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasPermission("rational_status") && <button
                        onClick={() =>
                          setOpenStatusDropdown(
                            openStatusDropdown === item.id ? null : item.id
                          )
                        }
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {
                          statusOptions.find((opt) => opt.value === item.status)
                            ?.label || item.status || "N/A"
                        }
                      </button>}

                      {openStatusDropdown === item.id && item.status === "OPEN" && (
                        <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-lg w-36 left-1/2 -translate-x-1/2">
                          {statusOptions.map(({ label, value }) => (
                            <div
                              key={value}
                              onClick={() => {
                                handleStatusChange(item.id, value);
                                setOpenStatusDropdown(null);
                              }}
                              className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${item.status === value
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-gray-700 hover:text-blue-600"
                                }`}
                            >
                              {label}
                              {item.status === value && <span className="ml-2">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6"> {!item.rational && hasPermission("rational_edit") && (
                      <button
                        onClick={() => openModal(item)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                    )}</td>
                  </tr>

                  {/* Accordion Row */}
                  {isOpen && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Target 2</p>
                            <p className="font-medium">{item.targets2 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Target 3</p>
                            <p className="font-medium">{item.targets3 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Recommendation</p>
                            <p className="font-medium">
                              {(() => {
                                const raw = item.recommendation_type;
                                if (!raw || raw.length === 0 || raw[0] === "[]")
                                  return "-";
                                try {
                                  if (
                                    Array.isArray(raw) &&
                                    raw.every(
                                      (r) =>
                                        typeof r === "string" &&
                                        !r.includes("[") &&
                                        !r.includes("]")
                                    )
                                  ) {
                                    return raw.join(", ");
                                  }
                                  const joined = raw.join("");
                                  const fixed = joined.replace(/""/g, '","');
                                  const parsed = JSON.parse(fixed);
                                  if (Array.isArray(parsed)) {
                                    return parsed.join(", ");
                                  }
                                  throw new Error("Invalid format");
                                } catch {
                                  return "Invalid data";
                                }
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Rational</p>
                            <p className="font-medium">{item.rational || "-"}</p>
                          </div>
                          {hasPermission("rational_graf_model_view") && (
                            <div className="space-y-1">
                              <p className="text-slate-500">Graph</p>
                              {item.graph ? (
                                <button
                                  onClick={() => openImageModal(item.graph)}
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-gray-400 text-sm">No Graph</span>
                              )}
                            </div>
                          )}

                          {hasPermission("rational_pdf_model_view") && (
                            <div className="space-y-1">
                              <p className="text-slate-500">PDF</p>
                              {item.pdf ? (
                                <DownloadPDF
                                  id={item.id}
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">No PDF</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {rationalList.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              No rationals found
            </h3>
          </div>
        )}{rationalList.length === 0 && hasPermission("rational_add_recommadation") && (
          <div className="text-center py-12">
            <button
              onClick={() => openModal()}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Add First Rational
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RationalTable;   