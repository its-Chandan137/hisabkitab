import { supabase } from './supabase';
import { callInternalApi } from './internalApi';

export async function fetchProfile(userId) {
  if (!supabase || !userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, status, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function requestAccess({ username, email, password }) {
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase is not configured.',
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (signUpError) {
    return { success: false, message: signUpError.message };
  }

  const userId = signUpData.user?.id;

  if (!userId) {
    return {
      success: false,
      message: 'Unable to create your access request.',
    };
  }

  const requestedAt = new Date().toISOString();
  const existingProfile = await fetchProfile(userId);

  if (existingProfile?.status === 'approved') {
    await supabase.auth.signOut();
    return { success: true, status: 'approved' };
  }

  if (existingProfile?.status === 'pending') {
    await supabase.auth.signOut();
    return {
      success: false,
      message: 'Your request is still under review.',
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert(
      {
        id: userId,
        username,
        email,
        status: 'pending',
        created_at: requestedAt,
      },
    )
    .select('status')
    .single();

  if (profileError) {
    await supabase.auth.signOut();
    return { success: false, message: profileError.message };
  }

  await sendEmail({
    to: 'itschandan137@gmail.com',
    subject: 'New access request — HisabKitab',
    html: [
      `<p>Username: ${username}</p>`,
      `<p>Email: ${email}</p>`,
      `<p>Time of request: ${requestedAt}</p>`,
      '<p><a href="https://hisabkitabs.vercel.app/admin">Open admin</a></p>',
    ].join(''),
  });

  await supabase.auth.signOut();

  return {
    success: true,
    status: profile.status,
  };
}

export async function sendEmail({ to, subject, html }) {
  try {
    return await callInternalApi('/api/send-email', { to, subject, html });
  } catch (error) {
    console.warn('Email function failed.', error);
    return { success: false, error };
  }
}
