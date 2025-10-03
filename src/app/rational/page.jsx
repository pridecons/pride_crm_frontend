"use client";
import * as XLSX from "xlsx";
import React, { useEffect, useState } from "react";
import { axiosInstance, BASE_URL } from "@/api/Axios";
import {
  Calendar,
  FileDown,
  FileSpreadsheet,
  ChevronDown,
} from "lucide-react";
import { usePermissions } from "@/context/PermissionsContext";
import ExportXlsxModal from "@/components/Rational/ExportXlsxModal";
import RationalModal from "@/components/Rational/RationalModal";
import AnalyticsDashboard from "@/components/Rational/AnalyticsDashboard";
import RationalTable from "@/components/Rational/RationalTable";
import ExportPdfModal from "@/components/Rational/pdf_export";
import { useTheme } from "@/context/ThemeContext";
// import { CompactThemeToggle } from "@/components/ThemeToggle"; // optional quick switch

const API_URL = "/recommendations/";

export default function RationalPage() {
  const { hasPermission } = usePermissions();
  const { themeConfig } = useTheme();

  const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [rationalList, setRationalList] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showXlsxModal, setShowXlsxModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalImage, setModalImage] = useState(null);
  const [imageError, setImageError] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    stock_name: "",
    entry_price: "",
    stop_loss: "",
    targets: "",
    targets2: "",
    targets3: "",
    rational: "",
    recommendation_type: [],
    graph: null,
    message: "",
    templateId: "",
    sent_on_msg: { SMS: true, whatsapp: true, Email: false },
    planType: "",
  });

  const [selectedDate, setSelectedDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const handlePdfClick = () => {
    setIsOpen(false);
    setShowPdfModal(true);
  };

  const [excelFrom, setExcelFrom] = useState("");
  const [excelTo, setExcelTo] = useState("");

  const handleXlsxClick = () => {
    setIsOpen(false);
    setShowXlsxModal(true);
  };

  const handleClickOutside = () => setIsOpen(false);

  useEffect(() => {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      setDateTo(dateFrom);
    }
  }, [dateFrom, dateTo]);

  const fetchRationals = async (params = {}) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(API_URL, {
        params: { limit: 100, offset: 0, _ts: Date.now(), ...params },
        headers: { "Cache-Control": "no-cache" },
      });
      setRationalList(res.data);
    } catch (err) {
      console.error("Failed to load rationals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRationals();
  }, []);

  useEffect(() => {
    const close = () => {
      if (openStatusDropdown !== null) setOpenStatusDropdown(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openStatusDropdown]);

  const handleApplyDates = async () => {
    if (!dateFrom && !dateTo) {
      fetchRationals();
      return;
    }
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    await fetchRationals(params);
  };

  const openModal = (item = null) => {
    if (item) {
      setEditId(item.id);
      setIsEditMode(true);
      const recommendationArray = Array.isArray(item.recommendation_type)
        ? item.recommendation_type
        : item.recommendation_type
        ? [String(item.recommendation_type)]
        : [];
      setFormData({
        stock_name: item.stock_name || "",
        entry_price: item.entry_price ?? "",
        stop_loss: item.stop_loss ?? "",
        targets: item.targets ?? "",
        targets2: item.targets2 ?? "",
        targets3: item.targets3 ?? "",
        rational: item.rational || "",
        recommendation_type: recommendationArray,
        graph: item.graph || null,
        status: item.status || "OPEN",
        message: item.message || "",
        templateId: item?.template_id ? String(item.template_id) : "",
        sent_on_msg: { SMS: true, whatsapp: true, Email: false },
        planType: item?.plan_type ? String(item.plan_type) : "",
      });
    } else {
      setEditId(null);
      setIsEditMode(false);
      setFormData({
        stock_name: "",
        entry_price: "",
        stop_loss: "",
        targets: "",
        targets2: "",
        targets3: "",
        rational: "",
        recommendation_type: [],
        graph: null,
        status: "OPEN",
        message: "",
        templateId: "",
        sent_on_msg: { SMS: true, whatsapp: true, Email: false },
        planType: "",
      });
    }
    setImageError("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (name === "recommendation_type") {
      const selected = Array.from(
        e.target.selectedOptions,
        (option) => option.value
      );
      setFormData((prev) => ({ ...prev, [name]: selected }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "number" ? (value === "" ? "" : Number(value)) : value,
      }));
    }
  };

  const handleExport = async () => {
    try {
      const response = await axiosInstance.get("/recommendations");
      const data = response.data;
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "recommendations");
      XLSX.writeFile(workbook, "recommendations-export.xlsx");
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axiosInstance.put(
        `/recommendations/status/${id}?status_update=${newStatus}`
      );
      await fetchRationals();
      setOpenStatusDropdown(null);
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const openImageModal = (path) => {
    setModalImage(`${BASE_URL}${encodeURI(path)}`);
  };

  const closeModal = () => setModalImage(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setImageError("");
    const {
      stock_name,
      entry_price,
      stop_loss,
      targets,
      targets2,
      targets3,
      rational,
      recommendation_type,
      graph,
      status,
      message,
      templateId,
      sent_on_msg,
      planType,
    } = formData;

    if (!Array.isArray(recommendation_type) || recommendation_type.length === 0) {
      alert("Please select at least one Recommendation Type.");
      return;
    }

    try {
      if (editId) {
        const isNewImage = formData.graph instanceof File;
        if (isNewImage) {
          const fd = new FormData();
          fd.append("stock_name", String(stock_name ?? "").trim());
          fd.append(
            "entry_price",
            entry_price === "" ? "" : String(Number(entry_price))
          );
          fd.append(
            "stop_loss",
            stop_loss === "" ? "" : String(Number(stop_loss))
          );
          fd.append("targets", targets === "" ? "" : String(Number(targets)));
          fd.append(
            "targets2",
            targets2 === "" ? "0" : String(Number(targets2))
          );
          fd.append(
            "targets3",
            targets3 === "" ? "0" : String(Number(targets3))
          );
          fd.append("rational", String(rational ?? "").trim());
          fd.append("status", status || "OPEN");
          fd.append("message", message || "");
          fd.append("templateId", templateId || "");
          fd.append("planType", planType || "");
          fd.append("sent_on_msg", JSON.stringify(sent_on_msg || {}));
          (recommendation_type || [])
            .filter(Boolean)
            .forEach((rt) => fd.append("recommendation_type", rt));
          fd.append("graph", formData.graph);
          await axiosInstance.put(`${API_URL}${editId}/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          const payload = {
            stock_name: String(stock_name ?? "").trim(),
            entry_price: entry_price === "" ? null : Number(entry_price),
            stop_loss: stop_loss === "" ? null : Number(stop_loss),
            targets: targets === "" ? null : Number(targets),
            targets2: targets2 === "" ? 0 : Number(targets2),
            targets3: targets3 === "" ? 0 : Number(targets3),
            rational: String(rational ?? "").trim(),
            status: status || "OPEN",
            recommendation_type,
            message,
            templateId,
            sent_on_msg: sent_on_msg || {},
            planType,
          };
          await axiosInstance.put(`${API_URL}${editId}/`, payload, {
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        if (entry_price === "" || stop_loss === "" || targets === "") {
          alert("Entry Price, Stop Loss, and Target 1 are required.");
          return;
        }
        const fd = new FormData();
        const toNum = (v, def = "") => {
          if (v === "" || v === undefined || v === null) return def;
          const n = Number(v);
          return Number.isFinite(n) ? String(n) : def;
        };
        fd.append("stock_name", (stock_name ?? "").trim());
        fd.append("entry_price", toNum(entry_price));
        fd.append("stop_loss", toNum(stop_loss));
        fd.append("targets", toNum(targets));
        fd.append("targets2", toNum(targets2, "0"));
        fd.append("targets3", toNum(targets3, "0"));
        fd.append("rational", (rational ?? "").trim());
        fd.append("status", status || "OPEN");
        fd.append("message", message || "");
        fd.append("templateId", templateId || "");
        fd.append("planType", planType || "");
        fd.append("sent_on_msg", JSON.stringify(sent_on_msg || {}));
        (recommendation_type || [])
          .filter(Boolean)
          .forEach((rt) => fd.append("recommendation_type", rt));
        if (formData.graph instanceof File) fd.append("graph", formData.graph);
        await axiosInstance.post(API_URL, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          transformRequest: [(d) => d],
        });
      }

      setIsModalOpen(false);
      await fetchRationals();
    } catch (err) {
      console.error("Submit failed:", err?.response?.data || err);
      const msg = err?.response?.data?.detail
        ? JSON.stringify(err.response.data.detail)
        : "Submit failed. Please check console for details.";
      alert(msg);
    }
  };

  const filteredData = rationalList.filter((item) =>
    (item.stock_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusOptions = [
    { label: "OPEN", value: "OPEN" },
    { label: "TARGET1", value: "TARGET1_HIT" },
    { label: "TARGET2", value: "TARGET2_HIT" },
    { label: "TARGET3", value: "TARGET3_HIT" },
    { label: "STOP_LOSS", value: "STOP_LOSS_HIT" },
    { label: "CLOSED", value: "CLOSED" },
  ];

  const openCorrection = (item) => {
    const recommendationArray = Array.isArray(item.recommendation_type)
      ? item.recommendation_type
      : item.recommendation_type
      ? [String(item.recommendation_type)]
      : [];

    setEditId(null);
    setIsEditMode(false);
    setFormData({
      stock_name: item.stock_name || "",
      entry_price: item.entry_price ?? "",
      stop_loss: item.stop_loss ?? "",
      targets: item.targets ?? "",
      targets2: item.targets2 ?? "",
      targets3: item.targets3 ?? "",
      rational: item.rational || "",
      recommendation_type: recommendationArray,
      graph: item.graph || null,
      status: item.status || "OPEN",
      message: "",
      templateId: item?.template_id ? String(item.template_id) : "",
      sent_on_msg: { SMS: true, whatsapp: true, Email: false },
      planType: item?.plan_type ? String(item.plan_type) : "",
    });

    setImageError("");
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[var(--theme-background)] text-[var(--theme-text)] p-4 sm:p-6 lg:p-8">
      <div className="mx-2">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-center sm:items-start lg:justify-between mb-6 gap-3">
          {/* Search */}
          <div className="flex sm:items-center gap-4 w-full">
            <div className="relative w-full sm:w-64">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--theme-text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by stock name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 border border-[var(--theme-border)] rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] bg-[var(--theme-input-background)] placeholder-[var(--theme-text-muted)]"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row gap-3 mt-2 md:mt-0">
            {/* optional quick theme switcher */}
            {/* <CompactThemeToggle /> */}

            <div className="relative inline-block text-left">
              {hasPermission("rational_download") && (
                <button
                  onClick={() => setIsOpen((prev) => !prev)}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors border border-[var(--theme-border)]"
                  style={{
                    backgroundColor: "var(--theme-primary)",
                    color: "var(--theme-primary-contrast)",
                  }}
                >
                  Download
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}

              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={handleClickOutside}
                  />
                  <div
                    className="absolute right-0 mt-2 w-44 rounded-lg shadow-lg z-50 border"
                    style={{
                      background: "var(--theme-card-bg)",
                      borderColor: "var(--theme-border)",
                      boxShadow: `0 10px 25px ${themeConfig.shadow}`,
                    }}
                  >
                    <div className="divide-y"
                      style={{ borderColor: "var(--theme-border)" }}>
                      <button
                        className="w-full px-4 py-2 flex items-center gap-2 text-left transition-colors hover:opacity-90"
                        onClick={handlePdfClick}
                        style={{ color: "var(--theme-text)" }}
                      >
                        <FileDown size={16} />
                        Download PDF
                      </button>
                      <button
                        className="w-full px-4 py-2 flex items-center gap-2 text-left transition-colors hover:opacity-90"
                        onClick={handleXlsxClick}
                        style={{ color: "var(--theme-text)" }}
                      >
                        <FileSpreadsheet size={16} />
                        Download XLSX
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {showPdfModal && (
              <ExportPdfModal
                onClose={() => setShowPdfModal(false)}
                open={showPdfModal}
              />
            )}
            {showXlsxModal && (
              <ExportXlsxModal
                onClose={() => setShowXlsxModal(false)}
                open={showXlsxModal}
              />
            )}

            {hasPermission("rational_add_recommadation") && (
              <div>
                <button
                  onClick={() => openModal()}
                  className="px-4 py-2 rounded-md w-auto whitespace-nowrap transition-colors"
                  style={{
                    background: "var(--theme-success)",
                    color: "var(--theme-on-success, #fff)",
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Recommendation
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Date toolbar */}
        <div className="flex flex-col lg:flex-row items-center gap-4 sm:items-start mb-6 rounded-2xl shadow-md p-4 border"
             style={{
               background: "var(--theme-card-bg)",
               borderColor: "var(--theme-border)",
             }}>
          {/* From */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "var(--theme-accent)" }} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-4 py-2 rounded-lg shadow-sm w-40 focus:outline-none focus:ring-2 border"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
                boxShadow: "none",
              }}
            />
          </div>

          <div className="text-[var(--theme-text)] text-3xl font-medium">-</div>

          {/* To */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: "var(--theme-accent)" }} />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-4 py-2 rounded-lg shadow-sm w-40 focus:outline-none focus:ring-2 border"
              style={{
                background: "var(--theme-input-background)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border)",
                boxShadow: "none",
              }}
            />
          </div>

          {/* Clear */}
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              fetchRationals();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors border"
            style={{
              background: "var(--theme-surface)",
              color: "var(--theme-text)",
              borderColor: "var(--theme-border)",
            }}
          >
            Clear
          </button>

          {/* Apply */}
          <button
            type="button"
            onClick={handleApplyDates}
            className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            style={{
              background: "var(--theme-primary)",
              color: "var(--theme-primary-contrast)",
            }}
            disabled={!dateFrom && !dateTo}
          >
            Apply
          </button>
        </div>

        {/* Table + Analytics */}
        <RationalTable
          rationalList={rationalList}
          filteredData={filteredData}
          openModal={openModal}
          openImageModal={openImageModal}
          openStatusDropdown={openStatusDropdown}
          setOpenStatusDropdown={setOpenStatusDropdown}
          handleStatusChange={handleStatusChange}
          statusOptions={statusOptions}
          onCorrection={openCorrection}
        />

        <AnalyticsDashboard />
      </div>

      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4"
             style={{ background: "var(--theme-backdrop)" }}>
          <div
            className="rounded-xl overflow-hidden shadow-lg max-w-3xl w-full mx-auto border"
            style={{
              background: "var(--theme-card-bg)",
              borderColor: "var(--theme-border)",
            }}
          >
            <div
              className="flex justify-between items-center p-4 border-b"
              style={{ borderColor: "var(--theme-border)" }}
            >
              <h2 className="text-lg font-semibold text-[var(--theme-text)]">
                Graph Preview
              </h2>
              <button
                onClick={closeModal}
                className="text-xl"
                style={{ color: "var(--theme-text-muted)" }}
              >
                &times;
              </button>
            </div>
            <div className="p-4">
              <img
                src={modalImage}
                alt="Graph"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <RationalModal
        isEditMode={isEditMode}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        formData={formData}
        setFormData={setFormData}
        editId={editId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        imageError={imageError}
        setImageError={setImageError}
        openDropdown={openDropdown}
        setOpenDropdown={setOpenDropdown}
      />
    </div>
  );
}