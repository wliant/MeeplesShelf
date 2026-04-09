import client from "./client";

export async function loginAdmin(
  password: string
): Promise<{ access_token: string; token_type: string }> {
  const res = await client.post<{ access_token: string; token_type: string }>(
    "/auth/token",
    { password }
  );
  return res.data;
}

export async function loginGuest(
  name: string
): Promise<{ access_token: string; player_id: number; player_name: string }> {
  const res = await client.post<{
    access_token: string;
    player_id: number;
    player_name: string;
  }>("/auth/guest", { name });
  return res.data;
}
