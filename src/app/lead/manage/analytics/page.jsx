"use client";

import { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import {
  Loader2,
  RefreshCcw,
  ChevronDown,
  BarChart3,
  Layers,
  TrendingUp,
} from "lucide-react";

/* utils */
const cx = (...a) => a.filter(Boolean).join(" ");
const num = (n) => Number(n || 0).toLocaleString();
// treat variations like "NO RESPONSE" / "No response" the same
const isNoResponse = (s) => String(s || "").trim().toLowerCase() === "no response";

/* ======================================================================= */
export default function SourceAnalytics({ days = 30, view = "all", branchId = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const toggle = (key) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("days", String(days));
      p.set("view", view);
      if (branchId != null) p.set("branch_id", String(branchId));
      const res = await axiosInstance.get(`/source/analytics/source-analytics?${p.toString()}`);
      setData(res.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [days, view, branchId]);

  if (loading && !data) return <SkeletonLoader />;
  if (!data) return <EmptyState />;

  const { overall_total_leads, total_sources, sources = [] } = data;

  return (
    <div className="space-y-6 p-2 sm:p-4">
      {/* Header Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={BarChart3}
          title="Total Leads"
          value={num(overall_total_leads)}
          trend={`${days} days • ${view}`}
          color="blue"
        />
        <StatCard
          icon={Layers}
          title="Active Sources"
          value={num(total_sources)}
          trend="Unique sources"
          color="purple"
        />
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className={cx(
            "group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-white",
            "border border-gray-200 px-6 py-4 shadow-sm transition-all duration-300",
            "hover:shadow-md hover:border-gray-300 active:scale-[0.98]",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <div className="relative z-10 flex items-center justify-center gap-2 text-gray-700">
            <RefreshCcw className={cx("w-5 h-5", refreshing && "animate-spin")} />
            <span className="font-medium">{refreshing ? "Refreshing..." : "Refresh"}</span>
          </div>
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <Th className="w-12 sm:w-16"></Th>
                <Th className="w-12 sm:w-16">#</Th>
                <Th>Source</Th>

                {/* NEW: centered Pending column header */}
                <Th className="text-center w-40">Pending Leads</Th>

                <Th className="text-right">Leads</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sources.map((s, idx) => {
                const key = s.source_id ?? `s${idx}`;
                const isOpen = open.has(key);

                // ---- Compute Pending & filtered breakdown (exclude "No Response") ----
                const breakdown = Array.isArray(s.response_breakdown) ? s.response_breakdown : [];
                const noRespItem = breakdown.find((r) => isNoResponse(r?.response_name));
                const nonNoResp = breakdown.filter((r) => !isNoResponse(r?.response_name));

                const respondedExclNoResp = nonNoResp.reduce(
                  (acc, r) => acc + Number(r?.total_leads || 0),
                  0
                );

                const pending = noRespItem
                  ? Number(noRespItem.total_leads || 0)
                  : Math.max(0, Number(s.total_leads || 0) - respondedExclNoResp);

                const responseCards = nonNoResp;

                return (
                  <Fragment key={key}>
                    {/* Main Row */}
                    <tr
                      className={cx(
                        "group cursor-pointer transition-all duration-200",
                        "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30",
                        isOpen && "bg-gradient-to-r from-blue-50/30 to-purple-50/20"
                      )}
                      onClick={() => toggle(key)}
                    >
                      <td className="p-3">
                        <div
                          className={cx(
                            "w-8 h-8 rounded-lg grid place-items-center transition-all",
                            "bg-gradient-to-br from-blue-500 to-purple-500 text-white",
                            "group-hover:scale-110"
                          )}
                        >
                          <ChevronDown
                            className={cx(
                              "w-4 h-4 transition-transform duration-300",
                              isOpen && "rotate-180"
                            )}
                          />
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-bold text-gray-400">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="p-3">
                        <div className="font-semibold text-gray-900">{s.source_name}</div>
                        {s.source_id && (
                          <div className="text-xs text-gray-500 mt-0.5">ID: {s.source_id}</div>
                        )}
                      </td>

                      {/* NEW: centered Pending column */}
                      <td className="p-3 text-center">
                        {pending > 0 ? (
                          <span
                            className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"
                            title={`${num(pending)} pending leads (no response yet)`}
                          >
                            Pending
                            <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-bold">
                              {num(pending)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">0</span>
                        )}
                      </td>

                      {/* Total Leads */}
                      <td className="p-3 text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-sm font-bold text-gray-900">
                          {num(s.total_leads)}
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Details */}
                    {isOpen && (
                      <tr className="bg-gradient-to-br from-gray-50/50 to-white">
                        <td colSpan={5} className="p-4">{/* was 4; now 5 because of new column */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Response Distribution
                            </h4>
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                              {responseCards.length ? (
                                responseCards.map((r, i) => <ResponseCard key={i} data={r} />)
                              ) : (
                                <div className="col-span-full text-center py-4 text-gray-400">
                                  No response data available
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {!sources.length && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    {/* was 4; now 5 because of new column */}
                    No sources found in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* Components */
const Fragment = ({ children }) => <>{children}</>;

function StatCard({ icon: Icon, title, value, trend, color }) {
  const gradients = {
    blue: "from-blue-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="relative z-10">
        <div className={cx("inline-flex p-2 rounded-xl bg-gradient-to-br text-white mb-3", gradients[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{trend}</div>
      </div>
      <div
        className={cx(
          "absolute -right-4 -top-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform",
          "bg-gradient-to-br rounded-full",
          gradients[color]
        )}
      />
    </div>
  );
}

function ResponseCard({ data }) {
  const pct = Math.min(100, Number(data?.percentage || 0));

  return (
    <div className="relative overflow-hidden rounded-xl bg-white border border-gray-200 p-3 hover:shadow-md transition-all duration-200">
      <div className="relative z-10">
        <div className="font-semibold text-gray-900 text-sm truncate">{data.response_name}</div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-xs text-gray-500">{data.total_leads} leads</span>
          <span className="text-xs font-bold text-gray-700">{pct}%</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const Th = ({ children, className = "" }) => (
  <th className={cx("px-3 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600", className)}>
    {children}
  </th>
);

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
      <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <p className="text-gray-600 font-medium">No analytics data available</p>
      <p className="text-gray-400 text-sm mt-1">Data will appear once sources are tracked</p>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-6 p-4 animate-pulse">
      <div className="grid lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-gray-100 h-28" />
        ))}
      </div>
      <div className="rounded-2xl bg-gray-100 h-96" />
    </div>
  );
}
