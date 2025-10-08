"use client";

import React, { useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

/* -----------------------------
   Small helpers
----------------------------- */
function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* ============ CONFIG ============
 * Set to true if you want to send images with old keys:
 *   commentaryImage_{i}, stockPickImage_{i}
 * Otherwise (default) it will send:
 *   commentary_images[], stockpick_images[]
 * Your backend supports BOTH.
 */
const USE_OLD_IMAGE_KEYS = false;
/* ================================= */

function RowHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-[var(--theme-text)]">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                          bg-[var(--theme-components-button-secondary-bg)]
                           text-[var(--theme-components-button-secondary-text)]
                           border border-[var(--theme-components-button-secondary-border)]
                           hover:bg-[var(--theme-components-button-secondary-hoverBg)]"
      >
        <Plus size={16} />
        Add
      </button>
    </div>
  );
}

function RemoveBtn({ onClick, title = "Remove", className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg border hover:bg-red-50 hover:border-red-300 ${className}`}
    >
      <Trash2 size={16} className="text-red-600" />
    </button>
  );
}

/* -----------------------------
   Calls row (shared by Index/Stock)
   NOTE: we store the picked file on the row as `chart_file`
----------------------------- */
function CallRow({ row, onChange, onRemove, onPickFile, uploading }) {
  const set = (k, v) => onChange({ ...row, [k]: v });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onPickFile(file); // parent sets row.chart_file
    e.target.value = null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border border-[var(--theme-border)] rounded-xl p-3 mb-3">
      <input
        placeholder="Symbol"
        className="md:col-span-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.symbol || ""}
        onChange={(e) => set("symbol", e.target.value)}
      />
      <select
        className="md:col-span-2 rounded-lg h-11 px-3 transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
        value={row.view || ""}
        onChange={(e) => set("view", e.target.value)}
      >
        <option value="">View</option>
        <option value="BULLISH">BULLISH</option>
        <option value="BEARISH">BEARISH</option>
        <option value="NEUTRAL">NEUTRAL</option>
      </select>
      <input
        placeholder="Entry @"
        className="md:col-span-1 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.entry_at ?? ""}
        onChange={(e) => set("entry_at", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="Buy Above"
        className="md:col-span-1 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.buy_above ?? ""}
        onChange={(e) => set("buy_above", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="T1"
        className="md:col-span-1 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.t1 ?? ""}
        onChange={(e) => set("t1", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="T2"
        className="md:col-span-1 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.t2 ?? ""}
        onChange={(e) => set("t2", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="SL"
        className="md:col-span-1 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent h-11 px-3"
        value={row.sl ?? ""}
        onChange={(e) => set("sl", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <div className="md:col-span-2 flex items-center gap-2 ">
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent cursor-pointer">
          <UploadCloud size={16} />
          <span className="text-sm">
            {uploading ? "Uploading..." : "Chart Image"}
          </span>
          <input
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
        {row.chart_file ? (
          <span className="text-xs text-green-600">File attached</span>
        ) : (
          <span className="text-xs text-gray-500">No chart</span>
        )}
        <RemoveBtn onClick={onRemove} className="border border-[var(--theme-border)]" />
      </div>
    </div>
  );
}

/* -----------------------------
   Main Page
----------------------------- */
export default function NewResearchReportPage() {
  const [reportDate, setReportDate] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  const [ipo, setIpo] = useState([
    { company: "", lot_size: null, price_range: "", open_date: "", close_date: "", category: "" },
    { company: "", lot_size: null, price_range: "", open_date: "", close_date: "", category: "" },
  ]);

  const [board, setBoard] = useState([
    { company: "", date: "", agenda: "" },
    { company: "", date: "", agenda: "" },
  ]);

  const [corpActs, setCorpActs] = useState([
    { company: "", action: "", ex_date: "", details: "" },
    { company: "", action: "", ex_date: "", details: "" },
  ]);

  const [results, setResults] = useState([
    { company: "", date: "", type: "", ltp: null, change: null },
    { company: "", date: "", type: "", ltp: null, change: null },
  ]);
  const [topGainers, setTopGainers] = useState([
    { symbol: "", cmp: null, price_change: null, change_pct: null },
    { symbol: "", cmp: null, price_change: null, change_pct: null },
  ]);
  const [topLosers, setTopLosers] = useState([
    { symbol: "", cmp: null, price_change: null, change_pct: null },
    { symbol: "", cmp: null, price_change: null, change_pct: null },
  ]);
  const [fiiDii, setFiiDii] = useState({
    date: "",
    // UI keeps cash/debt; we will map -> buy/sell at submit
    fii_fpi: { cash: null, debt: null },
    dii: { cash: null, debt: null },
  });
  const [callsIndex, setCallsIndex] = useState([
    { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
    { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
  ]);
  const [callsStock, setCallsStock] = useState([
    { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
    { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
  ]);



  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  const [uploadingIdx, setUploadingIdx] = useState({ type: "", i: -1 });

  /* -----------------------------
     Row add helpers
  ----------------------------- */
  const addIPO = () =>
    setIpo((x) => [
      ...x,
      {
        company: "",
        lot_size: null,
        price_range: "",
        open_date: "",
        close_date: "",
        category: "",
      },
    ]);
  const addBoard = () =>
    setBoard((x) => [...x, { company: "", date: "", agenda: "" }]);
  const addCorp = () =>
    setCorpActs((x) => [
      ...x,
      { company: "", action: "", ex_date: "", details: "" },
    ]);
  const addResult = () =>
    setResults((x) => [
      ...x,
      { company: "", date: "", type: "", ltp: null, change: null },
    ]);
  const addGainer = () =>
    setTopGainers((x) => [
      ...x,
      { symbol: "", cmp: null, price_change: null, change_pct: null },
    ]);
  const addLoser = () =>
    setTopLosers((x) => [
      ...x,
      { symbol: "", cmp: null, price_change: null, change_pct: null },
    ]);
  const addCallIndex = () =>
    setCallsIndex((x) => [
      ...x,
      { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
    ]);
  const addCallStock = () =>
    setCallsStock((x) => [
      ...x,
      { symbol: "", view: "", entry_at: null, buy_above: null, t1: null, t2: null, sl: null, chart_file: null },
    ]);

  /* -----------------------------
     Submit (multipart/form-data)
  ----------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitOk(null);
    setSubmitErr(null);
    try {
      // ---- payload (JSON expected by your API) ----
      const payload = {
        report_date: reportDate || null,
        title: title || null,
        notes: notes || null,
        tags: tags
          ? tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
          : null,

        ipo: ipo.map((i) => ({
          company: i.company || null,
          lot_size: numOrNull(i.lot_size),
          price_range: i.price_range || null,
          open_date: i.open_date || null,
          close_date: i.close_date || null,
          category: i.category || null,
        })),

        board_meeting: board.map((b) => ({
          company: b.company || null,
          date: b.date || null,
          agenda: b.agenda || null,
        })),

        corporate_action: corpActs.map((c) => ({
          company: c.company || null,
          action: c.action || null,
          ex_date: c.ex_date || null,
          details: c.details || null,
        })),

        result_calendar: results.map((r) => ({
          company: r.company || null,
          date: r.date || null,
          type: r.type || null,
          ltp: numOrNull(r.ltp),
          change: numOrNull(r.change),
        })),

        top_gainers: topGainers.map((g) => ({
          symbol: g.symbol || null,
          cmp: numOrNull(g.cmp),
          price_change: numOrNull(g.price_change),
          change_pct: numOrNull(g.change_pct),
        })),

        top_losers: topLosers.map((g) => ({
          symbol: g.symbol || null,
          cmp: numOrNull(g.cmp),
          price_change: numOrNull(g.price_change),
          change_pct: numOrNull(g.change_pct),
        })),

        // 🔁 Map UI (cash/debt) -> backend (buy/sell)
        fii_dii: {
          date: fiiDii.date || null,
          fii_fpi: {
            buy: numOrNull(fiiDii?.fii_fpi?.cash),
            sell: numOrNull(fiiDii?.fii_fpi?.debt),
          },
          dii: {
            buy: numOrNull(fiiDii?.dii?.cash),
            sell: numOrNull(fiiDii?.dii?.debt),
          },
        },

        // We don't include chart_file in the JSON payload;
        // files go separately in FormData.
        calls_index: callsIndex.map(({ chart_file, ...rest }) => rest),
        calls_stock: callsStock.map(({ chart_file, ...rest }) => rest),
      };

      // ---- multipart form ----
      const fd = new FormData();
      fd.append("payload", JSON.stringify(payload));

      if (USE_OLD_IMAGE_KEYS) {
        // Old pattern: commentaryImage_{idx}, stockPickImage_{idx}
        callsIndex.forEach((c, i) => {
          if (c.chart_file) {
            fd.append(`commentaryImage_${i}`, c.chart_file, `index_${i}.jpg`);
          }
        });
        callsStock.forEach((c, i) => {
          if (c.chart_file) {
            fd.append(`stockPickImage_${i}`, c.chart_file, `stock_${i}.jpg`);
          }
        });
      } else {
        // New pattern: commentary_images[], stockpick_images[]
        callsIndex.forEach((c, i) => {
          if (c.chart_file) {
            fd.append("commentary_images[]", c.chart_file, `index_${i}.jpg`);
          }
        });
        callsStock.forEach((c, i) => {
          if (c.chart_file) {
            fd.append("stockpick_images[]", c.chart_file, `stock_${i}.jpg`);
          }
        });
      }

      const { data } = await axiosInstance.post(
        "/research/create-with-images",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setSubmitOk(data?.message || "Created");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Submit failed. Please try again.";
      setSubmitErr(msg);
    } finally {
      setSubmitting(false);
    }
  }

  /* -----------------------------
     Render
  ----------------------------- */
  return (
    <div className="min-h-screen bg-[var(--theme-background)]">
      <div className="mx-2 p-4 md:p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Meta Section */}
          <section className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className=" px-6 py-6 border-b border-[var(--theme-border)]">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                Report Meta
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 px-1 text-xs text-[var(--theme-text)]">
                    Title
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />                  <label className="absolute -top-2 left-3 px-1 text-xs text-[var(--theme-text)]">

                    Report Date
                  </label>
                </div>
                <div className="relative">
                  <input
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    placeholder="Tags (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 px-1 text-xs text-[var(--theme-text)]">
                    Tags
                  </label>
                </div>
              </div>
              <div className="relative mt-4">
                <textarea
                  className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <label className="absolute -top-2 left-3 px-1 text-xs text-[var(--theme-text)]">
                  Notes
                </label>
              </div>
            </div>
          </section>

          {/* IPO Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 border-b text-[var(--theme-primary)] border-[var(--theme-border)] ">
              <RowHeader title="IPO" onAdd={addIPO}
                className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]" />
            </div>
            <div className="p-6">
              {ipo.length === 0 && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-sm text-[var(--theme-text)]">
                    No IPO rows yet. Click add to get started.
                  </p>
                </div>
              )}
              {ipo.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 p-4 rounded-xl border border-[var(--theme-border)]"
                >
                  <input
                    placeholder="Company"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.company || ""}
                    onChange={(e) =>
                      setIpo((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, company: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Lot Size"
                    type="number"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.lot_size ?? ""}
                    onChange={(e) =>
                      setIpo((x) =>
                        x.map((r, idx) =>
                          idx === i
                            ? { ...r, lot_size: numOrNull(e.target.value) }
                            : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Price Range"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.price_range || ""}
                    onChange={(e) =>
                      setIpo((x) =>
                        x.map((r, idx) =>
                          idx === i
                            ? { ...r, price_range: e.target.value }
                            : r
                        )
                      )
                    }
                  />
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.open_date || ""}
                    onChange={(e) =>
                      setIpo((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, open_date: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.close_date || ""}
                    onChange={(e) =>
                      setIpo((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, close_date: e.target.value } : r
                        )
                      )
                    }
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      placeholder="Category"
                      className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                      value={row.category || ""}
                      onChange={(e) =>
                        setIpo((x) =>
                          x.map((r, idx) =>
                            idx === i ? { ...r, category: e.target.value } : r
                          )
                        )
                      }
                    />
                    <RemoveBtn
                      className="shrink-0 border border-[var(--theme-border)]"
                      onClick={() =>
                        setIpo((x) => x.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Board Meetings Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 text-[var(--theme-primary)]  border-b border-[var(--theme-border)]">
              <RowHeader title="Board Meetings" onAdd={addBoard}
                className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]" />
            </div>
            <div className="p-6">
              {board.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-[var(--theme-border)]">
                  <p className="text-sm text-[var(--theme-primary)]">
                    No board meetings yet. Click add to get started.
                  </p>
                </div>
              )}
              {board.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 rounded-xl border border-[var(--theme-border)]"
                >
                  <input
                    placeholder="Company"
                    className="w-full px-4 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.company || ""}
                    onChange={(e) =>
                      setBoard((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, company: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.date || ""}
                    onChange={(e) =>
                      setBoard((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, date: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Agenda"
                    className="w-full px-4 py-2 rounded-lg transition bg-[var(--theme-components-input-bg)] text-[var(--theme-components-input-text)] placeholder:text-[var(--theme-components-input-placeholder)] border border-[var(--theme-components-input-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.agenda || ""}
                    onChange={(e) =>
                      setBoard((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, agenda: e.target.value } : r
                        )
                      )
                    }
                  />
                  <div className="flex items-center">
                    <RemoveBtn
                      className="border border-[var(--theme-border)]"
                      onClick={() =>
                        setBoard((x) => x.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Corporate Actions Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 border-b text-[var(--theme-primary)]  border-[var(--theme-border)]">
              <RowHeader title="Corporate Actions" onAdd={addCorp}
             className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]"/>
            </div>
            <div className="p-6">
              {corpActs.length === 0 && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-sm text-[var(--theme-primary)]">
                    No corporate actions yet. Click add to get started.
                  </p>
                </div>
              )}
              {corpActs.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4  rounded-xl border border-[var(--theme-border)]"
                >
                  <input
                    placeholder="Company"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.company || ""}
                    onChange={(e) =>
                      setCorpActs((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, company: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Action"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.action || ""}
                    onChange={(e) =>
                      setCorpActs((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, action: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.ex_date || ""}
                    onChange={(e) =>
                      setCorpActs((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, ex_date: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Details"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.details || ""}
                    onChange={(e) =>
                      setCorpActs((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, details: e.target.value } : r
                        )
                      )
                    }
                  />
                  <div className="flex items-center">
                    <RemoveBtn
                      className="border border-[var(--theme-border)]"
                      onClick={() =>
                        setCorpActs((x) => x.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Result Calendar Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 text-[var(--theme-primary)] border-b border-[var(--theme-border)]">
              <RowHeader title="Result Calendar" onAdd={addResult}
                className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]" />
            </div>
            <div className="p-6">
              {results.length === 0 && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-300">
                  <p className="text-sm text-gray-500">
                    No results yet. Click add to get started.
                  </p>
                </div>
              )}
              {results.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 p-4 border border-[var(--theme-border)]"
                >
                  <input
                    placeholder="Company"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.company || ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, company: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.date || ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, date: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Type"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={row.type || ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, type: e.target.value } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="LTP"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={row.ltp ?? ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i
                            ? { ...r, ltp: numOrNull(e.target.value) }
                            : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Change"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={row.change ?? ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i
                            ? { ...r, change: numOrNull(e.target.value) }
                            : r
                        )
                      )
                    }
                  />
                  <div className="flex items-center">
                    <RemoveBtn
                      className="border border-[var(--theme-border)]"
                      onClick={() =>
                        setResults((x) => x.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Market Movers Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 border-b  border-[var(--theme-border)]">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                Market Movers
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="rounded-xl p-4 text-[var(--theme-primary)] border border-[var(--theme-border)] ">
                  <RowHeader title="Top Gainers" onAdd={addGainer}
                    className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]" />
                  {topGainers.length === 0 && (
                    <div className="text-center py-6 bg-white/50 rounded-lg mt-3">
                      <p className="text-sm text-gray-600">No gainers yet.</p>
                    </div>
                  )}
                  {topGainers.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 rounded-lg border border-[var(--theme-border)] hover:shadow-md transition-all duration-200"
                    >
                      <input
                        placeholder="Symbol"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        value={row.symbol || ""}
                        onChange={(e) =>
                          setTopGainers((x) =>
                            x.map((r, idx) =>
                              idx === i ? { ...r, symbol: e.target.value } : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="CMP"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.cmp ?? ""}
                        onChange={(e) =>
                          setTopGainers((x) =>
                            x.map((r, idx) =>
                              idx === i ? { ...r, cmp: numOrNull(e.target.value) } : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="Price Δ"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.price_change ?? ""}
                        onChange={(e) =>
                          setTopGainers((x) =>
                            x.map((r, idx) =>
                              idx === i
                                ? { ...r, price_change: numOrNull(e.target.value) }
                                : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="% Δ"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.change_pct ?? ""}
                        onChange={(e) =>
                          setTopGainers((x) =>
                            x.map((r, idx) =>
                              idx === i
                                ? { ...r, change_pct: numOrNull(e.target.value) }
                                : r
                            )
                          )
                        }
                      />
                      <div className="flex items-center">
                        <RemoveBtn
                          className="border border-[var(--theme-border)]"
                          onClick={() =>
                            setTopGainers((x) => x.filter((_, idx) => idx !== i))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Losers */}
                <div className="rounded-xl p-4 text-[var(--theme-primary)] border border-[var(--theme-border)] ">
                  <RowHeader title="Top Losers" onAdd={addLoser}
                    className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]" />
                  {topLosers.length === 0 && (
                    <div className="text-center py-6 bg-white/50 rounded-lg mt-3">
                      <p className="text-sm text-gray-600">No losers yet.</p>
                    </div>
                  )}
                  {topLosers.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 rounded-lg border border-[var(--theme-border)]  hover:shadow-md transition-all duration-200"
                    >
                      <input
                        placeholder="Symbol"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        value={row.symbol || ""}
                        onChange={(e) =>
                          setTopLosers((x) =>
                            x.map((r, idx) =>
                              idx === i ? { ...r, symbol: e.target.value } : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="CMP"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.cmp ?? ""}
                        onChange={(e) =>
                          setTopLosers((x) =>
                            x.map((r, idx) =>
                              idx === i ? { ...r, cmp: numOrNull(e.target.value) } : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="Price Δ"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.price_change ?? ""}
                        onChange={(e) =>
                          setTopLosers((x) =>
                            x.map((r, idx) =>
                              idx === i
                                ? { ...r, price_change: numOrNull(e.target.value) }
                                : r
                            )
                          )
                        }
                      />
                      <input
                        placeholder="% Δ"
                        className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                        type="number"
                        step="any"
                        value={row.change_pct ?? ""}
                        onChange={(e) =>
                          setTopLosers((x) =>
                            x.map((r, idx) =>
                              idx === i
                                ? { ...r, change_pct: numOrNull(e.target.value) }
                                : r
                            )
                          )
                        }
                      />
                      <div className="flex items-center">
                        <RemoveBtn
                          className="border border-[var(--theme-border)]"
                          onClick={() =>
                            setTopLosers((x) => x.filter((_, idx) => idx !== i))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FII/DII Section */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 border-b border-[var(--theme-border)]">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--theme-text)]">
                <span className="w-2 h-2 rounded-full animate-pulse"></span>
                FII / DII Activity
              </h3>
            </div>
            <div className="p-6 ">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    value={fiiDii.date}
                    onChange={(e) =>
                      setFiiDii({ ...fiiDii, date: e.target.value })
                    }
                  />
                  <label className="absolute -top-2 left-3 text-xs text-[var(--theme-text)]">
                    Date
                  </label>
                </div>
                <div className="relative">
                  <input
                    placeholder="FII Buy (cash)"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={fiiDii?.fii_fpi?.cash ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        fii_fpi: {
                          ...(x.fii_fpi || {}),
                          cash: numOrNull(e.target.value),
                        },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 text-xs text-[var(--theme-text)]">
                    FII Cash (buy)
                  </label>
                </div>
                <div className="relative">
                  <input
                    placeholder="FII Sell (debt)"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={fiiDii?.fii_fpi?.debt ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        fii_fpi: {
                          ...(x.fii_fpi || {}),
                          debt: numOrNull(e.target.value),
                        },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 text-xs text-[var(--theme-text)]">
                    FII Debt (sell)
                  </label>
                </div>
                <div className="relative">
                  <input
                    placeholder="DII Buy (cash)"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={fiiDii?.dii?.cash ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        dii: { ...(x.dii || {}), cash: numOrNull(e.target.value) },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 text-xs text-[var(--theme-text)]">
                    DII Cash (buy)
                  </label>
                </div>
                <div className="relative">
                  <input
                    placeholder="DII Sell (debt)"
                    className="w-full px-4 py-2 rounded-lg transition   bg-[var(--theme-components-input-bg)]   text-[var(--theme-components-input-text)]   placeholder:text-[var(--theme-components-input-placeholder)]   border border-[var(--theme-components-input-border)]   focus:outline-none focus:ring-2 focus:ring-[var(--theme-components-input-focus)] focus:border-transparent"
                    type="number"
                    step="any"
                    value={fiiDii?.dii?.debt ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        dii: { ...(x.dii || {}), debt: numOrNull(e.target.value) },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 text-xs text-[var(--theme-text)]">
                    DII Debt (sell)
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Calls: Index */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 text-[var(--theme-primary)] border-b border-[var(--theme-border)]">
              <RowHeader title="Calls — Index" onAdd={addCallIndex} />
            </div>
            <div className="p-6">
              {callsIndex.length === 0 && (
                <div className="text-center py-8 rounded-xl border border-dashed border-[var(--theme-border)]">
                  <p className="text-sm text-gray-500">
                    No index calls yet. Click add to get started.
                  </p>
                </div>
              )}
              {callsIndex.map((row, i) => (
                <CallRow
                  key={i}
                  row={row}
                  onRemove={() =>
                    setCallsIndex((x) => x.filter((_, idx) => idx !== i))
                  }
                  onChange={(newRow) =>
                    setCallsIndex((x) =>
                      x.map((r, idx) => (idx === i ? newRow : r))
                    )
                  }
                  uploading={uploadingIdx.type === "index" && uploadingIdx.i === i}
                  onPickFile={(file) => {
                    setCallsIndex((x) =>
                      x.map((r, idx) => (idx === i ? { ...r, chart_file: file } : r))
                    );
                  }}
                />
              ))}
            </div>
          </section>

          {/* Calls: Stock */}
          <section className="bg-[var(--theme-surface)] rounded-2xl shadow-lg border border-[var(--theme-border)] overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="px-6 py-4 border-b text-[var(--theme-primary)]  border-[var(--theme-border)]">
              <RowHeader title="Calls — Stock" onAdd={addCallStock} />
            </div>
            <div className="p-6">
              {callsStock.length === 0 && (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-[var(--theme-border)]">
                  <p className="text-sm text-gray-500">
                    No stock calls yet. Click add to get started.
                  </p>
                </div>
              )}
              {callsStock.map((row, i) => (
                <CallRow
                  key={i}
                  row={row}
                  onRemove={() =>
                    setCallsStock((x) => x.filter((_, idx) => idx !== i))
                  }
                  onChange={(newRow) =>
                    setCallsStock((x) =>
                      x.map((r, idx) => (idx === i ? newRow : r))
                    )
                  }
                  uploading={uploadingIdx.type === "stock" && uploadingIdx.i === i}
                  onPickFile={(file) => {
                    setCallsStock((x) =>
                      x.map((r, idx) => (idx === i ? { ...r, chart_file: file } : r))
                    );
                  }}
                />
              ))}
            </div>
          </section>

          {/* Submit */}
          <div className="rounded-2xl shadow-lg border border-[var(--theme-border)] p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--theme-border)]  text-[var(--theme-components-button-primary-text)]
                         bg-[var(--theme-components-button-primary-bg)] font-medium hover:bg-[var(--theme-components-button-primary-hoverBg)] transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-60 disabled:transform-none"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
                {submitting ? "Saving Report..." : "Create Report"}
              </button>

              {submitOk ? (
                <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-[var(--theme-border)] ">
                  <CheckCircle2 size={20} />
                  {submitOk}
                </span>
              ) : null}

              {submitErr ? (
                <span className="inline-flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg border border-[var(--theme-border)] ">
                  <XCircle size={20} />
                  {submitErr}
                </span>
              ) : null}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
