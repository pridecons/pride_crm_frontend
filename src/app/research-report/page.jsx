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

const SEC = "border rounded-2xl p-4 bg-white shadow-sm";

/* -----------------------------
   Reusable Row Controls
----------------------------- */
function RowHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 px-3 py-1.5 border rounded-lg hover:bg-gray-50"
      >
        <Plus size={16} />
        Add
      </button>
    </div>
  );
}

function RemoveBtn({ onClick, title = "Remove" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg border hover:bg-red-50 hover:border-red-300"
    >
      <Trash2 size={16} className="text-red-600" />
    </button>
  );
}

/* -----------------------------
   Calls row (shared by Index/Stock)
----------------------------- */
function CallRow({ row, onChange, onRemove, onUpload, uploading }) {
  const set = (k, v) => onChange({ ...row, [k]: v });

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file); // parent sets chart_url
    e.target.value = null; // reset
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start border rounded-xl p-3 mb-3">
      <input
        placeholder="Symbol"
        className="md:col-span-2 border rounded-lg h-11 px-3"
        value={row.symbol || ""}
        onChange={(e) => set("symbol", e.target.value)}
      />
      <select
        className="md:col-span-2 border rounded-lg h-11 px-3"
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
        className="md:col-span-1 border rounded-lg h-11 px-3"
        value={row.entry_at ?? ""}
        onChange={(e) => set("entry_at", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="Buy Above"
        className="md:col-span-1 border rounded-lg h-11 px-3"
        value={row.buy_above ?? ""}
        onChange={(e) => set("buy_above", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="T1"
        className="md:col-span-1 border rounded-lg h-11 px-3"
        value={row.t1 ?? ""}
        onChange={(e) => set("t1", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="T2"
        className="md:col-span-1 border rounded-lg h-11 px-3"
        value={row.t2 ?? ""}
        onChange={(e) => set("t2", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <input
        placeholder="SL"
        className="md:col-span-1 border rounded-lg h-11 px-3"
        value={row.sl ?? ""}
        onChange={(e) => set("sl", numOrNull(e.target.value))}
        type="number"
        step="any"
      />
      <div className="md:col-span-2 flex items-center gap-2">
        <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
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
        {row.chart_url ? (
          <a
            href={row.chart_url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 text-sm underline"
          >
            View
          </a>
        ) : (
          <span className="text-xs text-gray-500">No chart</span>
        )}
        <RemoveBtn onClick={onRemove} />
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

  const [ipo, setIpo] = useState([]);
  const [board, setBoard] = useState([]);
  const [corpActs, setCorpActs] = useState([]);
  const [results, setResults] = useState([]);
  const [topGainers, setTopGainers] = useState([]);
  const [topLosers, setTopLosers] = useState([]);
  const [fiiDii, setFiiDii] = useState({
    date: "",
    fii_fpi: { cash: null, debt: null },
    dii: { cash: null, debt: null },
  });

  const [callsIndex, setCallsIndex] = useState([]);
  const [callsStock, setCallsStock] = useState([]);

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
      {
        symbol: "",
        view: "",
        entry_at: null,
        buy_above: null,
        t1: null,
        t2: null,
        sl: null,
        chart_url: "",
      },
    ]);
  const addCallStock = () =>
    setCallsStock((x) => [
      ...x,
      {
        symbol: "",
        view: "",
        entry_at: null,
        buy_above: null,
        t1: null,
        t2: null,
        sl: null,
        chart_url: "",
      },
    ]);

  /* -----------------------------
     Image upload
  ----------------------------- */
  async function uploadChartImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await axiosInstance.post(
      "/research/upload-chart",
      fd,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data?.url;
  }

  /* -----------------------------
     Submit
  ----------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitOk(null);
    setSubmitErr(null);
    try {
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

        fii_dii: {
          date: fiiDii.date || null,
          fii_fpi: {
            cash: numOrNull(fiiDii?.fii_fpi?.cash),
            debt: numOrNull(fiiDii?.fii_fpi?.debt),
          },
          dii: {
            cash: numOrNull(fiiDii?.dii?.cash),
            debt: numOrNull(fiiDii?.dii?.debt),
          },
        },

        calls_index: callsIndex.map((c) => ({
          symbol: c.symbol || null,
          view: c.view || null,
          entry_at: numOrNull(c.entry_at),
          buy_above: numOrNull(c.buy_above),
          t1: numOrNull(c.t1),
          t2: numOrNull(c.t2),
          sl: numOrNull(c.sl),
          chart_url: c.chart_url || null,
        })),

        calls_stock: callsStock.map((c) => ({
          symbol: c.symbol || null,
          view: c.view || null,
          entry_at: numOrNull(c.entry_at),
          buy_above: numOrNull(c.buy_above),
          t1: numOrNull(c.t1),
          t2: numOrNull(c.t2),
          sl: numOrNull(c.sl),
          chart_url: c.chart_url || null,
        })),
      };

      const { data } = await axiosInstance.post("/research/", payload);
      setSubmitOk(data?.id ? `Created Report #${data.id}` : "Created");
      // Optional: reset small fields, keep big lists if you prefer
      // setIpo([]); setBoard([]); ...
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6">


        <form onSubmit={onSubmit} className="space-y-6">
          {/* Meta Section - Card Style */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                Report Meta
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Title</label>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Report Date</label>
                </div>
                <div className="relative">
                  <input
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
                    placeholder="Tags (comma separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Tags</label>
                </div>
              </div>
              <div className="relative mt-4">
                <textarea
                  className="w-full border-2 border-gray-200 rounded-xl min-h-[100px] p-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Notes</label>
              </div>
            </div>
          </section>

          {/* IPO Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="IPO" onAdd={addIPO} />
            </div>
            <div className="p-6">
              {ipo.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm text-gray-500">No IPO rows yet. Click add to get started.</p>
                </div>
              )}
              {ipo.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200"
                >
                  <input
                    placeholder="Company"
                    className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                    value={row.company || ""}
                    onChange={(e) =>
                      setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, company: e.target.value } : r)))
                    }
                  />

                  <input
                    placeholder="Lot Size"
                    type="number"
                    className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                    value={row.lot_size ?? ""}
                    onChange={(e) =>
                      setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, lot_size: numOrNull(e.target.value) } : r)))
                    }
                  />

                  <input
                    placeholder="Price Range"
                    className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                    value={row.price_range || ""}
                    onChange={(e) =>
                      setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, price_range: e.target.value } : r)))
                    }
                  />

                  <input
                    type="date"
                    className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                    value={row.open_date || ""}
                    onChange={(e) =>
                      setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, open_date: e.target.value } : r)))
                    }
                  />

                  <input
                    type="date"
                    className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                    value={row.close_date || ""}
                    onChange={(e) =>
                      setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, close_date: e.target.value } : r)))
                    }
                  />

                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      placeholder="Category"
                      className="w-full min-w-0 h-11 px-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200 bg-white"
                      value={row.category || ""}
                      onChange={(e) =>
                        setIpo((x) => x.map((r, idx) => (idx === i ? { ...r, category: e.target.value } : r)))
                      }
                    />
                    <RemoveBtn
                      className="shrink-0"
                      onClick={() => setIpo((x) => x.filter((_, idx) => idx !== i))}
                    />
                  </div>
                </div>
              ))}

            </div>
          </section>

          {/* Board Meetings Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="Board Meetings" onAdd={addBoard} />
            </div>
            <div className="p-6">
              {board.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm text-gray-500">No board meetings yet. Click add to get started.</p>
                </div>
              )}
              {board.map((row, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-purple-300 transition-all duration-200">
                  <input
                    placeholder="Company"
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-purple-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-purple-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-purple-500 focus:outline-none transition-colors duration-200 bg-white"
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
                      onClick={() => setBoard((x) => x.filter((_, idx) => idx !== i))}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Corporate Actions Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="Corporate Actions" onAdd={addCorp} />
            </div>
            <div className="p-6">
              {corpActs.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm text-gray-500">No corporate actions yet. Click add to get started.</p>
                </div>
              )}
              {corpActs.map((row, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-orange-300 transition-all duration-200">
                  <input
                    placeholder="Company"
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-orange-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-orange-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-orange-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-orange-500 focus:outline-none transition-colors duration-200 bg-white"
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
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="Result Calendar" onAdd={addResult} />
            </div>
            <div className="p-6">
              {results.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm text-gray-500">No results yet. Click add to get started.</p>
                </div>
              )}
              {results.map((row, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 hover:border-cyan-300 transition-all duration-200">
                  <input
                    placeholder="Company"
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-cyan-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-cyan-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-cyan-500 focus:outline-none transition-colors duration-200 bg-white"
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
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-cyan-500 focus:outline-none transition-colors duration-200 bg-white"
                    type="number"
                    step="any"
                    value={row.ltp ?? ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, ltp: numOrNull(e.target.value) } : r
                        )
                      )
                    }
                  />
                  <input
                    placeholder="Change"
                    className="border-2 border-gray-200 rounded-lg h-11 px-3 focus:border-cyan-500 focus:outline-none transition-colors duration-200 bg-white"
                    type="number"
                    step="any"
                    value={row.change ?? ""}
                    onChange={(e) =>
                      setResults((x) =>
                        x.map((r, idx) =>
                          idx === i ? { ...r, change: numOrNull(e.target.value) } : r
                        )
                      )
                    }
                  />
                  <div className="flex items-center">
                    <RemoveBtn
                      onClick={() =>
                        setResults((x) => x.filter((_, idx) => idx !== i))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top Gainers / Losers Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                Market Movers
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Gainers */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <RowHeader title="Top Gainers" onAdd={addGainer} />
                  {topGainers.length === 0 && (
                    <div className="text-center py-6 bg-white/50 rounded-lg mt-3">
                      <svg className="w-10 h-10 mx-auto text-green-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <p className="text-sm text-gray-600">No gainers yet.</p>
                    </div>
                  )}
                  {topGainers.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 bg-white rounded-lg border border-green-100 hover:shadow-md transition-all duration-200"
                    >
                      <input
                        placeholder="Symbol"
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-green-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-green-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-green-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-green-500 focus:outline-none transition-colors duration-200"
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
                          onClick={() =>
                            setTopGainers((x) => x.filter((_, idx) => idx !== i))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top Losers */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                  <RowHeader title="Top Losers" onAdd={addLoser} />
                  {topLosers.length === 0 && (
                    <div className="text-center py-6 bg-white/50 rounded-lg mt-3">
                      <svg className="w-10 h-10 mx-auto text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                      <p className="text-sm text-gray-600">No losers yet.</p>
                    </div>
                  )}
                  {topLosers.map((row, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3 p-3 bg-white rounded-lg border border-red-100 hover:shadow-md transition-all duration-200"
                    >
                      <input
                        placeholder="Symbol"
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-red-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-red-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-red-500 focus:outline-none transition-colors duration-200"
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
                        className="border-2 border-gray-200 rounded-lg h-10 px-2 text-sm focus:border-red-500 focus:outline-none transition-colors duration-200"
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
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                FII / DII Activity
              </h3>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <input
                    type="date"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                    value={fiiDii.date}
                    onChange={(e) => setFiiDii({ ...fiiDii, date: e.target.value })}
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Date</label>
                </div>
                <div className="relative">
                  <input
                    placeholder="FII Cash"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                    type="number"
                    step="any"
                    value={fiiDii?.fii_fpi?.cash ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        fii_fpi: { ...(x.fii_fpi || {}), cash: numOrNull(e.target.value) },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">FII Cash</label>
                </div>
                <div className="relative">
                  <input
                    placeholder="FII Debt"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
                    type="number"
                    step="any"
                    value={fiiDii?.fii_fpi?.debt ?? ""}
                    onChange={(e) =>
                      setFiiDii((x) => ({
                        ...x,
                        fii_fpi: { ...(x.fii_fpi || {}), debt: numOrNull(e.target.value) },
                      }))
                    }
                  />
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">FII Debt</label>
                </div>
                <div className="relative">
                  <input
                    placeholder="DII Cash"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
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
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">DII Cash</label>
                </div>
                <div className="relative">
                  <input
                    placeholder="DII Debt"
                    className="w-full border-2 border-gray-200 rounded-xl h-12 px-4 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-white"
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
                  <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">DII Debt</label>
                </div>
              </div>
            </div>
          </section>

          {/* Calls: Index Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="Calls — Index" onAdd={addCallIndex} />
            </div>
            <div className="p-6">
              {callsIndex.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-gray-500">No index calls yet. Click add to get started.</p>
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
                    setCallsIndex((x) => x.map((r, idx) => (idx === i ? newRow : r)))
                  }
                  uploading={
                    uploadingIdx.type === "index" && uploadingIdx.i === i
                  }
                  onUpload={async (file) => {
                    try {
                      setUploadingIdx({ type: "index", i });
                      const url = await uploadChartImage(file);
                      setCallsIndex((x) =>
                        x.map((r, idx) => (idx === i ? { ...r, chart_url: url } : r))
                      );
                    } finally {
                      setUploadingIdx({ type: "", i: -1 });
                    }
                  }}
                />
              ))}
            </div>
          </section>

          {/* Calls: Stock Section */}
          <section className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <RowHeader title="Calls — Stock" onAdd={addCallStock} />
            </div>
            <div className="p-6">
              {callsStock.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-gray-500">No stock calls yet. Click add to get started.</p>
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
                    setCallsStock((x) => x.map((r, idx) => (idx === i ? newRow : r)))
                  }
                  uploading={
                    uploadingIdx.type === "stock" && uploadingIdx.i === i
                  }
                  onUpload={async (file) => {
                    try {
                      setUploadingIdx({ type: "stock", i });
                      const url = await uploadChartImage(file);
                      setCallsStock((x) =>
                        x.map((r, idx) => (idx === i ? { ...r, chart_url: url } : r))
                      );
                    } finally {
                      setUploadingIdx({ type: "", i: -1 });
                    }
                  }}
                />
              ))}
            </div>
          </section>

          {/* Submit Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-60 disabled:transform-none"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {submitting ? "Saving Report..." : "Create Report"}
              </button>

              {submitOk ? (
                <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <CheckCircle2 size={20} />
                  {submitOk}
                </span>
              ) : null}

              {submitErr ? (
                <span className="inline-flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
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
