// src/components/chat/atoms.jsx
"use client";
import React, { useEffect, useState } from "react";
import { clsx, fileKindIcon, toLocal } from "./utils";
import { axiosInstance, BASE_URL_full } from "@/api/Axios";

const toAbs = (u = "") => {
  if (!u) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u; // already absolute
  if (u.startsWith("//")) return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${u}`;
  if (u.startsWith("/")) return `${BASE_URL_full}${u}`; // root-relative → origin + path
  // bare relative path → origin + "/" + path
  return `${BASE_URL_full}/${u}`;
};

// Try to load <img> anonymously first; if it fails (auth/CORS), fetch as blob with axiosInstance.
function SecureImage({ src, alt, className }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let alive = true;
    let blobUrl = null;
    const absolute = toAbs(src);

    if (!absolute) {
      setUrl(null);
      return;
    }

    const probe = new Image();
    // Some servers require anonymous probe to fail before we use auth’d blob fetch
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      if (alive) setUrl(absolute);
    };
    probe.onerror = async () => {
      try {
        const { data } = await axiosInstance.get(absolute, {
          responseType: "blob",
          // Helpful on some stacks that gate by Accept
          headers: { Accept: "*/*" },
          withCredentials: true,
        });
        blobUrl = URL.createObjectURL(data);
        if (alive) setUrl(blobUrl);
      } catch {
        if (alive) setUrl(null); // keeps placeholder visible
      }
    };
    probe.src = absolute;

    return () => {
      alive = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]);

  if (!url) {
    return (
      <div
        className={`w-full h-36 flex items-center justify-center bg-white text-gray-400 text-sm ${className || ""}`}
      >
        image
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

/* ------------------------------- UI atoms ------------------------------- */

export function Avatar({ name, id, size = "sm" }) {
  const label = (name || id || "?").trim();
  const letters = label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "U";
  const sizeClasses = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <div className={`flex ${sizeClasses} items-center justify-center rounded-full bg-gray-300 text-gray-700 font-medium`}>
      {letters}
    </div>
  );
}

export function DayDivider({ date }) {
  const label = date.toLocaleDateString([], { day: "2-digit", month: "short" });
  return (
    <div className="flex justify-center my-3">
      <span className="bg-gray-100 text-gray-700 text-[11px] px-3 py-1 rounded-full border border-gray-200">
        {label}
      </span>
    </div>
  );
}

function Tick({ state }) {
  if (state === "sending")
    return (
      <svg viewBox="0 0 24 24" className="w-3 h-3 opacity-60">
        <path d="M12 7v6l4 2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  if (state === "sent")
    return (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 opacity-60">
        <path d="M4 13l4 4L20 5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  if (state === "delivered")
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-60">
        <path d="M3 13l4 4 6-8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M9 17l2 2 9-12" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 text-sky-500">
      <path d="M3 13l4 4 6-8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 17l2 2 9-12" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function AttachmentGrid({ atts = [], onOpen }) {
  if (!atts.length) return null;
  return (
    <div className=" ">
      {atts.map((a) => {
        const isImg = (a.mime_type || "").startsWith("image/");
        const handleOpen = (e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpen?.(toAbs(a.url), a.filename || a.mime_type || "Attachment", a.mime_type || "");
        };
        const thumb = a.thumb_url ? toAbs(a.thumb_url) : toAbs(a.url);
        return (
          <button
            key={a.id}
            type="button"
            onClick={handleOpen}
            className="group block rounded-md overflow-hidden border border-gray-200 bg-white hover:shadow-sm text-left"
          >
            {isImg ? (
              <SecureImage
                src={thumb}
                alt={a.filename || "Attachment"}
                className="w-full h-36 object-cover"
              />

            ) : (
              <div className="h-36 flex items-center justify-center text-4xl">
                {fileKindIcon(a.mime_type, a.filename)}
              </div>
            )}
            <div className="px-2 py-1 text-[12px] truncate text-gray-700 border-t">
              {a.filename || "Attachment"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MessageBubble({ mine, msg, showHeader, showAvatar }) {
  const created = msg.created_at ?? msg.createdAt ?? msg.timestamp ?? msg.time;
  const dt = toLocal(created);
  const timeStr = isNaN(dt.getTime())
    ? ""
    : dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const state = msg._status || (mine ? "delivered" : undefined);

  return (
    <div className={clsx("flex mb-3", mine ? "justify-end" : "justify-start")}>
      {!mine && showAvatar ? (
        <div className="mr-2 mt-0.5">
          <Avatar name={msg.sender_id} id={msg.sender_id} />
        </div>
      ) : (!mine && <div className="w-8 mr-2" />)}

      <div className={clsx("max-w-[75%]")}>
        {!mine && showHeader && (
          <div className="text-[11px] text-gray-500 mb-1">{msg.sender_id}</div>
        )}

        <div
          className={clsx(
            "rounded-[6px] px-3 py-2 text-[14px] leading-5 break-words",
            mine ? "bg-[#05728f] text-white shadow-sm" : "bg-[#ebebeb] text-[#646464]"
          )}
        >
          {!!(msg.body || "").trim() && (
            <div className="whitespace-pre-wrap">{msg.body}</div>
          )}

          {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
            <AttachmentGrid atts={msg.attachments} onOpen={msg._onOpenAttachment} />
          )}

          <div
            className={clsx(
              "mt-1 flex items-center gap-1",
              mine ? "justify-end text-white/70" : "justify-end text-gray-500"
            )}
          >
            <span className="text-[11px]">{timeStr}</span>
            {mine && <Tick state={state} />}
          </div>
        </div>
      </div>

    </div>
  );
}