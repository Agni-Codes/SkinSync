export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const { token, form } = body;

  // Optionally verify reCAPTCHA if token provided
  if (token) {
    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) {
      res.status(500).json({ error: 'RECAPTCHA_SECRET not configured' });
      return;
    }

    const params = new URLSearchParams();
    params.append('secret', secret);
    params.append('response', token);

    try {
      const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });
      const verify = await r.json();
      if (!verify.success) {
        res.status(400).json({ error: 'reCAPTCHA verification failed', details: verify });
        return;
      }
    } catch (err) {
      console.error('recaptcha verify error', err);
      res.status(500).json({ error: 'Failed to verify reCAPTCHA' });
      return;
    }
  }

  // Build metadata and issue content
  const metadata = {
    received_at: new Date().toISOString(),
    remote_addr: req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
  };

  const issueTitle = `Intake: ${form && form.name ? form.name : (form && form.email ? form.email : 'Unknown')}`;
  const issueBody = `**New Intake submission**\n\n` +
                    `**Metadata:**\n\n` +
                    '```\n' + JSON.stringify(metadata, null, 2) + '\n```\n\n' +
                    `**Form data:**\n\n` +
                    '```\n' + JSON.stringify(form || {}, null, 2) + '\n```\n';

  // Create GitHub issue to store the submission
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const OWNER = 'Agni-Codes';
  const REPO = 'SkinSync';

  if (!GITHUB_TOKEN) {
    console.warn('GITHUB_TOKEN is not set; skipping issue creation');
    // still return success so submissions aren't blocked
    res.status(200).json({ ok: true, stored: false, note: 'No GITHUB_TOKEN configured' });
    return;
  }

  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/issues`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'skinsync-intake-backend'
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody })
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('GitHub issue creation failed', r.status, txt);
      res.status(500).json({ error: 'Failed to create storage issue on GitHub' });
      return;
    }

    const issue = await r.json();
    res.status(200).json({ ok: true, stored: true, issue_url: issue.html_url });
  } catch (err) {
    console.error('submit-intake error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}