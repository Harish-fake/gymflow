import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Trainers() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState(null);
  const [deletingTrainer, setDeletingTrainer] = useState(null);
  const [form, setForm] = useState({ email: '', full_name: '', phone: '', specialization: '' });

  useEffect(() => { loadTrainers(); }, []);

  async function loadTrainers() {
    try {
      const params = {};
      if (search) params.search = search;
      const data = await api.getTrainers(params);
      setTrainers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createTrainer(form);
      setShowAdd(false);
      setForm({ email: '', full_name: '', phone: '', specialization: '' });
      toast.success('Trainer created');
      loadTrainers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const openEdit = (t) => {
    setEditingTrainer(t);
    setForm({
      full_name: t.profile?.full_name || '',
      email: t.user?.email || '',
      phone: t.profile?.phone || '',
      specialization: t.specialization || '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingTrainer) return;
    try {
      await api.updateTrainer(editingTrainer.id, form);
      setShowEdit(false);
      setEditingTrainer(null);
      setForm({ email: '', full_name: '', phone: '', specialization: '' });
      toast.success('Trainer updated');
      loadTrainers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const openDelete = (t) => {
    setDeletingTrainer(t);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deletingTrainer) return;
    try {
      await api.deleteTrainer(deletingTrainer.id);
      setShowDelete(false);
      setDeletingTrainer(null);
      toast.success('Trainer deleted');
      loadTrainers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trainers</h1>
          <p className="text-dark-400 mt-1">{trainers.length} trainers</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Trainer
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search trainers..."
          className="input-field pl-10" onKeyDown={(e) => e.key === 'Enter' && loadTrainers()} />
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Trainer</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Specialization</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-dark-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-12 text-dark-400">No trainers found</td></tr>
                ) : (
                  trainers.map((t) => (
                    <tr key={t.id} className="border-b border-dark-700 hover:bg-dark-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-medium">
                            {t.profile?.full_name?.[0] || 'T'}
                          </div>
                          <span className="text-sm font-medium text-white">{t.profile?.full_name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-400">{t.user?.email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-dark-400">{t.specialization || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${t.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {t.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(t)} className="text-dark-400 hover:text-primary-500 transition-colors" title="Edit">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => openDelete(t)} className="text-dark-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Trainer">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Phone</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Specialization</label>
            <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Add Trainer</button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Trainer">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Full Name</label>
            <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Phone</label>
            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Specialization</label>
            <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Update</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Trainer">
        <p className="text-dark-300 mb-6">Are you sure you want to delete <strong className="text-white">{deletingTrainer?.profile?.full_name || 'this trainer'}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowDelete(false)} className="btn-outline">Cancel</button>
          <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
