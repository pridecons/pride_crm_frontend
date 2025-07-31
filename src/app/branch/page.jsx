"use client";

import React, { useEffect, useState } from "react";
import { axiosInstance } from "@/api/Axios";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { toast } from "react-toastify";
import LoadingState from "@/components/LoadingState";

const BranchesPage = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    branch_name: "",
    branch_address: "",
    authorized_person: "",
    branch_pan: "",
    branch_aadhaar: "",
    agreement_pdf: null,
    active: true,
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await axiosInstance.get(
        "/branches/?skip=0&limit=100&active_only=false"
      );
      setBranches(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching branches:", error);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditBranch(null);
    setFormData({
      branch_name: "",
      branch_address: "",
      authorized_person: "",
      branch_pan: "",
      branch_aadhaar: "",
      agreement_pdf: null,
      active: true,
    });
    setIsOpen(true);
  };

  const openEditModal = (branch) => {
    setEditBranch(branch);
    setFormData({
      branch_name: branch.name,
      branch_address: branch.address,
      authorized_person: branch.authorized_person,
      branch_pan: branch.pan,
      branch_aadhaar: branch.aadhaar,
      agreement_pdf: null, // PDF will be optional for update
      active: branch.active,
    });
    setIsOpen(true);
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, agreement_pdf: e.target.files[0] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null) {
        data.append(key, value);
      }
    });

    try {
      if (editBranch) {
        await axiosInstance.put(`/branches/${editBranch.id}`, data);
        toast.success("Branch updated successfully");
      } else {
        await axiosInstance.post(`/branches/create-with-manager`, data);
        toast.success("Branch created successfully");
      }
      setIsOpen(false);
      fetchBranches();
    } catch (error) {
      console.error(error);
      toast.error("Error saving branch");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Branch Management</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={openAddModal}
        >
          Add Branch
        </button>
      </div>

      {loading ? (
        <LoadingState message="Loading branches..." />
      ) : branches.length === 0 ? (
        <p>No branches found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Name</th>
                <th className="px-4 py-2 border">Authorized Person</th>
                <th className="px-4 py-2 border">Status</th>
                <th className="px-4 py-2 border">Agreement</th>
                <th className="px-4 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{branch.id}</td>
                  <td className="px-4 py-2 border">{branch.name}</td>
                  <td className="px-4 py-2 border">{branch.authorized_person}</td>
                  <td className="px-4 py-2 border">
                    {branch.active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 border">
                    <a
                      href={branch.agreement_url}
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      View
                    </a>
                  </td>
                  <td className="px-4 py-2 border">
                    <button
                      className="px-3 py-1 bg-yellow-500 text-white rounded"
                      onClick={() => openEditModal(branch)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Modal for Add/Edit Branch */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <Dialog.Title className="text-lg font-bold mb-4">
                {editBranch ? "Edit Branch" : "Add New Branch"}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="branch_name"
                  value={formData.branch_name}
                  onChange={handleChange}
                  placeholder="Branch Name"
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  name="branch_address"
                  value={formData.branch_address}
                  onChange={handleChange}
                  placeholder="Branch Address"
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  name="authorized_person"
                  value={formData.authorized_person}
                  onChange={handleChange}
                  placeholder="Authorized Person"
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  name="branch_pan"
                  value={formData.branch_pan}
                  onChange={handleChange}
                  placeholder="Branch PAN"
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  name="branch_aadhaar"
                  value={formData.branch_aadhaar}
                  onChange={handleChange}
                  placeholder="Branch Aadhaar"
                  className="w-full border p-2 rounded"
                  required
                />
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full border p-2 rounded"
                  accept=".pdf"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {editBranch ? "Update Branch" : "Create Branch"}
                </button>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default BranchesPage;
