// src/components/PaymentModal.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { axiosInstance } from "@/api/Axios";

const PAYMENT_METHODS = [
  { code: "cc", label: "Credit Card", icon: "💳", category: "card" },
  { code: "dc", label: "Debit Card", icon: "💳", category: "card" },
  { code: "ccc", label: "Corporate Credit Card", icon: "🏢", category: "card" },
  { code: "ppc", label: "Prepaid Card", icon: "💳", category: "card" },
  { code: "nb", label: "Net Banking", icon: "🏦", category: "bank" },
  { code: "upi", label: "UPI", icon: "📱", category: "digital" },
  { code: "paypal", label: "PayPal", icon: "🅿️", category: "digital" },
  { code: "app", label: "App Wallet", icon: "📱", category: "digital" },
  { code: "paylater", label: "Pay Later", icon: "💰", category: "credit" },
  {
    code: "cardlessemi",
    label: "Cardless EMI",
    icon: "💰",
    category: "credit",
  },
  { code: "dcemi", label: "Debit Card EMI", icon: "💳", category: "credit" },
  { code: "ccemi", label: "Credit Card EMI", icon: "💳", category: "credit" },
  {
    code: "banktransfer",
    label: "Bank Transfer",
    icon: "🏦",
    category: "bank",
  },
];

const TAB_OPTIONS = [
  { name: "Check Payment", value: "check_payment", icon: "📊" },
  { name: "Generate Payment Link", value: "generate_link", icon: "🔗" },
];

export default function PaymentModal({
  open,
  setOpen,
  name = "",
  phone = "",
  email = "",
  service = "",
}) {
  const [selectOption, setSelectOption] = useState("check_payment");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Payment Dashboard</h2>
              <p className="text-blue-100 text-sm mt-1">
                Manage payments and generate links
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {TAB_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectOption(opt.value)}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  selectOption === opt.value
                    ? "border-blue-500 text-blue-600 bg-blue-50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="mr-2">{opt.icon}</span>
                {opt.name}
              </button>
            ))}
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
}) => {
  const [amount, setAmount] = useState(1);
  const [customerName, setCustomerName] = useState(name);
  const [customerEmail, setCustomerEmail] = useState(email);
  const [customerPhone, setCustomerPhone] = useState(phone);
  const [customerService, setCustomerService] = useState(service);

  const [allowAll, setAllowAll] = useState(true);
  const [selectedMethods, setSelectedMethods] = useState(
    PAYMENT_METHODS.map((m) => m.code)
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    // --- Client-side validation ---
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(customerEmail)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(customerPhone)) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }
    if (!(amount > 0)) {
      setError("Amount must be greater than 0.");
      setLoading(false);
      return;
    }
    if (!customerService.trim()) {
      setError("Please enter a service description.");
      setLoading(false);
      return;
    }

    try {
      const methods = allowAll ? "" : selectedMethods.join(",");
      const payload = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        service: customerService,
        amount,
        payment_methods: methods,
      };

      const { data } = await axiosInstance.post("/payment/create", payload);
      setResponse(data);
    } catch (err) {
      console.error("API Error:", err);
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
    card: "💳 Cards",
    bank: "🏦 Banking",
    digital: "📱 Digital Wallets",
    credit: "💰 Credit & EMI",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Customer Info */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          👤 Customer Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              className="w-full border-gray-300 rounded-lg p-3 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              className="w-full border-gray-300 rounded-lg p-3 focus:ring-blue-500 focus:border-transparent"
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              className="w-full border-gray-300 rounded-lg p-3 focus:ring-blue-500 focus:border-transparent"
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Service Description
            </label>
            <input
              type="text"
              value={customerService}
              onChange={(e) => setCustomerService(e.target.value)}
              required
              className="w-full border-gray-300 rounded-lg p-3 focus:ring-blue-500 focus:border-transparent"
              placeholder="Product or service details"
            />
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-green-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          💰 Payment Amount
        </h3>
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
            ₹
          </span>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            required
            className="w-full pl-8 pr-4 py-3 border-gray-300 rounded-lg focus:ring-green-500 focus:border-transparent"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
          💳 Payment Methods
        </h3>
        <label className="inline-flex items-center mb-4 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            checked={allowAll}
            onChange={handleSelectAll}
          />
          <span className="ml-3 text-gray-700 font-medium">
            Enable All Payment Methods
          </span>
        </label>
        {Object.entries(grouped).map(([cat, methods]) => (
          <div key={cat} className="bg-white rounded-lg p-3">
            <h4 className="text-sm font-semibold text-gray-600 mb-3">
              {labels[cat]}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {methods.map((m) => (
                <label
                  key={m.code}
                  className="inline-flex items-center p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    checked={selectedMethods.includes(m.code)}
                    onChange={() => toggleMethod(m.code)}
                  />
                  <span className="ml-3 flex items-center">
                    <span className="mr-2">{m.icon}</span>
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <span className="text-red-500 text-xl mr-3">⚠️</span>
          <div>
            <h4 className="text-red-800 font-medium">Error</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success */}
      {response?.cashfreeResponse?.payment_link && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-green-800 font-medium flex items-center mb-3">
            <span className="mr-2">✅</span>
            Payment Link Generated!
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={response.cashfreeResponse.payment_link}
              className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                copied
                  ? "bg-gray-100 text-gray-600"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? "⏳ Creating..." : "💰 Generate Payment Link"}
        </button>
      </div>
    </div>
  );
};

const CheckPayment = ({ phone }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ← ref to ensure we only fetch once
  const didFetch = useRef(false);

  useEffect(() => {
    if (!phone || didFetch.current) return; // bail if already fetched
    didFetch.current = true; // mark as fetched

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().slice(0, 10);
      try {
        const { data } = await axiosInstance.get(
          `/payment/history/${phone}?date=${today}`
        );
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

  const getStatusColor = (status) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800 border-green-200";
      case "ACTIVE":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "EXPIRED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
          📊 Payment History
        </h3>
        <p className="text-gray-600 text-sm">Phone: {phone || "N/A"}</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="animate-spin text-2xl mr-3">⏳</span>
          <span className="text-gray-600">Loading payment history...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <span className="text-red-500 text-xl mr-3">⚠️</span>
          <div>
            <h4 className="text-red-800 font-medium">Error Loading History</h4>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📭</div>
          <h4 className="text-gray-600 font-medium mb-2">No Records Found</h4>
          <p className="text-gray-500 text-sm">
            No transactions for this phone number.
          </p>
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <div className="space-y-4">
          {history.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    {item.service}
                  </h4>
                  <p className="text-sm text-gray-500">
                    Order ID: {item.order_id}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block">Amount</span>
                  <span className="font-semibold text-lg">
                    ₹{item.paid_amount}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Transaction ID</span>
                  <span className="text-gray-800">
                    {item.transaction_id || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Date</span>
                  <span className="text-gray-800">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Time</span>
                  <span className="text-gray-800">
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
