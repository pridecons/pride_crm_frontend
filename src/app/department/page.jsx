// components/Department/index.jsx (or the same path you use)
"use client";

import { useState } from "react";
import { Building2 } from "lucide-react"; // (kept as-is, even if unused)
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
    <div
      className="min-h-screen p-2"
      style={{
        // Page background from theme (fallback keeps your old light gradient)
        // background:
        //   "var(--theme-page-bg, linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, rgba(59,130,246,0.06) 100%))",
        color: "var(--theme-text, #0f172a)",
      }}
    >
      <DepartmentAccordion />
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
  );
}
