const API_BASE = '/api';

/**
 * Fetch wrapper handling JWT headers, token refreshing, and error bodies
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('pw_access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(`${API_BASE}${endpoint}`, config);

  // If token expired (401 with code TOKEN_EXPIRED), try refresh token once
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('pw_refresh_token');
    if (refreshToken && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.data.accessToken;
          localStorage.setItem('pw_access_token', newAccessToken);

          // Retry original request with new token
          headers.Authorization = `Bearer ${newAccessToken}`;
          response = await fetch(`${API_BASE}${endpoint}`, { ...config, headers });
        } else {
          // Token refresh failed, purge tokens
          localStorage.removeItem('pw_access_token');
          localStorage.removeItem('pw_refresh_token');
          localStorage.removeItem('pw_user');
          window.dispatchEvent(new Event('auth:logout'));
        }
      } catch (e) {
        console.error('Refresh token exchange error:', e);
      }
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
