"use client";

import { useMemo, useState } from "react";
import { X, Shield, Phone, Mail, User as UserIcon, Building2, KeyRound, IdCard, Clock } from "lucide-react";

// Map role_id → role name (fallback if user.role not present)
const ROLE_MAP = {
  "1": "SUPERADMIN",
  "2": "BRANCH MANAGER",
  "3": "HR",
  "4": "SALES MANAGER",
  "5": "TL",
  "6": "SBA",
  "7": "BA",
};

function formatDate(d) {
  if (!d) return "—";
  // supports "YYYY-MM-DD" and ISO strings
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(); // feel free to switch to toLocaleDateString()
}

function DetailField({ label, value }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
      <p className="text-gray-600 break-words">{value ?? "—"}</p>
    </div>
  );
}

export default function UserDetailsModal({ isOpen, onClose, user, branchMap }) {
  const [showAllPerms, setShowAllPerms] = useState(false);

  const roleName = useMemo(() => {
    return user?.role || ROLE_MAP?.[String(user?.role_id ?? "")] || "Unknown";
  }, [user]);

  if (!isOpen || !user) return null;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const visiblePerms = showAllPerms ? perms : perms.slice(0, 24); // show first 24, then expand

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <div className="text-white">
              <h3 className="text-xl font-semibold">{user.name || "User Details"}</h3>
              <p className="text-white/90 text-sm">
                {roleName} • {user.employee_code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                user.is_active
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-red-100 text-red-700 border border-red-200"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-100 p-1 rounded-lg hover:bg-white/10 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Top quick info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Employee Code" value={user.employee_code} />
            <DetailField label="Role" value={roleName} />
            <DetailField label="Branch" value={branchMap?.[user.branch_id] || "—"} />
            <DetailField label="Reporting" value={user.senior_profile_id || "—"} />
          </div>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Phone className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-800">Contact</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Phone" value={user.phone_number} />
              <DetailField label="Email" value={user.email} />
              <DetailField label="Father's Name" value={user.father_name} />
              <DetailField label="Experience" value={user.experience != null ? `${user.experience} year(s)` : "—"} />
            </div>
          </section>

          {/* Personal / Employment */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <IdCard className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-800">Personal & Employment</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Date of Birth" value={formatDate(user.date_of_birth)} />
              <DetailField label="Date of Joining" value={formatDate(user.date_of_joining)} />
              <DetailField label="PAN" value={user.pan || "—"} />
              <DetailField label="Aadhaar" value={user.aadhaar || "—"} />
            </div>
          </section>

          {/* Address */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-800">Address</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Address" value={user.address} />
              <DetailField label="City" value={user.city} />
              <DetailField label="State" value={user.state} />
              <DetailField label="Pincode" value={user.pincode} />
            </div>
          </section>

          {/* VBC / Telephony */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <KeyRound className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-800">VBC / Telephony</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="VBC Extension ID" value={user.vbc_extension_id} />
              <DetailField label="VBC Username" value={user.vbc_user_username} />
              <DetailField label="VBC Password" value={user.vbc_user_password} />
            </div>
          </section>

          {/* Permissions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <h4 className="font-semibold text-gray-800">Permissions</h4>
              </div>
              {perms.length > 24 && (
                <button
                  onClick={() => setShowAllPerms((s) => !s)}
                  className="text-sm text-purple-700 hover:text-purple-800"
                >
                  {showAllPerms ? "Show less" : `Show all (${perms.length})`}
                </button>
              )}
            </div>
            {perms.length ? (
              <div className="flex flex-wrap gap-2">
                {visiblePerms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No permissions assigned.</p>
            )}
          </section>

          {/* Comments */}
          {user.comment ? (
            <section>
              <h4 className="font-semibold text-gray-800 mb-1">Comment</h4>
              <p className="text-gray-600 whitespace-pre-wrap">{user.comment}</p>
            </section>
          ) : null}

          {/* Meta / Timestamps */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <h4 className="font-semibold text-gray-800">Meta</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DetailField label="Role ID" value={user.role_id} />
              <DetailField label="Branch ID" value={user.branch_id ?? "—"} />
              <DetailField label="Created At" value={formatDate(user.created_at)} />
              <DetailField label="Updated At" value={formatDate(user.updated_at)} />
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
