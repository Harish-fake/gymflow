import { supabaseAdmin } from '../config/supabase.js';

export async function getSettings(req, res) {
  try {
    const gymId = req.query.gym_id || req.user.selected_gym_id;
    if (!gymId) return res.status(400).json({ error: 'Gym ID is required' });

    const { data: gym, error } = await supabaseAdmin
      .from('gyms')
      .select('settings, name, address, phone, email')
      .eq('id', gymId)
      .single();

    if (error || !gym) return res.status(404).json({ error: 'Settings not found' });

    return res.json({
      id: gymId,
      name: gym.name,
      address: gym.address,
      phone: gym.phone,
      email: gym.email,
      ...(gym.settings || {}),
    });
  } catch (err) {
    console.error('Get settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSettings(req, res) {
  try {
    const gymId = req.body.gym_id || req.user.selected_gym_id;
    if (!gymId) return res.status(400).json({ error: 'Gym ID is required' });

    const { id, created_at, gym_id, name, address, phone, email, ...settingsFields } = req.body;

    const existingSettings = {};

    const { data: gym } = await supabaseAdmin
      .from('gyms')
      .select('settings')
      .eq('id', gymId)
      .single();

    if (gym?.settings) {
      Object.assign(existingSettings, gym.settings);
    }

    Object.assign(existingSettings, settingsFields);

    const updateData = { settings: existingSettings, updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.email) updateData.email = req.body.email;

    const { data, error } = await supabaseAdmin
      .from('gyms')
      .update(updateData)
      .eq('id', gymId)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ ...data, ...(data?.settings || {}) });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}