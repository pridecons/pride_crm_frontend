import React from 'react'

export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-10 text-gray-500 text-sm">
      <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full mb-4"></div>
      {message}
    </div>
  );
}

// Small inline loader for inputs, like in PAN field
export function MiniLoader({ className = "" }) {
  return (
    <div
      className={`animate-spin h-4 w-4 border-b-2 border-blue-500 rounded-full ${className}`}
      style={{ minWidth: "1rem", minHeight: "1rem" }}
      aria-label="loading"
    />
  );
}
