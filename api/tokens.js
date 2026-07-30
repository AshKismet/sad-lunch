// Returns a user's current token balance from Supabase.
//
//   GET /api/tokens?email=someone@example.com  ->  { token_balance: number }
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY

const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://burntdad.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = req.query?.email;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('token_balance')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found; anything else is a real failure.
    console.error('tokens lookup error:', error.message);
    return res.status(500).json({ error: 'db_error' });
  }

  return res.status(200).json({ token_balance: user?.token_balance ?? 0 });
};
