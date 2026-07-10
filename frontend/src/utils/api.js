// Central API configuration
// In development, Vite proxies /api to localhost:5000
// In production, VITE_API_URL points to the deployed backend (e.g. Render)

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default API_BASE_URL;
