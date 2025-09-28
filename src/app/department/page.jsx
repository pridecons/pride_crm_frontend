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
      {/* Content Section */}
      <div className="mx-2 px-6 py-8">
        <div className="space-y-6">
          {/* Department Accordion */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
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