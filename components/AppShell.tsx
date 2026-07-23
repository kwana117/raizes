'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FamilyData } from '@/lib/types';
import { fullName, initials, lifespan } from '@/lib/graph';
import {
  createPersonAction,
  exportDataAction,
  logout,
  seedExampleAction,
  setHomeAction,
} from '@/app/actions';
import TreeCanvas from './TreeCanvas';
import Sidebar from './Sidebar';
import PersonForm, { PersonFormValues } from './PersonForm';

export default function AppShell({ data }: { data: FamilyData }) {
  const router = useRouter();
  const people = data.people;
  const homeId = data.settings.home_id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);

  // Resolve an always-valid root: chosen -> home -> first person.
  const effectiveRoot = useMemo(() => {
    const ids = new Set(people.map((p) => p.id));
    if (rootId && ids.has(rootId)) return rootId;
    if (homeId && ids.has(homeId)) return homeId;
    return people[0]?.id ?? null;
  }, [rootId, homeId, people]);

  const selected = selectedId ? people.find((p) => p.id === selectedId) ?? null : null;

  async function createPerson(values: PersonFormValues) {
    setBusy(true);
    const id = await createPersonAction(values);
    if (people.length === 0) await setHomeAction(id);
    setBusy(false);
    setShowNew(false);
    setRootId(id);
    setSelectedId(id);
    router.refresh();
  }

  async function loadExample() {
    setBusy(true);
    await seedExampleAction();
    setBusy(false);
    router.refresh();
  }

  async function doExport() {
    const json = await exportDataAction();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raizes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function jumpTo(id: string) {
    setRootId(id);
    setSelectedId(id);
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-2.5"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl font-semibold" style={{ color: 'var(--ink)' }}>
            Raízes
          </span>
        </div>

        {people.length > 0 ? (
          <div className="ml-2 max-w-xs flex-1">
            <PeopleSearch data={data} onPick={jumpTo} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            + Pessoa
          </button>
          {people.length > 0 ? (
            <button
              type="button"
              onClick={doExport}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ color: 'var(--ink)', border: '1px solid var(--border)' }}
            >
              Exportar
            </button>
          ) : null}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg px-3 py-1.5 text-sm"
            style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {people.length === 0 ? (
          <EmptyState onNew={() => setShowNew(true)} onExample={loadExample} busy={busy} />
        ) : effectiveRoot ? (
          <TreeCanvas
            data={data}
            rootId={effectiveRoot}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : null}

        {selected ? (
          <Sidebar
            key={selected.id}
            person={selected}
            data={data}
            isRoot={selected.id === effectiveRoot}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
            onSetRoot={(id) => setRootId(id)}
          />
        ) : null}
      </div>

      {showNew ? (
        <Modal title="Nova pessoa" onClose={() => setShowNew(false)}>
          <PersonForm submitLabel="Criar pessoa" onSubmit={createPerson} onCancel={() => setShowNew(false)} pending={busy} />
        </Modal>
      ) : null}
    </div>
  );
}

function EmptyState({ onNew, onExample, busy }: { onNew: () => void; onExample: () => void; busy: boolean }) {
  return (
    <div className="paper-grain flex h-full items-center justify-center px-6">
      <div
        className="max-w-md rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        <div className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          A tua árvore está vazia
        </div>
        <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>
          Começa por ti ou por um antepassado. Depois vais adicionando pais, cônjuges e filhos a
          partir de cada ficha.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={onNew} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            Adicionar primeira pessoa
          </button>
          <button type="button" onClick={onExample} disabled={busy} className="rounded-lg px-4 py-2 text-sm disabled:opacity-50" style={{ color: 'var(--ink)', border: '1px solid var(--border)' }}>
            {busy ? 'A carregar…' : 'Carregar exemplo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PeopleSearch({ data, onPick }: { data: FamilyData; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return data.people
      .filter((p) => fullName(p).toLowerCase().includes(term) || p.maiden_name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [q, data.people]);

  return (
    <div className="relative">
      <input
        className="field"
        placeholder="Procurar pessoa…"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 ? (
        <ul
          className="scroll-thin absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg py-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={() => {
                  onPick(p.id);
                  setQ('');
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:brightness-95"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${p.gender === 'female' ? 'var(--female)' : p.gender === 'male' ? 'var(--male)' : 'var(--faint)'} 18%, var(--surface-2))`,
                    color: p.gender === 'female' ? 'var(--female)' : p.gender === 'male' ? 'var(--male)' : 'var(--faint)',
                  }}
                >
                  {initials(p)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm" style={{ color: 'var(--ink)' }}>
                    {fullName(p)}
                  </span>
                  {lifespan(p) ? (
                    <span className="block text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
                      {lifespan(p)}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null;
    if (current) setTheme(current);
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('raizes-theme', next);
    } catch {
      /* noop */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
      style={{ color: 'var(--ink)', border: '1px solid var(--border)' }}
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-lg" style={{ color: 'var(--muted)' }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
