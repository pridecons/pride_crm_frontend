"use client";
import * as XLSX from 'xlsx';
import React, { useEffect, useState } from 'react';
import { axiosInstance, BASE_URL } from '@/api/Axios';
import { Calendar, BarChart3, PieChart, Target, TrendingUp, Users, ArrowDownToLine } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import { ChevronDown, ChevronUp, FileDown, FileSpreadsheet } from "lucide-react";

const API_URL = '/recommendations/';

export default function RationalPage() {
  const { hasPermission } = usePermissions();
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rationalList, setRationalList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showXlsxModal, setShowXlsxModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalImage, setModalImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(false);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    stock_name: '',
    entry_price: '',
    stop_loss: '',
    targets: '',
    targets2: '',
    targets3: '',
    rational: '',
    recommendation_type: [],
    graph: null,
  });
  const [selectedDate, setSelectedDate] = useState('');

  const [dateFrom, setDateFrom] = useState(''); // e.g. "2025-08-14"
  const [dateTo, setDateTo] = useState('');

  const handlePdfClick = () => {
    setIsOpen(false);
    setShowPdfModal(true);
  };

  const [excelFrom, setExcelFrom] = useState('');
  const [excelTo, setExcelTo] = useState('');

  const handleXlsxClick = () => {
    setIsOpen(false);
    setShowXlsxModal(true);
  };


  // Close dropdown when clicking outside
  const handleClickOutside = () => {
    setIsOpen(false);
  };
  useEffect(() => {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      setDateTo(dateFrom);
    }
  }, [dateFrom, dateTo]);


const fetchRationals = async (params = {}) => {
  try {
    setLoading(true);
    const res = await axiosInstance.get(API_URL, {
      params: { limit: 100, offset: 0, _ts: Date.now(), ...params }, // <- cache buster
      headers: { 'Cache-Control': 'no-cache' },
    });
    setRationalList(res.data);
  } catch (err) {
    console.error('Failed to load rationals:', err);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchRationals();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStatusDropdown !== null) {
        setOpenStatusDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openStatusDropdown]);

  const handleApplyDates = async () => {
    // guard: if both empty, just refetch all
    if (!dateFrom && !dateTo) {
      fetchRationals();
      return;
    }
    const params = {};
    if (dateFrom) params.date_from = dateFrom; // "YYYY-MM-DD"
    if (dateTo) params.date_to = dateTo;       // "YYYY-MM-DD"
    await fetchRationals(params);
  };

