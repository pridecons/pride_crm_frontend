"use client";

import { useState } from "react";
import { X, Building2, CreditCard, MapPin, Loader2, Check, Upload } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-toastify";

export default function AddBranchModal({ isOpen, onClose }) {
    const [branch, setBranch] = useState({
        branch_name: "",
        branch_address: "",
        authorized_person: "",
        branch_pan: "",
        branch_aadhaar: "",
        agreement_pdf: null,
    });

    const [manager, setManager] = useState({
        manager_name: "",
        manager_email: "",
        manager_phone: "",
        manager_father_name: "",
        manager_dob: "",
        manager_pan: "",
        manager_aadhaar: "",
        manager_address: "",
        manager_city: "",
        manager_state: "",
        manager_pincode: "",
        manager_password: "",
        manager_experience: "",
        manager_comment: "",
    });

    const [loadingBranchPan, setLoadingBranchPan] = useState(false);
    const [loadingManagerPan, setLoadingManagerPan] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleBranchChange = (e) => {
        const { name, value } = e.target;
        setBranch((prev) => ({ ...prev, [name]: value }));
    };

    const handleManagerChange = (e) => {
        const { name, value } = e.target;
        setManager((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setBranch((prev) => ({ ...prev, agreement_pdf: e.target.files[0] }));
    };

    const verifyPan = async (type) => {
        let panNumber = type === "branch" ? branch.branch_pan : manager.manager_pan;
        if (!panNumber) {
            toast.error("Enter PAN number first");
            return;
        }
        type === "branch" ? setLoadingBranchPan(true) : setLoadingManagerPan(true);

        try {
            const res = await axiosInstance.post(
                "/micro-pan-verification",
                new URLSearchParams({ pannumber: panNumber }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );

            if (res.data.success && res.data.data?.result) {
                const result = res.data.data.result;
                toast.success("PAN Verified!");
                if (type === "branch") {
                    setBranch((prev) => ({
                        ...prev,
                        authorized_person: result.user_full_name || prev.authorized_person,
                        branch_aadhaar: result.masked_aadhaar || prev.branch_aadhaar,
                    }));
                } else {
                    setManager((prev) => ({
                        ...prev,
                        manager_name: result.user_full_name || prev.manager_name,
                        manager_father_name: result.user_father_name || prev.manager_father_name,
                        manager_dob: result.user_dob || prev.manager_dob,
                        manager_address: result.user_address?.full || prev.manager_address,
                        manager_city: result.user_address?.city || prev.manager_city,
                        manager_state: result.user_address?.state || prev.manager_state,
                        manager_pincode: result.user_address?.zip || prev.manager_pincode,
                    }));
                }
            } else {
                toast.error("PAN Verification Failed");
            }
        } catch (err) {
            toast.error("Error verifying PAN");
        } finally {
            setLoadingBranchPan(false);
            setLoadingManagerPan(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(branch).forEach(([key, value]) => formData.append(key, value));
            Object.entries(manager).forEach(([key, value]) => formData.append(key, value));
            formData.append("branch_active", true);

            const { data } = await axiosInstance.post(
                "/branches/create-with-manager",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            toast.success(`Branch '${data.branch.name}' Created Successfully!`);
            onClose();
        } catch (err) {
            toast.error("Failed to create branch");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 rounded-full p-2">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold text-white">Add New Branch</h3>
                        </div>
                        <button type="button" onClick={onClose} className="text-white hover:text-gray-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Branch Details */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Branch Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input className="p-3 border rounded-xl" placeholder="Branch Name" name="branch_name" value={branch.branch_name} onChange={handleBranchChange} />
                                <input className="p-3 border rounded-xl" placeholder="Branch Address" name="branch_address" value={branch.branch_address} onChange={handleBranchChange} />
                                <input className="p-3 border rounded-xl" placeholder="Authorized Person" name="authorized_person" value={branch.authorized_person} onChange={handleBranchChange} />
                                <div className="flex gap-2">
                                    <input className="flex-1 p-3 border rounded-xl" placeholder="Branch PAN" name="branch_pan" value={branch.branch_pan} onChange={handleBranchChange} />
                                    <button type="button" onClick={() => verifyPan("branch")} className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-2">
                                        {loadingBranchPan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify
                                    </button>
                                </div>
                                <input className="p-3 border rounded-xl" placeholder="Branch Aadhaar" name="branch_aadhaar" value={branch.branch_aadhaar} onChange={handleBranchChange} />
                                <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl">
                                    <Upload className="w-4 h-4" /> Upload Agreement PDF
                                    <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {/* Manager Details */}
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Manager Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input className="p-3 border rounded-xl" placeholder="Manager Name" name="manager_name" value={manager.manager_name} onChange={handleManagerChange} />
                                <input className="p-3 border rounded-xl" placeholder="Email" name="manager_email" value={manager.manager_email} onChange={handleManagerChange} />
                                <input className="p-3 border rounded-xl" placeholder="Phone" name="manager_phone" value={manager.manager_phone} onChange={handleManagerChange} />
                                <div className="flex gap-2">
                                    <input className="flex-1 p-3 border rounded-xl" placeholder="Manager PAN" name="manager_pan" value={manager.manager_pan} onChange={handleManagerChange} />
                                    <button type="button" onClick={() => verifyPan("manager")} className="bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-2">
                                        {loadingManagerPan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Verify
                                    </button>
                                </div>
                                <input className="p-3 border rounded-xl" placeholder="Manager Aadhaar" name="manager_aadhaar" value={manager.manager_aadhaar} onChange={handleManagerChange} />
                                <input className="p-3 border rounded-xl" placeholder="Password" type="password" name="manager_password" value={manager.manager_password} onChange={handleManagerChange} />
                                <input className="p-3 border rounded-xl" placeholder="Experience (Years)" name="manager_experience" value={manager.manager_experience} onChange={handleManagerChange} />
                                <input className="p-3 border rounded-xl" placeholder="Date of Birth (DD-MM-YYYY)" name="manager_dob" value={manager.manager_dob} onChange={handleManagerChange} />
                                <textarea className="p-3 border rounded-xl resize-none md:col-span-2" placeholder="Manager Comment" name="manager_comment" value={manager.manager_comment} onChange={handleManagerChange} />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 bg-white border rounded-xl hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2">
                            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Check className="w-4 h-4" /> Create Branch</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
