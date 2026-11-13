export async function api(path, { method = 'GET', body } = {}) {
  const t = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || '';


  const res = await fetch(`${API_URL}/api${path}`,{
    method, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
  return data;
}
