'use client'

import { useEffect, useMemo, useState } from 'react'
import Cookies from 'js-cookie'
import { axiosInstance } from '@/api/Axios'
import toast from 'react-hot-toast'
import { MultiSelectWithCheckboxes } from '@/components/Lead/ID/MultiSelectWithCheckboxes'
import { ErrorHandling } from '@/helper/ErrorHandling'

/* ---------- UI helpers ---------- */
const cn = (...x) => x.filter(Boolean).join(' ')

// Reusable style helpers pulling from theme CSS variables
const ringFocusStyle = {
  // make Tailwind focus ring use themed color
  '--tw-ring-color': 'var(--theme-components-input-focus, var(--theme-inputFocus))',
};

const inputSurfaceStyle = {
  background: 'var(--theme-components-input-bg, var(--theme-inputBackground))',
  color: 'var(--theme-components-card-text, var(--theme-text))',
  borderColor: 'var(--theme-components-input-border, var(--theme-inputBorder))',
};

const cardSurfaceStyle = {
  background: 'var(--theme-components-card-bg, var(--theme-cardBackground))',
  color: 'var(--theme-components-card-text, var(--theme-text))',
  borderColor: 'var(--theme-components-card-border, var(--theme-border))',
  boxShadow: '0 6px 20px var(--theme-shadow, rgba(0,0,0,0.1))',
};

const headerBarStyle = {
  background: 'var(--theme-components-header-bg, var(--theme-header))',
  color: 'var(--theme-components-header-text, var(--theme-headerText))',
  borderBottom: '1px solid var(--theme-components-card-border, var(--theme-border))',
};

const primaryBtnStyle = {
  background: 'var(--theme-components-button-primary-bg, var(--theme-primary))',
  color: 'var(--theme-components-button-primary-text, #fff)',
  borderColor: 'var(--theme-components-button-primary-border, transparent)',
  boxShadow: '0 6px 16px var(--theme-components-button-primary-shadow, rgba(0,0,0,0.15))',
};

const secondaryBtnStyle = {
  background: 'var(--theme-components-button-secondary-bg, var(--theme-surface))',
  color: 'var(--theme-components-button-secondary-text, var(--theme-text))',
  borderColor: 'var(--theme-components-button-secondary-border, var(--theme-border))',
  boxShadow: '0 4px 12px var(--theme-components-button-secondary-shadow, rgba(0,0,0,0.06))',
};

const warningBtnStyle = {
  background: 'var(--theme-warning, #f59e0b)',
  color: '#fff',
  borderColor: 'transparent',
  boxShadow: '0 6px 16px rgba(245, 158, 11, 0.25)',
};

const baseInput = "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:bg-transparent"
const baseSelect = baseInput
const baseArea = baseInput + " min-h-[88px]"

const Field = ({ label, children, className }) => (
  <div className={cn("space-y-1", className)}>
    <label
      className="text-sm font-medium"
      style={{ color: 'var(--theme-text, #1e293b)' }}
    >
      {label}
    </label>
    {children}
  </div>
)

const Section = ({ title, children, className }) => (
  <section
    className={cn("overflow-hidden rounded-2xl border shadow-sm", className)}
    style={cardSurfaceStyle}
  >
    <div
      className="px-4 py-2.5 text-sm font-semibold tracking-wide"
      style={headerBarStyle}
    >
      {title}
    </div>
    <div className="p-4">{children}</div>
  </section>
)

