"use client";

import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import { ChevronDown, ChevronUp, Save, RefreshCcw, ImageIcon, UploadCloud } from "lucide-react";

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

/* ---------- Company mappers (API <-> UI) ---------- */
const companyKeyMap = [
  ["COMPANY_NAME", "name"],
  ["COMPANY_MAIL", "mail"],
  ["COMPANY_NUMBER", "number"],
  ["COMPANY_ADDRESS", "address"],
  ["COMPANY_ADDRESS_BREAK", "address_break"],
  ["COMPANY_DISTRICT", "district"],
  ["COMPANY_SORT_ADDRESS", "sort_address"],
  ["COMPANY_STARTUP_INDIA_REG", "startup_india_reg"],
  ["COMPANY_CIN_NO", "cin_no"],
  ["COMPANY_REGISTRATION_NO", "registration_no"],
  ["COMPANY_WEBSITE_URL", "website_url"],
  ["COMPANY_WEBSITE_URL_DISCLOSURE", "website_url_disclosure"],
  ["COMPANY_GSTIN", "gstin"],
  ["COMPANY_CUSTOMER_NUMBER", "customer_number"],
  ["COMPANY_CUSTOMER_NAME", "customer_name"],
  ["COMPANY_CUSTOMER_MAIL", "customer_mail"],
  ["COMPANY_COMPLIANCE_OFFICER_NUMBER", "compliance_officer_number"],
  ["COMPANY_COMPLIANCE_OFFICER_NAME", "compliance_officer_name"],
  ["COMPANY_COMPLIANCE_OFFICER_MAIL", "compliance_officer_mail"],
  ["COMPANY_PRINCIPAL_OFFICER_NUMBER", "principal_officer_number"],
  ["COMPANY_PRINCIPAL_OFFICER_NAME", "principal_officer_name"],
  ["COMPANY_PRINCIPAL_OFFICER_MAIL", "principal_officer_mail"],
];

function companyFromApi(apiObj = {}) {
  const out = {};
  companyKeyMap.forEach(([legacy, clean]) => {
    out[legacy] = apiObj[legacy] ?? apiObj[clean] ?? "";
  });
  if (apiObj.id != null) out.id = apiObj.id;
  return out;
}

function companyToApi(uiObj = {}) {
  const out = {};
  companyKeyMap.forEach(([legacy, clean]) => {
    out[clean] = uiObj[legacy] ?? null;
  });
  if (uiObj.id != null) out.id = uiObj.id;
  return out;
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
  const [openLogo, setOpenLogo] = useState(true);

  const [logoFile, setLogoFile] = useState(null);
 const [logoPreview, setLogoPreview] = useState("");
 const [logoPath, setLogoPath] = useState("");      // last server path returned (e.g., "logo/crm.png")
 const [uploadingLogo, setUploadingLogo] = useState(false);
 const [replacingLogo, setReplacingLogo] = useState(false);

  const [company, setCompany] = useState(companyFromApi());

  const [smtp, setSmtp] = useState({
    COM_SMTP_SERVER: "",
    COM_SMTP_USER: "",
    COM_SMTP_PASSWORD: "",
    COM_SMTP_FROM: "",
    COM_SMTP_REPLY: "",
    COM_SMTP_PORT: 587,
    COM_SMTP_CC: "",
    COM_SMTP_BCC: "",
    id: undefined,
  });

  const [app, setApp] = useState({
    payment_limit: 178000,
  });

  function onPickLogo(e) {
   const file = e.target.files?.[0];
   if (!file) return;
   setLogoFile(file);
   const url = URL.createObjectURL(file);
   setLogoPreview((old) => {
     if (old) URL.revokeObjectURL(old);
     return url;
   });
 }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Company
      const c = await axiosInstance.get("/settings/company", { headers });
      if (c?.data) setCompany(companyFromApi(c.data));

      // SMTP
      const s = await axiosInstance.get("/settings/smtp", { headers });
      if (s?.data) {
        setSmtp({
          COM_SMTP_SERVER: s.data.server ?? "",
          COM_SMTP_USER: s.data.user ?? "",
          COM_SMTP_PASSWORD: s.data.password ?? "",
          // map API -> UI
          COM_SMTP_FROM: s.data.from_email ?? s.data.from ?? "",
          COM_SMTP_REPLY: s.data.reply_to ?? s.data.reply ?? "",
          COM_SMTP_PORT: s.data.port ?? 587,
          COM_SMTP_CC: s.data.cc ?? "",
          COM_SMTP_BCC: s.data.bcc ?? "",
          id: s.data.id,
        });
      }

      // App
      const a = await axiosInstance.get("/settings/app/payment-limit", {
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
      const payload = companyToApi(company);
      await axiosInstance.put("/settings/company", payload, { headers });
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
      // API accepts `from` & `reply` (server normalizes to from_email/reply_to)
      const payload = {
        id: smtp.id,
        server: smtp.COM_SMTP_SERVER || null,
        user: smtp.COM_SMTP_USER || null,
        password: smtp.COM_SMTP_PASSWORD || null,
        from: smtp.COM_SMTP_FROM || null,
        reply: smtp.COM_SMTP_REPLY || null,
        port: Number(smtp.COM_SMTP_PORT) || 587,
        cc: smtp.COM_SMTP_CC || null,
        bcc: smtp.COM_SMTP_BCC || null,
      };
      await axiosInstance.put("/settings/smtp", payload, { headers });
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
        "/settings/app/payment-limit",
        { payment_limit: Number(app.payment_limit) },
        { headers }
      );
      alert("App settings saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save app settings.");
    } finally {
      setSavingApp(false);
    }
  };

