'use client'

import Link from 'next/link'
import { Building, Users, TrendingUp, MapPin, MoreVertical, Globe } from 'lucide-react'
import { useState } from 'react'

export default function BranchCard({ branch, onEdit }) {
  const [showMenu, setShowMenu] = useState(false)

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{branch.name || `Branch ${branch.id}`}</h3>
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <MapPin size={14} />
                <span>{branch.location || 'Location not specified'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[branch.status] || statusColors.active}`}>
              {branch.status || 'Active'}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <MoreVertical size={16} className="text-gray-400" />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowMenu(false)
                        onEdit(branch)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Settings
                    </button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full mx-auto mb-2">
              <Users size={14} className="text-green-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900">{branch.activeUsers || 24}</div>
            <div className="text-xs text-gray-500">Active Users</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full mx-auto mb-2">
              <TrendingUp size={14} className="text-purple-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900">{branch.totalLeads || 156}</div>
            <div className="text-xs text-gray-500">Total Leads</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full mx-auto mb-2">
              <Globe size={14} className="text-orange-600" />
            </div>
            <div className="text-lg font-semibold text-gray-900">{branch.webLeads || 42}</div>
            <div className="text-xs text-gray-500">Web Leads</div>
          </div>
        </div>
      </div>

      {/* Performance Indicator */}
      <div className="px-6 pb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Performance</span>
          <span className="text-green-600 font-medium">+{branch.performance || 12}%</span>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${branch.performancePercentage || 78}%` }}
          ></div>
        </div>
      </div>

      {/* Footer */}
      {/* Footer */}
      <div className="border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            Last updated: {branch.lastUpdated || '2 hours ago'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(branch)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Edit
            </button>
            <Link
              href={`/branch/${branch.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            >
              Manage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}