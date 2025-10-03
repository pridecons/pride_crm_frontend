"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Users, Target, TrendingUp, PieChart } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { useTheme } from "@/context/ThemeContext";

function AnalyticsDashboard() {
  const { themeConfig } = useTheme();
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await axiosInstance.get("/recommendations/analytics/summary");
      setAnalyticsData(res.data);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Themed tones for Status badge chips
  const getStatusTone = (status) => {
    const map = {
      TARGET1_HIT: {
        bg: "var(--theme-success-soft, rgba(16,185,129,0.12))",
        text: "var(--theme-success, #059669)",
        border: "var(--theme-border)",
      },
      TARGET2_HIT: {
        bg: "var(--theme-success-soft, rgba(16,185,129,0.12))",
        text: "var(--theme-success, #059669)",
        border: "var(--theme-border)",
      },
      TARGET3_HIT: {
        bg: "var(--theme-success-soft, rgba(16,185,129,0.12))",
        text: "var(--theme-success, #059669)",
        border: "var(--theme-border)",
      },
      OPEN: {
        bg: "var(--theme-primary-softer, rgba(59,130,246,0.12))",
        text: "var(--theme-primary, #2563eb)",
        border: "var(--theme-border)",
      },
      STOP_LOSS_HIT: {
        bg: "var(--theme-danger-soft, rgba(239,68,68,0.12))",
        text: "var(--theme-danger, #dc2626)",
        border: "var(--theme-border)",
      },
      CLOSED: {
        bg: "var(--theme-surface)",
        text: "var(--theme-text)",
        border: "var(--theme-border)",
      },
    };
    return map[status] ?? { bg: "var(--theme-surface)", text: "var(--theme-text)", border: "var(--theme-border)" };
  };

  // Themed tones for type chips (stable hash → pick from palette)
  const typePalette = [
    { bg: "var(--theme-accent-soft, rgba(147,51,234,0.12))", text: "var(--theme-accent, var(--theme-primary))" },
    { bg: "var(--theme-primary-softer, rgba(59,130,246,0.12))", text: "var(--theme-primary)" },
    { bg: "var(--theme-info-soft, rgba(14,165,233,0.12))", text: "var(--theme-info, #0ea5e9)" },
    { bg: "var(--theme-warning-soft, rgba(245,158,11,0.12))", text: "var(--theme-warning, #d97706)" },
    { bg: "var(--theme-success-soft, rgba(16,185,129,0.12))", text: "var(--theme-success, #059669)" },
  ];
  const getTypeTone = (type) => {
    const hash = String(type || "")
      .split("")
      .reduce((a, c) => a + c.charCodeAt(0), 0);
    return typePalette[hash % typePalette.length];
  };

  if (!analyticsData) {
    return (
      <div className="p-6" style={{ color: "var(--theme-text-muted)" }}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-6"
      style={{ background: "var(--theme-background)", color: "var(--theme-text)" }}
    >
      <div className="mx-2">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Recommendations"
            value={analyticsData.total_recommendations}
            icon={<BarChart3 className="w-6 h-6" />}
            iconTone={{
              bg: "var(--theme-primary-softer)",
              icon: "var(--theme-primary)",
            }}
          />
          <MetricCard
            title="Active Users"
            value={analyticsData.active_users}
            icon={<Users className="w-6 h-6" />}
            iconTone={{
              bg: "var(--theme-accent-soft, var(--theme-primary-softer))",
              icon: "var(--theme-accent, var(--theme-primary))",
            }}
          />
          <MetricCard
            title="Success Rate"
            value={`${analyticsData.success_rate}%`}
            icon={<Target className="w-6 h-6" />}
            iconTone={{
              bg: "var(--theme-success-soft)",
              icon: "var(--theme-success)",
            }}
          />
          <MetricCard
            title="Performance"
            value="Excellent"
            icon={<TrendingUp className="w-6 h-6" />}
            iconTone={{
              bg: "var(--theme-info-soft, var(--theme-primary-softer))",
              icon: "var(--theme-info, var(--theme-primary))",
            }}
            valueColor="var(--theme-accent, var(--theme-primary))"
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionBlock
            icon={<PieChart className="w-5 h-5 mr-2" style={{ color: "var(--theme-text-muted)" }} />}
            title="Status Distribution"
            entries={analyticsData.status_distribution}
            total={analyticsData.total_recommendations}
            toneGetter={getStatusTone}
            barColor="var(--theme-primary)"
          />
          <DistributionBlock
            icon={<BarChart3 className="w-5 h-5 mr-2" style={{ color: "var(--theme-text-muted)" }} />}
            title="Recommendation Types"
            entries={analyticsData.recommendation_types}
            total={analyticsData.total_recommendations}
            toneGetter={getTypeTone}
            barColor="var(--theme-accent, var(--theme-primary))"
          />
        </div>

        {/* Insights */}
        <div
          className="mt-6 rounded-xl p-6 border"
          style={{
            background: "var(--theme-card-bg)",
            borderColor: "var(--theme-border)",
            boxShadow: `0 10px 25px ${themeConfig.shadow}`,
          }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--theme-text)" }}>
            Key Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsightCard
              title="Most Active Type"
              text={`BUY recommendations lead with ${analyticsData.recommendation_types.BUY} out of ${analyticsData.total_recommendations} total`}
            />
            <InsightCard
              title="Success Performance"
              text={`${analyticsData.status_distribution.TARGET1_HIT} recommendations hit their first target`}
            />
            <InsightCard
              title="Open Positions"
              text={`${analyticsData.status_distribution.OPEN} recommendations are still active`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;

/* -------------------------- Themed helpers -------------------------- */

const MetricCard = ({ title, value, icon, iconTone, valueColor }) => {
  return (
    <div
      className="rounded-xl p-6 border"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        boxShadow: "0 2px 10px var(--theme-shadow, transparent)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--theme-text-muted)" }}>
            {title}
          </p>
          <p className="text-3xl font-bold mt-2" style={{ color: valueColor || "var(--theme-text)" }}>
            {value}
          </p>
        </div>
        <div className="px-2">
          <div
            className="p-2 rounded"
            style={{ background: iconTone?.bg || "var(--theme-primary-softer)" }}
          >
            <div style={{ color: iconTone?.icon || "var(--theme-primary)" }}>{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DistributionBlock = ({ icon, title, entries, total, toneGetter, barColor }) => {
  return (
    <div
      className="rounded-xl p-6 border"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        boxShadow: "0 2px 10px var(--theme-shadow, transparent)",
      }}
    >
      <div className="flex items-center mb-6">
        {icon}
        <h2 className="text-lg font-semibold" style={{ color: "var(--theme-text)" }}>
          {title}
        </h2>
      </div>

      <div className="space-y-4">
        {Object.entries(entries).map(([key, count]) => {
          const percent = total ? ((count / total) * 100).toFixed(1) : "0.0";
          const tone = toneGetter(key);

          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    background: tone.bg,
                    color: tone.text,
                    borderColor: tone.border,
                  }}
                >
                  {String(key).replace(/_/g, " ")}
                </span>
                <span className="ml-3 text-sm" style={{ color: "var(--theme-text-muted)" }}>
                  {count} recommendations
                </span>
              </div>

              <div className="flex items-center">
                <div
                  className="w-20 rounded-full h-2 mr-3 overflow-hidden"
                  style={{ background: "var(--theme-border)" }}
                >
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%`, background: barColor || "var(--theme-primary)" }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-right" style={{ color: "var(--theme-text)" }}>
                  {percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InsightCard = ({ title, text }) => {
  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        background: "var(--theme-surface)",
        borderColor: "var(--theme-border)",
      }}
    >
      <h3 className="font-medium mb-2" style={{ color: "var(--theme-text)" }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: "var(--theme-text-muted)" }}>
        {text}
      </p>
    </div>
  );
};