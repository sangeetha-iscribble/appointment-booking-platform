import ws from 'ws';
globalThis.WebSocket = ws;
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { service_id } = req.query;

  if (service_id) {
    const { data, error } = await supabase
      .from('provider_services')
      .select('providers(id, name)')
      .eq('service_id', service_id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data.map(row => row.providers));
  }

  const { data, error } = await supabase.from('providers').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}