import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';

export default function Workouts() {
  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [deletingWorkout, setDeletingWorkout] = useState(null);
  const [form, setForm] = useState({ member_id: '', name: '', description: '', day_of_week: '', exercises: [] });
  const [exerciseForm, setExerciseForm] = useState({ name: '', category: 'chest', description: '', sets_reps: '' });
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit, setLimit] = useState(20);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const categories = ['chest', 'back', 'legs', 'shoulder', 'biceps', 'triceps', 'cardio', 'abs'];

  useEffect(() => { loadData(); }, [page, limit]);

  async function loadData() {
    try {
      const [wData, eData, mData] = await Promise.all([
        api.getWorkouts({ page, limit }),
        api.getExercises(),
        api.getMembers(),
      ]);
      if (Array.isArray(wData)) {
        setWorkouts(wData);
        setTotalPages(wData.length < limit ? page : page + 1);
        setTotalItems(wData.length);
      } else if (wData.workouts || wData.data) {
        const items = wData.workouts || wData.data || [];
        setWorkouts(items);
        setTotalItems(wData.total || items.length);
        setTotalPages(Math.ceil((wData.total || items.length) / limit) || 1);
      } else {
        setWorkouts([]);
      }
      setExercises(Array.isArray(eData) ? eData : []);
      setMembers(mData.members || mData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateWorkout = async (e) => {
    e.preventDefault();
    try {
      await api.createWorkout(form);
      setShowAdd(false);
      setForm({ member_id: '', name: '', description: '', day_of_week: '', exercises: [] });
      toast.success('Workout created');
      setPage(1);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openEditWorkout = (w) => {
    setEditingWorkout(w);
    setForm({
      member_id: w.member_id || '',
      name: w.name || '',
      description: w.description || '',
      day_of_week: w.day_of_week || '',
      exercises: (w.exercises || []).map((ex) => ({
        ...ex,
        name: exercises.find((e) => e.id === ex.exercise_id)?.name || '',
      })),
    });
    setShowEdit(true);
  };

  const handleEditWorkout = async (e) => {
    e.preventDefault();
    if (!editingWorkout) return;
    try {
      await api.updateWorkout(editingWorkout.id, form);
      setShowEdit(false);
      setEditingWorkout(null);
      setForm({ member_id: '', name: '', description: '', day_of_week: '', exercises: [] });
      toast.success('Workout updated');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
  };

  const openDeleteWorkout = (w) => {
    setDeletingWorkout(w);
    setShowDelete(true);
  };

  const handleDeleteWorkout = async () => {
    if (!deletingWorkout) return;
    try {
      await api.deleteWorkout(deletingWorkout.id);
      setShowDelete(false);
      setDeletingWorkout(null);
      toast.success('Workout deleted');
      setPage(1);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleCreateExercise = async (e) => {
    e.preventDefault();
    try {
      await api.createExercise({
        ...exerciseForm,
        sets_reps: exerciseForm.sets_reps ? (() => { try { return JSON.parse(exerciseForm.sets_reps); } catch { return []; } })() : [],
      });
      setShowAddExercise(false);
      setExerciseForm({ name: '', category: 'chest', description: '', sets_reps: '' });
      toast.success('Exercise added');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-dark-400 mt-1">{totalItems} workouts</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddExercise(true)} className="btn-outline flex items-center gap-2">
            <Plus size={18} /> Exercise
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Workout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-dark-400">No workouts yet</div>
            ) : (
              workouts.map((w) => (
                <div key={w.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{w.name}</h3>
                      <p className="text-xs text-dark-400 mt-1">
                        {w.day_of_week || w.schedule_date || 'Custom'} • {w.exercises?.length || 0} exercises
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${w.is_completed ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {w.is_completed ? 'DONE' : 'PENDING'}
                      </span>
                      <button onClick={() => openEditWorkout(w)} className="text-dark-400 hover:text-primary-500" title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => openDeleteWorkout(w)} className="text-dark-400 hover:text-red-500" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {w.member_profile?.full_name && (
                    <p className="text-xs text-dark-400">For: {w.member_profile.full_name}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalItems}
            onPageChange={setPage}
            pageSize={limit}
            onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
          />

          {exercises.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Exercise Library ({exercises.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {exercises.map((ex) => (
                  <div key={ex.id} className="bg-dark-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-white">{ex.name}</p>
                    <p className="text-xs text-dark-400 mt-1 capitalize">{ex.category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Workout">
        <form onSubmit={handleCreateWorkout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Member</label>
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="input-field" required>
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.user_id || m.id} value={m.user_id || m.id}>
                  {m.profile?.full_name || m.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Workout Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Day of Week</label>
            <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="input-field">
              <option value="">Custom</option>
              {days.map((d) => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Workout">
        <form onSubmit={handleEditWorkout} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Member</label>
            <select value={form.member_id} onChange={(e) => setForm({ ...form, member_id: e.target.value })} className="input-field" required>
              <option value="">Select member</option>
              {members.map((m) => (
                <option key={m.user_id || m.id} value={m.user_id || m.id}>
                  {m.profile?.full_name || m.email || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Workout Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Day of Week</label>
            <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })} className="input-field">
              <option value="">Custom</option>
              {days.map((d) => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowEdit(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Update</button>
          </div>
        </form>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Workout">
        <p className="text-dark-300 mb-6">Are you sure you want to delete <strong className="text-white">{deletingWorkout?.name || 'this workout'}</strong>? This action cannot be undone.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowDelete(false)} className="btn-outline">Cancel</button>
          <button onClick={handleDeleteWorkout} className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </Modal>

      <Modal open={showAddExercise} onClose={() => setShowAddExercise(false)} title="Add Exercise">
        <form onSubmit={handleCreateExercise} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Exercise Name</label>
            <input type="text" value={exerciseForm.name} onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Category</label>
            <select value={exerciseForm.category} onChange={(e) => setExerciseForm({ ...exerciseForm, category: e.target.value })} className="input-field">
              {categories.map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Description</label>
            <textarea value={exerciseForm.description} onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Sets & Reps (JSON)</label>
            <input type="text" value={exerciseForm.sets_reps} onChange={(e) => setExerciseForm({ ...exerciseForm, sets_reps: e.target.value })} className="input-field" placeholder='[{"set":1,"reps":12,"weight":50}]' />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowAddExercise(false)} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-primary">Add Exercise</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
