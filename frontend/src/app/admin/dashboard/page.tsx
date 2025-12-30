'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Image as ImageIcon, 
  TrendingUp, 
  Search,
  Edit2,
  Loader2,
  LogOut,
  Shield,
  Calendar
} from 'lucide-react';
import axios from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  isAdmin: boolean;
  createdAt: string;
  _count: {
    generations: number;
  };
}

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  activeUsers: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<number>(0);

  useEffect(() => {
    checkAuth();
    loadData();
  }, [page, search]);

  const checkAuth = () => {
    const user = useAuthStore.getState().user;
    const token = useAuthStore.getState().token;
    
    if (!token || !user) {
      router.push('/admin/login');
      return;
    }

    if (!user.isAdmin) {
      toast.error('Akses ditolak');
      router.push('/login');
    }
  };

  const loadData = async () => {
    try {
      const token = useAuthStore.getState().token;
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [statsRes, usersRes] = await Promise.all([
        axios.get('/admin/stats', config),
        axios.get(`/admin/users?page=${page}&limit=10&search=${search}`, config),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setTotalPages(usersRes.data.pagination.totalPages);
    } catch (error: any) {
      console.error('Load error:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error('Sesi berakhir, silakan login kembali');
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditCredits = (user: User) => {
    setEditingUserId(user.id);
    setEditCredits(user.credits);
  };

  const handleSaveCredits = async (userId: string) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.put(
        `/admin/users/${userId}/credits`,
        { credits: editCredits },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Kredit berhasil diupdate!');
      setEditingUserId(null);
      loadData();
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('Gagal update kredit');
    }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    toast.success('Logout berhasil');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#4f46e5' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-gray-500">
                  Monitoring & Management Only
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Admin Account - Monitoring Only
              </h3>
              <p className="text-sm text-blue-800">
                Akun admin hanya untuk monitoring dan management user. Untuk menggunakan fitur AI generation, silakan login dengan akun user biasa.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#eef2ff' }}>
                <Users className="w-6 h-6" style={{ color: '#4f46e5' }} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Generations</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalGenerations || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fce7f3' }}>
                <ImageIcon className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Users (7d)</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#dcfce7' }}>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Manajemen User
              </h2>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari user berdasarkan email atau nama..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {user.name || 'No Name'}
                          {user.isAdmin && (
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editCredits}
                            onChange={(e) => setEditCredits(parseInt(e.target.value) || 0)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleSaveCredits(user.id)}
                            className="px-3 py-1 text-xs text-white rounded"
                            style={{ backgroundColor: '#4f46e5' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold" style={{ color: '#4f46e5' }}>
                          {user.credits}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user._count.generations}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(user.createdAt).toLocaleDateString('id-ID')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUserId !== user.id && (
                        <button
                          onClick={() => handleEditCredits(user)}
                          className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
