export const DEFAULT_LOCAL_API_BASE_URL = "http://localhost:3001/api";

export function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  const trimmedApiBaseUrl = (apiBaseUrl ?? "").trim();

  if (!trimmedApiBaseUrl) {
    return "";
  }

  try {
    const parsedApiUrl = new URL(trimmedApiBaseUrl);
    const normalizedPathname = parsedApiUrl.pathname === "/" || parsedApiUrl.pathname === ""
      ? "/api"
      : parsedApiUrl.pathname.replace(/\/+$/, "");

    parsedApiUrl.pathname = normalizedPathname;
    parsedApiUrl.search = "";
    parsedApiUrl.hash = "";

    return parsedApiUrl.toString().replace(/\/+$/, "");
  } catch {
    return trimmedApiBaseUrl.replace(/\/+$/, "");
  }
}

export function validateProductionApiBaseUrl(apiBaseUrl?: string): string {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);

  if (!normalizedApiBaseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is required for production frontend builds. Set it to your deployed backend URL, for example https://snapbooth-backend.onrender.com/api.",
    );
  }

  return normalizedApiBaseUrl;
}
