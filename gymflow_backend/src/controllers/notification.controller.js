import { supabaseAdmin } from '../config/supabase.js';

export async function myNotifications(req, res) {
  try {
    const { unread_only } = req.query;

    let query = supabaseAdmin
      .from('notifications')
      .select('*, sender:users!sender_id(id, email)')
      .eq('recipient_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    const senderIds = [...new Set(notifications?.map(n => n.sender_id).filter(Boolean) || [])];
    let senderProfiles = [];
    if (senderIds.length > 0) {
      const { data: p } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .in('user_id', senderIds);
      senderProfiles = p || [];
    }
    const sMap = {};
    senderProfiles.forEach(prof => { sMap[prof.user_id] = prof; });
    notifications?.forEach(n => { n.sender_profile = sMap[n.sender_id] || null; });

    const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

    return res.json({ notifications: notifications || [], unread_count: unreadCount });
  } catch (err) {
    console.error('My notifications error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markRead(req, res) {
  try {
    const { id } = req.params;

    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', req.user.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json(notification);
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendNotification(req, res) {
  try {
    const { recipient_id, title, body, type } = req.body;

    if (!recipient_id || !title || !body) {
      return res.status(400).json({ error: 'recipient_id, title, and body are required' });
    }

    const { data: notification, error } = await supabaseAdmin.from('notifications').insert({
      gym_id: req.user.selected_gym_id,
      sender_id: req.user.id,
      recipient_id,
      title,
      body,
      type: type || 'announcement',
    }).select().single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json(notification);
  } catch (err) {
    console.error('Send notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    const { data: notif, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function sendBulkNotification(req, res) {
  try {
    const { recipient_role, title, body, type } = req.body;
    const gymId = req.user.selected_gym_id;

    if (!gymId) {
      return res.status(400).json({ error: 'Gym ID is required' });
    }

    let query = supabaseAdmin
      .from('users')
      .select('id')
      .eq('gym_id', gymId)
      .eq('is_active', true);

    if (recipient_role) {
      query = query.eq('role', recipient_role);
    }

    const { data: recipients, error: userError } = await query;
    if (userError) throw userError;
    if (!recipients?.length) {
      return res.status(404).json({ error: 'No recipients found' });
    }

    const notifications = recipients.map(r => ({
      gym_id: gymId,
      sender_id: req.user.id,
      recipient_id: r.id,
      title,
      body,
      type: type || 'general',
    }));

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;

    return res.status(201).json({
      message: `Notification sent to ${recipients.length} users`,
      count: recipients.length,
      data,
    });
  } catch (err) {
    console.error('Send bulk notification error:', err);
    return res.status(500).json({ error: err.message });
  }
}