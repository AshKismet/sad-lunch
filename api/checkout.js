const Stripe = require('stripe');
const ws = require('ws');
const { createClient } = require('@supabase/supabase-js');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  realtime: { transport: ws }
});
const TOKENS_PER_PACK = 100;
const PRICE_CENTS = 299;

// Collect the raw request body as a Buffer. Needed because we disable Vercel's
// body parser below so Stripe can verify the webhook signature against the exact bytes.
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://burntdad.com');

  if (req.method === 'POST' && req.query.webhook === 'true') {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      const rawBody = await getRawBody(req);
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch(e) {
      return res.status(400).send(`Webhook error: ${e.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.metadata?.email || null;
      if (email) {
        const { data: user } = await supabase.from('users').select('token_balance').eq('email', email).single();
        let creditError;
        if (user) {
          // Existing user: UPDATE by email avoids the upsert primary-key 409 conflict.
          const newBalance = (user.token_balance || 0) + TOKENS_PER_PACK;
          ({ error: creditError } = await supabase.from('users').update({ token_balance: newBalance }).eq('email', email));
        } else {
          ({ error: creditError } = await supabase.from('users').insert({ email, token_balance: TOKENS_PER_PACK }));
        }
        if (creditError) console.error('token credit error:', creditError.message);
      }
    }
    return res.status(200).json({ received: true });
  }

  if (req.method === 'GET') {
    const email = req.query.email || null;
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Burnt Dad',
              description: '100 Immediate and Incredible Recipes. Feed the dad.',
            },
            unit_amount: PRICE_CENTS
          },
          quantity: 1
        }],
    mode: 'payment',
    customer_email: email || undefined,
    success_url: `https://burntdad.com/?purchase=success&email=${encodeURIComponent(email || '')}`,
    cancel_url: 'https://burntdad.com/?purchase=cancelled',
    metadata: { email: email || '' }
      });
      return res.redirect(303, session.url);
    } catch(e) {
      console.error('Stripe error:', e.message);
      return res.redirect('/?purchase=error');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// Disable Vercel's automatic body parsing so the Stripe webhook receives the
// raw request bytes required for signature verification.
module.exports.config = {
  api: {
    bodyParser: false
  }
};
