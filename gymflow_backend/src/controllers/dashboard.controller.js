import { supabaseAdmin } from '../config/supabase.js';

export async function adminDashboard(req, res) {
  try {
    const gymId = req.query.gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.json({ stats: {}, revenue_chart: [], recent_payments: [], expiring_memberships: [], membership_distribution: [] });
    }

    const { data: stats } = await supabaseAdmin.rpc('get_admin_dashboard_stats', { p_gym_id: gymId });

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data: revenueData } = await supabaseAdmin
      .from('payments')
      .select('amount, payment_date')
      .eq('gym_id', gymId)
      .eq('status', 'completed')
      .gte('payment_date', sixMonthsAgo.toISOString())
      .order('payment_date', { ascending: true });

    const monthlyRevenue = {};
    revenueData?.forEach((p) => {
      const month = new Date(p.payment_date).toISOString().substring(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + Number(p.amount);
    });

    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select('*, user:users!user_id(id, email), plan:membership_plans(name)')
      .eq('gym_id', gymId)
      .order('payment_date', { ascending: false })
      .limit(5);

    if (recentPayments) {
      const rpIds = [...new Set(recentPayments.map(p => p.user_id).filter(Boolean))];
      if (rpIds.length > 0) {
        const { data: rpProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('user_id', rpIds);
        const rpMap = {};
        (rpProfiles || []).forEach(prof => { rpMap[prof.user_id] = prof; });
        recentPayments.forEach(p => { p.profile = rpMap[p.user_id] || null; });
      }
    }

    const { data: expiring } = await supabaseAdmin
      .from('members')
      .select('id, end_date, user:users!user_id(id, email)')
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gte('end_date', now.toISOString().split('T')[0])
      .lte('end_date', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .limit(10);

    if (expiring) {
      const expIds = [...new Set(expiring.map(m => m.user_id).filter(Boolean))];
      if (expIds.length > 0) {
        const { data: expProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('user_id', expIds);
        const expMap = {};
        (expProfiles || []).forEach(prof => { expMap[prof.user_id] = prof; });
        expiring.forEach(m => { m.profile = expMap[m.user_id] || null; });
      }
    }

    const { data: planDistribution } = await supabaseAdmin
      .from('members')
      .select('plan:membership_plans(name)')
      .eq('gym_id', gymId)
      .eq('status', 'active');

    const planCounts = {};
    planDistribution?.forEach((m) => {
      const name = m.plan?.name || 'No Plan';
      planCounts[name] = (planCounts[name] || 0) + 1;
    });

    return res.json({
      stats: stats || {},
      revenue_chart: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue })),
      recent_payments: recentPayments || [],
      expiring_memberships: expiring || [],
      membership_distribution: Object.entries(planCounts).map(([name, count]) => ({ name, count })),
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function trainerDashboard(req, res) {
  try {
    const gymId = req.query.gym_id || req.user.selected_gym_id;

    const { data: stats } = await supabaseAdmin.rpc('get_trainer_dashboard_stats', {
      p_user_id: req.user.id,
      p_gym_id: gymId,
    });

    const { data: assignedMembers } = await supabaseAdmin
      .from('members')
      .select('id, status, end_date, user:users!user_id(id, email)')
      .eq('assigned_trainer_id', req.user.id)
      .eq('gym_id', gymId);

    if (assignedMembers) {
      const amIds = [...new Set(assignedMembers.map(m => m.user_id).filter(Boolean))];
      if (amIds.length > 0) {
        const { data: amProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('user_id', amIds);
        const amMap = {};
        (amProfiles || []).forEach(prof => { amMap[prof.user_id] = prof; });
        assignedMembers.forEach(m => { m.profile = amMap[m.user_id] || null; });
      }
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: todaySchedule } = await supabaseAdmin
      .from('workouts')
      .select('*, member:users!member_id(id, email)')
      .eq('trainer_id', req.user.id)
      .eq('gym_id', gymId)
      .eq('schedule_date', today);

    if (todaySchedule) {
      const tsIds = [...new Set(todaySchedule.map(w => w.member_id).filter(Boolean))];
      if (tsIds.length > 0) {
        const { data: tsProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('user_id', tsIds);
        const tsMap = {};
        (tsProfiles || []).forEach(prof => { tsMap[prof.user_id] = prof; });
        todaySchedule.forEach(w => { w.member_profile = tsMap[w.member_id] || null; });
      }
    }

    const activeMembers = assignedMembers?.filter((m) => m.status === 'active').length || 0;

    return res.json({
      stats: stats || { assigned_members: activeMembers },
      stats: {
        totalMembers: totalMembers || 0,
        todayAttendance,
        pendingWorkouts: workouts?.filter(w => !w.is_completed).length || 0,
      },
      members: members?.map(m => ({
        id: m.user_id,
        name: m.user?.user_profiles?.full_name || 'Unknown',
        email: m.user?.email,
        status: m.status,
        end_date: m.end_date,
      })) || [],
      recentWorkouts: workouts || [],
    });
  } catch (err) {
    console.error('Trainer dashboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function memberDashboard(req, res) {
  try {
    const { gym_id } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;

    const { data: member } = await supabaseAdmin
      .from('members')
      .select('*, membership_plans(*), trainer:users!members_assigned_trainer_id_fkey(id, user_profiles(full_name))')
      .eq('user_id', req.user.id)
      .eq('gym_id', gymId)
      .single();

    const today = new Date().toISOString().split('T')[0];
    
    const { data: attendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('gym_id', gymId)
      .order('date', { ascending: false })
      .limit(30);

    const checkedInToday = attendance?.some(a => a.date === today && !a.check_out) || false;

    const { data: workouts } = await supabaseAdmin
      .from('workouts')
      .select('*')
      .eq('member_id', req.user.id)
      .eq('gym_id', gymId)
      .order('schedule_date', { ascending: false })
      .limit(5);

    const { data: progress } = await supabaseAdmin
      .from('progress_logs')
      .select('*')
      .eq('member_id', req.user.id)
      .order('date', { ascending: false })
      .limit(5);

    return res.json({
      membership: member || null,
      checkedInToday,
      recentAttendance: attendance?.filter(a => a.date !== today).slice(0, 10) || [],
      todayRecord: attendance?.find(a => a.date === today) || null,
      upcomingWorkouts: workouts?.filter(w => !w.is_completed) || [],
      recentProgress: progress || [],
    });
  } catch (err) {
    console.error('Member dashboard error:', err);
    return res.status(500).json({ error: err.message });
  }
}