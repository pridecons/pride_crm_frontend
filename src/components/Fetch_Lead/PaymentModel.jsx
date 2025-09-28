// src/components/PaymentModal.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "@/api/Axios";
import { InputField } from "../common/InputField";
import LoadingState from "../LoadingState";
import {
  // layout
  ChevronUp,
  ChevronDown,
  X,

  // sections
  Camera,
  CreditCard,
  Wallet,
  Landmark,
  Smartphone,
  Building2,
  BadgeDollarSign,
  Calendar,
  Phone,
  User,
  IndianRupee,

  // actions
  Download,
  Link as LinkIcon,
  Share2,
  Copy,
  Check,
  CheckCircle2,

  // state
  AlertTriangle,
  Loader2,
  Inbox,
  BarChart3,
} from "lucide-react";

const PAYMENT_METHODS = [
  { code: "cc", label: "Credit Card", icon: CreditCard, category: "card" },
  { code: "dc", label: "Debit Card", icon: CreditCard, category: "card" },
  { code: "ccc", label: "Corporate Credit Card", icon: Building2, category: "card" },
  { code: "ppc", label: "Prepaid Card", icon: CreditCard, category: "card" },
  { code: "nb", label: "Net Banking", icon: Landmark, category: "bank" },
  { code: "upi", label: "UPI", icon: Smartphone, category: "digital" },
  { code: "paypal", label: "PayPal", icon: Wallet, category: "digital" },
  { code: "app", label: "App Wallet", icon: Wallet, category: "digital" },
  { code: "paylater", label: "Pay Later", icon: BadgeDollarSign, category: "credit" },
  { code: "cardlessemi", label: "Cardless EMI", icon: BadgeDollarSign, category: "credit" },
  { code: "dcemi", label: "Debit Card EMI", icon: CreditCard, category: "credit" },
  { code: "ccemi", label: "Credit Card EMI", icon: CreditCard, category: "credit" },
  { code: "banktransfer", label: "Bank Transfer", icon: Landmark, category: "bank" },
];

const TAB_OPTIONS = [
  { name: "Check Payment", value: "check_payment", icon: Camera },
  { name: "Generate Payment Link", value: "generate_link", icon: LinkIcon },
];

