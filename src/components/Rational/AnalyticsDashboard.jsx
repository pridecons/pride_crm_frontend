"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Target, TrendingUp, PieChart } from 'lucide-react';
import { axiosInstance } from '@/api/Axios';


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
      <div className="mx-2">
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
            icon={<Users className="w-6 h-6 text-pink-500" />}
            bgColor="bg-pink-100"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${analyticsData.success_rate}%`}
            icon={<Target className="w-6 h-6 text-emerald-600" />}
            bgColor="bg-emerald-100"
          />
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

export default AnalyticsDashboard;


// Helper components
const MetricCard = ({ title, value, icon, bgColor, textColor = 'text-gray-900' }) => (
  <div className="bg-white shadow-sm border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className={`text-3xl font-bold ${textColor} mt-2`}>{value}</p>
      </div>
      <div className='px-2'>
        <div className={`${bgColor} p-2 rounded`}>
        {icon}
      </div></div>
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


