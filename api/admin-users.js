import ws from 'ws';
globalThis.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function isAdmin(admin_id) {
  const { data } = await supabase.from('users').select('role').eq('id', admin_id).single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { admin_id } = req.query;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { data, error } = await supabase.from('users').select('id, name, email, role, created_at').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { admin_id, user_id } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });
    if (admin_id === user_id) return res.status(400).json({ error: 'Cannot delete your own admin account' });

    const { error } = await supabase.from('users').delete().eq('id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}