import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, provider_id, service_id, appointment_date, appointment_time, contact_phone } = req.body;

  if (!user_id || !provider_id || !service_id || !appointment_date || !appointment_time || !contact_phone) {
    return res.status(400).json({ error: 'All fields including contact phone are required' });
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert([{ user_id, provider_id, service_id, appointment_date, appointment_time, contact_phone }])
    .select('*');

  if (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'This slot was just booked by someone else. Please choose another.' });
    }
    return res.status(500).json({ error: error.message });
  }

  const { data: userData } = await supabase.from('users').select('email').eq('id', user_id).single();
  if (userData?.email) {
    await supabase.from('notification_logs').insert([{
      recipient_email: userData.email,
      subject: 'Appointment Confirmed',
      message: `Your appointment on ${appointment_date} at ${appointment_time} has been confirmed.`,
      type: 'email'
    }]);
  }

  res.status(201).json({ appointment: data[0] });
}