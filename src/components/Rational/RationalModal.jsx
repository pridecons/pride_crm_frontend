import React from 'react';
import { BASE_URL } from '@/api/Axios';
import SmsTemplateSelector from './SmsTemplateSelector';

function RationalModal({
  isEditMode,
  isModalOpen,
  setIsModalOpen,
  formData,
  setFormData,
  editId,
  handleChange,
  handleSubmit,
  imageError,
  setImageError,
  openDropdown,
  setOpenDropdown,
}) {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-auto relative max-h-[90vh] overflow-y-auto">
        <button className="absolute top-2 right-3 text-gray-500 text-2xl" onClick={() => setIsModalOpen(false)}>
          &times;
        </button>
        <h2 className="text-xl font-semibold mb-4">{editId ? 'Edit Rational' : 'Create Rational'}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Stock Name</label>
            <input type="text" name="stock_name" value={formData.stock_name} onChange={handleChange} className="p-3 border rounded" required disabled={isEditMode} />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Entry Price</label>
            <input type="number" name="entry_price" value={formData.entry_price ?? ""} onChange={handleChange} className="p-3 border rounded" required={!isEditMode}  disabled={isEditMode}/>
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Stop Loss</label>
            <input type="number" name="stop_loss" value={formData.stop_loss} onChange={handleChange} className="p-3 border rounded" required={!isEditMode} disabled={isEditMode} />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">
              Targets 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="targets"
              value={formData.targets ?? ''}
              onChange={handleChange}
              required
              className="p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isEditMode}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 2</label>
            <input
              type="number"
              name="targets2"
              value={formData.targets2 ?? ''}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-gray-700 text-sm">Targets 3</label>
            <input
              type="number"
              name="targets3"
              value={formData.targets3 ?? ''}
              onChange={handleChange}
              className="p-3 border rounded"
              disabled={isEditMode}
            />
          </div>
          <div className="flex flex-col md:col-span-2 relative">
            <label className="mb-1 text-gray-700 text-sm font-medium">Recommendation Type</label>

            <div
              onClick={() => {
                if (!isEditMode) setOpenDropdown(prev => !prev);
              }}
              className={`p-3 border border-black rounded-lg bg-white cursor-pointer transition-all duration-200 flex items-center justify-between ${isEditMode ? 'bg-gray-50 cursor-not-allowed text-gray-500 pointer-events-none' : ''
                }`}
            >
              <div className="flex flex-wrap gap-1">
                {formData.recommendation_type?.length > 0 ? (
                  formData.recommendation_type.map(type => (
                    <span key={type} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">Select Recommendation Type</span>
                )}
              </div>
              {!isEditMode && (
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform duration-200 ml-2 flex-shrink-0 ${openDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </div>

            {!isEditMode && openDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <div className="text-xs text-gray-600 mb-1">
                    {formData.recommendation_type?.length || 0} selected
                  </div>
                  {formData.recommendation_type?.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, recommendation_type: [] }));
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {[
                  "Equity Cash",
                  "Stock Future",
                  "Index Future",
                  "Stock Option",
                  "MCX Bullion",
                  "MCX Base Metal",
                  "MCX Energy"
                ].map(option => (
                  <label
                    key={option}
                    className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
                      checked={formData.recommendation_type?.includes(option)}
                      onChange={() => {
                        const current = formData.recommendation_type || [];
                        const updated = current.includes(option)
                          ? current.filter(item => item !== option)
                          : [...current, option];
                        setFormData(prev => ({ ...prev, recommendation_type: updated }));
                      }}
                    />
                    <span className="text-gray-800 font-medium">{option}</span>
                    {formData.recommendation_type?.includes(option) && (
                      <svg className="w-4 h-4 text-blue-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
                <div className="p-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(false)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded text-sm hover:bg-green-700 transition-colors duration-150 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Done ({formData.recommendation_type?.length || 0} selected)
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className='col-span-2'>
            <SmsTemplateSelector />
          </div>

          {!isEditMode && (
            <div className="flex flex-col md:col-span-2">
              <label className="mb-1 text-gray-700 text-sm">Status</label>
              <select
                name="status"
                value={formData.status || 'OPEN'}
                onChange={handleChange}
                className="p-3 border rounded"
                required
              >
                <option value="">Select Status</option>
                <option value="OPEN">OPEN</option>
                <option value="TARGET1_HIT">TARGET1</option>
                <option value="TARGET2_HIT">TARGET2</option>
                <option value="TARGET3_HIT">TARGET3</option>
                <option value="STOP_LOSS_HIT">STOP_LOSS</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          )}

          <div className="flex flex-col md:col-span-2 relative">
            <label className="mb-1 text-gray-700 text-sm">Rational</label>

            <textarea
              name="rational"
              value={formData.rational}
              onChange={handleChange}
              className="p-3 border rounded"
              rows={3}
            />

            {!isEditMode && (
              <div className="mt-2 flex justify-end">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      graph: e.target.files[0],
                    }));
                    if (e.target.files[0]) setImageError('');
                  }}
                  className="hidden"
                  id="rationalImageUpload"
                />
                <label
                  htmlFor="rationalImageUpload"
                  className="inline-block bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 cursor-pointer text-sm transition"
                  title="Upload image">
                  Upload Image {!editId && <span className="text-red-300">*</span>}
                </label>
              </div>
            )}

            {imageError && (
              <div className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
                {imageError}
              </div>
            )}

            {formData.graph && (
              <div className="mt-2 relative inline-block w-fit">
                <img
                  src={
                    formData.graph instanceof File
                      ? URL.createObjectURL(formData.graph)
                      : `${BASE_URL}${formData.graph}`
                  }
                  alt="Preview"
                  className="max-h-20 rounded border"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      graph: null,
                    }))
                  }
                  className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-700"
                  title="Remove Image"
                  disabled={isEditMode}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors duration-150">
              {editId ? 'Update Rational' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RationalModal;

