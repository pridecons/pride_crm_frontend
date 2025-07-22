"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function LeadForm() {
  const [formData, setFormData] = useState({
    full_name: "",
    father_name: "",
    email: "",
    mobile: "",
    alternate_mobile: "",
    aadhaar: "",
    pan: "",
    gstin: "",
    state: "",
    city: "",
    district: "",
    address: "",
    dob: "",
    occupation: "",
    segment: [],
    experience: "",
    investment: "",
    profile: "",
    lead_response_id: "",
    lead_source_id: "",
    comment: "",
    call_back_date: "",
    lead_status: "",
    branch_id: "",
  });

  const [leadSources, setLeadSources] = useState([]);
  const [leadResponses, setLeadResponses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [files, setFiles] = useState({
    aadhar_front_pic: null,
    aadhar_back_pic: null,
    pan_pic: null,
  });

  useEffect(() => {
    // Fetch sources, responses, and branches
    axios.get("http://147.93.30.144:8000/api/v1/lead-config/sources/")
      .then((res) => setLeadSources(res.data || []))
      .catch(() => toast.error("Failed to load lead sources"));

    axios.get("http://147.93.30.144:8000/api/v1/lead-config/responses/")
      .then((res) => setLeadResponses(res.data || []))
      .catch(() => toast.error("Failed to load lead responses"));

    axios.get("http://147.93.30.144:8000/api/v1/branches/")
      .then((res) => setBranches(res.data || []))
      .catch(() => toast.error("Failed to load branches"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSegmentChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map((opt) => opt.value);
    setFormData((prev) => ({ ...prev, segment: selectedOptions }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
  };

  const formatToISO = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr; // Already in ISO
    const [yyyy, mm, dd] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare payload for JSON
      const payload = {
        ...formData,
        dob: formatToISO(formData.dob),
        call_back_date: formatToISO(formData.call_back_date),
        segment: formData.segment,
        comment: { note: formData.comment || "" },
        lead_response_id: formData.lead_response_id ? Number(formData.lead_response_id) : null,
        lead_source_id: formData.lead_source_id ? Number(formData.lead_source_id) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      };

      const hasFiles = files.aadhar_front_pic || files.aadhar_back_pic || files.pan_pic;

      if (hasFiles) {
        // Multipart FormData for file upload
        const form = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            form.append(key, JSON.stringify(value));
          } else if (value !== null && value !== undefined) {
            form.append(key, value);
          }
        });
        Object.entries(files).forEach(([key, file]) => {
          if (file) form.append(key, file);
        });

        await axios.post("http://147.93.30.144:8000/api/v1/leads/form", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post("http://147.93.30.144:8000/api/v1/leads/", payload);
      }

      toast.success("Lead created successfully!");

      // Reset form
      setFormData({
        full_name: "",
        father_name: "",
        email: "",
        mobile: "",
        alternate_mobile: "",
        aadhaar: "",
        pan: "",
        gstin: "",
        state: "",
        city: "",
        district: "",
        address: "",
        dob: "",
        occupation: "",
        segment: [],
        experience: "",
        investment: "",
        profile: "",
        lead_response_id: "",
        lead_source_id: "",
        comment: "",
        call_back_date: "",
        lead_status: "",
        branch_id: "",
      });
      setFiles({ aadhar_front_pic: null, aadhar_back_pic: null, pan_pic: null });
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error("Error creating lead");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 bg-white rounded shadow space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-3 rounded-t font-bold">
        Create New Lead
      </div>

      {/* Basic Info */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded" />
          <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="Father Name" className="p-2 border rounded" />
          <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" className="p-2 border rounded" />
          <input name="alternate_mobile" value={formData.alternate_mobile} onChange={handleChange} placeholder="Alternate Mobile" className="p-2 border rounded" />
          <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
          <input name="dob" type="date" value={formData.dob} onChange={handleChange} className="p-2 border rounded" />
          <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="p-2 border rounded" />
        </div>
      </div>

      {/* Document Info */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Documents</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="Aadhaar Number" className="p-2 border rounded" />
          <input name="pan" value={formData.pan} onChange={handleChange} placeholder="PAN Number" className="p-2 border rounded" />
          <input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="GSTIN" className="p-2 border rounded" />
          <input type="file" name="aadhar_front_pic" onChange={handleFileChange} className="col-span-1" />
          <input type="file" name="aadhar_back_pic" onChange={handleFileChange} className="col-span-1" />
          <input type="file" name="pan_pic" onChange={handleFileChange} className="col-span-1" />
        </div>
      </div>

      {/* Address Info */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="p-2 border rounded" />
          <input name="district" value={formData.district} onChange={handleChange} placeholder="District" className="p-2 border rounded" />
          <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="p-2 border rounded" />
        </div>
        <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Complete Address" className="p-2 border rounded mt-2 w-full" />
      </div>

      {/* Investment Details */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Investment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select multiple value={formData.segment} onChange={handleSegmentChange} className="p-2 border rounded">
            <option value="Cash">Cash</option>
            <option value="Futures">Futures</option>
            <option value="Options">Options</option>
          </select>
          <input name="investment" value={formData.investment} onChange={handleChange} placeholder="Investment Amount" className="p-2 border rounded" />
          <input name="experience" value={formData.experience} onChange={handleChange} placeholder="Experience" className="p-2 border rounded" />
          <input name="profile" value={formData.profile} onChange={handleChange} placeholder="Profile" className="p-2 border rounded" />
        </div>
      </div>

      {/* Lead Management */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Lead Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select name="lead_response_id" value={formData.lead_response_id} onChange={handleChange} className="p-2 border rounded">
            <option value="">Select Response</option>
            {leadResponses.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select name="lead_source_id" value={formData.lead_source_id} onChange={handleChange} className="p-2 border rounded">
            <option value="">Select Source</option>
            {leadSources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select name="branch_id" value={formData.branch_id} onChange={handleChange} className="p-2 border rounded">
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <input name="call_back_date" type="date" value={formData.call_back_date} onChange={handleChange} className="p-2 border rounded" />
          <input name="lead_status" value={formData.lead_status} onChange={handleChange} placeholder="Lead Status" className="p-2 border rounded" />
        </div>
        <textarea name="comment" value={formData.comment} onChange={handleChange} placeholder="Comment / Notes" className="p-2 border rounded mt-2 w-full" />
      </div>

      <div className="text-center mt-6">
        <button type="submit" className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700">
          Save Lead
        </button>
      </div>
    </form>
  );
}
