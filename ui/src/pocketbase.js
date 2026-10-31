import PocketBase from 'pocketbase';

/**
 * Resolves the PocketBase backend instance URL.
 * Priority:
 * 1. window.__PARLAGUESSR_CONFIG__.pocketbaseUrl (runtime config script)
 * 2. localStorage 'parlaguesser_api_url' (runtime override)
 * 3. import.meta.env.VITE_POCKETBASE_URL (build-time environment variable)
 * 4. 'http://127.0.0.1:8090' (local development default)
 */
export function getPocketBaseUrl() {
    if (typeof window !== 'undefined' && window.__PARLAGUESSR_CONFIG__?.pocketbaseUrl) {
        return window.__PARLAGUESSR_CONFIG__.pocketbaseUrl;
    }
    if (typeof window !== 'undefined') {
        const stored = window.localStorage.getItem('parlaguesser_api_url');
        if (stored) return stored;
    }
    if (import.meta.env?.VITE_POCKETBASE_URL) {
        return import.meta.env.VITE_POCKETBASE_URL;
    }
    return 'http://127.0.0.1:8090';
}

export const pocketBaseUrl = getPocketBaseUrl();
export const pocketBase = new PocketBase(pocketBaseUrl);

export default pocketBase;
