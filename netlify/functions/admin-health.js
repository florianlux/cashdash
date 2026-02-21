const { createClient } = require('@supabase/supabase-js');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
};

// Verify admin token
function verifyToken(event) {
    const token = event.headers['x-admin-token'];
    const adminToken = process.env.ADMIN_TOKEN;

    if (!adminToken) {
        console.error('ADMIN_TOKEN not configured');
        return false;
    }

    return token === adminToken;
}

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Verify admin token
    if (!verifyToken(event)) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ ok: false, error: 'Unauthorized' }),
        };
    }

    // Only allow GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
        };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const env = {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseKey: !!supabaseKey,
            hasAdminToken: !!process.env.ADMIN_TOKEN,
        };

        // Check Supabase connectivity if credentials exist
        let supabaseConnected = false;
        if (supabaseUrl && supabaseKey) {
            try {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const { error } = await supabase
                    .from('newsletter_subscribers')
                    .select('id', { count: 'exact', head: true });
                
                supabaseConnected = !error;
            } catch (e) {
                console.error('Supabase connectivity check failed:', e);
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                ok: true,
                env,
                supabase: {
                    connected: supabaseConnected,
                },
            }),
        };
    } catch (error) {
        console.error('Health check error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                ok: false,
                error: 'Health check failed',
                details: error.message,
            }),
        };
    }
};
