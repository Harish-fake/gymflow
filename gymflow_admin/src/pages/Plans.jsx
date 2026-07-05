import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Check, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [form, setForm] = useState({ name: '', duration_days: 30, price: '', description: '', features: '' });

  useEffect(() => { loadPlans(); }, []);

  async function loadPlans() {
    try {
      const data = await api.getPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createPlan({
        ...form,
        price: parseFloat(form.price),
        duration_days: parseInt(form.duration_days),
        features: form.features.split('\n').filter(Boolean),
      });
      setShowAdd(false);
      setForm({ name: '', duration_days: 30, price: '', description: '', features: '' });
      toast.success('Plan created');
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
  };

  const openEdit = (p) => {
    setEditingPlan(p);
    setForm({
      name: p.name || '',
      duration_days: p.duration_days || 30,
      price: p.price?.toString() || '',
      description: p.description || '',
      features: Array.isArray(p.features) ? p.features.join('\n') : '',
    });
    setShowEdit(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await api.updatePlan(editingPlan.id, {
        ...form,
        price: parseFloat(form.price),
        duration_days: parseInt(form.duration_days),
        features: form.features.split('\n').filter(Boolean),
      });
      setShowEdit(false);
      setEditingPlan(null);
      setForm({ name: '', duration_days: 30, price: '', description: '', features: '' });
      toast.success('Plan updated');
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const openDelete = (p) => {
    setDeletingPlan(p);
    setShowDelete(true);
  };

  const handleDelete = async () => {
    if (!deletingPlan) return;
    try {
      await api.deletePlan(deletingPlan.id);
      setShowDelete(false);
      setDeletingPlan(null);
      toast.success('Plan deleted');
      loadPlans();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Membership Plans</h1>
          <p className="text-dark-400 mt-1">{plans.length} plans</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {plans.length === 0 ? (
            <div className="col-span-full text-center py-12 text-dark-400">No plans yet</div>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="card flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-3xl font-bold text-primary-500 mt-2">₹{plan.price?.toLocaleString()}</p>
                    <p className="text-sm text-dark-400">{plan.duration_days} days</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(plan)} className="text-dark-400 hover:text-primary-500 transition-colors p-1" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => openDelete(plan)} className="text-dark-400 hover:text-red-500 transition-colors p-1" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {plan.description && (
                  <p className="text-sm text-dark-400 mb-4">{plan.description}</p>
                )}
                {plan.features?.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-dark-300">{f}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-dark-700">
                  <p className="text-xs text-dark-500">{plan.member_count || 0} members on this plan</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Plan">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Plan Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Duration (days)</label>
              <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Price (₹)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="input-field" rows={4} placeholder="Unlimited access&#10;Personal trainer&#10;Free supplements" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Create Plan</button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Plan">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Plan Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Duration (days)</label>
              <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Price (₹)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} className="input-field" rows={4} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Update Plan</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Plan">
        <p className="text-dark-300 mb-6">Are you sure you want to delete <strong className="text-white">{deletingPlan?.name || 'this plan'}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowDelete(false)} className="btn-outline">Cancel</button>
          <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
