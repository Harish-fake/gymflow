import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, User, Activity } from 'lucide-react';
import api from '../services/api';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadMember(); }, [id]);

  async function loadMember() {
    setError(null);
    try {
      const data = await api.getMember(id);
      setMember(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load member');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="card p-6 text-center"><p className="text-red-400 mb-2">{error}</p><button onClick={() => { setLoading(true); setError(null); loadMember(); }} className="btn-outline mt-4">Retry</button></div>;
  if (!member) return <div className="text-dark-400">Member not found</div>;

  const profile = member.user?.profile || {};
  const plan = member.plan || {};

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/members')} className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors">
        <ArrowLeft size={18} /> Back to Members
      </button>

      <div className="card">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center text-2xl font-bold text-primary-500">
            {profile.full_name?.[0] || '?'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{profile.full_name || 'Unknown'}</h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-dark-400">
              <span className="flex items-center gap-1.5"><Mail size={14} /> {member.user?.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={14} /> {member.user?.profile?.phone || 'N/A'}</span>
              <span className="flex items-center gap-1.5"><Calendar size={14} /> Joined: {member.join_date || 'N/A'}</span>
            </div>
            <div className="mt-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                member.status === 'active' ? 'bg-green-500/10 text-green-500' :
                member.status === 'expired' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'
              }`}>{member.status?.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Membership</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">Plan</span><span>{plan.name || 'N/A'}</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">Start Date</span><span>{member.start_date || 'N/A'}</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">End Date</span><span className={member.end_date && new Date(member.end_date) - new Date() < 7 * 86400000 && new Date(member.end_date) > new Date() ? 'text-yellow-500' : ''}>{member.end_date || 'N/A'}</span></div>
            <div className="flex justify-between py-2"><span className="text-dark-400">Trainer</span><span>{member.trainer?.email || 'Not assigned'}</span></div>
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Personal Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">Gender</span><span>{profile.gender || 'N/A'}</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">DOB</span><span>{profile.dob || 'N/A'}</span></div>
            <div className="flex justify-between py-2 border-b border-dark-700"><span className="text-dark-400">Blood Group</span><span>{profile.blood_group || 'N/A'}</span></div>
            <div className="flex justify-between py-2"><span className="text-dark-400">Address</span><span className="text-right">{profile.address || 'N/A'}</span></div>
          </div>
        </div>
      </div>

      {member.recent_attendance?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Attendance</h2>
          <div className="space-y-2">
            {member.recent_attendance.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                <span className="text-sm text-dark-300">{a.check_in_time || a.date}</span>
                <span className={`text-xs font-medium ${a.check_out ? 'text-green-500' : 'text-yellow-500'}`}>
                  {a.check_out ? 'Checked Out' : 'Checked In'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
