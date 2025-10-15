'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { jwtDecode } from "jwt-decode";
import { axiosInstance } from '@/api/Axios';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Building2, PhoneCall, PhoneIncoming, Clock3, PhoneOff, Store, CalendarDays, Calendar, Eye, User, Users, Search, CheckCircle2, Info, BarChart3, Briefcase, AlertTriangle, LineChart, IndianRupee, CalendarCheck, Target, SlidersHorizontal, Trophy, Currency, } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import DashboardSkeleton from '@/components/common/skeletonloader';

const DAY_OPTIONS = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 180 days' },
  { value: 365, label: 'Last 365 days' },
];

function hexToRgba(hex = "#000000", alpha = 1) {
  try {
    const h = String(hex || "#000000").replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(0,0,0,${alpha})`;
  }
}

function getFirstName(nameLike, usernameLike) {
  const name = (nameLike || '').trim();
  if (name) return name.split(/\s+/)[0];
  const uname = (usernameLike || '').trim();
  if (!uname) return 'User';
  const base = uname.includes('@') ? uname.split('@')[0] : uname;
  return base.split(/[._-]/)[0] || 'User';
}
function safeJSON(str) {
  try { return JSON.parse(str); } catch { return null; }
}

const formatIndianGrouping = (n) => {
  const s = Math.trunc(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return rest + ',' + last3;
};
const inr = (n) => {
  const num = Number(n || 0);
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
      .format(num)
      .replace(/^/, '\u20B9 ');
  } catch {
    return '\u20B9 ' + formatIndianGrouping(num);
  }
};
const num = (n) => Number(n || 0).toLocaleString('en-IN');

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hello';
}

export default function Dashboard() {
  const { themeConfig } = useTheme();

  // user/auth
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = Cookies.get('user_info');
    if (raw) setUser(safeJSON(raw) || null);
  }, []);

  const roleName = (user?.role_name || '').toUpperCase();
  const isSuperAdmin = roleName === 'SUPERADMIN';
  const isBranchManager = roleName === 'BRANCH_MANAGER';
  const isEmployee = !isSuperAdmin && !isBranchManager;

  const userBranchId = user?.branch_id ?? user?.user?.branch_id ?? '';
  const myCode = user?.sub || user?.employee_code || user?.user?.employee_code || '';

  const firstName = useMemo(() => {
    const nm = user?.name ?? user?.user?.name ?? '';
    const un = user?.username ?? user?.user?.username ?? '';
    return getFirstName(nm, un);
  }, [user]);

  const defaultDraft = {
    days: 1,
    fromDate: '',
    toDate: '',
    view: 'all',
    profileId: '',
    departmentId: '',
    employeeCode: '',
  };
  const [draftFilters, setDraftFilters] = useState(defaultDraft);
  const [appliedFilters, setAppliedFilters] = useState(defaultDraft);
  useEffect(() => {
    if (isEmployee && draftFilters.view === 'all') {
      setDraftFilters((d) => ({ ...d, view: 'self' }));
    }
  }, [isEmployee, draftFilters.view]);
  useEffect(() => {
    if (isEmployee && appliedFilters.view === 'all') {
      setAppliedFilters((d) => ({ ...d, view: 'self' }));
    }
  }, [isEmployee, appliedFilters.view]);
  const [userSearch, setUserSearch] = useState('');
  const debUserSearch = useDebouncedValue(userSearch, 200);
  const [branches, setBranches] = useState([]); // [{id, name}]
  const [branchTabId, setBranchTabId] = useState(''); // '' means All for SA
  const baseDefaults = useMemo(
    () => ({
      days: 1,
      fromDate: '',
      toDate: '',
      view: isEmployee ? 'self' : 'all',
      profileId: '',
      departmentId: '',
      employeeCode: '',
    }),
    [isEmployee]
  );
  const hasActiveFilters = useMemo(() => {
    const a = appliedFilters;
    if (!a) return false;
    return (
      a.days !== baseDefaults.days ||
      a.view !== baseDefaults.view ||
      !!a.fromDate ||
      !!a.toDate ||
      !!a.employeeCode ||
      !!a.profileId ||
      !!a.departmentId ||
      (isSuperAdmin && branchTabId !== '')
    );
  }, [appliedFilters, baseDefaults, isSuperAdmin, branchTabId]);

  // --- Employee table: independent filters (defaults mirror baseDefaults) ---
const empDefaults = useMemo(() => ({ ...baseDefaults }), [baseDefaults]);

const [draftEmpFilters, setDraftEmpFilters] = useState(empDefaults);
const [appliedEmpFilters, setAppliedEmpFilters] = useState(empDefaults);

// Ensure non-admins never land on "all"
useEffect(() => {
  if (isEmployee && draftEmpFilters.view === 'all') {
    setDraftEmpFilters((d) => ({ ...d, view: 'self' }));
  }
}, [isEmployee, draftEmpFilters.view]);

useEffect(() => {
  if (isEmployee && appliedEmpFilters.view === 'all') {
    setAppliedEmpFilters((d) => ({ ...d, view: 'self' }));
  }
}, [isEmployee, appliedEmpFilters.view]);

  const showReset = !!user && hasActiveFilters;

  // one-click reset (clears draft, applied, and SA branch tab)
  const resetAllFilters = () => {
    setDraftFilters(baseDefaults);
    setAppliedFilters(baseDefaults);
    if (isSuperAdmin) setBranchTabId('');
    setUserSearch('');
  };

  // Options + users
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [usersList, setUsers] = useState([]);
  const [responses, setResponses] = useState([]);

  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setOptLoading(true);
        setOptError('');
        const [profRes,  usersRes, branchesRes, respRes] = await Promise.all([
          axiosInstance.get('/profile-role', { params: { skip: 0, limit: 50, order_by: 'hierarchy_level' } }),
          
          axiosInstance.get('/users', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/branches', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/lead-config/responses/', { params: { skip: 0, limit: 100 } }),
        ]);
        setProfiles((profRes.data || []).map((p) => ({ id: p.id, name: p.name, lvl: p.hierarchy_level })));

        const ulist = (usersRes.data?.data || []).map((u) => ({
          employee_code: u.employee_code,
          name: u.name,
          email: u.email,
          phone: u.phone_number,
          role_name: u.profile_role?.name ?? String(u.role_id ?? ''),
          branch_id: u.branch_id,
          senior_code: u.senior_profile_id || null,
        }));
        setUsers(ulist);
        setBranches((branchesRes.data || []).map((b) => ({ id: b.id, name: b.name })));
        setResponses((respRes.data || []).map(r => ({ id: r.id, name: r.name })));
      } catch (e) {
        setOptError(e?.response?.data?.detail || e?.message || 'Failed to load filter options');
      } finally {
        setOptLoading(false);
      }
    })();
  }, [user]);

  // Effective branch for queries:
  const effectiveBranchId = isSuperAdmin ? branchTabId : userBranchId || '';

  /* ---- Allowed users by scope ---- */
  const allowedUsers = useMemo(() => {
    if (!usersList?.length) return [];
    if (isSuperAdmin) return usersList;
    if (isBranchManager) return usersList.filter((u) => String(u.branch_id) === String(userBranchId));

    // Others: team (BFS over seniors)
    const bySenior = usersList.reduce((m, u) => {
      const key = u.senior_code || '';
      if (!m[key]) m[key] = [];
      m[key].push(u);
      return m;
    }, /** @type {Record<string, any[]>} */({}));

    const teamSet = new Set([myCode]);
    const queue = [myCode];
    while (queue.length) {
      const lead = queue.shift();
      for (const child of bySenior[lead] || []) {
        if (!teamSet.has(child.employee_code)) {
          teamSet.add(child.employee_code);
          queue.push(child.employee_code);
        }
      }
    }
    return usersList.filter((u) => teamSet.has(u.employee_code));
  }, [usersList, isSuperAdmin, isBranchManager, userBranchId, myCode]);

  // If selected (draft) employee goes out of scope, clear it
  useEffect(() => {
    if (draftFilters.employeeCode && !allowedUsers.some((u) => u.employee_code === draftFilters.employeeCode)) {
      setDraftFilters((d) => ({ ...d, employeeCode: '' }));
      setUserSearch('');
    }
  }, [draftFilters.employeeCode, allowedUsers]);

  /* ----------------------------- Data ----------------------------- */
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [data, setData] = useState(null);
  const [employeesTable, setEmployeesTable] = useState([]);
  const [loadingapi, setLoadingapi] = useState(false);
  // Accordion state for Employee table
  const [expandedEmp, setExpandedEmp] = useState(() => new Set());
  const toggleEmp = (code) => {
    setExpandedEmp(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Pagination for users table
  const EMP_PAGE_SIZE = 10;
  const [empPage, setEmpPage] = useState(1);

  useEffect(() => {
    setEmpPage(1);
  }, [appliedFilters, effectiveBranchId, employeesTable]);
  
  const queryParams = useMemo(() => {
    const { days, fromDate, toDate, view, profileId, departmentId, employeeCode } = appliedFilters;
    const p = { days, view };
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    if (effectiveBranchId) p.branch_id = Number(effectiveBranchId);
    if (employeeCode) p.employee_id = employeeCode;
    if (profileId) p.profile_id = Number(profileId);
    if (departmentId) p.department_id = Number(departmentId);
    return p;
  }, [appliedFilters, effectiveBranchId]);

  // Employee table query params (independent from global)
const queryParamsEmp = useMemo(() => {
  const { days, fromDate, toDate, view, profileId, departmentId, employeeCode } = appliedEmpFilters;
  const p = { days, view };
  if (fromDate) p.from_date = fromDate;
  if (toDate) p.to_date = toDate;
  if (effectiveBranchId) p.branch_id = Number(effectiveBranchId);
  if (employeeCode) p.employee_id = employeeCode;
  if (profileId) p.profile_id = Number(profileId);
  if (departmentId) p.department_id = Number(departmentId);
  return p;
}, [appliedEmpFilters, effectiveBranchId]);

  const fetchDashboard = async () => {
    try {
      setLoadingapi(true);
      setErrMsg('');
      const res = await axiosInstance.get('/analytics/leads/dashboard', { params: queryParams });
      setData(res.data || {});
    } catch (e) {
      setErrMsg(e?.response?.data?.detail || e?.message || 'Failed to load dashboard');
    } finally {
      setLoadingapi(false);
    }
  };

const fetchUserTable = async () => {
  try {
    setLoading(true);
    setErrMsg('');
    const res = await axiosInstance.get('/analytics/leads/users', { params: queryParamsEmp });
    setEmployeesTable(res.data || []);
  } catch (e) {
    setErrMsg(e?.response?.data?.detail || e?.message || 'Failed to load users');
  } finally {
    setLoading(false);
  }
};

  // Run fetch when applied filters (or user) change
  useEffect(() => {
    if (!user) return;
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryParams]);

  useEffect(() => {
  if (!user) return;
  fetchUserTable();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user, queryParamsEmp]);

  /* ----------------------------- Autocomplete (draft) ----------------------------- */
  const filteredUsers = useMemo(() => {
    const q = debUserSearch.trim().toLowerCase();
    const list = allowedUsers || [];
    if (!q) return list.slice(0, 25);
    return list
      .filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.employee_code || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q)
      )
      .slice(0, 25);
  }, [allowedUsers, debUserSearch]);

  /* ----------------------------- Slide-over ----------------------------- */
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  /* ----------------------------- UI ----------------------------- */
  const totalEmp = employeesTable?.length || 0;
  const totalEmpPages = Math.max(1, Math.ceil(totalEmp / EMP_PAGE_SIZE));
  const startIdx = (empPage - 1) * EMP_PAGE_SIZE;
  const endIdx = Math.min(startIdx + EMP_PAGE_SIZE, totalEmp);
  const pageRowsRaw = (employeesTable || []).slice(startIdx, endIdx);

  // Dynamic response column names (e.g., "FT", "BUSY", "CALL BACK", ...)
  const responseNames = useMemo(
    () => (responses || []).map((r) => r.name),
    [responses]
  );

  // Keep only FT & CALL BACK in the table; rest go to accordion
  const PRIMARY_RESP = ['FT', 'CALL BACK'];
  const primarySet = useMemo(
    () => new Set(PRIMARY_RESP.map((s) => s.toUpperCase())),
    []
  );
  const otherResponses = useMemo(
    () => (responseNames || []).filter((n) => !primarySet.has(String(n).toUpperCase())),
    [responseNames, primarySet]
  );

  // Build dynamic cols/rows for Employee Performance (unconditional -> stable hook order)
  const empPerfCols = useMemo(
    () => ['Employee', 'Role', 'Leads', 'Clients', 'FT', 'CALL BACK', 'Revenue'],
    []
  );


  /* --- Theme-driven chart colors --- */
  const COLORS_AGE = [themeConfig.error, themeConfig.warning];
  const COLORS_OUT = [themeConfig.accent, themeConfig.primary, themeConfig.secondary];
  const COLORS_PER = [themeConfig.accent, themeConfig.primaryHover || themeConfig.primary, themeConfig.success];


  

  /* ----------------------------- Render ----------------------------- */

  const pay = data?.cards?.payments || {};
const leadsCard = data?.cards?.leads || {};

const totalTarget = N(pay.total_target);
const achievedTarget = N(pay.achieved_target);

const teamTarget = N(pay.team_target);
const teamAchieved = N(pay.achive_team_target ?? pay.achieved_team_target);

const hideTeamPairForAdmin =
  (isSuperAdmin || isBranchManager) &&
  teamTarget === 0 &&
  teamAchieved === 0;

// If SA/BM & team zero -> keep old 4-card layout
const useExistingAdminLayout = hideTeamPairForAdmin;

  return (
    <>
      {loading ? (
        <DashboardSkeleton themeConfig={themeConfig} />
      ) : (
        <div
          className="min-h-screen"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(themeConfig.surface, 0.75)} 0%, ${hexToRgba(themeConfig.background, 1)} 40%, ${hexToRgba(themeConfig.accent, 0.08)} 100%)`,
            color: themeConfig.text
          }}
        >
          <div className="p-4 md:p-6 space-y-6 mx-2">
            {/* Greeting header (BM & Employees) */}
{user && !isSuperAdmin && (
              <div className="w-fit">
                <h1 className="text-2xl font-semibold" style={{ color: themeConfig.text }}>
                  {getGreeting()}, {firstName}!
                </h1>
                <p className="mt-0.5 text-sm" style={{ color: themeConfig.textSecondary }}>
                  Here’s your performance overview for {appliedFilters.days === 1 ? 'today' : `the last ${appliedFilters.days} days`}
                </p>
              </div>
            )}

            {/* Branch Tabs */}
            {isSuperAdmin && (
              <div
                className="p-3 shadow-md rounded-xl"
                style={{
                  backgroundColor: hexToRgba(themeConfig.cardBackground, 0.9),
                  border: `1px solid ${themeConfig.border}`,
                }}
              >
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Tab
                    active={branchTabId === ''}
                    onClick={() => setBranchTabId('')}
                    themeConfig={themeConfig}
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm">All Branches</span>
                    </div>
                  </Tab>

                  {(branches || []).map((b) => (
                    <Tab
                      key={b.id}
                      active={String(branchTabId) === String(b.id)}
                      onClick={() => setBranchTabId(b.id)}
                      themeConfig={themeConfig}
                    >
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4" />
                        <span className="text-sm">{b.name}</span>
                      </div>
                    </Tab>
                  ))}
                </div>
              </div>
            )}

            {/* Filters Toolbar (chips show APPLIED) */}
            <div className="flex items-center justify-end">
              <div className="flex items-center gap-2">
                {appliedFilters.fromDate && (
                  <span
                    className="hidden md:inline-flex gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.primary, 0.08),
                      border: `1px solid ${hexToRgba(themeConfig.primary, 0.25)}`,
                      color: themeConfig.primary,
                    }}
                  >
                    From: {appliedFilters.fromDate}
                  </span>
                )}
                {appliedFilters.toDate && (
                  <span
                    className="hidden md:inline-flex gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.primary, 0.08),
                      border: `1px solid ${hexToRgba(themeConfig.primary, 0.25)}`,
                      color: themeConfig.primary,
                    }}
                  >
                    To: {appliedFilters.toDate}
                  </span>
                )}
                {!!appliedFilters.employeeCode && (
                  <span
                    className="hidden md:inline-flex gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.primary, 0.08),
                      border: `1px solid ${hexToRgba(themeConfig.primary, 0.25)}`,
                      color: themeConfig.primary,
                    }}
                  >
                    Emp: {appliedFilters.employeeCode}
                  </span>
                )}
                {/* Days chip */}
                {user && appliedFilters?.days && (
                  <span
                    className="hidden md:inline-flex gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.primary, 0.08),
                      border: `1px solid ${hexToRgba(themeConfig.primary, 0.25)}`,
                      color: themeConfig.primary,
                    }}
                  >
                    {
                      DAY_OPTIONS.find(opt => opt.value === appliedFilters.days)?.label
                      || `${appliedFilters.days} days`
                    }
                  </span>
                )}

                {user && showReset && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="hidden md:inline-flex gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200"
                    title="Reset filters"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.accent, 0.08),
                      border: `1px solid ${hexToRgba(themeConfig.accent, 0.25)}`,
                      color: themeConfig.accent,
                    }}
                  >
                    <span className="font-medium">Reset</span>
                  </button>
                )}
                {user && (

                  <button type="button" onClick={() => setFiltersOpen(true)} title="Open filters">
                    <SlidersHorizontal className="h-6 w-5" style={{ color: themeConfig.primary }} />
                  </button>
                )}

              </div>
            </div>

            {/* Errors */}
            {errMsg ? (
              <div
                className="p-3 rounded-lg shadow-sm"
                style={{
                  backgroundColor: hexToRgba(themeConfig.error, 0.08),
                  borderLeft: `4px solid ${themeConfig.error}`,
                  color: themeConfig.error
                }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium text-sm">{errMsg}</span>
                </div>
              </div>
            ) : null}

            {/* Loading skeleton */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl animate-pulse shadow"
                    style={{
                      background: `linear-gradient(135deg, ${hexToRgba(themeConfig.surface, 0.6)}, ${hexToRgba(themeConfig.background, 0.9)})`,
                      boxShadow: `0 10px 20px ${hexToRgba(themeConfig.shadow || '#000', 0.15)}`
                    }}
                  />
                ))}
              </div>
            )}

            {/* Cards */}
            {!!data && (
              <>
                <SectionHeader title="Payments Overview" themeConfig={themeConfig} />

{useExistingAdminLayout ? (
  /* ---- EXISTING LAYOUT for SA/BM when team cards are zero ---- */
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <Card
      title="Total Target"
      value={inr(totalTarget)}
      icon={<Currency className="h-5 w-5 text-[var(--theme-warning)]" />}
      themeConfig={themeConfig}
    />
    <Card
      title="Achieved Target"
      value={inr(achievedTarget)}
      icon={<Target className="h-5 w-5 text-[var(--theme-success)]" />}
      themeConfig={themeConfig}
    />
    <Card
      title="Today Running FT Leads"
      value={num(leadsCard?.running_ft)}
      icon={<CalendarDays className="h-5 w-5 text-[var(--theme-accent)]" />}
      themeConfig={themeConfig}
    />
    <Card
      title="Today FT Leads"
      value={num(leadsCard?.total_ft)}
      icon={<CalendarDays className="h-5 w-5 text-[var(--theme-text)]" />}
      themeConfig={themeConfig}
    />
  </div>
) : (

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  <SingleLineTargetCard
    title="Targets (Overall)"
    achieved={achievedTarget}
    total={totalTarget}
    icon={<Currency className="h-5 w-5 text-[var(--theme-warning)]" />}
    themeConfig={themeConfig}
  />

  {!(isSuperAdmin || isBranchManager) || teamTarget > 0 || teamAchieved > 0 ? (
    <SingleLineTargetCard
      title="Team Targets"
      achieved={teamAchieved}
      total={teamTarget}
      icon={<Trophy className="h-5 w-5 text-[var(--theme-success)]" />}
      themeConfig={themeConfig}
    />
  ) : null}

  <Card
    title="Running FT Leads"
    value={num(leadsCard?.running_ft)}
    icon={<CalendarDays className="h-5 w-5 text-[var(--theme-accent)]" />}
    themeConfig={themeConfig}
  />
  <Card
    title="Today FT Leads"
    value={num(leadsCard?.total_ft)}
    icon={<CalendarDays className="h-5 w-5 text-[var(--theme-text)]" />}
    themeConfig={themeConfig}
  />
</div>
)}
                <SectionHeader title="Call Analytics" themeConfig={themeConfig} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card
                    title="Total Calls"
                    value={num(data?.cards?.calls?.total)}
                    icon={<PhoneCall className="h-5 w-5 text-[var(--theme-accent)]" />}
                    themeConfig={themeConfig}
                  />
                  <Card
                    title="Answered Calls"
                    value={num(data?.cards?.calls?.answered)}
                    icon={<PhoneIncoming className="h-5 w-5 text-[var(--theme-text)]" />}
                    themeConfig={themeConfig}
                  />
                  <Card
                    title="Missed Calls"
                    value={num(data?.cards?.calls?.missed)}
                    icon={<PhoneOff className="h-5 w-5 text-[var(--theme-warning)]" />}
                    themeConfig={themeConfig}
                  />
                  <Card
                    title="Avg Duration"
                    value={data?.cards?.calls?.duration_hms || "00:00:00"}
                    icon={<Clock3 className="h-5 w-5 text-[var(--theme-success)]" />}
                    themeConfig={themeConfig}
                  />
                </div>

                <SectionHeader title="Leads Analytics" themeConfig={themeConfig} />
                <LeadsPiePanel data={data} themeConfig={themeConfig} COLORS_AGE={COLORS_AGE} COLORS_OUT={COLORS_OUT} COLORS_PER={COLORS_PER} />
              </>
            )}

            {/* Top performers */}
            {!!data && (
              <div className="gap-4">
                <div className="mt-6">
                  <TableWrap
                    className="mb-6"
                    title={`Top Employees (${isEmployee ? 'Team (Top 5)' : 'Top 10'})`}
                    icon={<Users className="h-5 w-5" style={{ color: themeConfig.accent }} />}
                    themeConfig={themeConfig}
                  >
                    <div className="max-h-72 overflow-y-auto pr-1">
                      <SimpleTable
                        cols={['Employee', 'Achieved']}
                        rows={(data?.top?.employees || []).map((e) => [
                          <span className="font-medium" style={{ color: themeConfig.text }} key={`${e.employee_code}-name`}>
                            {e.employee_name} <span style={{ color: themeConfig.textSecondary }}>({e.employee_code})</span>
                          </span>,
                          <span style={{ color: themeConfig.primaryHover || themeConfig.primary }} key={`${e.employee_code}-ach`}>
                            {inr(e.achieved_target ?? e.total_revenue)}
                          </span>,
                        ])}
                        themeConfig={themeConfig}
                        className="w-full rounded-2xl"
                      />
                    </div>
                  </TableWrap>
                </div>
              </div>
            )}

            {/* Profiles (admin & BM only) */}
            {!!data && (isSuperAdmin || isBranchManager) && (
              <div className="grid grid-cols-1 gap-4">
                <TableWrap className="mb-6" title="Profile-wise Analysis" icon={<Briefcase className="h-5 w-5" style={{ color: themeConfig.warning }} />} themeConfig={themeConfig}>
                  <div className="max-h-72 overflow-y-auto pr-1">
                    <SimpleTable
  cols={[
    'Profile',
    'Total Leads',
    'Old Leads',
    'FT Leads',
    'Paid Revenue',
  ]}
  rows={(data?.breakdowns?.profile_wise || []).map((p) => {
    const prof = profiles.find((x) => x.id === p.profile_id);
    return [
      // Profile name
      <span className="font-medium" style={{ color: themeConfig.text }} key={`${p.profile_id}-name`}>
        {prof?.name || p.profile_name || (p.profile_id ?? '—')}
      </span>,

      // Total leads
      <span style={{ color: themeConfig.text }} key={`${p.profile_id}-leads`}>
        {num(p.total_leads ?? 0)}
      </span>,

      // Old leads
      <span style={{ color: themeConfig.text }} key={`${p.profile_id}-old`}>
        {num(p.old_leads ?? 0)}
      </span>,

      // FT leads
      <span style={{ color: themeConfig.text }} key={`${p.profile_id}-ft`}>
        {num(p.ft_leads ?? 0)}
      </span>,

      // Paid revenue
      <span className="font-medium" style={{ color: themeConfig.primary }} key={`${p.profile_id}-revenue`}>
        {inr(p.paid_revenue ?? 0)}
      </span>,
    ];
  })}
  themeConfig={themeConfig}
  className="w-full rounded-2xl"
/>
                  </div>
                </TableWrap>
              </div>
            )}

            {/* Users table */}
            {user && employeesTable && (
              <TableWrap
                className="mb-6"
                title={`Employee Performance (${isEmployee ? 'Your Team' : 'All (scoped)'})`}
                icon={<LineChart className="h-5 w-5" style={{ color: themeConfig.success }} />}
                themeConfig={themeConfig}
              >
                {/* Inline filters (draft) with Apply */}
                <div className="mb-3 px-2 pt-4">
  <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
    <div className="md:col-span-2">
      <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>From Date</label>
      <input
        type="date"
        className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
        value={draftEmpFilters.fromDate}
        onChange={(e) => setDraftEmpFilters((d) => ({ ...d, fromDate: e.target.value }))}
        style={{
          backgroundColor: themeConfig.inputBackground,
          color: themeConfig.text,
          border: `1px solid ${themeConfig.inputBorder}`,
          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
        }}
      />
    </div>
    <div className="md:col-span-2">
      <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>To Date</label>
      <input
        type="date"
        className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
        value={draftEmpFilters.toDate}
        onChange={(e) => setDraftEmpFilters((d) => ({ ...d, toDate: e.target.value }))}
        style={{
          backgroundColor: themeConfig.inputBackground,
          color: themeConfig.text,
          border: `1px solid ${themeConfig.inputBorder}`,
          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
        }}
      />
    </div>
    <div className="md:col-span-2">
      <label className="block text-xs font-medium mb-1" style={{ color: themeConfig.textSecondary }}>Days</label>
      <select
        className="h-9 w-full rounded-md px-2.5 text-sm shadow-sm focus:ring-2 outline-none"
        value={draftEmpFilters.days}
        onChange={(e) => setDraftEmpFilters((d) => ({ ...d, days: Number(e.target.value) }))}
        style={{
          backgroundColor: themeConfig.inputBackground,
          color: themeConfig.text,
          border: `1px solid ${themeConfig.inputBorder}`,
          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
        }}
      >
        {DAY_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>

    <div className="md:col-span-2 flex md:justify-end gap-2">
      <button
        onClick={() =>
          setDraftEmpFilters((d) => ({
            ...d,
            fromDate: '',
            toDate: '',
            days: 30,
          }))
        }
        className="h-9 px-3 rounded-md text-sm font-medium transition"
        style={{
          backgroundColor: hexToRgba(themeConfig.textSecondary, 0.15),
          color: themeConfig.text,
          border: `1px solid ${themeConfig.border}`
        }}
      >
        Clear
      </button>
      <button
        onClick={() => setAppliedEmpFilters(draftEmpFilters)}
        className="h-9 px-3 rounded-md text-sm font-medium transition"
        style={{
          backgroundColor: themeConfig.primary,
          color: '#fff',
          boxShadow: `0 10px 20px ${hexToRgba(themeConfig.primary, 0.25)}`
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primaryHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primary; }}
      >
        Apply
      </button>
    </div>
  </div>
</div>

                {/* Table */}
                <div className="max-h-[480px] overflow-y-auto overflow-x-auto pr-1 relative">
                  <EmployeeTableAccordion
                    cols={empPerfCols}
                    rows={pageRowsRaw}
                    otherResponses={otherResponses}
                    expanded={expandedEmp}
                    onToggle={toggleEmp}
                    themeConfig={themeConfig}
                  />
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between px-3">
                  <div className="text-xs" style={{ color: themeConfig.textSecondary }}>
                    {totalEmp === 0 ? 'No records' : `Showing ${startIdx + 1}–${endIdx} of ${totalEmp}`}
                  </div>

                  <div className="flex items-center gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                      disabled={empPage === 1}
                      className="h-9 px-3 rounded-md text-sm font-medium border transition"
                      style={{
                        backgroundColor: empPage === 1 ? hexToRgba(themeConfig.surface, 0.6) : themeConfig.cardBackground,
                        color: empPage === 1 ? hexToRgba(themeConfig.textSecondary, 0.7) : themeConfig.text,
                        borderColor: themeConfig.border,
                        cursor: empPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Previous
                    </button>

                    <span className="text-sm" style={{ color: themeConfig.text }}>
                      Page <span className="font-medium">{empPage}</span> / {totalEmpPages}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
                      disabled={empPage === totalEmpPages}
                      className="h-9 px-3 rounded-md text-sm font-medium border transition"
                      style={{
                        backgroundColor: empPage === totalEmpPages ? hexToRgba(themeConfig.surface, 0.6) : themeConfig.cardBackground,
                        color: empPage === totalEmpPages ? hexToRgba(themeConfig.textSecondary, 0.7) : themeConfig.text,
                        borderColor: themeConfig.border,
                        cursor: empPage === totalEmpPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </TableWrap>
            )}
          </div>

          {/* Slide-over Filters Panel */}
          {filtersOpen && (
            <div
              className="fixed inset-0 z-50"
              aria-modal="true"
              role="dialog"
              onKeyDown={(e) => e.key === 'Escape' && setFiltersOpen(false)}
            >
              {/* Backdrop */}
              <div
                className="absolute inset-0"
                onClick={() => setFiltersOpen(false)}
                style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
              />

              {/* Panel */}
              <div
                className="absolute inset-y-0 right-0 w-full sm:w-[420px] flex flex-col"
                style={{ backgroundColor: themeConfig.cardBackground, boxShadow: `-12px 0 24px ${hexToRgba(themeConfig.shadow || '#000', 0.25)}` }}
              >
                {/* Header */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: `1px solid ${themeConfig.border}` }}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-5 w-5" style={{ color: themeConfig.primary }} />
                    <h3 className="text-base font-semibold" style={{ color: themeConfig.text }}>Filters</h3>
                  </div>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="p-2 rounded-md"
                    aria-label="Close filters"
                    style={{ color: themeConfig.textSecondary }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    ✕
                  </button>
                </div>

                {/* Content (DRAFT controls) */}
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="grid grid-cols-1 gap-3">
                    <Field label={<LabelWithIcon icon={<CalendarDays className="h-4 w-4" />} text="Time Period" />} themeConfig={themeConfig}>
                      <select
                        className="rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 outline-none w-full"
                        value={draftFilters.days}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, days: Number(e.target.value) }))}
                        style={{
                          backgroundColor: themeConfig.inputBackground,
                          color: themeConfig.text,
                          border: `1px solid ${themeConfig.inputBorder}`,
                          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                        }}
                      >
                        {DAY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="From Date" />} themeConfig={themeConfig}>
                      <input
                        type="date"
                        className="rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 outline-none w-full"
                        value={draftFilters.fromDate}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, fromDate: e.target.value }))}
                        style={{
                          backgroundColor: themeConfig.inputBackground,
                          color: themeConfig.text,
                          border: `1px solid ${themeConfig.inputBorder}`,
                          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                        }}
                      />
                    </Field>

                    <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="To Date" />} themeConfig={themeConfig}>
                      <input
                        type="date"
                        className="rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 outline-none w-full"
                        value={draftFilters.toDate}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, toDate: e.target.value }))}
                        style={{
                          backgroundColor: themeConfig.inputBackground,
                          color: themeConfig.text,
                          border: `1px solid ${themeConfig.inputBorder}`,
                          boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                        }}
                      />
                    </Field>

                    {!isSuperAdmin && (
                      <Field label={<LabelWithIcon icon={<Eye className="h-4 w-4" />} text="View Type" />} themeConfig={themeConfig}>
                        <select
                          className="rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 outline-none w-full"
                          value={draftFilters.view}
                          onChange={(e) => setDraftFilters((d) => ({ ...d, view: e.target.value }))}
                          style={{
                            backgroundColor: themeConfig.inputBackground,
                            color: themeConfig.text,
                            border: `1px solid ${themeConfig.inputBorder}`,
                            boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                          }}
                        >
                          <option value="self">Self</option>
                          <option value="team">Team</option>
                          <option value="all" disabled={isEmployee}>
                            All
                          </option>
                        </select>
                      </Field>
                    )}

                    {(isSuperAdmin || isBranchManager) && (
                      <>
                        <Field label={<LabelWithIcon icon={<Briefcase className="h-4 w-4" />} text="Role (Profile)" />} themeConfig={themeConfig}>
                          <select
                            className="rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 outline-none w-full"
                            value={draftFilters.profileId}
                            onChange={(e) => setDraftFilters((d) => ({ ...d, profileId: e.target.value }))}
                            style={{
                              backgroundColor: themeConfig.inputBackground,
                              color: themeConfig.text,
                              border: `1px solid ${themeConfig.inputBorder}`,
                              boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                            }}
                          >
                            <option value="">All Roles</option>
                            {(profiles || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </>
                    )}

                    {/* Users Autocomplete (draft) */}
                    <div>
                      <label className="text-sm font-medium mb-1.5 block" style={{ color: themeConfig.text }}>
                        <LabelWithIcon icon={<User className="h-4 w-4" />} text="User (Employee)" />
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: themeConfig.textSecondary }} />
                        <input
                          className="rounded-lg pl-8 pr-3 py-2.5 w-full shadow-sm focus:ring-2 outline-none"
                          value={userSearch}
                          onFocus={() => !draftFilters.employeeCode && setShowSuggestions(true)}
                          onChange={(e) => {
                            setUserSearch(e.target.value);
                            if (!draftFilters.employeeCode) setShowSuggestions(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setShowSuggestions(false);
                          }}
                          placeholder="Search by name / code / email / phone"
                          style={{
                            backgroundColor: themeConfig.inputBackground,
                            color: themeConfig.text,
                            border: `1px solid ${themeConfig.inputBorder}`,
                            boxShadow: `0 4px 12px ${hexToRgba(themeConfig.shadow || '#000', 0.05)}`
                          }}
                        />
                        {showSuggestions && userSearch && !draftFilters.employeeCode && (
                          <div
                            className="absolute z-[60] rounded-lg mt-2 w-full max-h-64 overflow-auto shadow-md"
                            style={{ backgroundColor: themeConfig.cardBackground, border: `1px solid ${themeConfig.border}` }}
                          >
                            {filteredUsers.length === 0 ? (
                              <div className="px-3 py-2.5 text-sm" style={{ color: themeConfig.textSecondary }}>No users found</div>
                            ) : (
                              filteredUsers.map((u) => (
                                <button
                                  key={u.employee_code}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 transition-colors border-b last:border-b-0"
                                  onClick={() => {
                                    setDraftFilters((d) => ({ ...d, employeeCode: u.employee_code }));
                                    setUserSearch(`${u.name} (${u.employee_code})`);
                                    setShowSuggestions(false);
                                  }}
                                  style={{
                                    color: themeConfig.text,
                                    borderColor: hexToRgba(themeConfig.border, 0.7)
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.06); }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                                >
                                  <div className="font-medium" style={{ color: themeConfig.text }}>
                                    {u.name} <span style={{ color: themeConfig.primary }}>({u.employee_code})</span>
                                  </div>
                                  <div className="text-xs" style={{ color: themeConfig.textSecondary }}>
                                    {u.role_name} • {u.email} • {u.phone}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {draftFilters.employeeCode ? (
                        <div className="text-xs mt-1 font-medium flex items-center gap-1" style={{ color: themeConfig.success }}>
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Selected: {draftFilters.employeeCode}</span>
                        </div>
                      ) : (
                        <div className="text-xs mt-1 flex items-center gap-1" style={{ color: themeConfig.textSecondary }}>
                          <Info className="h-4 w-4" />
                          <span>No user selected</span>
                        </div>
                      )}
                    </div>

                    {optLoading && (
                      <div className="flex items-center gap-2 text-xs mt-2" style={{ color: themeConfig.primary }}>
                        <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: themeConfig.primary, borderTopColor: "transparent" }}></div>
                        Loading filter options…
                      </div>
                    )}
                    {optError && (
                      <div className="text-sm mt-1 rounded-lg px-3 py-2" style={{ color: themeConfig.error, backgroundColor: hexToRgba(themeConfig.error, 0.08) }}>{optError}</div>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="p-4 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${themeConfig.border}` }}>
                  <button
                    onClick={() => setDraftFilters(baseDefaults)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium transition"
                    style={{
                      backgroundColor: hexToRgba(themeConfig.textSecondary, 0.15),
                      color: themeConfig.text
                    }}
                  >
                    Reset
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFiltersOpen(false)}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium transition"
                      style={{
                        backgroundColor: themeConfig.cardBackground,
                        color: themeConfig.text,
                        border: `1px solid ${themeConfig.border}`
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setAppliedFilters(draftFilters);
                        setFiltersOpen(false);
                      }}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium transition"
                      style={{
                        backgroundColor: themeConfig.primary,
                        color: '#fff',
                        boxShadow: `0 10px 20px ${hexToRgba(themeConfig.primary, 0.25)}`
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primaryHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = themeConfig.primary; }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ----------------------------- UI bits ----------------------------- */
function LabelWithIcon({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-sm">{text}</span>
    </span>
  );
}
function Field({ label, children, themeConfig }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium mb-1.5" style={{ color: themeConfig?.textSecondary }}>{label}</label>
      {children}
    </div>
  );
}
function SectionHeader({ title, themeConfig }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div
        className="w-1 h-6 rounded-full"
        style={{
          background: `linear-gradient(180deg, ${themeConfig.primary} 0%, ${themeConfig.accent} 100%)`
        }}
      />
      <h2 className="text-xl font-semibold" style={{ color: themeConfig.text }}>{title}</h2>
    </div>
  );
}

/* --- Cards (theme-driven) --- */
function Card({ title, value, sub = '', icon, delta, className = '', themeConfig }) {
  return (
    <div
      className={` overflow-hidden rounded-xl group bg-[var(--theme-card-bg)] shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]${className}`}
    >
      <div className="grid grid-cols-[1fr,88px]">
        <div className="flex justify-between">
          <div className="">
            <div className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">{title}</div>
            <div className="mt-4 text-[22px] leading-tight font-bold rupee">{value ?? '—'}</div>

            <div className="mt-2 flex items-center px-4 gap-2">
              {typeof delta === 'number' && (
                <span className="px-2 py-[2px] rounded text-[11px] font-semibold">
                  {`${delta > 0 ? '+' : ''}${Number(delta).toFixed(2)}%`}
                </span>
              )}
              {sub && <span className="text-[11px] font-medium">{sub}</span>}
            </div>
          </div>

          <div
            className="flex items-center justify-center px-2"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--theme-primary-softer)]">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
/* --- Single-line Achieved / Total card --- */
/* --- Single-line Achieved / Total card (icon pinned top-right) --- */
function SingleLineTargetCard({
  title,
  achieved = 0,
  total = 0,
  icon,
  themeConfig,
}) {
  const pct = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--theme-card-bg)] shadow-lg hover:shadow-xl transition-all duration-300 p-5 border border-[var(--theme-border)]">
      {/* TOP-RIGHT icon + percent pill */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `rgba(0,0,0,0.06)` }}
        >
          {icon}
        </div>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-md"
          style={{
            color: themeConfig.primary,
            backgroundColor: `rgba(${parseInt(themeConfig.primary?.slice(1,3),16)},${parseInt(themeConfig.primary?.slice(3,5),16)},${parseInt(themeConfig.primary?.slice(5,7),16)},0.10)`,
            border: `1px solid rgba(0,0,0,0.12)`,
          }}
        >
          {pct}%
        </span>
      </div>

      {/* Content (add right padding so text never overlaps the icon area) */}
      <div className="flex items-start justify-between gap-3 pr-24">
        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-semibold tracking-wide mb-2"
            style={{ color: themeConfig.textSecondary }}
          >
            {title}
          </div>

          {/* Achieved / Total */}
          <div className="flex items-baseline gap-2 whitespace-normal sm:whitespace-nowrap">
            <span
              className="inline-flex items-baseline font-bold rupee shrink-0"
              style={{ color: themeConfig.primary, fontSize: 22, lineHeight: 1 }}
            >
              ₹&nbsp;{Number(achieved).toLocaleString('en-IN')}
            </span>

            <span
              className="inline-flex items-baseline font-semibold shrink-0"
              style={{ color: themeConfig.textSecondary, fontSize: 18, lineHeight: 1 }}
            >
              /
            </span>

            <span
              className="inline-flex items-baseline font-semibold rupee"
              style={{ color: themeConfig.text, fontSize: 18, lineHeight: 1 }}
            >
              ₹&nbsp;{Number(total).toLocaleString('en-IN')}
            </span>
          </div>

          {/* Progress bar */}
          <div
            className="mt-3 h-2 w-full rounded-full"
            style={{ backgroundColor: `rgba(0,0,0,0.12)` }}
          >
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${themeConfig.primary} 0%, ${themeConfig.accent} 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Two stats in one card --- */
function TwoStatCard({
  title,
  icon,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  themeConfig,
}) {
  return (
    <div className="overflow-hidden rounded-xl group bg-[var(--theme-card-bg)] shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[var(--theme-border)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">
            {title}
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-md px-3 py-2"
                 style={{ backgroundColor: hexToRgba(themeConfig.primary, 0.06), border: `1px solid ${hexToRgba(themeConfig.primary, 0.18)}` }}>
              <span className="text-xs font-semibold" style={{ color: themeConfig.textSecondary }}>{primaryLabel}</span>
              <span className="text-base font-bold rupee" style={{ color: themeConfig.primary }}>{primaryValue ?? '—'}</span>
            </div>

            <div className="flex items-center justify-between rounded-md px-3 py-2"
                 style={{ backgroundColor: hexToRgba(themeConfig.accent, 0.06), border: `1px solid ${hexToRgba(themeConfig.accent, 0.18)}` }}>
              <span className="text-xs font-semibold" style={{ color: themeConfig.textSecondary }}>{secondaryLabel}</span>
              <span className="text-base font-bold rupee" style={{ color: themeConfig.accent }}>{secondaryValue ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--theme-primary-softer)]">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* --- Tables & Tabs --- */
function TableWrap({ title, children, icon, className = '', themeConfig }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        backgroundColor: themeConfig.cardBackground,
        border: `1px solid ${themeConfig.border}`,
        boxShadow: `0 12px 24px ${hexToRgba(themeConfig.shadow || '#000', 0.12)}`
      }}
    >
      <div
        className="flex items-center p-6 justify-between rounded-t-2xl"
        style={{
          backgroundColor: themeConfig.surface,
          borderBottom: `1px solid ${themeConfig.border}`
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-base rupee">{icon}</span>}
          <h3 className="text-base font-semibold rupee" style={{ color: themeConfig.text }}>{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}
function SimpleTable({ cols = [], rows = [], className = '', themeConfig }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full text-sm" style={{ color: themeConfig.text }}>
        <thead className="sticky top-0 z-10">
          <tr
            className="backdrop-blur"
            style={{ backgroundColor: hexToRgba(themeConfig.cardBackground, 0.95), borderBottom: `1px solid ${themeConfig.border}` }}
          >
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold text-left rupee" style={{ color: themeConfig.text }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center" style={{ color: themeConfig.textSecondary }} colSpan={cols.length}>
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: `1px solid ${hexToRgba(themeConfig.border, 0.8)}`
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.04); }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 align-top rupee" style={{ color: themeConfig.text }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
function Tab({ active, onClick, children, themeConfig }) {
  const activeBG = themeConfig.primary;
  const inactiveBG = themeConfig.cardBackground;
  const inactiveBorder = themeConfig.border;

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-colors border"
      style={{
        background: active ? activeBG : inactiveBG,
        color: active ? '#fff' : themeConfig.text,
        borderColor: active ? activeBG : inactiveBorder,
        boxShadow: active ? `0 10px 20px ${hexToRgba(activeBG, 0.25)}` : 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = hexToRgba(themeConfig.primary, 0.06);
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = inactiveBG;
      }}
    >
      {children}
    </button>
  );
}

/* --- Pie Panels --- */
function Dot({ color }) {
  return <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />;
}
const N = (v) => Math.max(0, Number(v) || 0);

function LeadsPiePanel({ data, themeConfig, COLORS_AGE, COLORS_OUT, COLORS_PER }) {
  if (!data) return <p className="text-center py-10" style={{ color: themeConfig.textSecondary }}>No lead data available.</p>;

  const ageData = [
    { name: 'Fresh Lead', value: N(data?.cards?.leads?.fresh_leads) },
    { name: 'Old Leads', value: N(data?.cards?.leads?.old_leads) },
  ];

  const outcomeData = (() => {
    const total = N(data?.cards?.leads?.total_uploaded);
    const clients = N(data?.cards?.leads?.total_clients);
    const ft = N(data?.cards?.leads?.total_ft);
    const others = Math.max(0, total - clients - ft);
    return [
      { name: 'Clients', value: clients },
      { name: 'FT', value: ft },
      { name: 'Others', value: others },
    ];
  })();

  const periodData = (() => {
    const total = N(data?.cards?.leads?.total_uploaded);
    const week = N(data?.cards?.leads?.this_week);
    const month = N(data?.cards?.leads?.this_month);
    const rest = Math.max(0, total - week - month);
    return [
      { name: 'This Week', value: week },
      { name: 'This Month', value: month },
      { name: 'Rest', value: rest },
    ];
  })();

  const renderPie = (title, dataset, COLORS) => {
    const total = dataset.reduce((s, x) => s + x.value, 0);

    return (
      <div
        className="rounded-xl px-5 shadow-md transition-all duration-300 h-full"
        style={{
          backgroundColor: hexToRgba(themeConfig.cardBackground, 0.95),
          border: `1px solid ${themeConfig.border}`,
          color: themeConfig.text
        }}
      >
        <h3 className="text-lg font-semibold py-3" style={{ color: themeConfig.text }}>{title}</h3>

        <div className="flex flex-col justify-between">
          <div className="md:col-span-1">
            <ul className="space-y-2">
              {dataset.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dot color={COLORS[i % COLORS.length]} />
                    <span className="text-sm" style={{ color: themeConfig.text }}>{item.name}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: themeConfig.text }}>
                    {Number(item.value).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-sm" style={{ color: themeConfig.textSecondary }}>
              <span className="font-medium" style={{ color: themeConfig.text }}>Total:</span>{' '}
              {Number(total).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="h-72 flex items-end justify-end mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataset}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={55}
                  paddingAngle={3}
                  labelLine
                  label={({ name }) => `${name}`}
                >
                  {dataset.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: themeConfig.cardBackground,
                    border: `1px solid ${themeConfig.border}`,
                    color: themeConfig.text
                  }}
                  formatter={(v, n) => [Number(v).toLocaleString('en-IN'), n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {renderPie('Lead Age Composition', ageData, COLORS_AGE)}
      {renderPie('Outcome Breakdown', outcomeData, COLORS_OUT)}
    </div>
  );
}

function EmployeeTableAccordion({ cols = [], rows = [], otherResponses = [], expanded, onToggle, themeConfig }) {
  return (
    <div
      className="overflow-x-auto w-full "
      style={{
        backgroundColor: themeConfig.cardBackground,
        // border: `1px solid ${themeConfig.border}`,
        boxShadow: `0 12px 24px ${hexToRgba(themeConfig.shadow || '#000', 0.12)}`
      }}
    >
      <table className="min-w-full text-sm" style={{ color: themeConfig.text }}>
        <thead className="sticky top-0 z-10">
          <tr
            className="backdrop-blur"
            style={{ backgroundColor: hexToRgba(themeConfig.cardBackground, 0.95), borderBottom: `1px solid ${themeConfig.border}` }}
          >
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold text-left" style={{ color: themeConfig.text }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center" style={{ color: themeConfig.textSecondary }} colSpan={cols.length}>
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((u) => {
              const map = u?.all_lead || {};
              const code = u.employee_code;
              const isOpen = expanded?.has?.(code);

              return (
                <React.Fragment key={code}>
                  {/* Main row (click employee name to toggle) */}
                  <tr
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-controls={`emp-acc-${code}`}
                    onClick={() => onToggle(code)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggle(code);
                      }
                    }}
                    style={{
                      borderBottom: `1px solid ${hexToRgba(themeConfig.border, 0.8)}`
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hexToRgba(themeConfig.primary, 0.04); }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium inline-flex items-center gap-2" style={{ color: themeConfig.text }}>
                        {u.employee_name} <span style={{ color: themeConfig.textSecondary }}>({code})</span>
                      </span>
                    </td>

                    <td className="px-3 py-2.5" style={{ color: themeConfig.textSecondary }}>{u.role_name || u.role_id}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.accent }}>{num(u.total_leads)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.primary }}>{num(u.converted_leads)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.primaryHover || themeConfig.primary }}>{num(map?.['FT'] ?? 0)}</td>
                    <td className="px-3 py-2.5" style={{ color: themeConfig.secondary }}>{num(map?.['CALL BACK'] ?? 0)}</td>
                    <td className="px-3 py-2.5 font-medium" style={{ color: themeConfig.error }}>{inr(u.total_revenue)}</td>
                  </tr>

                  {/* Expanded row */}
                  {isOpen && (
                    <tr id={`emp-acc-${code}`} style={{ backgroundColor: themeConfig.surface, borderBottom: `1px solid ${themeConfig.border}` }}>
                      <td className="px-3 py-3" colSpan={cols.length}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {otherResponses.map((name) => (
                            <div
                              key={`${code}-${name}`}
                              className="flex items-center justify-between px-3 py-2 rounded-lg"
                              style={{
                                backgroundColor: themeConfig.cardBackground,
                                border: `1px solid ${themeConfig.border}`
                              }}
                            >
                              <span className="text-xs" style={{ color: themeConfig.textSecondary }}>{name}</span>
                              <span className="text-sm font-semibold" style={{ color: themeConfig.text }}>
                                {num(map?.[name] ?? 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
