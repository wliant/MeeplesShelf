import type { ScoringSpec } from "./scoring";

export interface Expansion {
  id: number;
  game_id: number;
  name: string;
  scoring_spec_patch: ScoringSpec | null;
  created_at: string;
}

export interface Game {
  id: number;
  name: string;
  min_players: number;
  max_players: number;
  scoring_spec: ScoringSpec | null;
  rating: number | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  expansions: Expansion[];
  session_count: number;
  last_played_at: string | null;
}

export interface GameCreate {
  name: string;
  min_players: number;
  max_players: number;
  scoring_spec?: ScoringSpec | null;
  rating?: number | null;
  notes?: string | null;
}

export interface ExpansionCreate {
  name: string;
  scoring_spec_patch?: ScoringSpec | null;
}
