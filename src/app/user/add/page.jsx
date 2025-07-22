'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';

export default function CreateUserPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
    name: '',
    role: '',
    father_name: '',
    is_active: true,
    experience: '',
    date_of_joining: '',
    date_of_birth: '',
    pan: '',
    aadhaar: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    comment: '',
    branch_id: '',
    manager_id: '',
    sales_manager_id: '',
    tl_id: '',
    password: '',
  });

  const getCurrentUser = () => {
    const token = Cookies.get('access_token');
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    fetchData();
  }, []);

  const fetchData = async () => {
    const [branchRes, userRes, roleRes] = await Promise.all([
      axios.get('http://147.93.30.144:8000/branches/?skip=0&limit=100&active_only=true'),
      axios.get('http://147.93.30.144:8000/users/?skip=0&limit=100&active_only=true'),
      axios.get('http://147.93.30.144:8000/users/roles'),
    ]);
    setBranches(branchRes.data || []);
    setUsers(userRes.data || []);
    setRoles(roleRes.data.roles || []);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validate = () => {
    const err = {};
    if (!formData.name) err.name = 'Required';
    if (!formData.role) err.role = 'Required';
    if (!formData.pan) err.pan = 'Required';
    if (!formData.aadhaar) err.aadhaar = 'Required';

    if (currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'HR') {
      if (!formData.branch_id) err.branch_id = 'Branch is required';
    }

    if (['BA', 'SBA'].includes(formData.role)) {
      if (!formData.sales_manager_id) err.sales_manager_id = 'Sales Manager required';
      if (!formData.tl_id) err.tl_id = 'Team Lead required';
    }

    if (formData.role === 'TL') {
      if (!formData.sales_manager_id) err.sales_manager_id = 'Sales Manager required';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        ...formData,
        experience: parseInt(formData.experience) || 0,
        branch_id: currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'HR'
          ? formData.branch_id
          : currentUser?.branch_id,
      };

      const res = await axios.post('http://147.93.30.144:8000/users/', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      alert('User created successfully!');
      router.push('/dashboard/users');
    } catch (err) {
      alert('Error creating user');
      console.error(err);
    }
  };

  const filteredSalesManagers = users.filter(u => u.role === 'SALES MANAGER');
  const filteredTLs = users.filter(u => u.role === 'TL');

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Create New User</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        {[
          ['name', 'Full Name'],
          ['father_name', "Father's Name"],
          ['phone_number', 'Phone'],
          ['email', 'Email'],
          ['experience', 'Experience (Years)', 'number'],
          ['date_of_joining', 'Date of Joining', 'date'],
          ['date_of_birth', 'Date of Birth', 'date'],
          ['pan', 'PAN'],
          ['aadhaar', 'Aadhaar'],
          ['address', 'Address'],
          ['city', 'City'],
          ['state', 'State'],
          ['pincode', 'Pincode'],
          ['comment', 'Comment'],
          ['password', 'Password', 'password'],
        ].map(([name, placeholder, type = 'text']) => (
          <div key={name}>
            <input
              name={name}
              placeholder={placeholder}
              type={type}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              value={formData[name]}
            />
            {errors[name] && <p className="text-red-500 text-sm">{errors[name]}</p>}
          </div>
        ))}

        {/* Role Select */}
        <div className="col-span-2">
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="border p-2 rounded w-full"
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.value}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}
        </div>

        {/* Branch Selector: only for SUPERADMIN / HR */}
        {(currentUser?.role === 'SUPERADMIN' || currentUser?.role === 'HR') && (
          <div className="col-span-2">
            <select
              name="branch_id"
              value={formData.branch_id}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.branch_id && <p className="text-red-500 text-sm">{errors.branch_id}</p>}
          </div>
        )}

        {/* Sales Manager Select */}
        {['BA', 'SBA', 'TL'].includes(formData.role) && (
          <div className="col-span-2">
            <select
              name="sales_manager_id"
              value={formData.sales_manager_id}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            >
              <option value="">Select Sales Manager</option>
              {filteredSalesManagers.map((u) => (
                <option key={u.employee_code} value={u.employee_code}>
                  {u.name} ({u.employee_code})
                </option>
              ))}
            </select>
            {errors.sales_manager_id && (
              <p className="text-red-500 text-sm">{errors.sales_manager_id}</p>
            )}
          </div>
        )}

        {/* TL Select */}
        {['BA', 'SBA'].includes(formData.role) && (
          <div className="col-span-2">
            <select
              name="tl_id"
              value={formData.tl_id}
              onChange={handleChange}
              className="border p-2 rounded w-full"
            >
              <option value="">Select Team Lead</option>
              {filteredTLs.map((u) => (
                <option key={u.employee_code} value={u.employee_code}>
                  {u.name} ({u.employee_code})
                </option>
              ))}
            </select>
            {errors.tl_id && <p className="text-red-500 text-sm">{errors.tl_id}</p>}
          </div>
        )}

        <div className="col-span-2 flex gap-2 items-center">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleChange}
          />
          <label>Is Active?</label>
        </div>

        <button type="submit" className="col-span-2 bg-blue-600 text-white py-2 rounded">
          Create User
        </button>
      </form>
    </div>
  );
}
