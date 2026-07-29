import type { Person, RelativeKind } from '@/lib/types';
import { fullName, initials, lifespan } from '@/lib/graph';

export interface NodeSlots {
  father: boolean;
  mother: boolean;
}

interface Props {
  person: Person | undefined;
  selected: boolean;
  isRoot: boolean;
  slots: NodeSlots;
  onSelect: () => void;
  onCenter: () => void;
  onQuickAdd: (kind: RelativeKind) => void;
}

export function genderColor(g: Person['gender']) {
  return g === 'female' ? 'var(--female)' : g === 'male' ? 'var(--male)' : 'var(--neutral)';
}

export default function PersonNode({
  person,
  selected,
  isRoot,
  slots,
  onSelect,
  onCenter,
  onQuickAdd,
}: Props) {
  if (!person) return null;

  const tint = genderColor(person.gender);
  const span = lifespan(person);
  const deceased = person.living === 0;

  // Which parent slot is still free — drives the "+" above the card.
  const parentKind: RelativeKind | null = !slots.father
    ? 'father'
    : !slots.mother
      ? 'mother'
      : null;

  return (
    <div className="node-wrap relative h-full w-full p-4">
      <button
        type="button"
        data-node={person.id}
        onClick={onSelect}
        onDoubleClick={onCenter}
        onPointerDown={(e) => e.stopPropagation()}
        className="node-card group relative flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden px-3 pb-3 pt-4 text-left transition-all duration-150 hover:-translate-y-0.5"
        style={{
          background: 'var(--card)',
          border: `1px solid ${selected ? 'var(--accent)' : 'var(--rule)'}`,
          borderRadius: 'var(--card-r)',
          boxShadow: selected
            ? '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent), var(--shadow)'
            : 'var(--hi), var(--shadow-sm)',
        }}
        aria-label={`Abrir ficha de ${fullName(person)}`}
        title="Clica para abrir a ficha · duplo-clique para centrar aqui"
      >
        {/* specimen band — visible only in the "tinta" design (var(--band-h)) */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0"
          style={{ height: 'var(--band-h)', background: tint, opacity: deceased ? 0.55 : 1 }}
        />

        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${person.photo}`}
            alt=""
            className="h-[46px] w-[46px] rounded-full object-cover"
            style={{ border: `2px solid ${tint}`, opacity: deceased ? 0.9 : 1 }}
          />
        ) : (
          <span
            className="flex h-[46px] w-[46px] items-center justify-center rounded-full font-serif text-base font-semibold"
            style={{
              background: `color-mix(in srgb, ${tint} 14%, var(--card-2))`,
              color: tint,
              border: `1px solid color-mix(in srgb, ${tint} 35%, var(--rule))`,
            }}
          >
            {initials(person)}
          </span>
        )}

        <span className="mt-0.5 w-full text-center leading-tight">
          <span
            className="block font-serif text-[13.5px] font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {fullName(person)}
          </span>
          {person.maiden_name ? (
            <span className="block text-[10px] italic" style={{ color: 'var(--faint)' }}>
              n. {person.maiden_name}
            </span>
          ) : null}
        </span>

        {span ? (
          <>
            <span
              aria-hidden
              className="my-0.5 block h-px w-8"
              style={{ background: 'var(--rule)' }}
            />
            <span className="font-mono text-[10.5px]" style={{ color: 'var(--muted)' }}>
              {deceased ? '† ' : ''}
              {span}
            </span>
          </>
        ) : null}

        {isRoot ? (
          <span
            className="absolute right-2 top-[9px] rounded-full px-1.5 py-[3px] text-[8.5px] font-bold uppercase tracking-[0.12em]"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            centro
          </span>
        ) : null}
      </button>

      {/* quick-add affordances, sitting in the gutter around the card */}
      {parentKind ? (
        <QuickAdd
          className="left-1/2 top-0 -translate-x-1/2"
          label={parentKind === 'father' ? 'Adicionar pai' : 'Adicionar mãe'}
          onClick={() => onQuickAdd(parentKind)}
        />
      ) : null}
      <QuickAdd
        className="right-0 top-1/2 -translate-y-1/2"
        label="Adicionar cônjuge"
        onClick={() => onQuickAdd('spouse')}
      />
      <QuickAdd
        className="bottom-0 left-1/2 -translate-x-1/2"
        label="Adicionar filho(a)"
        onClick={() => onQuickAdd('child')}
      />
    </div>
  );
}

function QuickAdd({
  className,
  label,
  onClick,
}: {
  className: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`quick-add ${className}`}
      title={label}
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      +
    </button>
  );
}
