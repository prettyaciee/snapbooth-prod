const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:3001/api";

function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  return (apiBaseUrl ?? "").trim().replace(/\/+$/, "");
}

function joinPath(basePath: string, endpointPath: string): string {
  const normalizedBasePath = basePath.endsWith("/")
    ? basePath.slice(0, -1)
    : basePath;
  const normalizedEndpointPath = endpointPath.startsWith("/")
    ? endpointPath
    : `/${endpointPath}`;

  return `${normalizedBasePath}${normalizedEndpointPath}`;
}

function readConfiguredApiBaseUrl(): string {
  const raw = typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_API_BASE_URL || DEFAULT_LOCAL_API_BASE_URL
    : DEFAULT_LOCAL_API_BASE_URL;
  return normalizeApiBaseUrl(raw);
}

export function buildApiUrl(endpointPath: string, apiBaseUrl = readConfiguredApiBaseUrl()): string {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (!normalizedApiBaseUrl) {
    return `${DEFAULT_LOCAL_API_BASE_URL}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
  }

  return `${normalizedApiBaseUrl}${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
}

export function buildWebSocketUrl(
  endpointPath: string,
  apiBaseUrl = readConfiguredApiBaseUrl(),
  pageUrl = typeof window !== "undefined" ? window.location.href : "http://localhost/",
  pageHost = typeof window !== "undefined" ? window.location.host : "localhost",
): string {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (!normalizedApiBaseUrl) {
    const localApiUrl = new URL(DEFAULT_LOCAL_API_BASE_URL);
    const wsOrigin = `${localApiUrl.protocol === "https:" ? "wss:" : "ws:"}//${localApiUrl.host}`;
    const wsPath = joinPath(localApiUrl.pathname, endpointPath);

    return new URL(wsPath, wsOrigin).toString();
  }

  const apiUrl = new URL(normalizedApiBaseUrl);
  const wsOrigin = `${apiUrl.protocol === "https:" ? "wss:" : "ws:"}//${apiUrl.host}`;
  const wsPath = joinPath(apiUrl.pathname, endpointPath);

  return new URL(wsPath, wsOrigin).toString();
}
