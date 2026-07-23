import { randomUUID } from 'node:crypto';
import { db } from './db';
import type {
  ChildLink,
  Family,
  FamilyData,
  LifeEvent,
  NewPersonInput,
  Person,
  RelativeKind,
} from './types';

const PERSON_COLUMNS = [
  'first_name',
  'last_name',
  'maiden_name',
  'gender',
  'birth_date',
  'birth_place',
  'death_date',
  'death_place',
  'living',
  'occupation',
  'bio',
] as const;

export function getAllData(): FamilyData {
  const d = db();
  const people = d
    .prepare('SELECT * FROM individuals ORDER BY created_at ASC')
    .all() as Person[];
  const families = d.prepare('SELECT * FROM families').all() as Family[];
  const children = d.prepare('SELECT * FROM family_children').all() as ChildLink[];
  const events = d
    .prepare('SELECT * FROM events ORDER BY sort_key ASC, date ASC')
    .all() as LifeEvent[];
  const settingRows = d.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, string> = {};
  for (const r of settingRows) settings[r.key] = r.value;
  return { people, families, children, events, settings };
}

export function getPerson(id: string): Person | undefined {
  return db().prepare('SELECT * FROM individuals WHERE id = ?').get(id) as
    | Person
    | undefined;
}

export function createPerson(input: NewPersonInput): string {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO individuals
        (id, first_name, last_name, maiden_name, gender, birth_date, birth_place,
         death_date, death_place, living, occupation, bio)
       VALUES (@id, @first_name, @last_name, @maiden_name, @gender, @birth_date,
         @birth_place, @death_date, @death_place, @living, @occupation, @bio)`,
    )
    .run({
      id,
      first_name: input.first_name ?? '',
      last_name: input.last_name ?? '',
      maiden_name: input.maiden_name ?? '',
      gender: input.gender ?? 'unknown',
      birth_date: input.birth_date ?? '',
      birth_place: input.birth_place ?? '',
      death_date: input.death_date ?? '',
      death_place: input.death_place ?? '',
      living: input.living ?? 1,
      occupation: input.occupation ?? '',
      bio: input.bio ?? '',
    });
  return id;
}

export function updatePerson(id: string, patch: Partial<Person>): void {
  const sets: string[] = [];
  const params: Record<string, unknown> = { id };
  for (const col of PERSON_COLUMNS) {
    if (col in patch && patch[col] !== undefined) {
      sets.push(`${col} = @${col}`);
      params[col] = patch[col];
    }
  }
  if (sets.length === 0) return;
  sets.push(`updated_at = datetime('now')`);
  db()
    .prepare(`UPDATE individuals SET ${sets.join(', ')} WHERE id = @id`)
    .run(params);
}

export function setPhoto(id: string, filename: string): void {
  db()
    .prepare(`UPDATE individuals SET photo = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(filename, id);
}

export function deletePerson(id: string): void {
  const d = db();
  const tx = d.transaction((personId: string) => {
    d.prepare('DELETE FROM family_children WHERE child_id = ?').run(personId);
    d.prepare('UPDATE families SET partner1_id = NULL WHERE partner1_id = ?').run(personId);
    d.prepare('UPDATE families SET partner2_id = NULL WHERE partner2_id = ?').run(personId);
    // Remove families that are now empty of partners and childless.
    const empty = d
      .prepare(
        `SELECT f.id FROM families f
         WHERE f.partner1_id IS NULL AND f.partner2_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM family_children fc WHERE fc.family_id = f.id)`,
      )
      .all() as { id: string }[];
    for (const f of empty) d.prepare('DELETE FROM families WHERE id = ?').run(f.id);
    d.prepare('DELETE FROM events WHERE individual_id = ?').run(personId);
    d.prepare('DELETE FROM individuals WHERE id = ?').run(personId);
  });
  tx(id);
}

function parentFamilyOf(id: string): Family | undefined {
  const link = db()
    .prepare('SELECT family_id FROM family_children WHERE child_id = ? LIMIT 1')
    .get(id) as { family_id: string } | undefined;
  if (!link) return undefined;
  return db().prepare('SELECT * FROM families WHERE id = ?').get(link.family_id) as Family;
}

function partnerFamilyOf(id: string): Family | undefined {
  return db()
    .prepare(
      'SELECT * FROM families WHERE partner1_id = ? OR partner2_id = ? ORDER BY rowid ASC LIMIT 1',
    )
    .get(id, id) as Family | undefined;
}

