import { supabaseAdmin } from '../config/supabase.js';

export async function listDiets(req, res) {
  try {
    const { member_id, gym_id } = req.query;
    const targetGym = gym_id || req.user.selected_gym_id;

    let query = supabaseAdmin.from('diet_plans').select('*, trainer:users!trainer_id(id, email)');

    if (targetGym) query = query.eq('gym_id', targetGym);
    if (member_id) query = query.eq('member_id', member_id);

    if (req.user.role === 'trainer') {
      query = query.eq('trainer_id', req.user.id);
    } else if (req.user.role === 'member') {
      query = query.eq('member_id', req.user.id);
    }

    const { data: diets, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const trainerIds = [...new Set(diets?.map(d => d.trainer_id).filter(Boolean) || [])];
    let trainerProfiles = [];
    if (trainerIds.length > 0) {
      const { data: p } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .in('user_id', trainerIds);
      trainerProfiles = p || [];
    }
    const tMap = {};
    trainerProfiles.forEach(prof => { tMap[prof.user_id] = prof; });
    const result = (diets || []).map(item => ({
      ...item,
      trainer_profile: tMap[item.trainer_id] || null,
    }));

    return res.json(result);
  } catch (err) {
    console.error('List diets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDiet(req, res) {
  try {
    const { id } = req.params;

    const { data: diet, error } = await supabaseAdmin
      .from('diet_plans')
      .select('*, trainer:users!trainer_id(id, email)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Diet plan not found' });

    if (diet?.trainer_id) {
      const { data: tp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', diet.trainer_id)
        .single();
      diet.trainer_profile = tp || null;
    }

    return res.json(diet);
  } catch (err) {
    console.error('Get diet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createDiet(req, res) {
  try {
    const { gym_id, member_id, name, type, target_calories, meals } = req.validated.body;
    const targetGym = gym_id || req.user.selected_gym_id;

    const { data: diet, error } = await supabaseAdmin.from('diet_plans').insert({
      gym_id: targetGym,
      trainer_id: req.user.id,
      member_id,
      name,
      type,
      target_calories: target_calories || null,
      meals,
    }).select('*, trainer:users!trainer_id(id, email)').single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json(diet);
  } catch (err) {
    console.error('Create diet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateDiet(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data: diet, error } = await supabaseAdmin
      .from('diet_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json(diet);
  } catch (err) {
    console.error('Update diet error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteDiet(req, res) {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('diet_plans')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Diet plan not found' });

    return res.json({ message: 'Diet plan deleted' });
  } catch (err) {
    console.error('Delete diet error:', err);
    return res.status(500).json({ error: err.message });
  }
}