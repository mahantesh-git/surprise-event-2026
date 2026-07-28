type RuntimeEnv = Partial<{
  __runtime: boolean;
  API_URL: string;
  FEATURE_X: string;
  APP_ENV: string;
  TURN_SERVER_URL: string;
  TURN_SERVER_URL_ALT: string;
  TURN_SERVER_USERNAME: string;
  TURN_SERVER_CREDENTIAL: string;
  BACKGROUND_IMAGE_URL: string;
  SOLVER_EXIT_KEY: string;
}>;

declare global {
  interface Window {
    _env_?: RuntimeEnv;
  }
}

const runtimeEnv: RuntimeEnv = typeof window !== 'undefined' && window._env_ ? window._env_ : {};
const viteEnv = import.meta.env as Record<string, string | boolean | undefined>;
const useRuntimeEnv = runtimeEnv.__runtime === true;

function readString(key: keyof RuntimeEnv, fallback: string, viteKey?: string) {
  if (useRuntimeEnv) {
    const runtimeValue = runtimeEnv[key];
    if (typeof runtimeValue === 'string' && runtimeValue.trim()) {
      return runtimeValue.trim();
    }
  }

  const viteValue = viteEnv[viteKey ?? `VITE_${String(key)}`];
  if (typeof viteValue === 'string' && viteValue.trim()) {
    return viteValue.trim();
  }

  const value = runtimeEnv[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function readBoolean(key: keyof RuntimeEnv, fallback = false, viteKey?: string) {
  if (useRuntimeEnv) {
    const runtimeValue = runtimeEnv[key];

    if (typeof runtimeValue === 'boolean') {
      return runtimeValue;
    }

    if (typeof runtimeValue === 'string') {
      return /^(1|true|yes|on)$/i.test(runtimeValue.trim());
    }
  }

  const viteValue = viteEnv[viteKey ?? `VITE_${String(key)}`];
  if (typeof viteValue === 'boolean') {
    return viteValue;
  }

  if (typeof viteValue === 'string') {
    return /^(1|true|yes|on)$/i.test(viteValue.trim());
  }

  const value = runtimeEnv[key];

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return /^(1|true|yes|on)$/i.test(value.trim());
  }

  return fallback;
}

function resolveApiBaseUrl(rawValue: string) {
  const fallback = typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api'
    : '/api';

  if (!rawValue) {
    return fallback;
  }

  let value = rawValue.trim();
  if (!value) {
    return fallback;
  }

  const isLocalhost =
    value.includes('localhost') ||
    value.includes('127.0.0.1') ||
    /^(https?:\/\/)?(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(value);

  if (!value.startsWith('http') && !value.startsWith('//') && value !== '/api') {
    value = isLocalhost ? `http://${value}` : `https://${value}`;
  } else if (!isLocalhost && value.startsWith('http://')) {
    value = value.replace('http://', 'https://');
  }

  value = value.replace(/\/+$/, '');
  return value.endsWith('/api') ? value : `${value}/api`;
}

function resolveSocketBaseUrl(apiBaseUrl: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  if (!apiBaseUrl || apiBaseUrl === '/api') {
    return window.location.origin;
  }

  try {
    const parsed = new URL(apiBaseUrl, window.location.origin);
    const isLocalBackend =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(parsed.hostname);

    if (isLocalBackend && window.location.protocol === 'https:') {
      return window.location.origin;
    }
  } catch {
    // Fall through to the stripped backend origin below.
  }

  return apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

function createTurnServer(urls: string) {
  if (!urls.trim()) {
    return null;
  }

  return {
    urls,
    username: readString('TURN_SERVER_USERNAME', 'openrelayproject'),
    credential: readString('TURN_SERVER_CREDENTIAL', 'openrelayproject'),
  } satisfies RTCIceServer;
}

const apiBaseUrl = resolveApiBaseUrl(readString('API_URL', ''));
const turnServers = [
  createTurnServer(readString('TURN_SERVER_URL', 'turn:openrelay.metered.ca:443?transport=tcp', 'VITE_TURN_SERVER_URL')),
  createTurnServer(readString('TURN_SERVER_URL_ALT', 'turn:openrelay.metered.ca:80', 'VITE_TURN_SERVER_URL_ALT')),
].filter(Boolean) as RTCIceServer[];

export const config = {
  apiBaseUrl,
  socketBaseUrl: resolveSocketBaseUrl(apiBaseUrl),
  featureX: readBoolean('FEATURE_X', false, 'VITE_FEATURE_X'),
  appEnv: readString('APP_ENV', 'development', 'VITE_APP_ENV'),
  backgroundImageUrl: readString('BACKGROUND_IMAGE_URL', '/assets/images/login-bg.png', 'VITE_BACKGROUND_IMAGE_URL'),
  solverExitKey: readString('SOLVER_EXIT_KEY', 'quest-exit', 'VITE_SOLVER_EXIT_KEY'),
  turnServers,
};
