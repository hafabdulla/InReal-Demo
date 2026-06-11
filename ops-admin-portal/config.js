// Production API (Render). Override locally via login form or localStorage key: inreal_ops_api_base
const isLocalHost =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

window.INREAL_OPS_CONFIG = {
  apiBase: isLocalHost ? 'http://localhost:5000' : 'https://inreal-demo.onrender.com',
};
