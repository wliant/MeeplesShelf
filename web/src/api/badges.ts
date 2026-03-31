import client from "./client";

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  awarded_at: string | null;
}

export const listBadges = () =>
  client.get<Badge[]>("/badges").then((r) => r.data);

export const evaluateBadges = () =>
  client.post<{ newly_awarded: string[] }>("/badges/evaluate").then((r) => r.data);

export const seedBadges = () =>
  client.post("/badges/seed").then((r) => r.data);
