import { Search, Filter, Building2 } from "lucide-react";

export default function UserFilters({
  searchQuery, setSearchQuery,
  selectedRole, setSelectedRole,
  selectedBranch, setSelectedBranch,
  roles, branches
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 flex flex-col lg:flex-row justify-between gap-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by name, email, phone or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl"
        />
      </div>
      <div className="flex gap-3">
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="border rounded-xl px-4 py-3">
          <option value="All">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="border rounded-xl px-4 py-3">
          <option value="All">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>
    </div>
  );
}
