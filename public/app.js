(() => {
  const form = document.getElementById('signup-form');
  const emailInput = document.getElementById('email-input');
  const submitBtn = document.getElementById('submit-btn');
  const msg = document.getElementById('msg');

  function showMsg(text, type) {
    msg.textContent = text;
    msg.className = 'msg ' + type;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!isValidEmail(email)) {
      showMsg('Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    submitBtn.disabled = true;
    showMsg('Sending…', '');

    try {
      const res = await fetch('/.netlify/functions/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.ok) {
        showMsg(data.message || 'Subscribed!', 'success');
        emailInput.value = '';
      } else {
        showMsg(data.error || 'Something went wrong.', 'error');
        submitBtn.disabled = false;
      }
    } catch {
      showMsg('Network error. Please try again.', 'error');
      submitBtn.disabled = false;
    }
  });
})();
