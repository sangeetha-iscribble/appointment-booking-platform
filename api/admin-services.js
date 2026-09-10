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
    const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { admin_id, name, duration_minutes, price, category } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { data, error } = await supabase.from('services').insert([{ name, duration_minutes, price, category }]).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data[0]);
  }

  if (req.method === 'PUT') {
    const { admin_id, id, name, duration_minutes, price, category } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { data, error } = await supabase.from('services').update({ name, duration_minutes, price, category }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data[0]);
  }

  if (req.method === 'DELETE') {
    const { admin_id, id } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}