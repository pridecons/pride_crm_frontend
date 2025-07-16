import React from "react";

export default async function EditUserPage({ params }) {
  const { id } = params; // id = employee_code like "EMP001"

  let user = null;

  try {
    const res = await fetch(`http://127.0.0.1:8000/users/${id}`, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error("User not found");
    user = await res.json();
  } catch (error) {
    return <div className="p-6 text-red-600">User not found: {id}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Edit User: {user.name}</h1>
      <div className="space-y-2">
        <div><strong>Employee Code:</strong> {user.employee_code}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Phone:</strong> {user.phone_number}</div>
        <div><strong>Role:</strong> {user.role}</div>
        <div><strong>Branch ID:</strong> {user.branch_id || "N/A"}</div>
        {/* Add form to edit if needed */}
      </div>
    </div>
  );
}
