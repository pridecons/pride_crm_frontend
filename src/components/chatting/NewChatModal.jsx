// src/components/chat/NewChatModal.jsx
"use client";
import React, { useState } from "react";
import UserSelect from "./UserSelect";

export default function NewChatModal({ isOpen, onClose, users, onCreateGroup }) {
  const [groupName, setGroupName] = useState("");
  const [groupUsers, setGroupUsers] = useState([]);

  const handleCreateGroup = () => {
    if (!groupName.trim() || groupUsers.length === 0) return;
    onCreateGroup(groupName.trim(), groupUsers);
    setGroupName("");
    setGroupUsers([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Group</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-4 space-y-4">
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />

          <div>
            <label className="block text-sm text-gray-600 mb-2">Add participants</label>
            <UserSelect
              users={users}
              value={groupUsers}
              onChange={setGroupUsers}
              placeholder="Search users..."
              multiple
            />
            {groupUsers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {groupUsers.map((u) => (
                  <span
                    key={u.employee_code}
                    className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs"
                  >
                    {u.full_name || u.name || u.employee_code}
                    <button
                      onClick={() =>
                        setGroupUsers(groupUsers.filter((x) => x.employee_code !== u.employee_code))
                      }
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || groupUsers.length === 0}
            className="w-full py-2 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
