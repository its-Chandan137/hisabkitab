import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const ADMIN_EMAIL = 'itschandan137@gmail.com';

function isAuthorized(request) {
  const internalKey = process.env.INTERNAL_API_KEY;
  return Boolean(internalKey && request.headers['x-internal-key'] === internalKey);
}

function createAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

async function requireAdmin(request) {
  const authorization = request.headers.authorization || '';
  const token = authorization.replace('Bearer ', '');

  if (!token) {
    throw new Error('Forbidden.');
  }

  const client = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: { Authorization: authorization },
      },
    },
  );

  const { data, error } = await client.auth.getUser(token);

  if (error || data.user?.email !== ADMIN_EMAIL) {
    throw new Error('Forbidden.');
  }
}

async function sendEmail(to, subject, html) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"HisabKitab" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export default async function handler(request, response) {

  // CORS headers
  response.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://hisabkitabs.vercel.app' : 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-key, Authorization');

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return response.status(204).end();
  }

  
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const adminClient = createAdminClient();
    const { action, userId } = request.body || {};


    if (action === 'insert-profile') {
      const { id, username, email, status, created_at } = request.body;
      
      const { error } = await adminClient
        .from('profiles')
        .insert({ id, username, email, status, created_at });

      if (error) throw error;
      return response.status(200).json({ success: true });
    }

    await requireAdmin(request);

    if (action === 'list') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id, username, email, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return response.status(200).json({ users: data || [] });
    }

    if (!userId) {
      return response.status(400).json({ error: 'userId is required.' });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, username, email, status')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return response.status(404).json({ error: 'User profile not found.' });
    }

    if (action === 'approve') {
      const { error } = await adminClient
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      await sendEmail(
        profile.email,
        "You're in — HisabKitab",
        `<!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 20px; background: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
            .tab { padding: 8px 20px; border-radius: 8px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 14px; color: #aaa; }
            .tab.active { background: #1d4ed8; color: #fff; border-color: transparent; }
          </style>
          </head>
          <body>

          <!-- APPROVAL EMAIL -->
          <div id="approved">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 20px">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
                <tr><td style="background:#0f1b2d;padding:32px;text-align:center;border-bottom:1px solid rgba(59,130,246,0.2)">
                  <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px">
                    <tr>
                      <td style="background:#1d4ed8;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle">
                        <span style="color:#93c5fd;font-size:20px">⊞</span>
                      </td>
                      <td style="padding-left:10px;font-size:18px;font-weight:500;color:#e2e8f0;vertical-align:middle">HisabKitabs</td>
                      <td style="padding-left:12px;vertical-align:middle">
                        <span style="background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#4ade80;padding:5px 14px;border-radius:100px;font-size:13px;white-space:nowrap">✓ Access approved</span>
                      </td>
                    </tr>
                  </table>
                  <h1 style="color:#f1f5f9;font-size:26px;font-weight:500;margin:0 0 6px">You're in! 🎉</h1>
                  <p style="color:#64748b;font-size:14px;margin:0">Your account is ready to go</p>
                </td></tr>

                <tr><td style="padding:28px 32px">
                  <p style="color:#cbd5e1;font-size:15px;margin:0 0 16px">Hey <strong style="color:#e2e8f0">${profile.username}</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 14px">Great news — your request to join HisabKitabs has been approved! You can now log in and start tracking your shared expenses, friend balances, and group splits all in one place.</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">Your login credentials are the ones you set when you submitted your request. Head over and log in whenever you're ready.</p>
                  <a href="https://hisabkitabs.vercel.app" style="display:block;background:#1d4ed8;color:#ffffff;text-align:center;padding:14px 24px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none">Open HisabKitabs →</a>
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0">
                  <div style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;margin-bottom:16px">
                    <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0">Thank you for being an early user of HisabKitabs. This app was built to make tracking money between friends simple, private, and stress-free. Your data is fully encrypted and only visible to you. Hope it makes life a little easier. 🙂</p>
                  </div>
                  <p style="color:#94a3b8;font-size:13px;margin:0">If you run into any issues, feel free to reach out.</p>
                </td></tr>

                <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
                  <p style="color:#334155;font-size:12px;margin:0">HisabKitabs · Personal finance tracker · hisabkitabs.vercel.app</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          </div>

          </body>
          </html>`,
      );

      return response.status(200).json({ success: true });
    }

    if (action === 'reject') {
      const { error } = await adminClient
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      await sendEmail(
        profile.email,
        'HisabKitab — Access Request Update',
        `<!DOCTYPE html>
          <html>
          <head>
          <meta charset="utf-8">
          <style>
            body { margin: 0; padding: 20px; background: #111; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .tabs { display: flex; gap: 8px; margin-bottom: 20px; }
            .tab { padding: 8px 20px; border-radius: 8px; border: 1px solid #333; background: transparent; cursor: pointer; font-size: 14px; color: #aaa; }
            .tab.active { background: #1d4ed8; color: #fff; border-color: transparent; }
          </style>
          </head>
          <body>


          <!-- REJECTION EMAIL -->
          <div id="rejected">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:40px 20px">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden">
                <tr><td style="background:#1a0f0f;padding:32px;text-align:center;border-bottom:1px solid rgba(220,38,38,0.2)">
                  <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px">
                    <tr>
                      <td style="background:#1d4ed8;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle">
                        <span style="color:#93c5fd;font-size:20px">⊞</span>
                      </td>
                      <td style="padding-left:10px;font-size:18px;font-weight:500;color:#e2e8f0;vertical-align:middle">HisabKitabs</td>
                      <td style="padding-left:12px;vertical-align:middle">
                        <span style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#f87171;padding:5px 14px;border-radius:100px;font-size:13px;white-space:nowrap">✕ Access not approved</span>
                      </td>
                    </tr>
                  </table>
                  <h1 style="color:#f1f5f9;font-size:26px;font-weight:500;margin:0 0 6px">Not this time</h1>
                  <p style="color:#64748b;font-size:14px;margin:0">Your access request was reviewed</p>
                </td></tr>

                <tr><td style="padding:28px 32px">
                  <p style="color:#cbd5e1;font-size:15px;margin:0 0 16px">Hey <strong style="color:#e2e8f0">${profile.username}</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 14px">Thanks for your interest in HisabKitabs. After reviewing your request, we're unable to grant access at this time. HisabKitabs is currently in a limited early access phase and we're onboarding users gradually.</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.7;margin:0 0 24px">This isn't permanent — you're welcome to request access again in the future. We appreciate your patience.</p>
                  <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:0 0 24px">
                  <div style="background:rgba(255,255,255,0.03);border-radius:8px;border:1px solid rgba(255,255,255,0.06);padding:16px 20px;margin-bottom:16px">
                    <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0">Thank you for taking the time to request access. HisabKitabs is a personal project built to make tracking shared expenses simpler and more private. We hope to have you on board soon. 🙂</p>
                  </div>
                  <p style="color:#94a3b8;font-size:13px;margin:0">If you think this was a mistake, feel free to reach out directly.</p>
                </td></tr>

                <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
                  <p style="color:#334155;font-size:12px;margin:0">HisabKitabs · Personal finance tracker · hisabkitabs.vercel.app</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
          </div>

          </body>
          </html>`,
      );

      return response.status(200).json({ success: true });
    }

    if (action === 'delete') {
      await adminClient.from('user_data').delete().eq('user_id', userId);
      await adminClient.from('profiles').delete().eq('id', userId);

      const { error } = await adminClient.auth.admin.deleteUser(userId);

      if (error) {
        throw error;
      }

      return response.status(200).json({ success: true });
    }

    return response.status(400).json({ error: 'Unknown action.' });
  } catch (error) {
    const status = error.message === 'Forbidden.' ? 403 : 500;

    return response
      .status(status)
      .json({ error: error.message || 'Admin action failed.' });
  }
}
