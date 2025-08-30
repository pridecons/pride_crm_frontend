"use client";
import * as XLSX from 'xlsx';
import React, { useEffect, useState } from 'react';
import { axiosInstance, BASE_URL } from '@/api/Axios';
import { Calendar, BarChart3, PieChart, Target, TrendingUp, Users, ArrowDownToLine } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';
import ExportXlsxModal from '@/components/Rational/ExportXlsxModal';
import { ChevronDown, ChevronUp, FileDown, FileSpreadsheet } from "lucide-react";
import RationalModal from '@/components/Rational/RationalModal';
import AnalyticsDashboard from '@/components/Rational/AnalyticsDashboard';
import RationalTable from '@/components/Rational/RationalTable';


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
    message:"",
    templateId: ""
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
      message: item.message || '',
      templateId: item.templateId || '',
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
      message: "",
      templateId: ""
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
    message,
    templateId
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
        message: message,
        templateId: templateId,
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
      // if (!graph) {
      //   setImageError('Please select an image to upload');
      //   return;
      // }

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
      fd.append('message',     message || '');
      fd.append('templateId',  templateId || '');

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
            {/* {showPdfModal && <ExportPdfModal onClose={() => setShowPdfModal(false)} open={showPdfModal} />} */}
            {showPdfModal && <ExportXlsxModal onClose={() => setShowPdfModal(false)} open={showPdfModal} />}
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

