"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Cookies from "js-cookie";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import StoryModal from "@/components/Lead/StoryModal";
import CommentModal from "@/components/Lead/CommentModal";
import InvoiceList from "@/components/Lead/InvoiceList";
import {
  Eye, FileText, BookOpenText, MessageCircle,
  ChevronDown, ChevronUp,
  MoreVertical,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/context/PermissionsContext";

/* ===== Helpers: roles & user meta ===== */
const normalizeRoleKey = (r) => {
  const key = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "SUPER_ADMINISTRATOR") return "SUPERADMIN";
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  return key;
};
const ROLE_CACHE_KEY = "role_map_v1";
const ROLE_CACHE_TTL = 24 * 60 * 60 * 1000;

const toDisplayRole = (raw) => {
  const key = normalizeRoleKey(raw);
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
  if (key === "COMPLIANCE_OFFICER") return "COMPLIANCE OFFICER";
  return key;
};

const getUserMeta = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return { role: "", branch_id: null };
    const p = JSON.parse(raw);
    const rawRole = p?.role || p?.role_name || p?.user?.role || p?.user?.role_name || "";
    const role = normalizeRoleKey(rawRole);
    const branch_id = p?.branch_id ?? p?.user?.branch_id ?? p?.branch?.id ?? null;
    return { role, branch_id };
  } catch {
    return { role: "", branch_id: null };
  }
};

/* ===== Data transforms ===== */
const parseServices = (client) => {
  const out = new Set();
  if (Array.isArray(client?.all_payments)) {
    for (const p of client.all_payments) {
      if (Array.isArray(p?.plan) && Array.isArray(p.plan[0]?.service_type)) {
        for (const s of p.plan[0].service_type) if (s) out.add(String(s).trim());
      }
    }
    for (const p of client.all_payments) {
      if (Array.isArray(p?.service)) {
        for (const item of p.service) {
          String(item)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((s) => out.add(s));
        }
      }
    }
  }
  if (out.size === 0 && typeof client?.segment === "string") {
    try {
      const arr = JSON.parse(client.segment);
      if (Array.isArray(arr)) for (const s of arr) if (s) out.add(String(s).trim());
    } catch {}
  }
  return Array.from(out);
};

const lastPaymentISO = (client) => {
  if (!Array.isArray(client?.all_payments) || client.all_payments.length === 0) return null;
  let latest = null;
  for (const p of client.all_payments) {
    if (!p?.created_at) continue;
    if (!latest || new Date(p.created_at) > new Date(latest)) latest = p.created_at;
  }
  return latest;
};

