import React from "react";
import { Modal } from "@/components/Lead/ID/Modal";

export default function KycViewerModal({ open, onClose, url, canDownload }) {
  return (
    <Modal isOpen={open} onClose={onClose} title="" actions={[]}>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col z-50">
        <div className="flex justify-between items-center bg-white shadow px-4 py-2">
          <h3 className="text-lg font-semibold text-gray-900">KYC Document</h3>
          <div className="flex gap-2">
            {canDownload && (
              <a
                href={url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Download
              </a>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
              Close
            </button>
          </div>
        </div>

        <div className="flex h-[600px]">
          {url ? (
            <iframe src={url} title="KYC PDF" width="100%" height="100%" className="rounded shadow border min-h-[500px]" />
          ) : (
            <p className="text-center text-gray-500 mt-20">Loading PDF...</p>
          )}
        </div>
      </div>
    </Modal>
  );
}