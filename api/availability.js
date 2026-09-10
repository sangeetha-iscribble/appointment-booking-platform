import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Generates slots like "09:00:00", "09:30:00", ..., "16:30:00"
function generateAllSlots() {
  const slots = [];
  const startHour = 9;
  const endHour = 17; // 5 PM, exclusive — last slot starts at 4:30
  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30:00`);
  }
  return slots;
}

export default async function handler(req, res) {
  const { provider_id, date } = req.query;

  if (!provider_id || !date) {
    return res.status(400).json({ error: 'provider_id and date are required' });
  }

  const { data: bookedAppointments, error } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('provider_id', provider_id)
    .eq('appointment_date', date)
    .neq('status', 'cancelled');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const bookedTimes = bookedAppointments.map(a => a.appointment_time);
  const allSlots = generateAllSlots();
  const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

  res.status(200).json({ available_slots: availableSlots });
}