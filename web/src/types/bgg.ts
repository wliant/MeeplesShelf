export interface BGGSearchResult {
  bgg_id: number;
  name: string;
  year_published: number | null;
}

export interface BGGSearchResponse {
  results: BGGSearchResult[];
}

export interface BGGGameDetail {
  bgg_id: number;
  name: string;
  year_published: number | null;
  description: string | null;
  min_players: number | null;
  max_players: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  categories: string[];
  mechanics: string[];
}
