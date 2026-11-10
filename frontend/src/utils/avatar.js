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

/**
 * Extracts initials from a user's full name.
 * Uses first letter of first name and first letter of last name.
 * If only one word, returns its first letter.
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
