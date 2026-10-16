const TOKEN_KEY = 'encore.token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.body = body || {};
    this.fields = body?.fields || {};
  }
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, { error: 'Could not reach Encore Executive. Check your connection — nothing was saved.' });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) {
      tokenStore.set(null);
      window.dispatchEvent(new Event('encore:signed-out'));
    }
    throw new ApiError(res.status, data);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  put: (p, b = {}) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
};
