// create Rational, redirect rational page

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';

const API_URL = 'http://147.93.30.144:8000/api/v1/narrations/';

export default function RationalFormPage() {
    const [formData, setFormData] = useState({
        stock_name: '',
        entry_price: '',
        stop_loss: '',
        targets: '',
        rational: '',
        recommendation_type: '',
    });

    const router = useRouter();
    const params = useParams();
    const id = params?.id;

    useEffect(() => {
        if (id) {
            axios.get(`${API_URL}${id}`)
                .then((res) => setFormData(res.data))
                .catch((err) => console.error("Failed to load rational:", err));
        }
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (id) {
                await axios.put(`${API_URL}${id}`, formData);
            } else {
                await axios.post(API_URL, formData);
            }
            router.push('/rational');
        } catch (err) {
            console.error("Save failed:", err);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-10 px-4">
            <h2 className="text-2xl font-bold mb-4">{id ? 'Edit Rational' : 'Create Rational'}</h2>
            <form onSubmit={handleSubmit} className="">
                {/* Stock Name */}
                <div className="">
                    {id && <label className="mb-1 text-gray-700 font-medium">Stock Name</label>}
                    <input
                        type="text"
                        name="stock_name"
                        placeholder="Stock Name"
                        value={formData.stock_name}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                        required
                    />
                </div>

                {/* Entry Price */}
                <div className="flex flex-col">
                    {id && <label className="mb-1 text-gray-700 font-medium">Entry Price</label>}
                    <input
                        type="number"
                        name="entry_price"
                        placeholder="Entry Price"
                        value={formData.entry_price}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                    />
                </div>

                {/* Stop Loss */}
                <div className="flex flex-col">
                    {id && <label className="mb-1 text-gray-700 font-medium">Stop Loss</label>}
                    <input
                        type="number"
                        name="stop_loss"
                        placeholder="Stop Loss"
                        value={formData.stop_loss}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                    />
                </div>

                {/* Targets */}
                <div className="flex flex-col">
                    {id && <label className="mb-1 text-gray-700 font-medium">Targets</label>}
                    <input
                        type="number"
                        name="targets"
                        placeholder="Targets"
                        value={formData.targets}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                    />
                </div>

                {/* Recommendation Type */}
                <div className="flex flex-col">
                    {id && <label className="mb-1 text-gray-700 font-medium">Recommendation Type</label>}
                    <input
                        type="text"
                        name="recommendation_type"
                        placeholder="Recommendation Type"
                        value={formData.recommendation_type}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                    />
                </div>

                {/* Rational */}
                <div className="flex flex-col md:col-span-2">
                    {id && <label className="mb-1 text-gray-700 font-medium">Rational</label>}
                    <textarea
                        name="rational"
                        placeholder="Rational"
                        value={formData.rational}
                        onChange={handleChange}
                        className="p-4 border rounded-xl"
                        rows={3}
                    />
                </div>

                {/* Submit Button */}
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-xl"
                    >
                        {id ? 'Update Rational' : 'Create Rational'}
                    </button>
                </div>
            </form>
        </div>
    );
}
