const Anthropic = require('@anthropic-ai/sdk');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws }
});

const rateLimitStore = {};

const MAX_MEAL_LENGTH = 500;
const DIFFICULTIES = ['easy', 'medium', 'hard'];

// Patterns that signal an attempt to steer the model rather than name a dish.
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+|any\s+|the\s+)*(?:previous|prior|above|earlier|preceding)?\s*(?:instructions?|prompts?|messages?|context)/i,
  /disregard\s+(?:all|any|the|previous|prior|above)/i,
  /forget\s+(?:everything|all|your|previous|the)/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /you\s+are\s+(?:a|an|the)\b/i,
  /new\s+(?:instructions?|task|role|persona)/i,
  /act\s+as\b/i,
  /pretend\s+(?:to\s+be|that|you)/i,
  /(?:^|\s)(?:assistant|system|user)\s*:/i,
  /override\s+(?:the|your|all|previous)/i,
  /jailbreak/i,
  /prompt\s+injection/i,
  /reveal\s+(?:your|the)\s+(?:prompt|instructions|system|rules)/i,
  /your\s+(?:instructions|system\s*prompt|rules)\b/i,
];

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

// Strip control chars and anything that could break out of the prompt template,
// then collapse whitespace. Apostrophes are kept (e.g. "shepherd's pie").
function sanitizeText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\x00-\x1F\x7F]/g, ' ')   // control chars / newlines
    .replace(/[{}<>`"\\]/g, '')          // template, markup, and quote breakers
    .replace(/\s+/g, ' ')
    .trim();
}

function looksLikeInjection(text) {
  return INJECTION_PATTERNS.some(re => re.test(text));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://burntdad.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getRateLimitKey(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'rate_limited', message: 'Dad needs a break. Try again in an hour.' });
  }

  const { meal: rawMeal, servings: rawServings, difficulty: rawDifficulty, allergies: rawAllergies, email, website } = req.body || {};

  // ── Honeypot: real users never see/fill the "website" field; bots do. ─
  if (typeof website === 'string' && website.trim() !== '') {
    return res.status(400).json({ error: 'invalid_input', message: 'Tell us what to cook.' });
  }

  // ── Sanitize + validate user input ─────────────────────────────────
  const meal = sanitizeText(rawMeal);
  if (!meal) {
    return res.status(400).json({ error: 'invalid_input', message: 'Tell us what to cook.' });
  }
  if (meal.length > MAX_MEAL_LENGTH) {
    return res.status(400).json({ error: 'invalid_input', message: `Keep it under ${MAX_MEAL_LENGTH} characters.` });
  }

  const allergies = Array.isArray(rawAllergies)
    ? rawAllergies.map(sanitizeText).filter(Boolean).slice(0, 10)
    : [];

  // Reject prompt-injection attempts in any user-supplied text.
  if (looksLikeInjection(meal) || allergies.some(looksLikeInjection)) {
    return res.status(400).json({ error: 'invalid_input', message: "That doesn't look like a meal. Try a dish name." });
  }

  const difficulty = DIFFICULTIES.includes(rawDifficulty) ? rawDifficulty : 'easy';

  let servings = parseInt(rawServings, 10);
  if (!Number.isFinite(servings) || servings < 1 || servings > 20) servings = 4;

  // ── Token check / decrement ────────────────────────────────────────
  if (email) {
    const { data: user, error } = await supabase
      .from('users')
      .select('token_balance')
      .eq('email', email)
      .single();

    if (error || !user) {
      await supabase.from('users').insert({ email, token_balance: 9 });
    } else if (user.token_balance <= 0) {
      return res.status(402).json({ error: 'no_tokens' });
    } else {
      await supabase.from('users').update({ token_balance: user.token_balance - 1 }).eq('email', email);
    }
  }

  // ── Build the trusted prompt server-side ───────────────────────────
  const allergyNote = allergies.length ? `Must be: ${allergies.join(', ')}.` : '';
  const prompt = `You are Burnt Dad Kitchen, a fun cooking app for kids and dads of all kinds.
Generate a ${difficulty} difficulty recipe for: "${meal}". Servings: ${servings}. ${allergyNote}
Respond ONLY with valid JSON, no markdown:
{"name":"","description":"","difficulty":"${difficulty}","time_minutes":0,"servings":${servings},"allergen_warnings":"","ingredients":[{"amount":"","item":""}],"steps":[{"instruction":"","timer_seconds":0}],"fun_tip":"","cookbook_teaser":""}
Rules: steps simple and safe for kids; easy means minimal knife work; be encouraging, warm, and a little funny.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    return res.status(200).json(response);
  } catch (err) {
    console.error('Anthropic API error:', err.message);
    return res.status(500).json({ error: 'api_error' });
  }
};
