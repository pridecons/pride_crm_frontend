// src/components/chat/Composer.jsx
"use client";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { fileKindIcon } from "./utils";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

const Composer = forwardRef(function Composer({ disabled, onSend }, ref) {
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const fileInputRef = useRef(null);

  function addFiles(fileList) {
    const arr = Array.from(fileList || []);
    const ok = arr.filter((f) => f.size <= MAX_FILE_BYTES);
    const skipped = arr.length - ok.length;
    if (skipped > 0) setSkippedCount((c) => c + skipped);
    setPendingFiles((prev) => [...prev, ...ok]);
  }

  function removePending(idx) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if ((!text.trim() && pendingFiles.length === 0) || disabled) return;
    const body = text.trim();
    const files = pendingFiles.slice();
    const ok = await onSend(body, files); // return true on success
    if (ok) {
      setText("");
      setPendingFiles([]);
      setSkippedCount(0);
    }
  }

  useImperativeHandle(ref, () => ({
    addFiles,
  }));

  const canSend = !disabled && (text.trim().length > 0 || pendingFiles.length > 0);

  return (
    <div
      className="px-5 py-3 border-t relative overflow-x-hidden"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
      }}
    >
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        id="chat-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* pending attachments */}
      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2 min-w-0">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] max-w-full min-w-0 border"
              style={{
                background: "var(--theme-components-tag-neutral-bg)",
                color: "var(--theme-components-tag-neutral-text)",
                borderColor: "var(--theme-components-tag-neutral-border)",
              }}
              title={f.name}
            >
              <span className="min-w-0 max-w-[60vw] sm:max-w-[40vw] truncate">
                {fileKindIcon(f.type, f.name)} {f.name}
              </span>
              <button
                onClick={() => removePending(i)}
                className="rounded px-1"
                aria-label={`Remove ${f.name}`}
                style={{ color: "var(--theme-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* skipped notice (files > 25MB) */}
      {skippedCount > 0 && (
        <div
          className="mb-2 text-xs rounded px-2 py-1 inline-block"
          style={{
            background: "var(--theme-danger-soft, rgba(244,63,94,0.1))",
            color: "var(--theme-danger, #f43f5e)",
            border: "1px solid var(--theme-danger, #f43f5e)",
          }}
        >
          Skipped {skippedCount} file{skippedCount > 1 ? "s" : ""} (max 25MB each)
        </div>
      )}

      <div className="flex items-center min-w-0 gap-2">
        {/* attach */}
        <button
          type="button"
          className="mr-1 h-[36px] w-[36px] rounded-full flex items-center justify-center"
          title="Attach files"
          aria-label="Attach files"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          style={{
            background: "var(--theme-primary-softer)",
            color: "var(--theme-primary)",
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-primary-softer)")}
        >
          <Paperclip size={16} />
        </button>

        {/* input */}
        <input
          className="flex-1 w-0 min-w-0 rounded-xl px-3 py-3 text-[15px] focus:outline-none"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          style={{
            background: "var(--theme-input-background)",
            color: "var(--theme-text)",
            border: "1px solid var(--theme-input-border, var(--theme-border))",
            boxShadow: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px var(--theme-primary)")}
          onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
          disabled={disabled}
          aria-label="Message"
        />

        {/* send */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="ml-2 h-[36px] w-[36px] rounded-full flex items-center justify-center"
          title="Send message"
          aria-label="Send message"
          style={{
            background: "var(--theme-primary)",
            color: "var(--theme-primary-contrast)",
            opacity: canSend ? 1 : 0.5,
            cursor: canSend ? "pointer" : "not-allowed",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--theme-primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--theme-primary)")}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});

export default Composer;