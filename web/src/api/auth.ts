import client from "./client";

export interface UserResponse {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<UserResponse> {
  const { data } = await client.post("/auth/register", {
    email,
    password,
    display_name: displayName,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
}

export async function refreshToken(
  refreshToken: string
): Promise<TokenResponse> {
  const { data } = await client.post("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return data;
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await client.get("/auth/me");
  return data;
}
