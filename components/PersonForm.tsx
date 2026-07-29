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
      className="space-y-4"
    >
      <div className="space-y-2.5">
        <div className="rule-label">Identificação</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nome próprio">
            <input
              className="field"
              value={v.first_name}
              onChange={(e) => set('first_name', e.target.value)}
              placeholder="Maria"
              autoFocus
            />
          </Field>
          <Field label="Apelido">
            <input
              className="field"
              value={v.last_name}
              onChange={(e) => set('last_name', e.target.value)}
              placeholder="Dias"
            />
          </Field>
        </div>

        <Field label="Apelido de solteira" hint="opcional">
          <input
            className="field"
            value={v.maiden_name}
            onChange={(e) => set('maiden_name', e.target.value)}
          />
        </Field>

        <Field label="Género">
          <GenderPicker value={v.gender} onChange={(g) => set('gender', g)} />
        </Field>
      </div>

      <div className="space-y-2.5">
        <div className="rule-label">Vida</div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nascimento">
            <input
              className="field font-mono"
              placeholder="1948"
              value={v.birth_date}
              onChange={(e) => set('birth_date', e.target.value)}
            />
          </Field>
          <Field label="Naturalidade">
            <input
              className="field"
              placeholder="Funchal"
              value={v.birth_place}
              onChange={(e) => set('birth_place', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Estado">
          <div className="seg">
            <button type="button" aria-pressed={v.living === 1} onClick={() => set('living', 1)}>
              Vive
            </button>
            <button type="button" aria-pressed={v.living === 0} onClick={() => set('living', 0)}>
              Já falecida
            </button>
          </div>
        </Field>

        {v.living === 0 ? (
          <div className="anim-fade-up grid grid-cols-2 gap-2">
            <Field label="Óbito">
              <input
                className="field font-mono"
                placeholder="2019"
                value={v.death_date}
                onChange={(e) => set('death_date', e.target.value)}
              />
            </Field>
            <Field label="Local de óbito">
              <input
                className="field"
                value={v.death_place}
                onChange={(e) => set('death_place', e.target.value)}
              />
            </Field>
          </div>
        ) : null}

        <Field label="Profissão / ocupação">
          <input
            className="field"
            placeholder="Marceneiro"
            value={v.occupation}
            onChange={(e) => set('occupation', e.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-2.5">
        <div className="rule-label">Notas</div>
        <textarea
          className="field"
          rows={4}
          placeholder="Histórias, memórias, o que se sabe desta pessoa…"
          value={v.bio}
          onChange={(e) => set('bio', e.target.value)}
        />
      </div>

      <div
        className="flex justify-end gap-2 pt-1"
        style={{ borderTop: '1px solid var(--rule)', paddingTop: 12 }}
      >
        <button type="button" onClick={onCancel} className="btn btn-quiet">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? 'A guardar…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label mb-1 flex items-baseline gap-1.5">
        {label}
        {hint ? (
          <span style={{ color: 'var(--faint)', fontWeight: 400, textTransform: 'none' }}>
            {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function GenderPicker({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (g: Gender) => void;
}) {
  return (
    <div className="seg">
      <button type="button" aria-pressed={value === 'male'} onClick={() => onChange('male')}>
        Masculino
      </button>
      <button type="button" aria-pressed={value === 'female'} onClick={() => onChange('female')}>
        Feminino
      </button>
      <button type="button" aria-pressed={value === 'unknown'} onClick={() => onChange('unknown')}>
        —
      </button>
    </div>
  );
}
