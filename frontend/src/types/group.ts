import type { Player } from "./session";

export interface PlayerGroup {
  id: number;
  name: string;
  created_at: string;
  members: Player[];
}
