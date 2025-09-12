'use client'

import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { axiosInstance } from '@/api/Axios'
import toast from 'react-hot-toast';
import { MultiSelectWithCheckboxes } from '@/components/Lead/ID/MultiSelectWithCheckboxes';
import { ErrorHandling } from "@/helper/ErrorHandling";

export default function LeadForm() {
  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    email: '',
    mobile: '',
    alternate_mobile: '',
    aadhaar: '',
    pan: '',
    pan_type: 'Person',           // used only for PAN verification (NOT sent in payload)
    gstin: '',
    state: '',
    city: '',
    district: '',
    pincode: '',
    address: '',
    dob: '',
    occupation: '',
    segment: [],
    experience: '',
    lead_response_id: '',
    lead_source_id: '',
    comment: '',
    call_back_date: '',
    profile: '',
  })

  const [branchId, setBranchId] = useState(null) // ← auto from cookie

  const [aadharFront, setAadharFront] = useState(null);
  const [aadharBack, setAadharBack] = useState(null);
  const [panPic, setPanPic] = useState(null);
  const [aadharFrontPreview, setAadharFrontPreview] = useState(null);
  const [aadharBackPreview, setAadharBackPreview] = useState(null);
  const [panPicPreview, setPanPicPreview] = useState(null);
  const [leadSources, setLeadSources] = useState([])
  const [leadResponses, setLeadResponses] = useState([])
  const [loadingPan, setLoadingPan] = useState(false)
  const [panVerified, setPanVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [segmentsList, setSegmentsList] = useState([]);

  // NEW: states for autocomplete
  const [states, setStates] = useState([]); // [{ state_name, code }]

  // Autocomplete state for "State"
  const [stateQuery, setStateQuery] = useState('');
  const [showStateList, setShowStateList] = useState(false);
  const [stateIndex, setStateIndex] = useState(0);

  const filteredStates = useMemo(() => {
    const q = (stateQuery || '').toUpperCase().trim();
    if (!q) return states;
    return states.filter(s => s.state_name.includes(q));
  }, [stateQuery, states]);

  const selectState = (name) => {
    setFormData(prev => ({ ...prev, state: name }));
    setStateQuery(name);
    setShowStateList(false);
  };

  const segmentOptions = useMemo(
    () => (segmentsList || []).map((s) => ({ label: s, value: s })),
    [segmentsList]
  );

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (file) {
      setter(file);
      previewSetter(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    // Pull branch_id from cookie: user_info (fallbacks included)
    try {
      const raw = Cookies.get('user_info');
      if (raw) {
        const u = JSON.parse(raw);
        const b =
          u?.branch_id ??
          u?.user?.branch_id ??
          u?.branch?.id ??
          null;
        setBranchId(b);
      }
    } catch (e) {
      console.warn('Failed to read user_info cookie', e);
    }

    axiosInstance.get('/lead-config/sources/?skip=0&limit=100')
      .then(res => setLeadSources(res.data || []))
      .catch(() => setLeadSources([]));

    axiosInstance.get('/lead-config/responses/?skip=0&limit=100')
      .then(res => setLeadResponses(res.data || []))
      .catch(() => setLeadResponses([]));

    axiosInstance.get('/profile-role/recommendation-type')
      .then(res => setSegmentsList(res.data || []))
      .catch(() => setSegmentsList([]));

    // NEW: fetch Indian states (name + code)
    axiosInstance.get('/state/')
      .then(res => setStates(res?.data?.states || []))
      .catch(() => setStates([]));
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "comment") {
      setFormData(prev => ({ ...prev, [name]: value }));
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else if (name === "call_back_date" || name === "dob") {
      if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVerifyPan = async () => {
    if (!formData.pan) {
      ErrorHandling({ defaultError: "Please enter a PAN number first" });
      return;
    }
    if (!formData.pan_type) {
      ErrorHandling({ defaultError: "Please select PAN type before verifying" });
      return;
    }
    setLoadingPan(true);
    try {
      const res = await axiosInstance.post(
        '/micro-pan-verification',
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (res.data?.success && res.data.data?.result) {
        const r = res.data.data.result;
        if (formData.pan_type !== r.pan_type) {
          toast(`Switching PAN type to "${r.pan_type === 'Person' ? 'Individual' : 'Company'}"`, { icon: 'ℹ️' });
        }
        setFormData(prev => ({
          ...prev,
          full_name: r.user_full_name ?? prev.full_name ?? '',
          father_name: r.user_father_name ?? prev.father_name ?? '',
          dob: formatDob(r.user_dob) ?? prev.dob ?? '',
          aadhaar: r.masked_aadhaar ?? prev.aadhaar ?? '',
          city: r.user_address?.city ?? prev.city ?? '',
          state: r.user_address?.state ?? prev.state ?? '',
          district: r.user_address?.district ?? prev.district ?? '',
          pincode: r.user_address?.zip ?? prev.pincode ?? '',
          address: r.user_address?.full ?? prev.address ?? '',
          pan_type: r.pan_type, // keep in form, not sent to backend
        }));
        setPanVerified(true);
        toast.success('PAN verified and details autofilled!');
      } else {
        ErrorHandling({ defaultError: "PAN verification failed" });
      }
    } catch (err) {
      console.error(err);
      ErrorHandling({ error: err, defaultError: "Error verifying PAN" });
    } finally {
      setLoadingPan(false);
    }
  };

  const handleResetPan = () => {
    setPanVerified(false);
    setFormData(prev => ({
      ...prev,
      full_name: '',
      father_name: '',
      dob: '',
      aadhaar: '',
      city: '',
      state: '',
      district: '',
      pan_type: 'Person',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
const { name, value } = e.target;

  // keep id fields as strings in state
  if (name === 'lead_source_id' || name === 'lead_response_id') {
    setFormData(prev => ({ ...prev, [name]: value })); // value is already a string
    return;
  }

  if (name === 'comment') {
    setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
  } else if (name === 'call_back_date' || name === 'dob') {
    if (/^\d{0,2}-?\d{0,2}-?\d{0,4}$/.test(value)) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  } else {
    setFormData(prev => ({ ...prev, [name]: value }));
  }
    // Only mobile is required
    const mobile = (formData.mobile || '').trim();
    if (!/^\d{10}$/.test(mobile)) {
      ErrorHandling({ defaultError: "Please enter a valid 10-digit Mobile number." });
      return;
    }

    setSubmitting(true);
    try {
      // Helper: convert DD-MM-YYYY -> YYYY-MM-DD (if present)
      const normalizeDate = (ddmmyyyy) => {
        if (!ddmmyyyy) return undefined;
        const parts = ddmmyyyy.split('-');
        if (parts.length !== 3) return undefined;
        const [dd, mm, yyyy] = parts;
        if (!dd || !mm || !yyyy) return undefined;
        return `${yyyy}-${mm}-${dd}`;
      };

      // Build a payload with only non-empty values
      const raw = Cookies.get('user_info');
      const user = raw ? JSON.parse(raw) : null;
      const role = user?.role || user?.user?.role || user?.role_name;

      const basePayload = {
        // required
        mobile,

        // optional (add only if user filled them)
        full_name: (formData.full_name || '').trim() || undefined,
        father_name: (formData.father_name || '').trim() || undefined,
        email: (formData.email || '').trim() || undefined,
        alternate_mobile: (formData.alternate_mobile || '').trim() || undefined,
        aadhaar: (formData.aadhaar || '').trim() || undefined,
        pan: (formData.pan || '').trim() || undefined,
        gstin: (formData.gstin || '').trim() || undefined,

        state: (formData.state || '').trim() || undefined,
        city: (formData.city || '').trim() || undefined,
        district: (formData.district || '').trim() || undefined,
        address: (formData.address || '').trim() || undefined,
        pincode: (formData.pincode || '').trim() || undefined,

        dob: normalizeDate(formData.dob),
        occupation: (formData.occupation || '').trim() || undefined,
        segment: Array.isArray(formData.segment) && formData.segment.length ? formData.segment : undefined,
        experience: (formData.experience || '').trim() || undefined,
        lead_response_id: formData.lead_response_id ? Number(formData.lead_response_id) : undefined,
        lead_source_id: formData.lead_source_id ? Number(formData.lead_source_id) : undefined,
        comment: (formData.comment || '').trim() || undefined,
        call_back_date: normalizeDate(formData.call_back_date) || undefined,
        profile: (formData.profile || '').trim() || undefined,
        // include branch_id only if NOT SUPERADMIN and we actually have it
        ...(role && role !== 'SUPERADMIN' && branchId ? { branch_id: branchId } : {}),
      };

      // Remove undefined keys
      const payload = Object.fromEntries(
        Object.entries(basePayload).filter(([_, v]) => v !== undefined)
      );

      const { data } = await axiosInstance.post('/leads/', payload);
      const leadId = data.id;

      // Optional document uploads
      if (aadharFront || aadharBack || panPic) {
        const uploadData = new FormData();
        if (aadharFront) uploadData.append('aadhar_front', aadharFront);
        if (aadharBack) uploadData.append('aadhar_back', aadharBack);
        if (panPic) uploadData.append('pan_pic', panPic);

        await axiosInstance.post(
          `/leads/${leadId}/upload-documents`,
          uploadData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      }

      toast.success('Lead saved successfully');
      // reset
      setFormData({
        full_name: '',
        father_name: '',
        email: '',
        mobile: '',
        alternate_mobile: '',
        aadhaar: '',
        pan: '',
        pan_type: 'Person',
        gstin: '',
        state: '',
        city: '',
        district: '',
        address: '',
        dob: '',
        occupation: '',
        segment: [],
        experience: '',
        lead_response_id: '',
        lead_source_id: '',
        comment: '',
        call_back_date: '',
        profile: '',
      });
      setAadharFront(null); setAadharBack(null); setPanPic(null);
      setAadharFrontPreview(null); setAadharBackPreview(null); setPanPicPreview(null);
      setPanVerified(false);
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Error creating lead or uploading documents" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDob = dobString => dobString || '';
  const formatForInput = (ddmmyyyy = '') => {
    const parts = ddmmyyyy.split('-');
    if (parts.length !== 3) return '';
    const [dd, mm, yyyy] = parts;
    if (!dd || !mm || !yyyy) return '';
    return `${yyyy}-${mm}-${dd}`;
  };

  return (
    <form onSubmit={handleSubmit} className="mx-2 p-6 bg-white rounded shadow">
      {/* Basic Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 rounded-t font-bold">
        Basic Details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">

        {/* PAN Type */}
        <div>
          <label className="block mb-1 font-medium">PAN Type</label>
          <select
            name="pan_type"
            value={formData.pan_type}
            onChange={handleChange}
            disabled={panVerified}
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          >
            <option value="">Select PAN Type</option>
            <option value="Person">Individual</option>
            <option value="Company">Company</option>
          </select>
        </div>

        {/* PAN Number + Verify / Reset */}
        <div className="col-span-2 md:col-span-1">
          <label className="block mb-1 font-medium">PAN Number</label>
          <div className="flex gap-2">
            <input
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              placeholder="PAN Number"
              disabled={panVerified}
              maxLength={10}
              minLength={10}
              pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
              className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
            />
            {panVerified ? (
              <button
                type="button"
                onClick={handleResetPan}
                className="bg-yellow-500 text-white px-4 rounded hover:bg-yellow-600 whitespace-nowrap"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={handleVerifyPan}
                disabled={loadingPan}
                className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 whitespace-nowrap"
              >
                {loadingPan ? 'Verifying...' : 'Verify PAN'}
              </button>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label className="block mb-1 font-medium">Full Name</label>
          <input
            name="full_name"
            value={formData.full_name ?? ''}
            onChange={handleChange}
            placeholder="Full Name"
            disabled={panVerified}
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          />
        </div>

        {/* Father Name */}
        <div>
          <label className="block mb-1 font-medium">Father Name</label>
          <input
            name="father_name"
            value={formData.father_name}
            onChange={handleChange}
            placeholder="Father Name"
            disabled={panVerified}
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="block mb-1 font-medium">Mobile</label>
          <input
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            placeholder="Mobile"
            required
            maxLength={10}
            minLength={10}
            pattern="^[0-9]{10}$"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            name="email"
            type="email"
            value={formData.email ?? ''}
            onChange={handleChange}
            placeholder="Email"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Alternate Mobile */}
        <div>
          <label className="block mb-1 font-medium">Alternate Mobile</label>
          <input
            name="alternate_mobile"
            value={formData.alternate_mobile}
            onChange={handleChange}
            placeholder="Alternate Mobile"
            maxLength={10}
            minLength={10}
            pattern="^[0-9]{10}$"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block mb-1 font-medium">Date of Birth (DD-MM-YYYY)</label>
          <input
            name="dob"
            type="text"
            placeholder="DD-MM-YYYY"
            value={formData.dob}
            onChange={handleChange}
            pattern="^[0-9]{2}-[0-9]{2}-[0-9]{4}$"
            disabled={panVerified}
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          />
        </div>

        {/* Aadhaar Number */}
        <div>
          <label className="block mb-1 font-medium">Aadhaar Number</label>
          <input
            name="aadhaar"
            value={formData.aadhaar}
            onChange={handleChange}
            placeholder="Aadhaar Number"
            disabled={panVerified}
            maxLength={12}
            minLength={12}
            pattern="^[0-9]{12}$"
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          />
        </div>

        {/* GST Number */}
        <div>
          <label className="block mb-1 font-medium">GST Number</label>
          <input
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder="GST Number"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Occupation */}
        <div>
          <label className="block mb-1 font-medium">Occupation</label>
          <input
            name="occupation"
            value={formData.occupation}
            onChange={handleChange}
            placeholder="Occupation"
            className="p-2 border rounded w-full"
          />
        </div>

        <div className="relative">
          <label className="block mb-1 font-medium">State</label>
          <input
            name="state"
            value={formData.state}
            onChange={(e) => {
              setStateQuery(e.target.value);
              setFormData(prev => ({ ...prev, state: e.target.value }));
              setShowStateList(true);
              setStateIndex(0);
            }}
            onFocus={() => setShowStateList(true)}
            onBlur={() => setTimeout(() => setShowStateList(false), 120)}
            onKeyDown={(e) => {
              if (!showStateList || filteredStates.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setStateIndex(i => Math.min(i + 1, filteredStates.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setStateIndex(i => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const pick = filteredStates[stateIndex];
                if (pick) selectState(pick.state_name);
              }
            }}
            placeholder="Start typing… e.g. MADHYA PRADESH"
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
            autoComplete="off"
          />
          {showStateList && filteredStates.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 z-50 bg-white border rounded-md shadow max-h-60 overflow-auto">
              {filteredStates.map((s, idx) => (
                <button
                  type="button"
                  key={s.code}
                  onMouseDown={(e) => { e.preventDefault(); selectState(s.state_name); }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${idx === stateIndex ? 'bg-gray-100' : ''
                    }`}
                >
                  {s.state_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* District */}
        <div>
          <label className="block mb-1 font-medium">District</label>
          <input
            name="district"
            value={formData.district}
            onChange={handleChange}
            placeholder="District"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* City */}
        <div>
          <label className="block mb-1 font-medium">City</label>
          <input
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            className="p-2 border rounded w-full bg-gray-50 disabled:bg-gray-100"
          />
        </div>

        {/* Pin Code */}
        <div>
          <label className="block mb-1 font-medium">Pin Code</label>
          <input
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="Pin Code"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Address */}
        <div className="col-span-2">
          <label className="block mb-1 font-medium">Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address"
            className="p-2 border rounded w-full"
          />
        </div>
      </div>

      {/* Upload Documents */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 mt-8 rounded-t font-bold">
        Upload Documents
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-t-0 rounded-b">
        {/* Aadhar Front */}
        <div>
          <label className="block mb-2">Aadhar Front</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
            className="p-2 border rounded w-full"
          />
          {aadharFrontPreview && <img src={aadharFrontPreview} alt="Aadhar Front" className="mt-2 h-24 w-32 object-cover border rounded" />}
        </div>
        {/* Aadhar Back */}
        <div>
          <label className="block mb-2">Aadhar Back</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setAadharBack, setAadharBackPreview)}
            className="p-2 border rounded w-full"
          />
          {aadharBackPreview && <img src={aadharBackPreview} alt="Aadhar Back" className="mt-2 h-24 w-32 object-cover border rounded" />}
        </div>
        {/* PAN Card */}
        <div>
          <label className="block mb-2">PAN Card</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, setPanPic, setPanPicPreview)}
            className="p-2 border rounded w-full"
          />
          {panPicPreview && <img src={panPicPreview} alt="PAN Card" className="mt-2 h-24 w-32 object-cover border rounded" />}
        </div>
      </div>

      {/* Investment Details */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-400 text-white px-4 py-2 mt-8 rounded-t font-bold">
        Investment Details
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-t-0 rounded-b">
        {/* Segments */}
        <div>
          <label className="block mb-1 font-medium">Segments</label>
          <MultiSelectWithCheckboxes
            options={segmentOptions}
            value={formData.segment}
            onChange={(vals) => setFormData(prev => ({ ...prev, segment: vals }))}
            placeholder="Select segment(s)"
          />
          <p className="text-xs text-gray-500 mt-1">
            You can choose multiple segments.
          </p>
        </div>

        {/* Experience */}
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

        {/* Lead Response */}
        <div>
          <label className="block mb-1 font-medium">Lead Response</label>
          <select
            name="lead_response_id"
            value={formData.lead_response_id}
            onChange={handleChange}
            className="p-2 border rounded w-full"
          >
            <option value="">Select Response</option>
            {leadResponses.map(res => <option key={res.id} value={res.id}>{res.name}</option>)}
          </select>
        </div>

{/* Lead Source */}
<div>
  <label className="block mb-1 font-medium">Lead Source</label>
  <select
    name="lead_source_id"
    value={String(formData.lead_source_id ?? '')}
    onChange={handleChange}
    className="p-2 border rounded w-full"
  >
    <option value="">Select Source</option>
    {leadSources.map((src) => (
      <option key={src.id} value={String(src.id)}>
        {src.name}
      </option>
    ))}
  </select>
</div>

        {/* Call Back Date */}
        <div>
          <label className="block mb-1 font-medium">Call Back Date (DD-MM-YYYY)</label>
          <input
            name="call_back_date"
            type="text"
            placeholder="DD-MM-YYYY"
            value={formData.call_back_date}
            onChange={handleChange}
            pattern="^[0-9]{2}-[0-9]{2}-[0-9]{4}$"
            className="p-2 border rounded w-full"
          />
        </div>

        {/* Comment */}
        <div className="col-span-2">
          <label className="block mb-1 font-medium">Comment / Description</label>
          <textarea
            name="comment"
            value={formData.comment ?? ''}
            onChange={handleChange}
            placeholder="Description"
            className="p-2 border rounded w-full"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="text-center mt-6">
        <button
          type="submit"
          disabled={submitting}
          className={`px-8 py-2 rounded text-white ${submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