// ----- Logo upload/replace -----
 const uploadLogo = async () => {
   if (!logoFile) return alert("Please select a logo file first.");
   setUploadingLogo(true);
   try {
     const fd = new FormData();
     fd.append("file", logoFile, logoFile.name);
     // NOTE: don't set Content-Type — browser will set correct multipart boundary
     const res = await axiosInstance.post("/settings/logo", fd, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
     setLogoPath(res?.data?.path || "");
     alert("Logo uploaded successfully.");
   } catch (err) {
     console.error(err);
     alert("Failed to upload logo.");
   } finally {
     setUploadingLogo(false);
   }
 };

 const replaceLogo = async () => {
   if (!logoFile) return alert("Please select a logo file first.");
   setReplacingLogo(true);
   try {
     const fd = new FormData();
     fd.append("file", logoFile, logoFile.name);
     const res = await axiosInstance.put("/settings/logo", fd, { headers: {
    "Content-Type": "multipart/form-data",
  },});
     setLogoPath(res?.data?.path || "");
     alert("Logo replaced successfully.");
   } catch (err) {
     console.error(err);
     alert("Failed to replace logo.");
   } finally {
     setReplacingLogo(false);
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
          <Input label="Company Name" value={company.COMPANY_NAME} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_NAME: v }))} />
          <Input label="Company Email" value={company.COMPANY_MAIL} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_MAIL: v }))} />
          <Input label="Company Number" value={company.COMPANY_NUMBER} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_NUMBER: v }))} />
          <Input label="Website URL" value={company.COMPANY_WEBSITE_URL || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_WEBSITE_URL: v }))} />
          <Input label="Disclosure URL" value={company.COMPANY_WEBSITE_URL_DISCLOSURE || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_WEBSITE_URL_DISCLOSURE: v }))} />
          <Input label="GSTIN" value={company.COMPANY_GSTIN || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_GSTIN: v }))} />
          <Input label="CIN No" value={company.COMPANY_CIN_NO || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_CIN_NO: v }))} />
          <Input label="Registration No" value={company.COMPANY_REGISTRATION_NO || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_REGISTRATION_NO: v }))} />
          <Input label="Startup India Reg" value={company.COMPANY_STARTUP_INDIA_REG || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_STARTUP_INDIA_REG: v }))} />
          <Input label="District" value={company.COMPANY_DISTRICT || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_DISTRICT: v }))} />
          <Input label="Sort Address" value={company.COMPANY_SORT_ADDRESS || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_SORT_ADDRESS: v }))} />
          <Input label="Customer Name" value={company.COMPANY_CUSTOMER_NAME || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_CUSTOMER_NAME: v }))} />
          <Input label="Customer Email" value={company.COMPANY_CUSTOMER_MAIL || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_CUSTOMER_MAIL: v }))} />
          <Input label="Customer Number" value={company.COMPANY_CUSTOMER_NUMBER || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_CUSTOMER_NUMBER: v }))} />

          <Textarea label="Address" value={company.COMPANY_ADDRESS || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_ADDRESS: v }))} />
          <Textarea label="Address (Break)" value={company.COMPANY_ADDRESS_BREAK || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_ADDRESS_BREAK: v }))} />

          <Input label="Compliance Officer Name" value={company.COMPANY_COMPLIANCE_OFFICER_NAME || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_NAME: v }))} />
          <Input label="Compliance Officer Mail" value={company.COMPANY_COMPLIANCE_OFFICER_MAIL || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_MAIL: v }))} />
          <Input label="Compliance Officer Number" value={company.COMPANY_COMPLIANCE_OFFICER_NUMBER || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_COMPLIANCE_OFFICER_NUMBER: v }))} />

          <Input label="Principal Officer Name" value={company.COMPANY_PRINCIPAL_OFFICER_NAME || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_NAME: v }))} />
          <Input label="Principal Officer Mail" value={company.COMPANY_PRINCIPAL_OFFICER_MAIL || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_MAIL: v }))} />
          <Input label="Principal Officer Number" value={company.COMPANY_PRINCIPAL_OFFICER_NUMBER || ""} onChange={(v) => setCompany((s) => ({ ...s, COMPANY_PRINCIPAL_OFFICER_NUMBER: v }))} />
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={saveCompany} disabled={savingCompany} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60">
            <Save className="w-4 h-4" />
            {savingCompany ? "Saving..." : "Save Company"}
          </button>
        </div>
      </Section>

