"use client";
import React, { useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import DownloadPDF from "./downloadpdf";
import { useTheme } from "@/context/ThemeContext";

/** Small helpers */
const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "-";

/** Themed Status Badge */
const StatusBadge = ({ label }) => {
  // map statuses to token tones
  const tone =
    label === "OPEN"
      ? {
        bg: "var(--theme-primary-softer)",
        text: "var(--theme-primary)",
        ring: "var(--theme-border)",
      }
      : label === "CLOSED"
        ? {
          bg: "var(--theme-success-soft)",
          text: "var(--theme-success)",
          ring: "var(--theme-border)",
        }
        : {
          bg: "var(--theme-surface)",
          text: "var(--theme-text)",
          ring: "var(--theme-border)",
        };

  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1"
      style={{
        background: tone.bg,
        color: tone.text,
        boxShadow: "none",
        borderColor: tone.ring,
      }}
    >
      {label}
    </span>
  );
};

// ---- Status transition helpers ----
const STATUS = {
  OPEN: "OPEN",
  TARGET1: "TARGET1_HIT",
  TARGET2: "TARGET2_HIT",
  TARGET3: "TARGET3_HIT",
  STOP_LOSS: "STOP_LOSS_HIT",
  CLOSED: "CLOSED",
};

const getAllowedNextStatuses = (current) => {
  switch ((current || "").toUpperCase()) {
    case STATUS.OPEN:
      return [
        STATUS.TARGET1,
        STATUS.TARGET2,
        STATUS.TARGET3,
        STATUS.STOP_LOSS,
        STATUS.CLOSED,
      ];
    case STATUS.TARGET1:
      return [STATUS.TARGET2, STATUS.TARGET3];
    case STATUS.TARGET2:
      return [STATUS.TARGET3];
    default:
      // TARGET3 / STOP_LOSS / CLOSED (or unknown) => locked
      return [];
  }
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
  onCorrection,
}) {
  const { hasPermission } = usePermissions();
  const { themeConfig } = useTheme();

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
      if (Array.isArray(raw) && raw.every((r) => typeof r === "string" && !r.includes("[") && !r.includes("]")))
        return raw.join(", ");
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
    <div
      className="rounded-2xl overflow-hidden border shadow-sm"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
        boxShadow: `0 10px 25px ${themeConfig.shadow}`,
      }}
    >
      {/* table title / count */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 border-b"
        style={{
          borderColor: "var(--theme-border)",
          background:
            "linear-gradient(90deg, var(--theme-card-bg) 0%, var(--theme-surface) 100%)",
          color: "var(--theme-text)",
        }}
      >
        <div className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
          Showing{" "}
          <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
            {filteredData.length}
          </span>{" "}
          {filteredData.length === 1 ? "item" : "items"}
        </div>
        {/* Space reserved for future bulk actions */}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm" style={{ color: "var(--theme-text)" }}>
          <thead>
            <tr
              className="border-b"
              style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}
            >
              <th
                className="sticky left-0 z-20 text-left py-3.5 px-6 font-semibold"
                style={{ background: "var(--theme-surface)", color: "var(--theme-text)" }}
              >
                Stock Name
              </th>
              {["Entry Price", "Stop Loss", "Target", "Date"].map((h) => (
                <th key={h} className="py-3.5 px-6 text-left font-semibold" style={{ color: "var(--theme-text)" }}>
                  {h}
                </th>
              ))}
              <th className="py-3.5 px-6 text-center font-semibold" style={{ color: "var(--theme-text)" }}>
                Status
              </th>
              <th className="py-3.5 px-6 text-center font-semibold" style={{ color: "var(--theme-text)" }}>
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((item, idx) => {
              const isOpen = expanded.has(item.id);
              // zebra rows using surface/card blend
              const zebraBg =
                idx % 2 === 0 ? "var(--theme-card-bg)" : "color-mix(in oklab, var(--theme-card-bg) 70%, var(--theme-surface))";

              return (
                <React.Fragment key={item.id}>
                  {/* Main row */}
                  <tr
                    className="group cursor-pointer transition-colors"
                    aria-expanded={isOpen}
                    onClick={() => toggleRow(item.id)}
                    style={{
                      background: zebraBg,
                    }}
                  >
                    <td
                      className="sticky left-0 z-10 py-4 px-6 font-semibold uppercase"
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyToggle(e, item.id)}
                      title={item.stock_name}
                      style={{ background: "inherit", color: "var(--theme-text)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[220px] sm:max-w-[360px]">
                          {item.stock_name}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={16} className="shrink-0" style={{ color: "var(--theme-text-muted)" }} />
                        ) : (
                          <ChevronDown size={16} className="shrink-0" style={{ color: "var(--theme-text-muted)" }} />
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-6" style={{ color: "var(--theme-text)" }}>
                      {item.entry_price}
                    </td>
                    <td className="py-4 px-6" style={{ color: "var(--theme-text)" }}>
                      {item.stop_loss}
                    </td>
                    <td className="py-4 px-6" style={{ color: "var(--theme-text)" }}>
                      {item.targets || "-"}
                    </td>
                    <td className="py-4 px-6" style={{ color: "var(--theme-text)" }}>
                      {formatDate(item.created_at)}
                    </td>

                    {/* Status (with dropdown) */}
                    <td
                      className="py-4 px-6 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasPermission("rational_status") ? (
                        (() => {
                          const current = (item.status || "").toString().trim();
                          const allowed = getAllowedNextStatuses(current);
                          const isEditable = allowed.length > 0;

                          return (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isEditable) return;
                                  setOpenStatusDropdown(
                                    openStatusDropdown === item.id ? null : item.id
                                  );
                                }}
                                className={`inline-flex items-center gap-1.5 ${isEditable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                                  }`}
                                aria-disabled={!isEditable}
                                title={
                                  isEditable
                                    ? "Change status"
                                    : "Status is locked (no further transitions)"
                                }
                              >
                                <StatusBadge
                                  label={
                                    statusOptions.find((opt) => opt.value === item.status)?.label ||
                                    item.status ||
                                    "N/A"
                                  }
                                />
                                {isEditable && (
                                  <ChevronDown
                                    size={14}
                                    style={{ color: "var(--theme-text-muted)" }}
                                  />
                                )}
                              </button>

                              {isEditable && openStatusDropdown === item.id && (
                                <div
                                  className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 w-40 rounded-lg border overflow-hidden"
                                  style={{
                                    background: "var(--theme-card-bg)",
                                    borderColor: "var(--theme-border)",
                                    boxShadow: `0 10px 25px ${themeConfig.shadow}`,
                                  }}
                                >
                                  {statusOptions
                                    .filter(({ value }) => allowed.includes(value))
                                    .map(({ label, value }) => (
                                      <button
                                        key={value}
                                        onClick={() => {
                                          if (value === item.status) return; // no-op if same
                                          handleStatusChange(item.id, value);
                                          setOpenStatusDropdown(null);
                                        }}
                                        className="w-full text-left px-3.5 py-2 text-sm transition-colors"
                                        style={{
                                          background: "transparent",
                                          color: "var(--theme-text)",
                                        }}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        <StatusBadge label={item.status || "N/A"} />
                      )}
                    </td>
                    {/* Action */}
                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {/* Correction */}
                        <button
                          type="button"
                          onClick={() => onCorrection?.(item)}
                          className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                          title="Open this recommendation prefilled as a new correction"
                          style={{
                            background: "var(--theme-accent, var(--theme-primary))",
                            color: "var(--theme-on-accent, var(--theme-primary-contrast))",
                          }}
                        >
                          Correction
                        </button>

                        {/* Edit (optional) */}
                        {!item.rational && hasPermission("rational_edit") && (
                          <button
                            onClick={() => openModal(item)}
                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                            title="Edit this recommendation"
                            style={{
                              background: "var(--theme-primary-softer)",
                              color: "var(--theme-primary)",
                              border: "1px solid var(--theme-border)",
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Accordion row */}
                  <tr className={`${isOpen ? "table-row" : "hidden"}`}>
                    <td colSpan={7} className="px-6 pb-4 pt-0">
                      <div
                        className="overflow-hidden rounded-xl border shadow-sm transition-[max-height,opacity] duration-300 ease-in-out"
                        style={{
                          background: "var(--theme-card-bg)",
                          borderColor: "var(--theme-border)",
                          color: "var(--theme-text)",
                          opacity: isOpen ? 1 : 0,
                        }}
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-5">
                          <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                              Target 2
                            </p>
                            <p className="mt-0.5 font-medium" style={{ color: "var(--theme-text)" }}>
                              {item.targets2 || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                              Target 3
                            </p>
                            <p className="mt-0.5 font-medium" style={{ color: "var(--theme-text)" }}>
                              {item.targets3 || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                              Recommendation
                            </p>
                            <p className="mt-0.5 font-medium" style={{ color: "var(--theme-text)" }}>
                              {safeRecommendation(item.recommendation_type)}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                              Rational
                            </p>
                            <p className="mt-0.5 font-medium whitespace-pre-wrap" style={{ color: "var(--theme-text)" }}>
                              {item.rational || "-"}
                            </p>
                          </div>

                          {hasPermission("rational_graf_model_view") && (
                            <div>
                              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                                Graph
                              </p>
                              {item.graph ? (
                                <button
                                  onClick={() => openImageModal(item.graph)}
                                  className="mt-1 inline-flex text-sm underline-offset-2"
                                  style={{ color: "var(--theme-primary)" }}
                                >
                                  View
                                </button>
                              ) : (
                                <span className="mt-1 inline-block text-sm" style={{ color: "var(--theme-text-muted)" }}>
                                  No Graph
                                </span>
                              )}
                            </div>
                          )}

                          {hasPermission("rational_pdf_model_view") && (
                            <div>
                              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--theme-text-muted)" }}>
                                PDF
                              </p>
                              {item.pdf ? (
                                <span className="mt-1 inline-flex">
                                  <DownloadPDF id={item.id} className="text-sm underline-offset-2" />
                                </span>
                              ) : (
                                <span className="mt-1 inline-block text-sm" style={{ color: "var(--theme-text-muted)" }}>
                                  No PDF
                                </span>
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
                    <div className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
                      No rationals found
                    </div>
                    {hasPermission("rational_add_recommadation") && (
                      <button
                        onClick={() => openModal()}
                        className="mt-4 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm"
                        style={{
                          background: "var(--theme-primary)",
                          color: "var(--theme-primary-contrast)",
                        }}
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