const openModal = (item = null) => {
  if (item) {
    setEditId(item.id);
    setIsEditMode(true);

    // ✅ backend already sends array of strings (fallback to single string)
    const recommendationArray = Array.isArray(item.recommendation_type)
      ? item.recommendation_type
      : item.recommendation_type
        ? [String(item.recommendation_type)]
        : [];

    setFormData({
      stock_name: item.stock_name || '',
      entry_price: item.entry_price ?? '',
      stop_loss: item.stop_loss ?? '',
      targets: item.targets ?? '',
      targets2: item.targets2 ?? '',
      targets3: item.targets3 ?? '',
      rational: item.rational || '',
      recommendation_type: recommendationArray,   // ← keep as array of strings
      graph: item.graph || null,
      status: item.status || 'OPEN',
    });
  } else {
    setEditId(null);
    setIsEditMode(false);
    setFormData({
      stock_name: '',
      entry_price: '',
      stop_loss: '',
      targets: '',
      targets2: '',
      targets3: '',
      rational: '',
      recommendation_type: [],  // ← start empty
      graph: null,
      status: 'OPEN',
    });
  }

  setImageError('');
  setIsModalOpen(true);
};

  const handleChange = (e) => {
  const { name, value, type } = e.target;

  if (name === 'recommendation_type') {
    const selected = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData((prev) => ({
      ...prev,
      [name]: selected,
    }));
  } else {
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number'
          ? value === '' ? '' : Number(value) // ✅ allow empty string
          : value,
    }));
  }
};

  const handleExport = async () => {
    try {
      const response = await axiosInstance.get('/recommendations');
      const data = response.data;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'recommendations');
      XLSX.writeFile(workbook, 'recommendations-export.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axiosInstance.put(
        `/recommendations/status/${id}?status_update=${newStatus}`
      );
      await fetchRationals();
      setOpenStatusDropdown(null);
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const openImageModal = (path) => {
    setModalImage(`${BASE_URL}${encodeURI(path)}`);
  };

  const closeModal = () => {
    setModalImage(null);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  setImageError('');

  const {
    stock_name,
    entry_price,
    stop_loss,
    targets,
    targets2,
    targets3,
    rational,
    recommendation_type,
    graph,
    status,
  } = formData;

  // require at least one type
  if (!Array.isArray(recommendation_type) || recommendation_type.length === 0) {
    alert('Please select at least one Recommendation Type.');
    return;
  }

  try {
    if (editId) {
      // 👉 EDIT: send JSON, not multipart
      const payload = {
        stock_name: String(stock_name ?? '').trim(),
        entry_price: entry_price === '' ? null : Number(entry_price),
        stop_loss:  stop_loss  === '' ? null : Number(stop_loss),
        targets:    targets    === '' ? null : Number(targets),
        targets2:   targets2   === '' ? 0    : Number(targets2),
        targets3:   targets3   === '' ? 0    : Number(targets3),
        rational: String(rational ?? '').trim(),
        status: status || 'OPEN',
        recommendation_type: recommendation_type, // array of strings
      };

      await axiosInstance.put(`${API_URL}${editId}/`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

    } else {
      // 👉 CREATE: multipart (backend expects Form/File)
      if (entry_price === '' || stop_loss === '' || targets === '') {
        alert('Entry Price, Stop Loss, and Target 1 are required.');
        return;
      }
      if (!graph) {
        setImageError('Please select an image to upload');
        return;
      }

      const fd = new FormData();
      const toNum = (v, def = '') => {
        if (v === '' || v === undefined || v === null) return def;
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : def;
      };

      fd.append('stock_name', (stock_name ?? '').trim());
      fd.append('entry_price', toNum(entry_price));
      fd.append('stop_loss',  toNum(stop_loss));
      fd.append('targets',    toNum(targets));
      fd.append('targets2',   toNum(targets2, '0'));
      fd.append('targets3',   toNum(targets3, '0'));
      fd.append('rational',   (rational ?? '').trim());
      fd.append('status',     status || 'OPEN');

      // repeat key for FastAPI List[str]
      recommendation_type.filter(Boolean).forEach(rt => fd.append('recommendation_type', rt));

      if (graph instanceof File) fd.append('graph', graph);

      await axiosInstance.post(API_URL, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [d => d],
      });
    }

    setIsModalOpen(false);
    await fetchRationals(); // refresh
  } catch (err) {
    console.error('Submit failed:', err?.response?.data || err);
    const msg = err?.response?.data?.detail
      ? JSON.stringify(err.response.data.detail)
      : 'Submit failed. Please check console for details.';
    alert(msg);
  }
};


  const getRecommendationBadge = (type) => {
    const colors = {
      Buy: 'bg-green-100 text-green-800 border-green-200',
      Sell: 'bg-red-100 text-red-800 border-red-200',
      Hold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Watch: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredData = rationalList.filter((item) =>
    (item.stock_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );


  const statusOptions = [
    { label: 'OPEN', value: 'OPEN' },
    { label: 'TARGET1', value: 'TARGET1_HIT' },
    { label: 'TARGET2', value: 'TARGET2_HIT' },
    { label: 'TARGET3', value: 'TARGET3_HIT' },
    { label: 'STOP_LOSS', value: 'STOP_LOSS_HIT' },
    { label: 'CLOSED', value: 'CLOSED' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-center sm:items-start lg:justify-between mb-6">
          {/* Search + Date */}
          <div className="flex sm:items-center gap-4 w-full">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by stock name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl shadow-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-row gap-3 mt-4 md:mt-0">
            <div className="relative inline-block text-left">
              {/* Download Button */}
              {hasPermission("rational_download") && <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                Download
                <ChevronDown
                  size={16}
                  className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>}

              {/* Dropdown */}
              {isOpen && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={handleClickOutside}
                  />

                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="divide-y divide-gray-100">
                      <button
                        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer text-left transition-colors"
                        onClick={handlePdfClick}
                      >
                        <FileDown size={16} className="text-red-500" />
                        Download PDF
                      </button>

                      <button
                        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer text-left transition-colors"
                        onClick={handleXlsxClick}
                      >
                        <FileSpreadsheet size={16} className="text-green-500" />
                        Download XLSX
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Render modals conditionally */}
            {showPdfModal && <ExportPdfModal onClose={() => setShowPdfModal(false)} open={showPdfModal} />}
            {showXlsxModal && <ExportXlsxModal onClose={() => setShowXlsxModal(false)} open={showXlsxModal} />}


            {hasPermission("rational_add_recommadation") && <div>
              <button
                onClick={() => openModal()}
                className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 flex justify-center items-center text-white rounded-md w-auto whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Recommendation
              </button>
            </div>}

          </div>

        </div>
        <div className="flex flex-col lg:flex-row items-center gap-4 sm:items-start mb-6 bg-white p-4 rounded-2xl shadow-md">
          {/* Date From */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Divider */}
          <div className="text-black text-3xl font-medium">
            -
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Clear Button */}
          <button
            type="button"
            onClick={() => { setDateFrom(''); setDateTo(''); fetchRationals(); }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors duration-200"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Clear
          </button>

          {/* Date toolbar section — add this button next to Clear */}
          <button
            type="button"
            onClick={handleApplyDates}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
            disabled={!dateFrom && !dateTo}
          >
            Apply
          </button>
        </div>


        <RationalTable
          rationalList={rationalList}
          filteredData={filteredData}
          openModal={openModal}
          openImageModal={openImageModal}
          openStatusDropdown={openStatusDropdown}
          setOpenStatusDropdown={setOpenStatusDropdown}
          handleStatusChange={handleStatusChange}
          statusOptions={statusOptions}
        />

        <AnalyticsDashboard />
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl overflow-hidden shadow-lg max-w-3xl w-full mx-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Graph Preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-red-500 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <img
                src={modalImage}
                alt="Graph"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <RationalModal
        isEditMode={isEditMode}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        formData={formData}
        setFormData={setFormData}
        editId={editId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        imageError={imageError}
        setImageError={setImageError}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
      />
    </div>
  );
}

function RationalModal({
  isEditMode,
  isModalOpen,
  setIsModalOpen,
  formData,
  setFormData,
  editId,
  handleChange,
  handleSubmit,
  imageError,
  setImageError,
  openDropdown,
  setOpenDropdown,
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-auto relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-2 right-3 text-gray-500 text-2xl" onClick={() => setIsModalOpen(false)}>
          &times;
        </button>
        <h2 className="text-xl font-semibold mb-4">{editId ? 'Edit Rational' : 'Create Rational'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Stock Name</label>
            <input type="text" name="stock_name" value={formData.stock_name} onChange={handleChange} className="p-3 border rounded" required disabled={isEditMode} />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Entry Price</label>
            <input type="number" name="entry_price" value={formData.entry_price ?? ""} onChange={handleChange} className="p-3 border rounded" required={!isEditMode}  disabled={isEditMode}/>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Stop Loss</label>
            <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} className="p-3 border rounded" required={!isEditMode} disabled={isEditMode} />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">
              Targets 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="targets"
              value={formData.targets ?? ''}
              onChange={handleChange}
              required
              className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isEditMode}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 2</label>
            <input
              type="number"
              name="targets2"
              value={formData.targets2 ?? ''}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 3</label>
            <input
              type="number"
              name="targets3"
              value={formData.targets3 ?? ''}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>
          <div className="flex flex-col md:col-span-2 relative">
            <label className="mb-1 text-gray-700 text-sm font-medium">Recommendation Type</label>

            <div
              onClick={() => {
                if (!isEditMode) setOpenDropdown(prev => !prev);
              }}
              className={`p-3 border border-black rounded-lg bg-white cursor-pointer transition-all duration-200 flex items-center justify-between ${isEditMode ? 'bg-gray-50 cursor-not-allowed text-gray-500 pointer-events-none' : ''
                }`}
            >
              <div className="flex flex-wrap gap-1">
                {formData.recommendation_type?.length > 0 ? (
                  formData.recommendation_type.map(type => (
                    <span key={type} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">Select Recommendation Type</span>
                )}
              </div>
              {!isEditMode && (
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ml-2 flex-shrink-0 ${openDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {!isEditMode && openDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 mb-1">
                    {formData.recommendation_type?.length || 0} selected
                  </div>
                  {formData.recommendation_type?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, recommendation_type: [] }));
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {[
                  "Equity Cash",
                  "Stock Future",
                  "Index Future",
                  "Stock Option",
                  "MCX Bullion",
                  "MCX Base Metal",
                  "MCX Energy"
                ].map(option => (
                  <label
                    key={option}
                    className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
                      checked={formData.recommendation_type?.includes(option)}
                      onChange={() => {
                        const current = formData.recommendation_type || [];
                        const updated = current.includes(option)
                          ? current.filter(item => item !== option)
                          : [...current, option];
                        setFormData(prev => ({ ...prev, recommendation_type: updated }));
                      }}
                    />
                    <span className="text-gray-800 font-medium">{option}</span>
                    {formData.recommendation_type?.includes(option) && (
                      <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
                <div className="p-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(false)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700 transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Done ({formData.recommendation_type?.length || 0} selected)
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className='col-span-2'>
            <SmsTemplateSelector />
          </div>

          {!isEditMode && (
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-gray-700 text-sm">Status</label>
              <select
                name="status"
                value={formData.status || 'OPEN'}
                onChange={handleChange}
                className="p-3 border rounded"
                required
              >
                <option value="">Select Status</option>
                <option value="OPEN">OPEN</option>
                <option value="TARGET1_HIT">TARGET1</option>
                <option value="TARGET2_HIT">TARGET2</option>
                <option value="TARGET3_HIT">TARGET3</option>
                <option value="STOP_LOSS_HIT">STOP_LOSS</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          )}

          <div className="flex flex-col md:col-span-2 relative">
            <label className="mb-1 text-gray-700 text-sm">Rational</label>

            <textarea
              name="rational"
              value={formData.rational}
              onChange={handleChange}
              className="p-3 border rounded"
              rows={3}
            />

            {!isEditMode && (
              <div className="mt-2 flex justify-end">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      graph: e.target.files[0],
                    }));
                    if (e.target.files[0]) setImageError('');
                  }}
                  className="hidden"
                  id="rationalImageUpload"
                />
                <label
                  htmlFor="rationalImageUpload"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm transition"
                  title="Upload image">
                  Upload Image {!editId && <span className="text-red-300">*</span>}
                </label>
              </div>
            )}

            {imageError && (
              <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {imageError}
              </div>
            )}

            {formData.graph && (
              <div className="mt-2 relative inline-block w-fit">
                <img
                  src={
                    formData.graph instanceof File
                      ? URL.createObjectURL(formData.graph)
                      : `${BASE_URL}${formData.graph}`
                  }
                  alt="Preview"
                  className="max-h-20 rounded border"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      graph: null,
                    }))
                  }
                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
                  title="Remove Image"
                  disabled={isEditMode}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors duration-150">
              {editId ? 'Update Rational' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState(null);

  const fetchAnalytics = async () => {
    try {
      const res = await axiosInstance.get('/recommendations/analytics/summary');
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Example: Refresh after update
  const handleUpdate = async () => {
    try {
      await axiosInstance.post('/recommendations/update', { /* your update payload */ });
      fetchAnalytics(); // Refresh after update
    } catch (err) {
      console.error('Failed to update recommendation:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'TARGET1_HIT': return 'bg-green-100 text-green-800';
      case 'OPEN': return 'bg-blue-100 text-blue-800';
      case 'TARGET2_HIT': return 'bg-emerald-100 text-emerald-800';
      case 'TARGET3_HIT': return 'bg-teal-100 text-teal-800';
      case 'STOP_LOSS_HIT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    const colors = [
      'bg-purple-100 text-purple-800',
      'bg-indigo-100 text-indigo-800',
      'bg-pink-100 text-pink-800',
      'bg-orange-100 text-orange-800',
      'bg-cyan-100 text-cyan-800',
    ];
    return colors[Math.abs(type.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
  };

  if (!analyticsData) {
    return <div className="p-6 text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen pt-6">
      <div className="max-w-7xl mx-auto">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Recommendations"
            value={analyticsData.total_recommendations}
            icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
            bgColor="bg-blue-100"
          />
          <MetricCard
            title="Active Users"
            value={analyticsData.active_users}
            icon={<Users className="w-6 h-6 text-green-600" />}
            bgColor="bg-green-100"
          />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{analyticsData.success_rate}%</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-full">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analyticsData.success_rate}%` }}
                ></div>
              </div>
            </div>
          </div>
          <MetricCard
            title="Performance"
            value="Excellent"
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            bgColor="bg-purple-100"
            textColor="text-purple-600"
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DistributionBlock
            icon={<PieChart className="w-5 h-5 text-gray-600 mr-2" />}
            title="Status Distribution"
            entries={analyticsData.status_distribution}
            total={analyticsData.total_recommendations}
            colorGetter={getStatusColor}
            barColor="bg-blue-500"
          />
          <DistributionBlock
            icon={<BarChart3 className="w-5 h-5 text-gray-600 mr-2" />}
            title="Recommendation Types"
            entries={analyticsData.recommendation_types}
            total={analyticsData.total_recommendations}
            colorGetter={getTypeColor}
            barColor="bg-purple-500"
          />
        </div>

        {/* Insights */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InsightCard
              title="Most Active Type"
              color="blue"
              text={`BUY recommendations lead with ${analyticsData.recommendation_types.BUY} out of ${analyticsData.total_recommendations} total`}
            />
            <InsightCard
              title="Success Performance"
              color="green"
              text={`${analyticsData.status_distribution.TARGET1_HIT} recommendations hit their first target`}
            />
            <InsightCard
              title="Open Positions"
              color="orange"
              text={`${analyticsData.status_distribution.OPEN} recommendations are still active`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}



// Helper components
const MetricCard = ({ title, value, icon, bgColor, textColor = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${textColor} mt-2`}>{value}</p>
      </div>
      <div className={`${bgColor} p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  </div>
);

const DistributionBlock = ({ icon, title, entries, total, colorGetter, barColor }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-center mb-6">
      {icon}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="space-y-4">
      {Object.entries(entries).map(([key, count]) => {
        const percent = ((count / total) * 100).toFixed(1);
        return (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorGetter(key)}`}>
                {key.replace(/_/g, ' ')}
              </span>
              <span className="ml-3 text-sm text-gray-600">{count} recommendations</span>
            </div>
            <div className="flex items-center">
              <div className="w-20 bg-gray-200 rounded-full h-2 mr-3">
                <div className={`${barColor} h-2 rounded-full transition-all duration-300`} style={{ width: `${percent}%` }} />
              </div>
              <span className="text-sm font-medium text-gray-900 w-12 text-right">{percent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const InsightCard = ({ title, text, color }) => (
  <div className={`bg-${color}-50 rounded-lg p-4`}>
    <h3 className={`font-medium text-${color}-900 mb-2`}>{title}</h3>
    <p className={`text-${color}-700 text-sm`}>{text}</p>
  </div>
);

function RationalTable({
  rationalList,
  filteredData,
  openModal,
  openImageModal,
  openStatusDropdown,
  setOpenStatusDropdown,
  handleStatusChange,
  statusOptions,
}) {
  const [expanded, setExpanded] = useState(new Set());
  const toggleRow = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  const { hasPermission } = usePermissions();
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full whitespace-nowrap">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th className="text-left py-4 px-6 sticky left-0 bg-white z-10 shadow-right">Stock Name</th>
              <th className="text-left py-4 px-6">Entry Price</th>
              <th className="text-left py-4 px-6">Stop Loss</th>
              <th className="text-left py-4 px-6">Target</th>
              <th className="text-left py-4 px-6">Date</th>
              <th className="text-center py-4 px-6">Status</th>
              <th className="text-center py-4 px-6">Action</th>

            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => {
              const isOpen = expanded.has(item.id);
              return (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleRow(item.id)}
                    aria-expanded={isOpen}
                  >
                    <td className="py-4 px-6 font-semibold sticky left-0 bg-white z-10 shadow-right uppercase">
                      <div className="flex items-center gap-2">
                        {item.stock_name}
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </td>
                    <td className="py-4 px-6">{item.entry_price}</td>
                    <td className="py-4 px-6">{item.stop_loss}</td>
                    <td className="py-4 px-6">{item.targets || "-"}</td>
                    <td className="py-4 px-6">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                        : "-"}
                    </td>
                    <td
                      className="py-4 px-6 text-center relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {hasPermission("rational_status") && <button
                        onClick={() =>
                          setOpenStatusDropdown(
                            openStatusDropdown === item.id ? null : item.id
                          )
                        }
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {
                          statusOptions.find((opt) => opt.value === item.status)
                            ?.label || item.status || "N/A"
                        }
                      </button>}

                      {openStatusDropdown === item.id && item.status === "OPEN" && (
                        <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-lg w-36 left-1/2 -translate-x-1/2">
                          {statusOptions.map(({ label, value }) => (
                            <div
                              key={value}
                              onClick={() => {
                                handleStatusChange(item.id, value);
                                setOpenStatusDropdown(null);
                              }}
                              className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${item.status === value
                                ? "bg-blue-50 text-blue-600 font-medium"
                                : "text-gray-700 hover:text-blue-600"
                                }`}
                            >
                              {label}
                              {item.status === value && <span className="ml-2">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6"> {!item.rational && hasPermission("rational_edit") && (
                      <button
                        onClick={() => openModal(item)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                    )}</td>
                  </tr>

                  {/* Accordion Row */}
                  {isOpen && (
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Target 2</p>
                            <p className="font-medium">{item.targets2 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Target 3</p>
                            <p className="font-medium">{item.targets3 || "-"}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Recommendation</p>
                            <p className="font-medium">
                              {(() => {
                                const raw = item.recommendation_type;
                                if (!raw || raw.length === 0 || raw[0] === "[]")
                                  return "-";
                                try {
                                  if (
                                    Array.isArray(raw) &&
                                    raw.every(
                                      (r) =>
                                        typeof r === "string" &&
                                        !r.includes("[") &&
                                        !r.includes("]")
                                    )
                                  ) {
                                    return raw.join(", ");
                                  }
                                  const joined = raw.join("");
                                  const fixed = joined.replace(/""/g, '","');
                                  const parsed = JSON.parse(fixed);
                                  if (Array.isArray(parsed)) {
                                    return parsed.join(", ");
                                  }
                                  throw new Error("Invalid format");
                                } catch {
                                  return "Invalid data";
                                }
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Rational</p>
                            <p className="font-medium">{item.rational || "-"}</p>
                          </div>
                          {hasPermission("rational_graf_model_view") && (
                            <div className="space-y-1">
                              <p className="text-slate-500">Graph</p>
                              {item.graph ? (
                                <button
                                  onClick={() => openImageModal(item.graph)}
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-gray-400 text-sm">No Graph</span>
                              )}
                            </div>
                          )}

                          {hasPermission("rational_pdf_model_view") && (
                            <div className="space-y-1">
                              <p className="text-slate-500">PDF</p>
                              {item.pdf ? (
                                <DownloadPDF
                                  id={item.id}
                                  className="inline-flex items-center text-blue-600 hover:underline text-sm"
                                />
                              ) : (
                                <span className="text-gray-400 text-sm">No PDF</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {rationalList.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              No rationals found
            </h3>
          </div>
        )}{rationalList.length === 0 && hasPermission("rational_add_recommadation") && (
          <div className="text-center py-12">
            <button
              onClick={() => openModal()}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              Add First Rational
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DownloadPDF({ id, userId }) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { hasPermission } = usePermissions();
  const fetchPdf = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/recommendations/${id}/pdf`, {
        responseType: 'blob',
        params: { userId },
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      setPdfUrl(url);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setPdfUrl(null);
  };

  return (
    <div className="p-4">
      <button
        onClick={fetchPdf}
        className="text-blue-600 hover:underline text-sm"
      >
        {loading ? 'Loading...' : 'View'}
      </button>

      {isModalOpen && pdfUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative bg-white w-[90%] max-w-4xl rounded-lg shadow-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">PDF Preview</h2>
              <button
                onClick={closeModal}
                className="text-gray-600 hover:text-black text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <iframe
                src={pdfUrl}
                width="100%"
                height="400px"
                className="border rounded"
              />
            </div>
            {hasPermission("rational_pdf_model_download") && <div className="p-4 border-t flex justify-end">
              <a
                href={pdfUrl}
                download="recommendation.pdf"
                className="mr-4 text-blue-500 underline"
              >
                Download PDF
              </a>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportPdfModal({ open, onClose }) {
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [researchers, setResearchers] = useState([]);

  const [filters, setFilters] = useState({
    user_id: "",
    stock_name: "",
    status: "",
    recommendation_type: "",
    date_from: "",
    date_to: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Fix: Update internal state when external prop changes
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    console.log("Dropdown is now:", isOpen ? "open" : "closed");
  }, [isOpen]);

  // 🔽 Fetch researcher list when modal opens
  useEffect(() => {
    const fetchResearchers = async () => {
      try {
        const res = await fetch(
          "https://crm.24x7techelp.com/api/v1/users/?skip=0&limit=100&active_only=false&role=RESEARCHER",
          {
            headers: {
              accept: "application/json",
            },
          }
        );
        const data = await res.json();

        if (Array.isArray(data.data)) {
          setResearchers(data.data);
        } else {
          setResearchers([]);
          console.warn("Unexpected researcher response shape:", data);
        }
      } catch (error) {
        console.error("Failed to load researchers:", error);
        setResearchers([]);
      }
    };

    if (isOpen) {
      fetchResearchers();
    }
  }, [isOpen]);

  const handleExport = async () => {
    setLoading(true);
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    try {
      const res = await fetch(
        `https://crm.24x7techelp.com/api/v1/recommendations/pdfs/export?${params}`,
        {
          method: "GET",
          headers: {
            Accept: "*/*"
          }
        }
      );

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recommendations.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setLoading(false);
      setIsOpen(false);
      if (onClose) onClose(); // Call parent's onClose
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose(); // Call parent's onClose
  };

  return (
    <>
      {hasPermission("rational_export_pdf") && <button
        onClick={() => setIsOpen(true)}
        className="px-2 py-2 bg-blue-600 text-white rounded-md w-auto whitespace-nowrap"
      >
        <div className="flex items-center gap-1">
          <ArrowDownToLine className="h-4" />
          <span>PDF</span>
        </div>
      </button>}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
            <button
              onClick={handleClose}
              className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
            >
              &times;
            </button>

            <h2 className="text-lg font-semibold mb-4">Export Recommendations PDF</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* 🔽 Researcher Dropdown */}
              <select
                name="user_id"
                value={filters.user_id}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">All Researchers</option>
                {researchers.map((user) => (
                  <option key={user.employee_code} value={user.employee_code}>
                    {user.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="stock_name"
                value={filters.stock_name}
                onChange={handleChange}
                placeholder="Stock Name"
                className="border rounded px-3 py-2 text-sm"
              />

              <select
                name="status"
                value={filters.status}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="TARGET1_HIT">TARGET1_HIT</option>
                <option value="TARGET2_HIT">TARGET2_HIT</option>
                <option value="TARGET3_HIT">TARGET3_HIT</option>
                <option value="STOP_LOSS_HIT">STOP_LOSS_HIT</option>
                <option value="CLOSED">CLOSED</option>
              </select>

              <select
                name="recommendation_type"
                value={filters.recommendation_type}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">All Types</option>
                <option value="Equity Cash">Equity Cash</option>
                <option value="Stock Future">Stock Future</option>
                <option value="Index Future">Index Future</option>
                <option value="Stock Option">Stock Option</option>
                <option value="MCX Bullion">MCX Bullion</option>
                <option value="MCX Base Metal">MCX Base Metal</option>
                <option value="MCX Energy">MCX Energy</option>
              </select>

              <input
                type="date"
                name="date_from"
                value={filters.date_from}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              />

              <input
                type="date"
                name="date_to"
                value={filters.date_to}
                onChange={handleChange}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-300 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-md"
                disabled={loading}
              >
                {loading ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function ExportXlsxModal({ onClose }) {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [researchers, setResearchers] = useState([]);
  const [filters, setFilters] = useState({
    user_id: '',
    stock_name: '',
    status: '',
    recommendation_type: '',
    date_from: '',
    date_to: '',
    sort_order: 'desc', // Set default value
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔽 Fetch researcher list on component mount
  useEffect(() => {
    const fetchResearchers = async () => {
      try {
        const res = await fetch(
          "https://crm.24x7techelp.com/api/v1/users/?skip=0&limit=100&active_only=false&role=RESEARCHER",
          {
            headers: {
              accept: "application/json",
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          setResearchers(data.data);
        } else {
          setResearchers([]);
        }
      } catch (error) {
        console.error("Failed to load researchers:", error);
        setResearchers([]);
      }
    };

    fetchResearchers();
  }, []);

  const handleExport = async () => {
    if (!filters.sort_order) {
      alert("Please select a sort order.");
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });

    try {
      const res = await fetch(`https://crm.24x7techelp.com/api/v1/recommendations/xlsx/export?${params}`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
        },
      });

      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recommendations.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setLoading(false);
      if (onClose) onClose(); // Close modal after export
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
        <button
          onClick={handleClose}
          className="absolute top-2 right-3 text-gray-500 hover:text-black text-xl"
        >
          &times;
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Export Recommendations (XLSX)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* ✅ Researcher Dropdown */}
          <select
            name="user_id"
            value={filters.user_id}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Researchers</option>
            {researchers.map((user) => (
              <option key={user.employee_code} value={user.employee_code}>
                {user.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            name="stock_name"
            value={filters.stock_name}
            onChange={handleChange}
            placeholder="Stock Name"
            className="border rounded px-3 py-2 text-sm"
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="TARGET1_HIT">TARGET1_HIT</option>
            <option value="TARGET2_HIT">TARGET2_HIT</option>
            <option value="TARGET3_HIT">TARGET3_HIT</option>
            <option value="STOP_LOSS_HIT">STOP_LOSS_HIT</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            name="recommendation_type"
            value={filters.recommendation_type}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="Equity Cash">Equity Cash</option>
            <option value="Stock Future">Stock Future</option>
            <option value="Index Future">Index Future</option>
            <option value="Stock Option">Stock Option</option>
            <option value="MCX Bullion">MCX Bullion</option>
            <option value="MCX Base Metal">MCX Base Metal</option>
            <option value="MCX Energy">MCX Energy</option>
          </select>

          <input
            type="date"
            name="date_from"
            value={filters.date_from}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          />

          <input
            type="date"
            name="date_to"
            value={filters.date_to}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
          />

          <select
            name="sort_order"
            value={filters.sort_order}
            onChange={handleChange}
            className="border rounded px-3 py-2 text-sm"
            required
          >
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>

        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-300 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-md"
            disabled={loading}
          >
            {loading ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}


function SmsTemplateSelector() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedTemplateBody, setSelectedTemplateBody] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch("https://crm.24x7techelp.com/api/v1/sms-templates/");
        const data = await res.json();
        setTemplates(data);
      } catch (err) {
        console.error("Failed to fetch templates", err);
      }
    };

    fetchTemplates();
  }, []);

  const handleSelect = (e) => {
    const id = parseInt(e.target.value);
    setSelectedTemplateId(id);

    const template = templates.find((t) => t.id === id);
    setSelectedTemplateBody(template?.template || "");
  };

  return (
    <div className="flex flex-col md:col-span-2 relative">
      <label className="mb-1 text-gray-700 text-sm font-medium">SMS Template</label>
      <select
        onChange={handleSelect}
        value={selectedTemplateId ?? ""}
        className="p-3 border  rounded-lg bg-white cursor-pointer border-black transition-all duration-200"
      >
        <option value="" disabled>Select a template</option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title}
          </option>
        ))}
      </select>

      {selectedTemplateBody && (
        <>
          <label className="mt-4 mb-1 text-gray-700 text-sm font-medium">SMS Body</label>
          <textarea
            className="p-3 border border-gray-300 rounded-lg bg-gray-50 w-full h-32 text-sm text-gray-800"
            value={selectedTemplateBody}
            onChange={(e) => setSelectedTemplateBody(e.target.value)}

          />
        </>
      )}
    </div>
  );
}
