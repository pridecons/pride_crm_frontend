import { X } from "lucide-react";

// Add contentClassName prop and apply it to the modal box div!
export const Modal = ({ isOpen, onClose, title, children, actions, contentClassName = "" }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm"
      // Overlay color via theme (falls back to rgba(0,0,0,0.30))
      style={{
        background: "var(--theme-components-modal-overlay, rgba(0,0,0,0.30))",
      }}
    >
      <div
        className={`rounded-2xl pb-6 shadow-xl max-h-[80vh] overflow-y-auto ${contentClassName}`}
        // Modal surface + border + text via theme
        style={{
          background: "var(--theme-components-modal-bg, var(--theme-cardBackground))",
          color: "var(--theme-components-modal-text, var(--theme-text))",
          border: "1px solid var(--theme-components-modal-border, var(--theme-border))",
          boxShadow: "0 10px 30px var(--theme-shadow, rgba(0,0,0,0.15))",
        }}
      >
        {/* Title */}
        {title ? (
          <h3
            className="text-lg font-semibold"
            style={{
              color: "var(--theme-components-modal-headerText, var(--theme-text))",
            }}
          >
            {title}
          </h3>
        ) : null}

        {/* If you decide to re-enable a clickable close icon later,
            keep functionality identical—just style with theme:
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onClose}
            className="transition-colors"
            style={{
              color: "var(--theme-textSecondary)",
            }}
          >
            <X size={20} />
          </button>
        </div>
        */}

        <div className="mb-6">{children}</div>

        <div className="pr-6 flex gap-2 justify-end">{actions}</div>
      </div>
    </div>
  );
};
