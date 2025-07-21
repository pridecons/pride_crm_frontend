'use client'
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode';
import {
  Users,
  User,
  LogOut,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  FileText,
  Target,
  BarChart3
} from 'lucide-react'

export default function Sidebar({ branchId, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState({
    leads: true,
    configuration: true
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const accessToken = Cookies.get('access_token');
    const userInfo = Cookies.get('user_info');

    if (accessToken && userInfo) {
      const decoded = jwtDecode(accessToken);
      setUser({
        ...JSON.parse(userInfo),
        role: decoded.role,
      });
    }
  }, []);

  const toggleProfileMenu = () => {
    setShowProfileMenu((prev) => !prev);
  };

  const handleLogout = () => {
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    Cookies.remove('user_info');
    router.push('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => pathname === path;

  const NavItem = ({ href, icon: Icon, label }) => (
    <Link
      href={href}
      className={`
        flex items-center space-x-3 px-4 py-3 rounded-lg transition
        ${isActive(href)
          ? 'bg-blue-600 text-white font-semibold'
          : 'text-gray-700 hover:bg-gray-100'
        }
      `}
      onClick={onClose}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );

  // ✅ Menu without permissions
  const menu = [
    {
      title: 'Main',
      items: [
        { href: '/dashboard', icon: BarChart3, label: 'Home' }
      ]
    },
    {
      title: 'Leads',
      section: 'leads',
      icon: FileText,
      items: [
        { href: '/lead', icon: Target, label: 'Lead' },
        { href: '/lead/add', icon: Plus, label: 'Add Lead' },
        { href: '/lead/manage', icon: FileText, label: 'Manage Leads' },
      ]
    },
    {
      title: 'Configuration',
      section: 'configuration',
      icon: Settings,
      items: [
        { href: '/user', icon: Users, label: 'Users' },
        { href: '/permission', icon: Users, label: 'Permissions' },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 shadow">
      {/* Header */}
      

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menu.map((section, idx) => (
          <div key={idx}>
            {section.section ? (
              <>
                <button
                  onClick={() => toggleSection(section.section)}
                  className="flex justify-between items-center w-full px-4 py-2 text-left text-gray-800 font-semibold hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <section.icon size={16} />
                    <span>{section.title}</span>
                  </div>
                  {expandedSections[section.section] ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                {expandedSections[section.section] && (
                  <div className="ml-4 mt-1 space-y-1">
                    {section.items.map((item, i) => (
                      <NavItem key={i} href={item.href} icon={item.icon} label={item.label} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <p className="text-xs text-gray-500 font-bold mb-2">{section.title}</p>
                {section.items.map((item, i) => (
                  <NavItem key={i} href={item.href} icon={item.icon} label={item.label} />
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-white text-xs text-gray-500 text-center">
        v2.1.0 • System Online
      </div>
    </div>
  );
}
