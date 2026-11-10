/**
 * Centralized API Client for DigiVirasat.
 * 
 * Guarantees:
 * - Proper base URL configuration (defaults to relative '/api' or VITE_API_URL).
 * - Automatic cookie credentials inclusion ('include').
 * - 15-second request timeouts to prevent hung requests.
 * - Meaningful error messages mapped from network, timeout, CORS, rate limits, and server errors.
 * - Zero unhandled "Failed to fetch" exceptions surfaced to user interfaces.
 */

export class ApiError extends Error {
  constructor(message, status = 0, code = 'API_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Default base URL: uses VITE_API_URL if configured, otherwise relative '/api'
const rawApiUrl = import.meta.env.VITE_API_URL;
export const API_BASE_URL = (rawApiUrl && rawApiUrl.trim()) 
  ? rawApiUrl.trim().replace(/\/+$/, '') 
  : '/api';

/**
 * Returns the backend server origin for assets like uploaded avatars.
 */
export function getServerOrigin() {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL.replace(/\/api\/?$/, '');
  }
  return window.location.origin;
}

/**
 * Translates low-level network or fetch exceptions into clear, helpful error descriptions.
 */
function translateNetworkError(err) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return new ApiError(
      'You appear to be offline. Please check your internet connection and try again.',
      0,
      'OFFLINE'
    );
  }

  if (err.name === 'AbortError' || err.name === 'TimeoutError') {
    return new ApiError(
      'The request took too long to complete. Please check your connection and try again.',
      408,
      'TIMEOUT'
    );
  }

  // Generic TypeError: Failed to fetch (connection refused, DNS error, CORS drop)
  return new ApiError(
    'Unable to connect to the DigiVirasat server. The service may be temporarily unavailable or starting up. Please try again shortly.',
    0,
    'NETWORK_UNAVAILABLE',
    err
  );
}

/**
 * Parses HTTP responses safely, extracting JSON error payloads when available.
 */
async function handleResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let data = null;
  try {
    data = isJson ? await response.json() : await response.text();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message = 'An unexpected error occurred. Please try again.';
    let code = 'HTTP_' + response.status;

    if (data && typeof data === 'object') {
      if (data.error?.message) {
        message = data.error.message;
      } else if (data.message) {
        message = data.message;
      }
      if (data.error?.code) {
        code = data.error.code;
      }
    } else if (typeof data === 'string' && data.length > 0 && data.length < 200 && !data.includes('<html')) {
      message = data;
    }

    // Specific HTTP status message fallbacks
    if (response.status === 401) {
      code = 'UNAUTHORIZED';
      message = data?.error?.message || 'Your session has expired or is invalid. Please sign in again.';
    } else if (response.status === 403) {
      code = 'FORBIDDEN';
      message = data?.error?.message || 'Access denied. You do not have permission to view or modify this resource.';
    } else if (response.status === 404) {
      code = 'NOT_FOUND';
      message = data?.error?.message || 'The requested item could not be found.';
    } else if (response.status === 429) {
      code = 'RATE_LIMIT_EXCEEDED';
      message = data?.error?.message || 'Too many requests were made. Please wait a few moments before trying again.';
    } else if (response.status >= 500) {
      code = 'SERVER_ERROR';
      message = data?.error?.message || 'A temporary server error occurred. Our team has been notified. Please try again shortly.';
    }

    throw new ApiError(message, response.status, code, data);
  }

  return data;
}

/**
 * Core fetch wrapper with timeout, credentials, and error mapping.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const timeoutMs = options.timeout || 15000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config = {
    ...options,
    credentials: options.credentials || 'include',
    signal: options.signal || controller.signal,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    return await handleResponse(response);
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw translateNetworkError(err);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body = null, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData && body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    return request(endpoint, {
      ...options,
      method: 'POST',
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  put(endpoint, body = null, options = {}) {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = { ...options.headers };
    if (!isFormData && body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
    }

    return request(endpoint, {
      ...options,
      method: 'PUT',
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  patch(endpoint, body = null, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return request(endpoint, {
      ...options,
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
  },

  upload(endpoint, formData, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    });
  },

  async download(endpoint, options = {}) {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const timeoutMs = options.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        credentials: options.credentials || 'include',
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        await handleResponse(response);
      }

      return await response.blob();
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw translateNetworkError(err);
    } finally {
      clearTimeout(timeoutId);
    }
  },

  getBaseUrl() {
    return API_BASE_URL;
  },

  getServerOrigin,
};

export default api;
