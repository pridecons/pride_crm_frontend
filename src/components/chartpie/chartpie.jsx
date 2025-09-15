
"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Example API fetch
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <Card title="Total Leads" value={data.cards.leads.total_uploaded} />
    </div>
  );
}
