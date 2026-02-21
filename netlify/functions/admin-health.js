const { createClient } = require('@supabase/supabase-js');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function checkAuth(event) {
  const token = event.headers['x-admin-token'] || '';
  return token && token === process.env.ADMIN_TOKEN;
}

exports.handler = async (event) => {
  if (!checkAuth(event)) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = {
    SUPABASE_URL: supabaseUrl ? 'set' : 'missing',
    SUPABASE_SERVICE_ROLE_KEY: supabaseKey ? 'set' : 'missing',
    ADMIN_TOKEN: process.env.ADMIN_TOKEN ? 'set' : 'missing',
  };

  if (!supabaseUrl || !supabaseKey) {
    return json(200, { ok: false, env, supabase: false });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .limit(1);

    return json(200, {
      ok: !error,
      env,
      supabase: !error,
      ...(error ? { error: error.message } : {}),
    });
  } catch (err) {
    return json(200, { ok: false, env, supabase: false, error: String(err) });
  }
};