const uniqueGstTypes = (client) => {
  const set = new Set();
  if (Array.isArray(client?.all_payments)) {
    for (const p of client.all_payments) if (p?.gst_type) set.add(String(p.gst_type));
  }
  return Array.from(set);
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const buildRange = (from, to) => {
  const start = from ? new Date(`${from}T00:00:00`) : null;
  const end = to ? new Date(`${to}T23:59:59.999`) : null;
  return { start, end };
};

const pickWhen = (c) => c?.created_at || lastPaymentISO(c) || null;

const isIsoInRange = (iso, start, end) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

/* ===== Page component ===== */
export default function ClientsPage() {
  const { hasPermission } = usePermissions();
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [myClients, setMyClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("card");      // "card" | "table"
  const [myView, setMyView] = useState("self");  // "self" | "other"

  // modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyLead, setStoryLead] = useState(null);

  const [openPayments, setOpenPayments] = useState({});
  const [openServices, setOpenServices] = useState({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const router = useRouter();
  const [roleMap, setRoleMap] = useState({});

  const isSuperAdmin = role === "SUPERADMIN";
  const isBranchManager = role === "BRANCH MANAGER";
  const showBranchColumn = isSuperAdmin;

  const roleFromId = useCallback((id) => {
    const k = String(id ?? "");
    return roleMap[k] || k;
  }, [roleMap]);

  /* ---- bootstrap ---- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      if (raw) {
        const { ts, map } = JSON.parse(raw);
        if (Date.now() - ts < ROLE_CACHE_TTL && map && typeof map === "object") {
          setRoleMap(map);
        }
      }
    } catch {}

    (async () => {
      try {
        const res = await axiosInstance.get("/profile-role/?skip=0&limit=200&order_by=hierarchy_level");
        const arr = Array.isArray(res.data) ? res.data : [];
        const map = {};
        for (const r of arr) {
          if (!r || r.id == null) continue;
          map[String(r.id)] = toDisplayRole(r.name);
        }
        setRoleMap(map);
        try {
          localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ ts: Date.now(), map }));
        } catch {}
      } catch (err) {
        console.error("Failed to load role map:", err);
      }
    })();

    const { role: r, branch_id: b } = getUserMeta();
    setRole(r);
    setBranchId(b ?? null);

    if (r === "SUPERADMIN") {
      fetchBranches();
      fetchClients(null);
    } else if (r === "BRANCH MANAGER") {
      fetchClients(b);
    } else {
      fetchMyClients("self");
      setMyView("self");
    }
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await axiosInstance.get("/branches/?skip=0&limit=100&active_only=false");
      setBranches(res.data || []);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  };

  const fetchClients = async (branch = null) => {
    try {
      setLoading(true);
      const effectiveBranch = isSuperAdmin ? branch : (branchId ?? null);
      const qs = new URLSearchParams({ page: "1", limit: "100", view: "all" });
      if (effectiveBranch) qs.append("branch_id", String(effectiveBranch));
      const res = await axiosInstance.get(`/clients/?${qs.toString()}`);
      const list = Array.isArray(res.data?.clients) ? res.data.clients : [];
      setClients(list);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClients = async (scope) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/clients/?page=1&limit=50&view=${scope}`);
      setMyClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
    } catch (err) {
      console.error("Error fetching my clients:", err);
      setMyClients([]);
    } finally {
      setLoading(false);
    }
  };

  const { start, end } = useMemo(() => buildRange(dateFrom, dateTo), [dateFrom, dateTo]);

  const filteredClients = useMemo(() => {
    if (!dateFrom && !dateTo) return clients;
    return clients.filter((c) => isIsoInRange(pickWhen(c), start, end));
  }, [clients, dateFrom, dateTo, start, end]);

  const filteredMyClients = useMemo(() => {
    if (!dateFrom && !dateTo) return myClients;
    return myClients.filter((c) => isIsoInRange(pickWhen(c), start, end));
  }, [myClients, dateFrom, dateTo, start, end]);

  /* ===== UI atoms ===== */
  const Badge = ({ children, tone = "info", title }) => {
    const tones = {
      info:   { bg: "rgba(59,130,246,.08)", text: "#2563eb", border: "rgba(59,130,246,.2)" },
      warn:   { bg: "rgba(251,191,36,.08)", text: "#a16207", border: "rgba(251,191,36,.2)" },
      ok:     { bg: "rgba(34,197,94,.08)",  text: "#166534", border: "rgba(34,197,94,.2)" },
      danger: { bg: "rgba(239,68,68,.08)",  text: "#b91c1c", border: "rgba(239,68,68,.2)" },
    };
    const t = tones[tone] || tones.info;
    return (
      <span
        title={title}
        className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all duration-200"
        style={{ background: t.bg, color: t.text, borderColor: t.border }}
      >
        {children}
      </span>
    );
  };

  const Money = ({ val }) => (
    <span className="font-bold" style={{ color: "#16a34a" }}>
      ₹{round2(val ?? 0).toLocaleString("en-IN")}
    </span>
  );

  const LV = ({ label, value, highlight = false }) => (
    <div className="grid grid-cols-[88px,1fr] sm:grid-cols-[110px,1fr] items-center gap-x-2 min-h-[28px]">
      <div className="text-[12px] font-medium text-[var(--theme-textSecondary)]">{label}:</div>
      <div className="min-w-0">
        <span
          title={value || "—"}
          className={`block truncate text-[13px] ${highlight ? "font-semibold" : ""}`}
          style={{ color: highlight ? "var(--theme-success)" : "var(--theme-text)" }}
        >
          {value || "—"}
        </span>
      </div>
    </div>
  );

  const PaymentList = ({ payments }) => {
    if (!Array.isArray(payments) || payments.length === 0) {
      return <div className="text-sm text-[var(--theme-textSecondary)] p-4">No payments available.</div>;
    }
    return (
      <div className="space-y-4">
        {payments.map((p) => (
          <div
            key={p.payment_id || p.order_id}
            className="rounded-xl border p-4 sm:p-5 hover:shadow-sm transition-all duration-200"
            style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="min-w-[180px]">
                <div className="font-semibold text-sm mb-1">
                  Payment #{p.payment_id} · <span className="uppercase">{p.status}</span>
                </div>
                <div className="text-[11px] text-[var(--theme-textSecondary)]">
                  {p.created_at
                    ? new Date(p.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—"}
                </div>
                {p.order_id && (
                  <div className="text-[11px] text-[var(--theme-textSecondary)] mt-0.5">Order: {p.order_id}</div>
                )}
              </div>
              <div className="text-right ml-auto">
                <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1">Paid Amount</div>
                <div className="text-lg"><Money val={p.paid_amount} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1.5">Mode</div>
                <Badge>{p.mode || "—"}</Badge>
              </div>
              <div>
                <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1.5">Billing</div>
                <Badge title="Billing Cycle">{p.billing_cycle || "—"}</Badge>
                {typeof p.call === "number" && (
                  <div className="text-[11px] text-[var(--theme-textSecondary)] mt-1">
                    Calls: {p.used_calls ?? 0}/{p.call ?? 0} (Rem: {p.remaining_calls ?? 0})
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1.5">Active</div>
                <Badge tone={p.is_active ? "ok" : "danger"}>{p.is_active ? "Yes" : "No"}</Badge>
              </div>
            </div>

            {Array.isArray(p.plan) && p.plan[0] && (
              <div className="mb-4">
                <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1.5">Plan</div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="ok">{p.plan[0].name || "Plan"}</Badge>
                  <span className="text-sm">Price: <Money val={p.plan[0].price} /></span>
                  {typeof p.plan[0].discount_percent === "number" && p.plan[0].discount_percent > 0 && (
                    <Badge tone="warn">Discount: {p.plan[0].discount_percent}%</Badge>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="text-[11px] text-[var(--theme-textSecondary)] mb-1.5">Services</div>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(p.plan) && Array.isArray(p.plan[0]?.service_type) && p.plan[0].service_type.length
                  ? p.plan[0].service_type.map((s, i) => (
                      <Badge key={i} title={s}>
                        <span className="max-w-[160px] truncate inline-block">{s}</span>
                      </Badge>
                    ))
                  : Array.isArray(p.service) && p.service.length
                  ? p.service.map((s, i) => (
                      <Badge key={i} title={String(s)}>
                        <span className="max-w-[160px] truncate inline-block">{String(s)}</span>
                      </Badge>
                    ))
                  : "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[var(--theme-border)]">
              <div>
                <div className="text-[10px] text-[var(--theme-textSecondary)]">GST Type</div>
                <Badge tone="info">{p.gst_type || "—"}</Badge>
              </div>
              <div>
                <div className="text-[10px] text-[var(--theme-textSecondary)]">CGST</div>
                <Money val={p.cgst} />
              </div>
              <div>
                <div className="text-[10px] text-[var(--theme-textSecondary)]">SGST</div>
                <Money val={p.sgst} />
              </div>
              <div>
                <div className="text-[10px] text-[var(--theme-textSecondary)]">IGST</div>
                <Money val={p.igst} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const ActionsDropdown = ({
  onView,
  onInvoices,
  onStory,
  onComments,
  canInvoices = true,
  canStory = true,
  canComments = true,
  label = "Actions",
}) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!open) return;
      const t = e.target;
      if (menuRef.current && !menuRef.current.contains(t) && btnRef.current && !btnRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const Item = ({ onClick, children, icon: Icon }) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => { setOpen(false); onClick?.(); }}
      className="w-full px-3 py-2 text-sm rounded-md flex items-center gap-2 hover:bg-[var(--theme-surface)]"
      style={{ color: "var(--theme-text)" }}
    >
      {Icon ? <Icon size={16} /> : null}
      <span className="truncate">{children}</span>
    </button>
  );

  const items = [
    { key: "view", label: "View", icon: Eye, onClick: onView, show: true },
    { key: "invoices", label: "Invoices", icon: FileText, onClick: onInvoices, show: !!canInvoices },
    { key: "story", label: "Story", icon: BookOpenText, onClick: onStory, show: !!canStory },
    { key: "comments", label: "Comments", icon: MessageCircle, onClick: onComments, show: !!canComments },
  ].filter(i => i.show);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        title={label}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md border"
        style={{
          background: "var(--theme-surface)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)"
        }}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 mt-2 w-44 z-50 rounded-xl border shadow-lg p-2"
          style={{
            background: "var(--theme-components-card-bg)",
            borderColor: "var(--theme-components-card-border)",
            boxShadow: "0 12px 24px rgba(0,0,0,.12)"
          }}
        >
          {items.length ? (
            items.map(i => (
              <Item key={i.key} onClick={i.onClick} icon={i.icon}>
                {i.label}
              </Item>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">No actions</div>
          )}
        </div>
      )}
    </div>
  );
};

const TagPill = ({ children }) => (
  <span
    className="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
    style={{
      background: "rgba(59,130,246,.06)",
      color: "#2563eb",
      borderColor: "rgba(59,130,246,.25)"
    }}
  >
    {children}
  </span>
);

const StatChip = ({ label, value, sub }) => (
  <div
    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-full border flex items-center justify-between gap-3"
    style={{
      background:
        "linear-gradient(180deg, var(--theme-components-card-bg) 0%, var(--theme-surface) 100%)",
      borderColor: "var(--theme-components-card-border)",
      boxShadow: "0 6px 20px rgba(0,0,0,.08)"
    }}
  >
    <div className="min-w-0">
      <div
        className="text-[11px] font-bold uppercase tracking-wide truncate"
        style={{ color: "var(--theme-textSecondary)" }}
      >
        {label}
      </div>
      {sub ? (
        <div className="text-[11px] truncate" style={{ color: "var(--theme-textSecondary)" }}>
          {sub}
        </div>
      ) : null}
    </div>

    <div className="text-right">
      <div className="text-base sm:text-lg font-bold" style={{ color: "var(--theme-text)" }}>
        {value}
      </div>
    </div>
  </div>
);

  const renderClientCard = (client) => {
    const services = parseServices(client);
    const gstTypes = uniqueGstTypes(client);
    const paymentsOpen = !!openPayments[client.lead_id];
    const servicesOpen = !!openServices[client.lead_id];

    return (
      <div
  key={client.lead_id}
  className="h-full flex flex-col rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-4 sm:p-6 bg-[var(--theme-components-card-bg)] border border-[var(--theme-components-card-border)]"
  style={{ background: "linear-gradient(135deg, var(--theme-components-card-bg) 0%, var(--theme-surface) 100%)" }}
>
        {/* Header */}
        <div className="pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-[var(--theme-border)] grid grid-cols-[1fr,auto] items-start gap-3">
  {/* Title + meta kept at a minimum height so action buttons line up across cards */}
  <div className="min-w-0 min-h-[48px] flex flex-col justify-between">
    <h3
      className="font-bold text-lg sm:text-xl text-[var(--theme-text)] mb-0.5 whitespace-normal break-words"
      title={client.full_name}
    >
      {client.full_name}
    </h3>
    <div className="text-[11px] text-[var(--theme-textSecondary)]">
      Created: {client.created_at
        ? new Date(client.created_at).toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        : "—"}
    </div>
  </div>

{/* Actions */}
<div className="flex flex-wrap gap-1.5 sm:gap-2 shrink-0 self-start">
  {[
    {
      icon: Eye,
      title: "View",
      color: "var(--theme-components-button-primary-bg)",
      onClick: () => router.push(`/lead/${client.lead_id}`),
    },
    {
      icon: FileText,
      title: "Invoices",
      color: "var(--theme-components-button-primary-bg)",
      onClick: () => {
        setSelectedLead(client);
        setIsInvoiceModalOpen(true);
      },
    },
    {
      icon: BookOpenText,
      title: "Story",
      color: "var(--theme-secondary)",
      onClick: () => {
        setStoryLead(client);
        setIsStoryModalOpen(true);
      },
    },
    {
      icon: MessageCircle,
      title: "Comments",
      color: "var(--theme-accent)",
      onClick: () => {
        setSelectedLeadId(client.lead_id);
        setIsCommentModalOpen(true);
      },
    },
  ].map((btn, i) => (
    <button
      key={i}
      onClick={btn.onClick}
      aria-label={btn.title}
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-md flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
      title={btn.title}
      style={{ background: btn.color, color: "#fff" }}
    >
      <btn.icon size={14} />
    </button>
  ))}
</div>
</div>

        {/* Client info grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 sm:gap-x-8 mb-4 sm:mb-5">
          <LV label="Email"   value={client.email} />
          <LV label="Mobile"  value={client.mobile} />
          <LV label="City"    value={client.city} />
          {showBranchColumn && <LV label="Branch" value={client.branch_name} />}
          <LV
            label="Assigned"
            value={
              client?.assigned_employee
                ? `${client.assigned_employee.name || "—"} (${roleFromId(client.assigned_employee.role_id)})`
                : "—"
            }
          />
          <LV label="KYC" value={client.kyc_status ? "DONE" : "PENDING"} highlight={!!client.kyc_status} />
        </div>

        {/* Services accordion */}
        <div className="mb-4 sm:mb-5">
          <button
            onClick={() => setOpenServices(prev => ({ ...prev, [client.lead_id]: !prev[client.lead_id] }))}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border hover:shadow-sm transition-all duration-200"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
          >
            <span className="text-sm font-semibold">
              Services {services?.length ? `(${services.length})` : ""}
            </span>
            {servicesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {servicesOpen && (
            <div className="mt-3 rounded-lg border p-3 sm:p-4" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
              <div className="flex flex-wrap gap-2">
                {services.length ? services.map((s, i) => (
                  <Badge key={i} title={s}>
                    <span className="max-w-[160px] truncate inline-block">{s}</span>
                  </Badge>
                )) : <span className="text-sm text-[var(--theme-textSecondary)]">No services</span>}
              </div>
            </div>
          )}
        </div>

        {/* Summary – capsule chips */}
{/* Summary – capsule chips (2 per row, no scroll) */}
<div className="mb-4 sm:mb-5">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
    <StatChip
      label="Total Paid"
      value={<Money val={client.total_amount_paid} />}
      sub={`${client.total_payments ?? 0} payments`}
    />

    <StatChip
      label="Calls"
      value={
        <span className="font-bold">
          {(client.used_calls ?? 0)}/{client.total_calls ?? 0}
        </span>
      }
      sub={`${client.remaining_calls ?? 0} Remaining`}
    />

    {/* GST TYPE capsule */}
<div
  className="w-full px-4 sm:px-5 py-3 sm:py-3.5 rounded-full border flex items-center gap-3"
  style={{
    background:
      "linear-gradient(180deg, var(--theme-components-card-bg) 0%, var(--theme-surface) 100%)",
    borderColor: "var(--theme-components-card-border)",
    boxShadow: "0 6px 20px rgba(0,0,0,.08)"
  }}
>
  <div className="min-w-0 flex-1">
    <div
      className="text-[11px] font-bold uppercase tracking-wide"
      style={{ color: "var(--theme-textSecondary)" }}
    >
      GST Type
    </div>

    <div
      className="text-[12px] sm:text-[13px] font-semibold whitespace-normal break-words leading-snug"
      style={{ color: "var(--theme-text)" }}
      title={gstTypes && gstTypes.length ? gstTypes.join(", ") : "—"}
    >
      &quot;{gstTypes && gstTypes.length ? gstTypes.join(", ") : "—"}&quot;
    </div>
  </div>
</div>

    <StatChip
      label="Active"
      value={<span className="font-bold">{client.active_payments_count ?? 0}</span>}
      sub="payments"
    />
  </div>
</div>


        {/* Payments accordion */}
        <div className="mt-auto">
          <button
            onClick={() => setOpenPayments(prev => ({ ...prev, [client.lead_id]: !prev[client.lead_id] }))}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border hover:shadow-sm transition-all duration-200"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
          >
            <span className="text-sm font-semibold">
              All Payments ({client.all_payments?.length || 0})
            </span>
            {paymentsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {paymentsOpen && (
            <div className="mt-3 sm:mt-4">
              <PaymentList payments={client.all_payments || []} />
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ===== Responsive table pieces ===== */
  const TableHeader = ({ cols }) => (
    <thead className="bg-[var(--theme-surface)] hidden md:table-header-group">
      <tr>
        {cols.map((h) => (
          <th
            key={h}
            className="px-5 lg:px-6 py-3 lg:py-4 text-left text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--theme-textSecondary)" }}
          >
            {h}
          </th>
        ))}
      </tr>
    </thead>
  );

  // On <md screens, each row becomes a stacked card
  const MobileRowCard = ({ children }) => (
    <div className="md:hidden border-t first:border-t-0 border-[var(--theme-border)]">
      <div className="px-4 py-3">{children}</div>
    </div>
  );

  /* ===== Main render ===== */
  const applyDate = useCallback(() => {
    if (isSuperAdmin) fetchClients(branchId || null);
    else if (isBranchManager) fetchClients(branchId);
    else fetchMyClients(myView);
  }, [isSuperAdmin, isBranchManager, branchId, myView]);

  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)]">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 md:px-6 py-6 sm:py-8">
        {(isSuperAdmin || isBranchManager) && (
          <div className="mb-5 sm:mb-6 space-y-4 sm:space-y-5">
            {/* Branch picker (superadmin only) */}
            {isSuperAdmin && hasPermission("client_select_branch") && (
              <div>
                <label className="text-sm font-bold text-[var(--theme-text)] mb-2 sm:mb-3 block">
                  Select Branch
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setBranchId(null); fetchClients(null); }}
                    className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 hover:shadow-md"
                    style={{
                      background: !branchId ? "var(--theme-components-button-primary-bg)" : "var(--theme-surface)",
                      color: !branchId ? "var(--theme-components-button-primary-text)" : "var(--theme-text)",
                      borderColor: !branchId ? "var(--theme-components-button-primary-bg)" : "var(--theme-border)",
                      boxShadow: !branchId ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    All Branches
                  </button>
                  {branches.map((branch) => {
                    const isActive = branchId === branch.id;
                    return (
                      <button
                        key={branch.id}
                        onClick={() => { setBranchId(branch.id); fetchClients(branch.id); }}
                        className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 hover:shadow-md"
                        style={{
                          background: isActive ? "var(--theme-components-button-primary-bg)" : "var(--theme-surface)",
                          color: isActive ? "var(--theme-components-button-primary-text)" : "var(--theme-text)",
                          borderColor: isActive ? "var(--theme-components-button-primary-bg)" : "var(--theme-border)",
                          boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        {branch.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top controls */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
              <div className="inline-flex rounded-lg shadow-sm self-start" role="group">
                <button
                  type="button"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold border rounded-l-lg transition-all duration-200"
                  onClick={() => setView("card")}
                  style={{
                    background: view === "card" ? "var(--theme-components-button-primary-bg)" : "var(--theme-surface)",
                    color: view === "card" ? "var(--theme-components-button-primary-text)" : "var(--theme-text)",
                    borderColor: view === "card" ? "var(--theme-components-button-primary-bg)" : "var(--theme-border)",
                    boxShadow: view === "card" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Card View
                </button>
                <button
                  type="button"
                  className="px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold border rounded-r-lg transition-all duration-200"
                  onClick={() => setView("table")}
                  style={{
                    background: view === "table" ? "var(--theme-components-button-primary-bg)" : "var(--theme-surface)",
                    color: view === "table" ? "var(--theme-components-button-primary-text)" : "var(--theme-text)",
                    borderColor: view === "table" ? "var(--theme-components-button-primary-bg)" : "var(--theme-border)",
                    boxShadow: view === "table" ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  Table View
                </button>
              </div>

              {/* Date filters (wrap nicely on mobile) */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyDate}
                  className="px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all duration-200"
                  style={{
                    background: "var(--theme-components-button-primary-bg)",
                    color: "var(--theme-components-button-primary-text)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  Apply
                </button>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
                    className="px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold border hover:shadow-md transition-all duration-200"
                    style={{ background: "var(--theme-surface)", color: "var(--theme-text)", borderColor: "var(--theme-border)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <LoadingState message="Loading Clients..." />
        ) : (isSuperAdmin || isBranchManager) ? (
          view === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              {filteredClients.map((client) => renderClientCard(client))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl shadow-lg bg-[var(--theme-components-card-bg)] border border-[var(--theme-components-card-border)]">
              {/* Mobile cards for table data */}
              <div className="md:hidden">
                {filteredClients.map((c) => (
                  <MobileRowCard key={c.lead_id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[15px] truncate" title={c.full_name}>{c.full_name}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)] truncate">{c.email || "—"}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">{c.mobile || "—"}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">{c.city || "—"}</div>
                        {showBranchColumn && <div className="text-[12px] text-[var(--theme-textSecondary)]">Branch: {c.branch_name || "—"}</div>}
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">
                          Assigned: {c?.assigned_employee ? `${c.assigned_employee.name || "—"} (${roleFromId(c.assigned_employee.role_id)})` : "—"}
                        </div>
                        <div className="mt-1">
                          <Badge tone={c.kyc_status ? "ok" : "danger"}>{c.kyc_status ? "KYC DONE" : "KYC PENDING"}</Badge>
                        </div>
                        <div className="mt-2 text-[13px]"><Money val={c.total_amount_paid} /></div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">Calls: {c.used_calls ?? 0}/{c.total_calls ?? 0}</div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => router.push(`/lead/${c.lead_id}`)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-components-button-primary-bg)", color: "#fff" }} aria-label="View">
                          <Eye size={16} />
                        </button>
                        {hasPermission("client_invoice") && (
                          <button onClick={() => { setSelectedLead(c); setIsInvoiceModalOpen(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-components-button-primary-bg)", color: "#fff" }} aria-label="Invoices">
                            <FileText size={16} />
                          </button>
                        )}
                        {hasPermission("client_story") && (
                          <button onClick={() => { setStoryLead(c); setIsStoryModalOpen(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-secondary)", color: "#fff" }} aria-label="Story">
                            <BookOpenText size={16} />
                          </button>
                        )}
                        {hasPermission("client_comments") && (
                          <button onClick={() => { setSelectedLeadId(c.lead_id); setIsCommentModalOpen(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-accent)", color: "#fff" }} aria-label="Comments">
                            <MessageCircle size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </MobileRowCard>
                ))}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[860px]">
                  <TableHeader
                    cols={[
                      "Name", "Email", "Mobile", "City",
                      ...(showBranchColumn ? ["Branch"] : []),
                      "Assigned", "KYC", "Paid", "Calls", "Actions",
                    ]}
                  />
                  <tbody className="divide-y" style={{ divideColor: "var(--theme-border)" }}>
                    {filteredClients.map((client) => (
                      <tr key={client.lead_id} className="hover:bg-[var(--theme-surface)] transition-colors duration-150">
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm font-semibold truncate" title={client.full_name}>{client.full_name}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.email || "—"}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.mobile || "—"}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.city || "—"}</td>
                        {showBranchColumn && (
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.branch_name || "—"}</td>
                        )}
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">
                          {client?.assigned_employee ? `${client.assigned_employee.name || "—"} (${roleFromId(client.assigned_employee.role_id)})` : "—"}
                        </td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4">
                          <Badge tone={client.kyc_status ? "ok" : "danger"}>{client.kyc_status ? "DONE" : "PENDING"}</Badge>
                        </td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 font-bold"><Money val={client.total_amount_paid} /></td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.used_calls ?? 0}/{client.total_calls ?? 0}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4">
                          <ActionsDropdown
  onView={() => router.push(`/lead/${client.lead_id}`)}
  onInvoices={() => { setSelectedLead(client); setIsInvoiceModalOpen(true); }}
  onStory={() => { setStoryLead(client); setIsStoryModalOpen(true); }}
  onComments={() => { setSelectedLeadId(client.lead_id); setIsCommentModalOpen(true); }}
  canInvoices={hasPermission("client_invoice")}
  canStory={hasPermission("client_story")}
  canComments={hasPermission("client_comments")}
/>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Non-superadmin controls */}
            <div className="mb-4 sm:mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
              <div className="inline-flex rounded-lg shadow-sm self-start" role="group">
                {["self", "other"].map((v, i) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { if (myView !== v) { setMyView(v); fetchMyClients(v); }}}
                    className={`px-4 sm:px-5 py-2.5 sm:py-3 text-sm font-semibold border transition-all duration-200 ${i === 0 ? "rounded-l-lg" : "rounded-r-lg"}`}
                    style={{
                      background: myView === v ? "var(--theme-components-button-primary-bg)" : "var(--theme-surface)",
                      color: myView === v ? "var(--theme-components-button-primary-text)" : "var(--theme-text)",
                      borderColor: myView === v ? "var(--theme-components-button-primary-bg)" : "var(--theme-border)",
                      boxShadow: myView === v ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    {v === "self" ? "My Clients" : "My Team"}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>
                <button
                  type="button"
                  onClick={applyDate}
                  className="px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold hover:shadow-lg transition-all duration-200"
                  style={{ background: "var(--theme-components-button-primary-bg)", color: "var(--theme-components-button-primary-text)" }}
                >
                  Apply Filter
                </button>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(""); setDateTo(""); applyDate(); }}
                    className="px-3 sm:px-4 py-2.5 rounded-lg text-sm font-semibold border hover:shadow-md transition-all duration-200"
                    style={{ background: "var(--theme-surface)", color: "var(--theme-text)", borderColor: "var(--theme-border)" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* My clients list: mobile cards + desktop table */}
            <div className="overflow-hidden rounded-xl shadow-lg bg-[var(--theme-components-card-bg)] border border-[var(--theme-components-card-border)]">
              {/* Mobile cards */}
              <div className="md:hidden">
                {Array.isArray(filteredMyClients) && filteredMyClients.map((c) => {
                  const lastPaidAt = lastPaymentISO(c);
                  return (
                    <MobileRowCard key={c.lead_id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[15px] truncate" title={c.full_name}>{c.full_name}</div>
                          <div className="text-[12px] text-[var(--theme-textSecondary)] truncate">{c.email || "—"}</div>
                          <div className="text-[12px] text-[var(--theme-textSecondary)]">{c.mobile || "—"}</div>
                          <div className="mt-1"><Money val={c.total_amount_paid} /></div>
                          <div className="text-[12px] text-[var(--theme-textSecondary)]">Last: {lastPaidAt ? new Date(lastPaidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
                          <div className="text-[12px] text-[var(--theme-textSecondary)]">Calls: {c.used_calls ?? 0}/{c.total_calls ?? 0}</div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => router.push(`/lead/${c.lead_id}`)} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-components-button-primary-bg)", color: "#fff" }} aria-label="View">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => { setStoryLead(c); setIsStoryModalOpen(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-secondary)", color: "#fff" }} aria-label="Story">
                            <BookOpenText size={16} />
                          </button>
                          <button onClick={() => { setSelectedLeadId(c.lead_id); setIsCommentModalOpen(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:shadow-md" style={{ background: "var(--theme-accent)", color: "#fff" }} aria-label="Comments">
                            <MessageCircle size={14} />
                          </button>
                        </div>
                      </div>
                    </MobileRowCard>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[760px]">
                  <TableHeader cols={["Name", "Email", "Mobile", "Total Paid", "Last Payment", "Calls", "Actions"]} />
                  <tbody className="divide-y" style={{ divideColor: "var(--theme-border)" }}>
                    {Array.isArray(filteredMyClients) && filteredMyClients.map((client) => {
                      const lastPaidAt = lastPaymentISO(client);
                      return (
                        <tr key={client.lead_id} className="hover:bg-[var(--theme-surface)] transition-colors duration-150">
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm font-semibold truncate" title={client.full_name}>{client.full_name}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.email || "—"}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.mobile || "—"}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 font-bold"><Money val={client.total_amount_paid} /></td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">
                            {lastPaidAt ? new Date(lastPaidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.used_calls ?? 0}/{client.total_calls ?? 0}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4">
                            <div className="flex flex-wrap gap-2">
                             <ActionsDropdown
  onView={() => router.push(`/lead/${client.lead_id}`)}
  onInvoices={undefined /* not shown in this table by default; add if you want */}
  onStory={() => { setStoryLead(client); setIsStoryModalOpen(true); }}
  onComments={() => { setSelectedLeadId(client.lead_id); setIsCommentModalOpen(true); }}
  canInvoices={false}  // set true + add handler if you want invoices here too
  canStory={true}
  canComments={true}
/>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && ((isSuperAdmin || isBranchManager) ? filteredClients.length === 0 : filteredMyClients.length === 0) && (
          <div className="text-center py-12 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-[var(--theme-surface)] flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: "var(--theme-textSecondary)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-[var(--theme-text)] mb-1 sm:mb-2">No clients found</h3>
            <p className="text-sm" style={{ color: "var(--theme-textSecondary)" }}>
              {branchId ? "Try selecting a different branch or date range." : "Try changing the date range."}
            </p>
          </div>
        )}

        {/* Modals */}
        {isCommentModalOpen && (
          <CommentModal isOpen={isCommentModalOpen} onClose={() => setIsCommentModalOpen(false)} leadId={selectedLeadId} />
        )}
        {storyLead && isStoryModalOpen && (
          <StoryModal isOpen={isStoryModalOpen} onClose={() => setIsStoryModalOpen(false)} leadId={storyLead?.lead_id} />
        )}
        <InvoiceList isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} leadId={selectedLead?.lead_id} />
      </div>
    </div>
  );
}
