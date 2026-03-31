export interface BGGSearchResult {
  bgg_id: number;
  name: string;
  year_published: number | null;
}

export interface BGGGameDetails {
  bgg_id: number;
  name: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
  year_published: number | null;
  min_age: number | null;
  weight: number | null;
  categories: string[];
  mechanics: string[];
  designers: string[];
  publishers: string[];
}
