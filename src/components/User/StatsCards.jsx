import { Users, Check, Building2, Shield } from "lucide-react";

export default function StatsCards({ users, branches, roles }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card title="Total Users" value={users.length} icon={<Users className="w-6 h-6 text-blue-600" />} />
      <Card title="Active Users" value={users.filter(u => u.is_active).length} icon={<Check className="w-6 h-6 text-green-600" />} />
      <Card title="Branches" value={branches.length} icon={<Building2 className="w-6 h-6 text-purple-600" />} />
      <Card title="Roles" value={roles.length} icon={<Shield className="w-6 h-6 text-amber-600" />} />
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      <div className="bg-gray-50 p-3 rounded-full">{icon}</div>
    </div>
  );
}
