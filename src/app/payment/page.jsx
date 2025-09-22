"use client";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { CheckCircle, Clock, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import InvoiceModal from "@/components/Lead/InvoiceList";
import { axiosInstance } from "@/api/Axios";
import LoadingState from "@/components/LoadingState";

// --- Pagination helpers (based on endpoint's limit/offset/total) ---


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
  "px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full";
const badgeBase =
  "inline-flex items-center justify-center w-24 h-6 px-2.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap";
const thBase =
  "bg-transparent text-white uppercase tracking-wider " +
  "shadow-[inset_0_-1px_0_rgba(255,255,255,0.15),0_1px_0_rgba(0,0,0,0.03)]";

/* =========================== Component =========================== */
export default function PaymentHistoryPage() {
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

  // ---- Date filter (draft vs applied) ----
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
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

  // Pagination derived values (use state inside component)
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

  /* ---------------- Permissions helpers for filters ---------------- */
  const canPickBranch = role === "SUPERADMIN" || role === "BRANCH_MANAGER";
  const canSearchEmployees = role === "SUPERADMIN" || role === "BRANCH_MANAGER";
  const isManagerOnly = role === "BRANCH_MANAGER";
  const isNonManager = !(role === "SUPERADMIN" || role === "BRANCH_MANAGER");

  // Employee (raised_by) suggestions
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

  // Global Client Suggestions (name/email/phone) with role restrictions
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

  // Handlers
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

  // Apply/Clear for dates
  const applyDateFilter = () => {
    if (dateFromDraft && !dateToDraft) {
      setDateFromApplied(dateFromDraft);
      setDateToApplied(dateFromDraft);
    } else if (!dateFromDraft && dateToDraft) {
      setDateFromApplied(dateToDraft);
      setDateToApplied(dateToDraft);
    } else {
      setDateFromApplied(dateFromDraft || "");
      setDateToApplied(dateToDraft || "");
    }
    setOffset(0);
  };

  const clearDateFilter = () => {
    setDateFromDraft("");
    setDateToDraft("");
    setDateFromApplied("");
    setDateToApplied("");
    setOffset(0);
  };

  // Fetch payments with ALL filters
  const fetchPayments = async () => {
    setLoading(true);
    setError("");
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

      const { data } = await axiosInstance.get("/payment/all/employee/history", { params });
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch (err) {
      const msg =
        err?.response?.data?.detail?.message ||
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to fetch payment history.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when filters (except draft dates) change
  useEffect(() => {
    if (role) fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, branchId, service, plan, clientFilter, selectedUserId, date_from, date_to, limit, offset, myView]);

  if (loading) return <LoadingState message="Fetching payments..." />;

  return (
    <div className="mx-2 px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">All Employee Payment History</h2>

      {/* Scope toggle for non-managers */}
      {!(role === "SUPERADMIN" || role === "BRANCH_MANAGER") && (
        <div className="mb-4 inline-flex rounded-md shadow-sm" role="group">
          {["self", "other"].map((v, i) => (
            <button
              key={v}
              type="button"
              onClick={() => setMyView(v)}
              className={`px-4 py-2 text-sm font-medium border transition ${myView === v
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                } ${i === 0 ? "rounded-l-lg" : "rounded-r-lg"}`}
            >
              {v === "self" ? "My Payments" : "Team Payments"}
            </button>
          ))}
        </div>
      )}

      {/* Branch chips */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 gap-4">
        {(role === "SUPERADMIN" || role === "BRANCH_MANAGER") && (
          <div className="flex space-x-2 overflow-x-auto">
            {role === "SUPERADMIN" && (
              <button
                onClick={() => {
                  setBranchId("");
                  setOffset(0);
                }}
                className={`px-4 py-2 rounded ${branchId === "" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
              >
                All Branches
              </button>
            )}
            {(role === "SUPERADMIN"
              ? branches
              : branches.filter((b) => String(b.id ?? b.branch_id) === String(branchId))
            ).map((b) => {
              const bid = b.id ?? b.branch_id;
              const isActive = String(branchId) === String(bid);
              return (
                <button
                  key={bid}
                  onClick={() => {
                    setBranchId(String(bid));
                    setOffset(0);
                  }}
                  disabled={role === "BRANCH_MANAGER"}
                  className={`px-4 py-2 rounded ${isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                    } ${role === "BRANCH_MANAGER" ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {b.name || b.branch_name || `Branch ${bid}`}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="mt-1 inline-flex items-center text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
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
            <ul className="absolute z-20 bg-white border border-gray-200 w-full max-h-56 overflow-y-auto rounded shadow">
              {clientSuggestions.map((c, idx) => (
                <li
                  key={`${c.id}-${idx}`}
                  onClick={() => handleClientSelect(c)}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <div className="font-medium">{c.name || "(No name)"}</div>
                  <div className="text-xs text-gray-500">
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
            <ul className="absolute z-10 bg-white border border-gray-200 w-full max-h-48 overflow-y-auto rounded shadow">
              {userSuggestions.map((u, idx) => (
                <li
                  key={u.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleUserSelect(u)}
                  className={`px-3 py-2 cursor-pointer ${idx === userHL ? "bg-blue-50" : "hover:bg-gray-100"
                    }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{u.name || "Unknown"}</span>
                    {u.role ? <span className="text-xs text-gray-500">{u.role}</span> : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    {u.email || "—"} • {u.phone || "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Date filter */}
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <input
            className={inputClass}
            type="date"
            value={dateFromDraft}
            onChange={(e) => setDateFromDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyDateFilter()}
            placeholder="From"
          />
          <input
            className={inputClass}
            type="date"
            value={dateToDraft}
            onChange={(e) => setDateToDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyDateFilter()}
            placeholder="To"
          />
          <button
            type="button"
            onClick={applyDateFilter}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearDateFilter}
            className="px-3 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 transition"
          >
            Clear
          </button>
          {(date_from || date_to) && (
            <span className="text-xs text-gray-600">
              Applied: {date_from}
              {date_to && date_to !== date_from ? ` → ${date_to}` : ""}
            </span>
          )}
        </div>

        <p className="md:col-span-2 text-xs text-gray-500 mt-1">
          Tip: Leave one side empty for a single-day filter — we’ll apply that same date as both{" "}
          <code className="px-1">from</code> and <code className="px-1">to</code>.
        </p>
      </div>

      {/* Results */}
      {loading && <LoadingState message="Fetching payments..." />}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded px-4 py-2 mb-4">
          {error}
        </div>
      )}
      {!loading && !error && payments.length === 0 && (
        <div className="text-gray-500 text-center py-10">No records found.</div>
      )}

      {/* Page size */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Payments per page:</span>
        <select
          className="px-2 py-1"
          value={limit}
          onChange={(e) => {
            const v = Number(e.target.value) || DEFAULT_LIMIT;
            setLimit(v);
            setOffset(0); // jump to first page on size change
          }}
        >
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {!loading && !error && payments.length > 0 && (
        <div className="relative max-h-[70vh] overflow-auto rounded-lg shadow">
          <table className="min-w-full bg-white text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600">
              <tr>
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Amount",
                  "Status",
                  "Date (MM/DD/YYYY)",
                  "Send Invoice",
                  "Invoice",
                ].map((h) => (
                  <th key={h} className={`${thBase} py-2 px-3 font-semibold text-center`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <React.Fragment key={p.id}>
                  {/* Main Row */}
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setOpenRowId(openRowId === p.id ? null : p.id)}
                  >
                    <td className="py-2 px-3 text-center">{show(p.name)}</td>
                    <td className="py-2 px-3 text-center">{show(p.email)}</td>
                    <td className="py-2 px-3 text-center">{show(p.phone_number)}</td>
                    <td className="py-2 px-3 font-semibold text-center">{showINR(p.paid_amount)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center">
                        <span
                          className={`${badgeBase} ${p.status === "PAID"
                            ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow"
                            : p.status === "ACTIVE" || p.status === "PENDING"
                              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow"
                              : "bg-gradient-to-br from-gray-400 to-gray-600 text-white"
                            }`}
                        >
                          {show(p.status === "ACTIVE" ? "PENDING" : p.status)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">{showDateTime(p.created_at)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center">
                        {p.is_send_invoice ? (
                          <span className={`${invoiceChipBase} text-green-500`}>
                            <CheckCircle className="w-4 h-4" />
                            Done
                          </span>
                        ) : (
                          <span className={`${invoiceChipBase} text-amber-500`}>
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
                    <tr className="bg-gray-50">
                      <td colSpan={8} className="py-2 px-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {/* Raised By */}
                          <div>
                            <p className="text-gray-500">Raised By</p>
                            <p className="font-medium">
                              {show(p.raised_by)} {show(p.raised_by_role) !== DASH ? `(${p.raised_by_role})` : ""}
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
                                  <span key={i} className="block">{show(s)}</span>
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
                                      Price: {showINR(pl.price)}{pl.discounted_price ? ` • Discounted: ${showINR(pl.discounted_price)}` : ""}
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
            <span className="text-gray-600">
              Showing {total === 0 ? 0 : offset + 1}
              {"-"}
              {Math.min(offset + payments.length, total)} of {total}
              {"  "}
              <span className="text-gray-500">
                (Page {page} of {pageCount})
              </span>
            </span>

            {/* Right: controls */}
            <div className="flex items-center gap-1">
              {/* First */}
              <button
                onClick={() => goToPage(1)}
                disabled={page <= 1}
                className="px-2 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
                title="First"
              >
                «
              </button>
              {/* Prev */}
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
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
                  className={`px-3 py-1 rounded ${n === page
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
              >
                Next
              </button>
              {/* Last */}
              <button
                onClick={() => goToPage(pageCount)}
                disabled={page >= pageCount}
                className="px-2 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
                title="Last"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
