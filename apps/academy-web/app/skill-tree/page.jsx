"use client";
import { useCallback, useRef, useState } from "react";
import Link from "next/link";

/* ============================================================
   18-node Kappasinian skill constellation
   ============================================================ */

const NODES = [
  { id:'tom', short:'Theory of Mind', title:'Theory of Mind', x:90, y:120, tier:0, state:'mastered', simXp:120, realXp:40, mastery:'94%', prereq:[], desc:'The 88/12 model drawn live \u2014 primitive, subconscious, critical and conscious mind.' },
  { id:'ep', short:'E/P Suggestibility', title:'Emotional / Physical Suggestibility', x:90, y:260, tier:0, state:'mastered', simXp:120, realXp:40, mastery:'90%', prereq:[], desc:'The 36-question battery and its scoring.' },
  { id:'pretalk', short:'Pre-talk \u00b7 LOVE', title:'Pre-talk & the LOVE frame', x:90, y:400, tier:0, state:'mastered', simXp:100, realXp:30, mastery:'88%', prereq:[], desc:'Listen, Observe, Verify, Empathize. Dispel myths, set expectations.' },
  { id:'arm', short:'Arm-Raising', title:'Arm-Raising Conversion', x:260, y:180, tier:1, state:'mastered', simXp:160, realXp:60, mastery:'86%', prereq:['tom','ep'], desc:'Branch entirely on suggestibility mode; literal declarations vs inferred imagery.' },
  { id:'finger', short:'Finger-Spread', title:'Finger-Spread Induction', x:260, y:340, tier:1, state:'inprogress', simXp:140, realXp:50, mastery:'71%', prereq:['ep'], desc:'The secondary induction for every session after the first.' },
  { id:'snap', short:'Snap \u00b7 Deep Sleep', title:'Snap Conversion', x:420, y:180, tier:2, state:'mastered', simXp:110, realXp:40, mastery:'92%', prereq:['arm'], desc:'Skin contact, the snap, and "deep sleep" at the peak of suggestibility.' },
  { id:'phs', short:'PHS Anchor', title:'PHS to Re-hypnosis', x:420, y:340, tier:2, state:'inprogress', simXp:130, realXp:50, mastery:'74%', prereq:['snap'], desc:'Full anatomy \u2014 cue + purpose + consent + speed triple + somatic tag.' },
  { id:'count', short:'Count 5\u21920', title:'Count 5\u21920 Deepener', x:580, y:110, tier:3, state:'inprogress', simXp:90, realXp:30, mastery:'72%', prereq:['phs'], desc:'Each count a step deeper, voice dropping a level.' },
  { id:'stair', short:'Staircase', title:'Staircase & Self-Image', x:580, y:250, tier:3, state:'available', simXp:120, realXp:45, mastery:'\u2014', prereq:['phs'], desc:'20-step descent with ideomotor finger signals.' },
  { id:'challenge', short:'Challenges', title:'Convincer Challenges', x:580, y:400, tier:3, state:'available', simXp:100, realXp:40, mastery:'\u2014', prereq:['snap'], desc:'Bicep lock, hand-to-forehead, arm rigidity \u2014 felt proof for physical suggestibles.' },
  { id:'ssf', short:'Say-See-Feel', title:'Suggestive Therapy \u00b7 Say-See-Feel', x:740, y:180, tier:4, state:'available', simXp:150, realXp:60, mastery:'\u2014', prereq:['count','stair'], desc:'The therapeutic formula \u2014 literal declarations or permissive invitations.' },
  { id:'imagery', short:'Imagery', title:'Imagery & Desensitization', x:740, y:330, tier:4, state:'available', simXp:130, realXp:50, mastery:'\u2014', prereq:['stair'], desc:'Place the client in a pre-elicited scene; desensitize anxiety.' },
  { id:'selfimg', short:'Situational Rehearsal', title:'Situational Rehearsal', x:740, y:470, tier:4, state:'locked', simXp:120, realXp:50, mastery:'\u2014', prereq:['imagery'], desc:'Walk 2\u20133 real upcoming situations; affirm options and self-worth.' },
  { id:'countout', short:'Count-out 0\u21925', title:'Emergence \u00b7 Count-out 0\u21925', x:900, y:200, tier:5, state:'available', simXp:80, realXp:30, mastery:'\u2014', prereq:['ssf'], desc:'Reverse the energy curve \u2014 start low, end bright.' },
  { id:'verify', short:'Finger-Spread Verify', title:'Finger-Spread PHS Verify', x:900, y:340, tier:5, state:'locked', simXp:110, realXp:45, mastery:'\u2014', prereq:['phs','countout'], desc:'Prove the re-hypnosis cue installed.' },
  { id:'regress', short:'Regression', title:'Age Regression', x:1050, y:130, tier:6, state:'locked', simXp:180, realXp:80, mastery:'\u2014', prereq:['ssf'], desc:'Guided regression to initial sensitizing events.' },
  { id:'child', short:'Child Sessions', title:'Child & Teen Sessions', x:1050, y:270, tier:6, state:'locked', simXp:160, realXp:70, mastery:'\u2014', prereq:['countout'], desc:'Age-banded lexicon and deepeners; guardian presence and consent gates.' },
  { id:'pain', short:'Medical \u00b7 Pain', title:'Medical / Pain (referral-gated)', x:1050, y:410, tier:6, state:'locked', simXp:200, realXp:90, mastery:'\u2014', prereq:['verify'], desc:'Comfort adjunct work \u2014 requires a written physician referral.' },
];

