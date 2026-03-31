export interface Player {
  id: number;
  name: string;
  created_at: string;
  avatar_url: string | null;
  color: string | null;
}

export interface SessionPlayer {
  id: number;
  player_id: number;
  player: Player;
  score_data: Record<string, unknown>;
  total_score: number | null;
  winner: boolean;
}

export interface GameBrief {
  id: number;
  name: string;
}

export interface ExpansionBrief {
  id: number;
  name: string;
}

export interface SessionPhoto {
  id: number;
  session_id: number;
  url: string;
  caption: string | null;
  created_at: string;
}

export interface GameSession {
  id: number;
  game_id: number;
  game: GameBrief;
  played_at: string;
  notes: string | null;
  created_at: string;
  players: SessionPlayer[];
  expansions: ExpansionBrief[];
  duration_minutes: number | null;
  is_cooperative: boolean;
  cooperative_result: string | null;
  location: string | null;
  is_incomplete: boolean;
  tiebreaker_winner_id: number | null;
  photos: SessionPhoto[];
}

export interface SessionPlayerCreate {
  player_id: number;
  score_data: Record<string, unknown>;
}

export interface GameSessionCreate {
  game_id: number;
  played_at?: string;
  notes?: string;
  expansion_ids?: number[];
  players: SessionPlayerCreate[];
  duration_minutes?: number | null;
  is_cooperative?: boolean;
  cooperative_result?: string | null;
  location?: string | null;
  is_incomplete?: boolean;
  tiebreaker_winner_id?: number | null;
}

export interface PlayerUpdate {
  avatar_url?: string | null;
  color?: string | null;
}
