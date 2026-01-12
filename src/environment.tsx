// API Base URL Configuration
// ============================================
// यहाँ आप अपना backend server URL set कर सकते हैं
// 
// Development के लिए: http://127.0.0.1:8000
// Production के लिए: https://api.yourdomain.com
//
// URL change करने के लिए:
// 1. नीचे API_BASE_URL की value change करें
// 2. या .env file में REACT_APP_API_BASE_URL=https://your-api-url.com add करें
// ============================================

// Change this value to your backend server URL
// Production में इसे अपने actual API URL से replace करें
export const API_BASE_URL = 'http://127.0.0.1:8000';  // Localhost for development
// export const API_BASE_URL = 'https://app.neexq.com';  // HTTPS URL - fixes mixed content err
// Backend API Path (with /api/ suffix)
export const BACKEND_PATH = `${API_BASE_URL}/api/`;

// Media URL for serving uploaded files
export const MEDIA_URL = `${API_BASE_URL}/media/`;

// Other paths
export const base_path = '';
export const img_path = '/'; // Files in public folder are served from root