// src/components/chat/Composer.jsx
"use client";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Send } from "lucide-react";
import { fileKindIcon } from "./utils";

const Composer = forwardRef(function Composer({ disabled, onSend }, ref) {
  const [text, setText] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = useRef(null);

  function addFiles(fileList) {
    const arr = Array.from(fileList || []);
    const filtered = arr.filter((f) => f.size <= 25 * 1024 * 1024); // 25MB
    setPendingFiles((prev) => [...prev, ...filtered]);
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
    }
  }

  useImperativeHandle(ref, () => ({
    addFiles,
  }));

  return (
    <div className="bg-white px-5 py-3 border-t border-gray-300 relative">
      <input
        ref={fileInputRef}
        id="chat-file-input"
        type="file"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {pendingFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-[12px]"
            >
              <span>{fileKindIcon(f.type, f.name)} {f.name}</span>
              <button onClick={() => removePending(i)} className="text-gray-500 hover:text-gray-700">×</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center">
        <button
          className="mr-2 h-[33px] w-[33px] rounded-full bg-[#05728f] text-white flex items-center justify-center"
          title="Attach"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm">📎</span>
        </button>

        <input
          className="flex-1 bg-transparent border-0 text-[#4c4c4c] text-[15px] min-h-[48px] focus:outline-none"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          onClick={handleSend}
          disabled={(!text.trim() && pendingFiles.length === 0) || disabled}
          className="ml-2 h-[33px] w-[33px] rounded-full bg-[#05728f] text-white flex items-center justify-center disabled:opacity-50"
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
});

export default Composer;