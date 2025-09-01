"use client";
import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import InvoiceModal from "@/components/Lead/InvoiceList";
import { axiosInstance } from "@/api/Axios";

const DEFAULT_LIMIT = 100;

const isEmail = (s = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s).toLowerCase());
const onlyDigits = (s = "") => s.replace(/[^\d]/g, "");
const isPhoneLike = (s = "") => onlyDigits(s).length >= 1;

function parseClientQuery(q = "") {
  const trimmed = q.trim();
  if (!trimmed) return { name: "", email: "", phone_number: "" };
  if (isEmail(trimmed)) return { name: "", email: trimmed, phone_number: "" };
  if (isPhoneLike(trimmed)) return { name: "", email: "", phone_number: onlyDigits(trimmed) };
  return { name: trimmed, email: "", phone_number: "" };
}

export default function PaymentHistoryPage() {
  // Role/branch state
  const [role, setRole] = useState(null);
  console.log("role", role);

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
  // Draft (what user is typing/selecting)
  const [dateFromDraft, setDateFromDraft] = useState("");
  const [dateToDraft, setDateToDraft] = useState("");
  // Applied (used for API)
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

  // Debounce for client query
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

    // ✅ Use role_name instead of role
    const userRole = (decoded.role_name || "").toUpperCase();
    setRole(userRole);

    if (userRole === "BRANCH_MANAGER") {
      setBranchId(decoded.branch_id?.toString() || "");
    }

    axiosInstance
      .get("/branches/")
      .then((res) => setBranches(res.data.branches || res.data || []))
      .catch(() => setBranches([]));
  }, [router]);

  // ...

  // Branch chips
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
          : branches.filter((b) => String((b.id ?? b.branch_id)) === String(branchId))
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
              disabled={role === "BRANCH_MANAGER"} // ✅ only superadmin can switch
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

  // Employee (raised_by) suggestions
  useEffect(() => {
    const search = userSearch.trim();
    if (!search) {
      setUserSuggestions([]);
      setShowUserDropdown(false);
      return;
    }

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await axiosInstance.get(
          `/users/?search=${encodeURIComponent(search)}&limit=10`,
          { signal: controller.signal }
        );
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
  }, [userSearch]);

  // Global Client Suggestions (name/email/phone)
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
            name: isPhoneSearch ? undefined : (base.name || undefined),
            email: base.email || undefined,
            phone_number: (!shortPhone && isPhoneSearch) ? digits : undefined,
            phone_contains: shortPhone ? digits : undefined,
            limit: 20,
            offset: 0,
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

          if (list.length === 0 && shortPhone) {
            const res2 = await axiosInstance.get(`/payment/all/employee/history`, {
              params: { limit: 200, offset: 0 },
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
  }, [debouncedClientQuery]);

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
    // If only one date is provided, treat as a single-day filter
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
        branchId !== "" && branchId !== null && branchId !== undefined
          ? Number(branchId)
          : undefined;

      const parsed =
        clientFilter.name || clientFilter.email || clientFilter.phone_number
          ? clientFilter
          : parseClientQuery(clientQuery);

      // Build params; if only one of applied dates is present, we already set both equal above
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
        user_id: selectedUserId || undefined,
        raised_by: selectedUserId || undefined,
      };

      Object.keys(params).forEach((k) => {
        if (params[k] === "" || params[k] === null) delete params[k];
      });

      const { data } = await axiosInstance.get("/payment/all/employee/history", { params });
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || err?.message || "Failed to fetch payment history."

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when filters (except draft dates) change
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
    date_from,        // <-- applied dates only
    date_to,          // <-- applied dates only
    limit,
    offset,
  ]);

  const isBranchDropdownDisabled = role === "BRANCH MANAGER";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">All Employee Payment History</h2>

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
              : branches.filter((b) => String((b.id ?? b.branch_id)) === String(branchId))
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
                  disabled={role === "BRANCH_MANAGER"} // ✅ only superadmin can switch
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
          className="input"
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
          className="input"
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

        {/* Global Client Search (name/email/phone) */}
        <div className="relative">
          <input
            className="input w-full"
            type="text"
            placeholder="Search client by name, email, or mobile"
            value={clientQuery}
            onChange={(e) => {
              setClientQuery(e.target.value);
            }}
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
                    {c.email || "—"} • {c.phone_number || "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Employee (raised_by) */}
        <div className="relative">
          <input
            className="input w-full"
            type="text"
            placeholder="Search employee (raised by)..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setShowUserDropdown(true);
            }}
            onKeyDown={(e) => {
              if (!showUserDropdown || userSuggestions.length === 0) return;
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
              if (userSuggestions.length > 0) setShowUserDropdown(true);
            }}
            onBlur={() => setTimeout(() => setShowUserDropdown(false), 120)}
          />
          {selectedUserId && (
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
          {showUserDropdown && userSuggestions.length > 0 && (
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

        {/* Date filter (draft inputs + action buttons in same row) */}
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <input
            className="input"
            type="date"
            value={dateFromDraft}
            onChange={(e) => setDateFromDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyDateFilter()}
            placeholder="From"
          />
          <input
            className="input"
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
              Applied: {date_from}{date_to && date_to !== date_from ? ` → ${date_to}` : ""}
            </span>
          )}
        </div>
        <p className="md:col-span-2 text-xs text-gray-500 mt-1">
          Tip: Leave one side empty for a single-day filter — we’ll apply that same date as both
          <code className="px-1">from</code> and <code className="px-1">to</code>.
        </p>

      </div>

      {/* Results */}
      {loading && <div>Loading...</div>}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded px-4 py-2 mb-4">
          {error}
        </div>
      )}
      {!loading && !error && payments.length === 0 && (
        <div className="text-gray-500 text-center py-10">No records found.</div>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-3 border-b font-semibold">Name</th>
                <th className="py-2 px-3 border-b font-semibold">Email</th>
                <th className="py-2 px-3 border-b font-semibold">Phone</th>
                <th className="py-2 px-3 border-b font-semibold">Amount</th>
                <th className="py-2 px-3 border-b font-semibold">Status</th>
                <th className="py-2 px-3 border-b font-semibold">Date</th>
                <th className="py-2 px-3 border-b font-semibold">Send Invoice</th>
                <th className="py-2 px-3 border-b font-semibold">Invoice</th>
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
                    <td className="py-2 px-3">{p.name}</td>
                    <td className="py-2 px-3">{p.email}</td>
                    <td className="py-2 px-3">{p.phone_number}</td>
                    <td className="py-2 px-3 font-semibold">₹{p.paid_amount}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${p.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : p.status === "ACTIVE" || p.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-600"
                          }`}
                      >
                        {p.status === "ACTIVE" ? "PENDING" : p.status}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {p.created_at ? new Date(p.created_at).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4">
                      {p.is_send_invoice ? (
                        <span className="text-green-600 font-semibold">Done</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
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
                          <span className="text-gray-400 text-sm font-medium">N/A</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Accordion Row */}
                  {openRowId === p.id && (
                    <tr className="bg-gray-50">
                      <td colSpan="8" className="py-2 px-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Raised By</p>
                            <p>
                              {p.raised_by} ({p.raised_by_role})
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Payment Mode</p>
                            <p>{p.mode || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Service</p>
                            <p>
                              {Array.isArray(p.Service)
                                ? p.Service.map((s, i) => (
                                  <span key={i} className="block">
                                    {s}
                                  </span>
                                ))
                                : p.Service || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Plan(s)</p>
                            <div>
                              {Array.isArray(p.plan)
                                ? p.plan.map((pl) => (
                                  <div key={pl.id} className="mb-1">
                                    <span className="font-semibold">{pl.name}</span>
                                    <span className="ml-2 text-xs text-gray-500">
                                      {pl.description}
                                    </span>
                                  </div>
                                ))
                                : "-"}
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

          {/* Single modal instance outside the table */}
          <InvoiceModal
            isOpen={!!selectedLeadId}
            onClose={() => setSelectedLeadId(null)}
            leadId={selectedLeadId}
          />

          <div className="flex justify-between items-center py-4">
            <span className="text-gray-600">
              Showing {total === 0 ? 0 : offset + 1}-{offset + payments.length} of {total}
            </span>
            <div>
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="mr-2 px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
              >
                Prev
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: #f9fafb;
          color: #222;
          outline: none;
          transition: border 0.2s;
        }
        .input:focus {
          border-color: #2563eb;
          background: #fff;
        }
      `}</style>
    </div>
  );
}