function createFamily(
  partner1: string | null,
  partner2: string | null,
  status: Family['status'] = 'married',
): string {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO families (id, partner1_id, partner2_id, status) VALUES (?, ?, ?, ?)`,
    )
    .run(id, partner1, partner2, status);
  return id;
}

function addChildLink(familyId: string, childId: string): void {
  db()
    .prepare('INSERT OR IGNORE INTO family_children (family_id, child_id) VALUES (?, ?)')
    .run(familyId, childId);
}

export interface AddRelativeResult {
  id?: string;
  error?: string;
}

export function addRelative(
  kind: RelativeKind,
  anchorId: string,
  input: NewPersonInput,
): AddRelativeResult {
  const anchor = getPerson(anchorId);
  if (!anchor) return { error: 'Pessoa de referência não encontrada.' };

  const d = db();
  const tx = d.transaction((): AddRelativeResult => {
    if (kind === 'father' || kind === 'mother') {
      const gender = kind === 'father' ? 'male' : 'female';
      const existing = parentFamilyOf(anchorId);
      const newId = createPerson({ ...input, gender: input.gender ?? gender });
      if (!existing) {
        const p1 = kind === 'father' ? newId : null;
        const p2 = kind === 'mother' ? newId : null;
        const famId = createFamily(p1, p2);
        addChildLink(famId, anchorId);
      } else {
        const slot = kind === 'father' ? 'partner1_id' : 'partner2_id';
        const current =
          kind === 'father' ? existing.partner1_id : existing.partner2_id;
        if (current) {
          // Preferred slot taken; use the other one if free.
          const otherSlot = kind === 'father' ? 'partner2_id' : 'partner1_id';
          const otherCurrent =
            kind === 'father' ? existing.partner2_id : existing.partner1_id;
          if (otherCurrent) {
            deletePerson(newId);
            return { error: 'Esta pessoa já tem dois progenitores registados.' };
          }
          d.prepare(`UPDATE families SET ${otherSlot} = ? WHERE id = ?`).run(newId, existing.id);
        } else {
          d.prepare(`UPDATE families SET ${slot} = ? WHERE id = ?`).run(newId, existing.id);
        }
      }
      return { id: newId };
    }

    if (kind === 'spouse') {
      const newId = createPerson(input);
      createFamily(anchorId, newId, 'married');
      return { id: newId };
    }

    if (kind === 'child') {
      const newId = createPerson(input);
      const fam = partnerFamilyOf(anchorId);
      const famId = fam ? fam.id : createFamily(anchorId, null);
      addChildLink(famId, newId);
      return { id: newId };
    }

    // sibling
    const newId = createPerson(input);
    const existing = parentFamilyOf(anchorId);
    const famId = existing ? existing.id : createFamily(null, null);
    addChildLink(famId, anchorId);
    addChildLink(famId, newId);
    return { id: newId };
  });

  return tx();
}

// --- events (highlights) ---

export function addEvent(individualId: string, title: string, date: string, description: string): string {
  const id = randomUUID();
  db()
    .prepare(
      `INSERT INTO events (id, individual_id, date, title, description, sort_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, individualId, date, title, description, date);
  return id;
}

export function deleteEvent(id: string): void {
  db().prepare('DELETE FROM events WHERE id = ?').run(id);
}

// --- settings ---

export function setSetting(key: string, value: string): void {
  db()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

// --- example seed ---

export function seedExample(): string | null {
  const d = db();
  const count = (d.prepare('SELECT COUNT(*) AS n FROM individuals').get() as { n: number }).n;
  if (count > 0) return null;

  const you = createPerson({
    first_name: 'João',
    last_name: 'Exemplo',
    gender: 'male',
    birth_date: '1990',
    birth_place: 'Lisboa',
  });
  const father = addRelative('father', you, {
    first_name: 'António',
    last_name: 'Exemplo',
    birth_date: '1958',
  }).id!;
  const mother = addRelative('mother', you, {
    first_name: 'Maria',
    last_name: 'Exemplo',
    maiden_name: 'Silva',
    birth_date: '1961',
  }).id!;
  addRelative('father', father, { first_name: 'Manuel', last_name: 'Exemplo', birth_date: '1930', death_date: '2005' });
  addRelative('mother', father, { first_name: 'Rosa', last_name: 'Exemplo', maiden_name: 'Costa', birth_date: '1933', death_date: '2011' });
  addRelative('sibling', you, { first_name: 'Ana', last_name: 'Exemplo', gender: 'female', birth_date: '1993' });
  const spouse = addRelative('spouse', you, { first_name: 'Inês', last_name: 'Exemplo', gender: 'female', birth_date: '1991' }).id!;
  addRelative('child', you, { first_name: 'Tomás', last_name: 'Exemplo', gender: 'male', birth_date: '2020' });
  void mother;
  void spouse;
  setSetting('home_id', you);
  return you;
}
