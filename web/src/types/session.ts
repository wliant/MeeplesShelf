export interface Player {
  id: number;
  name: string;
  created_at: string;
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

export interface GameSession {
  id: number;
  game_id: number;
  game: GameBrief;
  played_at: string;
  notes: string | null;
  created_at: string;
  players: SessionPlayer[];
  expansions: ExpansionBrief[];
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
}

export interface GameSessionUpdate {
  played_at?: string;
  notes?: string | null;
  expansion_ids?: number[];
  players: SessionPlayerCreate[];
}
