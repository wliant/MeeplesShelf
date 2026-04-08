export interface OverviewStats {
  total_games: number;
  total_sessions: number;
  total_players: number;
  recent_sessions: number;
  most_recent_session_date: string | null;
}

export interface PlayerStats {
  player_id: number;
  player_name: string;
  sessions_played: number;
  wins: number;
  win_rate: number;
}

export interface GameStats {
  game_id: number;
  game_name: string;
  times_played: number;
  unique_players: number;
  last_played: string | null;
}

export interface ActivityMonth {
  month: string;
  session_count: number;
}

export interface PlayerGameBreakdown {
  game_id: number;
  game_name: string;
  times_played: number;
  wins: number;
  win_rate: number;
  avg_score: number | null;
  best_score: number | null;
  last_played: string | null;
}

export interface PlayerRecentSession {
  session_id: number;
  game_id: number;
  game_name: string;
  played_at: string;
  total_score: number | null;
  winner: boolean;
}

export interface PlayerProfileStats {
  player_id: number;
  player_name: string;
  created_at: string;
  sessions_played: number;
  wins: number;
  win_rate: number;
  favorite_game: string | null;
  games: PlayerGameBreakdown[];
  recent_sessions: PlayerRecentSession[];
  activity: ActivityMonth[];
}
