export interface RawScoreField {
  id: string;
  label: string;
  type: "raw_score";
  description?: string;
}

export interface NumericField {
  id: string;
  label: string;
  type: "numeric";
  multiplier: number;
  description?: string;
}

export interface BooleanField {
  id: string;
  label: string;
  type: "boolean";
  value: number;
  description?: string;
}

export interface EnumVariant {
  id: string;
  label: string;
  value: number;
}

export interface EnumCountField {
  id: string;
  label: string;
  type: "enum_count";
  variants: EnumVariant[];
  description?: string;
}

export interface SetCollectionField {
  id: string;
  label: string;
  type: "set_collection";
  set_values: number[];
  description?: string;
}

export type ScoringField =
  | RawScoreField
  | NumericField
  | BooleanField
  | EnumCountField
  | SetCollectionField;

export interface ScoringSpec {
  version: number;
  fields: ScoringField[];
}
