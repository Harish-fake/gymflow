import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import api from '../services/api';

const defaultSettings = {
  gym_name: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  email: '',
};

export default function Settings() {
  const [settings, setSettings] = useState({ ...defaultSettings });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSettings();
      if (data) setSettings({ ...defaultSettings, ...data });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load settings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-dark-400">{error}</p>
        <button onClick={loadSettings} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-dark-400 mt-1">Manage your gym profile</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} /> {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Gym Name</label>
            <input type="text" value={settings.gym_name} onChange={(e) => setSettings({ ...settings, gym_name: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Address</label>
            <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">City</label>
            <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">State</label>
            <input type="text" value={settings.state} onChange={(e) => setSettings({ ...settings, state: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Pincode</label>
            <input type="text" value={settings.pincode} onChange={(e) => setSettings({ ...settings, pincode: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Phone</label>
            <input type="text" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
            <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="input-field" />
          </div>
        </div>
      </div>
    </div>
  );
}
