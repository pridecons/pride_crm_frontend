"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

const EmployeeAutoComplete = ({
  placeholder = "Search employee (min 2 chars)...",
  employeeQuery, setEmployeeQuery,
  employeeOptions, employeeLoading,
  employeeDropdownOpen, setEmployeeDropdownOpen,
  selectedEmployee, setSelectedEmployee,
  searchEmployees,
  isSuperAdmin, isBranchManager, myView,
  branchId, appliedFrom, appliedTo,
  fetchClients, fetchMyClients,
}) => {
  const wrapRef = useRef(null);

  // ---- helper: refetch with no employee filter
  const refetchWithoutEmployee = useCallback(() => {
    const from = appliedFrom || "";
    const to = appliedTo || "";
    const emp = ""; // cleared
    if (isSuperAdmin || isBranchManager) {
      fetchClients(branchId ?? null, from, to, emp);
    } else if (myView === "other") {
      fetchMyClients("other", from, to, emp);
    } else {
      // for "self" view there is no employee filter; keep as-is
      fetchMyClients("self", from, to, emp);
    }
  }, [appliedFrom, appliedTo, isSuperAdmin, isBranchManager, myView, branchId, fetchClients, fetchMyClients]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target)) setEmployeeDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [setEmployeeDropdownOpen]);

  return (
    <div ref={wrapRef} className="relative w-[260px]">
      <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">
        Employee
      </label>
      <div className="relative">
        <input
          type="text"
          value={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.employee_code})` : employeeQuery}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            // if the user is clearing the input, also clear the selection
            if (selectedEmployee) setSelectedEmployee(null);
            setEmployeeQuery(v);

            if (v.trim().length === 0) {
              // input cleared -> close list, clear options, and refetch
              setEmployeeDropdownOpen(false);
              // optional: clear any stale options
              // setEmployeeOptions([]); // you have this state in parent
              refetchWithoutEmployee();
            } else {
              // only search when >= 2 chars
              searchEmployees(v);
            }
          }}
          onFocus={() => { if (employeeOptions.length) setEmployeeDropdownOpen(true); }}
          className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
          style={{ borderColor: "var(--theme-input-border)" }}
          aria-autocomplete="list"
          aria-expanded={employeeDropdownOpen}
          aria-controls="employee-autocomplete-list"
        />

        {selectedEmployee && (
          <button
            type="button"
            onClick={() => {
              // Clear selection and query, then refetch list without employee filter
              setSelectedEmployee(null);
              setEmployeeQuery("");
              setEmployeeDropdownOpen(false);
              // optional: clear options so the dropdown is empty
              // setEmployeeOptions([]);
              refetchWithoutEmployee();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] px-2 py-1 rounded border"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-textSecondary)" }}
            aria-label="Clear employee"
          >
            Clear
          </button>
        )}
      </div>

      {employeeDropdownOpen && (
        <div
          id="employee-autocomplete-list"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-lg border shadow-lg"
          style={{ background: "var(--theme-components-card-bg)", borderColor: "var(--theme-components-card-border)" }}
        >
          {employeeLoading ? (
            <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">Searching…</div>
          ) : employeeOptions.length ? (
            employeeOptions.map((opt) => (
              <button
                key={opt.employee_code}
                role="option"
                type="button"
                onClick={() => {
                  setSelectedEmployee({ employee_code: opt.employee_code, name: opt.name });
                  setEmployeeQuery("");
                  setEmployeeDropdownOpen(false);
                  const emp = opt.employee_code;
                  if (isSuperAdmin || isBranchManager) {
                    fetchClients(branchId ?? null, appliedFrom || "", appliedTo || "", emp);
                  } else if (myView === "other") {
                    fetchMyClients("other", appliedFrom || "", appliedTo || "", emp);
                  } else {
                    fetchMyClients("self", appliedFrom || "", appliedTo || "", emp);
                  }
                }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--theme-surface)]"
                style={{ color: "var(--theme-text)" }}
              >
                <div className="text-sm font-medium truncate">
                  {opt.name} <span className="opacity-70">({opt.employee_code})</span>
                </div>
                {opt.role && (
                  <div className="text-[11px] text-[var(--theme-textSecondary)]">{opt.role}</div>
                )}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-[var(--theme-textSecondary)]">No matches</div>
          )}
        </div>
      )}
    </div>
  );
};

const pickEmployeeCode = (u) => u?.employee_code ?? u?.user?.employee_code ?? null;

const getMyEmployeeCodeFromCookie = () => {
  try {
    const raw = Cookies.get("user_info");
    if (!raw) return null;
    const p = JSON.parse(raw);
    return pickEmployeeCode(p);
  } catch {
    return null;
  }
};

const normalizeRoleKey = (r) => {
  const key = (r || "").toString().trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "SUPER_ADMINISTRATOR") return "SUPERADMIN";
  if (key === "BRANCH_MANAGER") return "BRANCH MANAGER";
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
    } catch { }
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

  const [openServices, setOpenServices] = useState({});

  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [appliedFrom, setAppliedFrom] = useState(""); // only used after clicking Apply
  const [appliedTo, setAppliedTo] = useState("");

  const router = useRouter();

  // payments modal state (belongs in ClientsPage, not ActionsDropdown)
  const [paymentsModal, setPaymentsModal] = useState({ open: false, client: null });

  // employee filter (autocomplete)
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]); // [{employee_code, name, profile_role?.name}]
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // { employee_code, name }

  const [myEmployeeCode, setMyEmployeeCode] = useState(null);

  const employeeSearchTimer = useRef(null);

  const isSuperAdmin = role === "SUPERADMIN";
  const isBranchManager = role === "BRANCH MANAGER";
  const showBranchColumn = isSuperAdmin;

  const searchEmployees = useCallback((q) => {
    if (employeeSearchTimer.current) clearTimeout(employeeSearchTimer.current);

    employeeSearchTimer.current = setTimeout(async () => {
      const query = (q || "").trim();
      if (query.length < 2) { setEmployeeOptions([]); return; }

      try {
        setEmployeeLoading(true);

        // ✅ Only pass the search term. Backend uses the auth cookie to scope:
        // - Senior: only direct team
        // - Branch Manager: whole branch
        // - Superadmin: all branches
        const res = await axiosInstance.get("/users-fiter/", {
          params: { search: query }
        });

        const arr = Array.isArray(res.data) ? res.data : [];

        // 🙅‍♂️ Don’t show myself
        const filtered = myEmployeeCode
          ? arr.filter(u => String(u.employee_code) !== String(myEmployeeCode))
          : arr;

        setEmployeeOptions(
          filtered.map(u => ({
            employee_code: u.employee_code,
            name: u.name,
            role: u?.profile_role?.name ?? u?.role_id
          }))
        );
      } catch {
        setEmployeeOptions([]);
      } finally {
        setEmployeeLoading(false);
        setEmployeeDropdownOpen(true);
      }
    }, 250);
  }, [myEmployeeCode]);

  // Prefer backend-provided role name for assigned employee
  const roleLabel = (emp) => {
    const raw =
      emp?.role_name ??
      emp?.profile_role?.name ?? // fallback if some payloads still send this
      emp?.role ??
      emp?.role_id ??
      "";
    // normalize for display: SUPERADMIN -> SUPERADMIN, BRANCH_MANAGER -> BRANCH MANAGER
    return String(raw).trim().toUpperCase().replace(/_/g, " ");
  };

  // REPLACE fetchClients with this
  const fetchClients = async (branch = null, fromDate = "", toDate = "", employeeCode = "") => {
    try {
      setLoading(true);
      const effectiveBranch = (branch !== null && branch !== undefined) ? branch : (branchId ?? null);

      const qs = new URLSearchParams({ page: "1", limit: "100", view: "all" });
      if (effectiveBranch) qs.append("branch_id", String(effectiveBranch));
      if (fromDate) qs.append("from_date", fromDate);
      if (toDate) qs.append("to_date", toDate);
      if (employeeCode) qs.append("employee_code", employeeCode);

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

  // REPLACE fetchMyClients with this
  const fetchMyClients = async (scope, fromDate = "", toDate = "", employeeCode = "") => {
    try {
      setLoading(true);
      const qs = new URLSearchParams({ page: "1", limit: "50", view: scope || "self" });
      if (fromDate) qs.append("from_date", fromDate);
      if (toDate) qs.append("to_date", toDate);
      if (employeeCode) qs.append("employee_code", employeeCode);

      const res = await axiosInstance.get(`/clients/?${qs.toString()}`);
      setMyClients(Array.isArray(res.data?.clients) ? res.data.clients : []);
    } catch (err) {
      console.error("Error fetching my clients:", err);
      setMyClients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/branches/?skip=0&limit=100&active_only=false");
      const data = Array.isArray(res.data?.branches)
        ? res.data.branches
        : (Array.isArray(res.data) ? res.data : []);
      setBranches(data);
    } catch (err) {
      console.error("Failed to fetch branches:", err);
    }
  }, []);

  /* ===== UI atoms ===== */
  const Badge = ({ children, tone = "info", title }) => {
    const tones = {
      info: { bg: "rgba(59,130,246,.08)", text: "#2563eb", border: "rgba(59,130,246,.2)" },
      warn: { bg: "rgba(251,191,36,.08)", text: "#a16207", border: "rgba(251,191,36,.2)" },
      ok: { bg: "rgba(34,197,94,.08)", text: "#166534", border: "rgba(34,197,94,.2)" },
      danger: { bg: "rgba(239,68,68,.08)", text: "#b91c1c", border: "rgba(239,68,68,.2)" },
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

  const PaymentList = ({ payments = [] }) => {
    if (!Array.isArray(payments) || payments.length === 0) {
      return (
        <div className="text-sm text-[var(--theme-textSecondary)] px-3 py-2">
          No payments available.
        </div>
      );
    }

    const Money = ({ v }) => (
      <span className="font-semibold">₹{(Number(v) || 0).toLocaleString("en-IN")}</span>
    );

    const Chip = ({ children, tone = "default", title }) => {
      const tones = {
        default: { bg: "rgba(0,0,0,.04)", text: "var(--theme-text)", br: "transparent" },
        ok: { bg: "rgba(34,197,94,.10)", text: "#166534", br: "rgba(34,197,94,.25)" },
        warn: { bg: "rgba(251,191,36,.12)", text: "#92400e", br: "rgba(251,191,36,.28)" },
        info: { bg: "rgba(59,130,246,.12)", text: "#1e40af", br: "rgba(59,130,246,.28)" },
      };
      const t = tones[tone] || tones.default;
      return (
        <span
          title={title}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border"
          style={{ background: t.bg, color: t.text, borderColor: t.br }}
        >
          {children}
        </span>
      );
    };

    const extractServices = (p) => {
      const out = [];
      if (Array.isArray(p?.plan) && Array.isArray(p.plan[0]?.service_type)) {
        for (const s of p.plan[0].service_type) if (s) out.push(String(s));
      }
      if (Array.isArray(p?.service)) {
        for (const s of p.service) {
          String(s)
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
            .forEach((x) => out.push(x));
        }
      }
      // unique + keep order
      return Array.from(new Set(out));
    };

    return (
      <ul className="divide-y" style={{ divideColor: "var(--theme-border)" }}>
        {payments.map((p) => {
          const services = extractServices(p);
          const show = services.slice(0, 3);
          const more = services.length - show.length;

          const createdLabel = p.created_at
            ? new Date(p.created_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            : "—";

          return (
            <li
              key={p.payment_id || p.order_id}
              className="px-3 sm:px-4 py-3"
              style={{ background: "var(--theme-surface)" }}
            >
              {/* Row 1: Title + amount */}
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="text-sm font-semibold">
                      Payment #{p.payment_id} ·{" "}
                      <span className="uppercase">{p.status || "—"}</span>
                    </div>
                    {p.order_id ? (
                      <span className="text-[11px] text-[var(--theme-textSecondary)] truncate">
                        Order: {p.order_id}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[var(--theme-textSecondary)]">
                    {createdLabel}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[var(--theme-textSecondary)] leading-none mb-0.5">
                    Paid
                  </div>
                  <div className="text-base leading-none">
                    <Money v={p.paid_amount} />
                  </div>
                </div>
              </div>

              {/* Row 2: Compact meta chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip tone="info" title="Mode">{p.mode || "—"}</Chip>
                <Chip title="Billing Cycle">{p.billing_cycle || "—"}</Chip>
                {typeof p.call === "number" ? (
                  <Chip title="Calls Used/Total">
                    {p.used_calls ?? 0}/{p.call ?? 0} (Rem {p.remaining_calls ?? 0})
                  </Chip>
                ) : null}
                <Chip tone={p.is_active ? "ok" : "warn"} title="Active">
                  {p.is_active ? "Active" : "Inactive"}
                </Chip>
                {Array.isArray(p.plan) && p.plan[0] ? (
                  <>
                    {p.plan[0].name ? <Chip title="Plan">{p.plan[0].name}</Chip> : null}
                    {typeof p.plan[0].price !== "undefined" ? (
                      <Chip title="Plan Price">
                        <Money v={p.plan[0].price} />
                      </Chip>
                    ) : null}
                    {typeof p.plan[0].discount_percent === "number" && p.plan[0].discount_percent > 0 ? (
                      <Chip tone="warn" title="Discount">
                        {p.plan[0].discount_percent}% off
                      </Chip>
                    ) : null}
                  </>
                ) : null}
              </div>

              {/* Row 3: Services (inline, trimmed) */}
              <div className="mt-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-textSecondary)] mb-1">
                  Services
                </div>
                {show.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {show.map((s, i) => (
                      <Chip key={i} tone="default" title={s}>
                        <span className="max-w-[140px] truncate inline-block">{s}</span>
                      </Chip>
                    ))}
                    {more > 0 ? <Chip>+{more} more</Chip> : null}
                  </div>
                ) : (
                  <div className="text-[12px] text-[var(--theme-textSecondary)]">—</div>
                )}
              </div>

              {/* Row 4: Taxes in one slim line */}
              <div className="mt-2 pt-2 border-t text-[12px] flex flex-wrap items-center gap-x-3 gap-y-1"
                style={{ borderColor: "var(--theme-border)" }}>
                <Chip tone="info" title="GST Type">{p.gst_type || "—"}</Chip>
                <span className="text-[var(--theme-textSecondary)]">
                  CGST: <Money v={p.cgst} /> &nbsp;|&nbsp; SGST: <Money v={p.sgst} /> &nbsp;|&nbsp; IGST: <Money v={p.igst} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>
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

  const ChevronRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ opacity: .8 }}>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const renderClientCard = (client) => {
    const services = parseServices(client);
    const gstTypes = uniqueGstTypes(client);
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
          <LV label="Email" value={client.email} />
          <LV label="Mobile" value={client.mobile} />
          <LV label="City" value={client.city} />
          {showBranchColumn && <LV label="Branch" value={client.branch_name} />}
          <LV
            label="Assigned"
            value={
              client?.assigned_employee
                ? `${client.assigned_employee.name || "—"} (${roleLabel(client.assigned_employee)})`
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


        {/* Payments: open modal with table */}
        <div className="mt-auto">
          <button
            onClick={() => setPaymentsModal({ open: true, client })}
            className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border hover:shadow-sm transition-all duration-200"
            style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)", color: "var(--theme-text)" }}
          >
            <span className="text-sm font-semibold">
              All Payments ({client.all_payments?.length || 0})
            </span>
            <ChevronRightIcon />
          </button>
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
    let from = dateFromInput;
    let to = dateToInput;

    // single-date support: if only one is filled, use it for both
    if (from && !to) to = from;
    if (to && !from) from = to;

    setAppliedFrom(from || "");
    setAppliedTo(to || "");

    // refetch based on role
    const emp = selectedEmployee?.employee_code || "";
    if (isSuperAdmin) {
      fetchClients(branchId ?? null, from || "", to || "", emp);
    } else if (isBranchManager) {
      fetchClients(branchId ?? null, from || "", to || "", emp);
    } else {
      fetchMyClients(myView || "self", from || "", to || "", emp);
    }
  }, [dateFromInput, dateToInput, isSuperAdmin, isBranchManager, branchId, myView, selectedEmployee]);

  useEffect(() => {
    const { role: r, branch_id: b } = getUserMeta();
    setRole(r || "");
    setBranchId(b ?? null);
    setMyEmployeeCode(getMyEmployeeCodeFromCookie());

    if (r === "SUPERADMIN") {
      fetchBranches();       // see function below
      fetchClients(null);    // all branches by default
    } else if (r === "BRANCH MANAGER") {
      fetchClients(b);       // manager’s branch
    } else {
      setMyView("self");
      fetchMyClients("self"); // non-admins
    }
  }, []);

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
                    onClick={() => {
                      setBranchId(null);
                      const emp = selectedEmployee?.employee_code || "";
                      fetchClients(null, appliedFrom || "", appliedTo || "", emp);
                    }}
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
                        onClick={() => {
                          setBranchId(branch.id);
                          const emp = selectedEmployee?.employee_code || "";
                          fetchClients(branch.id, appliedFrom || "", appliedTo || "", emp);
                        }}
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
                  className="px-4 sm:px-5 py-1.5 text-sm font-semibold border rounded-l-lg transition-all duration-200"
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
                  className="px-4 sm:px-5 py-1.5 text-sm font-semibold border rounded-r-lg transition-all duration-200"
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
                <EmployeeAutoComplete
                  employeeQuery={employeeQuery}
                  setEmployeeQuery={setEmployeeQuery}
                  employeeOptions={employeeOptions}
                  employeeLoading={employeeLoading}
                  employeeDropdownOpen={employeeDropdownOpen}
                  setEmployeeDropdownOpen={setEmployeeDropdownOpen}
                  selectedEmployee={selectedEmployee}
                  setSelectedEmployee={setSelectedEmployee}
                  searchEmployees={searchEmployees}
                  isSuperAdmin={isSuperAdmin}
                  isBranchManager={isBranchManager}
                  myView={myView}
                  branchId={branchId}
                  appliedFrom={appliedFrom}
                  appliedTo={appliedTo}
                  fetchClients={fetchClients}
                  fetchMyClients={fetchMyClients}
                />
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateFromInput}
                    onChange={(e) => setDateFromInput(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateToInput}
                    onChange={(e) => setDateToInput(e.target.value)}
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

                {(dateFromInput || dateToInput || appliedFrom || appliedTo) && (  /* optional: show when applied too */
                  <button
                    type="button"
                    onClick={() => {
                      setDateFromInput("");
                      setDateToInput("");
                      setAppliedFrom("");
                      setAppliedTo("");
                      setSelectedEmployee(null);
                      setEmployeeQuery("");

                      if (isSuperAdmin) {
                        fetchClients(branchId ?? null, "", "");
                      } else if (isBranchManager) {
                        fetchClients(branchId ?? null, "", "");
                      } else {
                        fetchMyClients(myView || "self", "", "");
                      }
                    }}
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
              {clients.map((client) => renderClientCard(client))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl shadow-lg bg-[var(--theme-components-card-bg)] border border-[var(--theme-components-card-border)]">
              {/* Mobile cards for table data */}
              <div className="md:hidden">
                {clients.map((c) => (
                  <MobileRowCard key={c.lead_id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[15px] truncate" title={c.full_name}>{c.full_name}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)] truncate">{c.email || "—"}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">{c.mobile || "—"}</div>
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">{c.city || "—"}</div>
                        {showBranchColumn && <div className="text-[12px] text-[var(--theme-textSecondary)]">Branch: {c.branch_name || "—"}</div>}
                        <div className="text-[12px] text-[var(--theme-textSecondary)]">
                          Assigned: {c?.assigned_employee ? `${c.assigned_employee.name || "—"} (${roleLabel(c.assigned_employee)})` : "—"}
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
                      "Client Name", "Email", "Mobile", "City",
                      ...(showBranchColumn ? ["Branch"] : []),
                      "Assigned Employee", "KYC", "Paid", "Calls", "Actions",
                    ]}
                  />
                  <tbody className="divide-y" style={{ divideColor: "var(--theme-border)" }}>
                    {clients.map((client) => (
                      <tr key={client.lead_id} className="hover:bg-[var(--theme-surface)] transition-colors duration-150">
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm font-semibold truncate" title={client.full_name}>{client.full_name}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.email || "—"}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.mobile || "—"}</td>
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.city || "—"}</td>
                        {showBranchColumn && (
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.branch_name || "—"}</td>
                        )}
                        <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">
                          {client?.assigned_employee
                            ? `${client.assigned_employee.name || "—"} (${roleLabel(client.assigned_employee)})`
                            : "—"}
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
                    onClick={() => {
                      if (myView !== v) {
                        setMyView(v);
                        const emp = selectedEmployee?.employee_code || "";
                        fetchMyClients(v, appliedFrom || "", appliedTo || "", emp);
                      }
                    }}
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

              {/* Date filters (wrap nicely on mobile) */}
              <div className="flex flex-wrap items-end gap-3">

                {/* Non-admin, only when myView === "other" */}
                {myView === "other" && (
                  <EmployeeAutoComplete
                    employeeQuery={employeeQuery}
                    setEmployeeQuery={setEmployeeQuery}
                    employeeOptions={employeeOptions}
                    employeeLoading={employeeLoading}
                    employeeDropdownOpen={employeeDropdownOpen}
                    setEmployeeDropdownOpen={setEmployeeDropdownOpen}
                    selectedEmployee={selectedEmployee}
                    setSelectedEmployee={setSelectedEmployee}
                    searchEmployees={searchEmployees}
                    isSuperAdmin={isSuperAdmin}
                    isBranchManager={isBranchManager}
                    myView={myView}
                    branchId={branchId}
                    appliedFrom={appliedFrom}
                    appliedTo={appliedTo}
                    fetchClients={fetchClients}
                    fetchMyClients={fetchMyClients}
                  />
                )}
                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFromInput}
                    onChange={(e) => setDateFromInput(e.target.value)}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 text-sm border bg-[var(--theme-input-bg)] text-[var(--theme-text)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                    style={{ borderColor: "var(--theme-input-border)" }}
                  />
                </div>

                <div className="w-[calc(50%-6px)] sm:w-auto min-w-[140px]">
                  <label className="block text-[11px] font-bold text-[var(--theme-textSecondary)] mb-1.5 sm:mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateToInput}
                    onChange={(e) => setDateToInput(e.target.value)}
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

                {(dateFromInput || dateToInput || appliedFrom || appliedTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFromInput("");
                      setDateToInput("");
                      setAppliedFrom("");
                      setAppliedTo("");
                      setSelectedEmployee(null);
                      setEmployeeQuery("");

                      if (isSuperAdmin) {
                        fetchClients(branchId ?? null, "", "");
                      } else if (isBranchManager) {
                        fetchClients(branchId ?? null, "", "");
                      } else {
                        fetchMyClients(myView || "self", "", "");
                      }
                    }}
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
                {Array.isArray(myClients) && myClients.map((c) => {
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
                  <TableHeader
                    cols={
                      myView === "other"
                        ? ["Name", "Email", "Mobile", "Assigned", "Total Paid", "Last Payment", "kyc_status", "Calls", "Actions"]
                        : ["Name", "Email", "Mobile", "Total Paid", "Last Payment", "kyc_status", "Calls", "Actions"]
                    }
                  />
                  <tbody className="divide-y" style={{ divideColor: "var(--theme-border)" }}>
                    {Array.isArray(myClients) && myClients.map((client) => {
                      const lastPaidAt = lastPaymentISO(client);
                      return (
                        <tr key={client.lead_id} className="hover:bg-[var(--theme-surface)] transition-colors duration-150">
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm font-semibold truncate" title={client.full_name}>{client.full_name}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">{client.email || "—"}</td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">{client.mobile || "—"}</td>
                          {myView === "other" && (
                            <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm truncate">
                              {client?.assigned_employee
                                ? `${client.assigned_employee.name || "—"} (${roleLabel(client.assigned_employee)})`
                                : "—"}
                            </td>
                          )}
                          <td className="px-5 lg:px-6 py-3 lg:py-4 font-bold"><Money val={client.total_amount_paid} /></td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4 text-sm">
                            {lastPaidAt ? new Date(lastPaidAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                          <td className="px-5 lg:px-6 py-3 lg:py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${client.kyc_status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                }`}
                            >
                              {client.kyc_status ? "DONE" : "PENDING"}
                            </span>
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
        {!loading && ((isSuperAdmin || isBranchManager) ? clients.length === 0 : myClients.length === 0) && (
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

        {/* Compact Enhanced Payments Modal */}
        {paymentsModal.open && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="absolute inset-0 bg-black/50" onClick={() => setPaymentsModal({ open: false, client: null })} />

            <div className="relative w-[96vw] max-w-5xl max-h-[92vh] border shadow-2xl flex flex-col"
              style={{ background: "var(--theme-components-card-bg)", borderColor: "var(--theme-components-card-border)" }}>

              {/* Compact Header */}
              <div className="px-5 py-3 border-b flex items-center justify-between shrink-0"
                style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                <div>
                  <h2 className="text-lg font-semibold leading-tight" style={{ color: "var(--theme-text)" }}>
                    Payment History
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                    {paymentsModal.client?.full_name} · {paymentsModal.client?.all_payments?.length || 0} records
                  </p>
                </div>
                <button className="w-9 h-9 rounded-lg flex items-center justify-center border hover:shadow transition-all text-xl"
                  style={{ background: "var(--theme-surface)", color: "var(--theme-text)", borderColor: "var(--theme-border)" }}
                  onClick={() => setPaymentsModal({ open: false, client: null })} aria-label="Close">
                  ×
                </button>
              </div>

              {/* Compact Content */}
              <div className="overflow-y-auto flex-1 px-5 py-3">
                {(!paymentsModal.client?.all_payments || paymentsModal.client.all_payments.length === 0) ? (
                  <div className="text-center py-12" style={{ color: "var(--theme-textSecondary)" }}>
                    No payments available.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentsModal.client.all_payments.map((p, idx) => {
                      const dt = p?.created_at ? new Date(p.created_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      }) : "—";

                      const plan = Array.isArray(p?.plan) && p.plan[0] ? p.plan[0] : null;
                      const services = (() => {
                        const arr = [];
                        if (plan?.service_type?.length) arr.push(...plan.service_type);
                        if (Array.isArray(p?.service)) {
                          p.service.flatMap(s => String(s).split(",")).map(s => s.trim()).filter(Boolean).forEach(s => arr.push(s));
                        }
                        const uniq = Array.from(new Set(arr));
                        return uniq.length <= 3 ? uniq.join(", ") : `${uniq.slice(0, 3).join(", ")} +${uniq.length - 3}`;
                      })();

                      return (
                        <div key={p.payment_id || p.order_id || idx}
                          className="rounded-lg border hover:shadow-lg transition-all"
                          style={{ background: "var(--theme-surface)", borderColor: "var(--theme-border)" }}>

                          {/* Compact Top Row */}
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b" style={{ borderColor: "var(--theme-border)" }}>
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide"
                                style={{
                                  background: p.status === 'success' ? '#dcfce7' : p.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                  color: p.status === 'success' ? '#166534' : p.status === 'pending' ? '#854d0e' : '#991b1b'
                                }}>
                                {p.status || "—"}
                              </span>
                              <span className="text-xs font-medium" style={{ color: "var(--theme-textSecondary)" }}>
                                {dt}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <div className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
                                ₹{(Number(p.paid_amount) || 0).toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded"
                                style={{ background: "var(--theme-components-card-bg)", color: "var(--theme-textSecondary)" }}>
                                {p.mode || "—"}
                              </div>
                            </div>
                          </div>

                          {/* Compact Details Grid */}
                          <div className="px-4 py-3">
                            <div className="grid grid-cols-12 gap-x-4 gap-y-2 text-sm">
                              {/* Plan */}
                              <div className="col-span-12 md:col-span-5">
                                <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                                  Plan
                                </div>
                                <div className="font-medium" style={{ color: "var(--theme-text)" }}>
                                  {plan?.name || "—"}
                                  {typeof plan?.price === "number" && (
                                    <span className="text-xs font-normal ml-1.5" style={{ color: "var(--theme-textSecondary)" }}>
                                      ₹{plan.price}
                                    </span>
                                  )}
                                  {typeof plan?.discount_percent === "number" && plan.discount_percent > 0 && (
                                    <span className="text-xs font-semibold ml-1.5 px-1 py-0.5 rounded" style={{ background: "#fef3c7", color: "#854d0e" }}>
                                      {plan.discount_percent}% off
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Billing */}
                              <div className="col-span-6 md:col-span-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                                  Billing
                                </div>
                                <div className="font-medium" style={{ color: "var(--theme-text)" }}>{p.billing_cycle || "—"}</div>
                              </div>

                              {/* Active Status */}
                              <div className="col-span-6 md:col-span-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                                  Active
                                </div>
                                <div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {p.is_active ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>

                              {/* Calls - Compact inline */}
                              {typeof p.call === "number" && (
                                <div className="col-span-12 md:col-span-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                                    Calls
                                  </div>
                                  <div className="text-xs font-medium" style={{ color: "var(--theme-text)" }}>
                                    <span className="font-bold">{p.used_calls ?? 0}</span>
                                    <span className="mx-0.5" style={{ color: "var(--theme-textSecondary)" }}>/</span>
                                    <span className="font-bold">{p.call ?? 0}</span>
                                    <span className="ml-1" style={{ color: "var(--theme-textSecondary)" }}>
                                      ({p.remaining_calls ?? 0} left)
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Services */}
                              <div className="col-span-12">
                                <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--theme-textSecondary)" }}>
                                  Services
                                </div>
                                <div className="text-xs leading-relaxed" style={{ color: "var(--theme-text)" }}>{services || "—"}</div>
                              </div>

                              {/* Taxes - Inline compact */}
                              {(p.cgst || p.sgst || p.igst) && (
                                <div className="col-span-12 pt-2 mt-1 border-t" style={{ borderColor: "var(--theme-border)" }}>
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--theme-textSecondary)" }}>
                                      Tax ({p.gst_type || "—"}):
                                    </span>
                                    <div className="flex gap-3 text-xs font-medium">
                                      {Number(p.cgst) > 0 && <span style={{ color: "var(--theme-text)" }}>CGST ₹{Number(p.cgst).toLocaleString("en-IN")}</span>}
                                      {Number(p.sgst) > 0 && <span style={{ color: "var(--theme-text)" }}>SGST ₹{Number(p.sgst).toLocaleString("en-IN")}</span>}
                                      {Number(p.igst) > 0 && <span style={{ color: "var(--theme-text)" }}>IGST ₹{Number(p.igst).toLocaleString("en-IN")}</span>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
