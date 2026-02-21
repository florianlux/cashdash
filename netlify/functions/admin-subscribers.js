const { createClient } = require('@supabase/supabase-js');

function json(statusCode, body, extra = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...extra },
    body: JSON.stringify(body),
  };
}

function unauthorized() {
  return json(401, { ok: false, error: 'Unauthorized' });
}

function checkAuth(event) {
  const token = event.headers['x-admin-token'] || '';
  return token && token === process.env.ADMIN_TOKEN;
}

exports.handler = async (event) => {
  if (!checkAuth(event)) return unauthorized();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return json(500, { ok: false, error: 'Server configuration error' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  // ── PATCH – deactivate subscriber ──────────────────────────────────────────
  if (method === 'PATCH') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { ok: false, error: 'Invalid JSON' });
    }

    const { id } = body;
    if (!id) return json(400, { ok: false, error: 'Missing id' });

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status: 'inactive' })
      .eq('id', id);

    if (error) return json(500, { ok: false, error: error.message });
    return json(200, { ok: true });
  }

  // ── GET – list or export ───────────────────────────────────────────────────
  if (method === 'GET') {
    // Export CSV
    if (params.export === 'csv') {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('email, created_at, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) return json(500, { ok: false, error: error.message });

      const lines = ['email,created_at,status'];
      for (const row of data) {
        const csvField = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        lines.push(`${csvField(row.email)},${csvField(row.created_at)},${csvField(row.status)}`);
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="subscribers.csv"',
        },
        body: lines.join('\n'),
      };
    }

    // List subscribers
    const status = params.status === 'all' ? null : (params.status || 'active');

    let query = supabase
      .from('newsletter_subscribers')
      .select('id, email, created_at, status')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return json(500, { ok: false, error: error.message });

    return json(200, { ok: true, subscribers: data });
  }

  return json(405, { ok: false, error: 'Method not allowed' });
};
