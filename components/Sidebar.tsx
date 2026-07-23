'use client';

import { useRef, useState } from 'react';
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
import PersonForm, { PersonFormValues } from './PersonForm';

interface Props {
  person: Person;
  data: FamilyData;
  isRoot: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onSetRoot: (id: string) => void;
}

const KIND_LABELS: Record<RelativeKind, string> = {
  father: 'Pai',
  mother: 'Mãe',
  spouse: 'Cônjuge',
  child: 'Filho(a)',
  sibling: 'Irmão(ã)',
};

export default function Sidebar({ person, data, isRoot, onSelect, onClose, onSetRoot }: Props) {
  const router = useRouter();
  const rel = relationsOf(person.id, data);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [addKind, setAddKind] = useState<RelativeKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

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

  const genderColor =
    person.gender === 'female' ? 'var(--female)' : person.gender === 'male' ? 'var(--male)' : 'var(--faint)';

  return (
    <aside
      className="scroll-thin absolute right-0 top-0 z-20 flex h-full w-full max-w-[380px] flex-col overflow-y-auto"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-2 px-5 pb-3 pt-4" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            {person.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/media/${person.photo}`} alt={fullName(person)} className="h-14 w-14 rounded-full object-cover" style={{ border: '1px solid var(--border)' }} />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full font-serif text-lg font-semibold" style={{ background: `color-mix(in srgb, ${genderColor} 18%, var(--surface-2))`, color: genderColor, border: '1px solid var(--border)' }}>
                {initials(person)}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
              style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              title="Mudar foto"
              aria-label="Mudar foto"
            >
              ✎
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
              {fullName(person)}
            </h2>
            {person.maiden_name ? (
              <div className="text-xs italic" style={{ color: 'var(--faint)' }}>
                nascida {person.maiden_name}
              </div>
            ) : null}
            <div className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--muted)' }}>
              {lifespan(person) || '—'}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg px-2 py-1 text-lg" style={{ color: 'var(--muted)' }}>
          ×
        </button>
      </div>

      <div className="flex-1 space-y-5 px-5 py-4">
        {err ? (
          <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}>
            {err}
          </p>
        ) : null}

        {mode === 'edit' ? (
          <PersonForm initial={person} submitLabel="Guardar alterações" onSubmit={saveEdit} onCancel={() => setMode('view')} pending={busy} />
        ) : (
          <>
            {/* quick actions */}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('edit')} className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                Editar
              </button>
              {!isRoot ? (
                <button type="button" onClick={() => onSetRoot(person.id)} className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                  Centrar aqui
                </button>
              ) : null}
              <button type="button" onClick={handleDelete} disabled={busy} className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50" style={{ color: 'var(--danger)', border: '1px solid color-mix(in srgb, var(--danger) 40%, var(--border))' }}>
                Eliminar
              </button>
            </div>

            {person.occupation ? <Detail label="Profissão" value={person.occupation} /> : null}
            {person.birth_place ? <Detail label="Naturalidade" value={person.birth_place} /> : null}

            {/* relations */}
            <RelationGroup title="Pais" people={rel.parents} onSelect={onSelect} />
            <RelationGroup title="Cônjuge" people={rel.spouses.map((s) => s.person)} onSelect={onSelect} />
            <RelationGroup title="Filhos" people={rel.children} onSelect={onSelect} />
            <RelationGroup title="Irmãos" people={rel.siblings} onSelect={onSelect} />

            {/* add relative */}
            <div>
              <div className="label mb-2">Adicionar familiar</div>
              <div className="flex flex-wrap gap-2">
                <AddButton disabled={!!rel.fatherId} onClick={() => { setAddKind('father'); setErr(''); }}>+ Pai</AddButton>
                <AddButton disabled={!!rel.motherId} onClick={() => { setAddKind('mother'); setErr(''); }}>+ Mãe</AddButton>
                <AddButton onClick={() => { setAddKind('spouse'); setErr(''); }}>+ Cônjuge</AddButton>
                <AddButton onClick={() => { setAddKind('child'); setErr(''); }}>+ Filho(a)</AddButton>
                <AddButton onClick={() => { setAddKind('sibling'); setErr(''); }}>+ Irmão(ã)</AddButton>
              </div>
              {addKind ? (
                <MiniAddForm
                  kind={addKind}
                  defaultLastName={person.last_name}
                  pending={busy}
                  onCancel={() => setAddKind(null)}
                  onSubmit={(vals) => handleAdd(addKind, vals)}
                />
              ) : null}
            </div>

            {/* life highlights */}
            <LifeEvents person={person} data={data} onChanged={() => router.refresh()} />

            {person.bio ? (
              <div>
                <div className="label mb-1">Notas biográficas</div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                  {person.bio}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm" style={{ color: 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}

function RelationGroup({ title, people, onSelect }: { title: string; people: Person[]; onSelect: (id: string) => void }) {
  if (people.length === 0) return null;
  return (
    <div>
      <div className="label mb-1.5">{title}</div>
      <div className="flex flex-col gap-1.5">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:brightness-95"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                background: `color-mix(in srgb, ${p.gender === 'female' ? 'var(--female)' : p.gender === 'male' ? 'var(--male)' : 'var(--faint)'} 18%, var(--surface))`,
                color: p.gender === 'female' ? 'var(--female)' : p.gender === 'male' ? 'var(--male)' : 'var(--faint)',
              }}
            >
              {initials(p)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {fullName(p)}
              </span>
              {lifespan(p) ? (
                <span className="block text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                  {lifespan(p)}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AddButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
      title={disabled ? 'Já registado' : undefined}
    >
      {children}
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
        onSubmit({ first_name: first.trim(), last_name: last.trim(), gender, birth_date: birth.trim() });
      }}
      className="mt-3 space-y-2 rounded-xl p-3"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <div className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
        Adicionar {KIND_LABELS[kind].toLowerCase()}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input className="field" placeholder="Nome próprio" value={first} onChange={(e) => setFirst(e.target.value)} autoFocus />
        <input className="field" placeholder="Apelido" value={last} onChange={(e) => setLast(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="field" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
          <option value="unknown">Não indicado</option>
        </select>
        <input className="field" placeholder="Ano nasc." value={birth} onChange={(e) => setBirth(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
          Cancelar
        </button>
        <button type="submit" disabled={pending || !first.trim()} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
          {pending ? 'A adicionar…' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}

function LifeEvents({ person, data, onChanged }: { person: Person; data: FamilyData; onChanged: () => void }) {
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
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="label">Marcos de vida</div>
        <button type="button" onClick={() => setAdding((a) => !a)} className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
          {adding ? 'Fechar' : '+ Marco'}
        </button>
      </div>

      {events.length > 0 ? (
        <ol className="relative space-y-2.5 border-l pl-4" style={{ borderColor: 'var(--border)' }}>
          {events.map((ev) => (
            <li key={ev.id} className="group relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)', border: '2px solid var(--surface)' }} />
              <div className="flex items-baseline justify-between gap-2">
                <div>
                  {ev.date ? (
                    <span className="mr-2 text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                      {ev.date}
                    </span>
                  ) : null}
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {ev.title}
                  </span>
                </div>
                <button type="button" onClick={() => remove(ev.id)} className="text-xs opacity-0 transition-opacity group-hover:opacity-100" style={{ color: 'var(--danger)' }} aria-label="Remover marco">
                  ×
                </button>
              </div>
              {ev.description ? (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {ev.description}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : !adding ? (
        <p className="text-xs" style={{ color: 'var(--faint)' }}>
          Sem marcos registados.
        </p>
      ) : null}

      {adding ? (
        <form onSubmit={add} className="mt-2 space-y-2 rounded-xl p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="grid grid-cols-3 gap-2">
            <input className="field col-span-1" placeholder="Ano" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className="field col-span-2" placeholder="Título (ex.: Emigrou para França)" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <textarea className="field" rows={2} placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="flex justify-end">
            <button type="submit" disabled={busy || !title.trim()} className="rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
              Adicionar marco
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
