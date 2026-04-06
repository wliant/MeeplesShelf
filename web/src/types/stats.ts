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
