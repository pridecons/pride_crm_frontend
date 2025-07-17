"use client";

import { useState, useEffect } from "react";
import {
  X,
  Edit,
  CreditCard,
  MapPin,
  Briefcase,
  Loader2,
  Check,
  User
} from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-toastify";

export default function EditUserModal({
  isOpen,
  onClose,
  user,
  branches,
  roles,
  onUserUpdated
}) {
  const [formData, setFormData] = useState({});
  const [loadingPan, setLoadingPan] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date for input fields (DD-MM-YYYY)
  const formatToDDMMYYYY = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  // Convert back to ISO format for API
  const formatToISO = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (user) {
      setFormData({
        ...user,
        date_of_joining: user.date_of_joining
          ? formatToDDMMYYYY(user.date_of_joining)
          : "",
        date_of_birth: user.date_of_birth
          ? formatToDDMMYYYY(user.date_of_birth)
          : ""
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (field, value) => {
    if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleVerifyPan = async () => {
    if (!formData.pan) {
      toast.error("Please enter a PAN number first");
      return;
    }
    setLoadingPan(true);
    try {
      const res = await axiosInstance.post(
        "/micro-pan-verification",
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (res.data.success && res.data.data?.result) {
        const result = res.data.data.result;
        setFormData((prev) => ({
          ...prev,
          name: result.user_full_name || prev.name,
          father_name: result.user_father_name || prev.father_name,
          date_of_birth: result.user_dob || prev.date_of_birth,
          address: result.user_address?.full || prev.address,
          city: result.user_address?.city || prev.city,
          state: result.user_address?.state || prev.state
        }));
        toast.success("PAN verified and details autofilled!");
      } else {
        toast.error("PAN verification failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error verifying PAN");
    } finally {
      setLoadingPan(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        experience: Number(formData.experience) || 0,
        date_of_joining: formatToISO(formData.date_of_joining),
        date_of_birth: formatToISO(formData.date_of_birth)
      };

      await axiosInstance.put(`/users/${formData.employee_code}`, payload);
      toast.success(`User ${formData.employee_code} updated successfully!`);
      onUserUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <form onSubmit={handleSubmit}>
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Edit className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">
                Edit User: {formData.employee_code}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white hover:text-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <User className="w-4 h-4" /> Basic Info
                </h4>
                <input
                  className="w-full p-3 border rounded-xl"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  placeholder="Full Name"
                />
                <input
                  className="w-full p-3 border rounded-xl"
                  name="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  placeholder="Email"
                />
                <input
                  className="w-full p-3 border rounded-xl"
                  name="phone_number"
                  value={formData.phone_number || ""}
                  onChange={handleInputChange}
                  placeholder="Phone"
                />
                <input
                  className="w-full p-3 border rounded-xl"
                  name="father_name"
                  value={formData.father_name || ""}
                  onChange={handleInputChange}
                  placeholder="Father Name"
                />
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Documents
                </h4>
                {/* PAN */}
                <div className="flex gap-2">
                  <input
                    className="flex-1 p-3 border rounded-xl"
                    name="pan"
                    value={formData.pan || ""}
                    onChange={handleInputChange}
                    placeholder="PAN Number"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyPan}
                    disabled={loadingPan}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
                  >
                    {loadingPan ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {loadingPan ? "Verifying..." : "Verify"}
                  </button>
                </div>
                <input
                  className="w-full p-3 border rounded-xl"
                  name="aadhaar"
                  value={formData.aadhaar || ""}
                  onChange={handleInputChange}
                  placeholder="Aadhaar"
                />
                {/* Role */}
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  name="role"
                  value={formData.role || ""}
                  onChange={handleInputChange}
                >
                  <option value="">Select Role</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {/* Branch */}
                <select
                  className="w-full p-3 border rounded-xl bg-white"
                  name="branch_id"
                  value={formData.branch_id || ""}
                  onChange={handleInputChange}
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Address
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    className="p-3 border rounded-xl"
                    name="city"
                    value={formData.city || ""}
                    onChange={handleInputChange}
                    placeholder="City"
                  />
                  <input
                    className="p-3 border rounded-xl"
                    name="state"
                    value={formData.state || ""}
                    onChange={handleInputChange}
                    placeholder="State"
                  />
                  <input
                    className="p-3 border rounded-xl"
                    name="pincode"
                    value={formData.pincode || ""}
                    onChange={handleInputChange}
                    placeholder="Pincode"
                  />
                </div>
                <textarea
                  className="w-full p-3 border rounded-xl resize-none"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleInputChange}
                  placeholder="Complete Address"
                  rows="3"
                />
              </div>

              {/* Additional */}
              <div className="md:col-span-2 space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Additional Info
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    className="p-3 border rounded-xl"
                    placeholder="Experience"
                    type="number"
                    name="experience"
                    value={formData.experience || ""}
                    onChange={handleInputChange}
                  />
                  <input
                    className="p-3 border rounded-xl"
                    placeholder="Date of Joining (DD-MM-YYYY)"
                    value={formData.date_of_joining}
                    onChange={(e) => handleDateChange("date_of_joining", e.target.value)}
                  />
                  <input
                    className="p-3 border rounded-xl"
                    placeholder="Date of Birth (DD-MM-YYYY)"
                    value={formData.date_of_birth}
                    onChange={(e) => handleDateChange("date_of_birth", e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full p-3 border rounded-xl resize-none"
                  name="comment"
                  value={formData.comment || ""}
                  onChange={handleInputChange}
                  placeholder="Comments"
                  rows="3"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-white border rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Update User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
