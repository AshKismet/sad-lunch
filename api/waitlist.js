// Adds an email to the Burnt Dad cookbook waitlist (Mailchimp audience).
//
//   POST /api/waitlist  { email }  ->  { ok: true }
//
// Required env: MAILCHIMP_API_KEY

const crypto = require('crypto');

const LIST_ID = 'ca8ad32200';
const MAILCHIMP_URL = `https://us9.api.mailchimp.com/3.0/lists/${LIST_ID}/members`;
const SIGNUP_TAG = 'Burnt Dad';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://burntdad.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'invalid_email' });
  }

  if (!process.env.MAILCHIMP_API_KEY) {
    console.error('MAILCHIMP_API_KEY is not set');
    return res.status(500).json({ error: 'config_error' });
  }

  // Mailchimp uses HTTP Basic auth: any username + the API key as password.
  const auth = 'Basic ' + Buffer.from('anystring:' + process.env.MAILCHIMP_API_KEY).toString('base64');

  try {
    const mcRes = await fetch(MAILCHIMP_URL, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_address: email.trim(), status: 'subscribed', tags: [SIGNUP_TAG] })
    });
    const data = await mcRes.json().catch(() => ({}));

    if (mcRes.ok) return res.status(200).json({ ok: true });

    // Already subscribed: the tags field above only applies on create, so tag them
    // explicitly via the tags endpoint, then treat it as success.
    if (data && data.title === 'Member Exists') {
      try {
        const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
        await fetch(`${MAILCHIMP_URL}/${hash}/tags`, {
          method: 'POST',
          headers: { 'Authorization': auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: [{ name: SIGNUP_TAG, status: 'active' }] })
        });
      } catch (tagErr) {
        console.error('Mailchimp tag error:', tagErr.message);
      }
      return res.status(200).json({ ok: true, already: true });
    }

    console.error('Mailchimp error:', mcRes.status, data && (data.detail || data.title));
    return res.status(502).json({ error: 'mailchimp_error' });
  } catch (err) {
    console.error('Mailchimp fetch error:', err.message);
    return res.status(500).json({ error: 'fetch_error' });
  }
};
