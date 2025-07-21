      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Lead Management
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <Activity size={16} />
              Manage and track your leads efficiently
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-white rounded-full px-4 py-2 shadow-sm border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Total Leads
              </p>
              <p className="text-3xl font-bold text-gray-900">{totalLeads}</p>
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <TrendingUp size={12} />
                Active pipeline
              </p>
            </div>
            <div className="bg-blue-50 rounded-full p-3 group-hover:bg-blue-100 transition-colors">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Pending
              </p>
              <p className="text-3xl font-bold text-gray-900">{pendingLeads}</p>
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <Clock size={12} />
                Awaiting action
              </p>
            </div>
            <div className="bg-amber-50 rounded-full p-3 group-hover:bg-amber-100 transition-colors">
              <Clock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Completed
              </p>
              <p className="text-3xl font-bold text-gray-900">{completedLeads}</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                <CheckCircle size={12} />
                Successfully processed
              </p>
            </div>
            <div className="bg-emerald-50 rounded-full p-3 group-hover:bg-emerald-100 transition-colors">
              <CheckCircle size={24} className="text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Sources
              </p>
              <p className="text-3xl font-bold text-gray-900">{sourcesCount}</p>
              <p className="text-xs text-purple-600 flex items-center gap-1 mt-1">
                <Database size={12} />
                Active channels
              </p>
            </div>
            <div className="bg-purple-50 rounded-full p-3 group-hover:bg-purple-100 transition-colors">
              <Database size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => router.push("/lead/add")}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-blue-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 rounded-full p-4 mb-4 group-hover:bg-blue-100 transition-colors">
              <Plus size={28} className="text-blue-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Add Lead</p>
            <p className="text-sm text-gray-500">Create new lead entry</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenSource(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-emerald-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-emerald-50 rounded-full p-4 mb-4 group-hover:bg-emerald-100 transition-colors">
              <Database size={28} className="text-emerald-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Source</p>
            <p className="text-sm text-gray-500">Manage lead sources</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenResponse(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-amber-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-amber-50 rounded-full p-4 mb-4 group-hover:bg-amber-100 transition-colors">
              <Filter size={28} className="text-amber-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Response</p>
            <p className="text-sm text-gray-500">Configure responses</p>
          </div>
        </div>

        <div
          onClick={() => setIsOpenFetchLimit(true)}
          className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 hover:border-purple-300 hover:-translate-y-1"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-purple-50 rounded-full p-4 mb-4 group-hover:bg-purple-100 transition-colors">
              <Settings size={28} className="text-purple-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">Fetch Limit</p>
            <p className="text-sm text-gray-500">Set data limits</p>
          </div>
        </div>
      </div>

      {/* Enhanced Search & Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select
              className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>