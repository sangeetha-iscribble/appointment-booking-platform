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

  const [users, services, providers, bookings] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('services').select('id', { count: 'exact', head: true }),
    supabase.from('providers').select('id', { count: 'exact', head: true }),
    supabase.from('appointments').select('id', { count: 'exact', head: true })
  ]);

  const { data: recent } = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time, status, users(name), services(name), providers(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  res.status(200).json({
    total_users: users.count,
    total_services: services.count,
    total_providers: providers.count,
    total_bookings: bookings.count,
    recent_bookings: recent
  });
}