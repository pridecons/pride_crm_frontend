"use client";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { CheckCircle, ChevronDown, ChevronRight, Clock, FileText, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import InvoiceModal from "@/components/Lead/InvoiceList";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";
import { useTheme } from "@/context/ThemeContext";

/* -------------------- Pure helpers (safe at module top) -------------------- */
const DAY_OPTIONS = [
  { value: 1, label: "Today" },
  { value: 7, label: "Last 7 days" },
  { value: 15, label: "Last 15 days" },
  { value: 30, label: "Last 30 days" },
  { value: 60, label: "Last 60 days" },
  { value: 90, label: "Last 90 days" },
  { value: 180, label: "Last 180 days" },
  { value: 365, label: "Last 365 days" },
];

function ymd(d) {
  const z = new Date(d);
  const off = z.getTimezoneOffset();
  z.setMinutes(z.getMinutes() - off);
  return z.toISOString().slice(0, 10);
}
function daysToRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (Number(days || 1) - 1));
  return { from: ymd(start), to: ymd(end) };
}

/* -------------------- Display + general helpers -------------------- */
/* ---------- tiny inline spinner for toolbar ---------- */
const InlineSpinner = ({ label = "Loading..." }) => (
  <span className="inline-flex items-center gap-2 text-sm text-[var(--theme-text-muted)]">
    <span
      aria-hidden
      className="h-4 w-4 inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
    />
    {label}
  </span>
);

const invoiceChipBase =
  "inline-flex items-center gap-1.5 min-w-[92px] h-7 px-3 rounded-full text-xs font-bold tracking-wide select-none whitespace-nowrap";

// turn string/array/empty into a clean array for rendering
const toArray = (v) => (Array.isArray(v) ? v : isBlank(v) ? [] : [String(v)]);

/* -------------------- Display helpers -------------------- */
const DASH = "—";
const isBlank = (v) => v === null || v === undefined || String(v).trim() === "";
const show = (v) => (isBlank(v) ? DASH : String(v));
const showDateTime = (v) => (isBlank(v) ? DASH : new Date(v).toLocaleString());
const showINR = (n) =>
  n === null || n === undefined || n === "" ? DASH : `₹${Number(n).toLocaleString("en-IN")}`;
const showList = (arr) =>
  Array.isArray(arr) && arr.length ? arr.map((x) => show(x)).join(", ") : DASH;

const DEFAULT_LIMIT = 100;

const isEmail = (s = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase());
const onlyDigits = (s = "") => s.replace(/[^\d]/g, "");
const isPhoneLike = (s = "") => onlyDigits(s).length >= 1;

function parseClientQuery(q = "") {
  const trimmed = q.trim();
  if (!trimmed) return { name: "", email: "", phone_number: "" };
  if (isEmail(trimmed)) return { name: "", email: trimmed, phone_number: "" };
  if (isPhoneLike(trimmed)) return { name: "", email: "", phone_number: onlyDigits(trimmed) };
  return { name: trimmed, email: "", phone_number: "" };
}

/* -------------------- Reusable Tailwind classnames -------------------- */
const inputClass =
  "px-3 py-2 border rounded-md w-full outline-none transition " +
  "border-[var(--theme-border)] bg-[var(--theme-input-background)] text-[var(--theme-text)] " +
  "placeholder-[var(--theme-text-muted)] focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent";
const badgeBase =
  "inline-flex items-center justify-center w-24 h-6 px-2.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap";
const thBase =
  "bg-transparent uppercase tracking-wider font-semibold text-[var(--theme-primary-contrast)]";

const btnPrimary =
  "px-3 py-1.5 rounded bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] hover:bg-[var(--theme-primary-hover)]";
const btnSecondary =
  "px-3 py-1.5 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]";

