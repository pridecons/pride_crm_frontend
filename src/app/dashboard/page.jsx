'use client';

import { useEffect, useMemo, useState } from 'react';
import Cookies from 'js-cookie';
import { axiosInstance } from '@/api/Axios';
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
  MessageSquare,
  Briefcase,
  RotateCcw,
  SlidersHorizontal,
  AlertTriangle,
  LineChart,
  ClipboardList,
  Zap,
  Flame,
  Sparkles,
  IndianRupee,
  ArrowUpRight,
  CalendarCheck,
  Target,
} from 'lucide-react';

/* -----------------------------
   Helpers
----------------------------- */
// Extract a first-name from name/username safely
function getFirstName(nameLike, usernameLike) {
  const name = (nameLike || '').trim();
  if (name) return name.split(/\s+/)[0];               // first word of full name

  const uname = (usernameLike || '').trim();
  if (!uname) return 'User';
  // if username is an email, take before '@', then split on separators
  const base = uname.includes('@') ? uname.split('@')[0] : uname;
  return (base.split(/[._-]/)[0] || 'User');            // e.g. "amit.kumar" -> "amit"
}

function safeJSON(str) { try { return JSON.parse(str); } catch { return null; } }

// utils/money.js
const formatIndianGrouping = (n) => {
  const s = Math.trunc(Math.abs(n)).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + "," + last3;
};

const inr = (n) => {
  const num = Number(n || 0);
  // try modern
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num).replace(/^/, "\u20B9 ");
  } catch {
    // very old fallback
    return "\u20B9 " + formatIndianGrouping(num);
  }
};


const num = (n) => Number(n || 0).toLocaleString('en-IN');

function useDebouncedValue(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

// Greeting logic (same behavior as the reference page)
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Hello';
}

