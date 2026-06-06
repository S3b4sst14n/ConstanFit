const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "constanfit_token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? "Error de red", data.details);
  }
  return data;
}

export const api = {
  auth: {
    login: (credentials) => request("/auth/login", { method: "POST", body: credentials }),
    register: (data) => request("/auth/register", { method: "POST", body: data }),
    me: () => request("/auth/me", { auth: true }),
  },
  plans: {
    list: () => request("/plans"),
  },
  dashboard: {
    overview: () => request("/dashboard", { auth: true }),
  },
  clientes: {
    list: () => request("/clientes", { auth: true }),
    create: (data) => request("/clientes", { method: "POST", body: data, auth: true }),
  },
  asistencias: {
    list: () => request("/asistencias", { auth: true }),
    create: (data) => request("/asistencias", { method: "POST", body: data, auth: true }),
    remove: (id) => request(`/asistencias/${id}`, { method: "DELETE", auth: true }),
  },
  suscripciones: {
    list: () => request("/suscripciones", { auth: true }),
    create: (data) => request("/suscripciones", { method: "POST", body: data, auth: true }),
  },
};
