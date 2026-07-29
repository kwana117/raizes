'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Design, FamilyData, Person, RelativeKind } from '@/lib/types';
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
import { genderColor } from './PersonNode';

interface AddRequest {
  id: string;
  kind: RelativeKind;
  n: number;
}

export default function AppShell({ data }: { data: FamilyData }) {
  const router = useRouter();
  const people = data.people;
  const homeId = data.settings.home_id;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rootId, setRootId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addReq, setAddReq] = useState<AddRequest | null>(null);
  const [design, setDesign] = useState<Design>('ramos');
  const searchRef = useRef<HTMLInputElement>(null);

  // O atributo é posto antes do paint pelo script do layout; sincronizar o estado.
  useEffect(() => {
    const cur = document.documentElement.getAttribute('data-design') as Design | null;
    if (cur && DESIGNS.some((d) => d.id === cur)) setDesign(cur);
  }, []);

  const changeDesign = useCallback((next: Design) => {
    setDesign(next);
    document.documentElement.setAttribute('data-design', next);
    try {
      localStorage.setItem('raizes-design', next);
    } catch {
      /* noop */
    }
  }, []);

  // Resolve an always-valid root: chosen -> home -> first person.
  const effectiveRoot = useMemo(() => {
    const ids = new Set(people.map((p) => p.id));
    if (rootId && ids.has(rootId)) return rootId;
    if (homeId && ids.has(homeId)) return homeId;
    return people[0]?.id ?? null;
  }, [rootId, homeId, people]);

  const selected = selectedId ? (people.find((p) => p.id === selectedId) ?? null) : null;
  const rootPerson = people.find((p) => p.id === effectiveRoot) ?? null;

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

  const jumpTo = useCallback((id: string) => {
    setRootId(id);
    setSelectedId(id);
  }, []);

  const handleQuickAdd = useCallback((personId: string, kind: RelativeKind) => {
    setSelectedId(personId);
    setAddReq((prev) => ({ id: personId, kind, n: (prev?.n ?? 0) + 1 }));
  }, []);

  // Global shortcuts: "/" or ⌘K focuses search, Esc closes panels.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === 'Escape') {
        if (showNew) setShowNew(false);
        else if (typing) (el as HTMLElement).blur();
        else setSelectedId(null);
        return;
      }
      if (typing) return;
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showNew]);

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--paper)' }}>
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-2.5"
        style={{ background: 'var(--card)', borderBottom: '1px solid var(--rule)' }}
      >
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="text-base leading-none" style={{ color: 'var(--accent)' }} aria-hidden>
            ❦
          </span>
          <span
            className="font-serif text-[19px] font-semibold leading-none"
            style={{ color: 'var(--ink)' }}
          >
            Raízes
          </span>
          <span
            className="hidden text-[10px] uppercase tracking-[0.14em] lg:inline"
            style={{ color: 'var(--faint)' }}
          >
            arquivo da família
          </span>
        </div>

        {people.length > 0 ? (
          <div className="mx-auto w-full max-w-sm">
            <PeoplePalette data={data} onPick={jumpTo} inputRef={searchRef} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setShowNew(true)} className="btn btn-primary">
            + Pessoa
          </button>
          {people.length > 0 ? (
            <button
              type="button"
              onClick={doExport}
              className="btn btn-quiet hidden sm:inline-flex"
              title="Descarregar uma cópia de tudo em JSON"
            >
              Exportar
            </button>
          ) : null}
          <DesignSwitcher value={design} onChange={changeDesign} />
          <ThemeToggle />
          <button type="button" onClick={() => logout()} className="btn btn-quiet btn-sm">
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden">
          {people.length === 0 ? (
            <EmptyState onNew={() => setShowNew(true)} onExample={loadExample} busy={busy} />
          ) : effectiveRoot ? (
            <>
              <TreeCanvas
                data={data}
                design={design}
                rootId={effectiveRoot}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCenter={(id) => setRootId(id)}
                onQuickAdd={handleQuickAdd}
              />

              {/* what you are looking at */}
              <div className="panel absolute left-5 top-4 flex items-center gap-2.5 py-1.5 pl-3 pr-2">
                <span className="label">a ver a partir de</span>
                <span className="font-serif text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  {rootPerson ? fullName(rootPerson) : '—'}
                </span>
                {homeId && homeId !== effectiveRoot ? (
                  <button
                    type="button"
                    onClick={() => setRootId(homeId)}
                    className="btn btn-quiet btn-sm"
                    title="Voltar à pessoa de referência"
                  >
                    ↩ início
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {selected ? (
          <Sidebar
            key={`${selected.id}-${addReq?.id === selected.id ? addReq.n : 0}`}
            person={selected}
            data={data}
            isRoot={selected.id === effectiveRoot}
            initialAddKind={addReq?.id === selected.id ? addReq.kind : null}
            onSelect={setSelectedId}
            onClose={() => setSelectedId(null)}
            onSetRoot={(id) => setRootId(id)}
          />
        ) : null}
      </div>

      {showNew ? (
        <Modal title="Nova pessoa" onClose={() => setShowNew(false)}>
          <PersonForm
            submitLabel="Criar pessoa"
            onSubmit={createPerson}
            onCancel={() => setShowNew(false)}
            pending={busy}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function EmptyState({
  onNew,
  onExample,
  busy,
}: {
  onNew: () => void;
  onExample: () => void;
  busy: boolean;
}) {
  return (
    <div className="paper-plate flex h-full items-center justify-center px-6">
      <div className="panel anim-fade-up max-w-md p-9 text-center">
        <div className="mb-3 text-2xl" style={{ color: 'var(--accent)' }} aria-hidden>
          ❦
        </div>
        <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          A tua árvore está vazia
        </h1>
        <p
          className="mx-auto mt-2.5 max-w-sm text-[13.5px] leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          Começa por ti ou por um avô. Depois é só passar o rato numa pessoa e usar os{' '}
          <strong style={{ color: 'var(--ink)' }}>+</strong> à volta do cartão para ir juntando pais,
          cônjuges e filhos.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={onNew} className="btn btn-primary">
            Adicionar primeira pessoa
          </button>
          <button
            type="button"
            onClick={onExample}
            disabled={busy}
            className="btn btn-outline"
          >
            {busy ? 'A carregar…' : 'Ver um exemplo'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PeoplePalette({
  data,
  onPick,
  inputRef,
}: {
  data: FamilyData;
  onPick: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);

  const sorted = useMemo(
    () => [...data.people].sort((a, b) => fullName(a).localeCompare(fullName(b), 'pt')),
    [data.people],
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return sorted.slice(0, 40);
    return sorted
      .filter(
        (p) =>
          fullName(p).toLowerCase().includes(term) || p.maiden_name.toLowerCase().includes(term),
      )
      .slice(0, 40);
  }, [q, sorted]);

  useEffect(() => setCursor(0), [q]);

  function pick(p: Person) {
    onPick(p.id);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div className="relative">
      <div className="relative">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: 'var(--faint)' }}
          aria-hidden
        >
          ⌕
        </span>
        <input
          ref={inputRef}
          className="field pl-8 pr-10"
          placeholder="Procurar pessoa…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setCursor((c) => Math.min(c + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === 'Enter' && results[cursor]) {
              e.preventDefault();
              pick(results[cursor]);
            }
          }}
          aria-label="Procurar pessoa"
        />
        <kbd
          className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 font-mono text-[10px] sm:block"
          style={{ color: 'var(--faint)' }}
        >
          /
        </kbd>
      </div>

      {open && results.length > 0 ? (
        <ul
          className="panel scroll-thin anim-pop absolute z-30 mt-1.5 max-h-[60vh] w-full overflow-y-auto p-1"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {results.map((p, i) => {
            const tint = genderColor(p.gender);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={() => pick(p)}
                  onMouseEnter={() => setCursor(i)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left"
                  style={{ background: i === cursor ? 'var(--card-2)' : 'transparent' }}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${tint} 14%, var(--card-2))`,
                      color: tint,
                    }}
                  >
                    {initials(p)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]" style={{ color: 'var(--ink)' }}>
                      {fullName(p)}
                    </span>
                  </span>
                  {lifespan(p) ? (
                    <span className="font-mono text-[10.5px]" style={{ color: 'var(--muted)' }}>
                      {lifespan(p)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const DESIGNS: { id: Design; label: string; hint: string }[] = [
  { id: 'ramos', label: 'Ramos', hint: 'Luz de jardim — ramos lenhosos' },
  { id: 'raizes', label: 'Raízes', hint: 'A árvore à superfície, a família cresce como raízes' },
  { id: 'mural', label: 'Mural', hint: 'Cortiça e fio vermelho — quadro de investigação' },
];

function DesignSwitcher({
  value,
  onChange,
}: {
  value: Design;
  onChange: (d: Design) => void;
}) {
  return (
    <div className="seg hidden md:flex" role="group" aria-label="Escolher desenho da árvore">
      {DESIGNS.map((d) => (
        <button
          key={d.id}
          type="button"
          aria-pressed={value === d.id}
          onClick={() => onChange(d.id)}
          title={d.hint}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'dark' : 'light');
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
      className="btn btn-quiet h-8 w-8 !p-0 text-sm"
    >
      {theme === 'dark' ? '☾' : '☀'}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10"
      style={{ background: 'color-mix(in srgb, var(--paper-2) 70%, transparent)' }}
      onClick={onClose}
    >
      <div
        className="panel anim-pop w-full max-w-md p-6"
        style={{ boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold" style={{ color: 'var(--ink)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="btn btn-quiet h-7 w-7 !p-0 text-lg"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
