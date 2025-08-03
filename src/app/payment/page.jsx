// src/components/PaymentPage.jsx
"use client";

import React, { useState, useEffect, useRef, lazy } from "react";
import { axiosInstance } from "@/api/Axios";
import { DropdownCheckboxButton, InputField } from "@/components/common/InputField";
import LoadingState from "@/components/LoadingState";

const PAYMENT_METHODS = [
    { code: "cc", label: "Credit Card", icon: "💳", category: "card" },
    { code: "dc", label: "Debit Card", icon: "💳", category: "card" },
    { code: "ccc", label: "Corporate Credit Card", icon: "🏢", category: "card" },
    { code: "ppc", label: "Prepaid Card", icon: "💳", category: "card" },
    { code: "nb", label: "Net Banking", icon: "🏦", category: "bank" },
    { code: "upi", label: "UPI", icon: "📱", category: "digital" },
    { code: "paypal", label: "PayPal", icon: "🅿", category: "digital" },
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

const serviceOption = ["CASH", "OPTION PUT BUY", "OPTION CALL BUY"]; ``

export default function PaymentPage({
    name = "",
    phone = "",
    email = "",
    service = "",
}) {
    const [selectOption, setSelectOption] = useState("check_payment");

    return (
        <div className="bg-gray-50 relative overflow-y-auto h-full max-h-[90vh]">
            {/* Header */}
            <nav className="flex border-b border-gray-200 bg-white sticky top-4 z-20 w-full overflow-x-hidden">
                {TAB_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => setSelectOption(opt.value)}
                        className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${selectOption === opt.value
                            ? "border-blue-500 text-blue-600 bg-blue-50"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <span className="mr-2">{opt.icon}</span>
                        {opt.name}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <div className="bg-white">
                {selectOption === "generate_link" && (
                    <CreatePaymentLink
                        name={name}
                        phone={phone}
                        email={email}
                        service={service}
                    />
                )}
                {selectOption === "check_payment" && <CheckPayment phone={phone} />}
            </div>
        </div>
    );
}

const CreatePaymentLink = ({
    name = "",
    phone = "",
    email = "",
    service = ""
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

        if (!/^\S+@\S+\.\S+$/.test(customerEmail)) {
            setError("Please enter a valid email address.");
            setLoading(false);
            return;
        }
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
            };

            const { data } = await axiosInstance.post(
                "/payment/create-order",
                payload
            );
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
        card: "💳 Cards",
        bank: "🏦 Banking",
        digital: "📱 Digital Wallets",
        credit: "💰 Credit & EMI",
    };

    const handleAmount = (value) => {
        const newAmount = parseFloat(value);
        setAmount(newAmount);

        if (service_plan?.billing_cycle === "CALL") {
            const perCall = service_plan?.discounted_price / service_plan?.CALL;
            const totalCall = Math.round(newAmount / perCall);
            setCall(totalCall);
            setDuration_day(0);
        } else {
            setCall(0);
            const daysCount = service_plan?.billing_cycle === "MONTHLY" ? 30 : 365;
            const perDayPrice = service_plan?.discounted_price / daysCount;
            const totalDays = Math.round(newAmount / perDayPrice);
            setDuration_day(totalDays);
        }
    };

    console.log("service_plan : ", service_plan);

    return (
        <div className="p-6 space-y-6">
            {/* If No Payment Link */}
            {!response?.cashfreeResponse?.payment_link && (
                <>
                    {/* Customer Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                            👤 Customer Information
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
                            <InputField
                                label="Full Name"
                                value={customerName}
                                setValue={setCustomerName}
                            />
                            <InputField
                                label="Email Address"
                                value={customerEmail}
                                setValue={setCustomerEmail}
                                placeholder="customer@example.com"
                            />
                            <InputField
                                label="Phone Number"
                                value={customerPhone}
                                setValue={(val) => {
                                    // Allow only digits
                                    const digitsOnly = val.replace(/\D/g, "");
                                    setCustomerPhone(digitsOnly);
                                }}
                                placeholder="10-digit number"
                            />

                            <div>
                                <label
                                    htmlFor="service-select"
                                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                                >
                                    Select Service
                                </label>
                                <select
                                    id="service-select"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                                    value={selectService}
                                    onChange={(e) => setSelectService(e.target.value)}
                                >
                                    <option value="" disabled>
                                        Choose a Service
                                    </option>
                                    {serviceOption.map((val) => (
                                        <option key={val} value={val}>
                                            {val}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                        {/* Payment Amount - Takes 8 columns (larger width) */}
                        <div className="col-span-8">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 shadow-sm border border-green-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                                    <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                                        ₹
                                    </span>
                                    Payment Amount
                                </h3>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 text-xl font-semibold">
                                        ₹
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={(e) => {
                                            handleAmount(e.target.value);
                                        }}
                                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-medium transition-all duration-200 bg-white shadow-sm hover:shadow-md"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Duration/Call Field - Takes 4 columns (smaller width) */}
                        <div className="col-span-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 shadow-sm border border-blue-200 h-full">
                                {service_plan?.billing_cycle === "CALL" ? (
                                    <div>
                                        <label className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                                            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                                                📞
                                            </span>
                                            Call
                                        </label>
                                        <input
                                            type="number"
                                            value={call}
                                            onChange={(e) => setCall(e.target.value)}
                                            placeholder=""
                                            disabled={true}
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-lg font-medium text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                                            <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                                                📅
                                            </span>
                                            Duration (Days)
                                        </label>
                                        <input
                                            type="number"
                                            value={duration_day}
                                            onChange={(e) => setDuration_day(e.target.value)}
                                            placeholder=""
                                            disabled={true}
                                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-lg font-medium text-gray-600 cursor-not-allowed"
                                        />
                                    </div>
                                )}
                            </div>
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
                            <span className="text-red-500 text-xl mr-3">⚠</span>
                            <div>
                                <h4 className="text-red-800 font-medium">Error</h4>
                                <p className="text-red-700 text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? "⏳ Creating..." : "💰 Generate Payment Link"}
                        </button>
                    </div>
                </>
            )}

            {/* If Payment Link Generated */}
            {response?.cashfreeResponse?.payment_link && (
                <div className="space-y-6">
                    {/* Payment Link */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="text-green-800 font-medium mb-3">
                            ✅ Payment Link Generated
                        </h4>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={response.cashfreeResponse.payment_link}
                                className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                                onClick={handleCopy}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${copied
                                    ? "bg-gray-200"
                                    : "bg-green-600 text-white hover:bg-green-700"
                                    }`}
                            >
                                {copied ? "✅ Copied" : "📋 Copy"}
                            </button>
                        </div>
                    </div>

                    {/* QR Code */}
                    <QRCodeSection orderId={response.cashfreeResponse.order_id} />

                    {/* UPI Section */}
                    <UPIRequestSection orderId={response.cashfreeResponse.order_id} />
                </div>
            )}
        </div>
    );
};

const ServiceCard = ({ selectService = {}, setSelectService = () => { } }) => {
    const [service_plan, setService_plan] = useState([]);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const { data } = await axiosInstance.get("/services/");
                setService_plan(data);
            } catch (err) {
                console.error("Failed to load services:", err);
            }
        };
        fetchServices();
    }, []);

    const handleSelect = (service) => {
        console.log("service : ", service);
        setSelectService(service);
    };

    return (
        <div
            className="w-full flex flex-row gap-6 mt-8 overflow-x-auto pb-2 z-10"
            style={{
                msOverflowStyle: "none",
                scrollbarWidth: "none",
                WebkitScrollbar: { display: "none" },
            }}
        >
            {service_plan.map((service) => (
                <div
                    key={service.id}
                    onClick={() => handleSelect(service)}
                    className={`relative min-w-72 max-w-72 bg-white border-2 rounded-2xl p-4 shadow-lg hover:shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 ${selectService?.id === service.id
                        ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-blue-200"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                >
                    {/* Selected Badge */}
                    {selectService?.id === service.id && (
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-medium shadow-md">
                            Selected
                        </div>
                    )}

                    <div className="mt-1">
                        {/* Service Name */}
                        <div className="flex justify-between">
                            <h3 className="text-lg font-bold text-gray-800 mb-2 leading-tight">
                                {service.name}
                            </h3>

                            {/* Discount Badge */}
                            {service.discount_percent > 0 && (
                                <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-md font-bold">
                                    {service.discount_percent}% OFF
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-2">
                            {service.description}
                        </p>

                        {/* Price Section */}
                        <div className="mb-2 p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-gray-800">
                                    ₹{service.discounted_price}
                                </span>
                                {service.discount_percent > 0 && (
                                    <span className="text-sm line-through text-gray-400">
                                        ₹{service.price}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Billing Info */}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Billing:</span>
                            <span className="text-gray-800 font-semibold">
                                {service.billing_cycle}
                                {service.billing_cycle === "CALL" && service.CALL && (
                                    <span className="text-gray-500 ml-1">({service.CALL})</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const QRCodeSection = ({ orderId }) => {
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchQR = async () => {
        try {
            setLoading(true);
            const { data } = await axiosInstance.post(
                `/payment/generate-qr-code/${orderId}`,
                {} // Optional: Include payload or leave empty if not needed
            );

            setQrData(data);
        } catch (err) {
            console.error("QR Error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-blue-800 font-medium mb-3">📷 QR Code Payment</h4>
            {!qrData ? (
                loading ? (
                    <LoadingState message="Generating QR code..." />
                ) : (
                    <button
                        type="button"
                        onClick={fetchQR}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Generate QR Code
                    </button>
                )
            ) : (
                <div className="flex flex-col items-center space-y-2">
                    <img
                        src={qrData.qrcode}
                        alt="Payment QR Code"
                        className="w-48 h-48 border rounded-lg"
                    />
                    <p className="text-gray-600 text-sm">
                        Scan to Pay ₹{qrData.payment_amount}
                    </p>
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
        <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="text-purple-800 font-medium mb-3">
                📱 UPI Payment Request
            </h4>
            {!upiLink ? (
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter UPI ID (e.g. 98765@ybl)"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    />
                    {loading ? (
                        <LoadingState message="Sending UPI request..." />
                    ) : (
                        <button
                            type="button"
                            onClick={handleGenerateUPI}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                            Send Request
                        </button>
                    )}
                </div>
            ) : (
                <div className="text-green-700 font-semibold mt-2">
                    ✅ UPI Request Sent Successfully!
                </div>
            )}
        </div>
    );
};

const CheckPayment = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data } = await axiosInstance.get("/payment/employee/history");
                setHistory(data);
            } catch (err) {
                setError(err.response?.data?.detail || "Failed to fetch payment history.");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "bg-green-100 text-green-800 border-green-200";
            case "PENDING":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "FAILED":
                return "bg-red-100 text-red-800 border-red-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };


    return (
        <div className="p-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    📊 All Payment History
                </h3>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
                {/* Status Dropdown */}
                <div className="flex items-center gap-2">
                    <label htmlFor="status" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Filter by Status:
                    </label>
                    <select
                        id="status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All</option>
                        <option value="PAID">PAID</option>
                        <option value="PENDING">EXPIRED</option>
                        <option value="FAILED">ACTIVE</option>
                    </select>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2">
                    <label htmlFor="date" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Filter by Date:
                    </label>
                    <input
                        type="date"
                        id="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
                    <label htmlFor="search" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Search:
                    </label>
                    <input
                        type="text"
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Name, Email, Order ID"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading && <LoadingState message="Loading payment history..." />}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                    <span className="text-red-500 text-xl mr-3">⚠</span>
                    <div>
                        <h4 className="text-red-800 font-medium">Error</h4>
                        <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {!loading && !error && history.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">📭</div>
                    <h4 className="text-gray-600 font-medium mb-2">No Records Found</h4>
                    <p className="text-gray-500 text-sm">No payment transactions recorded.</p>
                </div>
            )}

            {!loading && !error && history.length > 0 && (
                <div className="space-y-4">
                    {history
                        .filter((item) => {
                            const statusMatch = statusFilter === "ALL" || item.status === statusFilter;
                            const searchMatch =
                                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.order_id.toLowerCase().includes(searchTerm.toLowerCase());

                            const dateMatch = selectedDate
                                ? new Date(item.created_at).toISOString().split("T")[0] === selectedDate
                                : true;

                            return statusMatch && searchMatch && dateMatch;
                        })
                        .map((item) => (
                            <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">

                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">
                                            {item.name} ({item.Service})
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
                                        <span className="text-gray-500 block">Email</span>
                                        <span className="text-gray-800">{item.email}</span>
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
                                            {new Date(item.created_at).toLocaleTimeString("en-IN", {
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
