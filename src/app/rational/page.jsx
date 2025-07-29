'use client';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { axiosInstance, BASE_URL } from '@/api/Axios';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import { CardContent } from '@/components/common/CardContent';

const API_URL = '/recommendations/';

export default function RationalPage() {
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
      const response = await axiosInstance.put(`/recommendations/status/${id}?status=${newStatus}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
          {/* Left Side: Search + Date */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto space-y-3 sm:space-y-0">
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

            {/* Date Filter */}
            <div className="flex flex-col space-y-1 w-full sm:w-64">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {selectedDate && (
                <span className="text-sm text-gray-600">
                  Selected: {new Date(selectedDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 w-full sm:w-auto space-y-3 sm:space-y-0 sm:justify-end">
            <button
              onClick={handleExport}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Export
            </button>

            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Rational
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <CardContent
            label="Total Stocks"
            value={rationalList.length}
            icon={<LineChart className="w-6 h-6 text-blue-600" />}
          />
          <CardContent
            label="Buy Signals"
            value={rationalList.filter(item => item.recommendation_type === 'Buy').length}
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100"
            textColor="text-green-600"
          />
          <CardContent
            label="Sell Signals"
            value={rationalList.filter(item => item.recommendation_type === 'Sell').length}
            icon={<TrendingDown className="w-6 h-6 text-red-600" />}
            iconBg="bg-red-100"
            textColor="text-red-600"
          />
          <CardContent
            label="Watch List"
            value={rationalList.filter(item => item.recommendation_type === 'Watch').length}
            icon={<Eye className="w-6 h-6 text-blue-600" />}
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="text-left py-4 px-6">Stock Name</th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 px-6 font-semibold">{item.stock_name}</td>
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
                        {item.status || 'N/A'}
                      </button>

                      {openStatusDropdown === item.id && item.status === "OPEN" && (
                        <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded shadow-lg w-36 left-1/2 -translate-x-1/2">
                          {[
                            'OPEN',
                            'TARGET1',
                            'TARGET2',
                            'TARGET3',
                            'STOP_LOSS',
                            'CLOSED',
                          ].map((status) => (
                            <div
                              key={status}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Dropdown option clicked:', status);
                                handleStatusChange(item.id, status);
                                setOpenStatusDropdown(null); // Close dropdown after selection                               
                              }}
                              className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${item.status === status
                                  ? 'bg-blue-50 text-blue-600 font-medium'
                                  : 'text-gray-700 hover:text-blue-600'
                                }`}
                            >
                              {status}
                              {item.status === status && <span className="ml-2">✓</span>}
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
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl overflow-hidden shadow-lg max-w-3xl w-full">
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

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl relative max-h-[90vh] overflow-y-auto">
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

              
              {isEditMode && (<div className="flex flex-col md:col-span-2">
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
              </div>)}



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
                        // Clear image error when file is selected
                        if (e.target.files[0]) {
                          setImageError('');
                        }
                      }}
                      className="hidden"
                      id="rationalImageUpload"
                      disabled={isEditMode}
                    />
                    <label
                      htmlFor="rationalImageUpload"
                      className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm transition"
                      title="Upload image"
                    >
                      Upload Image {!editId && <span className="text-red-300">*</span>}
                    </label>
                  </div>
                )}

                {/* Display image error */}
                {imageError && (
                  <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                    {imageError}
                  </div>
                )}

                {/* Image Preview with Delete Button */}
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
      )}
    </div>
  );
}