'use client';

import axios from 'axios';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { axiosInstance, BASE_URL } from '@/api/Axios';
import { Calendar, BarChart3, PieChart, Target, TrendingUp, Users, ArrowDownToLine } from 'lucide-react';
import { usePermissions } from '@/context/PermissionsContext';


const API_URL = '/recommendations/';



export default function RationalPage() {
  const { hasPermission } = usePermissions();
  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rationalList, setRationalList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalImage, setModalImage] = useState(null);
  const [imageError, setImageError] = useState('');
  const [formData, setFormData] = useState({
    stock_name: '',
    entry_price: '',
    stop_loss: '',
    targets: '',
    targets2: '',
    targets3: '',
    rational: '',
    recommendation_type: '',
    graph: null,
  });
  const [selectedDate, setSelectedDate] = useState('');

  const fetchRationals = async () => {
    try {
      const res = await axiosInstance.get(API_URL);
      setRationalList(res.data);
    } catch (err) {
      console.error('Failed to load rationals:', err);
    }
  };

  useEffect(() => {
    fetchRationals();
  }, []);

  // Fixed: Moved useEffect to proper location
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openStatusDropdown !== null) {
        setOpenStatusDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openStatusDropdown]);

  const openModal = async (id = null) => {
    setEditId(id);
    setImageError('');
    setIsEditMode(!!id) // Clear any previous image error
    if (id) {
      try {
        const res = await axiosInstance.get(`${API_URL}${id}/`);
        setFormData(res.data);
      } catch (err) {
        console.error('Failed to fetch rational:', err);
      }
    } else {
      setFormData({
        stock_name: '',
        entry_price: '',
        stop_loss: '',
        targets: '',
        targets2: '',
        targets3: '',
        rational: '',
        recommendation_type: '',
        graph: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };


  const handleExport = async () => {

    try {
      const response = await axiosInstance.get('/recommendations');
      const data = response.data;


      // Convert JSON to Excel worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "recommendations");

      // Trigger file download
      XLSX.writeFile(workbook, 'recommendations-export.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await axiosInstance.put(
        `/recommendations/status/${id}?status_update=${newStatus}`
      );
      console.log('Updated:', response.data);

      await fetchRationals();
      setOpenStatusDropdown(null);
    } catch (err) {
      console.error('Status update error:', err);
    }
  };


  // Add this useEffect to handle outside clicks
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenStatusDropdown(null);
    };

    if (openStatusDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openStatusDropdown]);


  const openImageModal = (path) => {
    setModalImage(`${BASE_URL}${encodeURI(path)}`);
  };

  const closeModal = () => {
    setModalImage(null);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setImageError('');
    setIsEditMode(false)

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

    // Validate required fields
    if (!editId && !graph) {
      setImageError('Please select an image to upload');
      return;
    }

    try {
      let dataToSend;
      let headers = {};

      // Always normalize numbers
      const cleanedData = {
        stock_name: stock_name?.trim() || '',
        entry_price: Number(entry_price),
        stop_loss: Number(stop_loss),
        targets: Number(targets),
        targets2: Number(targets2),
        targets3: Number(targets3),
        rational: rational?.trim() || '',
        recommendation_type: recommendation_type?.trim() || '',
        status: status || 'OPEN',
      };

      const isGraphFile = graph instanceof File;

      if (isGraphFile || (!editId && graph)) {
        // Use FormData when there's an image
        dataToSend = new FormData();
        Object.entries(cleanedData).forEach(([key, value]) => {
          dataToSend.append(key, value);
        });
        if (isGraphFile) dataToSend.append('graph', graph);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        // Use JSON otherwise
        dataToSend = { ...cleanedData, graph }; // include graph path string if already uploaded
        headers['Content-Type'] = 'application/json';
      }

      // DEBUG: Log the payload
      if (dataToSend instanceof FormData) {
        for (let [key, value] of dataToSend.entries()) {
          console.log(`${key}:`, value);
        }
      } else {
        console.log('Payload:', dataToSend);
      }

      // Send to API
      if (editId) {
        await axiosInstance.put(`${API_URL}${editId}/`, dataToSend, { headers });
      } else {
        await axiosInstance.post(API_URL, dataToSend, { headers });
      }

      setIsModalOpen(false);
      fetchRationals();
    } catch (err) {
      if (err.response?.status === 422) {
        console.error('Validation error:', err.response.data);
      } else {
        console.error('Submit failed:', err);
      }
    }
  };


  const getRecommendationBadge = (type) => {
    const colors = {
      'Buy': 'bg-green-100 text-green-800 border-green-200',
      'Sell': 'bg-red-100 text-red-800 border-red-200',
      'Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Watch': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    : '';

  const filteredData = rationalList.filter((item) => {
    const stockMatch = item.stock_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = selectedDate
      ? new Date(item.created_at).toLocaleDateString() ===
      new Date(selectedDate).toLocaleDateString()
      : true;
    return stockMatch && dateMatch;
  });
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
        <div className="flex flex-col lg:flex-row sm:items-start lg:justify-between mb-6">
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

            {/* Date Picker */}
            <div className="w-full sm:w-64">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedDate && (
                <span className="text-sm text-gray-600 mt-1 block">
                  Selected:{" "}
                  {new Date(selectedDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-row gap-3 sm:pt-4">
            <div >
              <ExportPdfModal />
            </div>

            <div >
              <ExportXlsxModal />
            </div>

            {hasPermission("rational_add_filter") && <div >
              <button
                onClick={() => openModal()}
                className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 flex justify-center items-center text-white rounded-md w-auto whitespace-nowrap"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Rational
              </button>
            </div>}
          </div>

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
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl mx-auto relative max-h-[90vh] overflow-y-auto">
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
            <input type="number" name="entry_price" value={formData.entry_price} onChange={handleChange} className="p-3 border rounded" disabled={isEditMode} />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Stop Loss</label>
            <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} className="p-3 border rounded" disabled={isEditMode} />
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
          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 text-gray-700 text-sm">Recommendation Type</label>
            <select name="recommendation_type" value={formData.recommendation_type} onChange={handleChange} className="p-3 border rounded" required disabled={isEditMode}>
              <option value="">Select Recommendation Type</option>
              <option value="Equity Cash">Equity Cash</option>
              <option value="Stock Future">Stock Future</option>
              <option value="Index Future">Index Future</option>
              <option value="Stock Option">Stock Option</option>
              <option value="MCX Bullion">MCX Bullion</option>
              <option value="MCX Base Metal">MCX Base Metal</option>
              <option value="MCX Energy">MCX Energy</option>
            </select>
          </div>

          {isEditMode && (
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
              {editId ? 'Update Rational' : 'Create Rational'}
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
  statusOptions
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full whitespace-nowrap">
          <thead>
            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <th className="text-left py-4 px-6 sticky left-0 bg-white z-10 shadow-right">Stock Name</th>
              <th className="text-left py-4 px-6">Entry Price</th>
              <th className="text-left py-4 px-6">Stop Loss</th>
              <th className="text-left py-4 px-6">Target </th>
              <th className="text-left py-4 px-6">Target 2</th>
              <th className="text-left py-4 px-6">Target 3</th>
              <th className="text-left py-4 px-6">Recommendation</th>
              <th className="text-left py-4 px-6">Date</th>
              <th className="text-left py-4 px-6">Rational</th>
              <th className="text-center py-4 px-6">Actions</th>
              <th className="text-center py-4 px-6">Status</th>
              <th className="text-center py-4 px-6">Graph</th>
              <th className="text-center py-4 px-6">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td className="py-4 px-6 font-semibold sticky left-0 bg-white z-10 shadow-right uppercase">{item.stock_name}</td>
                <td className="py-4 px-6">{item.entry_price}</td>
                <td className="py-4 px-6">{item.stop_loss}</td>
                <td className="py-4 px-6">{item.targets || '-'}</td>
                <td className="py-4 px-6">{item.targets2 || '-'}</td>
                <td className="py-4 px-6">{item.targets3 || '-'}</td>
                <td className="py-4 px-6">{item.recommendation_type}</td>
                <td className="py-4 px-6">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                    : '-'}
                </td>
                <td className="py-4 px-6">{item.rational || '-'}</td>
                <td className="py-4 px-6 text-center">
                  {!item.rational && (
                    <button
                      onClick={() => openModal(item.id)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                  )}
                </td>

                <td className="py-4 px-6 text-center relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenStatusDropdown(openStatusDropdown === item.id ? null : item.id);
                    }}
                    className="text-sm text-blue-600 hover:underline focus:outline-none"
                  >
                    {statusOptions.find((opt) => opt.value === item.status)?.label || item.status || 'N/A'}
                  </button>

                  {openStatusDropdown === item.id && item.status === 'OPEN' && (
                    <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-lg w-36 left-1/2 -translate-x-1/2">
                      {statusOptions.map(({ label, value }) => (
                        <div
                          key={value}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(item.id, value);
                            setOpenStatusDropdown(null);
                          }}
                          className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${item.status === value
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-700 hover:text-blue-600'
                            }`}
                        >
                          {label}
                          {item.status === value && <span className="ml-2">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                <td className="py-4 px-6 text-center">
                  {item.graph ? (
                    <button
                      onClick={() => openImageModal(item.graph)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">No Graph</span>
                  )}
                </td>

                <td className="py-4 px-6 text-center">
                  {item.pdf ? <DownloadPDF id={item.id} /> : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rationalList.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No rationals found</h3>
            <p className="text-slate-600 mb-4">Add your first stock rational</p>
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
            <div className="p-4 border-t flex justify-end">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportPdfModal() {
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
    }
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
              onClick={() => setIsOpen(false)}
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
                onClick={() => setIsOpen(false)}
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

function ExportXlsxModal() {
  const { hasPermission } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [researchers, setResearchers] = useState([]);
  const [filters, setFilters] = useState({
    user_id: '',
    stock_name: '',
    status: '',
    recommendation_type: '',
    date_from: '',
    date_to: '',
    sort_order: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔽 Fetch researcher list
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

    if (isOpen) {
      fetchResearchers();
    }
  }, [isOpen]);

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
      setIsOpen(false);
    }
  };

  return (
    <>
      {hasPermission("rational_export_xls") && <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md w-auto whitespace-nowrap"
      >
        <div className='flex items-center gap-1'>
          <ArrowDownToLine className="h-4" />
          <div>XLSX</div>
        </div>
      </button>}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full shadow-lg relative">
            <button
              onClick={() => setIsOpen(false)}
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
                onClick={() => setIsOpen(false)}
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
      )}
    </>
  );
}
