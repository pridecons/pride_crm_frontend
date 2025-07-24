// get all , create rational button, edit options, delete options, edit rational field 
// RationalListPage.jsx



'use client';
import { sendNotification } from './notificationService';
import { useEffect, useState } from 'react';
import { axiosInstance } from '@/api/Axios';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Eye,
} from 'lucide-react';
import { CardContent } from '@/components/common/CardContent';
// import RationalTable from '@/components/common/TableContent';

const API_URL = 'http://147.93.30.144:8000/api/v1/narrations/';

export default function RationalPage() {
  const [rationalList, setRationalList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    stock_name: '',
    entry_price: '',
    stop_loss: '',
    targets: '',
    rational: '',
    recommendation_type: '',
  });

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
        targets: '',
        rational: '',
        recommendation_type: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axiosInstance.put(`${API_URL}${editId}/`, formData);
      } else {
        await axiosInstance.post(API_URL, formData);
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

  // Function to send notification
  async function sendNotification() {
    await fetch("https://crm.24x7techelp.com/api/v1/notification/", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: "USER_ID_HERE",
        title: "Hello!",
        message: "This is a test notification.",
      }),
    });
  }


  const getRecommendationBadge = (type) => {
    const colors = {
      'Buy': 'bg-green-100 text-green-800 border-green-200',
      'Sell': 'bg-red-100 text-red-800 border-red-200',
      'Hold': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Watch': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Stock Rationals</h1>
              <p className="text-slate-600">Manage your stock recommendations and analysis</p>
            </div>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Enhanced Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Stock Name
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Entry Price
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Stop Loss
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Target
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Recommendation
                  </th>
                  <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Rational
                  </th>
                  <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rationalList.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                          {item.stock_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{item.stock_name}</div>
                          <div className="text-xs text-slate-500">Stock #{index + 1}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">
                        {item.entry_price ? `₹${parseFloat(item.entry_price).toFixed(2)}` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-red-600">
                        {item.stop_loss ? `₹${parseFloat(item.stop_loss).toFixed(2)}` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-green-600">
                        {item.targets ? `₹${parseFloat(item.targets).toFixed(2)}` : '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getRecommendationBadge(item.recommendation_type)}`}>
                        {item.recommendation_type}
                      </span>
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      <div className="text-sm text-slate-600 truncate" title={item.rational}>
                        {item.rational || 'No rational provided'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => openModal(item.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors duration-150"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rationalList.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">No rationals found</h3>
                <p className="text-slate-600 mb-4">Get started by adding your first stock rational</p>
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-150"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add First Rational
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal - Fixed form structure */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl relative">
            {/* Close Button */}
            <button
              className="absolute top-2 right-3 text-gray-500 text-2xl"
              onClick={() => setIsModalOpen(false)}
            >
              &times;
            </button>

            {/* Title */}
            <h2 className="text-xl font-semibold mb-4">
              {editId ? 'Edit Rational' : 'Create Rational'}
            </h2>

            {/* Form */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Stock Name */}
              <div className="flex flex-col">
                {editId && <label className="mb-1 text-gray-700 text-sm">Stock Name</label>}
                <input
                  type="text"
                  name="stock_name"
                  placeholder="Stock Name"
                  value={formData.stock_name}
                  onChange={handleChange}
                  className="p-3 border rounded"
                  required
                />
              </div>

              {/* Entry Price */}
              <div className="flex flex-col">
                {editId && <label className="mb-1 text-gray-700 text-sm">Entry Price</label>}
                <input
                  type="number"
                  name="entry_price"
                  placeholder="Entry Price"
                  value={formData.entry_price}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              {/* Stop Loss */}
              <div className="flex flex-col">
                {editId && <label className="mb-1 text-gray-700 text-sm">Stop Loss</label>}
                <input
                  type="number"
                  name="stop_loss"
                  placeholder="Stop Loss"
                  value={formData.stop_loss}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              {/* Targets */}
              <div className="flex flex-col">
                {editId && <label className="mb-1 text-gray-700 text-sm">Targets</label>}
                <input
                  type="number"
                  name="targets"
                  placeholder="Targets"
                  value={formData.targets}
                  onChange={handleChange}
                  className="p-3 border rounded"
                />
              </div>

              {/* Recommendation Type */}
              <div className="flex flex-col md:col-span-2">
                {editId && (
                  <label className="mb-1 text-gray-700 text-sm">
                    Recommendation Type
                  </label>
                )}
                <select
                  name="recommendation_type"
                  value={formData.recommendation_type}
                  onChange={handleChange}
                  className="p-3 border rounded"
                  required
                >
                  <option value="">Select Recommendation Type</option>
                  <option value="Buy">Buy</option>
                  <option value="Sell">Sell</option>
                  <option value="Hold">Hold</option>
                  <option value="Watch">Watch</option>
                </select>
              </div>

              {/* Rational */}
              <div className="flex flex-col md:col-span-2">
                {editId && <label className="mb-1 text-gray-700 text-sm">Rational</label>}
                <textarea
                  name="rational"
                  placeholder="Rational"
                  value={formData.rational}
                  onChange={handleChange}
                  className="p-3 border rounded"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors duration-150"
                >
                  {editId ? 'Update Rational' : 'Create Rational'}
                </button>
                <button onClick={sendNotification}>Send Test Notification</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