export default function PaymentModal({
  open,
  setOpen,
  name = "",
  phone = "",
  email = "",
  service = "",
  lead_id = null,
}) {
  const [selectOption, setSelectOption] = useState("check_payment");
  if (!open) return null;

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
                Manage payments and generate links
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

        {/* Tabs */}
        <div
          className="border-b"
          style={{ borderColor: "var(--theme-border, #e5e7eb)" }}
        >
          <nav className="flex">
            {TAB_OPTIONS.map((opt) => {
              const IconComp = opt.icon;
              const active = selectOption === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectOption(opt.value)}
                  className="flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors inline-flex items-center justify-center gap-2"
                  style={{
                    borderColor: active
                      ? "var(--theme-primary,#4f46e5)"
                      : "transparent",
                    color: active
                      ? "var(--theme-primary,#4f46e5)"
                      : "var(--theme-muted,#64748b)",
                    background: active
                      ? "color-mix(in srgb, var(--theme-primary,#4f46e5) 7%, var(--theme-card-bg,#fff))"
                      : "transparent",
                  }}
                >
                  <IconComp size={16} />
                  {opt.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {selectOption === "generate_link" && (
            <CreatePaymentLink
              name={name}
              phone={phone}
              email={email}
              service={service}
              setOpen={setOpen}
              lead_id={lead_id}
            />
          )}
          {selectOption === "check_payment" && <CheckPayment phone={phone} />}
        </div>
      </div>
    </div>
  );
}

const CreatePaymentLink = ({
  name = "",
  phone = "",
  email = "",
  service = "",
  setOpen,
  lead_id = null,
}) => {
  const [amount, setAmount] = useState(0);
  const [customerName, setCustomerName] = useState(name);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerPhone, setCustomerPhone] = useState(phone);

  const [allowAll, setAllowAll] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState(
    PAYMENT_METHODS.map((m) => m.code)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [copied, setCopied] = useState(false);

  const [service_plan, setService_plan] = useState({});
  const [selectService, setSelectService] = useState(service);
  const [description, setDescription] = useState("");
  const [call, setCall] = useState(2);
  const [duration_day, setDuration_day] = useState(0);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState([]);
  const [isOpentPaymentMode, setIsOpentPaymentMode] = useState(false);
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

  const toggleMethod = (code) => {
    setSelectedMethods((prev) => {
      const upd = prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code];
      setAllowAll(upd.length === PAYMENT_METHODS.length);
      return upd;
    });
  };

  const handleSelectAll = () => {
    if (allowAll) {
      setSelectedMethods([]);
      setAllowAll(false);
    } else {
      setSelectedMethods(PAYMENT_METHODS.map((m) => m.code));
      setAllowAll(true);
    }
  };

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
    setLoading(true);

    if (!/^\d{10}$/.test(customerPhone)) {
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
      const payload = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        service: selectService,
        amount: amount,
        payment_methods: allowAll ? "" : selectedMethods.join(","),
        call: call,
        duration_day: duration_day,
        service_id: service_plan?.id,
        description: description,
        lead_id: lead_id,
        service_types: selectedServiceTypes,
      };

      const { data } = await axiosInstance.post("/payment/create-order", payload);
      setResponse(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const link = response?.cashfreeResponse?.payment_link;
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const grouped = PAYMENT_METHODS.reduce((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  const labels = {
    card: { icon: CreditCard, text: "Cards" },
    bank: { icon: Landmark, text: "Banking" },
    digital: { icon: Wallet, text: "Digital Wallets" },
    credit: { icon: BadgeDollarSign, text: "Credit & EMI" },
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
      const daysCount = service_plan?.billing_cycle === "MONTHLY" ? 30 : 365;
      const perDayPrice = daysCount > 0 ? Number(service_plan?.discounted_price) / daysCount : 0;
      const totalDays =
        perDayPrice > 0 ? Math.max(0, Math.round(capped / perDayPrice)) : 0;
      setDuration_day(totalDays);
    }
  };

  return (
    <div className="p-6 space-y-6" style={{ color: "var(--theme-text)" }}>
      {/* If No Payment Link */}
      {!response?.cashfreeResponse?.payment_link && (
        <>
          {/* LIMIT PANEL */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--theme-surface,#ffffff)",
              border: "1px solid var(--theme-border,#e5e7eb)",
            }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div
                className="text-sm"
                style={{ color: "var(--theme-muted,#64748b)" }}
              >
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
              <div
                className="text-xs"
                style={{ color: "var(--theme-muted,#64748b)" }}
              >
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
              <div
                className="mt-1 text-xs"
                style={{ color: "var(--theme-muted,#64748b)" }}
              >
                {usedPct}% used
              </div>
            </div>

            {/* Hard stop note */}
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
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--theme-panel,#f8fafc)" }}
          >
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
                setCall(val?.CALL);
                setAmount(val?.discounted_price);
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
                  />
                </div>
                {amount > remaining && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: "var(--theme-danger,#dc2626)" }}
                  >
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

          {/* Payment Methods */}
          <div
            className="rounded-xl p-4 space-y-4"
            style={{
              background:
                "color-mix(in srgb, var(--theme-primary,#4f46e5) 6%, var(--theme-card-bg,#fff))",
            }}
          >
            <div className="flex justify-between items-center">
              <h3
                className="text-lg font-semibold gap-2 flex items-center mb-4"
                style={{ color: "var(--theme-text)" }}
              >
                <CreditCard size={18} /> Payment Methods
              </h3>
              <button
                onClick={() => setIsOpentPaymentMode((val) => !val)}
                className="rounded-full p-1 hover:opacity-80"
                style={{ color: "var(--theme-muted,#64748b)" }}
                aria-label="Toggle Payment Methods"
              >
                {isOpentPaymentMode ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>

            {isOpentPaymentMode && (
              <>
                <label className="inline-flex items-center mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5"
                    checked={allowAll}
                    onChange={handleSelectAll}
                    style={{
                      accentColor: "var(--theme-primary,#4f46e5)",
                    }}
                  />
                  <span
                    className="ml-3 font-medium"
                    style={{ color: "var(--theme-text)" }}
                  >
                    Enable All Payment Methods
                  </span>
                </label>

                {Object.entries(grouped).map(([cat, methods]) => (
                  <div
                    key={cat}
                    className="rounded-lg p-3 border"
                    style={{
                      background: "var(--theme-card-bg,#fff)",
                      borderColor: "var(--theme-border,#e5e7eb)",
                    }}
                  >
                    <h4
                      className="text-sm font-semibold mb-3 flex items-center gap-2"
                      style={{ color: "var(--theme-muted,#64748b)" }}
                    >
                      {React.createElement(labels[cat].icon, { size: 14 })}
                      {labels[cat].text}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {methods.map((m) => {
                        const MIcon = m.icon;
                        return (
                          <label
                            key={m.code}
                            className="inline-flex items-center p-2 rounded-lg cursor-pointer transition"
                            style={{
                              border: "1px solid var(--theme-border,#e5e7eb)",
                              background: "var(--theme-card-bg,#fff)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "color-mix(in srgb, var(--theme-primary,#4f46e5) 5%, var(--theme-card-bg,#fff))")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                "var(--theme-card-bg,#fff)")
                            }
                          >
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              style={{
                                accentColor: "var(--theme-primary,#4f46e5)",
                              }}
                              checked={selectedMethods.includes(m.code)}
                              onChange={() => toggleMethod(m.code)}
                            />
                            <span className="ml-3 flex items-center" style={{ color: "var(--theme-text)" }}>
                              <MIcon size={16} className="mr-2" />
                              {m.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg p-4 flex items-start gap-3 border"
              style={{
                background: "color-mix(in srgb, var(--theme-danger,#dc2626) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--theme-danger,#dc2626) 40%, transparent)",
                color: "var(--theme-danger,#dc2626)",
              }}
            >
              <AlertTriangle size={20} />
              <div>
                <h4 className="font-medium">Error</h4>
                <p className="text-sm mt-1" style={{ color: "var(--theme-danger,#dc2626)" }}>
                  {error}
                </p>
              </div>
            </div>
          )}

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
        </>
      )}

      {/* If Payment Link Generated */}
      {response?.cashfreeResponse?.payment_link && (
        <div className="space-y-6">
          {/* Payment Link */}
          <div
            className="rounded-lg p-4 border"
            style={{
              background:
                "color-mix(in srgb, var(--theme-success,#16a34a) 10%, var(--theme-card-bg,#fff))",
              borderColor:
                "color-mix(in srgb, var(--theme-success,#16a34a) 35%, var(--theme-border,#e5e7eb))",
            }}
          >
            <h4
              className="font-medium mb-3 flex items-center gap-2"
              style={{ color: "var(--theme-success,#16a34a)" }}
            >
              <CheckCircle2 size={18} /> Payment Link Generated
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={response.cashfreeResponse.payment_link}
                className="flex-1 rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--theme-card-bg,#fff)",
                  color: "var(--theme-text)",
                  border: "1px solid var(--theme-border,#e5e7eb)",
                }}
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{
                  background: copied
                    ? "var(--theme-muted-100,#e2e8f0)"
                    : "var(--theme-success,#16a34a)",
                  color: copied ? "var(--theme-text)" : "var(--theme-on-success,#fff)",
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <QRCodeSection
            orderId={response.cashfreeResponse.order_id}
            paymentLink={response.cashfreeResponse.payment_link}
          />

          {/* UPI Section */}
          <UPIRequestSection orderId={response.cashfreeResponse.order_id} />
        </div>
      )}
    </div>
  );
};

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

              <div
                className="mb-2 p-2 rounded-lg"
                style={{ background: "var(--theme-panel,#f8fafc)" }}
              >
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-xl font-bold"
                    style={{ color: "var(--theme-text)" }}
                  >
                    ₹{service.discounted_price}
                  </span>
                  {service.discount_percent > 0 && (
                    <span
                      className="text-sm line-through"
                      style={{ color: "var(--theme-muted,#94a3b8)" }}
                    >
                      ₹{service.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--theme-muted,#64748b)" }}>Billing:</span>
                <span
                  className="font-semibold"
                  style={{ color: "var(--theme-text)" }}
                >
                  {service.billing_cycle}
                  {service.billing_cycle === "CALL" && service.CALL && (
                    <span
                      className="ml-1"
                      style={{ color: "var(--theme-muted,#94a3b8)" }}
                    >
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

const QRCodeSection = ({ orderId, paymentLink }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchQR = async () => {
    try {
      setLoading(true);
      const { data } = await axiosInstance.post(
        `/payment/generate-qr-code/${orderId}`
      );
      setQrData(data);
    } catch (err) {
      console.error("QR Error:", err);
      alert("Failed to generate QR. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const dataUrlToBlob = (dataUrl) => {
    const [meta, b64] = String(dataUrl).split(",");
    const mime = /data:(.*?);base64/.exec(meta)?.[1] || "image/png";
    const binStr = atob(b64 || "");
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const downloadQR = async () => {
    try {
      if (!qrData?.qrcode) return;
      setDownloading(true);
      const href = qrData.qrcode;

      if (href.startsWith("data:image")) {
        const a = document.createElement("a");
        a.href = href;
        a.download = `payment-qr-${orderId}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const res = await fetch(href);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payment-qr-${orderId}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("Couldn't download the QR image.");
    } finally {
      setDownloading(false);
    }
  };

  const shareLink = async () => {
    try {
      if (!paymentLink && !qrData?.payment_link) {
        alert("Payment link not available yet.");
        return;
      }
      const url = paymentLink || qrData.payment_link;
      if (navigator.share) {
        setSharing(true);
        await navigator.share({
          title: "Payment Link",
          text: "Please complete the payment using this link:",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard.");
      }
    } catch (e) {
      console.error(e);
      alert("Couldn't share the link. It may be blocked by the browser.");
    } finally {
      setSharing(false);
    }
  };

  const shareImage = async () => {
    try {
      if (!qrData?.qrcode) return;
      const isDataUrl = qrData.qrcode.startsWith("data:image");
      let blob;

      if (isDataUrl) {
        blob = dataUrlToBlob(qrData.qrcode);
      } else {
        const res = await fetch(qrData.qrcode);
        blob = await res.blob();
      }

      const file = new File([blob], `payment-qr-${orderId}.png`, {
        type: blob.type || "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        setSharing(true);
        await navigator.share({
          title: "Payment QR",
          text: "Scan to pay.",
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `payment-qr-${orderId}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        alert("Sharing not supported on this device. Downloaded instead.");
      }
    } catch (e) {
      console.error(e);
      alert("Couldn't share the QR image.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background:
          "color-mix(in srgb, var(--theme-primary,#4f46e5) 8%, var(--theme-card-bg,#fff))",
      }}
    >
      <h4
        className="font-medium mb-3 flex items-center gap-2"
        style={{ color: "var(--theme-primary,#4f46e5)" }}
      >
        <Camera size={18} /> QR Code Payment
      </h4>

      {!qrData ? (
        loading ? (
          <LoadingState message="Generating QR..." />
        ) : (
          <button
            type="button"
            onClick={fetchQR}
            disabled={loading}
            className="px-4 py-2 rounded-lg disabled:opacity-50"
            style={{
              background: "var(--theme-primary,#4f46e5)",
              color: "var(--theme-primary-contrast,#fff)",
            }}
          >
            Generate QR Code
          </button>
        )
      ) : (
        <div className="flex flex-col items-center space-y-3">
          <img
            src={qrData.qrcode}
            alt="Payment QR Code"
            className="w-48 h-48 border rounded-lg"
            style={{
              background: "var(--theme-card-bg,#fff)",
              borderColor: "var(--theme-border,#e5e7eb)",
            }}
          />
          <p className="text-sm" style={{ color: "var(--theme-muted,#64748b)" }}>
            Scan to Pay ₹{qrData.payment_amount}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={downloadQR}
              disabled={downloading}
              className="px-3 py-2 text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2 border"
              style={{
                background: "var(--theme-card-bg,#fff)",
                color: "var(--theme-text)",
                borderColor: "var(--theme-border,#e5e7eb)",
              }}
            >
              {downloading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Downloading...
                </>
              ) : (
                <>
                  <Download size={16} /> Download PNG
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareLink}
              disabled={sharing}
              className="px-3 py-2 text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
              style={{
                background: "var(--theme-primary,#4f46e5)",
                color: "var(--theme-primary-contrast,#fff)",
              }}
            >
              {sharing ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Sharing...
                </>
              ) : (
                <>
                  <LinkIcon size={16} /> Share Link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareImage}
              disabled={sharing}
              className="px-3 py-2 text-sm rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
              style={{
                background: "var(--theme-accent,#6366f1)",
                color: "var(--theme-primary-contrast,#fff)",
              }}
            >
              {sharing ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Sharing...
                </>
              ) : (
                <>
                  <Share2 size={16} /> Share QR
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const UPIRequestSection = ({ orderId }) => {
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [upiLink, setUpiLink] = useState(null);

  const handleGenerateUPI = async () => {
    if (!upiId.trim()) {
      alert("Enter a valid UPI ID");
      return;
    }
    setLoading(true);
    try {
      const { data: upiData } = await axiosInstance.post(
        `/payment/generate-upi-request/${orderId}?upi_id=${encodeURIComponent(
          upiId
        )}`
      );
      setUpiLink(upiData);
    } catch (err) {
      console.error("UPI Error:", err);
      alert("Failed to send UPI request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-lg p-4"
      style={{
        background:
          "color-mix(in srgb, var(--theme-accent,#6366f1) 10%, var(--theme-card-bg,#fff))",
      }}
    >
      <h4
        className="font-medium mb-3 flex items-center gap-2"
        style={{ color: "var(--theme-accent,#6366f1)" }}
      >
        <Smartphone size={16} /> UPI Payment Request
      </h4>
      {!upiLink ? (
        loading ? (
          <LoadingState message="Sending UPI request..." />
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter UPI ID (e.g. 98765@ybl)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2"
              style={{
                background: "var(--theme-card-bg,#fff)",
                color: "var(--theme-text)",
                border: "1px solid var(--theme-border,#e5e7eb)",
              }}
            />
            <button
              type="button"
              onClick={handleGenerateUPI}
              disabled={loading}
              className="px-4 py-2 rounded-lg disabled:opacity-50"
              style={{
                background: "var(--theme-accent,#6366f1)",
                color: "var(--theme-primary-contrast,#fff)",
              }}
            >
              Send Request
            </button>
          </div>
        )
      ) : (
        <div
          className="font-semibold mt-2 flex items-center gap-2"
          style={{ color: "var(--theme-success,#16a34a)" }}
        >
          <CheckCircle2 size={18} /> UPI Request Sent Successfully!
        </div>
      )}
    </div>
  );
};

const CheckPayment = ({ phone }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ensure we only fetch once
  const didFetch = useRef(false);

  useEffect(() => {
    if (!phone || didFetch.current) return;
    didFetch.current = true;

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axiosInstance.get(`/payment/history/${phone}?`);
        setHistory(data);
      } catch (err) {
        console.error("API Error:", err);
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [phone]);

  const getStatusColorStyles = (status) => {
    if (status === "PAID") {
      return {
        background:
          "color-mix(in srgb, var(--theme-success,#16a34a) 10%, transparent)",
        color: "var(--theme-success,#16a34a)",
        borderColor:
          "color-mix(in srgb, var(--theme-success,#16a34a) 35%, transparent)",
      };
    }
    if (status === "ACTIVE") {
      return {
        background:
          "color-mix(in srgb, var(--theme-warn,#f59e0b) 12%, transparent)",
        color: "var(--theme-warn,#b45309)",
        borderColor:
          "color-mix(in srgb, var(--theme-warn,#f59e0b) 40%, transparent)",
      };
    }
    if (status === "EXPIRED") {
      return {
        background:
          "color-mix(in srgb, var(--theme-danger,#dc2626) 10%, transparent)",
        color: "var(--theme-danger,#dc2626)",
        borderColor:
          "color-mix(in srgb, var(--theme-danger,#dc2626) 40%, transparent)",
      };
    }
    return {
      background: "var(--theme-muted-100,#f1f5f9)",
      color: "var(--theme-text)",
      borderColor: "var(--theme-border,#e5e7eb)",
    };
  };

  return (
    <div className="p-6" style={{ color: "var(--theme-text)" }}>
      <div className="mb-6">
        <h3
          className="text-lg font-semibold mb-2 flex items-center gap-2"
          style={{ color: "var(--theme-text)" }}
        >
          <BarChart3 size={18} />
          Payment History
        </h3>
        <p className="text-sm" style={{ color: "var(--theme-muted,#64748b)" }}>
          Phone: {phone || "N/A"}
        </p>
      </div>

      {loading && <LoadingState message="Loading payment history..." />}

      {error && (
        <div
          className="rounded-lg p-4 flex items-start gap-3 border"
          style={{
            background:
              "color-mix(in srgb, var(--theme-danger,#dc2626) 10%, transparent)",
            borderColor:
              "color-mix(in srgb, var(--theme-danger,#dc2626) 40%, transparent)",
            color: "var(--theme-danger,#dc2626)",
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <h4 className="font-medium">Error Loading History</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="text-center py-12">
          <Inbox
            className="mx-auto"
            size={56}
            style={{ color: "var(--theme-muted,#94a3b8)" }}
          />
          <h4
            className="font-medium mb-2 mt-3"
            style={{ color: "var(--theme-text)" }}
          >
            No Records Found
          </h4>
          <p className="text-sm" style={{ color: "var(--theme-muted,#64748b)" }}>
            No transactions for this phone number.
          </p>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg p-4 transition border"
              style={{
                background: "var(--theme-card-bg,#fff)",
                borderColor: "var(--theme-border,#e5e7eb)",
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold" style={{ color: "var(--theme-text)" }}>
                    {item.service}
                  </h4>
                  <p className="text-sm" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Order ID: {item.order_id}
                  </p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={getStatusColorStyles(item.status)}
                >
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Amount
                  </span>
                  <span className="font-semibold text-lg" style={{ color: "var(--theme-text)" }}>
                    ₹{item.paid_amount}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Transaction ID
                  </span>
                  <span style={{ color: "var(--theme-text)" }}>
                    {item.transaction_id || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Date
                  </span>
                  <span style={{ color: "var(--theme-text)" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="block" style={{ color: "var(--theme-muted,#64748b)" }}>
                    Time
                  </span>
                  <span style={{ color: "var(--theme-text)" }}>
                    {new Date(item.created_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
