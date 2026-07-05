import { supabaseAdmin } from '../config/supabase.js';
import { uploadToSupabase } from '../middleware/upload.js';

export async function getProfile(req, res) {
  try {
    let { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!profile) {
      await supabaseAdmin.from('user_profiles').upsert({
        user_id: req.user.id,
        full_name: req.user.email?.split('@')[0] || '',
      }, { onConflict: 'user_id', ignoreDuplicates: true });

      const { data: newProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .single();

      profile = newProfile || { user_id: req.user.id, full_name: '' };
    }

    const { data: gyms } = await supabaseAdmin
      .from('user_gyms')
      .select('gym:gyms(*)')
      .eq('user_id', req.user.id);

    return res.json({
      user: req.user,
      profile,
      gyms: gyms?.map((g) => g.gym) || [],
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateProfile(req, res) {
  try {
    const updates = req.body;

    const allowedFields = [
      'full_name', 'dob', 'gender', 'address',
      'emergency_contact_name', 'emergency_contact_phone',
      'medical_conditions', 'allergies', 'blood_group',
    ];

    const profileUpdate = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        profileUpdate[field] = updates[field];
      }
    }

    if (updates.phone && updates.phone !== req.user.phone) {
      await supabaseAdmin
        .from('users')
        .update({ phone: updates.phone })
        .eq('id', req.user.id);
    }

    if (Object.keys(profileUpdate).length > 0) {
      profileUpdate.updated_at = new Date().toISOString();
      profileUpdate.user_id = req.user.id;

      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .upsert(profileUpdate, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.json({ message: 'Profile updated', profile: data });
    }

    return res.json({ message: 'No changes made' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function uploadPhoto(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const photoUrl = await uploadToSupabase(req.file, 'profile-photos', `users/${req.user.id}`);

    await supabaseAdmin
      .from('user_profiles')
      .update({ photo_url: photoUrl, updated_at: new Date().toISOString() })
      .eq('user_id', req.user.id);

    await supabaseAdmin
      .from('users')
      .update({ avatar_url: photoUrl })
      .eq('id', req.user.id);

    return res.json({ photo_url: photoUrl });
  } catch (err) {
    console.error('Upload photo error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
