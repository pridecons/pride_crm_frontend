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
  columns = [], // you can pass { header: 'Actions', render: ..., align: 'center' } etc.
  page = 1,
  limit = 10,
  total = 0,
  onPageChange = () => {},
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 10)));
  const start = Math.min((page - 1) * limit + 1, Math.max(total, 1));
  const end = Math.min(page * limit, total);

  const widthFor = (h) => {
    const key = String(h || "").toLowerCase();
    if (key.includes("client")) return "20%";
    if (key.includes("email")) return "22%";
    if (key.includes("mobile") || key.includes("phone")) return "14%";
    if (key.includes("response")) return "18%";
    if (key.includes("source")) return "10%";
    if (key.includes("action")) return "12%";
    return undefined;
  };

  const alignClass = (col) => {
    const header = String(col?.header || "").toLowerCase();
    if (header.includes("client")) return "text-left"; // force name left
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
                    className={`sticky top-0 z-20 px-4 py-3 font-semibold uppercase tracking-wide text-xs ${alignClass(
                      col
                    )}`}
                    style={{
                      background:
                        "var(--theme-components-table-headerBg, var(--theme-surface))",
                      color:
                        "var(--theme-components-table-headerText, var(--theme-text))",
                      borderBottom:
                        "1px solid var(--theme-components-table-border, var(--theme-border))",
                    }}
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
                    className="px-4 py-8 text-center"
                    style={{ color: "var(--theme-textSecondary)" }}
                  >
                    No data available — <span style={{ color: "var(--theme-textSecondary)" }}>—</span>
                  </td>
                </tr>
              ) : (
                leads.map((lead, rIdx) => (
                  <tr
                    key={lead.id ?? rIdx}
                    className="data-row transition-colors duration-150"
                    style={{
                      background:
                        rIdx % 2 === 0
                          ? "var(--theme-components-table-rowBg, var(--theme-cardBackground))"
                          : "var(--theme-components-table-rowAltBg, rgba(0,0,0,0.03))",
                      borderBottom:
                        "1px solid var(--theme-components-table-border, var(--theme-border))",
                    }}
                  >
                    {columns.map((col, cIdx) => {
                      const out = col.render ? col.render(lead) : null;

                      // Primitive value
                      if (
                        typeof out === "string" ||
                        typeof out === "number" ||
                        out == null
                      ) {
                        const { text, title } = formatEmailForCell(
                          out,
                          col.header
                        );

                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-3 align-middle whitespace-nowrap truncate ${
                              String(col?.header || "")
                                .toLowerCase()
                                .includes("client")
                                ? "text-left"
                                : alignClass(col)
                            }`}
                            title={!isBlank(out) ? title : undefined}
                            style={{ color: "var(--theme-text)" }}
                          >
                            {isBlank(out) ? (
                              <span style={{ color: "var(--theme-textSecondary)" }}>—</span>
                            ) : (
                              text
                            )}
                          </td>
                        );
                      }

                      // JSX value
                      return (
                        <td
                          key={cIdx}
                          className={`px-4 py-3 align-middle whitespace-nowrap ${
                            String(col?.header || "")
                              .toLowerCase()
                              .includes("client")
                              ? "text-left"
                              : alignClass(col)
                          }`}
                          style={{ color: "var(--theme-text)" }}
                        >
                          <div
                            className={`flex ${
                              String(col?.header || "")
                                .toLowerCase()
                                .includes("client")
                                ? "justify-start"
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

      {/* Pagination bar */}
      <div
        className="mt-auto shrink-0 px-6 py-1 flex items-center justify-between text-sm"
        style={{
          background: "var(--theme-components-table-headerBg, var(--theme-surface))",
          borderTop: "1px solid var(--theme-components-table-border, var(--theme-border))",
          color: "var(--theme-text)",
        }}
      >
        <span style={{ color: "var(--theme-textSecondary)" }}>
          Showing {start} to {end} of {total} entries
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg pag-btn"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow:
                "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
              opacity: page === 1 ? 0.55 : 1,
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
            title="Previous page"
          >
            Previous
          </button>
          <span style={{ color: "var(--theme-text)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg pag-btn"
            style={{
              background: "var(--theme-components-button-secondary-bg)",
              color: "var(--theme-components-button-secondary-text)",
              border: "1px solid var(--theme-components-button-secondary-border)",
              boxShadow:
                "0 1px 0 0 var(--theme-components-button-secondary-shadow, transparent)",
              opacity: page >= totalPages ? 0.55 : 1,
              cursor: page >= totalPages ? "not-allowed" : "pointer",
            }}
            title="Next page"
          >
            Next
          </button>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Row hover using themed var */
        tr.data-row:hover {
          background: var(--theme-components-table-rowHoverBg, rgba(0,0,0,0.04));
        }
        /* Pagination hover (secondary button) */
        .pag-btn:not(:disabled):hover {
          background: var(--theme-components-button-secondary-hoverBg);
        }
      `}</style>
    </div>
  );
}
