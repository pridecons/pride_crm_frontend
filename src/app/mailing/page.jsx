"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from "@/api/Axios";
import { useTheme } from "@/context/ThemeContext";
import {Mail} from "lucide-react";

/* -------------------- Autocomplete -------------------- */
function EmployeeAutocomplete({
  items = [],
  value = "",
  onChange,
  placeholder = "Search employee by name or code...",
  getLabel = (e) =>
    `${e?.name || e?.full_name || "Employee"} (${e?.employee_code || ""})`,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // filter by name/employee_code (case-insensitive)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => {
      const label = getLabel(e).toLowerCase();
      const code = String(e?.employee_code || "").toLowerCase();
      const name = String(e?.name || e?.full_name || "").toLowerCase();
      return (
        label.includes(q) || code.includes(q) || name.includes(q)
      );
    });
  }, [items, query, getLabel]);

  // keep query in sync with selected value
  useEffect(() => {
    const current = items.find((e) => String(e.employee_code) === String(value));
    setQuery(current ? getLabel(current) : "");
  }, [value, items, getLabel]);

  // close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (
        !inputRef.current?.parentElement?.contains(e.target) &&
        !listRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectItem = (emp) => {
    onChange?.(emp?.employee_code || "");
    setOpen(false);
    // put the chosen label in the input
    setQuery(getLabel(emp));
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const emp = filtered[highlight];
      if (emp) selectItem(emp);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative min-w-[260px]">
      <input
        ref={inputRef}
        type="text"
        className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
          // if user starts typing, clear bound value (until they pick again)
          if (value) onChange?.("");
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{
          background: "var(--theme-card-bg)",
          color: "var(--theme-text)",
          borderColor: "var(--theme-border)",
          boxShadow:
            open
              ? "0 0 0 4px color-mix(in oklab, var(--theme-primary) 18%, transparent)"
              : "none",
        }}
      />

      {/* dropdown */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border shadow-lg"
          style={{
            background: "var(--theme-card-bg)",
            borderColor: "var(--theme-border)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              className="px-3 py-2 text-sm"
              style={{ color: "var(--theme-text-muted)" }}
            >
              No matches
            </div>
          ) : (
            filtered.map((emp, idx) => {
              const active = idx === highlight;
              const selected =
                String(emp.employee_code) === String(value);
              return (
                <button
                  key={emp.employee_code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                  onClick={() => selectItem(emp)}
                  className={`w-full text-left px-3 py-2 text-sm transition ${
                    active
                      ? "bg-[color:color-mix(in_oklab,var(--theme-text)_10%,transparent)]"
                      : ""
                  }`}
                  style={{
                    color: "var(--theme-text)",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{getLabel(emp)}</span>
                    {selected ? (
                      <span
                        className="text-xs"
                        style={{ color: "var(--theme-primary)" }}
                      >
                        Selected
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function InternalMailingForm() {
  const { theme, themeConfig, toggleTheme } = useTheme();

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState(""); // "profiles" | "employees" | "branches" | "all"
  const [employeeId, setEmployeeId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [branches, setBranches] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [file, setFile] = useState(null);
  const [files, setFiles] = useState(""); // keeping your original state, though not used
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myBranchId, setMyBranchId] = useState("");

  // Shared field styles (theme-driven)
  const fieldBase = "w-full rounded-lg outline-none transition";
  const fieldStyle = {
    background: "var(--theme-card-bg)",
    color: "var(--theme-text)",
    border: "1px solid var(--theme-border)",
  };
  const selectStyle = {
    ...fieldStyle,
    WebkitAppearance: "none",
    MozAppearance: "none",
    appearance: "none",
    backgroundImage:
      "linear-gradient(45deg, transparent 50%, var(--theme-text) 50%), linear-gradient(135deg, var(--theme-text) 50%, transparent 50%)",
    backgroundPosition:
      "calc(100% - 20px) calc(1em + 2px), calc(100% - 15px) calc(1em + 2px)",
    backgroundSize: "5px 5px, 5px 5px",
    backgroundRepeat: "no-repeat",
  };
  const focusRing = {
    boxShadow:
      "0 0 0 4px color-mix(in oklab, var(--theme-primary) 18%, transparent)",
    borderColor: "var(--theme-primary)",
  };

  /* -------------------- JWT & Initial Setup -------------------- */
  useEffect(() => {
    try {
      const token = Cookies.get("access_token");
      if (token) {
        const payload = jwtDecode(token);
        const roleKey = (payload?.role_name || payload?.role || "")
          .toString()
          .toUpperCase();
        const bId = payload?.branch_id ?? payload?.branchId ?? "";
        setIsSuperAdmin(roleKey === "SUPERADMIN");
        setMyBranchId(bId ? String(bId) : "");
        if (roleKey !== "SUPERADMIN" && bId) setBranchId(String(bId));
      }
    } catch (e) {
      console.warn("JWT decode failed:", e);
    }
  }, []);

  /* -------------------- Fetch Data -------------------- */
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/branches/?skip=0&limit=100&active_only=false"
        );
        setBranches(data);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };

    const fetchProfiles = async () => {
      try {
        const { data } = await axiosInstance.get(
          "/profile-role/?department_id=7&skip=0&limit=50&order_by=hierarchy_level"
        );
        setProfiles(data);
      } catch (err) {
        console.error("Error fetching profiles:", err);
      }
    };

    fetchBranches();
    fetchProfiles();
  }, []);

  // lock non-superadmin to their branch when switching to employees/branches
  useEffect(() => {
    if (!isSuperAdmin && myBranchId && (mode === "employees" || mode === "branches")) {
      setBranchId(myBranchId);
    }
  }, [mode, isSuperAdmin, myBranchId]);

  // fetch employees when needed
  useEffect(() => {
    if (mode === "employees" && branchId) {
      const fetchEmployees = async () => {
        try {
          const { data } = await axiosInstance.get(
            `/users/?skip=0&limit=100&active_only=false&branch_id=${branchId}`
          );
          setEmployees(data?.data || []);
        } catch (err) {
          console.error("Error fetching employees:", err);
        }
      };
      fetchEmployees();
    } else {
      setEmployees([]);
    }
  }, [branchId, mode]);

  /* -------------------- Submit -------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("mode", mode);

      if (mode === "employees" && employeeId)
        formData.append("employee_ids", employeeId);
      if (mode === "profiles" && profileId)
        formData.append("profile_ids", profileId);
      if (mode === "branches" && branchId)
        formData.append("branch_ids", branchId);

      // safer file append (only if exists)
      if (file instanceof File) {
        formData.append("files", file);
      }

      const { data } = await axiosInstance.post(
        "/internal-mailing/send",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      setResponse(data);
    } catch (err) {
      console.error("API Error:", err?.response?.data || err.message);
      setResponse({ error: true, message: err?.response?.data || err.message });
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- Memos / helpers -------------------- */
  const myBranchName = useMemo(() => {
    if (!branchId) return "";
    const found = branches.find((b) => String(b.id) === String(branchId));
    return found?.name || "";
  }, [branchId, branches]);

  const getRecipientDisplay = () => {
    if (mode === "all") return "All Users";
    if (mode === "profiles" && profileId) {
      const profile = profiles.find((p) => p.id == profileId);
      return profile?.name || "";
    }
    if (mode === "employees" && employeeId) {
      const emp = employees.find((e) => e.employee_code == employeeId);
      return emp
        ? `${emp.name || emp.full_name || "Employee"} (${emp.employee_code})`
        : "";
    }
    if (mode === "branches" && branchId) return myBranchName;
    return "";
  };

  /* -------------------- UI helpers -------------------- */
  const ChipButton = ({ active, onClick, children, disabled = false, title }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
        active
          ? "bg-[color:color-mix(in_oklab,var(--theme-primary)_14%,transparent)] text-[var(--theme-primary)] border-[color:color-mix(in_oklab,var(--theme-primary)_36%,transparent)]"
          : "bg-[var(--theme-card-bg)] text-[var(--theme-text)] hover:bg-[color:color-mix(in_oklab,var(--theme-text)_6%,transparent)] border-[var(--theme-border)]"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--theme-background)",
        color: "var(--theme-text)",
      }}
    >
      {/* Main Content */}
      <div className="mx-2 p-4">
        {/* Compose Card */}
        <div
          className="rounded-lg shadow-md border"
          style={{
            background: "var(--theme-card-bg)",
            borderColor: "var(--theme-border)",
          }}
        >
          {/* Compose Header */}
          <div
            className="px-4 py-4 border-b rounded-t-lg"
            style={{
             background: "var(--theme-components-header-bg)",
              color: "var(--theme-components-header-text)",
              borderColor: "var(--theme-components-header-border, var(--theme-border))",
              boxShadow: "0 1px 0 var(--theme-components-header-shadow, transparent)"
            }}
          >
            <h2 className="text-sm font-medium" style={{ color: "var(--theme-components-header-text)" }}>
              <span>
                <Mail className="inline-block mr-2" size={16} />
              </span>
              Mailing</h2>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ---------------- Recipients Section ---------------- */}
            <div
              className="border-b"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <div className="px-4 py-3">
                {/* Row 1: Recipient Type buttons */}
                <div className="flex items-start gap-3">
                  <span
                    className="text-sm mt-1.5 w-12"
                    style={{ color: "var(--theme-text-muted)" }}
                  >
                    To:
                  </span>

                  <div className="flex-1 flex flex-wrap gap-2">
                    <ChipButton
                      active={mode === "profiles"}
                      onClick={() => {
                        setMode("profiles");
                        setEmployeeId("");
                        if (isSuperAdmin) setBranchId("");
                      }}
                    >
                      Profiles
                    </ChipButton>

                    <ChipButton
                      active={mode === "employees"}
                      onClick={() => {
                        setMode("employees");
                        setProfileId("");
                      }}
                    >
                      Employees
                    </ChipButton>

                    <ChipButton
                      active={mode === "branches"}
                      onClick={() => {
                        setMode("branches");
                        setProfileId("");
                        setEmployeeId("");
                      }}
                    >
                      Branches
                    </ChipButton>

                    {isSuperAdmin && (
                      <ChipButton
                        active={mode === "all"}
                        onClick={() => {
                          setMode("all");
                          setProfileId("");
                          setEmployeeId("");
                          setBranchId("");
                        }}
                      >
                        All Users
                      </ChipButton>
                    )}

                    {mode && (
                      <ChipButton
                        title="Clear selection"
                        onClick={() => {
                          setMode("");
                          setProfileId("");
                          setEmployeeId("");
                          if (isSuperAdmin) setBranchId("");
                        }}
                      >
                        × Clear
                      </ChipButton>
                    )}
                  </div>
                </div>

                {/* Row 2: Mode-specific pickers */}
                <div className="mt-3 ml-[3.25rem] flex flex-wrap items-center gap-3">
                  {/* PROFILES */}
                  {mode === "profiles" && (
                    <select
                      className={`${fieldBase} px-2 py-2 text-sm min-w-[260px]`}
                      style={selectStyle}
                      value={profileId}
                      onChange={(e) => setProfileId(e.target.value)}
                      onFocus={(e) =>
                        Object.assign(e.currentTarget.style, focusRing)
                      }
                      onBlur={(e) =>
                        Object.assign(e.currentTarget.style, selectStyle)
                      }
                    >
                      <option value="">Select profile...</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* BRANCHES */}
                  {mode === "branches" && (
                    <>
                      {isSuperAdmin ? (
                        <select
                          className={`${fieldBase} px-2 py-2 text-sm min-w-[260px]`}
                          style={selectStyle}
                          value={branchId}
                          onChange={(e) => setBranchId(e.target.value)}
                          onFocus={(e) =>
                            Object.assign(e.currentTarget.style, focusRing)
                          }
                          onBlur={(e) =>
                            Object.assign(e.currentTarget.style, selectStyle)
                          }
                        >
                          <option value="">Select branch...</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="text-sm"
                          style={{ color: "var(--theme-text-muted)" }}
                        >
                          (Auto-selected: {myBranchName || "My Branch"})
                        </span>
                      )}
                    </>
                  )}

                  {/* EMPLOYEES */}
                  {mode === "employees" && (
                    <>
                      {/* Branch chooser for SUPERADMIN first */}
                      {isSuperAdmin && (
                        <select
                          className={`${fieldBase} px-2 py-2 text-sm min-w-[220px]`}
                          style={selectStyle}
                          value={branchId}
                          onChange={(e) => setBranchId(e.target.value)}
                          onFocus={(e) =>
                            Object.assign(e.currentTarget.style, focusRing)
                          }
                          onBlur={(e) =>
                            Object.assign(e.currentTarget.style, selectStyle)
                          }
                        >
                          <option value="">Select branch first...</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Employee list (appears when branch is known) */}
                      {branchId && (
  <EmployeeAutocomplete
    items={employees}
    value={employeeId}
    onChange={setEmployeeId}
    placeholder="Search employee by name or code..."
    getLabel={(emp) =>
      `${emp?.name || emp?.full_name || "Employee"} (${emp?.employee_code || ""})`
    }
  />
)}

                      {!isSuperAdmin && branchId && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--theme-text-muted)" }}
                        >
                          (Branch: {myBranchName})
                        </span>
                      )}
                    </>
                  )}

                  {/* ALL USERS (no extra picker) */}
                  {mode === "all" && (
                    <span
                      className="text-sm"
                      style={{ color: "var(--theme-text-muted)" }}
                    >
                      This will send to every user.
                    </span>
                  )}
                </div>

                {/* Row 3: Current selection preview (like Gmail “chips”) */}
                <div className="mt-3 ml-[3.25rem]">
                  {(() => {
                    const txt = getRecipientDisplay();
                    if (!mode || !txt) return null;
                    return (
                      <span
                       className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border"
                        style={{
                          background: "var(--theme-components-tag-info-bg)",
                          color: "var(--theme-components-tag-info-text)",
                          borderColor: "var(--theme-components-tag-info-border)"
                        }}
                      >
                        {txt}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Subject */}
              <div
                className="px-4 py-2 flex items-center gap-3 border-t"
                style={{ borderColor: "var(--theme-border)" }}
              >
                <span
                  className="text-sm w-12"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  Subject:
                </span>
                <input
                  className={`${fieldBase} flex-1 text-sm px-2 py-1`}
                  style={fieldStyle}
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  onFocus={(e) =>
                    Object.assign(e.currentTarget.style, focusRing)
                  }
                  onBlur={(e) =>
                    Object.assign(e.currentTarget.style, fieldStyle)
                  }
                />
              </div>
            </div>

            {/* ---------------- Message Body ---------------- */}
            <div className="px-4 py-3">
              <textarea
                className={`${fieldBase} w-full min-h-[300px] text-sm p-3 resize-none`}
                style={fieldStyle}
                placeholder="Compose email"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                onFocus={(e) => Object.assign(e.currentTarget.style, focusRing)}
                onBlur={(e) => Object.assign(e.currentTarget.style, fieldStyle)}
              />
            </div>

            {/* ---------------- Bottom Toolbar ---------------- */}
            <div
              className="px-4 py-3 flex items-center justify-between border-t"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 rounded text-sm font-medium flex items-center gap-2 transition"
                  style={{
                    background: "var(--theme-primary)",
                    color: "var(--theme-primary-contrast)",
                    opacity: loading ? 0.8 : 1,
                  }}
                  onMouseEnter={(e)=>{ e.currentTarget.style.background = "var(--theme-primary-hover)"; }}
                  onMouseLeave={(e)=>{ e.currentTarget.style.background = "var(--theme-primary)"; }}
                >
                  {loading ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full animate-spin"
                        style={{
                          border:
                            "2px solid color-mix(in oklab, var(--theme-primary-contrast) 40%, transparent)",
                          borderTopColor: "var(--theme-primary-contrast)",
                        }}
                      />
                      Sending...
                    </>
                  ) : (
                    <>Send</>
                  )}
                </button>

                {/* Attach (optional, kept simple) */}
                <label
                  className="px-3 py-2 rounded cursor-pointer flex items-center gap-2 transition"
                  style={{
                    color: "var(--theme-text)",
                    background: "var(--theme-card-bg)",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                  {file ? (
                    <span className="text-sm">{file.name}</span>
                  ) : (
                    <span
                      className="text-sm"
                      style={{ color: "var(--theme-text-muted)" }}
                    >
                      Attach
                    </span>
                  )}
                </label>
              </div>

              <button
                type="button"
                className="p-2 rounded transition"
                onClick={() => window.location.reload()}
                title="Reset"
                style={{
                  color: "var(--theme-text)",
                  background: "var(--theme-card-bg)",
                  border: "1px solid var(--theme-border)",
                }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {/* ---------------- Response Message ---------------- */}
        {response && (
          <div
            className="mt-4 p-3 rounded-lg text-sm border"
            style={{
              background: response.error
                ? "color-mix(in oklab, var(--theme-danger) 12%, transparent)"
                : "color-mix(in oklab, var(--theme-success) 12%, transparent)",
              color: response.error
                ? "var(--theme-danger)"
                : "var(--theme-success)",
              borderColor: response.error
                ? "color-mix(in oklab, var(--theme-danger) 30%, transparent)"
                : "color-mix(in oklab, var(--theme-success) 30%, transparent)",
            }}
          >
            {response.message || "Email sent successfully!"}
          </div>
        )}
      </div>

      {/* placeholder color for inputs/textareas */}
      <style jsx>{`
        select::placeholder,
        input::placeholder,
        textarea::placeholder {
          color: var(--theme-text-muted);
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