/* -----------------------------
   Component
----------------------------- */
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

  const userBranchId =
    user?.branch_id ??
    user?.user?.branch_id ??
    '';

  const myCode =
    user?.sub || user?.employee_code || user?.user?.employee_code || '';

  const firstName = useMemo(() => {
    const nm = user?.name ?? user?.user?.name ?? '';
    const un = user?.username ?? user?.user?.username ?? '';
    return getFirstName(nm, un);
  }, [user]);

  /* -----------------------------
     Filters
  ----------------------------- */
  const [days, setDays] = useState(30);
  const [view, setView] = useState('all'); // will be forced to 'team' for employees below
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // API-backed dropdowns
  // const [sourceId, setSourceId] = useState('');
  // const [responseId, setResponseId] = useState('');
  const [profileId, setProfileId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  // Users autocomplete (sends employee_code)
  const [employeeCode, setEmployeeCode] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const debUserSearch = useDebouncedValue(userSearch, 200);

  // Branch tabs: SA can change; others are locked
  const [branches, setBranches] = useState([]); // [{id, name}]
  const [branchTabId, setBranchTabId] = useState(''); // '' means All for SA

  // Load options + branches
  // const [sources, setSources] = useState([]);
  // const [responses, setResponses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Raw users (from API)
  const [usersList, setUsers] = useState([]);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setOptLoading(true);
        setOptError('');

        const [
          // srcRes,
          // respRes,
          profRes,
          deptRes,
          usersRes,
          branchesRes,
        ] = await Promise.all([
          // axiosInstance.get('/lead-config/sources', { params: { skip: 0, limit: 100 } }),
          // axiosInstance.get('/lead-config/responses', { params: { skip: 0, limit: 100 } }),
          axiosInstance.get('/profile-role', { params: { skip: 0, limit: 50, order_by: 'hierarchy_level' } }),
          axiosInstance.get('/departments', { params: { skip: 0, limit: 50, order_by: 'name' } }),
          axiosInstance.get('/users', { params: { skip: 0, limit: 100, active_only: false } }),
          axiosInstance.get('/branches', { params: { skip: 0, limit: 100, active_only: false } }),
        ]);

        // setSources((srcRes.data || []).map(s => ({ id: s.id, name: s.name })));
        // setResponses((respRes.data || []).map(r => ({ id: r.id, name: r.name })));
        setProfiles((profRes.data || []).map(p => ({ id: p.id, name: p.name, lvl: p.hierarchy_level })));
        setDepartments((deptRes.data || []).map(d => ({ id: d.id, name: d.name })));

        // Keep fields needed for scoping
        const ulist = (usersRes.data?.data || []).map(u => ({
          employee_code: u.employee_code,
          name: u.name,
          email: u.email,
          phone: u.phone_number,
          role_name: u.profile_role?.name ?? String(u.role_id ?? ''),
          branch_id: u.branch_id,
          senior_code: u.senior_profile_id || null,
        }));
        setUsers(ulist);

        setBranches((branchesRes.data || []).map(b => ({ id: b.id, name: b.name })));
      } catch (e) {
        setOptError(e?.response?.data?.detail || e?.message || 'Failed to load filter options');
      } finally {
        setOptLoading(false);
      }
    })();
  }, [user]);

  // Force employees not to use 'all'
  useEffect(() => {
    if (isEmployee && view === 'all') setView('self');
  }, [isEmployee, view]);

  // Effective branch for queries:
  // - SA: branchTabId ('' = all)
  // - Others: locked to user's branch
  const effectiveBranchId = isSuperAdmin ? branchTabId : (userBranchId || '');

  /* ---------------------------------------------------
     Users scope: SA = all, BM = branch, Others = team
  --------------------------------------------------- */
  const allowedUsers = useMemo(() => {
    if (!usersList?.length) return [];

    if (isSuperAdmin) {
      return usersList;
    }

    if (isBranchManager) {
      return usersList.filter(u => String(u.branch_id) === String(userBranchId));
    }

    // Others: only their team (direct + indirect reports) + themselves
    const bySenior = usersList.reduce((m, u) => {
      if (!m[u.senior_code || '']) m[u.senior_code || ''] = [];
      m[u.senior_code || ''].push(u);
      return m;
    }, /** @type {Record<string, any[]>} */({}));

    const teamSet = new Set([myCode]); // include self
    const queue = [myCode];
    while (queue.length) {
      const lead = queue.shift();
      for (const child of (bySenior[lead] || [])) {
        if (!teamSet.has(child.employee_code)) {
          teamSet.add(child.employee_code);
          queue.push(child.employee_code);
        }
      }
    }
    return usersList.filter(u => teamSet.has(u.employee_code));
  }, [usersList, isSuperAdmin, isBranchManager, userBranchId, myCode]);

  // If selected employee goes out of scope, clear it
  useEffect(() => {
    if (employeeCode && !allowedUsers.some(u => u.employee_code === employeeCode)) {
      setEmployeeCode('');
      setUserSearch('');
    }
  }, [employeeCode, allowedUsers]);

  /* -----------------------------
     Dashboard data
  ----------------------------- */
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [data, setData] = useState(null);
  const [employeesTable, setEmployeesTable] = useState([]);

  const queryParams = useMemo(() => {
    const p = { days, view };
    if (fromDate) p.from_date = fromDate;
    if (toDate) p.to_date = toDate;
    if (effectiveBranchId) p.branch_id = Number(effectiveBranchId);
    if (employeeCode) p.employee_id = employeeCode;
    // if (sourceId) p.source_id = Number(sourceId);
    // if (responseId) p.response_id = Number(responseId);
    if (profileId) p.profile_id = Number(profileId);
    if (departmentId) p.department_id = Number(departmentId);
    return p;
  }, [days, view, fromDate, toDate, effectiveBranchId, employeeCode, profileId, departmentId]);
  // [days, view, fromDate, toDate, effectiveBranchId, employeeCode, sourceId, responseId, profileId, departmentId]);

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

  useEffect(() => {
    if (!user) return;
    fetchDashboard();
    fetchUserTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, queryParams]);

  /* -----------------------------
     Users autocomplete (scoped)
  ----------------------------- */
  const filteredUsers = useMemo(() => {
    const q = debUserSearch.trim().toLowerCase();
    const list = allowedUsers || [];
    if (!q) return list.slice(0, 25);
    return list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.employee_code || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    ).slice(0, 25);
  }, [allowedUsers, debUserSearch]);

  /* -----------------------------
     UI
  ----------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">

        {/* Greeting header (only for Branch Manager & Employees) */}
        {!isSuperAdmin && (
          <div className="w-fit">
            <h1 className="text-2xl font-semibold text-gray-900">
              {getGreeting()}, {firstName}!
            </h1>
            <p className="text-gray-600 mt-0.5 text-sm">
              Here's your performance overview for the last {days} days
            </p>
          </div>
        )}

        {/* Branch Tabs (SA only) */}
        {isSuperAdmin && (
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-3 shadow-md">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Tab
                active={branchTabId === ''}
                onClick={() => setBranchTabId('')}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="text-sm">All Branches</span>
                </div>
              </Tab>

              {(branches || []).map(b => (
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

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
            <h3 className="text-base font-semibold text-gray-800">Filter Options</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
            <Field label={<LabelWithIcon icon={<CalendarDays className="h-4 w-4" />} text="Time Period" />}>
              <select className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[7, 15, 30, 60, 90, 180, 365].map(d => <option key={d} value={d}>Last {d} days</option>)}
              </select>
            </Field>

            <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="From Date" />}>
              <input type="date" className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </Field>

            <Field label={<LabelWithIcon icon={<Calendar className="h-4 w-4" />} text="To Date" />}>
              <input type="date" className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </Field>

            {/* View Type: render for Branch Manager & Employees; hide for SuperAdmin */}
            {!isSuperAdmin && (
              <Field label={<LabelWithIcon icon={<Eye className="h-4 w-4" />} text="View Type" />}>
                <select
                  className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                >
                  <option value="self">Self</option>
                  <option value="team">Team</option>
                  <option value="all" disabled={isEmployee}>All</option>
                </select>
              </Field>
            )}

            {/* Profile (Role) – admin/BM only */}
            {(isSuperAdmin || isBranchManager) && (
              <Field label={<LabelWithIcon icon={<Briefcase className="h-4 w-4" />} text="Role (Profile)" />}>
                <select className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                  <option value="">All Roles</option>
                  {(profiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}

            {/* Department – admin/BM only */}
            {(isSuperAdmin || isBranchManager) && (
              <Field label={<LabelWithIcon icon={<Building2 className="h-4 w-4" />} text="Department" />}>
                <select className="border border-gray-200 bg-white rounded-lg px-3 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                  <option value="">All Departments</option>
                  {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            )}

            {/* Users Autocomplete (scoped) */}
            <div className="lg:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                <LabelWithIcon icon={<User className="h-4 w-4" />} text="User (Employee)" />
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  className="border border-gray-200 bg-white rounded-lg pl-8 pr-3 py-2.5 w-full shadow-sm focus:ring-2 focus:ring-blue-500"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name / code / email / phone"
                />
                {userSearch && (
                  <div className="absolute z-30 bg-white border border-gray-200 rounded-lg mt-2 w-full max-h-64 overflow-auto shadow-md">
                    {filteredUsers.length === 0 ? (
                      <div className="px-3 py-2.5 text-sm text-gray-500">No users found</div>
                    ) : filteredUsers.map(u => (
                      <button
                        key={u.employee_code}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm transition-colors border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setEmployeeCode(u.employee_code);
                          setUserSearch(`${u.name} (${u.employee_code})`);
                        }}
                      >
                        <div className="font-medium text-gray-800">
                          {u.name} <span className="text-blue-600">({u.employee_code})</span>
                        </div>
                        <div className="text-xs text-gray-500">{u.role_name} • {u.email} • {u.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {employeeCode ? (
                <div className="text-xs text-green-600 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Selected: {employeeCode}</span>
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  <span>No user selected</span>
                </div>
              )}
            </div>
          </div>

          {optLoading && (
            <div className="flex items-center gap-2 text-xs text-blue-600 mt-2">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Loading filter options…
            </div>
          )}
          {optError && <div className="text-sm text-red-600 mt-2 bg-red-50 px-3 py-2 rounded-lg">{optError}</div>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={fetchDashboard}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-md"
            >
              <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Apply</span>
            </button>
            <button
              onClick={() => {
                // setSourceId('');
                // setResponseId('');
                setProfileId('');
                setDepartmentId('');
                setEmployeeCode('');
                setUserSearch('');
                setFromDate('');
                setToDate('');
                setDays(30);
                setView(isEmployee ? 'team' : 'all');
                if (isSuperAdmin) setBranchTabId('');
              }}
              className="px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
            >
              <span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reset</span>
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
              <Card title="Total Paid" value={inr(data?.cards?.payments?.total_paid)} icon={<IndianRupee className="h-5 w-5" />} color="green" />
              {/* <Card title="Total Raised" value={inr(data?.cards?.payments?.total_raised)} icon={<ArrowUpRight className="h-5 w-5" />} color="blue" /> */}
              <Card title="Weekly Paid" value={inr(data?.cards?.payments?.weekly_paid)} icon={<CalendarCheck className="h-5 w-5" />} color="purple" />
              <Card title="Monthly Paid" value={inr(data?.cards?.payments?.monthly_paid)} icon={<CalendarDays className="h-5 w-5" />} color="indigo" />
              <Card
                title="Total Target"
                value={inr(data?.cards?.payments?.total_target)}
                icon={<Target className="h-5 w-5" />}
                color="orange"
              />
              <Card
                title="Achievement"
                value={inr(data?.cards?.payments?.achieved_target)}
                icon={<Target className="h-5 w-5" />}
                color="emerald"
              />
            </div>

            <SectionHeader title="Leads Analytics" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card title="Total Leads" value={num(data?.cards?.leads?.total_uploaded)} icon={<BarChart3 className="h-5 w-5" />} color="blue" />
              <Card title="This Week" value={num(data?.cards?.leads?.this_week)} icon={<Zap className="h-5 w-5" />} color="green" />
              <Card title="This Month" value={num(data?.cards?.leads?.this_month)} icon={<Flame className="h-5 w-5" />} color="orange" />
              <Card title="Clients / FT" value={`${num(data?.cards?.leads?.total_clients)} / ${num(data?.cards?.leads?.total_ft)}`} icon={<Users className="h-5 w-5" />} color="purple" />
              <Card title="Old Leads" value={num(data?.cards?.leads?.old_leads)} icon={<ClipboardList className="h-5 w-5" />} color="gray" />
              <Card title="Fresh Leads" value={num(data?.cards?.leads?.fresh_leads)} icon={<Sparkles className="h-5 w-5" />} color="emerald" />
            </div>
          </>
        )}

        {/* Top performers */}
        {!!data && (
          <div
            className={`grid grid-cols-1 ${isSuperAdmin ? 'lg:grid-cols-2' : ''} gap-4`}
          >
            {isSuperAdmin && (
              <TableWrap title="Top Branches (Revenue)" icon={<Building2 className="h-5 w-5" />}>
                <div className="max-h-72 overflow-y-auto pr-1">
                  <SimpleTable
                    cols={['Branch', 'Revenue', 'Paid Count', 'Conversion %']}
                    rows={(data?.top?.branches || []).map((b) => [
                      b.branch_name,
                      inr(b.revenue),
                      num(b.paid_count),
                      `${b.conversion_rate}%`,
                    ])}
                  />
                </div>
              </TableWrap>
            )}

            {/* If not SA, span full width */}
            <div className={!isSuperAdmin ? 'lg:col-span-2' : ''}>
              <TableWrap
                title={`Top Employees (${isEmployee ? 'Team (Top 5)' : 'Top 10'})`}
                icon={<Users className="h-5 w-5" />}
              >
                <div className="max-h-72 overflow-y-auto pr-1">
                  <SimpleTable
                    cols={['Employee', 'Role', 'Leads', 'Converted', 'Revenue', 'Target', 'Achieved', 'Conv %']}
                    rows={(data?.top?.employees || []).map((e) => [
                      `${e.employee_name} (${e.employee_code})`,
                      e.role_name || e.role_id,
                      num(e.total_leads),
                      num(e.converted_leads),
                      inr(e.total_revenue),
                      inr(e.target),
                      inr(e.achieved_target ?? e.total_revenue),
                      `${e.conversion_rate}%`,
                    ])}
                  />
                </div>
              </TableWrap>
            </div>
          </div>
        )}


        {/* Profiles (admin & BM only) */}
        {!!data && (isSuperAdmin || isBranchManager) && (
          <div className="grid grid-cols-1 gap-4">
            <TableWrap title="Profile-wise Analysis" icon={<Briefcase className="h-5 w-5" />}>
              <div className="max-h-72 overflow-y-auto pr-1">
                <SimpleTable
                  cols={['Profile', 'Leads', 'Paid Revenue']}
                  rows={(data?.breakdowns?.profile_wise || []).map((p) => {
                    const prof = profiles.find(x => x.id === p.profile_id);
                    return [
                      prof?.name || (p.profile_id ?? '—'),
                      num(p.total_leads),
                      inr(p.paid_revenue),
                    ];
                  })}
                />
              </div>
            </TableWrap>
          </div>
        )}

        {/* Users table */}
        {!!employeesTable && (
          <TableWrap
            title={`Users Performance (${isEmployee ? 'Your Team' : 'All (scoped)'})`}
            icon={<LineChart className="h-5 w-5" />}
          >
            {/* Inline filters for Users Performance */}
            <div className="mb-3">
              <div className="grid grid-cols-1 md:grid-cols-8 gap-3 items-end">
                {/* From Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>

                {/* To Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>

                {/* Days */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Days</label>
                  <select
                    className="h-9 w-full border border-gray-200 bg-white rounded-md px-2.5 text-sm shadow-sm focus:ring-2 focus:ring-blue-500"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                  >
                    {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                      <option key={d} value={d}>Last {d} days</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="md:col-span-2 flex md:justify-end gap-2">
                  <button
                    onClick={fetchUserTable}
                    className="h-9 px-3 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium shadow hover:shadow-md"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setDays(30);
                      fetchUserTable();
                    }}
                    className="h-9 px-3 rounded-md bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-[480px] overflow-y-auto pr-1">
              <SimpleTable
                cols={['Employee', 'Role', 'Leads', 'Converted', 'Revenue']}
                rows={(employeesTable || []).map((u) => [
                  `${u.employee_name} (${u.employee_code})`,
                  u.role_name || u.role_id,
                  num(u.total_leads),
                  num(u.converted_leads),
                  inr(u.total_revenue),
                ])}
              />
            </div>
          </TableWrap>
        )}

      </div>
    </div>
  );
}

/* -----------------------------
   Enhanced UI Components
----------------------------- */
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

const colorVariants = {
  blue: 'from-blue-500 to-blue-600 shadow-blue-200',
  green: 'from-emerald-500 to-green-600 shadow-emerald-200',
  purple: 'from-purple-500 to-purple-600 shadow-purple-200',
  indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-200',
  orange: 'from-orange-500 to-orange-600 shadow-orange-200',
  gray: 'from-gray-500 to-gray-600 shadow-gray-200',
  emerald: 'from-emerald-400 to-teal-500 shadow-emerald-200',
};

function Card({ title, value, sub, icon, color = 'blue' }) {
  const gradientClass = colorVariants[color] || colorVariants.blue;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl p-3 shadow hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-1">
        <div className="text-xs font-medium text-gray-600">{title}</div>
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-800 leading-tight">{value ?? '—'}</div>
      {sub ? <div className="text-[11px] text-gray-500 font-medium mt-0.5">{sub}</div> : null}
    </div>
  );
}

function TableWrap({ title, children, icon }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-xl p-4 shadow-md overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-base">{icon}</span>}
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

function SimpleTable({ cols = [], rows = [] }) {
  return (
    <div className="overflow-x-auto">
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
                  <td key={j} className="px-3 py-2.5 text-gray-700 align-top">{cell}</td>
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
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      ].join(' ')}
    >
      {children}
    </button>
  );
}
