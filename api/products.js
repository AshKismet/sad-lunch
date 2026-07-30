// Fetches products from the Burnt Dad Printful store.
//
//   GET /api/products  ->  { products: [ ...sync products... ] }
//
// Required env: PRINTFUL_API_KEY

const PRINTFUL_STORE_ID = '17955542';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://burntdad.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.PRINTFUL_API_KEY) {
    console.error('PRINTFUL_API_KEY is not set');
    return res.status(500).json({ error: 'config_error' });
  }

  try {
    const pfRes = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'X-PF-Store-Id': PRINTFUL_STORE_ID
      }
    });

    const data = await pfRes.json();

    if (!pfRes.ok) {
      console.error('Printful API error:', pfRes.status, data?.error?.message || JSON.stringify(data));
      return res.status(502).json({ error: 'printful_error' });
    }

    // Cache at the edge to stay well under Printful's rate limit.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ products: data.result || [] });
  } catch (err) {
    console.error('Printful fetch error:', err.message);
    return res.status(500).json({ error: 'fetch_error' });
  }
};
