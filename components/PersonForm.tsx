'use client';

import { useState } from 'react';
import type { Gender, NewPersonInput, Person } from '@/lib/types';

export interface PersonFormValues extends NewPersonInput {
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
}

function fromPerson(p?: Partial<Person>): PersonFormValues {
  return {
    first_name: p?.first_name ?? '',
    last_name: p?.last_name ?? '',
    maiden_name: p?.maiden_name ?? '',
    gender: (p?.gender as Gender) ?? 'unknown',
    birth_date: p?.birth_date ?? '',
    birth_place: p?.birth_place ?? '',
    death_date: p?.death_date ?? '',
    death_place: p?.death_place ?? '',
    living: (p?.living as 0 | 1) ?? 1,
    occupation: p?.occupation ?? '',
    bio: p?.bio ?? '',
  };
}

interface Props {
  initial?: Partial<Person>;
  submitLabel: string;
  onSubmit: (values: PersonFormValues) => void | Promise<void>;
  onCancel: () => void;
  pending?: boolean;
}

export default function PersonForm({ initial, submitLabel, onSubmit, onCancel, pending }: Props) {
  const [v, setV] = useState<PersonFormValues>(() => fromPerson(initial));
  const set = <K extends keyof PersonFormValues>(k: K, val: PersonFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Nome próprio</label>
          <input className="field" value={v.first_name} onChange={(e) => set('first_name', e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Apelido</label>
          <input className="field" value={v.last_name} onChange={(e) => set('last_name', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Apelido de solteira</label>
          <input className="field" value={v.maiden_name} onChange={(e) => set('maiden_name', e.target.value)} />
        </div>
        <div>
          <label className="label">Género</label>
          <select className="field" value={v.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="unknown">Não indicado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Nascimento</label>
          <input className="field" placeholder="ex.: 1948 ou 12/03/1948" value={v.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Local de nascimento</label>
          <input className="field" value={v.birth_place} onChange={(e) => set('birth_place', e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink)' }}>
        <input
          type="checkbox"
          checked={v.living === 1}
          onChange={(e) => set('living', e.target.checked ? 1 : 0)}
        />
        Pessoa viva
      </label>

      {v.living === 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Óbito</label>
            <input className="field" placeholder="ex.: 2019" value={v.death_date} onChange={(e) => set('death_date', e.target.value)} />
          </div>
          <div>
            <label className="label">Local de óbito</label>
            <input className="field" value={v.death_place} onChange={(e) => set('death_place', e.target.value)} />
          </div>
        </div>
      ) : null}

      <div>
        <label className="label">Profissão / ocupação</label>
        <input className="field" value={v.occupation} onChange={(e) => set('occupation', e.target.value)} />
      </div>

      <div>
        <label className="label">Notas biográficas</label>
        <textarea className="field" rows={4} value={v.bio} onChange={(e) => set('bio', e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm"
          style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg px-3 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          {pending ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
