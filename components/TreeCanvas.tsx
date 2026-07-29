'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import calcTree from 'relatives-tree';
import type { ExtNode } from 'relatives-tree/lib/types';
import type { Design, FamilyData, Person, RelativeKind } from '@/lib/types';
import { buildTreeNodes } from '@/lib/graph';
import PersonNode, { NodeSlots } from './PersonNode';

const NODE_W = 240;
const NODE_H = 216;
// Card sits inside the cell with this gutter (PersonNode's p-4).
const INSET = 16;
const MIN_SCALE = 0.15;
const MAX_SCALE = 2.4;
const PAD = 280;
// Extra world above the tree for sky + canopy in the "raizes" design:
// the family tree lives underground, growing downward as roots.
const SKY = 250;
const HORIZON = SKY - 70;

interface Props {
  data: FamilyData;
  design: Design;
  rootId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCenter: (id: string) => void;
  onQuickAdd: (personId: string, kind: RelativeKind) => void;
}

interface Pt {
  x: number;
  y: number;
}

interface Stroke {
  d: string;
  w: number;
}

interface Blob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  tone: 1 | 2 | 3;
}

export default function TreeCanvas({
  data,
  design,
  rootId,
  selectedId,
  onSelect,
  onCenter,
  onQuickAdd,
}: Props) {
  const rz = design === 'raizes';
  const nodes = useMemo(() => buildTreeNodes(data), [data]);

  const peopleById = useMemo(() => {
    const m = new Map<string, Person>();
    for (const p of data.people) m.set(p.id, p);
    return m;
  }, [data.people]);

  // Which parent slots are already taken, so the "+" above a card knows
  // whether to offer a father or a mother.
  const slotsById = useMemo(() => {
    const famById = new Map(data.families.map((f) => [f.id, f]));
    const m = new Map<string, NodeSlots>();
    for (const c of data.children) {
      const fam = famById.get(c.family_id);
      m.set(c.child_id, { father: !!fam?.partner1_id, mother: !!fam?.partner2_id });
    }
    return m;
  }, [data.families, data.children]);

  // Layout via relatives-tree directly; having the raw positions lets us
  // draw our own organic connectors (and add the surface world for "raizes").
  const layout = useMemo(() => {
    if (!nodes.some((n) => n.id === rootId)) return null;
    try {
      return calcTree(nodes as never, { rootId });
    } catch {
      return null;
    }
  }, [nodes, rootId]);

  const canvasW = layout ? layout.canvas.width * (NODE_W / 2) : 0;
  const canvasH = layout ? layout.canvas.height * (NODE_H / 2) : 0;
  const totalH = canvasH + (rz ? SKY : 0);

  // In "raizes" the whole family shifts below the surface band.
  const posOf = useCallback(
    (n: ExtNode): Pt => ({
      x: n.left * (NODE_W / 2),
      y: n.top * (NODE_H / 2) + (rz ? SKY : 0),
    }),
    [rz],
  );

  const scene = useMemo(() => {
    const empty = {
      couples: [] as Stroke[],
      boughs: [] as Stroke[],
      rootlets: [] as Stroke[],
      joints: [] as Pt[],
      canopy: [] as Blob[],
      sky: null as string | null,
      grass: null as string | null,
      trunk: null as string | null,
    };
    if (!layout) return empty;

    const pos = new Map<string, Pt>();
    const gen = new Map<string, number>();
    for (const n of layout.nodes as ExtNode[]) {
      if (n.placeholder) continue;
      pos.set(n.id, posOf(n));
      gen.set(n.id, n.top / 2);
    }

    const out = {
      ...empty,
      couples: [],
      boughs: [],
      rootlets: [],
      joints: [],
      canopy: [],
    } as typeof empty;

    // Fine hair-roots sprouting from a junction, growing downward.
    const rootletCluster = (cx: number, cy: number, seed: number) => {
      for (let k = 0; k < 3; k++) {
        const a = ((seed * 37 + k * 55) % 120) + 30; // 30..150 graus, a apontar para baixo
        const rad = (a * Math.PI) / 180;
        const len = 13 + ((seed + k * 3) % 8);
        const ox = Math.cos(rad) * len * (k % 2 === 0 ? 1 : -1);
        const oy = Math.sin(rad) * len * 0.8 + 5;
        out.rootlets.push({
          d: `M ${cx} ${cy} Q ${cx + ox * 0.5} ${cy + oy * 0.5 + 4}, ${cx + ox} ${cy + oy}`,
          w: 1.2,
        });
      }
    };

    let seed = 0;
    for (const f of data.families) {
      const p1 = f.partner1_id ? pos.get(f.partner1_id) : undefined;
      const p2 = f.partner2_id ? pos.get(f.partner2_id) : undefined;
      const kids = data.children
        .filter((c) => c.family_id === f.id)
        .map((c) => pos.get(c.child_id))
        .filter((p): p is Pt => !!p);

      // Root thickness follows the generation: nearer the surface = thicker.
      const gens = [f.partner1_id, f.partner2_id]
        .filter((id): id is string => !!id)
        .map((id) => gen.get(id))
        .filter((g): g is number => g !== undefined);
      const g = gens.length ? Math.min(...gens) : 0;
      const wBough = rz ? Math.max(7.6 - g * 1.7, 2.6) : 0;

      let spring: Pt | null = null;

      if (p1 && p2) {
        const [a, b] = p1.x <= p2.x ? [p1, p2] : [p2, p1];
        const x1 = a.x + NODE_W - INSET;
        const y1 = a.y + NODE_H / 2;
        const x2 = b.x + INSET;
        const y2 = b.y + NODE_H / 2;
        const dx = Math.max(x2 - x1, 24);
        out.couples.push({
          d: `M ${x1} ${y1} C ${x1 + dx / 3} ${y1 + 11}, ${x2 - dx / 3} ${y2 + 11}, ${x2} ${y2}`,
          w: rz ? Math.max(wBough * 0.7, 2.2) : 0,
        });
        spring = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + 9 };
      } else if (p1 || p2) {
        const p = (p1 ?? p2)!;
        spring = { x: p.x + NODE_W / 2, y: p.y + NODE_H - INSET };
      }

      if (!spring || kids.length === 0) continue;
      if (rz) rootletCluster(spring.x, spring.y, ++seed);
      else out.joints.push(spring);

      for (const kid of kids) {
        const end = { x: kid.x + NODE_W / 2, y: kid.y + INSET };
        const dy = Math.max(end.y - spring.y, 40);
        out.boughs.push({
          d: `M ${spring.x} ${spring.y} C ${spring.x} ${spring.y + dy * 0.45}, ${end.x} ${
            end.y - dy * 0.5
          }, ${end.x} ${end.y}`,
          w: wBough,
        });
        if (rz) rootletCluster(end.x, end.y, ++seed);
        else out.joints.push(end);
      }
    }

    // The world above ground: sky, grass line, canopy and trunk piercing
    // the surface down to the founding couple.
    if (rz) {
      // O horizonte estende-se para lá do canvas (o svg tem overflow visível).
      const L = -PAD;
      const R = canvasW + PAD;
      out.sky = `M ${L} ${-PAD} L ${R} ${-PAD} L ${R} ${HORIZON} L ${L} ${HORIZON} Z`;
      out.grass = `M ${L} ${HORIZON - 12} Q ${canvasW / 2} ${HORIZON - 30}, ${R} ${
        HORIZON - 12
      } L ${R} ${HORIZON + 14} L ${L} ${HORIZON + 14} Z`;

      const rootPos = pos.get(rootId);
      if (rootPos) {
        const rootNode = (layout.nodes as ExtNode[]).find((n) => n.id === rootId);
        const spousePos = rootNode?.spouses.length ? pos.get(rootNode.spouses[0].id) : undefined;
        const tx = spousePos
          ? (rootPos.x + spousePos.x) / 2 + NODE_W / 2
          : rootPos.x + NODE_W / 2;
        const tipY = spousePos ? rootPos.y + NODE_H / 2 + 6 : rootPos.y + INSET + 4;

        out.trunk = `M ${tx - 17} ${HORIZON - 8} C ${tx - 13} ${HORIZON + 50}, ${tx - 9} ${
          tipY - 60
        }, ${tx - 6} ${tipY} L ${tx + 6} ${tipY} C ${tx + 9} ${tipY - 60}, ${tx + 13} ${
          HORIZON + 50
        }, ${tx + 17} ${HORIZON - 8} Z`;

        // Copa: blobs de folhagem sobrepostos acima do horizonte.
        const blobs: [number, number, number, number][] = [
          [-74, -14, 46, 30],
          [-38, -46, 50, 34],
          [2, -60, 56, 38],
          [42, -44, 50, 33],
          [76, -12, 44, 29],
          [-16, -8, 46, 30],
          [26, -10, 46, 30],
        ];
        blobs.forEach(([ox, oy, rx, ry], i) => {
          out.canopy.push({
            x: tx + ox,
            y: HORIZON - 46 + oy,
            rx,
            ry,
            rot: ((i * 41) % 30) - 15,
            tone: ((i % 3) + 1) as 1 | 2 | 3,
          });
        });
      }
    }

    return out;
  }, [layout, data.families, data.children, posOf, rz, canvasW, rootId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(
    null,
  );
  const [zoomPct, setZoomPct] = useState(100);

  const applyView = useCallback((animate = false) => {
    const w = wrapperRef.current;
    if (!w) return;
    const { scale, tx, ty } = view.current;
    w.style.transition = animate ? 'transform 0.22s cubic-bezier(0.2,0.7,0.3,1)' : 'none';
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

  /** Centre the viewport on the current root card, keeping the scale. */
  const centerOnRoot = useCallback(
    (animate = false) => {
      const c = containerRef.current;
      if (!c) return;
      const el = c.querySelector<HTMLElement>(`[data-node="${rootId}"]`);
      if (!el) return;
      const cr = c.getBoundingClientRect();
      const nr = el.getBoundingClientRect();
      const s = view.current.scale;
      const worldX = (nr.left + nr.width / 2 - cr.left - view.current.tx) / s;
      const worldY = (nr.top + nr.height / 2 - cr.top - view.current.ty) / s;
      view.current.tx = cr.width / 2 - worldX * s;
      // No design raízes deixa-se ver o céu e a copa acima dos avós.
      view.current.ty = cr.height * (rz ? 0.42 : 0.33) - worldY * s;
      applyView(animate);
    },
    [rootId, applyView, rz],
  );

  /** Zoom out until the whole tree is visible. */
  const fitToScreen = useCallback(
    (animate = true) => {
      const c = containerRef.current;
      if (!c || !canvasW || !totalH) return;
      const cr = c.getBoundingClientRect();
      const scale = Math.min((cr.width - 64) / canvasW, (cr.height - 64) / totalH, 1.2);
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      view.current.scale = s;
      view.current.tx = (cr.width - canvasW * s) / 2 - PAD * s;
      view.current.ty = (cr.height - totalH * s) / 2 - PAD * s;
      applyView(animate);
    },
    [applyView, canvasW, totalH],
  );

  // Settle the view after the tree lays out (and again once fonts land).
  useEffect(() => {
    const t1 = setTimeout(() => centerOnRoot(false), 80);
    const t2 = setTimeout(() => centerOnRoot(false), 360);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [centerOnRoot, nodes.length, design]);

  // Wheel = zoom anchored at the cursor (needs a non-passive listener).
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = c.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setScaleAt(view.current.scale * factor, e.clientX - rect.left, e.clientY - rect.top, false);
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [setScaleAt]);

  // Keyboard: +/- zoom, 0 fit, C centre.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const c = containerRef.current;
      if (!c) return;
      const rect = c.getBoundingClientRect();
      const mid = [rect.width / 2, rect.height / 2] as const;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScaleAt(view.current.scale * 1.25, mid[0], mid[1], true);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setScaleAt(view.current.scale / 1.25, mid[0], mid[1], true);
      } else if (e.key === '0') {
        e.preventDefault();
        fitToScreen(true);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        centerOnRoot(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setScaleAt, fitToScreen, centerOnRoot]);

  const onPointerDown = (e: React.PointerEvent) => {
    const c = containerRef.current;
    if (!c) return;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      tx: view.current.tx,
      ty: view.current.ty,
      moved: false,
    };
    c.setPointerCapture(e.pointerId);
    c.style.cursor = 'grabbing';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 3) return;
    drag.current.moved = true;
    view.current.tx = drag.current.tx + dx;
    view.current.ty = drag.current.ty + dy;
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        ref={containerRef}
        className="paper-plate h-full w-full touch-none overflow-hidden"
        style={{ cursor: 'grab' }}
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
          {layout ? (
            <div className="tree-canvas relative" style={{ width: canvasW, height: totalH }}>
              {/* world drawing under the cards */}
              <svg
                className="pointer-events-none absolute left-0 top-0"
                width={canvasW}
                height={totalH}
                viewBox={`0 0 ${canvasW} ${totalH}`}
                style={{ overflow: 'visible' }}
                aria-hidden
              >
                {scene.sky ? <path className="arv-sky" d={scene.sky} /> : null}
                {scene.trunk ? <path className="arv-trunk" d={scene.trunk} /> : null}
                {scene.grass ? <path className="arv-ground" d={scene.grass} /> : null}
                {scene.canopy.map((b, i) => (
                  <ellipse
                    key={`cn-${i}`}
                    className={`arv-leaf-${b.tone}`}
                    cx={b.x}
                    cy={b.y}
                    rx={b.rx}
                    ry={b.ry}
                    opacity={0.95}
                    transform={`rotate(${b.rot} ${b.x} ${b.y})`}
                  />
                ))}

                {rz ? (
                  <>
                    {scene.rootlets.map((r, i) => (
                      <path key={`rt-${i}`} className="arv-rootlet" d={r.d} strokeWidth={r.w} />
                    ))}
                    {scene.boughs.map((b, i) => (
                      <path key={`b-${i}`} className="arv-bough" d={b.d} strokeWidth={b.w} />
                    ))}
                    {scene.couples.map((b, i) => (
                      <path key={`c-${i}`} className="arv-bough" d={b.d} strokeWidth={b.w} />
                    ))}
                  </>
                ) : (
                  <>
                    {scene.boughs.map((b, i) => (
                      <path key={`bu-${i}`} className="con-under" d={b.d} />
                    ))}
                    {scene.couples.map((b, i) => (
                      <path key={`c-${i}`} className="con" d={b.d} />
                    ))}
                    {scene.boughs.map((b, i) => (
                      <path key={`b-${i}`} className="con" d={b.d} />
                    ))}
                    {scene.joints.map((p, i) => (
                      <circle key={`j-${i}`} className="con-dot" cx={p.x} cy={p.y} />
                    ))}
                  </>
                )}
              </svg>

              {(layout.nodes as ExtNode[]).map((node) => {
                if (node.placeholder) return null;
                const p = posOf(node);
                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      width: NODE_W,
                      height: NODE_H,
                      transform: `translate(${p.x}px, ${p.y}px)`,
                    }}
                  >
                    <PersonNode
                      person={peopleById.get(node.id)}
                      selected={node.id === selectedId}
                      isRoot={node.id === rootId}
                      slots={slotsById.get(node.id) ?? { father: false, mother: false }}
                      onSelect={() => onSelect(node.id)}
                      onCenter={() => onCenter(node.id)}
                      onQuickAdd={(kind) => onQuickAdd(node.id, kind)}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* view controls */}
      <div
        className="panel absolute bottom-5 left-5 flex items-center gap-0.5 p-1"
        style={{ borderRadius: 'var(--r-xl)' }}
      >
        <IconBtn label="Diminuir zoom (−)" onClick={() => zoomByButton(1 / 1.25)}>
          −
        </IconBtn>
        <button
          type="button"
          onClick={() => fitToScreen(true)}
          className="rounded-lg px-2 py-1 font-mono text-[11px]"
          style={{ color: 'var(--muted)' }}
          title="Ver a árvore toda (0)"
        >
          {zoomPct}%
        </button>
        <IconBtn label="Aumentar zoom (+)" onClick={() => zoomByButton(1.25)}>
          +
        </IconBtn>
        <span className="mx-1 h-5 w-px" style={{ background: 'var(--rule)' }} />
        <IconBtn label="Ver a árvore toda (0)" onClick={() => fitToScreen(true)}>
          ⤢
        </IconBtn>
        <IconBtn label="Voltar ao centro (C)" onClick={() => centerOnRoot(true)}>
          ◎
        </IconBtn>
      </div>

      {/* discovery hint */}
      <p
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-[11px] md:block"
        style={{ color: 'var(--faint)' }}
      >
        arrasta para mover · scroll para zoom · passa o rato numa pessoa para adicionar familiares
      </p>
    </div>
  );
}

function IconBtn({
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
      className="btn btn-quiet h-8 w-8 !p-0 text-base"
    >
      {children}
    </button>
  );
}
