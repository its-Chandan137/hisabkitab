import { supabase } from './supabase';

export async function saveToCloud(
  username,
  encryptedData,
  updatedAt = new Date().toISOString(),
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('user_data')
    .upsert(
      {
        username,
        data: encryptedData,
        updated_at: updatedAt,
      },
      {
        onConflict: 'username',
      },
    )
    .select('updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadFromCloud(username) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
