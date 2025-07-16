"use client";

import { useState } from "react";
import { toast } from "react-toastify";
import { authAxiosInstanceMultipart } from "@/api/Axios"; // ✅ Use your axios setup

export default function CreateBranchWithManager() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    branch_name: "",
    branch_address: "",
    branch_pan: "",
    branch_aadhaar: "",
    authorized_person: "",
    branch_active: true,
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    manager_password: "",
    manager_father_name: "",
    manager_address: "",
    manager_city: "",
    manager_state: "",
    manager_pincode: "",
    manager_pan: "",
    manager_aadhaar: "",
    manager_dob: "",
    manager_experience: "",
    manager_comment: "",
  });
  const [agreementPdf, setAgreementPdf] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setAgreementPdf(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = new FormData();
    for (const key in formData) {
      form.append(key, formData[key]);
    }
    if (agreementPdf) {
      form.append("agreement_pdf", agreementPdf);
    }

    setLoading(true);
    try {
      const response = await authAxiosInstanceMultipart.post(
        "/api/v1/branches/create-with-manager",
        form
      );

      toast.success(
        `✅ ${response.data.message}. Login: ${response.data.login_credentials.email}`
      );

      // Reset form
      setFormData({
        branch_name: "",
        branch_address: "",
        branch_pan: "",
        branch_aadhaar: "",
        authorized_person: "",
        branch_active: true,
        manager_name: "",
        manager_email: "",
        manager_phone: "",
        manager_password: "",
        manager_father_name: "",
        manager_address: "",
        manager_city: "",
        manager_state: "",
        manager_pincode: "",
        manager_pan: "",
        manager_aadhaar: "",
        manager_dob: "",
        manager_experience: "",
        manager_comment: "",
      });
      setAgreementPdf(null);
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to create branch & manager");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Create Branch with Manager</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Branch Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="branch_name"
              value={formData.branch_name}
              onChange={handleChange}
              placeholder="Branch Name"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="authorized_person"
              value={formData.authorized_person}
              onChange={handleChange}
              placeholder="Authorized Person"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="branch_pan"
              value={formData.branch_pan}
              onChange={handleChange}
              placeholder="Branch PAN"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="branch_aadhaar"
              value={formData.branch_aadhaar}
              onChange={handleChange}
              placeholder="Branch Aadhaar"
              className="border p-2 rounded"
            />
            <textarea
              name="branch_address"
              value={formData.branch_address}
              onChange={handleChange}
              placeholder="Branch Address"
              className="border p-2 rounded col-span-2"
              rows={2}
            />
          </div>
        </div>

        {/* Manager Details */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Manager Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="manager_name"
              value={formData.manager_name}
              onChange={handleChange}
              placeholder="Manager Name"
              className="border p-2 rounded"
              required
            />
            <input
              type="email"
              name="manager_email"
              value={formData.manager_email}
              onChange={handleChange}
              placeholder="Manager Email"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="manager_phone"
              value={formData.manager_phone}
              onChange={handleChange}
              placeholder="Phone"
              className="border p-2 rounded"
              required
            />
            <input
              type="password"
              name="manager_password"
              value={formData.manager_password}
              onChange={handleChange}
              placeholder="Password"
              className="border p-2 rounded"
              required
            />
            <input
              type="text"
              name="manager_father_name"
              value={formData.manager_father_name}
              onChange={handleChange}
              placeholder="Father Name"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="manager_city"
              value={formData.manager_city}
              onChange={handleChange}
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="manager_state"
              value={formData.manager_state}
              onChange={handleChange}
              placeholder="State"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="manager_pincode"
              value={formData.manager_pincode}
              onChange={handleChange}
              placeholder="Pincode"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="manager_pan"
              value={formData.manager_pan}
              onChange={handleChange}
              placeholder="Manager PAN"
              className="border p-2 rounded"
            />
            <input
              type="text"
              name="manager_aadhaar"
              value={formData.manager_aadhaar}
              onChange={handleChange}
              placeholder="Manager Aadhaar"
              className="border p-2 rounded"
            />
            <input
              type="date"
              name="manager_dob"
              value={formData.manager_dob}
              onChange={handleChange}
              placeholder="Date of Birth"
              className="border p-2 rounded"
            />
            <input
              type="number"
              name="manager_experience"
              value={formData.manager_experience}
              onChange={handleChange}
              placeholder="Experience (years)"
              className="border p-2 rounded"
            />
            <textarea
              name="manager_comment"
              value={formData.manager_comment}
              onChange={handleChange}
              placeholder="Comment"
              className="border p-2 rounded col-span-2"
              rows={2}
            />
            <textarea
              name="manager_address"
              value={formData.manager_address}
              onChange={handleChange}
              placeholder="Manager Address"
              className="border p-2 rounded col-span-2"
              rows={2}
            />
          </div>
        </div>

        {/* Agreement Upload */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Upload Agreement (PDF)</h3>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="border p-2 rounded w-full"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="text-right">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Branch & Manager"}
          </button>
        </div>
      </form>
    </div>
  );
}
