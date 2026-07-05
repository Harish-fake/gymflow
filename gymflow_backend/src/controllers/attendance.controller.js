import { supabaseAdmin } from '../config/supabase.js';

export async function listAttendance(req, res) {
  try {
    const { gym_id, date, member_id, page = 1, limit = 50 } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;
    
    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    let query = supabaseAdmin
      .from('attendance')
      .select('*, user:users!inner(id, email, role, user_profiles!inner(full_name, phone))', { count: 'exact' })
      .eq('gym_id', gymId)
      .order('check_in', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (date) query = query.eq('date', date);
    if (member_id) query = query.eq('user_id', member_id);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('List attendance error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function todayAttendance(req, res) {
  try {
    const { gym_id } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;
    
    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('*, user:users!inner(id, email, role, user_profiles!inner(full_name, phone))')
      .eq('gym_id', gymId)
      .eq('date', today)
      .order('check_in', { ascending: false });

    if (error) throw error;

    const checkedIn = data?.filter(a => a.check_in && !a.check_out) || [];
    const checkedOut = data?.filter(a => a.check_in && a.check_out) || [];

    return res.json({
      date: today,
      total: data?.length || 0,
      checkedIn: checkedIn.length,
      checkedOut: checkedOut.length,
      data: data || [],
    });
  } catch (err) {
    console.error('Today attendance error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function myAttendance(req, res) {
  try {
    const { gym_id } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('gym_id', gymId)
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];
    const todayRecord = data?.find(a => a.date === today && !a.check_out);

    return res.json({
      data: data || [],
      checkedInToday: !!todayRecord,
      todayRecord: todayRecord || null,
    });
  } catch (err) {
    console.error('My attendance error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function checkIn(req, res) {
  try {
    const { gym_id, method = 'manual' } = req.body;
    const gymId = gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('gym_id', gymId)
      .eq('date', today)
      .is('check_out', null)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .insert({
        user_id: req.user.id,
        gym_id: gymId,
        check_in: now,
        date: today,
        method,
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      message: 'Check-in successful',
      data,
    });
  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function checkOut(req, res) {
  try {
    const { id } = req.params;

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .update({ check_out: now })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    return res.json({
      message: 'Check-out successful',
      data,
    });
  } catch (err) {
    console.error('Check-out error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function generateQR(req, res) {
  try {
    const { gym_id } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    const today = new Date().toISOString().split('T')[0];
    const code = `${gymId}-${today}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('qr_codes')
      .insert({ gym_id: gymId, code, date: today, expires_at: expiresAt })
      .select()
      .single();

    if (error) throw error;

    return res.json({ data: { id: data.id, code: data.code, expires_at: data.expires_at } });
  } catch (err) {
    console.error('Generate QR error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function attendanceCalendar(req, res) {
  try {
    const { gym_id, month, year } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    const targetMonth = parseInt(month || new Date().getMonth() + 1);
    const targetYear = parseInt(year || new Date().getFullYear());

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('attendance')
      .select('date, check_in, check_out')
      .eq('gym_id', gymId)
      .eq('user_id', req.user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (err) {
    console.error('Attendance calendar error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function attendanceReport(req, res) {
  try {
    const { gym_id, start_date, end_date, member_id } = req.query;
    const gymId = gym_id || req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    let query = supabaseAdmin
      .from('attendance')
      .select('*, user:users!inner(id, email, user_profiles!inner(full_name))')
      .eq('gym_id', gymId)
      .order('date', { ascending: false });

    if (start_date) query = query.gte('date', start_date);
    if (end_date) query = query.lte('date', end_date);
    if (member_id) query = query.eq('user_id', member_id);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (err) {
    console.error('Attendance report error:', err);
    return res.status(500).json({ error: err.message });
  }
}