const TIERS = ['FOUNDATIONS','INDUCTION','CONVERSION','DEEPENING','THERAPY','EMERGENCE','SPECIALTIES'];
const TIER_X = [90, 260, 420, 580, 740, 900, 1050];

const STATE_COLOR = {
  mastered:   '#7fb98a',
  inprogress: '#e0a458',
  available:  '#8b7fd4',
  locked:     '#5b566d',
};
const STATE_LABEL = {
  mastered:   'Mastered',
  inprogress: 'In progress',
  available:  'Available',
  locked:     'Locked',
};

const NODE_MAP = Object.fromEntries(NODES.map(n => [n.id, n]));

/* placeholder drill queue (rubric misses) */
const DRILL_QUEUE = [
  { id: 'phs', label: 'PHS anatomy: consent + speed triple', drillId: 'phs_anatomy' },
  { id: 'finger', label: 'Finger-spread: secondary induction flow', drillId: 'fingerspread' },
  { id: 'count', label: 'Count 5\u21920: voice-drop cadence', drillId: 'count_deep' },
];

/* ============================================================
   SVG helpers
   ============================================================ */

function arrowHead(x1, y1, x2, y2, r) {
  // compute the point on the target circle edge and a small arrowhead
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { ex: x2, ey: y2, path: '' };
  const ux = dx / len, uy = dy / len;
  const ex = x2 - ux * (r + 2), ey = y2 - uy * (r + 2);
  const ax = ex - ux * 8, ay = ey - uy * 8;
  const px = -uy * 4, py = ux * 4;
  return {
    ex, ey,
    path: `M${ex},${ey} L${ax + px},${ay + py} L${ax - px},${ay - py} Z`,
  };
}

/* ============================================================
   Component
   ============================================================ */

