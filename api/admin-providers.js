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
    const { data: providers, error } = await supabase.from('providers').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const { data: links } = await supabase.from('provider_services').select('provider_id, services(id, name)');

    const result = providers.map(p => ({
      ...p,
      services: links.filter(l => l.provider_id === p.id).map(l => l.services)
    }));
    return res.status(200).json(result);
  }

  if (req.method === 'POST') {
    const { admin_id, name, service_ids } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { data: newProvider, error } = await supabase.from('providers').insert([{ name }]).select();
    if (error) return res.status(500).json({ error: error.message });

    const links = service_ids.map(sid => ({ provider_id: newProvider[0].id, service_id: sid }));
    await supabase.from('provider_services').insert(links);

    return res.status(201).json(newProvider[0]);
  }

  if (req.method === 'PUT') {
    const { admin_id, id, name, service_ids } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { data, error } = await supabase.from('providers').update({ name }).eq('id', id).select();
    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('provider_services').delete().eq('provider_id', id);
    const links = service_ids.map(sid => ({ provider_id: id, service_id: sid }));
    await supabase.from('provider_services').insert(links);

    return res.status(200).json(data[0]);
  }

  if (req.method === 'DELETE') {
    const { admin_id, id } = req.body;
    if (!(await isAdmin(admin_id))) return res.status(403).json({ error: 'Admin access required' });

    const { error } = await supabase.from('providers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}