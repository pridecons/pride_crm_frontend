'use client';

import { useState } from 'react';
import { axiosInstance } from '@/api/Axios';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FetchLeadsButton({ onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleFetchLeads = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.post('/leads/fetch');
      toast.success(`Fetched ${response.data.fetched_count} leads`);
      if (onSuccess) onSuccess(response.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFetchLeads}
      disabled={loading}
      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Fetching...
        </>
      ) : (
        'Fetch Leads'
      )}
    </button>
  );
}
