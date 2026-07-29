export type Gender = 'male' | 'female' | 'unknown';
export type FamilyStatus = 'married' | 'partners' | 'divorced';

export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  maiden_name: string;
  gender: Gender;
  birth_date: string;
  birth_place: string;
  death_date: string;
  death_place: string;
  living: 0 | 1;
  occupation: string;
  bio: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  partner1_id: string | null;
  partner2_id: string | null;
  status: FamilyStatus;
  marriage_date: string;
  marriage_place: string;
}

export interface ChildLink {
  family_id: string;
  child_id: string;
}

export interface LifeEvent {
  id: string;
  individual_id: string;
  date: string;
  title: string;
  description: string;
  sort_key: string;
}

export interface FamilyData {
  people: Person[];
  families: Family[];
  children: ChildLink[];
  events: LifeEvent[];
  settings: Record<string, string>;
}

export type RelativeKind = 'father' | 'mother' | 'spouse' | 'child' | 'sibling';

export type Design = 'ramos' | 'raizes' | 'mural';

export interface NewPersonInput {
  first_name?: string;
  last_name?: string;
  maiden_name?: string;
  gender?: Gender;
  birth_date?: string;
  birth_place?: string;
  death_date?: string;
  death_place?: string;
  living?: 0 | 1;
  occupation?: string;
  bio?: string;
}
