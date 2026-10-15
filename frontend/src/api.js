async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.error ?? `Error ${response.status}`);
    error.details = data?.details;
    throw error;
  }
  return data;
}

const send = (method, path, body) => request(path, { method, body: JSON.stringify(body) });

export const api = {
  meta: () => request('/meta'),
  technicians: () => request('/technicians'),
  dashboard: () => request('/dashboard'),
  listIncidents: (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return request(`/incidents${query ? `?${query}` : ''}`);
  },
  getIncident: (id) => request(`/incidents/${id}`),
  createIncident: (payload) => send('POST', '/incidents', payload),
  assign: (id, payload) => send('PATCH', `/incidents/${id}/assign`, payload),
  changeStatus: (id, payload) => send('PATCH', `/incidents/${id}/status`, payload),
  addComment: (id, payload) => send('POST', `/incidents/${id}/comments`, payload),
};
