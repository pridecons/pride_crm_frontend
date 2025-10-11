"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { axiosInstance } from "@/api/Axios";
import DepartmentAccordion from "@/components/Department/table";
import AddDepartmentModal from "@/components/Department/DepartmentAddModel";
import ProfileModal from "@/components/Department/ProfileAddModel";

export default function Department() {
  // ---------- Centralized State ----------
  const [departments, setDepartments] = useState([]);
  const [profilesByDept, setProfilesByDept] = useState({}); // { [deptId]: Profile[] }
  const [loading, setLoading] = useState({ departments: false });

  const [modals, setModals] = useState({
    addDeptOpen: false,
    editDept: null,
    addProfileOpen: false,
    editProfile: null,
  });

  // ---------- Caches & in-flight promises (dedupe) ----------
  const inflight = useRef({
    departments: null,          // Promise
    profiles: {},               // { [deptId]: Promise }
    deptPerms: {},              // { [deptId]: Promise }
    globalPerms: null,          // Promise for /permissions/
  });

  const globalPermissionsCache = useRef(null); // array or null
  const deptPermissionsCache = useRef(new Map()); // deptId -> string[]

  // ---------- Fetchers ----------
  const fetchDepartments = useCallback(async () => {
    if (inflight.current.departments) return inflight.current.departments;
    setLoading((p) => ({ ...p, departments: true }));
    inflight.current.departments = axiosInstance
      .get("/departments/?skip=0&limit=50&order_by=name")
      .then((res) => {
        const data = res.data || [];
        setDepartments(data);
        return data;
      })
      .catch((err) => {
        console.error("Fetch departments error:", err);
        throw err;
      })
      .finally(() => {
        inflight.current.departments = null;
        setLoading((p) => ({ ...p, departments: false }));
      });
    return inflight.current.departments;
  }, []);

  const fetchProfilesForDept = useCallback(
    async (departmentId) => {
      if (!departmentId) return [];
      if (profilesByDept[departmentId]) return profilesByDept[departmentId];
      if (inflight.current.profiles[departmentId])
        return inflight.current.profiles[departmentId];

      inflight.current.profiles[departmentId] = axiosInstance
        .get(
          `/profile-role/?department_id=${departmentId}&skip=0&limit=50&order_by=hierarchy_level`
        )
        .then((res) => {
          const list = res.data || [];
          setProfilesByDept((prev) => ({ ...prev, [departmentId]: list }));
          return list;
        })
        .catch((err) => {
          console.error("Fetch profiles error:", err);
          throw err;
        })
        .finally(() => {
          inflight.current.profiles[departmentId] = null;
        });

      return inflight.current.profiles[departmentId];
    },
    [profilesByDept]
  );

  // LAZY global permissions getter (only called by AddDepartmentModal when opened)
  const getGlobalPermissions = useCallback(async () => {
    if (globalPermissionsCache.current) return globalPermissionsCache.current;
    if (inflight.current.globalPerms) return inflight.current.globalPerms;

    inflight.current.globalPerms = axiosInstance
      .get("/permissions/")
      .then((res) => {
        globalPermissionsCache.current = res.data || [];
        return globalPermissionsCache.current;
      })
      .catch((err) => {
        console.error("Fetch permissions error:", err);
        globalPermissionsCache.current = [];
        return [];
      })
      .finally(() => {
        inflight.current.globalPerms = null;
      });

    return inflight.current.globalPerms;
  }, []);

  const getDepartmentPermissions = useCallback(async (departmentId) => {
    if (!departmentId) return [];
    if (deptPermissionsCache.current.has(departmentId)) {
      return deptPermissionsCache.current.get(departmentId);
    }
    if (inflight.current.deptPerms[departmentId]) {
      return inflight.current.deptPerms[departmentId];
    }
    inflight.current.deptPerms[departmentId] = axiosInstance
      .get(`/departments/${departmentId}`)
      .then((res) => {
        const perms = res?.data?.available_permissions || [];
        deptPermissionsCache.current.set(departmentId, perms);
        return perms;
      })
      .catch((err) => {
        console.error("Fetch dept perms error:", err);
        deptPermissionsCache.current.set(departmentId, []);
        return [];
      })
      .finally(() => {
        inflight.current.deptPerms[departmentId] = null;
      });

    return inflight.current.deptPerms[departmentId];
  }, []);

  // ---------- Initial Boot ----------
  useEffect(() => {
    // Only departments on mount; permissions are lazy-loaded in modals
    fetchDepartments();
  }, [fetchDepartments]);

  // ---------- Local CRUD helpers (mutations without extra network) ----------
  const upsertDepartmentLocal = useCallback((saved) => {
    setDepartments((prev) => {
      const idx = prev.findIndex((d) => d.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const next = prev.slice();
      next[idx] = saved;
      return next;
    });
    // update cache of dept perms if API returned available_permissions
    if (saved?.id && Array.isArray(saved?.available_permissions)) {
      deptPermissionsCache.current.set(saved.id, saved.available_permissions);
    }
  }, []);

  const removeDepartmentLocal = useCallback((deptId) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
    setProfilesByDept((prev) => {
      const { [deptId]: _drop, ...rest } = prev;
      return rest;
    });
    deptPermissionsCache.current.delete(deptId);
  }, []);

  const upsertProfileLocal = useCallback((profile) => {
    setProfilesByDept((prev) => {
      const list = prev[profile.department_id] || [];
      const idx = list.findIndex((p) => p.id === profile.id);
      const next =
        idx === -1
          ? [...list, profile]
          : [...list.slice(0, idx), profile, ...list.slice(idx + 1)];
      return { ...prev, [profile.department_id]: next };
    });
  }, []);

  const removeProfileLocal = useCallback((profileId, departmentId) => {
    setProfilesByDept((prev) => ({
      ...prev,
      [departmentId]: (prev[departmentId] || []).filter((p) => p.id !== profileId),
    }));
  }, []);

  // ---------- Actions to open/close modals ----------
  const openAddDept = () =>
    setModals((m) => ({ ...m, addDeptOpen: true, editDept: null }));
  const openEditDept = (dept) =>
    setModals((m) => ({ ...m, editDept: dept, addDeptOpen: true }));
  const closeDeptModal = () =>
    setModals((m) => ({ ...m, addDeptOpen: false, editDept: null }));

  const openAddProfile = () =>
    setModals((m) => ({ ...m, addProfileOpen: true, editProfile: null }));
  const openEditProfile = (p) =>
    setModals((m) => ({ ...m, editProfile: p, addProfileOpen: true }));
  const closeProfileModal = () =>
    setModals((m) => ({ ...m, addProfileOpen: false, editProfile: null }));

  // ---------- Memo’d props for children ----------
  const accordionProps = useMemo(
    () => ({
      departments,
      loadingDept: loading.departments,
      profilesByDept,
      fetchProfilesForDept,
      onAddDept: openAddDept,
      onEditDept: openEditDept,
      onDeleteDeptLocal: removeDepartmentLocal,
      onAddProfile: openAddProfile,
      onEditProfile: openEditProfile,
      removeProfileLocal, // for instant profile delete updates
    }),
    [
      departments,
      loading.departments,
      profilesByDept,
      fetchProfilesForDept,
      openAddDept,
      openEditDept,
      removeDepartmentLocal,
      openAddProfile,
      openEditProfile,
      removeProfileLocal,
    ]
  );

  return (
    <div className="min-h-screen p-2" style={{ color: "var(--theme-text, #0f172a)" }}>
      <DepartmentAccordion {...accordionProps} />

      {/* Add / Edit Department */}
      <AddDepartmentModal
        isOpen={modals.addDeptOpen}
        onClose={closeDeptModal}
        department={modals.editDept}
        onSaveLocal={upsertDepartmentLocal}
        getGlobalPermissions={getGlobalPermissions} // lazy-loader
      />

      {/* Add / Edit Profile */}
      <ProfileModal
        isOpen={modals.addProfileOpen}
        onClose={closeProfileModal}
        profile={modals.editProfile}
        departments={departments}
        getDepartmentPermissions={getDepartmentPermissions} // lazy-loader per dept
        onSaveLocal={upsertProfileLocal}
      />
    </div>
  );
}
