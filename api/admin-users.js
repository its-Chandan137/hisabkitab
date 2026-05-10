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
        `<p>Hi ${profile.username}, your access has been approved. You can now log in at https://hisabkitabs.vercel.app</p>`,
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
        `<p>Hi ${profile.username}, unfortunately your access request was not approved at this time.</p>`,
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
