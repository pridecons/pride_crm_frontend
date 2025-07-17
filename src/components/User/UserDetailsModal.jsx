"use client";

import { X } from "lucide-react";

export default function UserDetailsModal({ isOpen, onClose, user, branchMap }) {
  if (!isOpen || !user) return null;

  function DetailField({ label, value }) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700">{label}</h4>
        <p className="text-gray-600">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">User Details</h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-100 p-1 rounded-lg hover:bg-white/10 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailField label="Employee Code" value={user.employee_code} />
            <DetailField label="Name" value={user.name} />
            <DetailField label="Role" value={user.role} />
            <DetailField label="Email" value={user.email} />
            <DetailField label="Phone" value={user.phone_number} />
            <DetailField label="Father Name" value={user.father_name} />
            <DetailField label="Date of Birth" value={user.date_of_birth} />
            <DetailField label="Date of Joining" value={user.date_of_joining} />
            <DetailField label="Experience" value={`${user.experience || 0} years`} />
            <DetailField label="PAN" value={user.pan || "—"} />
            <DetailField label="Aadhaar" value={user.aadhaar || "—"} />
            <DetailField
              label="Branch"
              value={branchMap[user.branch_id] || "—"}
            />
          </div>

          {/* Address Section */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">Address</h4>
            <p className="text-gray-600">
              {user.address || "—"}, {user.city || ""}, {user.state || ""} -{" "}
              {user.pincode || ""}
            </p>
          </div>

          {/* Comment Section */}
          {user.comment && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">Comment</h4>
              <p className="text-gray-600">{user.comment}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
