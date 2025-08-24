import React from "react";
import { Modal } from "@/components/Lead/ID/Modal";

export default function ConfirmCalledModal({ open, onClose, onConfirm }) {
  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Mark Lead as Called"
      actions={[
        <button key="cancel" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
          Cancel
        </button>,
        <button key="confirm" onClick={onConfirm} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          Mark as Called
        </button>,
      ]}
    >
      <p className="text-gray-600">Are you sure you want to mark this lead as called? This action cannot be undone.</p>
    </Modal>
  );
}