const { createClient } = require('@supabase/supabase-js');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
        };
    }

    try {
        // Parse JSON safely
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Invalid JSON' }),
            };
        }

        const { email } = body;

        // Validate email
        if (!email || typeof email !== 'string') {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Email is required' }),
            };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ ok: false, error: 'Invalid email format' }),
            };
        }

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing Supabase credentials');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    ok: false,
                    error: 'Subscription failed',
                    details: 'Server configuration error',
                }),
            };
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Insert or detect duplicate
        const { data, error } = await supabase
            .from('newsletter_subscribers')
            .insert([
                { email: email.trim().toLowerCase(), status: 'active' }
            ])
            .select();

        if (error) {
            // Check for duplicate email
            if (error.code === '23505') {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        ok: false,
                        error: 'Email already subscribed',
                    }),
                };
            }

            console.error('Supabase error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    ok: false,
                    error: 'Subscription failed',
                    details: error.message,
                }),
            };
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                message: 'Subscribed successfully!',
            }),
        };
    } catch (error) {
        console.error('Unexpected error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                ok: false,
                error: 'Subscription failed',
                details: error.message,
            }),
        };
    }
};