/* =========================== Component =========================== */
export default function PaymentHistoryPage() {
  const { theme, themeConfig, toggleTheme } = useTheme();
  // Role/branch state
  const [role, setRole] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const router = useRouter();
  const [openRowId, setOpenRowId] = useState(null);

  // Service/plan filters
  const [services, setServices] = useState([]);
  const [service, setService] = useState("");
  const [plans, setPlans] = useState([]);
  const [plan, setPlan] = useState("");

  const [selectedLeadId, setSelectedLeadId] = useState(null);

  // ===== Global Client Search (name/email/phone) =====
  const [clientQuery, setClientQuery] = useState("");
  const [debouncedClientQuery, setDebouncedClientQuery] = useState(clientQuery);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Locked (applied) client filter
  const [clientFilter, setClientFilter] = useState({
    name: "",
    email: "",
    phone_number: "",
  });

  // Employee (raised_by) filter
  const [userSearch, setUserSearch] = useState("");
  const [userSuggestions, setUserSuggestions] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [userHL, setUserHL] = useState(0);

  // ---- Applied date range (single source of truth) ----
  const [date_from, setDateFromApplied] = useState("");
  const [date_to, setDateToApplied] = useState("");

  // Paging
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [offset, setOffset] = useState(0);

  // Data states
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  // View scope for non-managers
  const [myView, setMyView] = useState("self");

  const isFirstLoadRef = React.useRef(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchAbortRef = React.useRef(null);

  // Pagination derived values
  const page = Math.floor(offset / (limit || 1)) + 1;
  const pageCount = Math.max(1, Math.ceil((total || 0) / (limit || 1)));

  const goToPage = React.useCallback(
    (n) => {
      const target = Math.min(Math.max(1, n), pageCount);
      setOffset((target - 1) * limit);
    },
    [limit, pageCount]
  );

  const pageRange = React.useCallback(
    (center, count = 5) => {
      if (pageCount <= count) return Array.from({ length: pageCount }, (_, i) => i + 1);
      const half = Math.floor(count / 2);
      let start = Math.max(1, center - half);
      let end = Math.min(pageCount, start + count - 1);
      if (end - start + 1 < count) start = Math.max(1, end - count + 1);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    },
    [pageCount]
  );

  // Debounce global client query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientQuery(clientQuery), 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  // Auth + branches
  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      router.push("/login");
      return;
    }
    const decoded = jwtDecode(token);

    const userRole = (decoded.role_name || "").toUpperCase();
    setRole(userRole);

    if (userRole === "BRANCH_MANAGER") {
      setBranchId(decoded.branch_id?.toString() || "");
    }
    if (userRole === "SUPERADMIN" || userRole === "BRANCH_MANAGER") {
      setMyView("all");
    } else {
      setMyView("self");
    }

    axiosInstance
      .get("/branches/")
      .then((res) => setBranches(res.data.branches || res.data || []))
      .catch(() => setBranches([]));
  }, [router]);

  // Services list
  useEffect(() => {
    axiosInstance
      .get("/profile-role/recommendation-type/")
      .then((res) => setServices(res.data))
      .catch(() => { });
  }, []);

  // Plans (by service)
  useEffect(() => {
    const url = !service ? "/services/" : `/services/?service=${encodeURIComponent(service)}`;
    axiosInstance
      .get(url)
      .then((res) => setPlans(res.data || []))
      .catch(() => setPlans([]));
    setPlan("");
    setOffset(0);
  }, [service]);

  /* ---------------- Permissions + slide-over draft (INSIDE component) ---------------- */
  const canPickBranch = role === "SUPERADMIN" || role === "BRANCH_MANAGER";
  const canSearchEmployees = role === "SUPERADMIN" || role === "BRANCH_MANAGER";
  const isManagerOnly = role === "BRANCH_MANAGER";
  const isNonManager = !(role === "SUPERADMIN" || role === "BRANCH_MANAGER");
  const isEmployeeOnly = !(role === "SUPERADMIN" || role === "BRANCH_MANAGER");

  // Draft panel state
  const baseDefaults = React.useMemo(
    () => ({
      days: 30,
      fromDate: "",
      toDate: "",
      view: canPickBranch ? "all" : "self",
      branchId: canPickBranch ? (branchId || "") : "",
      service: service || "",
      planId: plan || "",
      employeeId: selectedUserId || "",
      clientText: clientQuery || "",
    }),
    [canPickBranch, branchId, service, plan, selectedUserId, clientQuery]
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState(baseDefaults);

  useEffect(() => {
    setDraft(baseDefaults);
  }, [baseDefaults]);

  const openFilters = () => {
    setDraft({
      days: date_from && date_to ? null : 30,
      fromDate: date_from || "",
      toDate: date_to || "",
      view: isEmployeeOnly ? "self" : myView,
      branchId: canPickBranch ? branchId || "" : "",
      service: service || "",
      planId: plan || "",
      employeeId: selectedUserId || "",
      clientText: clientQuery || "",
    });
    setFiltersOpen(true);
  };

  // Reset everything to truly blank defaults (no date range)
  const resetAll = () => {
    // 1) Dates — clear to remove chips & constraints
    setDateFromApplied("");
    setDateToApplied("");

    // 2) Filters
    setService("");
    setPlan("");

    // 3) Employee (raised_by)
    setSelectedUserId("");
    setSelectedUserName("");
    setUserSearch("");
    setShowUserDropdown(false);
    setUserSuggestions([]);

    // 4) Client filter + UI
    setClientFilter({ name: "", email: "", phone_number: "" });
    setClientQuery("");
    setShowClientDropdown(false);
    setClientSuggestions([]);

    // 5) Branch + scope
    if (canPickBranch) setBranchId("");     // SUPERADMIN can go back to all branches
    setMyView(canPickBranch ? "all" : "self");

    // 6) Paging
    setOffset(0);
  };

  const hasActive = React.useMemo(() => {
    const isCustomDate = !!date_from || !!date_to;
    const notBaseView = isEmployeeOnly ? myView !== "self" : myView !== "all";
    const branchMoved = canPickBranch && String(branchId) !== "";
    return (
      isCustomDate ||
      service ||
      plan ||
      selectedUserId ||
      clientQuery ||
      notBaseView ||
      branchMoved
    );
  }, [
    date_from,
    date_to,
    isEmployeeOnly,
    myView,
    canPickBranch,
    branchId,
    service,
    plan,
    selectedUserId,
    clientQuery,
  ]);

  /* ---------------- Employee (raised_by) suggestions ---------------- */
  useEffect(() => {
    if (!canSearchEmployees) {
      setUserSuggestions([]);
      setShowUserDropdown(false);
      return;
    }

    const search = userSearch.trim();
    if (!search) {
      setUserSuggestions([]);
      setShowUserDropdown(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const params = {
          search,
          limit: 10,
          branch_id: isManagerOnly ? branchId : undefined,
        };

        const res = await axiosInstance.get(`/users/`, {
          params,
          signal: controller.signal,
        });

        const raw = Array.isArray(res?.data?.data) ? res.data.data : [];
        const list = raw.map((u) => ({
          id: u.id ?? u.user_id ?? u.employee_code ?? u.email ?? u.phone ?? u.name,
          name: u.name ?? "",
          role: u.role ?? "",
          email: u.email ?? u.official_email ?? "",
          phone: u.phone ?? u.phone_number ?? u.mobile ?? "",
        }));
        setUserSuggestions(list);
        setUserHL(0);
        setShowUserDropdown(list.length > 0);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          setUserSuggestions([]);
          setShowUserDropdown(false);
        }
      }
    }, 200);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, role, branchId]);

  /* ---------------- Client suggestions with role restrictions ---------------- */
  useEffect(() => {
    const q = debouncedClientQuery.trim();
    if (!q) {
      setClientSuggestions([]);
      setShowClientDropdown(false);
      return;
    }

    const base = parseClientQuery(q);
    const digits = onlyDigits(q);
    const isPhoneSearch = !!digits;
    const shortPhone = isPhoneSearch && digits.length < 10;

    const controller = new AbortController();
    const t = setTimeout(() => {
      (async () => {
        try {
          const params = {
            name: isPhoneSearch ? undefined : base.name || undefined,
            email: base.email || undefined,
            phone_number: !shortPhone && isPhoneSearch ? digits : undefined,
            phone_contains: shortPhone ? digits : undefined,
            limit: 20,
            offset: 0,
            view: isNonManager ? myView : undefined,
            branch_id: isManagerOnly ? Number(branchId) : undefined,
          };

          const res = await axiosInstance.get(`/payment/all/employee/history`, {
            params,
            signal: controller.signal,
          });

          let list = Array.isArray(res?.data?.payments)
            ? res.data.payments
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];

          // broader pass if searching short mobile
          if (list.length === 0 && shortPhone) {
            const res2 = await axiosInstance.get(`/payment/all/employee/history`, {
              params: { ...params, limit: 200, offset: 0 },
              signal: controller.signal,
            });
            list = Array.isArray(res2?.data?.payments)
              ? res2.data.payments
              : Array.isArray(res2?.data?.data)
                ? res2.data.data
                : [];
          }

          const seen = new Set();
          const uniq = [];
          for (const p of list) {
            const key =
              (p.email && `e:${p.email}`) ||
              (p.phone_number && `m:${p.phone_number}`) ||
              (p.name && `n:${p.name}`) ||
              `id:${p.id}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniq.push({
                id: p.lead_id || p.id,
                name: p.name || "",
                email: p.email || "",
                phone_number: p.phone_number || "",
              });
            }
          }

          const qLower = q.toLowerCase();
          const filtered = uniq.filter((c) => {
            const phoneDigits = onlyDigits(c.phone_number || "");
            return (
              (c.name || "").toLowerCase().includes(qLower) ||
              (c.email || "").toLowerCase().includes(qLower) ||
              (digits ? phoneDigits.includes(digits) : false)
            );
          });

          setClientSuggestions(filtered.slice(0, 10));
          setShowClientDropdown(filtered.length > 0);
        } catch (err) {
          if (err.name !== "CanceledError" && err.name !== "AbortError") {
            setClientSuggestions([]);
            setShowClientDropdown(false);
          }
        }
      })();
    }, 150);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedClientQuery, role, branchId, myView]);

  /* ---------------- Handlers ---------------- */
  const handleUserSelect = (user) => {
    setSelectedUserId(user.id || user.employee_code || user.user_id || "");
    setSelectedUserName(user.name || "");
    setUserSearch(user.name || "");
    setShowUserDropdown(false);
    setOffset(0);
  };

  const clearSelectedUser = () => {
    setSelectedUserId("");
    setSelectedUserName("");
    setUserSearch("");
    setOffset(0);
  };

  const handleClientSelect = (c) => {
    setClientFilter({
      name: c.name || "",
      email: c.email || "",
      phone_number: c.phone_number || "",
    });
    const pretty = [c.name, c.email, c.phone_number].filter(Boolean).join(" — ");
    setClientQuery(pretty);
    setShowClientDropdown(false);
    setOffset(0);
  };

  const clearClientFilter = () => {
    setClientFilter({ name: "", email: "", phone_number: "" });
    setClientQuery("");
    setClientSuggestions([]);
    setShowClientDropdown(false);
    setOffset(0);
  };

  /* ---------------- Fetch payments with ALL filters ---------------- */
  const fetchPayments = async () => {
    // decide whether to block UI or just show a light refresh
    const blockUI = isFirstLoadRef.current || payments.length === 0;
    if (blockUI) setLoading(true); else setRefreshing(true);
    setError("");

    // abort any in-flight request
    try { fetchAbortRef.current?.abort?.(); } catch { }
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const branchParam =
        canPickBranch && branchId !== "" && branchId !== null && branchId !== undefined
          ? Number(branchId)
          : undefined;

      const raisedByParam = canSearchEmployees ? selectedUserId || undefined : undefined;

      const parsed =
        clientFilter.name || clientFilter.email || clientFilter.phone_number
          ? clientFilter
          : parseClientQuery(clientQuery);

      const params = {
        service: service || undefined,
        plan_id: plan || undefined,
        name: parsed.name || undefined,
        email: parsed.email || undefined,
        phone_number: parsed.phone_number || undefined,
        branch_id: branchParam,
        branch: branchParam,
        date_from: date_from || undefined,
        date_to: date_to || undefined,
        limit,
        offset,
        user_id: raisedByParam,
        raised_by: raisedByParam,
        view: canPickBranch ? "all" : myView,
      };
      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null) delete params[k];
      });

      const { data } = await axiosInstance.get("/payment/all/employee/history", {
        params,
        signal: controller.signal,
      });

      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err?.name !== "CanceledError" && err?.name !== "AbortError") {
        const msg =
          err?.response?.data?.detail?.message ||
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to fetch payment history.";
        setError(msg);
      }
    } finally {
      if (blockUI) setLoading(false); else setRefreshing(false);
      isFirstLoadRef.current = false;
      fetchAbortRef.current = null;
    }
  };

  // Auto-fetch when applied filters change
  useEffect(() => {
    if (role) fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    role,
    branchId,
    service,
    plan,
    clientFilter,
    selectedUserId,
    date_from,
    date_to,
    limit,
    offset,
    myView,
  ]);

  // Full-screen first load
  if (loading && payments.length === 0) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--theme-background)] text-[var(--theme-text)]">
        <LoadingState message="Fetching payments..." />
      </div>
    );
  }

  return (
    <div className="mx-2 px-4 py-8 bg-[var(--theme-background)] text-[var(--theme-text)] min-h-screen">
      {/* Toolbar (applied chips) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">All Employee Payment History</h2>

        <div className="flex items-center gap-2">
          {date_from && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded border text-xs"
              style={{ background: "var(--theme-components-tag-info-bg)", color: "var(--theme-components-tag-info-text)", borderColor: "var(--theme-components-tag-info-border)" }}>
              From: {date_from}
            </span>
          )}
          {date_to && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded border text-xs"
              style={{ background: "var(--theme-components-tag-info-bg)", color: "var(--theme-components-tag-info-text)", borderColor: "var(--theme-components-tag-info-border)" }}>
              To: {date_to}
            </span>
          )}
          {service && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded border text-xs"
              style={{
                background: "var(--theme-components-tag-accent-bg)",
                color: "var(--theme-components-tag-accent-text)",
                borderColor: "var(--theme-components-tag-accent-border)"
              }}>
              Service: {service}
            </span>
          )}
          {plan && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded border text-xs"
              style={{
                background: "var(--theme-components-tag-accent-bg)",
                color: "var(--theme-components-tag-accent-text)",
                borderColor: "var(--theme-components-tag-accent-border)"
              }}>
              Plan: {plan}
            </span>
          )}
          {selectedUserId && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded bg-emerald-50 text-emerald-700 text-xs">
              Raised by: {selectedUserName || selectedUserId}
            </span>
          )}
          {clientQuery && (
            <span className="hidden md:inline-flex px-3 py-1.5 rounded bg-purple-50 text-purple-700 text-xs">
              Client: {clientQuery}
            </span>
          )}

          {hasActive && (
            <button
              onClick={resetAll}
              className={`hidden md:inline-flex ${btnSecondary} text-xs font-medium`}
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={openFilters}
            className={`${btnPrimary} text-sm`}
            title="Open filters"
          >
            <SlidersHorizontal className="h-6 w-5" />
          </button>
          {refreshing && <InlineSpinner />}

        </div>
      </div>

      {/* Scope toggle for non-managers */}
      {!(role === "SUPERADMIN" || role === "BRANCH_MANAGER") && (
        <div className="mb-4 inline-flex rounded-md shadow-sm" role="group">
          {["self", "other"].map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setMyView(v)}
              className={`px-4 py-2 text-sm font-medium transition border-[var(--theme-border)] ${myView === v
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)] shadow-md"
                  : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                } ${i === 0 ? "rounded-l-lg" : "rounded-r-lg"}`}
            >
              {v === "self" ? "My Payments" : "Team Payments"}
            </button>
          ))}
        </div>
      )}

      {/* Branch chips */}
      {/* Branch chips — visible only to SUPERADMIN */}
      {role === "SUPERADMIN" && (
        <div className="bg-[var(--theme-card-bg)] border border-[var(--theme-border)] p-4 rounded-lg shadow mb-6 gap-4">
          <div className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => {
                setBranchId("");
                setOffset(0);
              }}
              className={`px-4 py-2 rounded border border-[var(--theme-border)] ${branchId === ""
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
                  : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                }`}
            >
              All Branches
            </button>

            {branches.map((b) => {
              const bid = b.id ?? b.branch_id;
              const isActive = String(branchId) === String(bid);
              return (
                <button
                  key={bid}
                  onClick={() => {
                    setBranchId(String(bid));
                    setOffset(0);
                  }}
                  className={`px-4 py-2 rounded border border-[var(--theme-border)] ${isActive
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                    }`}
                >
                  {b.name || b.branch_name || `Branch ${bid}`}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* Filters (keep service/plan/client/employee inline for convenience) */}
      <div className="bg-[var(--theme-card-bg)] border border-[var(--theme-border)] p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          className={inputClass}
          value={service}
          onChange={(e) => {
            setService(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All Service</option>
          {services.map((s, idx) => (
            <option key={idx} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className={inputClass}
          value={plan}
          onChange={(e) => {
            setPlan(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All Plan</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — ₹{p.discounted_price}
            </option>
          ))}
        </select>

        {/* Global Client Search */}
        <div className="relative">
          <input
            className={inputClass}
            type="text"
            placeholder="Search client by name, email, or mobile"
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const parsed = parseClientQuery(clientQuery);
                setClientFilter(parsed);
                setOffset(0);
                setShowClientDropdown(false);
              }
            }}
            onFocus={() => {
              if (clientSuggestions.length > 0) setShowClientDropdown(true);
            }}
          />
          {(clientFilter.name || clientFilter.email || clientFilter.phone_number) && (
            <div
              className="mt-1 inline-flex items-center text-xs px-2 py-1 rounded border"
              style={{
                background: "var(--theme-components-tag-info-bg)",
                color: "var(--theme-components-tag-info-text)",
                borderColor: "var(--theme-components-tag-info-border)"
              }}
            >
              {[clientFilter.name, clientFilter.email, clientFilter.phone_number]
                .filter(Boolean)
                .join(" • ")}
              <button
                onClick={clearClientFilter}
                className="ml-2 text-indigo-600 hover:text-indigo-800"
                title="Clear"
              >
                ✕
              </button>
            </div>
          )}
          {showClientDropdown && clientSuggestions.length > 0 && (
            <ul className="absolute z-20 bg-[var(--theme-card-bg)] border border-[var(--theme-border)] w-full max-h-56 overflow-y-auto rounded shadow">
              {clientSuggestions.map((c, idx) => (
                <li
                  key={`${c.id}-${idx}`}
                  onClick={() => handleClientSelect(c)}
                  className="px-3 py-2 hover:bg-[var(--theme-primary-softer)] cursor-pointer"
                >
                  <div className="font-medium">{c.name || "(No name)"}</div>
                  <div className="text-xs text-[var(--theme-text-muted)]">
                    {show(c.email)} • {show(c.phone_number)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Employee (raised_by) */}
        <div className="relative">
          <input
            className={inputClass}
            type="text"
            placeholder={
              canSearchEmployees ? "Search employee (raised by)..." : "Search employee (raised by)"
            }
            value={userSearch}
            onChange={(e) => {
              if (!canSearchEmployees) return;
              setUserSearch(e.target.value);
              setShowUserDropdown(true);
            }}
            disabled={!canSearchEmployees}
            onKeyDown={(e) => {
              if (!canSearchEmployees || !showUserDropdown || userSuggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setUserHL((i) => Math.min(i + 1, userSuggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setUserHL((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const pick = userSuggestions[userHL];
                if (pick) handleUserSelect(pick);
              } else if (e.key === "Escape") {
                setShowUserDropdown(false);
              }
            }}
            onFocus={() => {
              if (canSearchEmployees && userSuggestions.length > 0) setShowUserDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowUserDropdown(false), 120)}
          />

          {canSearchEmployees && selectedUserId && (
            <div className="mt-1 inline-flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              {selectedUserName || selectedUserId}
              <button
                onClick={clearSelectedUser}
                className="ml-2 text-blue-600 hover:text-blue-800"
                title="Clear"
              >
                ✕
              </button>
            </div>
          )}

          {canSearchEmployees && showUserDropdown && userSuggestions.length > 0 && (
            <ul className="absolute z-10 bg-[var(--theme-card-bg)] border border-[var(--theme-border)] w-full max-h-48 overflow-y-auto rounded shadow">
              {userSuggestions.map((u, idx) => (
                <li
                  key={u.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUserSelect(u)}
                  className={`px-3 py-2 cursor-pointer ${idx === userHL ? "bg-[var(--theme-primary-softer)]" : "hover:bg-[var(--theme-primary-softer)]"
                    }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{u.name || "Unknown"}</span>
                    {u.role ? <span className="text-xs text-gray-500">{u.role}</span> : null}
                  </div>
                  <div className="text-xs text-[var(--theme-text-muted)]">
                    {u.email || "—"} • {u.phone || "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="rounded px-4 py-2 mb-4 border"
          style={{
            background: "var(--theme-components-tag-error-bg)",
            color: "var(--theme-components-tag-error-text)",
            borderColor: "var(--theme-components-tag-error-border)",
          }}
        >
          {error}
        </div>
      )}
      {!loading && !error && payments.length === 0 && (
        <div className="text-center py-10 text-[var(--theme-text-muted)]">No records found.</div>
      )}

      {/* Page size */}
      {/* Page size — show only when there are results */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-[var(--theme-text-muted)]">Payments per page:</span>
          <select
            className="px-2 py-1 border rounded"
            style={{
              background: "var(--theme-input-background)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-input-border)"
            }}
            value={limit}
            onChange={(e) => {
              const v = Number(e.target.value) || DEFAULT_LIMIT;
              setLimit(v);
              setOffset(0);
            }}
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="relative max-h-[70vh] overflow-auto rounded-lg shadow border border-[var(--theme-border)]">
          {loading && payments.length > 0 && (
            <div className="absolute inset-0 z-20 grid place-items-center bg-black/5 backdrop-blur-[1px]">
              <InlineSpinner label="Updating..." />
            </div>
          )}
          <table className="min-w-full bg-[var(--theme-card-bg)] text-sm text-[var(--theme-text)]">
            <thead
              className="sticky top-0 z-10"
              style={{ backgroundImage: "linear-gradient(to right, var(--theme-primary), var(--theme-primary-hover))" }}
            >
              <tr>
                {[
                  { label: "", align: "center" },
                  { label: "Name", align: "left" },
                  { label: "Email", align: "center" },
                  { label: "Phone", align: "center" },
                  { label: "Amount", align: "center" },
                  { label: "Status", align: "center" },
                  { label: "Date (MM/DD/YYYY)", align: "center" },
                  { label: "Send Invoice", align: "center" },
                  { label: "Invoice", align: "center" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`${thBase} py-2 px-3 ${align === "left" ? "text-left" : "text-center"}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <React.Fragment key={p.id}>
                  {/* Main Row */}
                  <tr
                    className="hover:bg-[var(--theme-primary-softer)] cursor-pointer"
                    onClick={() => setOpenRowId(openRowId === p.id ? null : p.id)}
                  >
                    <td className="py-2 px-2 text-center w-8">
                      <button
                        type="button"
                        aria-label={openRowId === p.id ? "Collapse details" : "Expand details"}
                        aria-expanded={openRowId === p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenRowId(openRowId === p.id ? null : p.id);
                        }}
                        className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-[var(--theme-primary-softer)] transition"
                      >
                        {openRowId === p.id ? (
                          <ChevronDown className="w-5 h-5 strokeWidth={3}" />
                        ) : (
                          <ChevronRight className="w-5 h-5 strokeWidth={3}" />
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-3 text-left">{show(p.name)}</td>
                    <td className="py-2 px-3 text-center">{show(p.email)}</td>
                    <td className="py-2 px-3 text-center">{show(p.phone_number)}</td>
                    <td className="py-2 px-3 font-semibold text-center">{showINR(p.paid_amount)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center">
                        <span
                          className={`${badgeBase} border`}
                          style={{
                            background: p.status === "PAID"
                              ? "var(--theme-components-tag-success-bg)"
                              : (p.status === "ACTIVE" || p.status === "PENDING")
                                ? "var(--theme-components-tag-warning-bg)"
                                : "var(--theme-components-tag-neutral-bg)",
                            color: p.status === "PAID"
                              ? "var(--theme-components-tag-success-text)"
                              : (p.status === "ACTIVE" || p.status === "PENDING")
                                ? "var(--theme-components-tag-warning-text)"
                                : "var(--theme-components-tag-neutral-text)",
                            borderColor: p.status === "PAID"
                              ? "var(--theme-components-tag-success-border)"
                              : (p.status === "ACTIVE" || p.status === "PENDING")
                                ? "var(--theme-components-tag-warning-border)"
                                : "var(--theme-components-tag-neutral-border)",
                          }}
                        >
                          {show(p.status === "ACTIVE" ? "PENDING" : p.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">{showDateTime(p.created_at)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center">
                        {p.is_send_invoice ? (
                          <span className={invoiceChipBase} style={{ color: "var(--theme-success)" }}>
                            <CheckCircle className="w-4 h-4" />
                            Done
                          </span>
                        ) : (
                          <span className={invoiceChipBase} style={{ color: "var(--theme-warning)" }}>
                            <Clock className="w-4 h-4" />
                            Pending
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center justify-center gap-2">
                        {p.is_send_invoice ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadId(p.lead_id);
                            }}
                            className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Invoice</span>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm font-medium">{DASH}</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Accordion Row */}
                  {openRowId === p.id && (
                    <tr className="bg-[var(--theme-surface)]">
                      <td colSpan={8} className="py-2 px-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Raised By */}
                          <div>
                            <p className="text-[var(--theme-text-muted)]">Raised By</p>
                            <p className="font-medium">
                              {show(p.raised_by)}{" "}
                              {show(p.raised_by_role) !== DASH ? `(${p.raised_by_role})` : ""}
                            </p>
                            {(p.raised_by_phone || p.raised_by_email) && (
                              <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                {p.raised_by_phone ? <div>📞 {show(p.raised_by_phone)}</div> : null}
                                {p.raised_by_email ? <div>✉️ {show(p.raised_by_email)}</div> : null}
                              </div>
                            )}
                          </div>

                          {/* Payment Mode */}
                          <div>
                            <p className="text-gray-500">Payment Mode</p>
                            <p className="font-medium">{show(p.mode)}</p>
                          </div>

                          {/* Service (API now sends a string) */}
                          <div>
                            <p className="text-gray-500">Service</p>
                            <div>
                              {toArray(p.Service).length
                                ? toArray(p.Service).map((s, i) => (
                                  <span key={i} className="block">
                                    {show(s)}
                                  </span>
                                ))
                                : DASH}
                            </div>
                          </div>

                          {/* Plan(s) */}
                          <div>
                            <p className="text-gray-500">Plan(s)</p>
                            <div className="space-y-2">
                              {Array.isArray(p.plan) && p.plan.length ? (
                                p.plan.map((pl) => (
                                  <div key={pl.id} className="rounded border border-gray-200 p-2">
                                    <div className="flex flex-wrap items-center gap-x-2">
                                      <span className="font-semibold">{show(pl.name)}</span>
                                      {pl.billing_cycle ? (
                                        <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                          {show(pl.billing_cycle)}
                                        </span>
                                      ) : null}
                                    </div>
                                    {pl.service_type?.length ? (
                                      <div className="text-xs text-gray-600 mt-0.5">
                                        {pl.service_type.join(", ")}
                                      </div>
                                    ) : null}
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {show(pl.description)}
                                    </div>
                                    <div className="text-xs mt-1">
                                      Price: {showINR(pl.price)}
                                      {pl.discounted_price
                                        ? ` • Discounted: ${showINR(pl.discounted_price)}`
                                        : ""}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <span>{DASH}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Invoice modal */}
          <InvoiceModal
            isOpen={!!selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            leadId={selectedLeadId}
          />

          {/* Pagination */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-4 px-2">
            {/* Left: range + page info */}
            <span className="text-[var(--theme-text-muted)]">
              Showing {total === 0 ? 0 : offset + 1}
              {"-"}
              {Math.min(offset + payments.length, total)} of {total}{" "}
              <span className="text-gray-500">(Page {page} of {pageCount})</span>
            </span>

            {/* Right: controls */}
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                onClick={() => goToPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-60 hover:bg-[var(--theme-primary-softer)]"
                title="First"
              >
                «
              </button>
              {/* Prev */}
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-60 hover:bg-[var(--theme-primary-softer)]"
              >
                Prev
              </button>

              {/* Numbered window */}
              {page > 3 && pageCount > 5 && (
                <button
                  onClick={() => goToPage(1)}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  1
                </button>
              )}
              {page > 4 && pageCount > 6 && <span className="px-2 text-gray-500">…</span>}

              {pageRange(page, 5).map((n) => (
                <button
                  key={n}
                  onClick={() => goToPage(n)}
                  className={`px-3 py-1 rounded border border-[var(--theme-border)] ${n === page
                      ? "bg-[var(--theme-primary)] text-[var(--theme-primary-contrast)]"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]"
                    }`}
                >
                  {n}
                </button>
              ))}

              {page < pageCount - 3 && pageCount > 6 && <span className="px-2 text-gray-500">…</span>}
              {page < pageCount - 2 && pageCount > 5 && (
                <button
                  onClick={() => goToPage(pageCount)}
                  className="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {pageCount}
                </button>
              )}

              {/* Next */}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount}
                className="px-3 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-60 hover:bg-[var(--theme-primary-softer)]"
              >
                Next
              </button>
              {/* Last */}
              <button
                onClick={() => goToPage(pageCount)}
                disabled={page >= pageCount}
                className="px-2 py-1 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] disabled:opacity-60 hover:bg-[var(--theme-primary-softer)]"
                title="Last"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Filters Panel */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === "Escape" && setFiltersOpen(false)}
        >
          <div className="absolute inset-0 bg-[var(--theme-backdrop)]" onClick={() => setFiltersOpen(false)} />

          <div className="absolute inset-y-0 right-0 w-full sm:w-[420px] bg-[var(--theme-card-bg)] text-[var(--theme-text)] border-l border-[var(--theme-border)] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--theme-border)] flex items-center justify-between">
              <SlidersHorizontal className="h-6 w-5" />
              <button className="text-gray-500" onClick={() => setFiltersOpen(false)}>
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Time Period (days) */}
              <div>
                <label className="text-sm font-medium mb-1 block">Time Period</label>
                <select
                  className={inputClass}
                  value={draft.days ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, days: Number(e.target.value) }))}
                >
                  <option value="">Custom range</option>
                  {DAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">From Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.fromDate}
                    onChange={(e) => setDraft((d) => ({ ...d, fromDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">To Date</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={draft.toDate}
                    onChange={(e) => setDraft((d) => ({ ...d, toDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* View */}
              {isEmployeeOnly ? (
                <div>
                  <label className="text-sm font-medium mb-1 block">View</label>
                  <select className={inputClass} value="self" disabled>
                    <option value="self">Self</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium mb-1 block">View</label>
                  <select
                    className={inputClass}
                    value={draft.view}
                    onChange={(e) => setDraft((d) => ({ ...d, view: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="self">Self</option>
                  </select>
                </div>
              )}

              {/* Branch (managers) */}
              {canPickBranch && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Branch</label>
                  <select
                    className={inputClass}
                    value={draft.branchId}
                    onChange={(e) => setDraft((d) => ({ ...d, branchId: e.target.value }))}
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => {
                      const bid = b.id ?? b.branch_id;
                      return (
                        <option key={bid} value={String(bid)}>
                          {b.name || b.branch_name || `Branch ${bid}`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex items-center justify-between">
              <button
                className={`${btnSecondary}`}
                onClick={() => setDraft(baseDefaults)}
              >
                Reset (Draft)
              </button>

              <div className="flex items-center gap-2">
                <button className="px-4 py-2 rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:bg-[var(--theme-primary-softer)]" onClick={() => setFiltersOpen(false)}>
                  Cancel
                </button>
                <button
                  className={`${btnPrimary}`}
                  onClick={() => {
                    // 1) Branch + view
                    if (canPickBranch) setBranchId(draft.branchId || "");
                    setMyView(isEmployeeOnly ? "self" : draft.view || "all");

                    // 2) Service/Plan
                    setService(draft.service || "");
                    setPlan(draft.planId || "");

                    // 3) Raised by
                    setSelectedUserId(draft.employeeId || "");
                    setSelectedUserName(""); // optional: resolve later by id

                    // 4) Client
                    setClientFilter({ name: "", email: "", phone_number: "" }); // clear locked filter
                    setClientQuery(draft.clientText || ""); // drives suggestions/parse

                    // 5) Dates: explicit > days > none
                    let nextFrom = draft.fromDate;
                    let nextTo = draft.toDate;
                    if (!nextFrom && !nextTo && draft.days) {
                      const r = daysToRange(draft.days);
                      nextFrom = r.from;
                      nextTo = r.to;
                    }
                    if (nextFrom && !nextTo) nextTo = nextFrom;
                    if (!nextFrom && nextTo) nextFrom = nextTo;

                    setDateFromApplied(nextFrom || "");
                    setDateToApplied(nextTo || "");

                    // 6) Start from first page
                    setOffset(0);

                    // 7) Close
                    setFiltersOpen(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 