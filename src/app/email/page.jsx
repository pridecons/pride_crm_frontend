"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import { axiosInstance } from "@/api/Axios";
import { toast } from "react-hot-toast";
import { Plus, Pencil, Trash, Eye, X } from "lucide-react";
import JoditEditor from "jodit-react";

// Dynamically import EditorContent (SSR safe)
const EditorContent = dynamic(
  () => import("@tiptap/react").then((mod) => mod.EditorContent),
  { ssr: false }
);

// Custom FontSize extension
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      style: {
        default: null,
        renderHTML: (attributes) => {
          return attributes.style ? { style: attributes.style } : {};
        },
      },
    };
  },
});

export default function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    template_type: "employee",
    subject: "",
    body: "",
  });

   const textEditor = useRef(null);
  
    const config = useMemo(() => ({
      readonly: false,
      toolbar: true,
      toolbarSticky: false,
      toolbarAdaptive: false,
      buttons: [
        'bold',
        'italic',
        'underline',
        'strikethrough',
        'eraser',
        '|',
        'ul',
        'ol',
        '|',
        'font',
        'fontsize',
        'brush',
        'highlight',
        '|',
        'align',
        'undo',
        'redo',
      ],
      removeButtons: ['file', 'video'],
      defaultFont: 'Arial',
      defaultFontSizePoints: '14',
      controls: {
      fontsize: {
        list: Jodit.atom(['8px','10px', '12px', '14px', '16px', '18px', '20px', '24px', '36px','40px'])
      }
    },
      style: {
        fontFamily: 'Arial',
        color: '#333333',
        maxHeight:350
      },
    }), []);


  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.get("/email/templates/");
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let resp;
      if (editTemplate) {
        // EDIT
        resp = await axiosInstance.put(
          `/email/templates/${editTemplate.id}`,
          formData
        );
        toast.success("Template updated");
        // update local list
        setTemplates((t) =>
          t.map((tpl) => (tpl.id === resp.data.id ? resp.data : tpl))
        );
      } else {
        // CREATE
        resp = await axiosInstance.post("/email/templates/", formData);
        toast.success("Template created");
        // prepend new template (with its new resp.data.id)
        setTemplates((t) => [resp.data, ...t]);
      }

      // reset + close
      setEditTemplate(null);
      setFormData({
        name: "",
        template_type: "admin", // you can default to whatever makes sense
        subject: "",
        body: "",
      });
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await axiosInstance.delete(`/email/templates/${id}`);
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const openEditModal = (template) => {
    setEditTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject,
      body: template.body,
    });
    setIsModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          Email Templates
        </h1>
        <button
          onClick={() => {
            setEditTemplate(null);
            setFormData({
              name: "",
              template_type: "employee",
              subject: "",
              body: "",
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
        >
          <Plus size={18} /> Add Template
        </button>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 text-gray-700 uppercase text-sm">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Subject</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-6">
                  Loading templates...
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-500">
                  No templates found
                </td>
              </tr>
            ) : (
              templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{template.name}</td>
                  <td className="px-4 py-3 capitalize">
                    {template.template_type}
                  </td>
                  <td className="px-4 py-3">{template.subject}</td>
                  <td className="px-4 py-3 text-center flex justify-center gap-3">
                    <button
                      onClick={() => openEditModal(template)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setPreviewMode(template.body)}
                      className="text-indigo-500 hover:text-indigo-700"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {editTemplate ? "Edit Template" : "Create Template"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="e.g. Welcome Email"
                  required
                />
              </div>

              {/* Template Type */}
              <div>
                <label
                  htmlFor="template_type"
                  className="block text-sm font-medium mb-1"
                >
                  Type
                </label>
                <select
                  id="template_type"
                  name="template_type"
                  value={formData.template_type}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="customer">Customer</option>
                  {/* add more types here as your backend supports them */}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-medium mb-1"
                >
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
                  placeholder="e.g. Hello and welcome!"
                  required
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-sm font-medium mb-1">Body</label>
                <JoditEditor
                  ref={textEditor}
                  value={formData.body}
                  onChange={(value)=>setFormData((prev) => ({ ...prev, "body": value }))}
                  config={config}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editTemplate ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-lg font-semibold mb-4">Preview Template</h2>
            <div
              className="border p-4 rounded text-gray-800 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: previewMode }}
            />
            <div className="text-right mt-4">
              <button
                onClick={() => setPreviewMode(false)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
