/**
 * Resolves avatar image URLs safely.
 * If the URL is relative (e.g. /api/auth/avatar/...), it prepends the backend origin.
 * If it's already an absolute HTTP, blob, or data URL, it returns it directly.
 */
export function getAvatarUrl(url) {
  if (!url) return null;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const serverOrigin = apiBase.replace(/\/api\/?$/, '');
  return `${serverOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
}
