'use client'

import { useEffect, useRef, useState } from 'react'
import { axiosInstance } from '@/api/Axios'
import LoadingState from '@/components/LoadingState'
import toast from 'react-hot-toast'
import { usePermissions } from '@/context/PermissionsContext'
import { PhoneCall, BadgePercent, Pencil, Trash2, Tag } from "lucide-react";

export default function ServicesPage() {
  const { hasPermission } = usePermissions();

  /* ---------- hydration-safe flags ---------- */
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const canCreate = isClient && hasPermission('service_create');
  const canEdit = isClient && hasPermission('service_edit');
  const canDelete = isClient && hasPermission('service_delete');

  /* ---------- state ---------- */
  const [services, setServices] = useState([]);
  const [billingCycles] = useState(['CALL']); // fixed to CALL
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    discount_percent: 0,
    billing_cycle: 'CALL',
    CALL: 0,
    service_type: [],
  });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceTypeOptions, setServiceTypeOptions] = useState([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const allCheckboxRef = useRef(null);

  const SERVICE_API = '/services';

  /* ---------- helpers ---------- */
  // Stable currency string: plain number during SSR, formatted after mount
  const displayINR = (n) =>
    isClient
      ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(n ?? 0))
      : String(Number(n ?? 0));

  /* ---------- effects ---------- */
  useEffect(() => {
    fetchServiceTypeOptions();
    fetchServices();
  }, []);

  useEffect(() => {
    if (!allCheckboxRef.current) return;
    allCheckboxRef.current.indeterminate =
      formData.service_type.length > 0 &&
      formData.service_type.length < serviceTypeOptions.length;
  }, [formData.service_type, serviceTypeOptions]);

  useEffect(() => {
    if (!showTypeDropdown) return;
    const handleClick = (e) => {
      if (!e.target.closest('.relative.md\\:col-span-2')) {
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showTypeDropdown]);

  /* ---------- data ---------- */
  const fetchServiceTypeOptions = async () => {
    try {
      const res = await axiosInstance.get('/profile-role/recommendation-type');
      setServiceTypeOptions(res.data || []);
    } catch {
      toast.error('Failed to fetch service types');
    }
  };

  const fetchServices = async () => {
    try {
      const res = await axiosInstance.get(SERVICE_API);
      setServices(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch services');
    }
  };

  /* ---------- handlers ---------- */
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'service_type') {
      setFormData((prev) => ({
        ...prev,
        service_type: value.split(',').map(s => s.trim()).filter(Boolean),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'CALL'
          ? (value === '' ? '' : parseInt(value))
          : value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, description, price, billing_cycle, discount_percent } = formData;

    if (!name || !description || !price || !billing_cycle) {
      toast.error('Please fill all required fields');
      return;
    }
    if (discount_percent > 100) {
      toast.error('Discount cannot be more than 100%');
      return;
    }

    try {
      setLoading(true);
      const payload = { ...formData, billing_cycle: 'CALL' }; // enforce CALL
      if (editId) {
        const res = await axiosInstance.patch(`${SERVICE_API}/${editId}`, payload);
        toast.success(`Service "${res.data.name}" updated!`);
      } else {
        const res = await axiosInstance.post(SERVICE_API, payload);
        toast.success(`Service "${res.data.name}" created!`);
      }
      resetForm();
      fetchServices();
    } catch (err) {
      const message = err?.response?.data?.detail;
      if (err?.response?.status === 409 && message === "Service already exists") {
        toast.error("This service already exists!");
      } else {
        toast.error(message || "Failed to save service");
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      discount_percent: '',
      billing_cycle: 'CALL',
      CALL: 0,
      service_type: [],
    });
    setEditId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (srv) => {
    setFormData({
      name: srv.name,
      description: srv.description,
      price: parseFloat(srv.price),
      discount_percent: parseFloat(srv.discount_percent),
      billing_cycle: 'CALL',
      CALL: srv.CALL || 0,
      service_type: Array.isArray(srv.service_type)
        ? srv.service_type
        : (srv.service_type ? [srv.service_type] : []),
    });
    setEditId(srv.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await axiosInstance.delete(`${SERVICE_API}/${id}`);
      toast.success('Service deleted');
      fetchServices();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete service');
    }
  };

  /* ---------- derived ---------- */
  const callOnlyServices = services.filter(s => s.billing_cycle === 'CALL');

  /* ---------- render ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <h1 className="text-4xl font-bold text-gray-800 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text ">
              Plans Management
            </h1>
            <p className="text-gray-600 text-lg">Manage and organize your plan offerings</p>
          </div>

          {hasPermission("plans_create_plan") && <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-3 rounded-xl shadow-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 flex items-center gap-3 font-semibold"
            >
              + Create Plan
            </button>}

        </div>

        {loading ? (
          <LoadingState message="Loading services..." />
        ) : callOnlyServices.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500 font-medium">No CALL services available</p>
            <p className="text-gray-400 mt-2">Create your first CALL-based service to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {callOnlyServices.map((srv) => {
              const hasDiscount = Number(srv.discount_percent) > 0 && srv.discounted_price != null;
              const finalPrice = srv.discounted_price != null ? srv.discounted_price : srv.price;
              const youSave = hasDiscount ? (Number(srv.price) - Number(srv.discounted_price)).toFixed(2) : null;
              const types = Array.isArray(srv.service_type) ? srv.service_type : (srv.service_type ? [srv.service_type] : []);
              const visibleTypes = types.slice(0, 3);
              const extraCount = Math.max(0, types.length - visibleTypes.length);

              return (
                <div
                  key={srv.id}
                  className="group relative p-[1px] rounded-2xl bg-gradient-to-br from-indigo-200 via-blue-200 to-sky-100 hover:shadow-2xl hover:shadow-indigo-200/60 transition-all duration-300"
                >
                  <div className="relative h-full bg-white/90 backdrop-blur rounded-2xl overflow-hidden">

                    {/* Corner ribbon for discount */}
                    {hasDiscount && (
                      <div className="absolute -right-10 top-4 z-10 rotate-45 bg-emerald-500 text-white text-xs font-semibold tracking-wide px-10 py-1 shadow-md">
                        <span className="inline-flex items-center gap-1">
                          <BadgePercent size={14} />
                          Save {Number(srv.discount_percent)}%
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="relative p-4 bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                      <h3 className="text-lg font-semibold leading-snug line-clamp-2 pr-6">
                        {srv.name}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 ring-1 ring-white/20">
                          CALL
                        </span>

                        {srv.CALL > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/10 ring-1 ring-white/15">
                            <PhoneCall size={14} />
                            {srv.CALL} Calls
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 relative">
                      
                        <div className="absolute right-2 top-2 flex items-center gap-2">
                          
                          {hasPermission("edit_plan")&& <button
                              onClick={() => handleEdit(srv)}
                              className="p-2 rounded-full hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                              aria-label="Edit"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>}
                          
                           {hasPermission("delete_plan")&& <button
                              onClick={() => handleDelete(srv.id)}
                              className="p-2 rounded-full hover:bg-rose-50 text-rose-600 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400/50"
                              aria-label="Delete"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>}
                          
                        </div>
                      

                      {/* Description */}
                      <p className="text-sm text-gray-600 mb-4 pr-12 line-clamp-3">
                        {srv.description}
                      </p>

                      {/* Price block */}
                      <div className="mb-5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{displayINR(finalPrice)}
                          </span>
                          {hasDiscount && (
                            <span className="text-sm text-gray-500 line-through">
                              ₹{displayINR(srv.price)}
                            </span>
                          )}
                        </div>
                        {hasDiscount && (
                          <p className="text-sm text-emerald-600 font-medium mt-1">
                            You save ₹{displayINR(youSave)}
                          </p>
                        )}
                      </div>

                      {/* Types chips */}
                      {types.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {visibleTypes.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                            >
                              <Tag size={12} />
                              {t}
                            </span>
                          ))}
                          {extraCount > 0 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                              +{extraCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Subtle hover glow */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 ring-indigo-500/20 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">{editId ? 'Edit Service' : 'Create Service'}</h2>
                  <button onClick={() => setIsModalOpen(false)} className="text-white text-lg">✕</button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Service Name */}
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">Service Name</label>
                    <input
                      type="text"
                      name="name"
                      placeholder="Service Name"
                      value={formData.name}
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full"
                      required
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">Price (₹)</label>
                    <input
                      type="number"
                      name="price"
                      placeholder="Price (₹)"
                      value={formData.price}
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full"
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">Discount (%)</label>
                    <input
                      type="number"
                      name="discount_percent"
                      placeholder="Discount (%)"
                      value={formData.discount_percent}
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full"
                    />
                  </div>

                  {/* Billing Cycle (locked to CALL) */}
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">Billing Cycle</label>
                    <select
                      name="billing_cycle"
                      value="CALL"
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full bg-gray-100"
                      disabled
                    >
                      {billingCycles.map((bc) => (
                        <option key={bc} value={bc}>{bc}</option>
                      ))}
                    </select>
                  </div>

                  {/* CALL Limit */}
                  <div>
                    <label className="block mb-2 font-medium text-gray-700">CALL Limit</label>
                    <input
                      type="number"
                      name="CALL"
                      placeholder="CALL Limit"
                      value={formData.CALL}
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full"
                      required
                    />
                  </div>

                  {/* Service Type */}
                  <div className="relative md:col-span-2">
                    <label className="block mb-2 font-medium text-gray-700">
                      Service Type <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      className="w-full text-left bg-white border p-4 rounded-xl focus:outline-none flex justify-between items-center"
                      onClick={() => setShowTypeDropdown((v) => !v)}
                    >
                      <span>
                        {formData.service_type.length === 0
                          ? "Select Service Type(s)"
                          : (formData.service_type.length === serviceTypeOptions.length
                            ? "All"
                            : formData.service_type.join(", "))}
                      </span>
                      <svg
                        className={`w-4 h-4 ml-2 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showTypeDropdown && (
                      <div className="absolute z-20 bg-white border rounded-xl mt-1 w-full max-h-64 overflow-y-auto shadow-lg">
                        <label className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer border-b">
                          <input
                            ref={allCheckboxRef}
                            type="checkbox"
                            checked={formData.service_type.length === serviceTypeOptions.length}
                            onChange={() => {
                              if (formData.service_type.length === serviceTypeOptions.length) {
                                setFormData(prev => ({ ...prev, service_type: [] }));
                              } else {
                                setFormData(prev => ({ ...prev, service_type: [...serviceTypeOptions] }));
                              }
                            }}
                            className="form-checkbox mr-2 accent-indigo-600"
                          />
                          <span className="font-semibold">All</span>
                        </label>

                        {serviceTypeOptions.map((type) => (
                          <label key={type} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.service_type.includes(type)}
                              onChange={() => {
                                setFormData((prev) => {
                                  const selected = prev.service_type.includes(type)
                                    ? prev.service_type.filter((t) => t !== type)
                                    : [...prev.service_type, type];
                                  return { ...prev, service_type: selected };
                                });
                              }}
                              className="form-checkbox mr-2 accent-indigo-600"
                            />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium text-gray-700">Description</label>
                    <textarea
                      name="description"
                      placeholder="Description"
                      value={formData.description}
                      onChange={handleChange}
                      className="p-4 border rounded-xl w-full"
                      rows="3"
                      required
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : editId ? 'Update Service' : 'Create Service'}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