// --- Date helpers (same as in the other page) ---
const formatDateInput = (value) => {
  const d = String(value || "").replace(/\D/g, "").slice(0, 8); // keep 8 digits
  if (!d) return "";
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}-${d.slice(2)}`;
  return `${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4)}`;
};

// optional: keep if you need ISO later
const normalizeDate = (dmy) => {
  if (!dmy) return undefined;
  if (!/^\d{2}-\d{2}-\d{4}$/.test(dmy)) return undefined;
  const [dd, mm, yyyy] = dmy.split("-");
  return `${yyyy}-${mm}-${dd}`;
};

export default function LeadForm() {
  const [formData, setFormData] = useState({
    full_name: '', father_name: '', email: '', mobile: '', alternate_mobile: '',
    aadhaar: '', pan: '', pan_type: 'Person', gstin: '',
    state: '', city: '', district: '', pincode: '', address: '',
    dob: '', occupation: '', segment: [], experience: '',
    lead_response_id: '', lead_source_id: '', comment: '',
    call_back_date: '', profile: '',
  })

  const [aadharFront, setAadharFront] = useState(null)
  const [aadharBack, setAadharBack] = useState(null)
  const [panPic, setPanPic] = useState(null)
  const [aadharFrontPreview, setAadharFrontPreview] = useState(null)
  const [aadharBackPreview, setAadharBackPreview] = useState(null)
  const [panPicPreview, setPanPicPreview] = useState(null)
  const [leadSources, setLeadSources] = useState([])
  const [leadResponses, setLeadResponses] = useState([])
  const [loadingPan, setLoadingPan] = useState(false)
  const [panVerified, setPanVerified] = useState(false)
  // Track only the fields populated by PAN; lock just those.
  const [panLocked, setPanLocked] = useState({
    pan: false,
    pan_type: false,
    full_name: false,
    father_name: false,
    dob: false,
    aadhaar: false,
    state: false,
    city: false,
    district: false,
    pincode: false,
    address: false,
  });

  const isFilled = (v) => v != null && String(v).trim() !== "";
  const [submitting, setSubmitting] = useState(false)
  const [segmentsList, setSegmentsList] = useState([])

  // State autocomplete
  const [states, setStates] = useState([]) // [{state_name, code}]
  const [stateQuery, setStateQuery] = useState('')
  const [showStateList, setShowStateList] = useState(false)
  const [stateIndex, setStateIndex] = useState(0)

  const filteredStates = useMemo(() => {
    const q = (stateQuery || '').toUpperCase().trim()
    if (!q) return states
    return states.filter(s => s.state_name.includes(q))
  }, [stateQuery, states])

  const selectState = (name) => {
    setFormData(p => ({ ...p, state: name }))
    setStateQuery(name)
    setShowStateList(false)
  }

  const segmentOptions = useMemo(
    () => (segmentsList || []).map(s => ({ label: s, value: s })),
    [segmentsList]
  )

  const handleFileChange = (e, setter, previewSetter) => {
    const f = e.target.files?.[0]
    if (f) { setter(f); previewSetter(URL.createObjectURL(f)) }
  }

  useEffect(() => {
    axiosInstance.get('/lead-config/sources/?skip=0&limit=100')
      .then(r => setLeadSources(r.data || []))
      .catch(() => setLeadSources([]))

    axiosInstance.get('/lead-config/responses/?skip=0&limit=100')
      .then(r => setLeadResponses(r.data || []))
      .catch(() => setLeadResponses([]))

    axiosInstance.get('/profile-role/recommendation-type')
      .then(r => setSegmentsList(r.data || []))
      .catch(() => setSegmentsList([]))

    axiosInstance.get('/state/')
      .then(r => setStates(r?.data?.states || []))
      .catch(() => setStates([]))
  }, [])

  const onlyDigits = (s, max) => s.replace(/\D/g, '').slice(0, max)

  const handleChange = (e) => {
    const { name } = e.target
    let { value } = e.target

    if (name === 'comment') {
      setFormData(p => ({ ...p, comment: value.toUpperCase() }))
      return
    }

    if (name === 'call_back_date' || name === 'dob') {
  const v = formatDateInput(value);     // ← auto-places dashes while typing
  setFormData(p => ({ ...p, [name]: v }));
  return;
}

    // Small UX hygiene (doesn't change your backend logic)
    if (name === 'pan' || name === 'gstin') {
      value = value.toUpperCase()
    }
    if (name === 'mobile' || name === 'alternate_mobile') {
      value = onlyDigits(value, 10)
    }
    if (name === 'aadhaar') value = onlyDigits(value, 12)
    if (name === 'pincode') value = onlyDigits(value, 6)

    setFormData(p => ({ ...p, [name]: value }))
  }

  const handleVerifyPan = async () => {
    if (!formData.pan) return ErrorHandling({ defaultError: "Please enter a PAN number first" })
    if (!formData.pan_type) return ErrorHandling({ defaultError: "Please select PAN type before verifying" })

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
    if (!panRegex.test(formData.pan.trim())) {
      return ErrorHandling({ defaultError: "Invalid format for PAN number" });
    }
    setLoadingPan(true)
    try {
      const res = await axiosInstance.post(
        '/micro-pan-verification',
        new URLSearchParams({ pannumber: formData.pan }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      if (res.data?.success && res.data.data?.result) {
        const r = res.data.data.result;
        if (formData.pan_type !== r.pan_type) {
          toast(`Switching PAN type to "${r.pan_type === 'Person' ? 'Individual' : 'Company'}"`, { icon: 'ℹ️' });
        }

        setFormData(prev => ({
          ...prev,
          full_name: r.user_full_name ?? prev.full_name ?? '',
          father_name: r.user_father_name ?? prev.father_name ?? '',
          dob: r.user_dob || prev.dob || '',
          aadhaar: r.masked_aadhaar ?? prev.aadhaar ?? '',
          city: r.user_address?.city ?? prev.city ?? '',
          state: r.user_address?.state ?? prev.state ?? '',
          district: r.user_address?.district ?? prev.district ?? '',
          pincode: r.user_address?.zip ?? prev.pincode ?? '',
          address: r.user_address?.full ?? prev.address ?? '',
          pan_type: r.pan_type,
        }));

        const addr = r.user_address || {};
        setPanLocked({
          pan: true,               // PAN input locks after verify
          pan_type: true,          // PAN type locks after verify
          full_name: isFilled(r.user_full_name),
          father_name: isFilled(r.user_father_name),
          dob: isFilled(r.user_dob),
          aadhaar: isFilled(r.masked_aadhaar),
          state: isFilled(addr.state),
          city: isFilled(addr.city),
          district: isFilled(addr.district),
          pincode: isFilled(addr.zip),
          address: isFilled(addr.full),
        });

        setPanVerified(true);
        toast.success('PAN verified and details autofilled!');
      } else {
        ErrorHandling({ defaultError: "PAN verification failed" });
      }
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Error verifying PAN" })
    } finally {
      setLoadingPan(false)
    }
  }

  const handleEditPan = () => {
    setPanVerified(false);
    setPanLocked(prev => {
      const allFalse = {};
      for (const k of Object.keys(prev)) allFalse[k] = false;
      return allFalse;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault()

    // required mobile
    const mobile = (formData.mobile || '').trim()
    if (!/^\d{10}$/.test(mobile)) {
      return ErrorHandling({ defaultError: "Please enter a valid 10-digit Mobile number." })
    }
    if (!formData.lead_response_id) {
      return ErrorHandling({ defaultError: "Please select a Lead Response." })
    }
    if (!formData.lead_source_id) {
      return ErrorHandling({ defaultError: "Please select a Lead Source." })
    }

    setSubmitting(true)
    try {
      const normalizeDate = (dmy) => {
        if (!dmy) return undefined
        const parts = dmy.split('-'); if (parts.length !== 3) return undefined
        const [dd, mm, yyyy] = parts; if (!dd || !mm || !yyyy) return undefined
        return `${yyyy}-${mm}-${dd}`
      }

      const raw = Cookies.get('user_info'); const user = raw ? JSON.parse(raw) : null
      const role = user?.role || user?.user?.role || user?.role_name

      const basePayload = {
        mobile,
        full_name: formData.full_name?.trim() || undefined,
        father_name: formData.father_name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        alternate_mobile: formData.alternate_mobile?.trim() || undefined,
        aadhaar: formData.aadhaar?.trim() || undefined,
        pan: formData.pan?.trim() || undefined,
        gstin: formData.gstin?.trim() || undefined,
        state: formData.state?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        district: formData.district?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        pincode: formData.pincode?.trim() || undefined,
        dob: normalizeDate(formData.dob),
        occupation: formData.occupation?.trim() || undefined,
        segment: Array.isArray(formData.segment) && formData.segment.length ? formData.segment : undefined,
        experience: formData.experience?.trim() || undefined,
        lead_response_id: formData.lead_response_id ? Number(formData.lead_response_id) : undefined,
        lead_source_id: formData.lead_source_id ? Number(formData.lead_source_id) : undefined,
        comment: formData.comment?.trim() || undefined,
        call_back_date: normalizeDate(formData.call_back_date) || undefined,
        profile: formData.profile?.trim() || undefined,
        ...(role && role !== 'SUPERADMIN'),
      }
      const payload = Object.fromEntries(Object.entries(basePayload).filter(([, v]) => v !== undefined))

      const { data } = await axiosInstance.post('/leads/', payload)
      const leadId = data.id

      if (aadharFront || aadharBack || panPic) {
        const up = new FormData()
        if (aadharFront) up.append('aadhar_front', aadharFront)
        if (aadharBack) up.append('aadhar_back', aadharBack)
        if (panPic) up.append('pan_pic', panPic)
        await axiosInstance.post(`/leads/${leadId}/upload-documents`, up, { headers: { 'Content-Type': 'multipart/form-data' } })
      }

      toast.success('Lead saved successfully')
      setFormData({
        full_name: '', father_name: '', email: '', mobile: '', alternate_mobile: '',
        aadhaar: '', pan: '', pan_type: 'Person', gstin: '',
        state: '', city: '', district: '', pincode: '', address: '',
        dob: '', occupation: '', segment: [], experience: '',
        lead_response_id: '', lead_source_id: '', comment: '', call_back_date: '', profile: '',
      })
      setAadharFront(null); setAadharBack(null); setPanPic(null)
      setAadharFrontPreview(null); setAadharBackPreview(null); setPanPicPreview(null)
      setPanVerified(false)
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Error creating lead or uploading documents" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-16 p-4 sm:p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--theme-text, #1e293b)' }}
          >
            Create Lead
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--theme-textSecondary, #64748b)' }}
          >
            Capture client details, verify PAN, and upload KYC in one go.
          </p>
        </div>
      </div>

      {/* BASIC DETAILS */}
      <Section title="Basic Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="PAN Type">
            <select
              name="pan_type"
              value={formData.pan_type}
              onChange={handleChange}
              disabled={panLocked.pan_type}
              className={baseSelect}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            >
              <option value="">Select PAN Type</option>
              <option value="Person">Individual</option>
              <option value="Company">Company</option>
            </select>
          </Field>

          <Field label="PAN Number">
            <div className="flex gap-2">
              <input
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                placeholder="ABCDE1234F"
                disabled={panLocked.pan}
                maxLength={10}
                pattern="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"
                className={baseInput}
                style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              />
              {panLocked.pan ? (
                <button
                  type="button"
                  onClick={handleEditPan}
                  className="rounded-lg px-3 text-sm hover:opacity-90"
                  style={warningBtnStyle}
                >
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVerifyPan}
                  disabled={loadingPan}
                  className="rounded-lg px-3 text-sm hover:opacity-90 disabled:opacity-60"
                  style={primaryBtnStyle}
                >
                  {loadingPan ? 'Verifying…' : 'Verify'}
                </button>
              )}
            </div>
          </Field>

          <Field label="Full Name">
            <input
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              disabled={panLocked.full_name}
              placeholder="Full Name"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Father Name">
            <input
              name="father_name"
              value={formData.father_name}
              onChange={handleChange}
              disabled={panLocked.father_name}
              placeholder="Father Name"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Mobile">
            <input
              name="mobile"
              inputMode="numeric"
              value={formData.mobile}
              onChange={handleChange}
              required
              maxLength={10}
              pattern="^[0-9]{10}$"
              placeholder="10-digit mobile"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Email">
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@example.com"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Alternate Mobile">
            <input
              name="alternate_mobile"
              inputMode="numeric"
              value={formData.alternate_mobile}
              onChange={handleChange}
              maxLength={10}
              pattern="^[0-9]{10}$"
              placeholder="Optional"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Date of Birth (DD-MM-YYYY)">
  <input
    name="dob"
    value={formData.dob}
    onChange={handleChange}
    onPaste={(e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const v = formatDateInput(text);
      setFormData(p => ({ ...p, dob: v }));
    }}
    onBlur={() => {
      // optional: clear if pattern not satisfied on blur
      if (formData.dob && !/^\d{2}-\d{2}-\d{4}$/.test(formData.dob)) {
        setFormData(p => ({ ...p, dob: '' }));
      }
    }}
    placeholder="DD-MM-YYYY"
    inputMode="numeric"
    pattern="^[0-9]{2}-[0-9]{2}-[0-9]{4}$"
    disabled={panLocked.dob}
    className={baseInput}
    style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
  />
</Field>

          <Field label="Aadhaar Number">
            <input
              name="aadhaar"
              value={formData.aadhaar}
              onChange={handleChange}
              maxLength={12}
              placeholder="12-digit Aadhaar"
              disabled={panLocked.aadhaar}
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="GST Number">
            <input
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="Optional"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Occupation">
            <input
              name="occupation"
              value={formData.occupation}
              onChange={handleChange}
              placeholder="Profession"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="State" className="relative">
            <input
              name="state" value={formData.state}
              onChange={(e) => { setStateQuery(e.target.value); setFormData(p => ({ ...p, state: e.target.value })); setShowStateList(true); setStateIndex(0) }}
              onFocus={() => setShowStateList(true)}
              onBlur={() => setTimeout(() => setShowStateList(false), 120)}
              onKeyDown={(e) => {
                if (!showStateList || filteredStates.length === 0) return
                if (e.key === 'ArrowDown') { e.preventDefault(); setStateIndex(i => Math.min(i + 1, filteredStates.length - 1)) }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setStateIndex(i => Math.max(i - 1, 0)) }
                else if (e.key === 'Enter') { e.preventDefault(); const pick = filteredStates[stateIndex]; if (pick) selectState(pick.state_name) }
              }}
              placeholder="Start typing… e.g. MADHYA PRADESH"
              className={cn(baseInput)}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              autoComplete="off"
              disabled={panLocked.state}
            />
            {showStateList && filteredStates.length > 0 && (
              <div
                className="absolute left-0 right-0 mt-1 z-50 rounded-md border shadow max-h-60 overflow-auto"
                style={cardSurfaceStyle}
              >
                {filteredStates.map((s, idx) => (
                  <button
                    type="button" key={s.code}
                    onMouseDown={(e) => { e.preventDefault(); selectState(s.state_name) }}
                    className={cn("w-full text-left px-3 py-2")}
                    style={{
                      background: idx === stateIndex
                        ? 'color-mix(in oklab, var(--theme-primary, #3b82f6) 12%, transparent)'
                        : 'transparent',
                      color: 'var(--theme-text, #1e293b)',
                    }}
                  >
                    {s.state_name}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="District">
            <input
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="District"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              disabled={panLocked.district}
            />
          </Field>

          <Field label="City">
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="City"
              className={cn(baseInput)}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              disabled={panLocked.city}
            />
          </Field>

          <Field label="Pin Code">
            <input
              name="pincode"
              inputMode="numeric"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Pin Code"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              disabled={panLocked.pincode}
            />
          </Field>

          <Field label="Address" className="md:col-span-2">
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Full address"
              className={baseArea}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              disabled={panLocked.address}
            />
          </Field>
        </div>
      </Section>

      {/* DOCUMENTS */}
      <Section title="Upload Documents">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Aadhar Front">
            <input
              type="file" accept="image/*"
              onChange={(e) => handleFileChange(e, setAadharFront, setAadharFrontPreview)}
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
            {aadharFrontPreview && (
              <img
                src={aadharFrontPreview}
                alt="Aadhar Front"
                className="mt-2 h-28 w-36 object-cover rounded-lg border"
                style={{ borderColor: 'var(--theme-components-card-border, var(--theme-border))' }}
              />
            )}
          </Field>
          <Field label="Aadhar Back">
            <input
              type="file" accept="image/*"
              onChange={(e) => handleFileChange(e, setAadharBack, setAadharBackPreview)}
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
            {aadharBackPreview && (
              <img
                src={aadharBackPreview}
                alt="Aadhar Back"
                className="mt-2 h-28 w-36 object-cover rounded-lg border"
                style={{ borderColor: 'var(--theme-components-card-border, var(--theme-border))' }}
              />
            )}
          </Field>
          <Field label="PAN Card">
            <input
              type="file" accept="image/*"
              onChange={(e) => handleFileChange(e, setPanPic, setPanPicPreview)}
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
            {panPicPreview && (
              <img
                src={panPicPreview}
                alt="PAN Card"
                className="mt-2 h-28 w-36 object-cover rounded-lg border"
                style={{ borderColor: 'var(--theme-components-card-border, var(--theme-border))' }}
              />
            )}
          </Field>
        </div>
      </Section>

      {/* INVESTMENT */}
      <Section title="Investment Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Segments">
            <MultiSelectWithCheckboxes
              options={segmentOptions}
              value={formData.segment}
              onChange={(vals) => setFormData(p => ({ ...p, segment: vals }))}
              placeholder="Select segment(s)"
            />
            <p
              className="mt-1 text-xs"
              style={{ color: 'var(--theme-textSecondary, #64748b)' }}
            >
              You can choose multiple segments.
            </p>
          </Field>

          <Field label="Experience">
            <input
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g. 2 years"
              className={baseInput}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>

          <Field label="Lead Response">
            <select
              name="lead_response_id"
              value={String(formData.lead_response_id ?? '')}
              onChange={handleChange}
              className={baseSelect}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              required
            >
              <option value="">Select Response</option>
              {leadResponses
              .filter((r) => r.name !== "CLIENT")
              .map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Lead Source">
            <select
              name="lead_source_id"
              value={String(formData.lead_source_id ?? '')}
              onChange={handleChange}
              className={baseSelect}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
              required
            >
              <option value="">Select Source</option>
              {leadSources.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </Field>

          <Field label="Call Back Date (DD-MM-YYYY)">
  <input
    name="call_back_date"
    value={formData.call_back_date}
    onChange={handleChange}
    onPaste={(e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const v = formatDateInput(text);
      setFormData(p => ({ ...p, call_back_date: v }));
    }}
    onBlur={() => {
      // optional: clear if pattern not satisfied on blur
      if (formData.call_back_date && !/^\d{2}-\d{2}-\d{4}$/.test(formData.call_back_date)) {
        setFormData(p => ({ ...p, call_back_date: '' }));
      }
    }}
    placeholder="DD-MM-YYYY"
    inputMode="numeric"
    pattern="^[0-9]{2}-[0-9]{2}-[0-9]{4}$"
    className={baseInput}
    style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
  />
</Field>

          <Field label="Comment / Description" className="md:col-span-2">
            <textarea
              name="comment"
              value={formData.comment}
              onChange={handleChange}
              placeholder="Notes for the team"
              className={baseArea}
              style={{ ...inputSurfaceStyle, ...ringFocusStyle }}
            />
          </Field>
        </div>
      </Section>

      {/* Sticky actions */}
      <div className="sm:hidden sticky bottom-3">
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "w-full rounded-xl px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur hover:opacity-90 disabled:opacity-60"
          )}
          style={primaryBtnStyle}
        >
          {submitting ? 'Saving…' : 'Save Lead'}
        </button>
      </div>
      <div className="hidden sm:block text-center">
        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium shadow-sm transition hover:opacity-90 disabled:opacity-60"
          )}
          style={primaryBtnStyle}
        >
          {submitting ? 'Saving…' : 'Save Lead'}
        </button>
      </div>
    </form>
  )
}
