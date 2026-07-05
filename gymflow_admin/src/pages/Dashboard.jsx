import React, { useState, useEffect } from 'react';
import { Users, Dumbbell, CalendarCheck, IndianRupee, Activity, TrendingUp, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import Skeleton, { SkeletonCard, SkeletonChart, SkeletonList } from '../components/Skeleton';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const gymId = user?.selected_gym_id;
      const result = await api.getAdminDashboard(gymId);
      setStats(result);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-dark-700 rounded w-48 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadDashboard} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">Retry</button>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Members', value: stats?.stats?.totalMembers || 0, icon: Users, color: 'text-blue-400' },
    { label: 'Trainers', value: stats?.stats?.totalTrainers || 0, icon: Dumbbell, color: 'text-green-400' },
    { label: "Today's Attendance", value: stats?.stats?.todayAttendance || 0, icon: CalendarCheck, color: 'text-purple-400' },
    { label: 'Revenue', value: `₹${(stats?.stats?.totalRevenue || 0).toLocaleString()}`, icon: IndianRupee, color: 'text-yellow-400' },
    { label: 'Active Plans', value: stats?.stats?.activePlans || 0, icon: Activity, color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, {user?.user_profiles?.full_name || 'Admin'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Overview</h3>
          {stats?.monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} tickFormatter={(v) => {
                  const d = new Date(v + 'T00:00:00');
                  return d.toLocaleString('default', { month: 'short' });
                }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Line type="monotone" dataKey="revenue" stroke="#FF6B35" strokeWidth={2} dot={{ fill: '#FF6B35' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No revenue data yet</div>
          )}
        </div>

        <div className="bg-dark-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Membership Plans</h3>
          {stats?.plans?.length > 0 ? (
            <div className="space-y-3">
              {stats.plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{plan.name}</p>
                    <p className="text-sm text-gray-400">{plan.duration_days} days</p>
                  </div>
                  <p className="text-lg font-bold text-primary">₹{plan.price}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">No plans created yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
