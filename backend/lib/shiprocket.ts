const SHIPROCKET_URL = 'https://apiv2.shiprocket.in/v1/external';
const TOKEN_BUFFER_MS = 60_000;
const DEFAULT_TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;

export class ShiprocketApiError extends Error {
  statusCode: number;
  responseBody: unknown;
  validationErrors: unknown;

  constructor(message: string, statusCode: number, responseBody: unknown, validationErrors?: unknown) {
    super(message);
    this.name = 'ShiprocketApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    this.validationErrors = validationErrors ?? null;
  }
}

type TokenCache = {
  token: string;
  expiresAt: number;
};

let cachedToken: TokenCache | null = null;
let inflightTokenPromise: Promise<string> | null = null;

function getShiprocketCredentials() {
  const email = process.env.SHIPROCKET_API_EMAIL?.trim() || process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_API_PASSWORD?.trim() || process.env.SHIPROCKET_PASSWORD?.trim();

  if (!email || !password) {
    throw new Error(
      'Missing Shiprocket credentials. Configure SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD.',
    );
  }

  return { email, password };
}

function decodeJwtExpiry(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(decoded) as { exp?: number };

    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      return payload.exp * 1000;
    }
  } catch {
    return null;
  }

  return null;
}

function getTokenExpiry(token: string, authResponse: unknown) {
  const record = authResponse && typeof authResponse === 'object' ? (authResponse as Record<string, unknown>) : {};
  const expiresIn = record.expires_in;

  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }

  const jwtExpiry = decodeJwtExpiry(token);
  if (jwtExpiry) return jwtExpiry;

  return Date.now() + DEFAULT_TOKEN_TTL_MS;
}

function shouldReuseCachedToken() {
  return Boolean(cachedToken && Date.now() + TOKEN_BUFFER_MS < cachedToken.expiresAt);
}

function extractValidationErrors(data: unknown) {
  if (!data || typeof data !== 'object') return null;

  const record = data as Record<string, unknown>;
  if (Array.isArray(record.errors)) return record.errors;

  const nested = record.data && typeof record.data === 'object'
    ? (record.data as Record<string, unknown>)
    : null;

  if (nested && Array.isArray(nested.errors)) return nested.errors;
  return null;
}

async function requestNewToken() {
  const credentials = getShiprocketCredentials();

  console.info('===== Shiprocket Auth =====');
  console.info('Authenticating with Shiprocket...');

  const response = await fetch(`${SHIPROCKET_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await response.json().catch(() => null);

  console.info('Authentication response', {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok || !data || typeof data !== 'object' || !(data as { token?: string }).token) {
    throw new Error(
      `Shiprocket auth failed (${response.status}). Response: ${JSON.stringify(data ?? {})}`,
    );
  }

  const token = (data as { token: string }).token;
  cachedToken = {
    token,
    expiresAt: getTokenExpiry(token, data),
  };

  console.info('token status', {
    hasToken: Boolean(token),
    token,
    expiresAt: new Date(cachedToken.expiresAt).toISOString(),
  });

  return token;
}

export async function getShiprocketToken(forceRefresh = false) {
  if (!forceRefresh && shouldReuseCachedToken()) {
    console.info('===== Shiprocket Auth =====');
    console.info('token status', {
      cache: 'HIT',
      hasToken: true,
      token: cachedToken!.token,
      expiresAt: new Date(cachedToken!.expiresAt).toISOString(),
    });
    return cachedToken!.token;
  }

  if (!forceRefresh && inflightTokenPromise) {
    return inflightTokenPromise;
  }

  inflightTokenPromise = requestNewToken();

  try {
    return await inflightTokenPromise;
  } finally {
    inflightTokenPromise = null;
  }
}

async function postShiprocketOrder(orderData: unknown, token: string) {
  const response = await fetch(`${SHIPROCKET_URL}/orders/create/adhoc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  const data = await response.json().catch(() => null);

  console.info('Complete response', {
    status: response.status,
    ok: response.ok,
    data,
  });

  if (!response.ok) {
    const validationErrors = extractValidationErrors(data);

    throw new ShiprocketApiError(
      `Shiprocket order creation failed (${response.status}).`,
      response.status,
      data,
      validationErrors,
    );
  }

  return data;
}

export async function createShiprocketOrder(orderData: unknown) {
  try {
    console.info('Creating Shiprocket order...');
    console.info('Complete payload', orderData);

    const token = await getShiprocketToken();

    try {
      return await postShiprocketOrder(orderData, token);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const shouldRefreshAndRetry = message.includes('401');

      if (!shouldRefreshAndRetry) {
        throw error;
      }

      const refreshedToken = await getShiprocketToken(true);
      return await postShiprocketOrder(orderData, refreshedToken);
    }
  } catch (error) {
    if (error instanceof ShiprocketApiError) {
      throw error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Shiprocket create order flow failed: ${errorMessage}`);
  }
}

export function hasShiprocketCredentialsConfigured() {
  return Boolean(
    process.env.SHIPROCKET_API_EMAIL?.trim() || process.env.SHIPROCKET_EMAIL?.trim(),
  ) && Boolean(process.env.SHIPROCKET_API_PASSWORD?.trim() || process.env.SHIPROCKET_PASSWORD?.trim());
}
