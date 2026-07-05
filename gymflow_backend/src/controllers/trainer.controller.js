import { supabaseAdmin } from '../config/supabase.js';

export async function listTrainers(req, res) {
  try {
    const { gym_id, is_active } = req.query;

    let query = supabaseAdmin
      .from('trainers')
      .select('*, user:users(id, email, phone, avatar_url, is_active)')
      .order('created_at', { ascending: false });

    const targetGym = gym_id || req.user.selected_gym_id;
    if (targetGym) query = query.eq('gym_id', targetGym);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data: trainers, error } = await query;
    if (error) throw error;

    const userIds = [...new Set(trainers?.map(t => t.user_id).filter(Boolean) || [])];
    let profiles = [];
    if (userIds.length > 0) {
      const { data: p } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);
      profiles = p || [];
    }
    const profileMap = {};
    profiles.forEach(prof => { profileMap[prof.user_id] = prof; });
    const result = (trainers || []).map(item => ({
      ...item,
      profile: profileMap[item.user_id] || null,
    }));

    return res.json(result);
  } catch (err) {
    console.error('List trainers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getTrainer(req, res) {
  try {
    const { id } = req.params;

    const { data: trainer, error } = await supabaseAdmin
      .from('trainers')
      .select('*, user:users(*)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Trainer not found' });

    if (trainer?.user_id) {
      const { data: tp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', trainer.user_id)
        .single();
      trainer.profile = tp || null;
    }

    const { data: members } = await supabaseAdmin
      .from('members')
      .select('id, user_id, status, user:users!user_id(email)')
      .eq('assigned_trainer_id', trainer.user_id)
      .limit(20);

    if (members) {
      const mIds = [...new Set(members.map(m => m.user_id).filter(Boolean))];
      if (mIds.length > 0) {
        const { data: mProfiles } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .in('user_id', mIds);
        const mMap = {};
        (mProfiles || []).forEach(prof => { mMap[prof.user_id] = prof; });
        members.forEach(m => { m.profile = mMap[m.user_id] || null; });
      }
    }

    return res.json({ ...trainer, assigned_members: members || [] });
  } catch (err) {
    console.error('Get trainer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createTrainer(req, res) {
  try {
    const { email, password, full_name, phone, gym_id, specialization, hire_date, salary } = req.validated.body;

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';

    const { data: userId, error: createErr } = await supabaseAdmin.rpc('create_auth_user', {
      p_email: email,
      p_password: tempPassword,
      p_full_name: full_name || '',
      p_phone: phone || null,
      p_role: 'trainer',
    });

    if (createErr) return res.status(400).json({ error: createErr.message });

    const targetGym = gym_id || req.user.selected_gym_id;

    const { data: trainer, error: trainerError } = await supabaseAdmin.from('trainers').insert({
      user_id: userId,
      gym_id: targetGym,
      specialization: specialization || null,
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      salary: salary || null,
    }).select('*, user:users(*)').single();

    if (trainerError) return res.status(400).json({ error: trainerError.message });

    if (trainer?.user_id) {
      const { data: tp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', trainer.user_id)
        .single();
      trainer.profile = tp || null;
    }

    await supabaseAdmin.from('user_gyms').insert({
      user_id: userId,
      gym_id: targetGym,
      role: 'trainer',
    });

    return res.status(201).json({ ...trainer, temp_password: tempPassword });
  } catch (err) {
    console.error('Create trainer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateTrainer(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = ['specialization', 'salary', 'is_active', 'schedule', 'qualifications'];
    const trainerUpdate = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) trainerUpdate[field] = updates[field];
    }
    if (updates.hire_date) trainerUpdate.hire_date = updates.hire_date;
    trainerUpdate.updated_at = new Date().toISOString();

    const { data: trainer, error } = await supabaseAdmin
      .from('trainers')
      .update(trainerUpdate)
      .eq('id', id)
      .select('*, user:users(*)')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    if (trainer?.user_id) {
      const { data: tp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', trainer.user_id)
        .single();
      trainer.profile = tp || null;
    }

    return res.json(trainer);
  } catch (err) {
    console.error('Update trainer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteTrainer(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('trainers')
      .delete()
      .eq('user_id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Trainer not found' });

    return res.json({ message: 'Trainer deleted successfully' });
  } catch (err) {
    console.error('Delete trainer error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getTrainerMembers(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('members')
      .select('*, user:users!inner(id, email, user_profiles(full_name, phone))')
      .eq('assigned_trainer_id', id);

    if (error) throw error;

    return res.json({ data: data || [] });
  } catch (err) {
    console.error('Get trainer members error:', err);
    return res.status(500).json({ error: err.message });
  }
}