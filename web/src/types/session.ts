export interface Player {
  id: number;
  name: string;
  created_at: string;
}

export interface PlayerWithCount extends Player {
  session_count: number;
  last_played: string | null;
}

export interface ScoreReaction {
  id: number;
  session_player_id: number;
  player_id: number;
  player: Player;
  reaction: string;
  created_at: string;
}

export interface SessionPlayer {
  id: number;
  player_id: number;
  player: Player;
  score_data: Record<string, unknown>;
  total_score: number | null;
  winner: boolean;
  reactions: ScoreReaction[];
}

export interface GameBrief {
  id: number;
  name: string;
}

export interface ExpansionBrief {
  id: number;
  name: string;
}

export interface SessionImage {
  id: number;
  session_id: number;
  player_id: number | null;
  player: Player | null;
  filename: string;
  original_filename: string;
  content_type: string;
  image_url: string;
  created_at: string;
}

export interface GameSession {
  id: number;
  game_id: number;
  game: GameBrief;
  played_at: string;
  notes: string | null;
  sealed: boolean;
  sealed_at: string | null;
  created_at: string;
  players: SessionPlayer[];
  expansions: ExpansionBrief[];
  images: SessionImage[];
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
