'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilyData, Gender, Person, RelativeKind } from '@/lib/types';
import { fullName, initials, lifespan, relationsOf } from '@/lib/graph';
import {
  addEventAction,
  addRelativeAction,
  deleteEventAction,
  deletePersonAction,
  updatePersonAction,
  uploadPhotoAction,
} from '@/app/actions';
import PersonForm, { GenderPicker, PersonFormValues } from './PersonForm';
import { genderColor } from './PersonNode';

interface Props {
  person: Person;
  data: FamilyData;
  isRoot: boolean;
  initialAddKind?: RelativeKind | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  onSetRoot: (id: string) => void;
}

const KIND_LABELS: Record<RelativeKind, string> = {
  father: 'pai',
  mother: 'mãe',
  spouse: 'cônjuge',
  child: 'filho(a)',
  sibling: 'irmão(ã)',
};

export default function Sidebar({
  person,
  data,
  isRoot,
  initialAddKind = null,
  onSelect,
  onClose,
  onSetRoot,
}: Props) {
  const router = useRouter();
  const rel = relationsOf(person.id, data);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [addKind, setAddKind] = useState<RelativeKind | null>(initialAddKind);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLDivElement>(null);

  // When opened from a "+" on the tree, bring the form into view.
  useEffect(() => {
    if (initialAddKind && addRef.current) {
      addRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [initialAddKind]);

  async function saveEdit(values: PersonFormValues) {
    setBusy(true);
    await updatePersonAction(person.id, values);
    setBusy(false);
    setMode('view');
    router.refresh();
  }

  async function handleAdd(kind: RelativeKind, values: MiniValues) {
    setBusy(true);
    setErr('');
    const res = await addRelativeAction(kind, person.id, {
      first_name: values.first_name,
      last_name: values.last_name || person.last_name,
      gender: values.gender,
      birth_date: values.birth_date,
    });
    setBusy(false);
    if (res.error) {
      setErr(res.error);
      return;
    }
    setAddKind(null);
    router.refresh();
    if (res.id) onSelect(res.id);
  }

  async function handleDelete() {
    if (!confirm(`Eliminar ${fullName(person)}? As ligações a esta pessoa serão removidas.`)) return;
    setBusy(true);
    await deletePersonAction(person.id);
    setBusy(false);
    onClose();
    router.refresh();
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('personId', person.id);
    fd.append('file', file);
    setBusy(true);
    const res = await uploadPhotoAction(fd);
    setBusy(false);
    if (res.error) setErr(res.error);
    else router.refresh();
    if (fileRef.current) fileRef.current.value = '';
  }

  const tint = genderColor(person.gender);
  const span = lifespan(person);

  return (
    <aside
      className="anim-slide scroll-thin flex h-full w-full shrink-0 flex-col overflow-y-auto sm:w-[400px]"
      style={{ background: 'var(--card)', borderLeft: '1px solid var(--rule)' }}
    >
      {/* ---------- header ---------- */}
      <div
        className="sticky top-0 z-10 px-5 pb-4 pt-4"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--rule)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            {person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/media/${person.photo}`}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
                style={{ border: `2px solid ${tint}` }}
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-xl font-semibold"
                style={{
                  background: `color-mix(in srgb, ${tint} 14%, var(--card-2))`,
                  color: tint,
                  border: `1px solid color-mix(in srgb, ${tint} 35%, var(--rule))`,
                }}
              >
                {initials(person)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-transform hover:scale-110"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                boxShadow: 'var(--shadow-sm)',
              }}
              title={person.photo ? 'Mudar fotografia' : 'Adicionar fotografia'}
              aria-label={person.photo ? 'Mudar fotografia' : 'Adicionar fotografia'}
            >
              ✎
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              className="font-serif text-[22px] font-semibold leading-tight"
              style={{ color: 'var(--ink)' }}
            >
              {fullName(person)}
            </h2>
            {person.maiden_name ? (
              <div className="text-xs italic" style={{ color: 'var(--faint)' }}>
                nascida {person.maiden_name}
              </div>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {span ? (
                <span className="font-mono text-[12px]" style={{ color: 'var(--muted)' }}>
                  {person.living === 0 ? '† ' : ''}
                  {span}
                </span>
              ) : (
                <span className="text-[12px]" style={{ color: 'var(--faint)' }}>
                  sem datas
                </span>
              )}
              {isRoot ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  centro
                </span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha"
            title="Fechar (Esc)"
            className="btn btn-quiet -mr-1 -mt-1 h-8 w-8 !p-0 text-lg"
          >
            ×
          </button>
        </div>

        {mode === 'view' ? (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setMode('edit')} className="btn btn-outline btn-sm">
              ✎ Editar ficha
            </button>
            {!isRoot ? (
              <button
                type="button"
                onClick={() => onSetRoot(person.id)}
                className="btn btn-outline btn-sm"
                title="Ver a árvore a partir desta pessoa"
              >
                ◎ Centrar aqui
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="btn btn-danger btn-sm ml-auto"
            >
              Eliminar
            </button>
          </div>
        ) : null}
      </div>

      {/* ---------- body ---------- */}
      <div className="flex-1 space-y-6 px-5 py-5">
        {err ? (
          <p
            className="anim-fade-up rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
              color: 'var(--danger)',
            }}
          >
            {err}
          </p>
        ) : null}

        {mode === 'edit' ? (
          <PersonForm
            initial={person}
            submitLabel="Guardar alterações"
            onSubmit={saveEdit}
            onCancel={() => setMode('view')}
            pending={busy}
          />
        ) : (
          <>
            {/* details */}
            <section className="space-y-2.5">
              <div className="rule-label">Ficha</div>
              <Detail label="Profissão" value={person.occupation} onAdd={() => setMode('edit')} />
              <Detail
                label="Naturalidade"
                value={person.birth_place}
                onAdd={() => setMode('edit')}
              />
              {person.living === 0 && person.death_place ? (
                <Detail label="Faleceu em" value={person.death_place} />
              ) : null}
            </section>

            {/* relations */}
            <section className="space-y-3">
              <div className="rule-label">Família</div>
              {rel.parents.length + rel.spouses.length + rel.children.length + rel.siblings.length ===
              0 ? (
                <p className="text-[13px]" style={{ color: 'var(--faint)' }}>
                  Ainda sem familiares ligados. Adiciona abaixo.
                </p>
              ) : null}
              <RelationGroup title="Pais" people={rel.parents} onSelect={onSelect} />
              <RelationGroup
                title="Cônjuge"
                people={rel.spouses.map((s) => s.person)}
                onSelect={onSelect}
              />
              <RelationGroup title="Filhos" people={rel.children} onSelect={onSelect} />
              <RelationGroup title="Irmãos" people={rel.siblings} onSelect={onSelect} />
            </section>

            {/* add relative */}
            <section ref={addRef} className="space-y-2.5 scroll-mt-4">
              <div className="rule-label">Adicionar familiar</div>
              <div className="flex flex-wrap gap-1.5">
                <AddChip
                  disabled={!!rel.fatherId}
                  active={addKind === 'father'}
                  onClick={() => {
                    setAddKind(addKind === 'father' ? null : 'father');
                    setErr('');
                  }}
                >
                  Pai
                </AddChip>
                <AddChip
                  disabled={!!rel.motherId}
                  active={addKind === 'mother'}
                  onClick={() => {
                    setAddKind(addKind === 'mother' ? null : 'mother');
                    setErr('');
                  }}
                >
                  Mãe
                </AddChip>
                <AddChip
                  active={addKind === 'spouse'}
                  onClick={() => {
                    setAddKind(addKind === 'spouse' ? null : 'spouse');
                    setErr('');
                  }}
                >
                  Cônjuge
                </AddChip>
                <AddChip
                  active={addKind === 'child'}
                  onClick={() => {
                    setAddKind(addKind === 'child' ? null : 'child');
                    setErr('');
                  }}
                >
                  Filho(a)
                </AddChip>
                <AddChip
                  active={addKind === 'sibling'}
                  onClick={() => {
                    setAddKind(addKind === 'sibling' ? null : 'sibling');
                    setErr('');
                  }}
                >
                  Irmão(ã)
                </AddChip>
              </div>
              {addKind ? (
                <MiniAddForm
                  key={addKind}
                  kind={addKind}
                  defaultLastName={person.last_name}
                  pending={busy}
                  onCancel={() => setAddKind(null)}
                  onSubmit={(vals) => handleAdd(addKind, vals)}
                />
              ) : null}
            </section>

            <LifeEvents person={person} data={data} onChanged={() => router.refresh()} />

            <section className="space-y-2">
              <div className="rule-label">Notas biográficas</div>
              {person.bio ? (
                <p
                  className="whitespace-pre-wrap text-[13.5px] leading-relaxed"
                  style={{ color: 'var(--ink-2)' }}
                >
                  {person.bio}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className="text-[13px] transition-colors"
                  style={{ color: 'var(--faint)' }}
                >
                  + escrever o que se sabe desta pessoa
                </button>
              )}
            </section>
          </>
        )}
      </div>
    </aside>
  );
}

function Detail({
  label,
  value,
  onAdd,
}: {
  label: string;
  value: string;
  onAdd?: () => void;
}) {
  if (!value && !onAdd) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="label w-24 shrink-0">{label}</span>
      {value ? (
        <span className="text-[13.5px]" style={{ color: 'var(--ink)' }}>
          {value}
        </span>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="text-[13px] transition-colors hover:underline"
          style={{ color: 'var(--faint)' }}
        >
          + adicionar
        </button>
      )}
    </div>
  );
}

function RelationGroup({
  title,
  people,
  onSelect,
}: {
  title: string;
  people: Person[];
  onSelect: (id: string) => void;
}) {
  if (people.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="label">{title}</div>
      <div className="flex flex-col gap-1">
        {people.map((p) => {
          const tint = genderColor(p.gender);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors"
              style={{ border: '1px solid transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-2)';
                e.currentTarget.style.borderColor = 'var(--rule)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {p.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/media/${p.photo}`}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  style={{ border: `1px solid ${tint}` }}
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${tint} 14%, var(--card-2))`,
                    color: tint,
                  }}
                >
                  {initials(p)}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[13.5px] font-medium"
                  style={{ color: 'var(--ink)' }}
                >
                  {fullName(p)}
                </span>
                {lifespan(p) ? (
                  <span className="block font-mono text-[10.5px]" style={{ color: 'var(--muted)' }}>
                    {lifespan(p)}
                  </span>
                ) : null}
              </span>
              <span
                className="opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: 'var(--faint)' }}
              >
                ›
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddChip({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-sm"
      style={{
        background: active ? 'var(--accent)' : 'var(--card-2)',
        color: active ? 'var(--accent-ink)' : 'var(--ink)',
        borderColor: active ? 'var(--accent)' : 'var(--rule)',
      }}
      title={disabled ? 'Já registado' : undefined}
    >
      + {children}
    </button>
  );
}

interface MiniValues {
  first_name: string;
  last_name: string;
  gender: Gender;
  birth_date: string;
}

function MiniAddForm({
  kind,
  defaultLastName,
  pending,
  onSubmit,
  onCancel,
}: {
  kind: RelativeKind;
  defaultLastName: string;
  pending: boolean;
  onSubmit: (v: MiniValues) => void;
  onCancel: () => void;
}) {
  const presetGender: Gender = kind === 'father' ? 'male' : kind === 'mother' ? 'female' : 'unknown';
  const [first, setFirst] = useState('');
  const [last, setLast] = useState(kind === 'spouse' ? '' : defaultLastName);
  const [gender, setGender] = useState<Gender>(presetGender);
  const [birth, setBirth] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          first_name: first.trim(),
          last_name: last.trim(),
          gender,
          birth_date: birth.trim(),
        });
      }}
      className="anim-fade-up space-y-2.5 rounded-xl p-3"
      style={{ background: 'var(--card-2)', border: '1px solid var(--rule)' }}
    >
      <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
        Novo <strong style={{ color: 'var(--ink)' }}>{KIND_LABELS[kind]}</strong> — só o nome chega,
        o resto preenches depois.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="field"
          placeholder="Nome próprio"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          autoFocus
        />
        <input
          className="field"
          placeholder="Apelido"
          value={last}
          onChange={(e) => setLast(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2">
        <GenderPicker value={gender} onChange={setGender} />
        <input
          className="field font-mono w-24"
          placeholder="ano"
          value={birth}
          onChange={(e) => setBirth(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-1.5">
        <button type="button" onClick={onCancel} className="btn btn-quiet btn-sm">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !first.trim()}
          className="btn btn-primary btn-sm"
        >
          {pending ? 'A adicionar…' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}

function LifeEvents({
  person,
  data,
  onChanged,
}: {
  person: Person;
  data: FamilyData;
  onChanged: () => void;
}) {
  const events = data.events.filter((e) => e.individual_id === person.id);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await addEventAction(person.id, title.trim(), date.trim(), desc.trim());
    setBusy(false);
    setTitle('');
    setDate('');
    setDesc('');
    setAdding(false);
    onChanged();
  }

  async function remove(id: string) {
    setBusy(true);
    await deleteEventAction(id);
    setBusy(false);
    onChanged();
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="rule-label flex-1">Marcos de vida</div>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="text-[12px] font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {adding ? 'fechar' : '+ marco'}
        </button>
      </div>

      {events.length > 0 ? (
        <ol className="space-y-3 border-l pl-4" style={{ borderColor: 'var(--rule)' }}>
          {events.map((ev) => (
            <li key={ev.id} className="group relative">
              <span
                className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
                style={{ background: 'var(--accent)', boxShadow: '0 0 0 3px var(--card)' }}
              />
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0">
                  {ev.date ? (
                    <span className="mr-2 font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                      {ev.date}
                    </span>
                  ) : null}
                  <span className="text-[13.5px] font-medium" style={{ color: 'var(--ink)' }}>
                    {ev.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(ev.id)}
                  className="shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--danger)' }}
                  aria-label={`Remover marco ${ev.title}`}
                >
                  ×
                </button>
              </div>
              {ev.description ? (
                <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--muted)' }}>
                  {ev.description}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : !adding ? (
        <p className="text-[13px]" style={{ color: 'var(--faint)' }}>
          Sem marcos registados. Casamentos, mudanças, viagens, o que marcou a vida.
        </p>
      ) : null}

      {adding ? (
        <form
          onSubmit={add}
          className="anim-fade-up space-y-2 rounded-xl p-3"
          style={{ background: 'var(--card-2)', border: '1px solid var(--rule)' }}
        >
          <div className="grid grid-cols-3 gap-2">
            <input
              className="field font-mono col-span-1"
              placeholder="ano"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              className="field col-span-2"
              placeholder="Emigrou para França"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <textarea
            className="field"
            rows={2}
            placeholder="Descrição (opcional)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy || !title.trim()}
              className="btn btn-primary btn-sm"
            >
              Adicionar marco
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
