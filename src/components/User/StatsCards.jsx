// components/StatsCards.jsx
"use client";

import { Users, CheckCircle2, Building2, Shield } from "lucide-react";
import React from "react";

export default function StatsCards({
  totalUsers = 0,
  activeUsers = 0,
  rolesCount = 0,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
      <Card
        title="Total Users"
        value={totalUsers}
        icon={<Users className="w-6 h-6" />}
        iconColorVar="--theme-primary"
      />
      <Card
        title="Active Users"
        value={activeUsers}
        icon={<CheckCircle2 className="w-6 h-6" />}
        iconColorVar="--theme-success"
      />
      <Card
        title="Roles"
        value={rolesCount}
        icon={<Shield className="w-6 h-6" />}
        iconColorVar="--theme-warning"
      />
    </div>
  );
}

function Card({ title, value, icon, iconColorVar = "--theme-primary" }) {
  // clone the passed icon element so we can apply theme color without changing API
  const themedIcon = React.cloneElement(icon, {
    style: { color: `var(${iconColorVar}, #2563eb)` }, // fallback to blue if var missing
  });

  return (
    <div
      className="rounded-2xl shadow-lg p-6 border flex justify-between"
      style={{
        background: "var(--theme-card-bg, #ffffff)",
        borderColor: "var(--theme-border, #e5e7eb)",
        color: "var(--theme-text, #0f172a)",
      }}
    >
      <div>
        <p
          className="text-sm"
          style={{ color: "var(--theme-text-muted, #64748b)" }}
        >
          {title}
        </p>
        <p className="text-3xl font-bold">{value}</p>
      </div>

      <div
        className="p-3 rounded-full"
        style={{
          background:
            "var(--theme-muted-surface, color-mix(in oklab, var(--theme-text, #0f172a) 6%, transparent))",
        }}
      >
        {themedIcon}
      </div>
    </div>
  );
}
