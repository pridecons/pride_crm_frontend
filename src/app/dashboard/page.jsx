'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { axiosInstance } from '@/api/Axios';
import {
  PhoneCall,
  PhoneIncoming,
  Clock3,
  PhoneOff
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import {
  Building2,
  Store,
  CalendarDays,
  Calendar,
  Eye,
  User,
  Users,
  Search,
  CheckCircle2,
  Info,
  BarChart3,
  Briefcase,
  AlertTriangle,
  LineChart,
  IndianRupee,
  CalendarCheck,
  Target,
  SlidersHorizontal,
} from 'lucide-react';

/* ----------------------------- Helpers ----------------------------- */

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

/* ----------------------------- Component ----------------------------- */
export default function Dashboard() {
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

  /* ----------------------------- Filters (from FIRST) ----------------------------- */
  // DRAFT: edited in UI (panel + inline)
  const defaultDraft = {
    days: 30,
    fromDate: '',
    toDate: '',
    view: 'all',
    profileId: '',
    departmentId: '',
    employeeCode: '',
  };
  const [draftFilters, setDraftFilters] = useState(defaultDraft);

  // APPLIED: used for API calls
  const [appliedFilters, setAppliedFilters] = useState(defaultDraft);

  // Keep “view” sane for employees (no 'all')
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

  // Users autocomplete (draft)
  const [userSearch, setUserSearch] = useState('');
  const debUserSearch = useDebouncedValue(userSearch, 200);

  // Branch tabs: SA can change; others are locked
  const [branches, setBranches] = useState([]); // [{id, name}]
  const [branchTabId, setBranchTabId] = useState(''); // '' means All for SA

  // role-aware baseline for "no filters"
  const baseDefaults = useMemo(
    () => ({
      days: 30,
      fromDate: '',
      toDate: '',
      view: isEmployee ? 'self' : 'all',
      profileId: '',
      departmentId: '',
      employeeCode: '',
    }),
    [isEmployee]
  );

  // whether anything is applied (or SA switched branch)
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
        const [profRes, deptRes, usersRes, branchesRes, respRes] = await Promise.all([
          axiosInstance.get('/profile-role', { params: { skip: 0, limit: 50, order_by: 'hierarchy_level' } }),
          axiosInstance.get('/departments', { params: { skip: 0, limit: 50, order_by: 'name' } }),
          axiosInstance.get('/users', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/branches', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/lead-config/responses/', { params: { skip: 0, limit: 100 } }),
        ]);
        setProfiles((profRes.data || []).map((p) => ({ id: p.id, name: p.name, lvl: p.hierarchy_level })));
        setDepartments((deptRes.data || []).map((d) => ({ id: d.id, name: d.name })));
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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const res = await axiosInstance.get('/analytics/leads/dashboard', { params: queryParams });
      setData(res.data || {});
    } catch (e) {
      setErrMsg(e?.response?.data?.detail || e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTable = async () => {
    try {
      setLoading(true);
      setErrMsg('');
      const res = await axiosInstance.get('/analytics/leads/users', { params: queryParams });
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
    fetchUserTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryParams]);

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
    () => ['Employee', 'Role', 'Leads', 'Converted', 'FT', 'CALL BACK', 'Revenue'],
    []
  );


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 md:p-6 space-y-6 mx-2">
        {/* Greeting header (BM & Employees) */}
        {!isSuperAdmin && (
          <div className="w-fit">
            <h1 className="text-2xl font-semibold text-gray-900">
              {getGreeting()}, {firstName}!
            </h1>
            <p className="text-gray-600 mt-0.5 text-sm">
              Here’s your performance overview for {appliedFilters.days === 1 ? 'today' : `the last ${appliedFilters.days} days`}
            </p>
          </div>
        )}

        {/* Branch Tabs */}
        {isSuperAdmin && (
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 p-3 shadow-md">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Tab active={branchTabId === ''} onClick={() => setBranchTabId('')}>
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
              <span className="hidden md:inline-flex px-2 py-1 text-xs rounded-full bg-white/80 border border-gray-200 text-gray-700">
                From: {appliedFilters.fromDate}
              </span>
            )}
            {appliedFilters.toDate && (
              <span className="hidden md:inline-flex px-2 py-1 text-xs rounded-full bg-white/80 border border-gray-200 text-gray-700">
                To: {appliedFilters.toDate}
              </span>
            )}
            {!!appliedFilters.employeeCode && (
              <span className="hidden md:inline-flex px-2 py-1 text-xs rounded-full bg-white/80 border border-gray-200 text-gray-700">
                Emp: {appliedFilters.employeeCode}
              </span>
            )}
            {showReset && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50"
                title="Reset filters"
              >
                <span className="text-sm font-medium">Reset</span>
              </button>
            )}

            <button type="button" onClick={() => setFiltersOpen(true)} title="Open filters">
              <SlidersHorizontal className="h-6 w-5 text-blue-600" />
            </button>
          </div>
        </div>

        {/* Errors */}
        {errMsg ? (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded-lg shadow-sm">
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
              <div key={i} className="h-28 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl animate-pulse shadow" />
            ))}
          </div>
        )}

        {/* Cards */}
        {!!data && (
          <>
            <SectionHeader title="Payments Overview" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card title="Total Target" value={inr(data?.cards?.payments?.total_target)} icon={<IndianRupee className="h-5 w-5" />} color="pink" />
              <Card title="Achieved Target" value={inr(data?.cards?.payments?.achieved_target)} icon={<Target className="h-5 w-5" />} color="emerald" />
              <Card title="Today Payment" value={inr(data?.cards?.payments?.weekly_paid)} icon={<CalendarCheck className="h-5 w-5" />} color="purple" />
              <Card title="Running FT Leads" value={num(data?.cards?.leads?.total_ft)} icon={<CalendarDays className="h-5 w-5" />} color="indigo" />
            </div>

            <SectionHeader title="Call Analytics" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card
                title="Total Calls"
                value={num(data?.cards?.calls?.total)}
                icon={<PhoneCall className="h-5 w-5" />}
                color="indigo"
              />
              <Card
                title="Answered Calls"
                value={num(data?.cards?.calls?.answered)}
                icon={<PhoneIncoming className="h-5 w-5" />}
                color="emerald"
              />
              <Card
                title="Missed Calls"
                value={num(data?.cards?.calls?.missed)}
                icon={<PhoneOff className="h-5 w-5" />}
                color="red"
              />
              <Card
                title="Avg Duration"
                value={data?.cards?.calls?.duration_hms || "00:00:00"}
                icon={<Clock3 className="h-5 w-5" />}
                color="purple"
              />
            </div>

            <SectionHeader title="Leads Analytics" />
            <LeadsPiePanel data={data} />

          </>
        )}

        {/* Top performers */}
        {!!data && (
          <div className="gap-4">
            {isSuperAdmin && (
              <TableWrap className="mb-6 px-3" title="Top Branches (Revenue)" icon={<Building2 className="h-5 w-5 text-purple-500" />}>
                <div className="max-h-72 overflow-y-auto pr-1">
                  <SimpleTable
                    cols={['Branch', 'Revenue', 'Paid Count', 'Conversion %']}
                    rows={(data?.top?.branches || []).map((b) => [
                      <span className="font-medium text-gray-800" key={`${b.branch_code}-name`}>
                        {b.branch_name || '—'}
                      </span>,
                      <span className="text-blue-600 font-medium" key={`${b.branch_code}-rev`}>
                        {inr(b.revenue)}
                      </span>,
                      <span className="text-gray-700" key={`${b.branch_code}-paid`}>
                        {num(b.paid_count)}
                      </span>,
                      <span
                        className={`font-semibold ${Number(b.conversion_rate) >= 50 ? 'text-green-600' : 'text-red-600'}`}
                        key={`${b.branch_code}-rate`}
                      >
                        {b.conversion_rate ?? 0}%
                      </span>,
                    ])}
                    className="w-full border border-gray-200 rounded-2xl shadow-sm bg-white"
                  />
                </div>
              </TableWrap>
            )}

            <div className="mt-6">
              <TableWrap
                className="mb-6 px-3"
                title={`Top Employees (${isEmployee ? 'Team (Top 5)' : 'Top 10'})`}
                icon={<Users className="h-5 w-5 text-blue-500 " />}
              >
                <div className="max-h-72 overflow-y-auto pr-1">
                  <SimpleTable
                    cols={['Employee', 'Role', 'Leads', 'Converted', 'Revenue', 'Target', 'Achieved', 'Conv %']}
                    rows={(data?.top?.employees || []).map((e) => [
                      <span className="font-medium text-gray-800" key={`${e.employee_code}-name`}>
                        {e.employee_name} <span className="text-gray-400">({e.employee_code})</span>
                      </span>,
                      <span className="text-gray-600" key={`${e.employee_code}-role`}>
                        {e.role_name || e.role_id}
                      </span>,
                      <span className="text-gray-700" key={`${e.employee_code}-leads`}>
                        {num(e.total_leads)}
                      </span>,
                      <span className="text-gray-700" key={`${e.employee_code}-conv`}>
                        {num(e.converted_leads)}
                      </span>,
                      <span className="text-blue-600 font-medium" key={`${e.employee_code}-rev`}>
                        {inr(e.total_revenue)}
                      </span>,
                      <span className="text-[#33FFCC]" key={`${e.employee_code}-tgt`}>
                        {inr(e.target)}
                      </span>,
                      <span className="text-indigo-600" key={`${e.employee_code}-ach`}>
                        {inr(e.achieved_target ?? e.total_revenue)}
                      </span>,
                      <span
                        className={`font-semibold ${Number(e.conversion_rate) >= 50 ? 'text-green-600' : 'text-red-600'}`}
                        key={`${e.employee_code}-rate`}
                      >
                        {e.conversion_rate}%
                      </span>,
                    ])}
                    className="w-full border border-gray-200 rounded-2xl shadow-sm bg-white "
                  />
                </div>
              </TableWrap>
            </div>
          </div>
        )}

        {/* Profiles (admin & BM only) */}
        {!!data && (isSuperAdmin || isBranchManager) && (
          <div className="grid grid-cols-1 gap-4">
            <TableWrap className="mb-6 px-3" title="Profile-wise Analysis" icon={<Briefcase className="h-5 w-5 text-yellow-600" />}>
              <div className="max-h-72 overflow-y-auto pr-1">
                <SimpleTable
                  cols={['Profile', 'Leads', 'Paid Revenue']}
                  rows={(data?.breakdowns?.profile_wise || []).map((p) => {
                    const prof = profiles.find((x) => x.id === p.profile_id);
                    return [
                      <span className="font-medium text-gray-800" key={`${p.profile_id}-name`}>
                        {prof?.name || (p.profile_id ?? '—')}
                      </span>,
                      <span className="text-gray-700" key={`${p.profile_id}-leads`}>
                        {num(p.total_leads)}
                      </span>,
                      <span className="text-blue-600 font-medium" key={`${p.profile_id}-revenue`}>
                        {inr(p.paid_revenue)}
                      </span>,
                    ];
                  })}
                  className="w-full border border-gray-200 rounded-2xl shadow-sm bg-white"
                />
              </div>
            </TableWrap>
          </div>
        )}

        {/* Users table — SECOND table look, FIRST inline draft+apply */}
        {!!employeesTable && (
          <TableWrap
            className="mb-6 px-3"
            title={`Employee Performance (${isEmployee ? 'Your Team' : 'All (scoped)'})`}
            icon={<LineChart className="h-5 w-5 text-green-500" />}
          >
            {/* Inline filters (draft) with Apply */}
            <div className="mb-3 px-1">
              <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={draftFilters.fromDate}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, fromDate: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={draftFilters.toDate}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, toDate: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Days</label>
                  <select
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={draftFilters.days}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, days: Number(e.target.value) }))}
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
                      setDraftFilters((d) => ({
                        ...d,
                        fromDate: '',
                        toDate: '',
                        days: 30,
                      }))
                    }
                    className="h-9 px-3 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => setAppliedFilters(draftFilters)}
                    className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
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
              />
            </div>



            {/* Pagination */}
            <div className="mt-3 flex items-center justify-between px-3">
              <div className="text-xs text-gray-600">
                {totalEmp === 0 ? 'No records' : `Showing ${startIdx + 1}–${endIdx} of ${totalEmp}`}
              </div>

              <div className="flex items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => setEmpPage((p) => Math.max(1, p - 1))}
                  disabled={empPage === 1}
                  className={`h-9 px-3 rounded-md text-sm font-medium border ${empPage === 1
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  Previous
                </button>

                <span className="text-sm text-gray-700">
                  Page <span className="font-medium">{empPage}</span> / {totalEmpPages}
                </span>

                <button
                  type="button"
                  onClick={() => setEmpPage((p) => Math.min(totalEmpPages, p + 1))}
                  disabled={empPage === totalEmpPages}
                  className={`h-9 px-3 rounded-md text-sm font-medium border ${empPage === totalEmpPages
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  Next
                </button>
              </div>
            </div>
          </TableWrap>
        )}
      </div>

      {/* Slide-over Filters Panel (from FIRST) */}
      {filtersOpen && (
        <div
          className="fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
          onKeyDown={(e) => e.key === 'Escape' && setFiltersOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />

          {/* Panel */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">Filters</h3>
              </div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            {/* Content (DRAFT controls) */}
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 gap-3">
                <Field label={<LabelWithIcon icon={<CalendarDays className="h-4 w-4" />} text="Time Period" />}>
                  <select
                    className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                    value={draftFilters.days}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, days: Number(e.target.value) }))}
                  >
                    {DAY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                </Field>

                <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="From Date" />}>
                  <input
                    type="date"
                    className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                    value={draftFilters.fromDate}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, fromDate: e.target.value }))}
                  />
                </Field>

                <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="To Date" />}>
                  <input
                    type="date"
                    className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                    value={draftFilters.toDate}
                    onChange={(e) => setDraftFilters((d) => ({ ...d, toDate: e.target.value }))}
                  />
                </Field>

                {!isSuperAdmin && (
                  <Field label={<LabelWithIcon icon={<Eye className="h-4 w-4" />} text="View Type" />}>
                    <select
                      className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                      value={draftFilters.view}
                      onChange={(e) => setDraftFilters((d) => ({ ...d, view: e.target.value }))}
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
                    <Field label={<LabelWithIcon icon={<Briefcase className="h-4 w-4" />} text="Role (Profile)" />}>
                      <select
                        className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                        value={draftFilters.profileId}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, profileId: e.target.value }))}
                      >
                        <option value="">All Roles</option>
                        {(profiles || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label={<LabelWithIcon icon={<Building2 className="h-4 w-4" />} text="Department" />}>
                      <select
                        className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 w-full"
                        value={draftFilters.departmentId}
                        onChange={(e) => setDraftFilters((d) => ({ ...d, departmentId: e.target.value }))}
                      >
                        <option value="">All Departments</option>
                        {(departments || []).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                {/* Users Autocomplete (draft) */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    <LabelWithIcon icon={<User className="h-4 w-4" />} text="User (Employee)" />
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      className="border border-gray-200 bg-white rounded-lg pl-8 pr-3 py-2.5 w-full shadow-sm focus:ring-2 focus:ring-blue-500"
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
                    />
                    {showSuggestions && userSearch && !draftFilters.employeeCode && (
                      <div className="absolute z-[60] bg-white border border-gray-200 rounded-lg mt-2 w-full max-h-64 overflow-auto shadow-md">
                        {filteredUsers.length === 0 ? (
                          <div className="px-3 py-2.5 text-sm text-gray-500">No users found</div>
                        ) : (
                          filteredUsers.map((u) => (
                            <button
                              key={u.employee_code}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm transition-colors border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setDraftFilters((d) => ({ ...d, employeeCode: u.employee_code }));
                                setUserSearch(`${u.name} (${u.employee_code})`);
                                setShowSuggestions(false);
                              }}
                            >
                              <div className="font-medium text-gray-800">
                                {u.name} <span className="text-blue-600">({u.employee_code})</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {u.role_name} • {u.email} • {u.phone}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {draftFilters.employeeCode ? (
                    <div className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Selected: {draftFilters.employeeCode}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      <span>No user selected</span>
                    </div>
                  )}
                </div>

                {optLoading && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading filter options…
                  </div>
                )}
                {optError && (
                  <div className="text-sm text-red-600 mt-1 bg-red-50 px-3 py-2 rounded-lg">{optError}</div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t flex items-center justify-between gap-2">
              <button
                onClick={() => setDraftFilters(baseDefaults)}
                className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
              >
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="px-4 py-2.5 rounded-lg bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setAppliedFilters(draftFilters);
                    setFiltersOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
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

/* ----------------------------- UI bits ----------------------------- */
function LabelWithIcon({ icon, text }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="text-sm">{text}</span>
    </span>
  );
}
function Field({ label, children }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
    </div>
  );
}

/* --- Cards (from SECOND) --- */
const colorThemes = {
  pink: { base: 'bg-pink-500', side: 'bg-pink-600' },
  purple: { base: 'bg-violet-500', side: 'bg-violet-600' },
  blue: { base: 'bg-sky-500', side: 'bg-sky-600' },
  indigo: { base: 'bg-indigo-500', side: 'bg-indigo-600' },
  green: { base: 'bg-green-500', side: 'bg-green-600' },
  emerald: { base: 'bg-emerald-500', side: 'bg-emerald-600' },
  orange: { base: 'bg-orange-500', side: 'bg-orange-600' },
  teal: { base: 'bg-teal-500', side: 'bg-teal-600' },
};

const deltaPill = (v) =>
  typeof v === 'number' ? `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%` : null;

function Card({ title, value, sub = 'Since last month', icon, color = 'blue', delta, className = '' }) {
  const theme = colorThemes[color] || colorThemes.blue;

  return (
    <div className={`shadow-sm overflow-hidden ${theme.base} ${className}`}>
      <div className="grid grid-cols-[1fr,88px]">
        <div className="flex justify-between">
          <div className="p-4">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-white/80">{title}</div>
            <div className="mt-1 text-[22px] leading-tight font-bold text-white rupee">{value ?? '—'}</div>

            <div className="mt-2 flex items-center px-4 gap-2">
              {typeof delta === 'number' && (
                <span className="px-2 py-[2px] rounded text-[11px] font-semibold bg-white/20 text-white">
                  {deltaPill(delta)}
                </span>
              )}
              {sub && <span className="text-[11px] font-medium text-white/90">{sub}</span>}
            </div>
          </div>

          <div className={`${theme.side} flex items-center justify-center px-2`}>
            <div className="w-10 h-10 rounded-md bg-white/10 flex items-center justify-center text-white">{icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Tables & Tabs (from SECOND with className support) --- */
function TableWrap({ title, children, icon, className = '' }) {
  return (
    <div className={`bg-white border border-white/50 shadow-md ${className}`}>
      <div className="flex items-center bg-gray-50 p-2 justify-between ">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base rupee">{icon}</span>}
          <h3 className="text-base font-semibold text-gray-800 rupee">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}
function SimpleTable({ cols = [], rows = [], className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-white/90 backdrop-blur border-b border-gray-200 rupee">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold text-gray-700 text-left rupee">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-gray-400 text-center" colSpan={cols.length}>
                <div className="flex flex-col items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <span>No data available</span>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/50">
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 text-gray-700 align-top rupee">
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
function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
        active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* --- Pie Panels (from SECOND) --- */
function Dot({ color }) {
  return <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />;
}
const N = (v) => Math.max(0, Number(v) || 0);

const COLORS_AGE = ['#DC143C', '#FFD700']; // Fresh, Old
const COLORS_OUT = ['#483D8B', '#8B008B', '#0000CD']; // Clients, FT, Others
const COLORS_PER = ['#8ec3eb', '#2a6592', '#22C55E']; // This week, This month, Rest

function LeadsPiePanel({ data }) {
  if (!data) return <p className="text-gray-500 text-center py-10">No lead data available.</p>;

  const ageData = [
    { name: 'Fresh', value: N(data?.cards?.leads?.fresh_leads) },
    { name: 'Old', value: N(data?.cards?.leads?.old_leads) },
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
      <div className="bg-white/80 backdrop-blur-sm border border-white/50 px-5 shadow-md transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

        <div className="gap-2">
          <div className="order-2 md:order-1 md:col-span-1">
            <ul className="space-y-2">
              {dataset.map((item, i) => (
                <li key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dot color={COLORS[i % COLORS.length]} />
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {Number(item.value).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-sm text-gray-600">
              <span className="font-medium text-gray-800">Total:</span>{' '}
              {Number(total).toLocaleString('en-IN')}
            </div>
          </div>

          <div className="h-80">
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
                <Tooltip formatter={(v, n) => [Number(v).toLocaleString('en-IN'), n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {renderPie('Lead Age Composition', ageData, COLORS_AGE)}
      {renderPie('Outcome Breakdown', outcomeData, COLORS_OUT)}
      {renderPie('Period Distribution', periodData, COLORS_PER)}
    </div>
  );
}


function EmployeeTableAccordion({ cols = [], rows = [], otherResponses = [], expanded, onToggle }) {
  return (
    <div className="overflow-x-auto w-full border border-gray-200 rounded-2xl shadow-sm bg-white">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-white/90 backdrop-blur border-b border-gray-200">
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 font-semibold text-gray-700 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(rows || []).length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-gray-400 text-center" colSpan={cols.length}>
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
                    className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
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
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-gray-800 inline-flex items-center gap-2">
                        {u.employee_name} <span className="text-gray-400">({code})</span>
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-gray-600">{u.role_name || u.role_id}</td>
                    <td className="px-3 py-2.5 text-[#33FFCC]">{num(u.total_leads)}</td>
                    <td className="px-3 py-2.5 text-blue-600">{num(u.converted_leads)}</td>
                    <td className="px-3 py-2.5 text-indigo-600">{num(map?.['FT'] ?? 0)}</td>
                    <td className="px-3 py-2.5 text-purple-700">{num(map?.['CALL BACK'] ?? 0)}</td>
                    <td className="px-3 py-2.5 text-red-600 font-medium">{inr(u.total_revenue)}</td>
                  </tr>

                  {/* Expanded row */}
                  {isOpen && (
                    <tr className="bg-gray-50 border-b border-gray-100" id={`emp-acc-${code}`}>
                      <td className="px-3 py-3" colSpan={cols.length}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {otherResponses.map((name) => (
                            <div
                              key={`${code}-${name}`}
                              className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200"
                            >
                              <span className="text-xs text-gray-600">{name}</span>
                              <span className="text-sm font-semibold text-gray-800">
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
