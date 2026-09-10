import ws from 'ws';
globalThis.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function isAdmin(admin_id) {
  const { data } = await supabase.from('users').select('role').eq('id', admin_id).single();
  return data?.role === 'admin';
}

export default async function handler(req, res) {
  const { admin_id } = req.query;
  if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}