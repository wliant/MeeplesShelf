import type { ScoringSpec } from "./scoring";

export type CollectionStatus =
  | "owned"
  | "wishlist"
  | "want_to_play"
  | "previously_owned"
  | "want_to_trade"
  | "for_trade"
  | "preordered";

export interface NamedEntity {
  id: number;
  name: string;
}

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
  created_at: string;
  updated_at: string;
  expansions: Expansion[];

  // Metadata
  description: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  min_playtime: number | null;
  max_playtime: number | null;
  min_age: number | null;
  weight: number | null;
  year_published: number | null;
  bgg_id: number | null;
  user_rating: number | null;

  // Collection
  collection_status: CollectionStatus;
  is_favorite: boolean;

  // Relationships
  designers: NamedEntity[];
  publishers: NamedEntity[];
  categories: NamedEntity[];
  mechanics: NamedEntity[];
  tags: GameTag[];
}

export interface GameTag {
  id: number;
  name: string;
  color: string;
}

export interface GameBrief {
  id: number;
  name: string;
}

export interface GameCreate {
  name: string;
  min_players: number;
  max_players: number;
  scoring_spec?: ScoringSpec | null;
  description?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  min_playtime?: number | null;
  max_playtime?: number | null;
  min_age?: number | null;
  weight?: number | null;
  year_published?: number | null;
  bgg_id?: number | null;
  user_rating?: number | null;
  collection_status?: CollectionStatus;
  is_favorite?: boolean;
  designer_names?: string[];
  publisher_names?: string[];
  category_names?: string[];
  mechanic_names?: string[];
}

export interface ExpansionCreate {
  name: string;
  scoring_spec_patch?: ScoringSpec | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}
