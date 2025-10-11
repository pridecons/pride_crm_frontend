"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Cookies from "js-cookie";
import dynamic from "next/dynamic";
import { X, Loader2, Check, Edit, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "@/api/Axios";
import { usePermissions } from "@/context/PermissionsContext";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { createPortal } from "react-dom";

// NEW: treat only real values as meaningful (anything empty/only punctuation/NA is NOT)
const isMeaningful = (val) => {
  if (val == null) return false;
  const s = String(val).trim();
  if (!s) return false;

  // reject all-punctuation (commas, quotes, dashes, dots, slashes, etc.)
  const noPunct = s.replace(/[,'".\-_/\\|:;(){}\[\]@#$%^&*]+/g, "").replace(/\s+/g, "");
  if (!noPunct) return false;

  // common "unknown" tokens
  const BAD = new Set(["NA", "N/A", "NOT AVAILABLE", "NULL", "NONE", "UNAVAILABLE", "UNKNOWN"]);
  if (BAD.has(s.toUpperCase())) return false;

  // extremely short after removing punctuation often means junk like ",,,"
  if (s.replace(/[, ]+/g, "").length < 3) return false;

  return true;
};

// NEW: if value is not meaningful, write empty string instead of junk
const cleanedOrEmpty = (val) => (isMeaningful(val) ? String(val) : "");

const SELECT_NO_CARET_STYLE = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundImage: "none",
};

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

const INPUT_CLS =
  "w-full h-11 px-3 rounded-xl bg-[var(--theme-input-background)] text-[var(--theme-text)] placeholder-[color:rgba(0,0,0,.45)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none";

// Auto-insert dashes as DD-MM-YYYY while typing/pasting
const formatDateInput = (value) => {
  const d = String(value || "").replace(/\D/g, "").slice(0, 8); // keep 8 digits
  if (!d) return "";
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};

const dmyToDate = (s) => {
  if (!s) return null;
  const [dd, mm, yyyy] = s.split("-").map((v) => parseInt(v, 10));
  const d = new Date(yyyy, (mm || 1) - 1, dd || 1);
  return isNaN(d.getTime()) ? null : d;
};
const dateToDMY = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
const toISOorUndefined = (ddmmyyyy) => {
  if (!ddmmyyyy) return undefined;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(ddmmyyyy)) return undefined;
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
};

function normalizeManagerUser(m) {
  if (!m) return null;
  return {
    // match /users response shape as much as possible
    employee_code: m.employee_code ?? m.code ?? m.emp_code ?? "",
    name: m.name ?? m.full_name ?? m.employee_name ?? "Branch Manager",
    role_id: m.role_id ?? m.profile_role_id ?? m.roleId ?? "",
    // anything else coming from your backend stays on the object
    ...m,
    __isBranchManager: true, // flag for UI badge
  };
}

// --- Role helpers copied/adapted from UserFilters ---
function toRoleKey(v) {
  const canon = String(v || "").toUpperCase().trim().replace(/\s+/g, " ");
  return canon === "SUPER ADMINISTRATOR" ? "SUPERADMIN" : canon; // unify
}

function getRoleKeyFromEverywhere(currentUser) {
  // 1) Try context first
  const ctxRole =
    currentUser?.role_name ||
    currentUser?.role ||
    currentUser?.user?.role_name ||
    currentUser?.user?.role;
  if (ctxRole) return toRoleKey(ctxRole);

  // 2) Try cookie (same as UserFilters)
  try {
    const uiRaw = Cookies.get("user_info");
    if (uiRaw) {
      const ui = JSON.parse(uiRaw);
      const cookieRole =
        ui?.role_name ||
        ui?.role ||
        ui?.user?.role_name ||
        ui?.user?.role ||
        ui?.profile_role?.name ||
        null;
      if (cookieRole) return toRoleKey(cookieRole);
    }
  } catch {}

  // 3) Try access_token fallback (same as UserFilters)
  try {
    const token = Cookies.get("access_token");
    if (token) {
      const p = jwtDecode(token);
      const tRole = p?.role_name || p?.role || null;
      if (tRole) return toRoleKey(tRole);
    }
  } catch {}

  return ""; // unknown
}

export default function UserModal({
  mode = "add",
  isOpen,
  onClose,
  user = {},
  onSuccess,
}) {
  const isEdit = mode === "edit";
  const { currentUser, hasPermission } = usePermissions();
  const currentRoleKey = getRoleKeyFromEverywhere(currentUser);
  const isSuperAdmin = currentRoleKey === "SUPERADMIN";
  const showBranchField = isSuperAdmin;

  // password gate
  const canResetPassword = hasPermission("user_reset_password");
  const showPasswordField = !isEdit || canResetPassword;

  const passwordRegex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?]).{6,}$/;

  // ----- Branches (fetched), Departments, Profiles -----
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [profiles, setProfiles] = useState([]); // from /profile-role/
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  // Senior (users) options
  const [seniorOptions, setSeniorOptions] = useState([]);

  // Permissions selection
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // PAN & form state
  const [loadingPan, setLoadingPan] = useState(false);
  const [isPanVerified, setIsPanVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const prefilling = useRef(false);

  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const [formData, setFormData] = useState({
    // identity
    name: "",
    email: "",
    phone_number: "",
    father_name: "",
    password: "",
    // KYC
    pan: "",
    aadhaar: "",
    // address
    address: "",
    city: "",
    state: "",
    pincode: "",
    comment: "",
    // meta
    experience: "",
    date_of_joining: "",
    date_of_birth: "",
    // org
    branch_id: "",
    target: "",
    // optional supervisor/telephony
    senior_profile_id: "",
    vbc_extension_id: "",
    vbc_user_username: "",
    vbc_user_password: "",
  });

  // States API + autocomplete
  const [states, setStates] = useState([]); // [{state_name, code}]
  const [stateQuery, setStateQuery] = useState("");
  const [showStateList, setShowStateList] = useState(false);
  const [stateIndex, setStateIndex] = useState(0);
  const stateInputRef = useRef(null);
  const [statePopup, setStatePopup] = useState({ top: 0, left: 0, width: 0 });
  // Autocomplete (Reporting Profile)
  const [seniorQuery, setSeniorQuery] = useState("");
  const [showSeniorList, setShowSeniorList] = useState(false);
  const [seniorIndex, setSeniorIndex] = useState(0);
  const seniorInputRef = useRef(null);
  const [seniorPopup, setSeniorPopup] = useState({ top: 0, left: 0, width: 0 });

  const [branchManager, setBranchManager] = useState(null);

  // ADD: track which fields are locked by PAN & remember last locked set while editing PAN
  const [panLocked, setPanLocked] = useState({
    name: false, // Full Name
    father_name: false,
    date_of_birth: false,
    aadhaar: false,
    address: false,
    city: false,
    state: false,
    pincode: false,
  });
  const prevPanLockedRef = useRef(null); // remembers which fields were PAN-filled before you clicked "Edit PAN"
  const panInputRef = useRef(null); // optional: focus PAN after Edit

  // ADD: map PAN API result to lock flags (only lock when value is present)
  const computePanLocks = (r) => {
    const addr = r?.user_address || {};
    return {
      name: isMeaningful(r?.user_full_name),
      father_name: isMeaningful(r?.user_father_name),
      date_of_birth: isMeaningful(r?.user_dob),
      aadhaar: isMeaningful(r?.masked_aadhaar),
      address: isMeaningful(addr?.full),
      city: isMeaningful(addr?.city),
      state: isMeaningful(addr?.state),
      pincode: isMeaningful(addr?.zip),
    };
  };

  const updateSeniorPopupPos = () => {
    const el = seniorInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSeniorPopup({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
  };

  const selectSenior = (u) => {
    setFormData((p) => ({ ...p, senior_profile_id: u.employee_code }));
    setSeniorQuery(`${u.name} (${u.employee_code})${u.roleLabel ? ` — ${u.roleLabel}` : ""}`);
    setShowSeniorList(false);
  };

  const filteredStates = useMemo(() => {
    const q = (stateQuery || "").toUpperCase().trim();
    if (!q) return states;
    return states.filter((s) => s.state_name.includes(q));
  }, [stateQuery, states]);

  const selectState = (name) => {
    setFormData((p) => ({ ...p, state: name }));
    setStateQuery(name);
    setShowStateList(false);
  };

  const updateStatePopupPos = () => {
    const el = stateInputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStatePopup({ top: r.bottom + window.scrollY, left: r.left + window.scrollX, width: r.width });
  };

  // ---- Derived ----
  const selectedDepartment = useMemo(
    () => departments.find((d) => String(d.id) === String(selectedDepartmentId)),
    [departments, selectedDepartmentId]
  );

  // ⬇️ Add this block
  const BRANCH_FREE_DEPTS = new Set(["COMPLIANCE_TEAM", "RESEARCH_TEAM", "ACCOUNTING"]);
  const deptKeySafe = (selectedDepartment?.name || "")
    .toString()
    .toUpperCase()
    .replace(/\s+/g, "_");

  // If a department is selected, branch is required unless it's one of the branch-free departments.
  // If no department is selected yet, keep branch required by default (UI below will still allow picking department first).
  const isBranchRequired = selectedDepartment ? !BRANCH_FREE_DEPTS.has(deptKeySafe) : true;

  const departmentPermissions = selectedDepartment?.available_permissions || [];

  const filteredProfilesForDepartment = useMemo(() => {
    const depId = String(selectedDepartmentId || "");
    if (!depId) return [];
    return profiles.filter((p) => String(p.department_id) === depId);
  }, [profiles, selectedDepartmentId]);

  const selectedProfile = useMemo(
    () => filteredProfilesForDepartment.find((p) => String(p.id) === String(selectedProfileId)),
    [filteredProfilesForDepartment, selectedProfileId]
  );

  // Map role_id -> profile/role object (to show role name in senior dropdown)
  const profileById = useMemo(() => {
    const map = {};
    for (const p of profiles) map[String(p.id)] = p;
    return map;
  }, [profiles]);

  // ✅ Always give Branch Manager a proper roleLabel; otherwise map via profileById
  const labeledSeniors = useMemo(() => {
    return seniorOptions.map((u) => ({
      ...u,
      roleLabel: u.__isBranchManager ? "Branch Manager" : profileById[String(u.role_id)]?.name || "",
    }));
  }, [seniorOptions, profileById]);

  const filteredSeniors = useMemo(() => {
    const q = seniorQuery.trim().toLowerCase();
    if (!q) return labeledSeniors;
    return labeledSeniors.filter(
      (u) =>
        String(u.employee_code).toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        (u.roleLabel || "").toLowerCase().includes(q)
    );
  }, [labeledSeniors, seniorQuery]);

  useEffect(() => {
    if (!formData.senior_profile_id) {
      setSeniorQuery("");
      return;
    }
    const u = labeledSeniors.find((x) => String(x.employee_code) === String(formData.senior_profile_id));
    if (u) {
      setSeniorQuery(`${u.name} (${u.employee_code})${u.roleLabel ? ` — ${u.roleLabel}` : ""}`);
    }
  }, [formData.senior_profile_id, labeledSeniors]);
  useEffect(() => {
    if (!showSeniorList) return;
    updateSeniorPopupPos();
    const onScrollOrResize = () => updateSeniorPopupPos();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showSeniorList]);

  // ---- Fetch branches / deps / profiles on open ----
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const [branchRes, depRes, profRes, statesRes] = await Promise.all([
          axiosInstance.get("/branches/?skip=0&limit=100&active_only=false"),
          axiosInstance.get("/departments/?skip=0&limit=50&order_by=name"),
          axiosInstance.get("/profile-role/?skip=0&limit=50&order_by=hierarchy_level"),
          axiosInstance.get("/state/"),
        ]);
        setBranches(branchRes.data || []);
        setDepartments(depRes.data || []);
        setProfiles(profRes.data || []);
        setStates(statesRes?.data?.states || []);

        // branch preselect rules
        if (isEdit && user?.branch_id) {
          setSelectedBranchId(String(user.branch_id));
        } else if (!isSuperAdmin) {
          const eff =
            currentUser?.branch_id ??
            (() => {
              try {
                const raw = Cookies.get("user_info");
                if (!raw) return "";
                const p = JSON.parse(raw);
                return p?.branch_id ?? p?.user?.branch_id ?? p?.user_info?.branch_id;
              } catch {
                return "";
              }
            })();
          if (eff) setSelectedBranchId(String(eff));
        }

        // If editing, pre-select department/profile by role_id
        if (isEdit && user?.role_id) {
          const foundProfile = (profRes.data || []).find((p) => String(p.id) === String(user.role_id));
          if (foundProfile) {
            prefilling.current = true;
            setSelectedDepartmentId(String(foundProfile.department_id));
            setSelectedProfileId(String(foundProfile.id));
            setSelectedPermissions(
              user?.permissions?.length ? user.permissions : foundProfile.default_permissions || []
            );
            // release the guard on the next tick (after dependent effects run)
            setTimeout(() => {
              prefilling.current = false;
            }, 0);
          }
        }
      } catch (err) {
        ErrorHandling({ error: err, defaultError: "Failed to load branches/departments/roles" });
      }
    })();
  }, [isOpen, isEdit, user, currentRoleKey, currentUser]);

  useEffect(() => {
    if (!showStateList) return;
    updateStatePopupPos();
    const onScrollOrResize = () => updateStatePopupPos();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [showStateList]);

  // Keep formData.branch_id in sync with selectedBranchId
  useEffect(() => {
    if (!selectedBranchId) return;
    setFormData((p) => ({ ...p, branch_id: selectedBranchId }));
  }, [selectedBranchId]);

  // Reset profile and permissions when department changes
  useEffect(() => {
    if (!selectedDepartmentId) {
      setSelectedProfileId("");
      setSelectedPermissions([]);
      return;
    }
    if (prefilling.current) return; // skip clearing during edit prefill
    setSelectedProfileId("");
    setSelectedPermissions([]);
  }, [selectedDepartmentId]);

  // When profile changes, preselect its default permissions
  useEffect(() => {
    if (prefilling.current) return; // keep server/user-set permissions
    if (!selectedProfile) {
      setSelectedPermissions([]);
      return;
    }
    setSelectedPermissions(selectedProfile.default_permissions || []);
  }, [selectedProfile]);

  // ✅ Ensure department/profile auto-select once profiles are loaded
  useEffect(() => {
    if (!isOpen || !isEdit || !user?.role_id || profiles.length === 0) return;

    // If already selected (e.g., user changed it manually), do nothing
    if (selectedDepartmentId && selectedProfileId) return;

    const found = profiles.find((p) => String(p.id) === String(user.role_id));
    if (!found) return;

    prefilling.current = true;
    setSelectedDepartmentId(String(found.department_id));
    setSelectedProfileId(String(found.id));
    setSelectedPermissions(
      Array.isArray(user?.permissions) && user.permissions.length > 0
        ? user.permissions
        : found.default_permissions || []
    );

    const t = setTimeout(() => {
      prefilling.current = false;
    }, 0);
    return () => clearTimeout(t);
  }, [isOpen, isEdit, user?.role_id, profiles, selectedDepartmentId, selectedProfileId]);

  // 🔁 Clear selected senior when branch CHANGES (but keep it on initial edit load)
  useEffect(() => {
    if (!selectedBranchId) return;

    // If editing and the branch equals the user's original branch, don't clear
    const originalBranch = String(user?.branch_id ?? "");
    if (isEdit && originalBranch && String(selectedBranchId) === originalBranch) {
      return;
    }

    // For new users OR when branch changes away from original -> clear senior
    setFormData((p) => ({ ...p, senior_profile_id: "" }));
  }, [selectedBranchId, isEdit, user?.branch_id]);

  // One-shot seniors fetch per open/branch change, with manager injected.
// Removes double /users/ calls on edit modal open.
const openRunRef = useRef(0);

useEffect(() => {
  if (!isOpen) return;
  // bump a token every time modal opens; used to ignore stale async sets
  openRunRef.current += 1;
  const runId = openRunRef.current;

  const controller = new AbortController();

  (async () => {
    try {
      // 1) fetch manager (optional)
      let mgr = null;
      if (selectedBranchId) {
        try {
          const r = await axiosInstance.get(`/branches/${selectedBranchId}/details`, { signal: controller.signal });
          const mgrRaw = r?.data?.manager || r?.data?.branch_manager || r?.data?.manager_user || null;
          mgr = normalizeManagerUser(mgrRaw);
        } catch { /* ignore manager errors */ }
      }

      // 2) fetch seniors once
      const q = selectedBranchId
        ? `/users/?skip=0&limit=500&active_only=true&branch_id=${encodeURIComponent(selectedBranchId)}`
        : `/users/?skip=0&limit=500&active_only=true`;

      const res = await axiosInstance.get(q, { signal: controller.signal });
      let list = Array.isArray(res?.data?.data) ? res.data.data
               : Array.isArray(res?.data) ? res.data
               : [];

      // exclude self in edit
      if (isEdit && user?.employee_code) {
        list = list.filter(u => String(u.employee_code) !== String(user.employee_code));
      }

      // if no branch selected → show only SUPERADMIN
      if (!selectedBranchId) {
        list = list.filter(u => {
          const roleName =
            u?.role ||
            u?.profile_role?.name ||
            u?.role_name ||
            "";
        return (roleName || "").toString().toUpperCase().replace(/\s+/g, "_") === "SUPERADMIN";
        });
      }

      // stable sort
      list.sort((a, b) => {
        const ra = String(a.role_id || "");
        const rb = String(b.role_id || "");
        if (ra !== rb) return ra.localeCompare(rb);
        return String(a.name || "").localeCompare(String(b.name || ""));
      });

      // inject manager at top if not already in list
      if (selectedBranchId && mgr && !list.some(u => String(u.employee_code) === String(mgr.employee_code))) {
        list.unshift(mgr);
      }

      // apply only if still the latest open/run and not aborted
      if (openRunRef.current === runId) {
        setSeniorOptions(list);
        setBranchManager(mgr); // keep for badge flag only; doesn't trigger refetch
      }
    } catch (e) {
      if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
        setSeniorOptions([]);
      }
    }
  })();

  return () => controller.abort();
// ⛔️ Intentionally exclude profileById and branchManager to avoid re-fetches.
// Including them causes the second /users/ call you’re seeing.
}, [isOpen, selectedBranchId, isEdit, user?.employee_code, axiosInstance]);

  // Initialize / reset form values on open or edit
  useEffect(() => {
    if (!isOpen) return;

    if (isEdit && user?.employee_code) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        phone_number: user.phone_number || "",
        father_name: user.father_name || "",
        pan: user.pan || "",
        aadhaar: user.aadhaar || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        pincode: user.pincode || "",
        comment: user.comment || "",
        experience: user.experience?.toString() || "",
        date_of_joining: user.date_of_joining ? dateToDMY(new Date(user.date_of_joining)) : "",
        date_of_birth: user.date_of_birth ? dateToDMY(new Date(user.date_of_birth)) : "",
        branch_id: user.branch_id?.toString() || "",
        target: user.target != null ? String(user.target) : "",
        senior_profile_id: user.senior_profile_id || "",
        vbc_extension_id: user.vbc_extension_id || "",
        vbc_user_username: user.vbc_user_username || "",
        vbc_user_password: user.vbc_user_password || "",
      });
      setIsPanVerified(!!user.pan);
    } else {
      setFormData({
        name: "",
        email: "",
        phone_number: "",
        father_name: "",
        password: "",
        pan: "",
        aadhaar: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        comment: "",
        experience: "",
        date_of_joining: "",
        date_of_birth: "",
        branch_id: "",
        target: "",
        senior_profile_id: "",
        vbc_extension_id: "",
        vbc_user_username: "",
        vbc_user_password: "",
      });
      setIsPanVerified(false);
    }
  }, [isOpen, isEdit, user]);

  // -------- PAN input sanitization ----------
  const sanitizePAN = (input) => {
    const raw = (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    let out = "";
    for (let i = 0; i < raw.length && out.length < 10; i++) {
      const idx = out.length; // target position
      const ch = raw[i];
      if ((idx <= 4 || idx === 9) && /[A-Z]/.test(ch)) {
        out += ch;
      } else if (idx >= 5 && idx <= 8 && /[0-9]/.test(ch)) {
        out += ch;
      }
    }
    return out;
  };

  // -------- PAN verification ----------
  const handleVerifyPan = async () => {
    if (!formData.pan) return ErrorHandling({ defaultError: "Enter a PAN first" });
    if (formData.pan.trim().length !== 10 || !PAN_REGEX.test(formData.pan))
      return ErrorHandling({ defaultError: "Enter a valid PAN (e.g., ABCDE1234F)" });

    setLoadingPan(true);
    toast.loading("Verifying PAN...");
    try {
      const res = await axiosInstance.post(
        "/micro-pan-verification",
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      toast.dismiss();

      const ok = res?.data?.success && res?.data?.data?.result;
      if (!ok) return ErrorHandling({ defaultError: "PAN verification failed" });

      const r = res.data.data.result;
      const addr = r?.user_address || {};
      const nextLocks = computePanLocks(r);

      // If we are re-verifying after clicking "Edit PAN",
      // only overwrite fields that were previously PAN-filled (prevPanLockedRef.current)
      const replaceOnlyThese = prevPanLockedRef.current;

      setFormData((p) => {
        const out = { ...p };

        const maybeSet = (key, val) => {
          const valClean = cleanedOrEmpty(val);
          if (replaceOnlyThese) {
            if (replaceOnlyThese[key]) out[key] = valClean !== "" ? valClean : out[key];
          } else {
            // first verify: only fill if currently empty AND value is meaningful
            if ((out[key] == null || out[key] === "") && valClean !== "") {
              out[key] = valClean;
            }
          }
        };

        maybeSet("name", r?.user_full_name);
        maybeSet("father_name", r?.user_father_name);
        maybeSet("date_of_birth", r?.user_dob);
        maybeSet("aadhaar", r?.masked_aadhaar);
        const addr2 = r?.user_address || {};
        maybeSet("address", addr2?.full);
        maybeSet("city", addr2?.city);
        maybeSet("state", addr2?.state);
        maybeSet("pincode", addr2?.zip);
        return out;
      });

      // lock those fields which the new PAN actually provided
      setPanLocked(nextLocks);

      // reset edit PAN state
      prevPanLockedRef.current = null;
      setIsPanVerified(true);
      toast.success("PAN verified!");
    } catch (err) {
      toast.dismiss();
      ErrorHandling({ error: err, defaultError: "Error verifying PAN" });
    } finally {
      setLoadingPan(false);
    }
  };

  // -------- Permissions toggling ----------
  const togglePermission = (perm) => {
    setSelectedPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
  };

  const aadhaarError =
    formData.aadhaar.length > 0 &&
    !(/^\d{12}$/.test(formData.aadhaar) || /^[Xx]{8}\d{4}$/.test(formData.aadhaar))
      ? "Enter 12 digits or masked like XXXXXXXX1234"
      : "";
  const phoneError =
    formData.phone_number.length > 0 && formData.phone_number.length !== 10 ? "Must be 10 digits" : "";
  const passwordError =
    showPasswordField && formData.password.length > 0 && !passwordRegex.test(formData.password)
      ? "Password must be ≥6 chars with a number & special char"
      : "";

  // -------- Submit ----------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Flow validations
    if (isBranchRequired && !selectedBranchId) return ErrorHandling({ defaultError: "Please select a Branch first" });
    if (!selectedDepartmentId) return ErrorHandling({ defaultError: "Please select a Department" });
    if (!selectedProfileId) return ErrorHandling({ defaultError: "Please select a Profile" });

    // Basic required fields
    if (!formData.name.trim()) return ErrorHandling({ defaultError: "Full Name is required" });
    if (!formData.email.trim()) return ErrorHandling({ defaultError: "Email is required" });
    if (!formData.phone_number.trim()) return ErrorHandling({ defaultError: "Phone number is required" });
    // DOJ required
    if (!formData.date_of_joining?.trim()) return ErrorHandling({ defaultError: "Date of Joining is required" });

    // PAN is optional; if provided, enforce format
    if (formData.pan && formData.pan.trim()) {
      const _p = formData.pan.trim();
      if (_p.length !== 10 || !PAN_REGEX.test(_p)) {
        return ErrorHandling({ defaultError: "Enter a valid PAN (e.g., ABCDE1234F)" });
      }
    }
    // Aadhaar validation
    if (formData.aadhaar && aadhaarError) return toast.error(aadhaarError);

    // Phone validation
    if (formData.phone_number && !/^\d{10}$/.test(formData.phone_number))
      return ErrorHandling({ defaultError: "Phone must be 10 digits" });

    // ----- Password validation -----
    // Create: always require & validate
    if (!isEdit) {
      if (!passwordRegex.test(formData.password)) {
        return ErrorHandling({
          defaultError: "Password must be ≥6 chars, include a number & special char",
        });
      }
    }

    // Edit: Only allowed if user has permission
    if (isEdit && formData.password) {
      if (!canResetPassword) {
        return ErrorHandling({ defaultError: "You don’t have permission to reset passwords." });
      }
      if (!passwordRegex.test(formData.password)) {
        return ErrorHandling({
          defaultError: "Password must be ≥6 chars, include a number & special char",
        });
      }
    }

    // Build payload
    const payload = {
      phone_number: formData.phone_number,
      email: formData.email,
      name: formData.name,
      father_name: formData.father_name || undefined,
      is_active: true,
      experience: Number(formData.experience) || 0,
      date_of_joining: toISOorUndefined(formData.date_of_joining),
      date_of_birth: toISOorUndefined(formData.date_of_birth),
      pan: formData.pan?.trim() ? formData.pan.trim() : undefined,
      aadhaar: formData.aadhaar || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      pincode: formData.pincode || undefined,
      comment: formData.comment || undefined,

      // ORG
      branch_id: Number(selectedBranchId) || undefined,

      // IMPORTANT: role_id not role name
      role_id: String(selectedProfileId),

      target: formData.target === "" || formData.target == null ? undefined : Number(formData.target),

      // Permissions
      permissions: selectedPermissions || [],

      // Optional supervisor/telephony
      senior_profile_id: formData.senior_profile_id || undefined,
      vbc_extension_id: formData.vbc_extension_id || undefined,
      vbc_user_username: formData.vbc_user_username || undefined,
      vbc_user_password: formData.vbc_user_password || undefined,
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });

    setIsSubmitting(true);
    toast.loading(isEdit ? "Updating…" : "Adding user…");
    try {
      let res;
      if (isEdit) {
        if (canResetPassword && formData.password) {
          payload.password = formData.password;
        }
        res = await axiosInstance.put(`/users/${user.employee_code}`, payload);
      } else {
        // create requires password
        payload.password = formData.password;
        res = await axiosInstance.post("/users/", payload);
      }

      toast.dismiss();
      toast.success(isEdit ? "Updated!" : "Added!");
      onSuccess?.(res.data);
      onClose?.();
    } catch (error) {
      ErrorHandling({ error: error, defaultError: "Array.isArray(detail?.errors)" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: "var(--theme-backdrop)" }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-auto border border-[var(--theme-border)] bg-[var(--theme-card-bg)] text-[var(--theme-text)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-[var(--theme-border)] bg-[var(--theme-card-bg)]">
          <div className="flex items-center gap-2">
            {isEdit ? (
              <Edit className="w-6 h-6 text-[var(--theme-text)]" />
            ) : (
              <Check className="w-6 h-6 text-[var(--theme-success)]" />
            )}
            <h2 className="text-lg font-semibold">
              {isEdit ? `Edit User: ${user.employee_code}` : "Add New User"}
            </h2>
          </div>
          <button onClick={onClose}
                  className="rounded-lg p-1 hover:bg-[var(--theme-primary-softer)]">
            <X className="w-6 h-6 text-[var(--theme-text)]" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="p-4 sm:p-6 md:p-8 space-y-8">
            {/* === Step 1: Branch (first), then Department & Profile === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Branch — only SUPERADMIN can see/select; others are auto-locked */}
              {showBranchField && (
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Branch {isBranchRequired ? "*" : "(optional)"}
                  </label>
                  <select
                    className="w-full p-3 rounded-xl bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                    style={SELECT_NO_CARET_STYLE}
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    required={isBranchRequired}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Department *
                </label>
                <select
                  className="w-full p-3 rounded-xl bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                  style={SELECT_NO_CARET_STYLE}
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  required
                >
                  <option value="">
                    {showBranchField ? (selectedBranchId ? "Select Department" : "Select Branch first") : "Select Department"}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Profile / Role */}
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Profile (Role) *
                </label>
                <select
                  className="w-full p-3 rounded-xl bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none disabled:opacity-60"
                  style={SELECT_NO_CARET_STYLE}
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  required
                  disabled={!selectedDepartmentId}
                >
                  <option value="">
                    {selectedDepartmentId ? "Select Profile" : "Select Department first"}
                  </option>
                  {filteredProfilesForDepartment.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {selectedProfile && (
                  <p className="mt-2 text-xs text-[var(--theme-text-muted)]">
                    {selectedProfile.description}
                  </p>
                )}
              </div>
            </div>

            {/* === Step 2: Identity & Org === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-[var(--theme-text)]">Basic Information</h4>

                {/* PAN (with slot-based input enforcement) */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    PAN Number (optional)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      ref={panInputRef}
                      className="flex-1 p-3 rounded-xl uppercase bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                      value={formData.pan}
                      onChange={(e) => setFormData({ ...formData, pan: sanitizePAN(e.target.value) })}
                      maxLength={10}
                      placeholder="ABCDE1234F"
                      disabled={loadingPan || isPanVerified}
                    />
                    {isPanVerified ? (
                      <>
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--theme-success)] shadow"
                              style={{ color: "var(--theme-primary-contrast)" }}>
                          <Check className="w-4 h-4" />
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            // remember which fields were PAN-filled before unlocking them
                            prevPanLockedRef.current = panLocked;
                            setIsPanVerified(false);

                            // unlock everything for editing while PAN is being changed
                            setPanLocked({
                              name: false,
                              father_name: false,
                              date_of_birth: false,
                              aadhaar: false,
                              address: false,
                              city: false,
                              state: false,
                              pincode: false,
                            });

                            // optional: focus the PAN input
                            setTimeout(() => panInputRef.current?.focus(), 0);
                          }}
                          className="p-2 rounded-lg hover:bg-[var(--theme-warning)]/15 text-[var(--theme-warning)] flex items-center border border-[var(--theme-warning)]/30"
                          title="Edit PAN"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVerifyPan}
                        disabled={loadingPan}
                        className="px-4 py-2 rounded-lg flex items-center gap-1 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-contrast)] shadow"
                      >
                        {loadingPan ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" /> Verify
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Full Name *
                  </label>
                  <input
                    className={INPUT_CLS}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={panLocked.name}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Email *
                  </label>
                  <input
                    className={INPUT_CLS}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Phone Number *
                  </label>
                  {phoneError && (
                    <div className="mb-1 text-xs font-medium text-[var(--theme-danger)]">{phoneError}</div>
                  )}
                  <input
                    className={INPUT_CLS}
                    maxLength={10}
                    value={formData.phone_number}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setFormData({
                        ...formData,
                        phone_number: digits.slice(0, 10),
                      });
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Father&apos;s Name
                  </label>
                  <input
                    className={INPUT_CLS}
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    disabled={panLocked.father_name}
                  />
                </div>

                {/* Password (Create) / Reset Password (Edit by permission only) */}
                {showPasswordField && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                      {isEdit ? "Reset Password" : "Password *"}
                    </label>

                    {isEdit && (
                      <p className="text-xs text-[var(--theme-text-muted)] mb-1">
                        Leave blank to keep existing password.
                      </p>
                    )}

                    {passwordError && (
                      <div id="pwd-error" className="mb-1 text-xs font-medium text-[var(--theme-danger)]">
                        {passwordError}
                      </div>
                    )}

                    <div className="relative">
                      <input
                        className={`${INPUT_CLS} pr-10 caret-[var(--theme-text)]`}
                        type={showPwd ? "text" : "password"}
                        value={formData.password ?? ""}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        autoComplete="new-password"
                        required={!isEdit} // create required; edit optional
                        placeholder={isEdit ? "Enter new password" : "Create a password"}
                        aria-invalid={!!passwordError}
                        aria-describedby={passwordError ? "pwd-error" : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute inset-y-0 right-3 flex items-center"
                        aria-label={showPwd ? "Hide password" : "Show password"}
                      >
                        {showPwd ? (
                          <EyeOff className="w-5 h-5 text-[var(--theme-text-muted)]" />
                        ) : (
                          <Eye className="w-5 h-5 text-[var(--theme-text-muted)]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <h4 className="font-semibold text-[var(--theme-text)]">Organization & Docs</h4>

                {/* Aadhaar */}
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Aadhaar Number
                  </label>
                  {aadhaarError && (
                    <div className="mb-1 text-xs font-medium text-[var(--theme-danger)]">{aadhaarError}</div>
                  )}
                  <input
                    className={INPUT_CLS}
                    maxLength={12}
                    value={formData.aadhaar}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9xX]/g, "").toUpperCase().slice(0, 12);
                      setFormData({ ...formData, aadhaar: clean });
                    }}
                    disabled={panLocked.aadhaar}
                  />
                </div>

                {/* Senior (from /users) */}
                <div className="relative">
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Reporting Profile
                  </label>
                  <div className="relative">
                    <input
                      ref={seniorInputRef}
                      className="w-full p-3 rounded-xl bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                      value={seniorQuery}
                      onChange={(e) => {
                        setSeniorQuery(e.target.value);
                        setShowSeniorList(true);
                        setSeniorIndex(0);
                        updateSeniorPopupPos();
                      }}
                      onFocus={() => {
                        setShowSeniorList(true);
                        updateSeniorPopupPos();
                      }}
                      onBlur={() => setTimeout(() => setShowSeniorList(false), 120)}
                      onKeyDown={(e) => {
                        const has = Array.isArray(filteredSeniors) && filteredSeniors.length > 0;
                        if (!showSeniorList || !has) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSeniorIndex((i) => Math.min(i + 1, filteredSeniors.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSeniorIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const u = filteredSeniors[seniorIndex];
                          if (u) selectSenior(u);
                        } else if (e.key === "Escape") {
                          setShowSeniorList(false);
                        }
                      }}
                      placeholder={selectedBranchId ? "Type name / code / role…" : "SuperAdmin only (no branch selected)"}
                      autoComplete="off"
                    />
                    {formData.senior_profile_id && (
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 text-sm text-[var(--theme-text-muted)]"
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          setFormData((p) => ({ ...p, senior_profile_id: "" }));
                          setSeniorQuery("");
                        }}
                        title="Clear"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {showSeniorList &&
                    filteredSeniors.length > 0 &&
                    createPortal(
                      <div
                        className="absolute t-0 z-[9999] rounded-md shadow max-h-60 overflow-auto border border-[var(--theme-border)] bg-[var(--theme-card-bg)] text-[var(--theme-text)]"
                        style={{ top: seniorPopup.top, left: seniorPopup.left, width: seniorPopup.width }}
                      >
                        {filteredSeniors.map((u, idx) => {
                          const isBM = !!u.__isBranchManager;
                          return (
                            <button
                              type="button"
                              key={u.employee_code}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSenior(u);
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-[var(--theme-primary-softer)] ${
                                idx === seniorIndex ? "bg-[var(--theme-primary-softer)]" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium">
                                  {u.name} ({u.employee_code})
                                </div>
                                {isBM && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--theme-success-soft)] text-[var(--theme-success)] border border-[color:rgba(16,185,129,.35)]">
                                    Branch Manager
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--theme-text-muted)]">
                                {u.roleLabel || (isBM ? "Branch Manager" : "")}
                              </div>
                            </button>
                          );
                        })}
                      </div>,
                      document.body
                    )}

                  <p className="mt-1 text-xs text-[var(--theme-text-muted)]">
                    {selectedBranchId
                      ? "Start typing to search users in this branch. The Branch Manager is included."
                      : "No branch selected: searching within SuperAdmin users."}
                  </p>
                </div>

                {/* VBC fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                      VBC Extension ID
                    </label>
                    <input
                      className={INPUT_CLS}
                      value={formData.vbc_extension_id}
                      onChange={(e) => setFormData({ ...formData, vbc_extension_id: e.target.value })}
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                      VBC Username
                    </label>
                    <input
                      className={INPUT_CLS}
                      value={formData.vbc_user_username}
                      onChange={(e) => setFormData({ ...formData, vbc_user_username: e.target.value })}
                      placeholder="VBC username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                      VBC Password
                    </label>
                    <input
                      className={INPUT_CLS}
                      value={formData.vbc_user_password}
                      onChange={(e) => setFormData({ ...formData, vbc_user_password: e.target.value })}
                      placeholder="VBC password"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-semibold text-[var(--theme-text)]">Address Info</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">City</label>
                  <input
                    className={INPUT_CLS}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">State</label>

                  <input
                    ref={stateInputRef}
                    className={`${INPUT_CLS} bg-[var(--theme-input-background)]`}
                    value={formData.state}
                    onChange={(e) => {
                      setFormData({ ...formData, state: e.target.value });
                      setStateQuery(e.target.value);
                      setShowStateList(true);
                      setStateIndex(0);
                      updateStatePopupPos();
                    }}
                    onFocus={() => {
                      setShowStateList(true);
                      updateStatePopupPos();
                    }}
                    onBlur={() => setTimeout(() => setShowStateList(false), 120)}
                    onKeyDown={(e) => {
                      if (!showStateList || filteredStates.length === 0) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setStateIndex((i) => Math.min(i + 1, filteredStates.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setStateIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const pick = filteredStates[stateIndex];
                        if (pick) selectState(pick.state_name);
                      }
                    }}
                    placeholder="Start typing… e.g. MADHYA PRADESH"
                    autoComplete="off"
                  />
                  {showStateList &&
                    filteredStates.length > 0 &&
                    createPortal(
                      <div
                        className="fixed z-[9999] rounded-md shadow max-h-60 overflow-auto border border-[var(--theme-border)] bg-[var(--theme-card-bg)] text-[var(--theme-text)]"
                        style={{ top: statePopup.top, left: statePopup.left, width: statePopup.width }}
                      >
                        {filteredStates.map((s, idx) => (
                          <button
                            type="button"
                            key={s.code}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectState(s.state_name);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-[var(--theme-primary-softer)] ${
                              idx === stateIndex ? "bg-[var(--theme-primary-softer)]" : ""
                            }`}
                          >
                            {s.state_name}
                          </button>
                        ))}
                      </div>,
                      document.body
                    )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">Pincode</label>
                  <input
                    className={INPUT_CLS}
                    value={formData.pincode}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, pincode: digits });
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Complete Address
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl resize-none bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-4">
              <h4 className="font-semibold text-[var(--theme-text)]">Additional Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Date of Joining (DD-MM-YYYY)
                  </label>
                  <DatePicker
                    selected={dmyToDate(formData.date_of_joining)}
                    value={formData.date_of_joining}
                    onChange={(date) => setFormData((p) => ({ ...p, date_of_joining: dateToDMY(date) }))}
                    onChangeRaw={(e) => {
                      const v = formatDateInput(e.target.value);
                      setFormData((p) => ({ ...p, date_of_joining: v }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = (e.clipboardData || window.clipboardData).getData("text");
                      const v = formatDateInput(text);
                      setFormData((p) => ({ ...p, date_of_joining: v }));
                    }}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className={INPUT_CLS}
                    required
                    showPopperArrow={false}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                    Date of Birth (DD-MM-YYYY)
                  </label>
                  <DatePicker
                    selected={dmyToDate(formData.date_of_birth)}
                    value={formData.date_of_birth}
                    onChange={(date) => setFormData((p) => ({ ...p, date_of_birth: dateToDMY(date) }))}
                    onChangeRaw={(e) => {
                      const v = formatDateInput(e.target.value);
                      setFormData((p) => ({ ...p, date_of_birth: v }));
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = (e.clipboardData || window.clipboardData).getData("text");
                      const v = formatDateInput(text);
                      setFormData((p) => ({ ...p, date_of_birth: v }));
                    }}
                    dateFormat="dd-MM-yyyy"
                    placeholderText="DD-MM-YYYY"
                    className={`${INPUT_CLS} ${panLocked.date_of_birth ? "opacity-80 pointer-events-none bg-[var(--theme-surface)]" : ""}`}
                    isClearable
                    showPopperArrow={false}
                    disabled={panLocked.date_of_birth}
                    title={panLocked.date_of_birth ? "DOB is locked from PAN" : undefined}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Experience (Years)
                </label>
                <input
                  className={INPUT_CLS}
                  type="number"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                />
              </div>
              {/* ✨ Target (INR) */}
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Monthly Target (₹)
                </label>
                <input
                  className={INPUT_CLS}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  value={formData.target}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    setFormData({ ...formData, target: v });
                  }}
                  placeholder="e.g., 25000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--theme-text)]/80">
                  Comments
                </label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl resize-none bg-[var(--theme-input-background)] text-[var(--theme-text)] border border-[var(--theme-input-border)] focus:ring-2 focus:ring-[var(--theme-input-focus)] outline-none"
                  rows="3"
                  value={formData.comment}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                />
              </div>
            </div>

            {/* === Permissions === */}
            <div className="space-y-3">
              <h4 className="font-semibold text-[var(--theme-text)]">Permissions</h4>
              {!selectedDepartmentId && (
                <p className="text-sm text-[var(--theme-text-muted)]">Select a Department to load permissions.</p>
              )}

              {selectedDepartmentId && (
                <>
                  <p className="text-xs text-[var(--theme-text-muted)]">
                    Preselected from profile defaults; remaining department permissions are unchecked by default.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {departmentPermissions.map((perm) => {
                      const checked = selectedPermissions.includes(perm);
                      return (
                        <label
                          key={perm}
                          className="flex items-center gap-2 p-2 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-primary-softer)]"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => togglePermission(perm)}
                          />
                          <span className="text-sm text-[var(--theme-text)] break-all">{perm}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-4 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-primary-softer)] border border-[var(--theme-border)] text-[var(--theme-text)]"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-primary-contrast)] flex items-center gap-2 shadow disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {isEdit ? "Updating" : "Saving"}…
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> {isEdit ? "Update User" : "Save User"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
