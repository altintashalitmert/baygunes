const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

export const buildBackendUrl = (resourcePath = '') => {
  if (!resourcePath) return BACKEND_URL;
  if (/^https?:\/\//i.test(resourcePath)) return resourcePath;
  return `${BACKEND_URL}${resourcePath}`;
};
