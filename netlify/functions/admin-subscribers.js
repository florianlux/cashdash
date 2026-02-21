const { createClient } = require('@supabase/supabase-js');

// CORS headers
const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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
            body: JSON.stringify({ error: 'Unauthorized' }),
        };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Server configuration error' }),
        };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Handle GET request
        if (event.httpMethod === 'GET') {
            const params = event.queryStringParameters || {};

            // Export CSV
            if (params.export === 'csv') {
                const { data, error } = await supabase
                    .from('newsletter_subscribers')
                    .select('email, created_at, status')
                    .eq('status', 'active')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                // Generate CSV with proper escaping
                const escapeCsvField = (field) => {
                    const str = String(field);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                };
                
                const csv = [
                    'email,created_at,status',
                    ...data.map(row => 
                        `${escapeCsvField(row.email)},${escapeCsvField(row.created_at)},${escapeCsvField(row.status)}`
                    )
                ].join('\n');

                return {
                    statusCode: 200,
                    headers: {
                        ...headers,
                        'Content-Type': 'text/csv',
                        'Content-Disposition': 'attachment; filename="subscribers.csv"',
                    },
                    body: csv,
                };
            }

            // Get subscribers list
            const status = params.status || 'active';
            let query = supabase
                .from('newsletter_subscribers')
                .select('*')
                .order('created_at', { ascending: false });

            if (status !== 'all') {
                query = query.eq('status', status);
            }

            const { data: subscribers, error: listError } = await query;

            if (listError) {
                throw listError;
            }

            // Get stats
            const { data: activeData, error: activeError } = await supabase
                .from('newsletter_subscribers')
                .select('id', { count: 'exact' })
                .eq('status', 'active');

            if (activeError) {
                throw activeError;
            }

            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const { data: recent24hData, error: recent24hError } = await supabase
                .from('newsletter_subscribers')
                .select('id', { count: 'exact' })
                .eq('status', 'active')
                .gte('created_at', yesterday.toISOString());

            if (recent24hError) {
                throw recent24hError;
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    subscribers,
                    stats: {
                        totalActive: activeData.length,
                        last24h: recent24hData.length,
                    },
                }),
            };
        }

        // Handle PATCH request (deactivate subscriber)
        if (event.httpMethod === 'PATCH') {
            let body;
            try {
                body = JSON.parse(event.body || '{}');
            } catch (e) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid JSON' }),
                };
            }

            const { id } = body;

            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'ID is required' }),
                };
            }

            const { data, error } = await supabase
                .from('newsletter_subscribers')
                .update({ status: 'inactive' })
                .eq('id', id)
                .select();

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Subscriber not found' }),
                };
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, data: data[0] }),
            };
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error', details: error.message }),
        };
    }
};
