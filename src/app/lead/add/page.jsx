'use client'

import { useEffect, useState } from 'react'
import { axiosInstance } from '@/api/Axios'
import toast from 'react-hot-toast';

export default function LeadForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    email: '',
    mobile: '',
    alternate_mobile: '',
    aadhaar: '',
    pan: '',
    gstin: '',
    state: '',
    city: '',
    district: '',
    address: '',
    dob: '',
    occupation: '',
    segment: [],
    experience: '',
    investment: '',
    lead_response_id: '',
    lead_source_id: '',
    comment: '',
    call_back_date: '',
    lead_status: '',
    profile: '',
  })

  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panPic, setPanPic] = useState(null);
  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [panPicPreview, setPanPicPreview] = useState(null);
  const [leadSources, setLeadSources] = useState([])
  const [leadResponses, setLeadResponses] = useState([])
  const [loadingPan, setLoadingPan] = useState(false)

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
      previewSetter(URL.createObjectURL(file)); // generate preview URL
    }
  };

  useEffect(() => {
    axiosInstance.get('/lead-config/sources/?skip=0&limit=100')
      .then(res => setLeadSources(res.data || []))
    axiosInstance.get('/lead-config/responses/?skip=0&limit=100')
      .then(res => setLeadResponses(res.data || []))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "segment") {
      setFormData(prev => ({ ...prev, [name]: value.split(",").map(v => v.trim()) }));
    } else if (name === "comment") {
      setFormData(prev => ({ ...prev, [name]: { text: value } }));
    } else if (name === "pan") {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else if (name === "call_back_date" || name === "dob") {
      // Strictly allow DD-MM-YYYY
      if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Create Lead
      const payload = {
        ...formData,
        dob: formatForInput(formData.dob),
        call_back_date: formatForInput(formData.call_back_date),
      };

      const { data } = await axiosInstance.post('/leads/', payload);

      const leadId = data.id;

      // Step 2: Upload Documents
      if (aadharFront || aadharBack || panPic) {
        const uploadData = new FormData();
        if (aadharFront) uploadData.append('aadhar_front', aadharFront);
        if (aadharBack) uploadData.append('aadhar_back', aadharBack);
        if (panPic) uploadData.append('pan_pic', panPic);


        await axiosInstance.post(`/leads/${leadId}/upload-documents`, uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Lead and documents uploaded successfully');

      // ✅ Reset form and files
      setFormData({
        full_name: '',
        father_name: '',
        email: '',
        mobile: '',
        alternate_mobile: '',
        aadhaar: '',
        pan: '',
        gstin: '',
        state: '',
        city: '',
        district: '',
        address: '',
        dob: '',
        occupation: '',
        segment: [],
        experience: '',
        investment: '',
        lead_response_id: '',
        lead_source_id: '',
        comment: '',
        call_back_date: '',
        lead_status: '',
        profile: '',
      });
      setAadharFront(null);
      setAadharBack(null);
      setPanPic(null);
      setAadharFrontPreview(null);
      setAadharBackPreview(null);
      setPanPicPreview(null);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Error creating lead or uploading documents');
    }
  };

  const handleVerifyPan = async () => {
    if (!formData.pan) {
      toast.error('Please enter a PAN number first')
      return
    }
    setLoadingPan(true)
    try {
      const res = await axiosInstance.post(
        '/micro-pan-verification',
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )

      if (res.data.success && res.data.data?.result) {
        const result = res.data.data.result
        setFormData(prev => ({
          ...prev,
          full_name: result.user_full_name || prev.full_name,
          father_name: result.user_father_name || prev.father_name,
          dob: result.user_dob ? formatDob(result.user_dob) : prev.dob,
          address: result.user_address?.full || prev.address,
          city: result.user_address?.city || prev.city,
          state: result.user_address?.state || prev.state
        }))
        toast.success('PAN verified and details autofilled!')
      } else {
        toast.error('PAN verification failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Error verifying PAN')
    } finally {
      setLoadingPan(false)
    }
  }

  const formatDob = (dobString) => {
    return dobString || '';
  };

  // Convert "DD-MM-YYYY" → "YYYY-MM-DD" (for input type="date")
  const formatForInput = (ddmmyyyy) => {
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  // Convert "YYYY-MM-DD" → "DD-MM-YYYY"
  const formatToDDMMYYYY = (yyyymmdd) => {
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${dd}-${mm}-${yyyy}`;
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 bg-white rounded shadow">
      {/* Basic Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 rounded-t font-bold">
        Basic Details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">
        <div>
          <label className="block mb-1 font-medium">Full Name</label>
          <input name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Full Name" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Father Name</label>
          <input name="father_name" value={formData.father_name} onChange={handleChange} placeholder="Father Name" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Mobile</label>
          <input name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input name="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">State</label>
          <input name="state" value={formData.state} onChange={handleChange} placeholder="State" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">District</label>
          <input name="district" value={formData.district} onChange={handleChange} placeholder="District" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">City</label>
          <input name="city" value={formData.city} onChange={handleChange} placeholder="City" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Alternate Mobile</label>
          <input name="alternate_mobile" value={formData.alternate_mobile} onChange={handleChange} placeholder="Alternate Mobile" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Date of Birth (DD-MM-YYYY)</label>
          <input
            name="dob"
            type="text"
            placeholder="DD-MM-YYYY"
            value={formData.dob}
            onChange={handleChange}
            pattern="\d{2}-\d{2}-\d{4}"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Aadhaar Number</label>
          <input name="aadhaar" value={formData.aadhaar} onChange={handleChange} placeholder="Aadhaar Number" className="p-2 border rounded w-full" />
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block mb-1 font-medium">PAN Number</label>
          <div className="flex gap-2">
            <input
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              placeholder="PAN Number"
              className="p-2 border rounded w-full"
            />
            <button
              type="button"
              onClick={handleVerifyPan}
              disabled={loadingPan}
              className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 whitespace-nowrap"
            >
              {loadingPan ? 'Verifying...' : 'Verify PAN'}
            </button>
          </div>
        </div>

        <div>
          <label className="block mb-1 font-medium">GST Number</label>
          <input name="gstin" value={formData.gstin} onChange={handleChange} placeholder="GST Number" className="p-2 border rounded w-full" />
        </div>

        <div>
          <label className="block mb-1 font-medium">Occupation</label>
          <input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="p-2 border rounded w-full" />
        </div>

        <div className="col-span-2">
          <label className="block mb-1 font-medium">Address</label>
          <textarea name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="p-2 border rounded w-full" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 mt-8 rounded-t font-bold">
        Upload Documents
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-t-0 rounded-b">
        <div>
          <label className="block mb-2">Aadhar Front</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
            className="p-2 border rounded w-full"
          />
          {aadharFrontPreview && (
            <img src={aadharFrontPreview} alt="Aadhar Front" className="mt-2 h-24 w-32 object-cover border rounded" />
          )}
        </div>

        <div>
          <label className="block mb-2">Aadhar Back</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharBack, setAadharBackPreview)}
            className="p-2 border rounded w-full"
          />
          {aadharBackPreview && (
            <img src={aadharBackPreview} alt="Aadhar Back" className="mt-2 h-24 w-32 object-cover border rounded" />
          )}
        </div>

        <div>
          <label className="block mb-2">PAN Card</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setPanPic, setPanPicPreview)}
            className="p-2 border rounded w-full"
          />
          {panPicPreview && (
            <img src={panPicPreview} alt="PAN Card" className="mt-2 h-24 w-32 object-cover border rounded" />
          )}
        </div>

      </div>

      {/* Investment Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 mt-8 rounded-t font-bold">
        Investment Details
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">
        <div>
          <label className="block mb-1 font-medium">Segments (comma separated)</label>
          <input
            name="segment"
            value={formData.segment.join(", ")}
            onChange={handleChange}
            placeholder="e.g. cash, equity, future"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Investment</label>
          <input
            name="investment"
            value={formData.investment}
            onChange={handleChange}
            placeholder="Investment"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Experience</label>
          <input
            name="experience"
            value={formData.experience}
            onChange={handleChange}
            placeholder="Experience"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Profile</label>
          <input
            name="profile"
            value={formData.profile}
            onChange={handleChange}
            placeholder="Profile"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Lead Response</label>
          <select
            name="lead_response_id"
            value={formData.lead_response_id}
            onChange={handleChange}
            className="p-2 border rounded w-full"
          >
            <option value="">Select Response</option>
            {leadResponses.map((res) => (
              <option key={res.id} value={res.id}>{res.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Lead Source</label>
          <select
            name="lead_source_id"
            value={formData.lead_source_id}
            onChange={handleChange}
            className="p-2 border rounded w-full"
          >
            <option value="">Select Source</option>
            {leadSources.map((src) => (
              <option key={src.id} value={src.id}>{src.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium">Lead Status</label>
          <input
            name="lead_status"
            value={formData.lead_status}
            onChange={handleChange}
            placeholder="Lead Status"
            className="p-2 border rounded w-full"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Call Back Date (DD-MM-YYYY)</label>
          <input
            name="call_back_date"
            type="text"
            placeholder="DD-MM-YYYY"
            value={formData.call_back_date}
            onChange={handleChange}
            pattern="\d{2}-\d{2}-\d{4}"
            className="p-2 border rounded w-full"
          />
        </div>

        <div className="col-span-2">
          <label className="block mb-1 font-medium">Comment / Description</label>
          <textarea
            name="comment"
            value={formData.comment.text || ""}
            onChange={handleChange}
            placeholder="Description"
            className="p-2 border rounded w-full"
          />
        </div>
      </div>
      <div className="text-center mt-6">
        <button type="submit" className="bg-green-600 text-white px-8 py-2 rounded hover:bg-green-700">
          Save
        </button>
      </div>
    </form>
  )
}
