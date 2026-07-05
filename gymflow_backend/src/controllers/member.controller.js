import { supabaseAdmin } from '../config/supabase.js';

export async function listMembers(req, res) {
  try {
    const { gym_id, status, search, page = 1, limit = 20 } = req.query;

    let query = supabaseAdmin
      .from('members')
      .select('*, user:users!user_id(id, email, phone, avatar_url, is_active, profile:user_profiles(*)), plan:membership_plans(*), trainer:users!assigned_trainer_id(id, email)')
      .order('created_at', { ascending: false });

    if (gym_id) query = query.eq('gym_id', gym_id);
    else if (req.user.selected_gym_id) query = query.eq('gym_id', req.user.selected_gym_id);
    if (status) query = query.eq('status', status);

    if (search) {
      const { data: nameMatches } = await supabaseAdmin
        .from('users')
        .select('id')
        .ilike('email', `%${search}%`);

      const nameMatchIds = nameMatches?.map(u => u.id) || [];

      const { data: profileMatches } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .ilike('full_name', `%${search}%`);

      const profileMatchIds = profileMatches?.map(u => u.user_id) || [];

      const allMatchIds = [...new Set([...nameMatchIds, ...profileMatchIds])];

      if (allMatchIds.length > 0) {
        query = query.in('user_id', allMatchIds);
      } else {
        query = query.in('user_id', ['00000000-0000-0000-0000-000000000000']);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: members, error, count } = await query;

    if (error) throw error;

    return res.json({ members, total: count || members?.length || 0, page: Number(page) });
  } catch (err) {
    console.error('List members error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMember(req, res) {
  try {
    const { id } = req.params;

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .select('*, user:users!user_id(id, email, phone, avatar_url, is_active, profile:user_profiles(*)), plan:membership_plans(*), trainer:users!assigned_trainer_id(id, email)')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const { data: recentAttendance } = await supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', member.user_id)
      .order('date', { ascending: false })
      .limit(10);

    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('user_id', member.user_id)
      .order('payment_date', { ascending: false })
      .limit(5);

    return res.json({ ...member, recent_attendance: recentAttendance || [], recent_payments: recentPayments || [] });
  } catch (err) {
    console.error('Get member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createMember(req, res) {
  try {
    const { email, password, full_name, phone, gym_id, membership_plan_id, start_date, assigned_trainer_id } = req.validated.body;

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';

    const { data: userId, error: createErr } = await supabaseAdmin.rpc('create_auth_user', {
      p_email: email,
      p_password: tempPassword,
      p_full_name: full_name || '',
      p_phone: phone || null,
      p_role: 'member',
    });

    if (createErr) {
      if (createErr.message?.includes('duplicate') || createErr.code === '23505') {
        return res.status(400).json({ error: 'User already exists' });
      }
      throw createErr;
    }

    const targetGymId = gym_id || req.user.selected_gym_id;

    let planDuration = 30;
    if (membership_plan_id) {
      const { data: plan } = await supabaseAdmin.from('membership_plans').select('duration_days').eq('id', membership_plan_id).single();
      if (plan) planDuration = plan.duration_days;
    }

    const memberStartDate = start_date ? new Date(start_date) : new Date();
    const memberEndDate = new Date(memberStartDate);
    memberEndDate.setDate(memberEndDate.getDate() + planDuration);

    const { data: member, error: memberError } = await supabaseAdmin.from('members').insert({
      user_id: userId,
      gym_id: targetGymId,
      membership_plan_id: membership_plan_id || null,
      start_date: memberStartDate.toISOString().split('T')[0],
      end_date: memberEndDate.toISOString().split('T')[0],
      status: 'active',
      assigned_trainer_id: assigned_trainer_id || null,
    }).select().single();

    if (memberError) {
      console.error('Member insert error:', memberError);
      return res.status(400).json({ error: memberError.message });
    }

    await supabaseAdmin.from('user_gyms').upsert({
      user_id: userId,
      gym_id: targetGymId,
      role: 'member',
    }, { onConflict: ['user_id', 'gym_id'], ignoreDuplicates: true });

    return res.status(201).json({
      ...member,
      temp_password: tempPassword,
      message: 'Member created successfully. Share credentials with the member.',
    });
  } catch (err) {
    console.error('Create member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateMember(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['membership_plan_id', 'assigned_trainer_id', 'status', 'notes', 'referral_source'];
    const memberUpdate = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) memberUpdate[field] = updates[field];
    }

    if (updates.start_date) memberUpdate.start_date = updates.start_date;
    if (updates.end_date) memberUpdate.end_date = updates.end_date;

    memberUpdate.updated_at = new Date().toISOString();

    const { data: member, error } = await supabaseAdmin
      .from('members')
      .update(memberUpdate)
      .eq('id', id)
      .select('*, user:users!user_id(*), plan:membership_plans(*)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json(member);
  } catch (err) {
    console.error('Update member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteMember(req, res) {
  try {
    const { id } = req.params;

    const { data: member } = await supabaseAdmin.from('members').select('user_id').eq('id', id).single();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await supabaseAdmin.from('members').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    await supabaseAdmin.from('users').update({ is_active: false }).eq('id', member.user_id);

    return res.json({ message: 'Member deactivated' });
  } catch (err) {
    console.error('Delete member error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMemberAttendance(req, res) {
  try {
    const { id } = req.params;
    const { from, to, limit = 30 } = req.query;

    const { data: member } = await supabaseAdmin.from('members').select('user_id').eq('id', id).single();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let query = supabaseAdmin
      .from('attendance')
      .select('*')
      .eq('user_id', member.user_id)
      .order('date', { ascending: false })
      .limit(Number(limit));

    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);

    const { data: attendance, error } = await query;
    if (error) throw error;

    return res.json(attendance || []);
  } catch (err) {
    console.error('Get member attendance error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMemberPayments(req, res) {
  try {
    const { id } = req.params;

    const { data: member } = await supabaseAdmin.from('members').select('user_id').eq('id', id).single();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const { data: payments, error } = await supabaseAdmin
      .from('payments')
      .select('*, plan:membership_plans(*)')
      .eq('user_id', member.user_id)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return res.json(payments || []);
  } catch (err) {
    console.error('Get member payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function renewMembership(req, res) {
  try {
    const { id } = req.params;
    const { membership_plan_id, payment_method = 'cash', amount } = req.body;

    if (!membership_plan_id) {
      return res.status(400).json({ error: 'Membership plan ID is required' });
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('id', id)
      .single();

    if (memberError) return res.status(404).json({ error: 'Member not found' });

    const { data: plan } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('id', membership_plan_id)
      .single();

    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    const currentEnd = member.end_date ? new Date(member.end_date) : now;
    const newStart = currentEnd > now ? currentEnd : now;
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + plan.duration_days);

    const payAmount = amount || plan.price;

    const { data: payment, error: payError } = await supabaseAdmin.from('payments').insert({
      user_id: member.user_id,
      gym_id: member.gym_id,
      membership_plan_id,
      amount: payAmount,
      method: payment_method,
      status: 'completed',
      payment_date: new Date().toISOString(),
    }).select().single();

    if (payError) return res.status(400).json({ error: payError.message });

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('members')
      .update({
        membership_plan_id,
        start_date: newStart.toISOString().split('T')[0],
        end_date: newEnd.toISOString().split('T')[0],