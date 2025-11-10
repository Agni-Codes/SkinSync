export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { token, remoteip } = req.body || {};
  const secret = process.env.RECAPTCHA_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'RECAPTCHA_SECRET is not configured' });
    return;
  }
  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }

  try {
    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);
    if (remoteip) params.append('remoteip', remoteip);

    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const result = await r.json();
    res.status(200).json(result);
  } catch (err) {
    console.error('recaptcha verify error', err);
    res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
  }
}