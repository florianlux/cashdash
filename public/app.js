const form = document.getElementById('newsletter-form');
const emailInput = document.getElementById('email-input');
const submitBtn = document.getElementById('submit-btn');
const messageDiv = document.getElementById('message');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    // Client-side validation
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }
    
    // Disable submit while sending
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';
    hideMessage();
    
    try {
        const response = await fetch('/.netlify/functions/newsletter-signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (data.ok) {
            showMessage(data.message || 'Successfully subscribed!', 'success');
            emailInput.value = '';
        } else {
            showMessage(data.error || 'Subscription failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
        console.error('Subscription error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Subscribe';
    }
});

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
}

function hideMessage() {
    messageDiv.style.display = 'none';
}
