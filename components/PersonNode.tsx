import type { Person } from '@/lib/types';
import { fullName, initials, lifespan } from '@/lib/graph';

interface Props {
  person: Person | undefined;
  selected: boolean;
  isRoot: boolean;
  onSelect: () => void;
}

export default function PersonNode({ person, selected, isRoot, onSelect }: Props) {
  if (!person) return null;
  const genderColor =
    person.gender === 'female'
      ? 'var(--female)'
      : person.gender === 'male'
        ? 'var(--male)'
        : 'var(--faint)';
  const span = lifespan(person);

  return (
    <button
      type="button"
      data-node={person.id}
      onClick={onSelect}
      onPointerDown={(e) => e.stopPropagation()}
      className="group block h-full w-full p-3.5 text-left focus:outline-none"
      aria-label={`Abrir ficha de ${fullName(person)}`}
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 transition-all"
        style={{
          background: 'var(--surface)',
          borderStyle: 'solid',
          borderTopWidth: '3px',
          borderRightWidth: '1px',
          borderBottomWidth: '1px',
          borderLeftWidth: '1px',
          borderTopColor: genderColor,
          borderRightColor: selected ? 'var(--accent)' : 'var(--border)',
          borderBottomColor: selected ? 'var(--accent)' : 'var(--border)',
          borderLeftColor: selected ? 'var(--accent)' : 'var(--border)',
          boxShadow: selected
            ? `0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent), var(--shadow)`
            : 'var(--shadow)',
        }}
      >
        {person.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/media/${person.photo}`}
            alt={fullName(person)}
            className="h-12 w-12 rounded-full object-cover"
            style={{ border: '1px solid var(--border)' }}
          />
        ) : (
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full font-serif text-base font-semibold"
            style={{
              background: `color-mix(in srgb, ${genderColor} 18%, var(--surface-2))`,
              color: genderColor,
              border: '1px solid var(--border)',
            }}
          >
            {initials(person)}
          </div>
        )}
        <div className="w-full text-center leading-tight">
          <div
            className="font-serif text-[13px] font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            {fullName(person)}
          </div>
          {person.maiden_name ? (
            <div className="text-[10px] italic" style={{ color: 'var(--faint)' }}>
              n. {person.maiden_name}
            </div>
          ) : null}
          {span ? (
            <div className="mt-0.5 text-[11px] tabular-nums" style={{ color: 'var(--muted)' }}>
              {span}
            </div>
          ) : null}
        </div>
        {isRoot ? (
          <span
            className="absolute -top-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            centro
          </span>
        ) : null}
      </div>
    </button>
  );
}
