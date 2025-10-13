// src/components/PaymentModal.jsx
"use client";

import React, { useState, useEffect } from "react";
import { axiosInstance } from "@/api/Axios";
import { InputField } from "../common/InputField";
import LoadingState from "@/components/LoadingState";
import {
  X,
  Calendar,
  Phone,
  User,
  IndianRupee,
  Link as LinkIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,       // ← NEW
} from "lucide-react";

export default function CreateManualePayment({
  open,
  setOpen,
  name = "",
  phone = "",
  email = "",
  service = "",
  lead_id = null,
}) {
  if (!open) return null;

  const [amount, setAmount] = useState(0);
  const [customerName, setCustomerName] = useState(name);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerPhone, setCustomerPhone] = useState(phone);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const [service_plan, setService_plan] = useState({});
  const [description, setDescription] = useState("");
  const [call, setCall] = useState(2);
  const [duration_day, setDuration_day] = useState(0);

  const [paymentLimit, setPaymentLimit] = useState({
    paid_payments_count: 0,
    remaining_limit: 0,
    total_paid: 0,
    total_paid_limit: 0,
  });

  const remaining = Math.max(0, Number(paymentLimit?.remaining_limit || 0));
  const totalPaid = Number(paymentLimit?.total_paid || 0);
  const totalLimit = Number(paymentLimit?.total_paid_limit || 0);
  const usedPct =
    totalLimit > 0 ? Math.min(100, Math.round((totalPaid / totalLimit) * 100)) : 0;

  useEffect(() => {
    checkPaymentLimit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkPaymentLimit = async () => {
    try {
      if (!lead_id) return;
      const { data } = await axiosInstance.get(`payment/payment-limit/${lead_id}`);
      setPaymentLimit({
        paid_payments_count: Number(data?.paid_payments_count || 0),
        remaining_limit: Number(data?.remaining_limit || 0),
        total_paid: Number(data?.total_paid || 0),
        total_paid_limit: Number(data?.total_paid_limit || 0),
      });
    } catch (err) {
      console.error(err?.response?.data?.detail || err.message);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setResponse(null);
    setLoading(true);

    if (!/^\d{10}$/.test(String(customerPhone || ""))) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }
    if (!(amount > 0)) {
      setError("Amount must be greater than 0.");
      setLoading(false);
      return;
    }
    if (amount > remaining) {
      setError(`Amount exceeds remaining limit (₹${remaining}).`);
      setLoading(false);
      return;
    }
    if (remaining <= 0) {
      setError("No remaining limit available.");
      setLoading(false);
      return;
    }

    try {
      const plan =
        service_plan && service_plan.id
          ? {
              id: service_plan.id,
              name: service_plan.name,
              description: service_plan.description,
              service_type: service_plan.service_type,
              price: service_plan.price,
              discount_percent: service_plan.discount_percent,
              billing_cycle: service_plan.billing_cycle,
              discounted_price: service_plan.discounted_price,
              plan_type: service_plan.plan_type,
            }
          : undefined;

      const payload = {
        lead_id: lead_id ?? null,
        name: customerName || null,
        email: customerEmail || null,
        phone_number: customerPhone,
        paid_amount: Number(amount),
        mode: "MANUAL",
        status: "PAID",
        description: description || null,
        call: call || 0,
        duration_day: duration_day || 0,
        plan,
        generate_invoice: true,
        convert_to_client_on_success: true,
      };

      const { data } = await axiosInstance.post(
        "/manuale/create-payment-and-invoice",
        payload
      );
      setResponse(data);

      // Auto-close after a brief success message
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmount = (value) => {
    const raw = Number(value ?? 0);
    const capped = Math.min(Math.max(raw, 0), remaining || 0);
    setAmount(capped);

    if (!service_plan || !service_plan?.discounted_price) return;

    if (service_plan?.billing_cycle === "CALL") {
      const perCall =
        service_plan?.CALL
          ? Number(service_plan?.discounted_price) / Number(service_plan?.CALL)
          : 0;
      const totalCall = perCall > 0 ? Math.max(0, Math.round(capped / perCall)) : 0;
      setCall(totalCall);
      setDuration_day(0);
    } else {
      setCall(0);
      const daysCount =
        service_plan?.billing_cycle === "MONTHLY"
          ? 30
          : service_plan?.billing_cycle === "YEARLY"
          ? 365
          : 0;
      const perDayPrice = daysCount > 0 ? Number(service_plan?.discounted_price) / daysCount : 0;
      const totalDays = perDayPrice > 0 ? Math.max(0, Math.round(capped / perDayPrice)) : 0;
      setDuration_day(totalDays);
    }
  };

  useEffect(()=>{
    handleAmount(amount)
  },[service_plan])

  const successLike =
    response &&
    ["PAID", "SUCCESS", "CAPTURED", "COMPLETED"].includes(
      String(response.status || "").toUpperCase()
    );

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{
        background:
          "color-mix(in srgb, var(--theme-backdrop, #0b1220) 40%, transparent)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border"
        style={{
          background: "var(--theme-card-bg, #fff)",
          color: "var(--theme-text, #0f172a)",
          borderColor: "var(--theme-border, #e5e7eb)",
        }}
      >
        {/* Header */}
        <div
          className="p-2 px-6"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in srgb, var(--theme-primary,#4f46e5) 92%, transparent), color-mix(in srgb, var(--theme-primary,#4f46e5) 70%, #fff 10%))",
            color: "var(--theme-primary-contrast, #fff)",
          }}
        >
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Payment Dashboard</h2>
              <p
                className="text-sm mt-1"
                style={{ color: "color-mix(in srgb, #fff 80%, transparent)" }}
              >
                Manage payments and generate invoices
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:opacity-80"
              style={{ color: "var(--theme-primary-contrast,#fff)" }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          <div className="p-6 space-y-6" style={{ color: "var(--theme-text)" }}>
            {/* SUCCESS ALERT */}
            {successLike && (
              <div
                className="p-3 rounded-lg border flex items-start gap-3"
                style={{
                  background: "color-mix(in srgb, var(--theme-success,#16a34a) 10%, #fff)",
                  borderColor: "color-mix(in srgb, var(--theme-success,#16a34a) 40%, transparent)",
                }}
              >
                <CheckCircle2
                  size={18}
                  style={{ color: "var(--theme-success,#16a34a)", marginTop: 2 }}
                />
                <div className="text-sm">
                  <div className="font-semibold" style={{ color: "var(--theme-text)" }}>
                    Payment created successfully!
                  </div>
                  <div className="mt-1" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Payment ID: <b>{response.payment_id}</b> • Status:{" "}
                    <b>{String(response.status).toUpperCase()}</b> • Invoice queued:{" "}
                    <b>{String(response.invoice_enqueued)}</b>
                  </div>
                  {response.message && (
                    <div className="mt-1" style={{ color: "var(--theme-muted,#64748b)" }}>
                      {response.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LIMIT PANEL */}
            <div
              className="rounded-xl p-4"
              style={{
                background: "var(--theme-surface,#ffffff)",
                border: "1px solid var(--theme-border,#e5e7eb)",
              }}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm" style={{ color: "var(--theme-muted,#64748b)" }}>
                  The user has paid{" "}
                  <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                    ₹{totalPaid}
                  </span>{" "}
                  so far. The total limit is{" "}
                  <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                    ₹{totalLimit}
                  </span>
                  . The remaining amount is{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--theme-success,#16a34a)" }}
                  >
                    ₹{remaining}
                  </span>
                  .
                </div>
                <div className="text-xs" style={{ color: "var(--theme-muted,#64748b)" }}>
                  Number of Paid Payments:{" "}
                  <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                    {paymentLimit.paid_payments_count}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--theme-muted-200,#f1f5f9)" }}
                >
                  <div
                    className="h-2"
                    style={{
                      width: `${usedPct}%`,
                      background: "var(--theme-success,#16a34a)",
                    }}
                  />
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--theme-muted,#64748b)" }}>
                  {usedPct}% used
                </div>
              </div>

              {remaining <= 0 && (
                <div
                  className="mt-3 text-sm flex items-center gap-2"
                  style={{ color: "var(--theme-danger,#dc2626)" }}
                >
                  <AlertTriangle size={16} /> Limit exhausted. New payment cannot be generated.
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="rounded-xl p-4" style={{ background: "var(--theme-panel,#f8fafc)" }}>
              <h3
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--theme-text)" }}
              >
                <User size={18} />
                Customer Information
              </h3>

              <ServiceCard
                selectService={service_plan}
                setSelectService={(val) => {
                  setService_plan(val);
                  setCall(val?.CALL || 0);
                  if (val?.discounted_price) {
                    setAmount(Math.min(val.discounted_price, remaining || val.discounted_price));
                    handleAmount(Math.min(val.discounted_price, remaining || val.discounted_price))
                  }
                  setDuration_day(
                    val?.billing_cycle === "MONTHLY"
                      ? 30
                      : val?.billing_cycle === "YEARLY"
                      ? 365
                      : 0
                  );
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <InputField label="Full Name" value={customerName} setValue={setCustomerName} disabled={!!name} />
                <InputField
                  label="Email Address"
                  value={customerEmail}
                  setValue={setCustomerEmail}
                  placeholder="customer@example.com"
                  disabled={!!email}
                />
                <InputField
                  label="Phone Number"
                  value={customerPhone}
                  setValue={setCustomerPhone}
                  placeholder="10-digit number"
                  type="number"
                  disabled
                />
                {Array.isArray(service_plan?.service_type) &&
                  service_plan?.service_type.length > 0 && (
                    <div className="md:col-span-2">
                      <label
                        className="block text-sm font-medium mb-2"
                        style={{ color: "var(--theme-text)" }}
                      >
                        Service Types Available
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {service_plan.service_type.map((stype) => (
                          <span
                            key={stype}
                            className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border"
                            style={{
                              background:
                                "color-mix(in srgb, var(--theme-primary,#4f46e5) 7%, var(--theme-card-bg,#fff))",
                              color: "var(--theme-primary,#4f46e5)",
                              borderColor:
                                "color-mix(in srgb, var(--theme-primary,#4f46e5) 30%, transparent)",
                            }}
                          >
                            {stype}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                <InputField
                  label="Description"
                  value={description}
                  setValue={setDescription}
                  placeholder="Product or service details"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="grid grid-cols-12 gap-4">
              {/* Payment Amount */}
              <div className="col-span-12 md:col-span-8">
                <div
                  className="rounded-xl p-3 shadow-sm border"
                  style={{
                    background:
                      "color-mix(in srgb, var(--theme-success,#16a34a) 8%, var(--theme-card-bg,#fff))",
                    borderColor:
                      "color-mix(in srgb, var(--theme-success,#16a34a) 30%, var(--theme-border,#e5e7eb))",
                  }}
                >
                  <h3
                    className="text-lg font-semibold mb-2 flex items-center"
                    style={{ color: "var(--theme-text)" }}
                  >
                    <span
                      className="rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm"
                      style={{
                        background: "var(--theme-success,#16a34a)",
                        color: "var(--theme-on-success,#fff)",
                      }}
                    >
                      <IndianRupee size={14} />
                    </span>
                    Payment Amount
                  </h3>
                  <div className="relative">
                    <span
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-semibold"
                      style={{ color: "var(--theme-muted,#64748b)" }}
                    >
                      <IndianRupee size={16} />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      max={remaining}
                      value={amount === 0 ? "" : amount}
                      onChange={(e) => handleAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 rounded-lg text-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                      style={{
                        border: "2px solid var(--theme-border,#e5e7eb)",
                        background: "var(--theme-card-bg,#fff)",
                        color: "var(--theme-text)",
                        outline: "none",
                        boxShadow: "0 0 0 0 rgba(0,0,0,0)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.boxShadow =
                          "0 0 0 3px color-mix(in srgb, var(--theme-success,#16a34a) 25%, transparent)")
                      }
                      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                      placeholder={`0.00 (Max ₹${remaining})`}
                      disabled={remaining <= 0}
                      onWheel={(e) => e.target.blur()}
                    />
                  </div>
                  {amount > remaining && (
                    <p className="mt-2 text-sm" style={{ color: "var(--theme-danger,#dc2626)" }}>
                      Amount remaining (₹{remaining}) cannot be exceeded.
                    </p>
                  )}
                </div>
              </div>

              {/* Duration/Call Field */}
              <div className="col-span-12 md:col-span-4">
                <div
                  className="rounded-xl p-3 shadow-sm border h-full"
                  style={{
                    background:
                      "color-mix(in srgb, var(--theme-primary,#4f46e5) 7%, var(--theme-card-bg,#fff))",
                    borderColor:
                      "color-mix(in srgb, var(--theme-primary,#4f46e5) 25%, var(--theme-border,#e5e7eb))",
                  }}
                >
                  {service_plan?.billing_cycle === "CALL" ? (
                    <div>
                      <label
                        className="text-lg font-semibold mb-2 flex items-center gap-2"
                        style={{ color: "var(--theme-text)" }}
                      >
                        <Phone size={16} /> Call
                      </label>
                      <input
                        type="number"
                        value={call}
                        onChange={(e) => setCall(e.target.value)}
                        placeholder="****"
                        disabled
                        className="w-full px-4 py-2 rounded-lg text-lg font-medium cursor-not-allowed"
                        style={{
                          border: "2px solid var(--theme-border,#e5e7eb)",
                          background: "var(--theme-muted-100,#f1f5f9)",
                          color: "var(--theme-muted,#64748b)",
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        className="text-lg font-semibold mb-2 gap-2 flex items-center"
                        style={{ color: "var(--theme-text)" }}
                      >
                        <Calendar size={16} />
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        value={duration_day}
                        onChange={(e) => setDuration_day(e.target.value)}
                        placeholder="****"
                        disabled
                        className="w-full px-4 py-2 rounded-lg text-lg font-medium cursor-not-allowed"
                        style={{
                          border: "2px solid var(--theme-border,#e5e7eb)",
                          background: "var(--theme-muted-100,#f1f5f9)",
                          color: "var(--theme-muted,#64748b)",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm" style={{ color: "var(--theme-text)" }}>
              The user has already paid ₹{totalPaid} out of a total limit of ₹{totalLimit}. Now the client
              can only pay up to ₹{remaining}, not more than that.
            </p>

            {/* Actions */}
            <div
              className="flex justify-end gap-3 pt-4 border-t"
              style={{ borderColor: "var(--theme-border,#e5e7eb)" }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-6 py-3 rounded-lg"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 rounded-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                style={{
                  background: "var(--theme-primary,#4f46e5)",
                  color: "var(--theme-primary-contrast,#fff)",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} /> Creating...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} /> Generate
                  </>
                )}
              </button>
            </div>

            {/* ERROR BLOCK */}
            {error && (
              <div className="mt-3 text-sm" style={{ color: "var(--theme-danger,#dc2626)" }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function ServiceCard({ selectService = {}, setSelectService = () => {} }) {
  const [service_plan, setService_plan] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get("/services/");
        setService_plan(data);
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handleSelect = (service) => {
    setSelectService(service);
  };

  if (loading) {
    return <LoadingState message="Fetching services..." />;
  }

  return (
    <div className="scroll-container w-full flex flex-row gap-6 mt-8 pb-2 z-50">
      {Array.isArray(service_plan) &&
        service_plan?.map((service) => (
          <div
            key={service.id}
            onClick={() => handleSelect(service)}
            className="relative rounded-2xl p-4 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 border-2"
            style={{
              background:
                selectService?.id === service.id
                  ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 8%, var(--theme-card-bg,#fff))"
                  : "var(--theme-card-bg,#fff)",
              borderColor:
                selectService?.id === service.id
                  ? "var(--theme-primary,#4f46e5)"
                  : "var(--theme-border,#e5e7eb)",
              boxShadow:
                selectService?.id === service.id
                  ? "0 8px 20px -8px color-mix(in srgb, var(--theme-primary,#4f46e5) 45%, transparent)"
                  : undefined,
            }}
          >
            {selectService?.id === service.id && (
              <div
                className="absolute -top-2 -right-2 text-xs px-3 py-1 rounded-full font-medium shadow-md"
                style={{
                  background: "var(--theme-primary,#4f46e5)",
                  color: "var(--theme-primary-contrast,#fff)",
                }}
              >
                Selected
              </div>
            )}

            <div className="mt-1">
              <div className="flex justify-between">
                <h3
                  className="text-lg font-bold mb-2 leading-tight"
                  style={{ color: "var(--theme-text)" }}
                >
                  {service.name}
                </h3>

                {service.discount_percent > 0 && (
                  <div
                    className="text-white text-xs px-2 py-1 rounded-md font-bold"
                    style={{ background: "var(--theme-danger,#dc2626)" }}
                  >
                    {service.discount_percent}% OFF
                  </div>
                )}
              </div>

              <p
                className="text-sm mb-3 leading-relaxed line-clamp-2"
                style={{ color: "var(--theme-muted,#64748b)" }}
              >
                {service.description}
              </p>

              <div className="mb-2 p-2 rounded-lg" style={{ background: "var(--theme-panel,#f8fafc)" }}>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold" style={{ color: "var(--theme-text)" }}>
                    ₹{service.discounted_price}
                  </span>
                  {service.discount_percent > 0 && (
                    <span className="text-sm line-through" style={{ color: "var(--theme-muted,#94a3b8)" }}>
                      ₹{service.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--theme-muted,#64748b)" }}>Billing:</span>
                <span className="font-semibold" style={{ color: "var(--theme-text)" }}>
                  {service.billing_cycle}
                  {service.billing_cycle === "CALL" && service.CALL && (
                    <span className="ml-1" style={{ color: "var(--theme-muted,#94a3b8)" }}>
                      ({service.CALL})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
