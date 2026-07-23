import type { FamilyData, Person } from './types';

// Shape expected by relatives-tree / react-family-tree.
export interface TreeRelation {
  id: string;
  type: string; // 'blood' | 'married' | 'divorced'
}
export interface TreeNode {
  id: string;
  gender: string; // 'male' | 'female'
  parents: TreeRelation[];
  children: TreeRelation[];
  siblings: TreeRelation[];
  spouses: TreeRelation[];
}

function pushUnique(arr: TreeRelation[], rel: TreeRelation) {
  if (!arr.some((r) => r.id === rel.id)) arr.push(rel);
}

/**
 * Converts our individuals + families model into the bidirectional,
 * consistent node graph relatives-tree needs to lay out the tree.
 */
export function buildTreeNodes(data: FamilyData): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  for (const p of data.people) {
    nodes.set(p.id, {
      id: p.id,
      gender: p.gender === 'female' ? 'female' : 'male',
      parents: [],
      children: [],
      siblings: [],
      spouses: [],
    });
  }

  const kidsByFamily = new Map<string, string[]>();
  for (const c of data.children) {
    if (!nodes.has(c.child_id)) continue;
    const list = kidsByFamily.get(c.family_id) ?? [];
    list.push(c.child_id);
    kidsByFamily.set(c.family_id, list);
  }

  for (const f of data.families) {
    const partners = [f.partner1_id, f.partner2_id].filter(
      (id): id is string => !!id && nodes.has(id),
    );
    const spouseType = f.status === 'divorced' ? 'divorced' : 'married';

    if (partners.length === 2) {
      const [a, b] = partners;
      pushUnique(nodes.get(a)!.spouses, { id: b, type: spouseType });
      pushUnique(nodes.get(b)!.spouses, { id: a, type: spouseType });
    }

    const kids = kidsByFamily.get(f.id) ?? [];
    for (const kid of kids) {
      const kn = nodes.get(kid);
      if (!kn) continue;
      for (const par of partners) {
        pushUnique(kn.parents, { id: par, type: 'blood' });
        pushUnique(nodes.get(par)!.children, { id: kid, type: 'blood' });
      }
    }
    for (const kid of kids) {
      for (const other of kids) {
        if (kid !== other) pushUnique(nodes.get(kid)!.siblings, { id: other, type: 'blood' });
      }
    }
  }

  return Array.from(nodes.values());
}

export interface Relations {
  parents: Person[];
  spouses: { person: Person; family: string; status: string }[];
  children: Person[];
  siblings: Person[];
  parentFamilyId: string | null;
  fatherId: string | null;
  motherId: string | null;
}

const byId = (people: Person[]) => {
  const m = new Map<string, Person>();
  for (const p of people) m.set(p.id, p);
  return m;
};

/** Relations of a single person, for the sidebar / ficha. */
export function relationsOf(id: string, data: FamilyData): Relations {
  const people = byId(data.people);
  const parents: Person[] = [];
  const spouses: Relations['spouses'] = [];
  const childrenList: Person[] = [];
  const siblings: Person[] = [];
  let parentFamilyId: string | null = null;
  let fatherId: string | null = null;
  let motherId: string | null = null;

  // Family where this person is a child -> parents + siblings
  const asChild = data.children.find((c) => c.child_id === id);
  if (asChild) {
    parentFamilyId = asChild.family_id;
    const fam = data.families.find((f) => f.id === asChild.family_id);
    if (fam) {
      fatherId = fam.partner1_id;
      motherId = fam.partner2_id;
      for (const pid of [fam.partner1_id, fam.partner2_id]) {
        if (pid && people.has(pid)) parents.push(people.get(pid)!);
      }
    }
    for (const c of data.children) {
      if (c.family_id === asChild.family_id && c.child_id !== id) {
        const s = people.get(c.child_id);
        if (s) siblings.push(s);
      }
    }
  }

  // Families where this person is a partner -> spouses + children
  for (const fam of data.families) {
    if (fam.partner1_id !== id && fam.partner2_id !== id) continue;
    const otherId = fam.partner1_id === id ? fam.partner2_id : fam.partner1_id;
    if (otherId && people.has(otherId)) {
      spouses.push({ person: people.get(otherId)!, family: fam.id, status: fam.status });
    }
    for (const c of data.children) {
      if (c.family_id === fam.id) {
        const kid = people.get(c.child_id);
        if (kid) childrenList.push(kid);
      }
    }
  }

  return {
    parents,
    spouses,
    children: childrenList,
    siblings,
    parentFamilyId,
    fatherId,
    motherId,
  };
}

// --- display helpers ---

export function fullName(p: Person): string {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
  return name || 'Sem nome';
}

export function initials(p: Person): string {
  const a = p.first_name.trim()[0] ?? '';
  const b = p.last_name.trim()[0] ?? '';
  return (a + b).toUpperCase() || '?';
}

function year(d: string): string {
  const m = d.match(/(\d{4})/);
  return m ? m[1] : d.trim();
}

export function lifespan(p: Person): string {
  const b = year(p.birth_date);
  const d = year(p.death_date);
  if (b && d) return `${b} – ${d}`;
  if (b) return p.living ? `n. ${b}` : `${b} – ?`;
  if (d) return `? – ${d}`;
  return p.living ? '' : '† data desconhecida';
}
