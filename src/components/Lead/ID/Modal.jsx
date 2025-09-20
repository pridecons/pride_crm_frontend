import { X } from "lucide-react";

// Add contentClassName prop and apply it to the modal box div!
export const Modal = ({ isOpen, onClose, title, children, actions, contentClassName = "" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white rounded-lg p-6 shadow-xl max-h-[80vh] overflow-y-auto ${contentClassName}`}
      >
        <div className="flex justify-between items-center  mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="mb-6 ">{children}</div>
        <div className="flex gap-2 justify-end">{actions}</div>
      </div>
    </div>
  );
};
