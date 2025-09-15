"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import AddDepartmentModal from "@/components/Department/DepartmentAddModel";
import AddProfileModal from "@/components/Department/ProfileAddModel";
import DepartmentAccordion from "@/components/Department/table";

export default function Department() {
  const [departments, setDepartments] = useState([]);
  const [openAddDeptModal, setOpenAddDeptModal] = useState(false);
  const [openAddProfileModal, setOpenAddProfileModal] = useState(false);

  const handleAddDepartment = (newDept) => {
    setDepartments((prev) => [...prev, newDept]);
    setOpenAddDeptModal(false);
  };

  const handleAddProfile = () => {
    // Profile adding logic goes here
  };

  const selectedDept = departments[0] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-2 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                Department Management
              </h1>
              <p className="text-gray-600">
                Organize your teams and define role-based permissions across departments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="mx-2 px-6 py-8">
        <div className="space-y-6">
          {/* Stats Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Departments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{departments.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-100">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Profiles</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <div className="p-3 rounded-lg bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Permission Types</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-100">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
            </div>
          </div> */}

          {/* Department Accordion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <DepartmentAccordion />
          </div>
        </div>

        {/* Hidden Modals */}
        <div className="hidden">
          <AddDepartmentModal
            isOpen={openAddDeptModal}
            onClose={() => setOpenAddDeptModal(false)}
            onAdd={handleAddDepartment}
          />

          <AddProfileModal
            isOpen={openAddProfileModal}
            onClose={() => setOpenAddProfileModal(false)}
            onAdd={handleAddProfile}
            departmentId={selectedDept?.id}
            departments={departments}
            setDepartments={setDepartments}
          />
        </div>
      </div>
    </div>
  );
}