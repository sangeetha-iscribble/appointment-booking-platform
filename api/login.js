import ws from 'ws';
globalThis.WebSocket = ws;

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

const { data: users, error } = await supabase
  .from('users')
  .select('id, name, email, password_hash, role, phone')
  .eq('email', email)
  .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!users || users.length === 0) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const user = users[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
  });
}