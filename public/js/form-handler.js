(function () {
  function collectForm(form) {
    const data = {};
    const fd = new FormData(form);
    for (const [k, v] of fd.entries()) {
      if (data[k] !== undefined) {
        if (!Array.isArray(data[k])) data[k] = [data[k]];
        data[k].push(v);
      } else {
        data[k] = v;
      }
    }
    return data;
  }

  function findAndWire() {
    const candidates = [
      document.getElementById('intake-form'),
      document.querySelector('form.js-form'),
      document.querySelector('form')
    ];
    let form = null;
    for (const el of candidates) {
      if (!el) continue;
      if (el.querySelector('input, textarea, select')) { form = el; break; }
    }
    if (!form) return;

    if (form.dataset._wired === '1') return;
    form.dataset._wired = '1';

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        const data = collectForm(form);
        const token = data['g-recaptcha-response'] || null;

        const resp = await fetch('/api/submit-intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, form: data })
        });

        const j = await resp.json();
        if (resp.ok) {
          alert('Thank you — your submission has been received.');
          form.reset();
          if (window.grecaptcha && grecaptcha.reset) grecaptcha.reset();
        } else {
          console.error('Submission failed', j);
          alert('Submission failed: ' + (j.error || JSON.stringify(j)));
        }
      } catch (err) {
        console.error('Form submit error', err);
        alert('An error occurred while sending your submission. Please try again later.');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', findAndWire);
  } else {
    findAndWire();
  }
})();