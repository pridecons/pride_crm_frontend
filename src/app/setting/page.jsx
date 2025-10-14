"use client";

import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import { ChevronDown, ChevronUp, Save, RefreshCcw } from "lucide-react";

/* ---------- Helpers ---------- */
function useAuthHeaders() {
  const token = Cookies.get("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border rounded-xl p-4 mb-6 bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="text-lg font-semibold">{title}</span>
        {open ? <ChevronUp /> : <ChevronDown />}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

/* ---------- Component ---------- */
const Settings = () => {
  const headers = useAuthHeaders();

  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSMTP, setSavingSMTP] = useState(false);
  const [savingApp, setSavingApp] = useState(false);

  const [openCompany, setOpenCompany] = useState(true);
  const [openSMTP, setOpenSMTP] = useState(false);
  const [openApp, setOpenApp] = useState(false);

  const [company, setCompany] = useState({
    COMPANY_NAME: "",
    COMPANY_MAIL: "",
    COMPANY_NUMBER: "",
    COMPANY_ADDRESS: "",
    COMPANY_ADDRESS_BREAK: "",
    COMPANY_DISTRICT: "",
    COMPANY_SORT_ADDRESS: "",
    COMPANY_STARTUP_INDIA_REG: "",
    COMPANY_CIN_NO: "",
    COMPANY_REGISTRATION_NO: "",
    COMPANY_WEBSITE_URL: "",
    COMPANY_WEBSITE_URL_DISCLOSURE: "",
    COMPANY_GSTIN: "",
    COMPANY_CUSTOMER_NUMBER: "",
    COMPANY_CUSTOMER_NAME: "",
    COMPANY_CUSTOMER_MAIL: "",
    COMPANY_COMPLIANCE_OFFICER_NUMBER: "",
    COMPANY_COMPLIANCE_OFFICER_NAME: "",
    COMPANY_COMPLIANCE_OFFICER_MAIL: "",
    COMPANY_PRINCIPAL_OFFICER_NUMBER: "",
    COMPANY_PRINCIPAL_OFFICER_NAME: "",
    COMPANY_PRINCIPAL_OFFICER_MAIL: "",
  });

  const [smtp, setSmtp] = useState({
    COM_SMTP_SERVER: "",
    COM_SMTP_USER: "",
    COM_SMTP_PASSWORD: "",
    COM_SMTP_FROM: "",
    COM_SMTP_REPLY: "",
    COM_SMTP_PORT: 587,
    COM_SMTP_CC: "",
    COM_SMTP_BCC: "",
  });

  const [app, setApp] = useState({
    payment_limit: 178000,
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const c = await axiosInstance.get("/settings/company", { headers });
      if (c?.data) setCompany(c.data);

      const s = await axiosInstance.get("/settings/smtp", { headers });
      if (s?.data) setSmtp(s.data);

      const a = await axiosInstance.get("/settings/app/payment_limit", {
        headers,
      });
      if (a?.data && typeof a.data.payment_limit !== "undefined") {
        setApp({ payment_limit: Number(a.data.payment_limit) });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAll();
  }, []);

  // ----- Save handlers -----
  const saveCompany = async () => {
    setSavingCompany(true);
    try {
      await axiosInstance.put("/settings/company", company, { headers });
      await axiosInstance.post("/settings/reload", null, { headers }).catch(
        () => {}
      );
      alert("Company profile saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save company profile.");
    } finally {
      setSavingCompany(false);
    }
  };

  const saveSMTP = async () => {
    setSavingSMTP(true);
    try {
      await axiosInstance.put("/settings/smtp", smtp, { headers });
      await axiosInstance.post("/settings/reload", null, { headers }).catch(
        () => {}
      );
      alert("SMTP config saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save SMTP config.");
    } finally {
      setSavingSMTP(false);
    }
  };

  const saveApp = async () => {
    setSavingApp(true);
    try {
      await axiosInstance.put(
        "/settings/app/payment_limit",
        { payment_limit: Number(app.payment_limit) },
        { headers }
      );
      await axiosInstance.post("/settings/reload", null, { headers }).catch(
        () => {}
      );
      alert("App settings saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save app settings.");
    } finally {
      setSavingApp(false);
    }
  };

  if (loading) return <LoadingState label="Loading settings..." />;

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <button
          onClick={fetchAll}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50"
          title="Reload from server"
        >
          <RefreshCcw className="w-4 h-4" />
          Reload
        </button>
      </div>

      {/* Company Profile */}
      <Section
        title="Company Profile"
        open={openCompany}
        onToggle={() => setOpenCompany((v) => !v)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            value={company.COMPANY_NAME}
            onChange={(v) => setCompany((s) => ({ ...s, COMPANY_NAME: v }))}
          />
          <Input
            label="Company Email"
            value={company.COMPANY_MAIL}
            onChange={(v) => setCompany((s) => ({ ...s, COMPANY_MAIL: v }))}
          />
          <Input
            label="Company Number"
            value={company.COMPANY_NUMBER}
            onChange={(v) => setCompany((s) => ({ ...s, COMPANY_NUMBER: v }))}
          />
          <Input
            label="Website URL"
            value={company.COMPANY_WEBSITE_URL || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_WEBSITE_URL: v }))
            }
          />
          <Input
            label="Disclosure URL"
            value={company.COMPANY_WEBSITE_URL_DISCLOSURE || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_WEBSITE_URL_DISCLOSURE: v }))
            }
          />
          <Input
            label="GSTIN"
            value={company.COMPANY_GSTIN || ""}
            onChange={(v) => setCompany((s) => ({ ...s, COMPANY_GSTIN: v }))}
          />
          <Input
            label="CIN No"
            value={company.COMPANY_CIN_NO || ""}
            onChange={(v) => setCompany((s) => ({ ...s, COMPANY_CIN_NO: v }))}
          />
          <Input
            label="Registration No"
            value={company.COMPANY_REGISTRATION_NO || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_REGISTRATION_NO: v }))
            }
          />
          <Input
            label="Startup India Reg"
            value={company.COMPANY_STARTUP_INDIA_REG || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_STARTUP_INDIA_REG: v }))
            }
          />
          <Input
            label="District"
            value={company.COMPANY_DISTRICT || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_DISTRICT: v }))
            }
          />
          <Input
            label="Sort Address"
            value={company.COMPANY_SORT_ADDRESS || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_SORT_ADDRESS: v }))
            }
          />
          <Input
            label="Customer Name"
            value={company.COMPANY_CUSTOMER_NAME || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_CUSTOMER_NAME: v }))
            }
          />
          <Input
            label="Customer Email"
            value={company.COMPANY_CUSTOMER_MAIL || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_CUSTOMER_MAIL: v }))
            }
          />
          <Input
            label="Customer Number"
            value={company.COMPANY_CUSTOMER_NUMBER || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_CUSTOMER_NUMBER: v }))
            }
          />

          <Textarea
            label="Address"
            value={company.COMPANY_ADDRESS || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_ADDRESS: v }))
            }
          />
          <Textarea
            label="Address (Break)"
            value={company.COMPANY_ADDRESS_BREAK || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_ADDRESS_BREAK: v }))
            }
          />

          <Input
            label="Compliance Officer Name"
            value={company.COMPANY_COMPLIANCE_OFFICER_NAME || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_NAME: v }))
            }
          />
          <Input
            label="Compliance Officer Mail"
            value={company.COMPANY_COMPLIANCE_OFFICER_MAIL || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_MAIL: v }))
            }
          />
          <Input
            label="Compliance Officer Number"
            value={company.COMPANY_COMPLIANCE_OFFICER_NUMBER || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_NUMBER: v }))
            }
          />

          <Input
            label="Principal Officer Name"
            value={company.COMPANY_PRINCIPAL_OFFICER_NAME || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_NAME: v }))
            }
          />
          <Input
            label="Principal Officer Mail"
            value={company.COMPANY_PRINCIPAL_OFFICER_MAIL || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_MAIL: v }))
            }
          />
          <Input
            label="Principal Officer Number"
            value={company.COMPANY_PRINCIPAL_OFFICER_NUMBER || ""}
            onChange={(v) =>
              setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_NUMBER: v }))
            }
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={saveCompany}
            disabled={savingCompany}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {savingCompany ? "Saving..." : "Save Company"}
          </button>
        </div>
      </Section>

      {/* SMTP */}
      <Section
        title="SMTP Settings"
        open={openSMTP}
        onToggle={() => setOpenSMTP((v) => !v)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Server"
            value={smtp.COM_SMTP_SERVER || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_SERVER: v }))}
          />
          <Input
            label="User"
            value={smtp.COM_SMTP_USER || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_USER: v }))}
          />
          <Input
            label="Password"
            type="password"
            value={smtp.COM_SMTP_PASSWORD || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_PASSWORD: v }))}
          />
          <Input
            label="From Email"
            value={smtp.COM_SMTP_FROM || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_FROM: v }))}
          />
          <Input
            label="Reply-To"
            value={smtp.COM_SMTP_REPLY || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_REPLY: v }))}
          />
          <Input
            label="Port"
            type="number"
            value={smtp.COM_SMTP_PORT ?? 587}
            onChange={(v) =>
              setSmtp((s) => ({
                ...s,
                COM_SMTP_PORT: Number(v) || 587,
              }))
            }
          />
          <Input
            label="CC"
            value={smtp.COM_SMTP_CC || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_CC: v }))}
          />
          <Input
            label="BCC"
            value={smtp.COM_SMTP_BCC || ""}
            onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_BCC: v }))}
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={saveSMTP}
            disabled={savingSMTP}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {savingSMTP ? "Saving..." : "Save SMTP"}
          </button>
        </div>
      </Section>

      {/* App Settings */}
      <Section
        title="App Settings"
        open={openApp}
        onToggle={() => setOpenApp((v) => !v)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Limit (₹)"
            type="number"
            value={app.payment_limit}
            onChange={(v) =>
              setApp((s) => ({ ...s, payment_limit: Number(v) || 0 }))
            }
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={saveApp}
            disabled={savingApp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {savingApp ? "Saving..." : "Save App Settings"}
          </button>
        </div>
      </Section>
    </div>
  );
};

export default Settings;

/* ---------- Small UI bits ---------- */
function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="block md:col-span-2">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border px-3 py-2 h-24 outline-none focus:ring-2 focus:ring-black/10"
      />
    </label>
  );
}

