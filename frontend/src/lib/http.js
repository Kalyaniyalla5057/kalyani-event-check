import axios from "axios";

// Use the same-origin Nginx reverse proxy.
export const API_BASE = "/api/v1";

// Enable credentials globally
axios.defaults.withCredentials = true;

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