export default function SkillTree() {
  const [sel, setSel] = useState('tom');
  const [pan, setPan] = useState({ tx: 0, ty: 0, k: 1 });
  const dragging = useRef(null);
  const svgRef = useRef(null);

  const masteredCount = NODES.filter(n => n.state === 'mastered').length;
  const node = sel ? NODE_MAP[sel] : null;

  /* pan handlers */
  const onPointerDown = useCallback((e) => {
    if (e.target.closest('[data-node]')) return; // let node clicks through
    dragging.current = { sx: e.clientX, sy: e.clientY, tx: pan.tx, ty: pan.ty };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pan.tx, pan.ty]);

  const onPointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.sx;
    const dy = e.clientY - dragging.current.sy;
    setPan(p => ({ ...p, tx: dragging.current.tx + dx, ty: dragging.current.ty + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  /* zoom handler */
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    setPan(p => {
      const nk = Math.min(2.5, Math.max(0.4, p.k * factor));
      return { ...p, k: nk };
    });
  }, []);

  /* ---- render ---- */

  const R = 24; // node radius

  return (
    <article>
      <span className="eyebrow">Curriculum &middot; HMI course order</span>
      <h1>Skill <em>Constellation</em></h1>

      {/* mastered count + legend */}
      <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', marginBottom:20 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--ok)' }}>
          {masteredCount} / {NODES.length} mastered
        </span>
        <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
          {Object.entries(STATE_LABEL).map(([k, label]) => (
            <span key={k} style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, color:'var(--mist)' }}>
              <span style={{
                width:10, height:10, borderRadius:'50%',
                background: (k === 'mastered' || k === 'inprogress') ? STATE_COLOR[k] : 'transparent',
                border: (k === 'available' || k === 'locked') ? `2px solid ${STATE_COLOR[k]}` : 'none',
              }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* What / Why / How / Value info grid */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:14, marginBottom:28,
      }}>
        {[
          { h:'What', t:'18 Kappasinian skills arranged by prerequisite dependency, from Theory of Mind through specialties.' },
          { h:'Why', t:'Visualize your progression, spot bottlenecks, and pick the next highest-leverage drill.' },
          { h:'How', t:'Click any node to inspect mastery, XP split, and prerequisites. Pan by dragging, zoom with scroll wheel.' },
          { h:'Value', t:'Dual-XP (sim + real) ensures lab reps translate to genuine clinical competence.' },
        ].map(({ h, t }) => (
          <div key={h} style={{
            background:'var(--panel)', border:'1px solid var(--line)', borderRadius:'var(--r-md)',
            padding:'16px 18px',
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--iris)', marginBottom:6 }}>{h}</div>
            <div style={{ fontSize:13, color:'var(--mist)', lineHeight:1.55 }}>{t}</div>
          </div>
        ))}
      </div>

      {/* Main grid: SVG + detail sidebar */}
      <div style={{
        display:'grid', gridTemplateColumns:'minmax(0,1fr) 328px', gap:22, alignItems:'start',
      }}>
        {/* SVG constellation */}
        <div style={{
          border:'1px solid var(--line)', borderRadius:'var(--r-lg)', background:'var(--panel)',
          overflow:'hidden', position:'relative',
        }}>
          <svg
            ref={svgRef}
            viewBox="0 0 1160 640"
            style={{ display:'block', width:'100%', height:'auto', cursor: dragging.current ? 'grabbing' : 'grab', touchAction:'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            role="img"
            aria-label="Skill constellation: 18 hypnotherapy nodes connected by prerequisite edges"
          >
            <g transform={`translate(${pan.tx},${pan.ty}) scale(${pan.k})`}>

              {/* tier labels along top */}
              {TIERS.map((label, i) => (
                <text
                  key={label}
                  x={TIER_X[i]}
                  y={42}
                  textAnchor="middle"
                  style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'.14em', textTransform:'uppercase', fill:'var(--dim)' }}
                >
                  {label}
                </text>
              ))}

              {/* tier vertical guides */}
              {TIER_X.map((tx, i) => (
                <line key={i} x1={tx} y1={54} x2={tx} y2={560} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 6" opacity={0.4} />
              ))}

              {/* edges (prereq -> node) */}
              {NODES.map(n => n.prereq.map(pid => {
                const p = NODE_MAP[pid];
                if (!p) return null;
                const { ex, ey, path } = arrowHead(p.x, p.y, n.x, n.y, R);
                const sx = p.x, sy = p.y;
                // start from edge of source circle
                const dxs = n.x - p.x, dys = n.y - p.y;
                const lens = Math.sqrt(dxs * dxs + dys * dys);
                const startX = sx + (dxs / lens) * (R + 2);
                const startY = sy + (dys / lens) * (R + 2);
                const edgeColor = n.state === 'locked' ? 'var(--dim)' : 'var(--line-2)';
                return (
                  <g key={`${pid}-${n.id}`}>
                    <line
                      x1={startX} y1={startY} x2={ex} y2={ey}
                      stroke={edgeColor} strokeWidth={1.5}
                      opacity={n.state === 'locked' ? 0.35 : 0.7}
                    />
                    <path d={path} fill={edgeColor} opacity={n.state === 'locked' ? 0.35 : 0.7} />
                  </g>
                );
              }))}

              {/* nodes */}
              {NODES.map(n => {
                const col = STATE_COLOR[n.state];
                const isFilled = n.state === 'mastered' || n.state === 'inprogress';
                const isSel = sel === n.id;
                return (
                  <g
                    key={n.id}
                    data-node={n.id}
                    style={{ cursor:'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setSel(n.id); }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${n.short}: ${STATE_LABEL[n.state]}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(n.id); } }}
                  >
                    {/* selection glow */}
                    {isSel && (
                      <circle cx={n.x} cy={n.y} r={R + 8} fill="none" stroke={col} strokeWidth={2} opacity={0.45}>
                        <animate attributeName="r" values={`${R + 6};${R + 12};${R + 6}`} dur="2.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.45;0.15;0.45" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* main circle */}
                    <circle
                      cx={n.x} cy={n.y} r={R}
                      fill={isFilled ? col : 'transparent'}
                      stroke={col}
                      strokeWidth={isSel ? 3 : 2}
                      opacity={n.state === 'locked' ? 0.5 : 1}
                    />
                    {/* mastery ring for in-progress */}
                    {n.state === 'inprogress' && n.mastery !== '\u2014' && (
                      <circle
                        cx={n.x} cy={n.y} r={R}
                        fill="none" stroke="#1a1408" strokeWidth={3}
                        strokeDasharray={`${2 * Math.PI * R * (1 - parseInt(n.mastery) / 100)} ${2 * Math.PI * R}`}
                        strokeDashoffset={0}
                        transform={`rotate(-90 ${n.x} ${n.y})`}
                        opacity={0.4}
                      />
                    )}
                    {/* label */}
                    <text
                      x={n.x} y={n.y + R + 16}
                      textAnchor="middle"
                      style={{
                        fontFamily:'var(--body)', fontSize:11, fontWeight:500,
                        fill: n.state === 'locked' ? 'var(--dim)' : 'var(--mist)',
                      }}
                    >
                      {n.short}
                    </text>
                    {/* mastery % inside circle if mastered */}
                    {n.state === 'mastered' && (
                      <text
                        x={n.x} y={n.y + 4}
                        textAnchor="middle"
                        style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:650, fill:'var(--void)' }}
                      >
                        {n.mastery}
                      </text>
                    )}
                    {/* lock icon for locked */}
                    {n.state === 'locked' && (
                      <text
                        x={n.x} y={n.y + 5}
                        textAnchor="middle"
                        style={{ fontSize:14, fill:'var(--dim)' }}
                      >
                        &#x1f512;
                      </text>
                    )}
                    {/* in-progress: mastery inside */}
                    {n.state === 'inprogress' && n.mastery !== '\u2014' && (
                      <text
                        x={n.x} y={n.y + 4}
                        textAnchor="middle"
                        style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight:650, fill:'var(--void)' }}
                      >
                        {n.mastery}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* zoom controls */}
          <div style={{
            position:'absolute', bottom:12, right:12, display:'flex', gap:4,
          }}>
            <button
              type="button"
              onClick={() => setPan(p => ({ ...p, k: Math.min(2.5, p.k * 1.2) }))}
              style={{
                width:28, height:28, borderRadius:6, border:'1px solid var(--line)',
                background:'var(--panel-2)', color:'var(--ink)', cursor:'pointer', fontSize:16, lineHeight:1,
                display:'grid', placeItems:'center',
              }}
              aria-label="Zoom in"
            >+</button>
            <button
              type="button"
              onClick={() => setPan(p => ({ ...p, k: Math.max(0.4, p.k * 0.83) }))}
              style={{
                width:28, height:28, borderRadius:6, border:'1px solid var(--line)',
                background:'var(--panel-2)', color:'var(--ink)', cursor:'pointer', fontSize:16, lineHeight:1,
                display:'grid', placeItems:'center',
              }}
              aria-label="Zoom out"
            >&minus;</button>
            <button
              type="button"
              onClick={() => setPan({ tx: 0, ty: 0, k: 1 })}
              style={{
                height:28, borderRadius:6, border:'1px solid var(--line)',
                background:'var(--panel-2)', color:'var(--mist)', cursor:'pointer', fontSize:10, lineHeight:1,
                padding:'0 8px', fontFamily:'var(--mono)', letterSpacing:'.06em',
              }}
              aria-label="Reset view"
            >RESET</button>
          </div>
        </div>

        {/* Detail sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* selected node card */}
          {node && (
            <div style={{
              border:'1px solid var(--line)', borderRadius:'var(--r-lg)', background:'var(--panel)',
              padding:'20px 22px', display:'flex', flexDirection:'column', gap:14,
            }}>
              {/* state dot + tier */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{
                  width:10, height:10, borderRadius:'50%',
                  background: (node.state === 'mastered' || node.state === 'inprogress') ? STATE_COLOR[node.state] : 'transparent',
                  border: (node.state === 'available' || node.state === 'locked') ? `2px solid ${STATE_COLOR[node.state]}` : 'none',
                }} />
                <span style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.1em', textTransform:'uppercase', color: STATE_COLOR[node.state] }}>
                  {STATE_LABEL[node.state]}
                </span>
                <span style={{ marginLeft:'auto', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.12em', textTransform:'uppercase', color:'var(--dim)' }}>
                  {TIERS[node.tier]}
                </span>
              </div>

              {/* title */}
              <h2 style={{ font:'340 22px/1.15 var(--display)', margin:0 }}>{node.title}</h2>

              {/* description */}
              <p style={{ fontSize:13.5, color:'var(--mist)', lineHeight:1.55, margin:0 }}>{node.desc}</p>

              {/* XP chips */}
              <div style={{ display:'flex', gap:8 }}>
                <span style={{
                  fontFamily:'var(--mono)', fontSize:11, color:'var(--iris)',
                  border:'1px solid rgba(139,127,212,0.4)', borderRadius:'var(--r-pill)',
                  padding:'4px 11px',
                }}>
                  SIM {node.simXp} xp
                </span>
                <span style={{
                  fontFamily:'var(--mono)', fontSize:11, color:'var(--amber)',
                  border:'1px solid rgba(224,164,88,0.4)', borderRadius:'var(--r-pill)',
                  padding:'4px 11px',
                }}>
                  REAL {node.realXp} xp
                </span>
              </div>

              {/* mastery */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontSize:12, color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--mono)' }}>Mastery</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:20, color: node.mastery === '\u2014' ? 'var(--dim)' : 'var(--ok)' }}>
                  {node.mastery}
                </span>
              </div>

              {/* mastery bar */}
              {node.mastery !== '\u2014' && (
                <div style={{ height:6, borderRadius:3, background:'var(--line)', overflow:'hidden' }}>
                  <div style={{
                    height:'100%', borderRadius:3,
                    background: `linear-gradient(90deg, var(--iris), ${STATE_COLOR[node.state]})`,
                    width: node.mastery,
                    transition: 'width .4s var(--ease)',
                  }} />
                </div>
              )}

              {/* prerequisites */}
              {node.prereq.length > 0 && (
                <div>
                  <div style={{ fontSize:11, color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.08em', fontFamily:'var(--mono)', marginBottom:6 }}>
                    Prerequisites
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {node.prereq.map(pid => {
                      const pn = NODE_MAP[pid];
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => setSel(pid)}
                          style={{
                            background:'var(--panel-2)', border:'1px solid var(--line)',
                            borderRadius:'var(--r-pill)', padding:'4px 12px',
                            fontSize:12, color: STATE_COLOR[pn.state], cursor:'pointer',
                            fontFamily:'var(--body)',
                          }}
                        >
                          {pn.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* source citation */}
              <div style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5, borderTop:'1px solid var(--line)', paddingTop:10 }}>
                Source: HMI Kappasinian curriculum, Semester&nbsp;2 workbook.
              </div>

              {/* drill in lab button */}
              {node.state !== 'locked' && (
                <Link
                  href="/lab"
                  className="primary"
                  style={{ textAlign:'center', display:'block', textDecoration:'none' }}
                >
                  Drill in Lab
                </Link>
              )}
              {node.state === 'locked' && (
                <button
                  type="button"
                  className="primary"
                  disabled
                  style={{ textAlign:'center', display:'block', width:'100%' }}
                >
                  Locked &mdash; complete prerequisites
                </button>
              )}
            </div>
          )}

          {/* drill queue card */}
          <div style={{
            border:'1px solid var(--line)', borderRadius:'var(--r-lg)', background:'var(--panel)',
            padding:'18px 20px',
          }}>
            <div style={{
              fontFamily:'var(--mono)', fontSize:11, letterSpacing:'.12em', textTransform:'uppercase',
              color:'var(--amber)', marginBottom:12,
            }}>
              Drill queue &middot; rubric misses
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {DRILL_QUEUE.map((dq, i) => {
                const qn = NODE_MAP[dq.id];
                return (
                  <div key={dq.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'10px 12px', border:'1px solid var(--line)', borderRadius:'var(--r-md)',
                    background:'var(--panel-2)',
                  }}>
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:11, color:'var(--void)',
                      background:'var(--amber)', borderRadius:4, padding:'1px 6px', fontWeight:650,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.4 }}>{dq.label}</div>
                      <button
                        type="button"
                        onClick={() => setSel(dq.id)}
                        style={{
                          background:'none', border:'none', padding:0, cursor:'pointer',
                          fontFamily:'var(--mono)', fontSize:10, color: STATE_COLOR[qn.state],
                          letterSpacing:'.06em',
                        }}
                      >
                        {qn.short}
                      </button>
                    </div>
                    <Link
                      href="/lab"
                      style={{
                        fontFamily:'var(--mono)', fontSize:10, color:'var(--iris)',
                        letterSpacing:'.06em', textTransform:'uppercase',
                      }}
                    >
                      LAB
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* responsive override for smaller viewports */}
      <style>{`
        @media (max-width: 900px) {
          article > div:last-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </article>
  );
}