{/* Branding — Logo */}
      <Section
        title="Branding — Logo"
        open={openLogo}
        onToggle={() => setOpenLogo((v) => !v)}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <label className="block md:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Select Logo (PNG/JPG/SVG)</div>
            <input
              type="file"
              accept="image/*"
              onChange={onPickLogo}
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-black/10"
            />
            <p className="text-xs text-gray-500 mt-2">
              Recommended: square image, reasonable size (&lt; 1 MB).
            </p>
          </label>

          <div className="border rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="w-40 h-40 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center">
              {logoPreview ? (
                // local preview
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              ) : logoPath ? (
                // NOTE: If your static files serve from site root, this will work.
                // Otherwise, show as a link or adjust to your static path.
                <img src={`/${logoPath}?v=${Date.now()}`} alt="Current logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <span className="text-xs text-gray-400">No preview</span>
              )}
            </div>
            {logoPath && (
              <div className="text-xs text-gray-500 mt-2 break-all">
                Stored at: <code>{logoPath}</code>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={uploadLogo}
            disabled={uploadingLogo || !logoFile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60"
          >
            <UploadCloud className="w-4 h-4" />
            {uploadingLogo ? "Uploading..." : "Upload (POST)"}
          </button>
          <button
            onClick={replaceLogo}
            disabled={replacingLogo || !logoFile}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCcw className="w-4 h-4" />
            {replacingLogo ? "Replacing..." : "Replace (PUT)"}
          </button>
        </div>
</Section>

      {/* SMTP */}
      <Section title="SMTP Settings" open={openSMTP} onToggle={() => setOpenSMTP((v) => !v)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Server" value={smtp.COM_SMTP_SERVER || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_SERVER: v }))} />
          <Input label="User" value={smtp.COM_SMTP_USER || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_USER: v }))} />
          <Input label="Password" type="password" value={smtp.COM_SMTP_PASSWORD || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_PASSWORD: v }))} />
          <Input label="From Email" value={smtp.COM_SMTP_FROM || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_FROM: v }))} />
          <Input label="Reply-To" value={smtp.COM_SMTP_REPLY || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_REPLY: v }))} />
          <Input label="Port" type="number" value={smtp.COM_SMTP_PORT ?? 587} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_PORT: Number(v) || 587 }))} />
          <Input label="CC" value={smtp.COM_SMTP_CC || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_CC: v }))} />
          <Input label="BCC" value={smtp.COM_SMTP_BCC || ""} onChange={(v) => setSmtp((s) => ({ ...s, COM_SMTP_BCC: v }))} />
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={saveSMTP} disabled={savingSMTP} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60">
            <Save className="w-4 h-4" />
            {savingSMTP ? "Saving..." : "Save SMTP"}
          </button>
        </div>
      </Section>

      {/* App Settings */}
      <Section title="App Settings" open={openApp} onToggle={() => setOpenApp((v) => !v)}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Payment Limit (₹)" type="number" value={app.payment_limit} onChange={(v) => setApp((s) => ({ ...s, payment_limit: Number(v) || 0 }))} />
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={saveApp} disabled={savingApp} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white disabled:opacity-60">
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
