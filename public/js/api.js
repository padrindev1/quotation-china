/* ── OKTZ ERP — API Client ─────────────────────────────────── */

const Auth = (() => {
  let _user = null;
  let _token = null;

  function getToken() {
    return _token || sessionStorage.getItem('_t');
  }
  function setToken(t) {
    _token = t;
    sessionStorage.setItem('_t', t);
  }
  function getRefresh() {
    return sessionStorage.getItem('_r');
  }
  function setRefresh(r) {
    sessionStorage.setItem('_r', r);
  }
  function getUser() {
    if (_user) return _user;
    try { return JSON.parse(sessionStorage.getItem('_u')); } catch { return null; }
  }
  function setUser(u) {
    _user = u;
    sessionStorage.setItem('_u', JSON.stringify(u));
  }
  function clear() {
    _user = null; _token = null;
    sessionStorage.removeItem('_t');
    sessionStorage.removeItem('_r');
    sessionStorage.removeItem('_u');
  }
  async function refresh() {
    const rt = getRefresh();
    if (!rt) return false;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.accessToken);
      return true;
    } catch { return false; }
  }
  function requireAuth() {
    if (!getToken()) { window.location.href = '/'; }
  }
  function hasRole(...roles) {
    const u = getUser();
    return u && roles.includes(u.role);
  }
  return { getToken, setToken, getRefresh, setRefresh, getUser, setUser, clear, refresh, requireAuth, hasRole };
})();

async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED') {
      const ok = await Auth.refresh();
      if (ok) {
        headers['Authorization'] = `Bearer ${Auth.getToken()}`;
        res = await fetch(path, { ...options, headers });
      } else {
        Auth.clear();
        window.location.href = '/';
        return null;
      }
    } else {
      Auth.clear();
      window.location.href = '/';
      return null;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw Object.assign(new Error(err.error || 'Erro na requisição'), { details: err.details, status: res.status });
  }

  return res.json();
}

const API = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};
