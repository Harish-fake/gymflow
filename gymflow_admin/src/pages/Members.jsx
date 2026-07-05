import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Phone, Mail, MoreVertical, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import api from '../services/api';

export default function Members() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState({ email: '', password: '', full_name: '', phone: '', role: 'member' });
  const [creating, setCreating] = useState(false);

  const loadMembers = useCallback(async (searchTerm = '') => {
    try {
      setLoading(true);
      setError(null);
      const params = { page, limit };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      const result = await api.getMembers(params);
      setMembers(result.data || []);
      setTotal(result.pagination?.total || 0);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Load members error:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter]);

  useEffect(() => {
    loadMembers(search);
  }, [page, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        setPage(1);
        loadMembers(search);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  function handleSearch(val) {
    setSearch(val);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setPage(1);
  }

  async function handleCreateMember(e) {
    e.preventDefault();
    try {
      setCreating(true);
      await api.createMember(newMember);
      toast.success('Member created successfully');
      setShowAddModal(false);
      setNewMember({ email: '', password: '', full_name: '', phone: '', role: 'member' });
      loadMembers(search);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create member');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Members</h1>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
          <Plus size={18} /> Add Member
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search by name or email..."
            value={search} onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {(search || statusFilter) && (
          <button onClick={clearFilters} className="p-2.5 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg">
            <X size={18} />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-dark-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Plan</th>
                <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">End Date</th>
                <th className="w-16 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-500">No members found</td></tr>
              ) : members.map((m) => (
                <tr key={m.user_id || m.id} className="border-b border-dark-700 hover:bg-dark-700/50 cursor-pointer" onClick={() => navigate(`/members/${m.user_id || m.id}`)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary text-sm font-medium">{(m.user?.user_profiles?.full_name || '?')[0]}</span>
                      </div>
                      <span className="text-white font-medium">{m.user?.user_profiles?.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-gray-300"><Mail size={14} /> {m.user?.email || 'N/A'}</span></td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-gray-300"><Phone size={14} /> {m.user?.user_profiles?.phone || 'N/A'}</span></td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    m.status === 'active' ? 'bg-green-900/30 text-green-400' :
                    m.status === 'expired' ? 'bg-red-900/30 text-red-400' :
                    m.status === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>{m.status}</span></td>
                  <td className="px-4 py-3 text-gray-300">{m.membership_plans?.name || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-300">{m.end_date ? new Date(m.end_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-4 py-3"><button className="p-1 hover:bg-dark-600 rounded"><MoreVertical size={16} className="text-gray-400" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Member">
        <form onSubmit={handleCreateMember} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Full Name *</label>
            <input type="text" required value={newMember.full_name} onChange={(e) => setNewMember({...newMember, full_name: e.target.value})}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email *</label>
            <input type="email" required value={newMember.email} onChange={(e) => setNewMember({...newMember, email: e.target.value})}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password *</label>
            <input type="password" required value={newMember.password} onChange={(e) => setNewMember({...newMember, password: e.target.value})}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Phone</label>
            <input type="text" value={newMember.phone} onChange={(e) => setNewMember({...newMember, phone: e.target.value})}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" disabled={creating} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
              {creating ? 'Creating...' : 'Create Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
