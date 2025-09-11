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
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">New Research Report</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Meta */}
        <section className={SEC}>
          <h2 className="text-lg font-semibold mb-4">Report Meta</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border rounded-lg h-11 px-3"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="border rounded-lg h-11 px-3"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
            <input
              className="border rounded-lg h-11 px-3"
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
          <textarea
            className="mt-3 w-full border rounded-lg min-h-[80px] p-3"
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* IPO */}
        <section className={SEC}>
          <RowHeader title="IPO" onAdd={addIPO} />
          {ipo.length === 0 && (
            <p className="text-sm text-gray-500">No IPO rows yet.</p>
          )}
          {ipo.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
              <input
                placeholder="Company"
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
                type="number"
                value={row.lot_size ?? ""}
                onChange={(e) =>
                  setIpo((x) =>
                    x.map((r, idx) =>
                      idx === i ? { ...r, lot_size: numOrNull(e.target.value) } : r
                    )
                  )
                }
              />
              <input
                placeholder="Price Range"
                className="border rounded-lg h-11 px-3"
                value={row.price_range || ""}
                onChange={(e) =>
                  setIpo((x) =>
                    x.map((r, idx) =>
                      idx === i ? { ...r, price_range: e.target.value } : r
                    )
                  )
                }
              />
              <input
                type="date"
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
                value={row.close_date || ""}
                onChange={(e) =>
                  setIpo((x) =>
                    x.map((r, idx) =>
                      idx === i ? { ...r, close_date: e.target.value } : r
                    )
                  )
                }
              />
              <div className="flex items-center gap-2">
                <input
                  placeholder="Category"
                  className="border rounded-lg h-11 px-3 flex-1"
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
                  onClick={() =>
                    setIpo((x) => x.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            </div>
          ))}
        </section>

        {/* Board Meetings */}
        <section className={SEC}>
          <RowHeader title="Board Meetings" onAdd={addBoard} />
          {board.length === 0 && (
            <p className="text-sm text-gray-500">No board meetings yet.</p>
          )}
          {board.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <input
                placeholder="Company"
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
        </section>

        {/* Corporate Actions */}
        <section className={SEC}>
          <RowHeader title="Corporate Actions" onAdd={addCorp} />
          {corpActs.length === 0 && (
            <p className="text-sm text-gray-500">No corporate actions yet.</p>
          )}
          {corpActs.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
              <input
                placeholder="Company"
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
        </section>

        {/* Result Calendar */}
        <section className={SEC}>
          <RowHeader title="Result Calendar" onAdd={addResult} />
          {results.length === 0 && (
            <p className="text-sm text-gray-500">No results yet.</p>
          )}
          {results.map((row, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
              <input
                placeholder="Company"
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
                className="border rounded-lg h-11 px-3"
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
        </section>

        {/* Top Gainers / Losers */}
        <section className={SEC}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <RowHeader title="Top Gainers" onAdd={addGainer} />
              {topGainers.length === 0 && (
                <p className="text-sm text-gray-500">No gainers yet.</p>
              )}
              {topGainers.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3"
                >
                  <input
                    placeholder="Symbol"
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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

            <div>
              <RowHeader title="Top Losers" onAdd={addLoser} />
              {topLosers.length === 0 && (
                <p className="text-sm text-gray-500">No losers yet.</p>
              )}
              {topLosers.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3"
                >
                  <input
                    placeholder="Symbol"
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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
                    className="border rounded-lg h-11 px-3"
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
        </section>

        {/* FII/DII */}
        <section className={SEC}>
          <h3 className="font-semibold text-gray-800 mb-3">FII / DII</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="date"
              className="border rounded-lg h-11 px-3"
              value={fiiDii.date}
              onChange={(e) => setFiiDii({ ...fiiDii, date: e.target.value })}
            />
            <input
              placeholder="FII Cash"
              className="border rounded-lg h-11 px-3"
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
            <input
              placeholder="FII Debt"
              className="border rounded-lg h-11 px-3"
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
            <input
              placeholder="DII Cash"
              className="border rounded-lg h-11 px-3"
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
            <input
              placeholder="DII Debt"
              className="border rounded-lg h-11 px-3"
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
          </div>
        </section>

        {/* Calls: Index */}
        <section className={SEC}>
          <RowHeader title="Calls — Index" onAdd={addCallIndex} />
          {callsIndex.length === 0 && (
            <p className="text-sm text-gray-500">No index calls yet.</p>
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
        </section>

        {/* Calls: Stock */}
        <section className={SEC}>
          <RowHeader title="Calls — Stock" onAdd={addCallStock} />
          {callsStock.length === 0 && (
            <p className="text-sm text-gray-500">No stock calls yet.</p>
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
        </section>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
            {submitting ? "Saving..." : "Create Report"}
          </button>

          {submitOk ? (
            <span className="inline-flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} />
              {submitOk}
            </span>
          ) : null}

          {submitErr ? (
            <span className="inline-flex items-center gap-2 text-red-700">
              <XCircle size={18} />
              {submitErr}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
