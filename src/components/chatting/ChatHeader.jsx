// src/components/chat/ChatHeader.jsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Info, MoreVertical, Users } from "lucide-react";
import { Avatar } from "./atoms";

export default function ChatHeader({ selected, typing, onShowParticipants }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const participants = Array.isArray(selected?.participants) ? selected.participants : [];

  return (
    <div
      className="px-5 py-3 sticky top-0 z-10 border-b"
      style={{
        background: "var(--theme-card-bg)",
        borderColor: "var(--theme-border)",
        color: "var(--theme-text)",
      }}
    >
      {selected ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <Avatar
              name={selected.name}
              id={String(selected.id || selected.peer?.employee_code)}
              size="lg"
            />

            <div className="ml-3 min-w-0">
              <h2
                className="text-[15px] font-semibold truncate"
                style={{ color: "var(--theme-text)" }}
              >
                {selected.name || "Direct Chat"}
              </h2>

              {selected.type === "GROUP" ? (
                <div
                  className="flex items-center gap-2 text-[12px]"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  <Users size={14} className="shrink-0" />
                  <div className="truncate">
                    {participants.length > 0 ? (
                      <>
                        {participants.slice(0, 4).map((p, i) => (
                          <span
                            key={p.employee_code || p.id || i}
                            className="after:content-['·'] after:mx-1 last:after:content-['']"
                          >
                            {p.full_name || p.name || p.employee_code}
                          </span>
                        ))}
                        {participants.length > 4 && (
                          <span
                            className="ml-1 font-medium"
                            style={{ color: "var(--theme-text)" }}
                          >
                            +{participants.length - 4} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="italic">No participants loaded</span>
                    )}
                  </div>
                </div>
              ) : (
                <p
                  className="text-[12px]"
                  style={{ color: "var(--theme-text-muted)" }}
                >
                  {typing ? "typing…" : "Online"}
                </p>
              )}
            </div>
          </div>

          {selected.type === "GROUP" && (
            <div className="relative" ref={menuRef}>
              <button
                className="p-2 rounded-full transition-colors"
                title="More"
                aria-label="More"
                onClick={() => setOpen((v) => !v)}
                style={{ color: "var(--theme-text)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--theme-primary-softer)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <MoreVertical size={18} />
              </button>

              {open && (
                <div
                  className="absolute right-0 mt-2 rounded-md shadow-lg z-20 border"
                  style={{
                    background: "var(--theme-card-bg)",
                    borderColor: "var(--theme-border)",
                  }}
                >
                  <button
                    className="w-fit px-3 py-2 text-sm flex items-center gap-2 transition-colors"
                    onClick={() => {
                      setOpen(false);
                      onShowParticipants?.();
                    }}
                    style={{ color: "var(--theme-text)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "var(--theme-primary-softer)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <Info size={16} />
                    Info
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="text-[15px]"
          style={{ color: "var(--theme-text)" }}
        >
          Select a conversation
        </div>
      )}
    </div>
  );
}
