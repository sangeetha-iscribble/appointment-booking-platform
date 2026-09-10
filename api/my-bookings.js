import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const { data, error } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status, services(name), providers(name)')
      .eq('user_id', user_id)
      .order('appointment_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PATCH') {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ error: 'appointment_id is required' });

    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointment_id)
      .select('*');

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ appointment: data[0] });
  }

  res.status(405).json({ error: 'Method not allowed' });
}