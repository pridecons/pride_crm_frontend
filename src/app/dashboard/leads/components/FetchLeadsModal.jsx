'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Fragment, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

export default function FetchLeadsModal({ open, onClose, onLeadsFetched }) {
  const [configs, setConfigs] = useState([])
  const [loading, setLoading] = useState(false)

  // ✅ Fetch available lead-fetch configs
  const fetchConfigs = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:8000/api/v1/lead-fetch-config/?skip=0&limit=100')
      setConfigs(res.data || [])
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Failed to load fetch configurations')
    }
  }

  useEffect(() => {
    if (open) fetchConfigs()
  }, [open])

  // ✅ Fetch leads based on selected config
  const handleFetch = async (configId) => {
    try {
      setLoading(true)
      const response = await axios.post('http://127.0.0.1:8000/api/v1/leads/fetch')

      if (response.data && Array.isArray(response.data)) {
        toast.success(`Fetched ${response.data.length} leads successfully`)
        if (onLeadsFetched) {
          onLeadsFetched(response.data) // Pass leads to parent dashboard
        }
        onClose()
      } else {
        toast.warn('No new leads fetched')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-full p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all w-full max-w-4xl">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900">Fetch Leads by Config</Dialog.Title>
                    <button type="button" className="text-gray-400 hover:text-gray-600" onClick={onClose}>×</button>
                  </div>

                  {/* Config Table */}
                  <table className="w-full text-sm text-left border">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-2">Branch</th>
                        <th className="px-4 py-2">Role</th>
                        <th className="px-4 py-2">Daily Limit</th>
                        <th className="px-4 py-2">TTL (hrs)</th>
                        <th className="px-4 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((cfg, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-2">{cfg.branch_name}</td>
                          <td className="px-4 py-2">{cfg.role}</td>
                          <td className="px-4 py-2">{cfg.daily_call_limit}</td>
                          <td className="px-4 py-2">{cfg.assignment_ttl_hours}</td>
                          <td className="px-4 py-2">
                            <button
                              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                              onClick={() => handleFetch(cfg.id)}
                              disabled={loading}
                            >
                              {loading ? 'Fetching...' : 'Fetch'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-6 text-right">
                    <button
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-sm font-medium rounded"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
