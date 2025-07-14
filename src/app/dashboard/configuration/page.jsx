'use client'

import { useState } from 'react'

import ServiceModal from './modals/ServiceModal'


export default function ConfigurationPage() {
  const [openModal, setOpenModal] = useState(null)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configuration Panel</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <button onClick={() => setOpenModal('service')} className="bg-blue-600 text-white py-3 px-4 rounded shadow">Services</button>
        {/* Add more buttons for other modals later */}
      </div>

      {openModal === 'service' && <ServiceModal onClose={() => setOpenModal(null)} />}
    </div>
  )
}
