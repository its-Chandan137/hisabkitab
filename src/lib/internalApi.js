export async function callInternalApi(path, body, { accessToken } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-internal-key': import.meta.env.VITE_INTERNAL_API_KEY || '',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed.');
  }

  return payload;
}
