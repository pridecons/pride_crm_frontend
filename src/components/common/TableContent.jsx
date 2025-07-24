    "use clietn";

    import React from "react";

    const RationalTable = ({ data, onEdit, onDelete, getBadgeClass }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Stock Name</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Entry Price</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Stop Loss</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Target</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Recommendation</th>
                <th className="text-left py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Rational</th>
                <th className="text-center py-4 px-6 font-semibold text-slate-700 text-sm uppercase tracking-wider">Actions</th>
                </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
                {data.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors duration-150">
                    <td className="py-4 px-6">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-3">
                        {item.stock_name?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                        <div className="font-semibold text-slate-800">{item.stock_name}</div>
                        <div className="text-xs text-slate-500">Stock #{index + 1}</div>
                        </div>
                    </div>
                    </td>

                    <td className="py-4 px-6">
                    <div className="font-semibold text-slate-800">
                        {item.entry_price ? `₹${parseFloat(item.entry_price).toFixed(2)}` : '-'}
                    </div>
                    </td>

                    <td className="py-4 px-6">
                    <div className="font-semibold text-red-600">
                        {item.stop_loss ? `₹${parseFloat(item.stop_loss).toFixed(2)}` : '-'}
                    </div>
                    </td>

                    <td className="py-4 px-6">
                    <div className="font-semibold text-green-600">
                        {item.targets ? `₹${parseFloat(item.targets).toFixed(2)}` : '-'}
                    </div>
                    </td>

                    <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getBadgeClass(item.recommendation_type)}`}>
                        {item.recommendation_type}
                    </span>
                    </td>

                    <td className="py-4 px-6 max-w-xs">
                    <div className="text-sm text-slate-600 truncate" title={item.rational}>
                        {item.rational || 'No rational provided'}
                    </div>
                    </td>

                    <td className="py-4 px-6">
                    <div className="flex items-center justify-center space-x-2">
                        <button
                        onClick={() => onEdit(item.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors duration-150"
                        >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                        </button>
                        <button
                        onClick={() => onDelete(item.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors duration-150"
                        >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                        </button>
                    </div>
                    </td>
                </tr>
                ))}

                {data.length === 0 && (
                <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-500">
                    No rational data found.
                    </td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    );
    };

    export default RationalTable;
