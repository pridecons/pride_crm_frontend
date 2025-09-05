"use client";

import { useState } from "react";
import { PhoneCall, Wifi } from "lucide-react";
import { axiosInstance } from "@/api/Axios";
import { ErrorHandling } from "@/helper/ErrorHandling";
import { toast } from "react-hot-toast";

/** Shared normalizer (E.164-ish for India) */
export const normalizePhoneIN = (raw) => {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/[^\d+]/g, ""); // keep only + and digits
  if (s.startsWith("+")) return s; // already E.164
  s = s.replace(/^0+/, ""); // strip leading zeros
  if (s.length === 12 && s.startsWith("91")) return `+${s}`;
  if (s.length === 10) return `+91${s}`;
  if (!s.startsWith("+")) return `+91${s}`;
  return s;
};

/** Tiny Wi-Fi arc loader (no external CSS needed) */
function WifiLoader({ size = 16 }) {
  const px = typeof size === "number" ? `${size}px` : size;
  return (
    <span className="relative inline-block align-middle" style={{ width: px, height: px }}>
      <span className="wifi-arc arc1" />
      <span className="wifi-arc arc2" />
      <span className="wifi-arc arc3" />
      <style jsx>{`
        .wifi-arc {
          position: absolute;
          inset: 0;
          border: 2px solid currentColor;
          border-left-color: transparent;
          border-right-color: transparent;
          border-bottom-color: transparent; /* show only the top arc */
          border-radius: 9999px;
          transform-origin: center bottom;
          opacity: 0.25;
          animation: wifiPulse 1.1s ease-in-out infinite;
        }
        .arc1 { transform: scale(0.50); animation-delay: 0ms; }
        .arc2 { transform: scale(0.75); animation-delay: 120ms; }
        .arc3 { transform: scale(1.00); animation-delay: 240ms; }

        @keyframes wifiPulse {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 1; }
        }
      `}</style>
    </span>
  );
}

/**
 * Reusable Call button.
 *
 * Props:
 * - lead?: object (with mobile/phone/contact_number, is_call, assignment_id)
 * - mobile?: string (if you don't pass `lead`)
 * - assignmentId?: string|number (override lead.assignment_id)
 * - isCalled?: boolean         (override lead.is_call)
 * - onRefresh?: () => void     (called after successful mark-called)
 * - confirmMarkCalled?: boolean (default true; uses window.confirm)
 * - size?: "sm" | "md"         (button sizing, default "sm")
 * - className?: string
 * - title?: string
 * - children?: node            (label; omit for icon-only)
 */
export default function CallButton({
  lead,
  mobile,
  assignmentId,
  isCalled,
  onRefresh,
  confirmMarkCalled = true,
  size = "sm",
  className = "",
  title,
  children,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const _mobile =
    mobile ??
    lead?.mobile ??
    lead?.phone ??
    lead?.contact_number ??
    null;

  const _isCalled = typeof isCalled === "boolean" ? isCalled : !!lead?.is_call;
  const _assignmentId =
    assignmentId ?? (lead && lead.assignment_id != null ? lead.assignment_id : null);

  const btnSize =
    size === "md"
      ? "h-9 px-3 text-sm"
      : "h-8 w-8 text-[12px]"; // default sm = round icon

  const isIconOnly = !children;

  const base =
    "rounded-full flex items-center justify-center shadow transition disabled:opacity-50 disabled:cursor-not-allowed";

  const enabledCls =
    _isCalled
      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
      : isLoading
      ? "bg-green-500/70 text-white cursor-wait"
      : "bg-green-500 hover:bg-green-600 text-white";

  const composed =
    base +
    " " +
    btnSize +
    " " +
    (isIconOnly ? "" : "px-3") +
    " " +
    enabledCls +
    (className ? ` ${className}` : "");

  const click = async () => {
    if (_isCalled || isLoading) return;
    try {
      const toNumber = normalizePhoneIN(_mobile);
      if (!toNumber) {
        return ErrorHandling({ defaultError: "Mobile number not found for this lead." });
      }

      setIsLoading(true);

      // Call API
      await axiosInstance.post(
        "/vbc/call",
        { to_number: toNumber },
        { headers: { "Content-Type": "application/json", Accept: "application/json" } }
      );

      toast.success(`Calling ${toNumber}`);

      // Optional: mark-called for assignment rows
      if (_assignmentId) {
        let proceed = true;
        if (confirmMarkCalled) {
          proceed = window.confirm("Mark this assignment as called?");
        }
        if (proceed) {
          await axiosInstance.put(`/leads/navigation/mark-called/${_assignmentId}`);
          onRefresh?.();
        }
      }
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to place call" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={click}
      disabled={_isCalled || isLoading}
      className={composed}
      title={title ?? (_isCalled ? "Called" : isLoading ? "Calling…" : "Call")}
      aria-label={title ?? "Call"}
    >
      {isLoading ? (
        <span className={isIconOnly ? "" : "mr-2"}>
          <WifiLoader size={16} />
        </span>
      ) : (
        <PhoneCall size={16} className={isIconOnly ? "" : "mr-2"} />
      )}
      {!isIconOnly && (isLoading ? "Calling…" : children)}
    </button>
  );
}
