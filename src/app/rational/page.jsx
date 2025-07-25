'use client';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { axiosInstance } from '@/api/Axios';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import { CardContent } from '@/components/common/CardContent';
const API_URL = 'http://147.93.30.144:8000/api/v1/narrations/';

export default function RationalPage() {
  const [rationalList, setRationalList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    stock_name: '',
    entry_price: '',
    stop_loss: '',
    targets1: '',
    targets2: '',
    targets3: '',
    rational: '',
    recommendation_type: '',
    rational_image: null,
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

  const openModal = async (id = null) => {
    setEditId(id);
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
        targets1: '',
        targets2: '',
        targets3: '',
        rational: '',
        recommendation_type: '',
      });
    }
    setIsModalOpen(true);
  };
  // const handleExport = () => {
  //   const fileData = JSON.stringify(formData, null, 2);
  //   const blob = new Blob([fileData], { type: 'application/json' });
  //   const url = URL.createObjectURL(blob);

  //   const link = document.createElement('a');
  //   link.href = url;
  //   link.download = 'formData.json';
  //   document.body.appendChild(link);
  //   link.click();
  //   document.body.removeChild(link);
  // };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleExport = async () => {
    try {
      const response = await axiosInstance.get('/narrations'); // Base URL is assumed set in axiosInstance

      const data = response.data;

      // Convert JSON to Excel worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Narrations");

      // Trigger file download
      XLSX.writeFile(workbook, 'narrations-export.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let dataToSend;
      let headers = { 'Content-Type': 'application/json' };

      if (formData.rational_image) {
        dataToSend = new FormData();
        Object.keys(formData).forEach((key) => {
          if (formData[key] !== null) {
            dataToSend.append(key, formData[key]);
          }
        });
        headers = { 'Content-Type': 'multipart/form-data' };
      } else {
        dataToSend = formData;
      }

      if (editId) {
        await axiosInstance.put(`${API_URL}${editId}/`, dataToSend, { headers });
      } else {
        await axiosInstance.post(API_URL, dataToSend, { headers });
      }

      setIsModalOpen(false);
      fetchRationals();
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this rational?')) return;
    try {
      await axiosInstance.delete(`${API_URL}${id}/`);
      fetchRationals();
    } catch (err) {
      console.error('Failed to delete rational:', err);
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
            </button>`

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
                  <th className="text-left py-4 px-6">Target</th>
                  <th className="text-left py-4 px-6">Recommendation</th>
                  <th className="text-left py-4 px-6">Date</th>
                  <th className="text-left py-4 px-6">Rational</th>
                  <th className="text-center py-4 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((item, index) => (
                  <tr key={item.id}>
                    <td className="py-4 px-6">
                      <div className="font-semibold">{item.stock_name}</div>
                    </td>
                    <td className="py-4 px-6">{item.entry_price}</td>
                    <td className="py-4 px-6">{item.stop_loss}</td>
                    <td className="py-4 px-6">{item.targets}</td>
                    <td className="py-4 px-6">{item.recommendation_type}</td>
                    <td className="py-4 px-6">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : '-'}
                    </td>
                    <td className="py-4 px-6">{item.rational}</td>
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

      {/* Modal */}
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
                <input type="text" name="stock_name" value={formData.stock_name} onChange={handleChange} className="p-3 border rounded" required />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 text-sm">Entry Price</label>
                <input type="number" name="entry_price" value={formData.entry_price} onChange={handleChange} className="p-3 border rounded" />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 text-sm">Stop Loss</label>
                <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} className="p-3 border rounded" />
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 text-sm">Targets 1</label>
                <input
                  type="number"
                  name="targets1"
                  value={formData.targets1}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 text-sm">Targets 2</label>
                <input
                  type="number"
                  name="targets2"
                  value={formData.targets2}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 text-gray-700 text-sm">Targets 3</label>
                <input
                  type="number"
                  name="targets3"
                  value={formData.targets3}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              <div className="flex flex-col md:col-span-2">
                <label className="mb-1 text-gray-700 text-sm">Recommendation Type</label>
                <select name="recommendation_type" value={formData.recommendation_type} onChange={handleChange} className="p-3 border rounded" required>
                  <option value="">Select Recommendation Type</option>
                  <option value="Buy">Call Buy</option>
                  <option value="Buy">Put Buy</option>
                </select>
              </div>

              <div className="flex flex-col md:col-span-2 relative">
                <label className="mb-1 text-gray-700 text-sm">Rational</label>

                <textarea
                  name="rational"
                  value={formData.rational}
                  onChange={handleChange}
                  className="p-3 border rounded"
                  rows={3}
                />

                {/* Upload Button Styled */}
                <div className="mt-2 flex justify-end">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rational_image: e.target.files[0],
                      }))
                    }
                    className="hidden"
                    id="rationalImageUpload"
                  />
                  <label
                    htmlFor="rationalImageUpload"
                    className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm transition"
                    title="Upload image"
                  >
                    Upload Image
                  </label>
                </div>

                {/* Image Preview with Delete Button */}
                {formData.rational_image && (
                  <div className="mt-2 relative inline-block w-fit">
                    <img
                      src={URL.createObjectURL(formData.rational_image)}
                      alt="Preview"
                      className="max-h-20 rounded border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rational_image: null,
                        }))
                      }
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
                      title="Remove Image"
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
