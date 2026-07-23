'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFamilyTree from 'react-family-tree';
import type { ExtNode } from 'relatives-tree/lib/types';
import type { FamilyData, Person } from '@/lib/types';
import { buildTreeNodes } from '@/lib/graph';
import PersonNode from './PersonNode';

const NODE_W = 236;
const NODE_H = 212;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.4;
const PAD = 260;

interface Props {
  data: FamilyData;
  rootId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function TreeCanvas({ data, rootId, selectedId, onSelect }: Props) {
  const nodes = useMemo(() => buildTreeNodes(data), [data]);
  const peopleById = useMemo(() => {
    const m = new Map<string, Person>();
    for (const p of data.people) m.set(p.id, p);
    return m;
  }, [data.people]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [zoomPct, setZoomPct] = useState(100);

  const applyView = useCallback((animate = false) => {
    const w = wrapperRef.current;
    if (!w) return;
    const { scale, tx, ty } = view.current;
    w.style.transition = animate ? 'transform 0.18s ease-out' : 'none';
    w.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    setZoomPct(Math.round(scale * 100));
  }, []);

  const setScaleAt = useCallback(
    (nextScale: number, cx: number, cy: number, animate = false) => {
      const s = view.current.scale;
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
      const worldX = (cx - view.current.tx) / s;
      const worldY = (cy - view.current.ty) / s;
      view.current.scale = clamped;
      view.current.tx = cx - worldX * clamped;
      view.current.ty = cy - worldY * clamped;
      applyView(animate);
    },
    [applyView],
  );

  const centerOnRoot = useCallback(
    (animate = false) => {
      const c = containerRef.current;
      if (!c) return;
      const el = c.querySelector<HTMLElement>(`[data-node="${rootId}"]`);
      const cr = c.getBoundingClientRect();
      if (!el) return;
      const nr = el.getBoundingClientRect();
      const s = view.current.scale;
      const worldX = (nr.left + nr.width / 2 - cr.left - view.current.tx) / s;
      const worldY = (nr.top + nr.height / 2 - cr.top - view.current.ty) / s;
      view.current.tx = cr.width / 2 - worldX * s;
      view.current.ty = cr.height / 2 - worldY * s;
      applyView(animate);
    },
    [rootId, applyView],
  );

  // Recenter on first render and whenever the root changes.
  // Two passes so it settles after the tree layout and fonts land.
  useEffect(() => {
    const t1 = setTimeout(() => centerOnRoot(false), 80);
    const t2 = setTimeout(() => centerOnRoot(false), 360);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [centerOnRoot, nodes.length]);

  // Wheel = zoom (anchored at cursor). Native non-passive listener so we can preventDefault.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0015);
      setScaleAt(view.current.scale * factor, cx, cy, false);
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [setScaleAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    const c = containerRef.current;
    if (!c) return;
    drag.current = { x: e.clientX, y: e.clientY, tx: view.current.tx, ty: view.current.ty };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    view.current.tx = drag.current.tx + (e.clientX - drag.current.x);
    view.current.ty = drag.current.ty + (e.clientY - drag.current.y);
    applyView(false);
  };
  const endPan = (e: React.PointerEvent) => {
    const c = containerRef.current;
    drag.current = null;
    if (c) {
      c.style.cursor = 'grab';
      try {
        c.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    }
  };

  const zoomByButton = (mult: number) => {
    const c = containerRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    setScaleAt(view.current.scale * mult, rect.width / 2, rect.height / 2, true);
  };
  const resetView = () => {
    view.current.scale = 1;
    applyView(true);
    setTimeout(() => centerOnRoot(true), 20);
  };

  const rootExists = nodes.some((n) => n.id === rootId);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="paper-grain h-full w-full touch-none overflow-hidden"
        style={{ background: 'var(--bg)', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
      >
        <div
          ref={wrapperRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transformOrigin: '0 0',
            padding: PAD,
            width: 'max-content',
            willChange: 'transform',
          }}
        >
          {rootExists ? (
            <ReactFamilyTree
              nodes={nodes as never}
              rootId={rootId}
              width={NODE_W}
              height={NODE_H}
              className="tree-canvas"
              renderNode={(node: ExtNode) => (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    width: NODE_W,
                    height: NODE_H,
                    transform: `translate(${node.left * (NODE_W / 2)}px, ${
                      node.top * (NODE_H / 2)
                    }px)`,
                  }}
                >
                  <PersonNode
                    person={peopleById.get(node.id)}
                    selected={node.id === selectedId}
                    isRoot={node.id === rootId}
                    onSelect={() => onSelect(node.id)}
                  />
                </div>
              )}
            />
          ) : null}
        </div>
      </div>

      <div
        className="absolute bottom-4 left-4 flex items-center gap-1 rounded-xl p-1"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <ZoomButton label="Diminuir zoom" onClick={() => zoomByButton(1 / 1.25)}>
          −
        </ZoomButton>
        <button
          type="button"
          onClick={resetView}
          className="rounded-lg px-2 py-1 text-[11px] font-medium tabular-nums"
          style={{ color: 'var(--muted)' }}
          title="Repor zoom e centrar"
        >
          {zoomPct}%
        </button>
        <ZoomButton label="Aumentar zoom" onClick={() => zoomByButton(1.25)}>
          +
        </ZoomButton>
        <div className="mx-1 h-5 w-px" style={{ background: 'var(--border)' }} />
        <ZoomButton label="Centrar no centro da árvore" onClick={() => centerOnRoot(true)}>
          ◎
        </ZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors"
      style={{ color: 'var(--ink)' }}
    >
      {children}
    </button>
  );
}
