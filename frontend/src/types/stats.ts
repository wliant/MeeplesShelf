export interface OverviewStats {
  total_games: number;
  total_sessions: number;
  total_players: number;
  total_play_time_minutes: number;
  unique_games_played: number;
  sessions_last_30_days: number;
}

export interface GameStats {
  game_id: number;
  game_name: string;
  total_plays: number;
  unique_players: number;
  average_score: number | null;
  highest_score: number | null;
  last_played: string | null;
  win_distribution: Record<string, number>;
}

export interface PlayerStats {
  player_id: number;
  player_name: string;
  total_sessions: number;
  total_wins: number;
  win_rate: number;
  favorite_game: string | null;
  games_played: string[];
}

export interface PlayFrequencyEntry {
  period: string;
  count: number;
}

export interface TopGame {
  game_id: number;
  game_name: string;
  play_count: number;
  thumbnail_url: string | null;
}

export interface HIndexGame {
  game_id: number;
  game_name: string;
  play_count: number;
}

export interface HIndexResponse {
  h_index: number;
  contributing_games: HIndexGame[];
}

export interface WinStreakResponse {
  current_streak: number;
  longest_streak: number;
}

export interface PlayerWinRate {
  player_id: number;
  player_name: string;
  total_sessions: number;
  wins: number;
  win_rate: number;
}

export interface ScoreDistributionEntry {
  score: number;
  count: number;
}

export interface ScoreTrendPoint {
  played_at: string;
  score: number;
}

export interface PlayerScoreTrend {
  game_name: string;
  data_points: ScoreTrendPoint[];
}
