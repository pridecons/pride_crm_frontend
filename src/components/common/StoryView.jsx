'use client'

import { useState } from 'react'
import { toast } from 'react-toastify'
import { axiosInstance } from '@/api/Axios'
import Modal from '@/components/common/Modal' // ✅ Correct path to your reusable Modal component

export default function StoryModal({ leadId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stories, setStories] = useState([])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const response = await axiosInstance.get(`/leads/${leadId}/stories`)
      setStories(response.data || [])
    } catch (err) {
      ErrorHandling({ error: err, defaultError: "Failed to fetch stories" });
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setIsOpen(true)
    fetchStories()
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-3 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm"
      >
        View Story
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Lead Story"
        actions={[
          <button
            key="close"
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Close
          </button>,
        ]}
      >
        {loading ? (
          <p className="text-gray-600">Loading stories...</p>
        ) : stories.length === 0 ? (
          <p className="text-gray-600">No story available for this lead.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {stories.map((story) => (
              <div key={story.id} className="border-b pb-2">
                <p className="text-sm text-gray-800">{story.msg}</p>
                <p className="text-xs text-gray-500">
                  {new Date(story.timestamp).toLocaleString()} by {story.user_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
