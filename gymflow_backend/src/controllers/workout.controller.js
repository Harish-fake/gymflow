import { supabaseAdmin } from '../config/supabase.js';

export async function listWorkouts(req, res) {
  try {
    const { member_id, gym_id, date, page = 1, limit = 20 } = req.query;
    const targetGym = gym_id || req.user.selected_gym_id;

    let query = supabaseAdmin.from('workouts').select('*, trainer:users!trainer_id(id, email)');

    if (targetGym) query = query.eq('gym_id', targetGym);
    if (member_id) query = query.eq('member_id', member_id);
    if (date) query = query.eq('schedule_date', date);

    if (req.user.role === 'trainer') {
      query = query.eq('trainer_id', req.user.id);
    } else if (req.user.role === 'member') {
      query = query.eq('member_id', req.user.id);
    }

    query = query.order('created_at', { ascending: false });

    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data: workouts, error } = await query;
    if (error) throw error;

    const trainerIds = [...new Set(workouts?.map(w => w.trainer_id).filter(Boolean) || [])];
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
    const result = (workouts || []).map(item => ({
      ...item,
      trainer_profile: tMap[item.trainer_id] || null,
    }));

    return res.json(result);
  } catch (err) {
    console.error('List workouts error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getWorkout(req, res) {
  try {
    const { id } = req.params;

    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .select('*, trainer:users!trainer_id(id, email), member:users!member_id(id, email)')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Workout not found' });

    if (workout?.trainer_id) {
      const { data: tp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', workout.trainer_id)
        .single();
      workout.trainer_profile = tp || null;
    }
    if (workout?.member_id) {
      const { data: mp } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', workout.member_id)
        .single();
      workout.member_profile = mp || null;
    }

    const exercisesWithDetails = [];
    if (workout.exercises?.length) {
      for (const ex of workout.exercises) {
        const { data: exercise } = await supabaseAdmin.from('exercise_library').select('*').eq('id', ex.exercise_id).single();
        exercisesWithDetails.push({ ...ex, exercise_details: exercise || null });
      }
    }

    return res.json({ ...workout, exercises: exercisesWithDetails });
  } catch (err) {
    console.error('Get workout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createWorkout(req, res) {
  try {
    const { gym_id, member_id, name, description, day_of_week, schedule_date, exercises } = req.validated.body;
    const targetGym = gym_id || req.user.selected_gym_id;

    const { data: workout, error } = await supabaseAdmin.from('workouts').insert({
      gym_id: targetGym,
      trainer_id: req.user.id,
      member_id,
      name,
      description: description || null,
      day_of_week: day_of_week || null,
      schedule_date: schedule_date || null,
      exercises,
    }).select('*, trainer:users!trainer_id(id, email)').single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json(workout);
  } catch (err) {
    console.error('Create workout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateWorkout(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json(workout);
  } catch (err) {
    console.error('Update workout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteWorkout(req, res) {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin.from('workouts').delete().eq('id', id);
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: 'Workout deleted' });
  } catch (err) {
    console.error('Delete workout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeWorkout(req, res) {
  try {
    const { id } = req.params;

    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: 'Workout marked complete', workout });
  } catch (err) {
    console.error('Complete workout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function listExercises(req, res) {
  try {
    const { gym_id, category } = req.query;
    const targetGym = gym_id || req.user.selected_gym_id;

    let query = supabaseAdmin.from('exercise_library').select('*').eq('is_active', true);

    if (targetGym) query = query.eq('gym_id', targetGym);
    if (category) query = query.eq('category', category);

    const { data: exercises, error } = await query.order('category').order('name');
    if (error) throw error;

    return res.json(exercises || []);
  } catch (err) {
    console.error('List exercises error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createExercise(req, res) {
  try {
    const { name, category, video_url, equipment_needed } = req.body;
    const gymId = req.user.selected_gym_id;

    if (!gymId) return res.status(400).json({ error: 'Gym ID is required' });

    const { data, error } = await supabaseAdmin
      .from('exercise_library')
      .insert({ gym_id: gymId, name, category, video_url, equipment_needed: equipment_needed || [] })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ message: 'Exercise created', data });
  } catch (err) {
    console.error('Create exercise error:', err);
    return res.status(500).json({ error: err.message });
  }
}