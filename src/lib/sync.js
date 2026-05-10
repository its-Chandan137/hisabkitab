import { supabase } from './supabase';

export async function saveToCloud(
  userId,
  encryptedData,
  updatedAt = new Date().toISOString(),
) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!userId) {
    throw new Error('User id is required to save data.');
  }

  const { data, error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        data: encryptedData,
        updated_at: updatedAt,
      },
      {
        onConflict: 'user_id',
      },
    )
    .select('updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function loadFromCloud(userId) {
  if (!supabase) {
    throw new Error('Supabase is not configured.');
  }

  if (!userId) {
    throw new Error('User id is required to load data.');
  }

  const { data, error } = await supabase
    .from('user_data')
    .select('data, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
