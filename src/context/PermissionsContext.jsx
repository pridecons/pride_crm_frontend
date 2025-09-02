"use client";

import { createContext, useContext, useMemo, useState, useEffect } from "react";
import Cookies from "js-cookie";

const PermissionsContext = createContext({
  permissions: {},
  hasPermission: () => false,
  refresh: () => {},
});

export function PermissionsProvider({ children }) {
  const [permissions, setPermissions] = useState(() => {
    try {
      const user = Cookies.get("user_info");
      return user ? JSON.parse(user)?.permissions || {} : {};
    } catch {
      return {};
    }
  });

  console.log("permissions : ",permissions)

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const user = Cookies.get("user_info");
        const newPerms = user ? JSON.parse(user)?.permissions || {} : {};
        setPermissions((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(newPerms))
            return newPerms;
          return prev;
        });
      } catch {}
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const hasPermission = (key) => {
    return Array.isArray(permissions) && permissions.includes(key);
  };


  //   const hasPermission = (key) => {
  //   return true
  // };

  const value = useMemo(
    () => ({
      permissions,
      hasPermission,
      refresh: () => {
        try {
          const user = Cookies.get("user_info");
          setPermissions(user ? JSON.parse(user)?.permissions || {} : {});
        } catch {}
      },
    }),
    [permissions]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
