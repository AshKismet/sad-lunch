// Magic-link authentication for Burnt Dad Kitchen.
//
//   POST /api/auth   { email }            -> generates a one-time token, stores it,
//                                            emails a magic link via Resend.
//   GET  /api/auth?token=...              -> verifies the token, marks it used,
//                                            ensures a user row exists, then
//                                            redirects back to the site.
//
// Expected Supabase tables:
//   magic_tokens ( token text primary key, email text, expires_at timestamptz, used boolean )
//   users        ( email text primary key, token_balance int )
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY
// Optional env: MAGIC_LINK_FROM, SITE_URL

const crypto = require('crypto');
const url = require('url');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws }
});
const resend = new Resend(process.env.RESEND_API_KEY);

const SITE_URL = process.env.SITE_URL || 'https://burntdad.com';
const FROM = process.env.MAGIC_LINK_FROM || 'Burnt Dad <login@burntdad.com>';
const TOKEN_TTL_MS = 15 * 60 * 1000;   // magic links expire after 15 minutes
const NEW_USER_TOKENS = 10;

const rateLimitStore = {};

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxRequests = 20;
  if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
  rateLimitStore[ip] = rateLimitStore[ip].filter(t => now - t < windowMs);
  if (rateLimitStore[ip].length >= maxRequests) return false;
  rateLimitStore[ip].push(now);
  return true;
}

function getQuery(req) {
  if (req.query) return req.query;
  return url.parse(req.url, true).query || {};
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  return res.end();
}

function magicLinkEmail(link) {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2c1a0e;">
      <h1 style="color:#FF5500;font-size:22px;margin:0 0 8px;">🔥 Burnt Dad Kitchen</h1>
      <p style="font-size:16px;line-height:1.6;">Tap the button below to sign in. No password, no nonsense — your token balance follows you.</p>
      <p style="margin:28px 0;">
        <a href="${link}" style="background:#FF5500;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:4px;display:inline-block;">Sign in to Burnt Dad</a>
      </p>
      <p style="font-size:13px;color:#7a6450;line-height:1.6;">This link expires in 15 minutes and can be used once. If you didn't request it, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#7a6450;margin-top:24px;">A Magic Sun LLC Production · burntdad.com</p>
    </div>`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', SITE_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Verify a magic link ────────────────────────────────────────────
  if (req.method === 'GET') {
    const { token } = getQuery(req);
    if (!token) return redirect(res, `${SITE_URL}/?login=error`);

    const { data: row, error } = await supabase
      .from('magic_tokens')
      .select('email, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !row) return redirect(res, `${SITE_URL}/?login=invalid`);
    if (row.used) return redirect(res, `${SITE_URL}/?login=used`);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return redirect(res, `${SITE_URL}/?login=expired`);
    }

    await supabase.from('magic_tokens').update({ used: true }).eq('token', token);

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('email', row.email)
      .single();
    if (!user) {
      await supabase.from('users').insert({ email: row.email, token_balance: NEW_USER_TOKENS });
    }

    return redirect(res, `${SITE_URL}/?login=success&email=${encodeURIComponent(row.email)}`);
  }

  // ── Send a magic link ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const ip = getRateLimitKey(req);
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'rate_limited', message: 'Dad needs a break. Try again in an hour.' });
    }

    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

    const { error: insertError } = await supabase
      .from('magic_tokens')
      .insert({ token, email, expires_at: expiresAt, used: false });
    if (insertError) {
      console.error('magic_tokens insert error:', insertError.message);
      return res.status(500).json({ error: 'db_error' });
    }

    const link = `${SITE_URL}/api/auth?token=${token}`;
    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Your Burnt Dad magic link 🔥',
        html: magicLinkEmail(link)
      });
    } catch (err) {
      console.error('Resend send error:', err.message);
      return res.status(500).json({ error: 'email_error' });
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
