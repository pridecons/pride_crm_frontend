"use client";

import React, { useState } from 'react';
import { usePermissions } from '@/context/PermissionsContext';  
import { axiosInstance } from '@/api/Axios';

const  DownloadPDF =({ id, userId }) => {
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

export default DownloadPDF;