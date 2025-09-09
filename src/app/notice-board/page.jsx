"use client";

import { useEffect, useMemo, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import {
    Send,
    Megaphone,
    Loader2,
    UserPlus,
    PlusCircle,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Search,
    Users,
    MessageSquare,
    Building2,
    Clock
} from "lucide-react";

/* -----------------------------
   Helpers
----------------------------- */
function parseCodes(input = "") {
    return Array.from(
        new Set(
            String(input)
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter(Boolean)
        )
    );
}

const TEMPLATES = [
    { id: "ft", title: "FT", message: "FT ASSIGNED", color: "bg-blue-50 border-blue-200 text-blue-700" },
    { id: "update", title: "UPDATE", message: "GOOD EVENING", color: "bg-green-50 border-green-200 text-green-700" },
];

// Read a key from cookie user_info or JWT payload
function readFromSession(keys = []) {
    try {
        const raw = Cookies.get("user_info");
        if (raw) {
            const u = JSON.parse(raw);
            for (const k of keys) if (u?.[k] !== undefined && u?.[k] !== null) return u[k];
        }
    } catch { }
    try {
        const token = Cookies.get("access_token");
        if (token) {
            const payload = jwtDecode(token);
            for (const k of keys) if (payload?.[k] !== undefined && payload?.[k] !== null) return payload[k];
        }
    } catch { }
    return null;
}

function getBranchIdFromSessionStr() {
    const v = readFromSession(["branch_id", "branchId"]);
    if (v === null || String(v).trim() === "") return null;
    return String(v);
}

function getRoleFromSession() {
    const r = readFromSession(["role", "role_name", "roleName"]);
    return r ? String(r).trim().toUpperCase() : null;
}

function isSuperadminRole(role) {
    if (!role) return false;
    const r = String(role).trim().toUpperCase();
    return r === "SUPERADMIN" || r === "SUPER_ADMIN";
}

/* -----------------------------
   UI
----------------------------- */
export default function NoticeBoardPage() {
    // form
    const [userCodesRaw, setUserCodesRaw] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentLog, setSentLog] = useState([]);

    // auth/session
    const [role, setRole] = useState(null);
    const [isSuper, setIsSuper] = useState(false);

    // branch
    const [branchId, setBranchId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    // users (picker)
    const [usersLoading, setUsersLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState("");

    useEffect(() => {
        const r = getRoleFromSession();
        const superFlag = isSuperadminRole(r);
        setRole(r);
        setIsSuper(superFlag);

        const sessionBranch = getBranchIdFromSessionStr();
        if (!superFlag) setBranchId(sessionBranch);
        else setBranchId(sessionBranch);
    }, []);

    // Fetch branches only for SUPERADMIN
    useEffect(() => {
        if (!isSuper) return;
        (async () => {
            try {
                setLoadingBranches(true);
                const { data } = await axiosInstance.get("/branches/");
                const list = Array.isArray(data) ? data : data?.items || [];
                setBranches(list);
                if (!branchId && list.length > 0) {
                    const first = String(list[0]?.id ?? list[0]?.branch_id ?? "").trim();
                    if (first) setBranchId(first);
                }
            } catch {
                toast.error("Failed to load branches.");
            } finally {
                setLoadingBranches(false);
            }
        })();
    }, [isSuper]);

    // Fetch users
    useEffect(() => {
        (async () => {
            try {
                setUsersLoading(true);
                const { data } = await axiosInstance.get("/users/", {
                    params: { skip: 0, limit: 100, active_only: false },
                });
                const arr = Array.isArray(data) ? data : data?.data || [];
                setUsers(arr);
            } catch {
                toast.error("Failed to load users.");
            } finally {
                setUsersLoading(false);
            }
        })();
    }, []);

    // derived
    const userCodes = useMemo(() => parseCodes(userCodesRaw), [userCodesRaw]);
    const canSend = userCodes.length > 0 && title.trim() && message.trim() && !sending;

    const visibleUsers = useMemo(() => {
        if (!branchId) return [];

        const onlySelectedBranch = users.filter(
            (u) => String(u?.branch_id) === String(branchId)
        );

        const q = userSearch.trim().toLowerCase();
        if (!q) return onlySelectedBranch.slice(0, 12);

        return onlySelectedBranch
            .filter((u) => {
                const code = String(u?.employee_code || "").toLowerCase();
                const name = String(u?.name || "").toLowerCase();
                const phone = String(u?.phone_number || "").toLowerCase();
                return code.includes(q) || name.includes(q) || phone.includes(q);
            })
            .slice(0, 12);
    }, [users, userSearch, branchId]);

    // actions
    const applyTemplate = (tplId) => {
        const t = TEMPLATES.find((x) => x.id === tplId);
        if (!t) return;
        setTitle(t.title);
        setMessage(t.message);
    };

    const addChip = (code) => {
        const codes = new Set(parseCodes(userCodesRaw));
        codes.add(code);
        setUserCodesRaw(Array.from(codes).join(", "));
    };

    const removeChip = (code) => {
        const codes = parseCodes(userCodesRaw).filter((c) => c !== code);
        setUserCodesRaw(codes.join(", "));
    };

    const clearForm = () => {
        setTitle("");
        setMessage("");
    };

    const handleSend = async () => {
        if (!canSend) {
            toast.error("Fill user(s), title and message.");
            return;
        }
        if (!branchId) {
            toast.error("Branch ID not found. Please login again or choose a branch.");
            return;
        }

        setSending(true);
        try {
            const results = [];
            for (const code of userCodes) {
                try {
                    const payload = {
                        user_id: code,
                        title: title.trim(),
                        message: message.trim(),
                        branch_id: String(branchId),
                    };

                    const res = await axiosInstance.post("/notification/all", payload, {
                        headers: { "Content-Type": "application/json", accept: "application/json" },
                    });

                    const ok = Boolean(res?.data?.success);
                    results.push({ code, ok, error: ok ? null : "Unknown error" });
                    if (ok) toast.success(`Sent to ${code}`);
                    else toast.error(`Failed for ${code}`);
                } catch (err) {
                    const msg = err?.response?.data?.detail || err.message;
                    results.push({ code, ok: false, error: msg });
                    toast.error(`Failed for ${code}: ${msg}`);
                }
            }

            setSentLog((prev) => [
                {
                    id: Date.now(),
                    at: new Date().toISOString(),
                    title: title.trim(),
                    message: message.trim(),
                    recipients: userCodes,
                    results,
                },
                ...prev,
            ]);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 shadow-lg">
                            <Megaphone className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Notice Board</h1>
                            <p className="text-gray-600 mt-1">Send notifications to your team members</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Branch Selection Card (SUPERADMIN only) */}
                        {isSuper && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Branch Selection</h2>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Select Branch</label>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={branchId || ""}
                                            onChange={(e) => setBranchId(e.target.value)}
                                            className="flex-1 h-12 rounded-xl border border-gray-200 px-4 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            disabled={loadingBranches}
                                        >
                                            {!branchId && <option value="">Choose a branch...</option>}
                                            {branches.map((b) => {
                                                const val = String(b?.id ?? b?.branch_id ?? "").trim();
                                                const label = b?.name || b?.branch_name || `Branch ${val || ""}`;
                                                return (
                                                    <option key={val} value={val}>
                                                        {label} ({val})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {loadingBranches && <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recipients Card */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Select Recipients</h2>
                            </div>

                            {/* User Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="Search employees by code, name, or phone..."
                                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* User List */}
                            <div className="border border-gray-200 rounded-xl bg-white max-h-64 overflow-auto">
                                {usersLoading ? (
                                    <div className="flex items-center gap-3 text-gray-500 p-4">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading employees...</span>
                                    </div>
                                ) : !branchId ? (
                                    <div className="text-center text-gray-500 p-6">
                                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p>Select a branch to view employees</p>
                                    </div>
                                ) : visibleUsers.length === 0 ? (
                                    <div className="text-center text-gray-500 p-6">
                                        <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                        <p>No employees found</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {visibleUsers.map((u) => (
                                            <div key={u.employee_code} className="p-4 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-gray-900">{u.name || "—"}</span>
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                                {u.employee_code}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-gray-500">
                                                            {u.phone_number || "—"} • Branch {String(u.branch_id ?? "—")}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => addChip(u.employee_code)}
                                                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Selected Recipients */}
                            {userCodes.length > 0 && (
                                <div className="mt-4">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Selected Recipients ({userCodes.length})
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {userCodes.map((c) => (
                                            <span
                                                key={c}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 text-sm"
                                            >
                                                {c}
                                                <button
                                                    onClick={() => removeChip(c)}
                                                    className="text-indigo-500 hover:text-indigo-700 font-medium"
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Manual Input */}
                            <div className="mt-4">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Manual Entry <span className="text-gray-400 font-normal">(comma or space separated)</span>
                                </label>
                                <textarea
                                    value={userCodesRaw}
                                    onChange={(e) => setUserCodesRaw(e.target.value)}
                                    placeholder="e.g. Admin001, EMP047"
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Message Composition Card */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Compose Message</h2>
                            </div>

                            {/* Templates */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 mb-3 block">Quick Templates</label>
                                <div className="flex flex-wrap gap-3">
                                    {TEMPLATES.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => applyTemplate(t.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:shadow-sm ${t.color}`}
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            {t.title}
                                        </button>
                                    ))}
                                    <button
                                        onClick={clearForm}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="mb-4">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter notice title..."
                                    className="w-full h-12 rounded-xl border border-gray-200 px-4 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                            </div>

                            {/* Message */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your notice message here..."
                                    rows={4}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* Send Button */}
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-600">
                                    {userCodes.length > 0 ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            Ready to send to <strong>{userCodes.length}</strong> recipient{userCodes.length > 1 ? "s" : ""}
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                            Select recipients to continue
                                        </span>
                                    )}
                                </div>

                                <button
                                    disabled={!canSend}
                                    onClick={handleSend}
                                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all transform ${canSend
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105"
                                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        }`}
                                >
                                    {sending ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                    Send Notice
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Recent Activity */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-white/50 p-6 sticky top-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Clock className="w-5 h-5 text-indigo-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                            </div>

                            {sentLog.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <AlertCircle className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 text-sm">No notices sent yet</p>
                                    <p className="text-gray-400 text-xs mt-1">Your recent activity will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-96 overflow-auto">
                                    {sentLog.map((item) => (
                                        <div key={item.id} className="border border-gray-200 rounded-xl p-4 bg-white/50">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium text-gray-900">{item.title}</h3>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(item.at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.message}</p>
                                            <div className="text-xs text-gray-500 mb-2">
                                                To: {item.recipients.join(", ")}
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {item.results.map((r, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${r.ok
                                                                ? "bg-green-100 text-green-700"
                                                                : "bg-red-100 text-red-700"
                                                            }`}
                                                        title={r.error || "Success"}
                                                    >
                                                        {r.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                                        {r.code}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}