'use client';

import React, { useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// 3D POLYHEDRA GEOMETRY DATA
// ═══════════════════════════════════════════════════════════════

type Vec3 = [number, number, number];
type Face = number[];

interface Polyhedron {
  vertices: Vec3[];
  faces: Face[];
  faceLabels: number[];
}

function norm(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 1];
}

function scaleVec(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

// ── Tetrahedron (d4) ──
function makeD4(): Polyhedron {
  const vertices: Vec3[] = [
    [1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]
  ].map(v => scaleVec(norm(v as Vec3), 1.3));
  return {
    vertices,
    faces: [[0, 1, 2], [0, 2, 3], [0, 3, 1], [1, 3, 2]],
    faceLabels: [1, 2, 3, 4],
  };
}

// ── Cube (d6) ──
function makeD6(): Polyhedron {
  const s = 0.85;
  const vertices: Vec3[] = [
    [-s, -s, -s], [s, -s, -s], [s, s, -s], [-s, s, -s],
    [-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s],
  ];
  return {
    vertices,
    faces: [
      [0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7],
      [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0],
    ],
    faceLabels: [1, 6, 2, 5, 3, 4],
  };
}

// ── Octahedron (d8) ──
function makeD8(): Polyhedron {
  const vertices: Vec3[] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  return {
    vertices,
    faces: [
      [0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4],
      [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5],
    ],
    faceLabels: [1, 2, 3, 4, 5, 6, 7, 8],
  };
}

// ── Pentagonal Trapezohedron (d10) ──
function makeD10(): Polyhedron {
  const vertices: Vec3[] = [];
  const a = (Math.PI * 2) / 10;
  vertices.push([0, 1.2, 0]);
  vertices.push([0, -1.2, 0]);
  for (let i = 0; i < 10; i++) {
    const angle = a * i;
    const h = i % 2 === 0 ? 0.3 : -0.3;
    vertices.push([Math.cos(angle) * 0.95, h, Math.sin(angle) * 0.95]);
  }
  const faces: Face[] = [];
  for (let i = 0; i < 10; i++) {
    const v0 = 2 + i;
    const v1 = 2 + ((i + 1) % 10);
    if (i % 2 === 0) faces.push([0, v0, v1]);
    else faces.push([1, v1, v0]);
  }
  for (let i = 0; i < 10; i += 2) {
    faces.push([2 + i, 2 + ((i + 1) % 10), 2 + ((i + 2) % 10)]);
  }
  return { vertices: vertices as Vec3[], faces: faces.slice(0, 10), faceLabels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] };
}

// ── Dodecahedron (d12) ──
function makeD12(): Polyhedron {
  const phi = (1 + Math.sqrt(5)) / 2;
  const a = 1 / phi;
  const raw: Vec3[] = [
    [1, 1, 1], [1, 1, -1], [1, -1, 1], [1, -1, -1],
    [-1, 1, 1], [-1, 1, -1], [-1, -1, 1], [-1, -1, -1],
    [0, a, phi], [0, a, -phi], [0, -a, phi], [0, -a, -phi],
    [a, phi, 0], [a, -phi, 0], [-a, phi, 0], [-a, -phi, 0],
    [phi, 0, a], [phi, 0, -a], [-phi, 0, a], [-phi, 0, -a],
  ];
  const vertices = raw.map(v => norm(v));
  const faces: Face[] = [
    [0, 16, 2, 10, 8], [12, 0, 8, 4, 14], [16, 0, 12, 1, 17],
    [8, 10, 6, 18, 4], [2, 16, 17, 3, 13], [14, 4, 18, 19, 5],
    [10, 2, 13, 15, 6], [12, 14, 5, 9, 1], [17, 1, 9, 11, 3],
    [6, 15, 7, 19, 18], [3, 11, 7, 15, 13], [5, 19, 7, 11, 9],
  ];
  return { vertices, faces, faceLabels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] };
}

// ── Icosahedron (d20) ──
function makeD20(): Polyhedron {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const vertices = raw.map(v => norm(v));
  const faces: Face[] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  return { vertices, faces, faceLabels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] };
}

const POLYHEDRA: Record<number, Polyhedron> = {
  4: makeD4(), 6: makeD6(), 8: makeD8(), 10: makeD10(),
  12: makeD12(), 20: makeD20(), 100: makeD10(),
};

// ═══════════════════════════════════════════════════════════════
// 3D MATH
// ═══════════════════════════════════════════════════════════════

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c];
}
function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}
function rotateZ(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
}
function rotateVertex(v: Vec3, rx: number, ry: number, rz: number): Vec3 {
  return rotateZ(rotateY(rotateX(v, rx), ry), rz);
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function getFaceNormal(verts: Vec3[], face: Face): Vec3 {
  const a = verts[face[0]], b = verts[face[1]], c = verts[face[2]];
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = cross(ab, ac);
  const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
  return len > 0 ? [n[0] / len, n[1] / len, n[2] / len] : [0, 0, 1];
}

function getFaceCenter(verts: Vec3[], face: Face): Vec3 {
  let cx = 0, cy = 0, cz = 0;
  for (const idx of face) { cx += verts[idx][0]; cy += verts[idx][1]; cz += verts[idx][2]; }
  const n = face.length;
  return [cx / n, cy / n, cz / n];
}

// ═══════════════════════════════════════════════════════════════
// DIE COLORS
// ═══════════════════════════════════════════════════════════════

const DIE_COLORS: Record<number, { light: string; dark: string; text: string }> = {
  4:   { light: '#ef4444', dark: '#991b1b', text: '#ffffff' },
  6:   { light: '#3b82f6', dark: '#1e3a8a', text: '#ffffff' },
  8:   { light: '#22c55e', dark: '#14532d', text: '#ffffff' },
  10:  { light: '#a855f7', dark: '#581c87', text: '#ffffff' },
  12:  { light: '#eab308', dark: '#713f12', text: '#ffffff' },
  20:  { light: '#d946ef', dark: '#701a75', text: '#ffffff' },
  100: { light: '#6b7280', dark: '#1f2937', text: '#ffffff' },
};

// ═══════════════════════════════════════════════════════════════
// RENDER A SINGLE DIE
// ═══════════════════════════════════════════════════════════════

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function lerpColor(darkHex: string, lightHex: string, t: number): [number, number, number] {
  const d = hexToRGB(darkHex), l = hexToRGB(lightHex);
  return [
    Math.round(d[0] + (l[0] - d[0]) * t),
    Math.round(d[1] + (l[1] - d[1]) * t),
    Math.round(d[2] + (l[2] - d[2]) * t),
  ];
}

function renderDie(
  ctx: CanvasRenderingContext2D,
  faces: number,
  value: number,
  rotation: Vec3,
  centerX: number,
  centerY: number,
  dieSize: number,
  opacity: number = 1,
  dimmed: boolean = false,
) {
  const poly = POLYHEDRA[faces] || POLYHEDRA[20];
  const colors = DIE_COLORS[faces] || DIE_COLORS[20];
  const perspScale = 1.15;
  const light: Vec3 = norm([-0.4, -0.6, 1]);

  const rotatedVerts = poly.vertices.map(v => rotateVertex(v, rotation[0], rotation[1], rotation[2]));

  const faceData = poly.faces.map((face, i) => {
    const normal = getFaceNormal(rotatedVerts, face);
    const center = getFaceCenter(rotatedVerts, face);
    const pFac = (v: Vec3) => perspScale / (perspScale + v[2] * 0.15);

    const projected = face.map(idx => {
      const v = rotatedVerts[idx];
      const f = pFac(v);
      return [centerX + v[0] * dieSize * f, centerY + v[1] * dieSize * f] as [number, number];
    });
    const cf = pFac(center);

    return {
      face, normal, center, projected,
      projCenterX: centerX + center[0] * dieSize * cf,
      projCenterY: centerY + center[1] * dieSize * cf,
      depth: center[2],
      label: poly.faceLabels[i],
      brightness: Math.max(0, dot(normal, light)),
    };
  });

  // Painter's algorithm — back to front
  faceData.sort((a, b) => a.depth - b.depth);

  ctx.save();
  ctx.globalAlpha = opacity * (dimmed ? 0.35 : 1);

  for (const fd of faceData) {
    // Skip back-facing
    if (fd.normal[2] < -0.05) continue;

    const brightness = fd.brightness;
    const [r, g, b] = lerpColor(colors.dark, colors.light, brightness);

    // Draw face polygon
    ctx.beginPath();
    ctx.moveTo(fd.projected[0][0], fd.projected[0][1]);
    for (let j = 1; j < fd.projected.length; j++) {
      ctx.lineTo(fd.projected[j][0], fd.projected[j][1]);
    }
    ctx.closePath();

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fill();

    // Edge
    ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 + brightness * 0.2})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Specular
    if (brightness > 0.55) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(brightness - 0.55) * 0.6})`;
      ctx.fill();
    }

    // ── Draw number on EVERY front-facing face ──
    // Each face shows its own label number. The top face (highest z normal)
    // will naturally be the most visible one.
    if (fd.normal[2] > 0.1) {
      const faceNum = fd.label;
      const displayNum = faces === 100
        ? (faceNum === 0 ? '00' : String(faceNum * 10).padStart(2, '0'))
        : String(faceNum);

      // Scale font by face apparent size (foreshortened faces get smaller text)
      const faceScale = Math.max(0.3, fd.normal[2]);
      const baseFontSize = dieSize * (faces <= 6 ? 0.45 : faces <= 10 ? 0.35 : faces <= 12 ? 0.28 : 0.3);
      const fontSize = baseFontSize * faceScale;

      if (fontSize > 5) { // Don't draw tiny unreadable text
        ctx.save();

        // Transform text to lie on the face plane for 3D effect
        // We compute the face's local X and Y axes projected onto screen
        const p0 = fd.projected[0];
        const p1 = fd.projected[1];
        const pLast = fd.projected[fd.projected.length - 1];

        // Face X axis (edge 0→1), Y axis (edge 0→last)
        const edgeX = [p1[0] - p0[0], p1[1] - p0[1]];
        const edgeY = [pLast[0] - p0[0], pLast[1] - p0[1]];

        // Compute an approximate rotation angle from the face edges
        const angle = Math.atan2(
          (edgeX[1] + edgeY[0]) * 0.5,
          (edgeX[0] - edgeY[1]) * 0.5
        ) * 0.3; // subtle tilt, not full rotation — keeps readable

        ctx.translate(fd.projCenterX, fd.projCenterY);
        ctx.rotate(angle);

        // Squash text vertically based on face tilt for perspective
        const ySquash = 0.5 + fd.normal[2] * 0.5; // 0.6-1.0 range
        ctx.scale(1, ySquash);

        ctx.font = `bold ${fontSize}px 'Cinzel', 'Georgia', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${0.4 * fd.normal[2]})`;
        ctx.fillText(displayNum, 0.8, 0.8);

        // Text
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.7 * fd.normal[2]})`;
        ctx.fillText(displayNum, 0, 0);

        // Underline 6 and 9 to distinguish
        if (faceNum === 6 || faceNum === 9) {
          const uw = fontSize * 0.35;
          ctx.beginPath();
          ctx.moveTo(-uw / 2, fontSize * 0.42);
          ctx.lineTo(uw / 2, fontSize * 0.42);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + 0.7 * fd.normal[2]})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// SETTLED ROTATION — compute Euler angles so result face points at viewer
// ═══════════════════════════════════════════════════════════════

function getSettledRotation(faces: number, value: number, extraRz: number = 0): Vec3 {
  const poly = POLYHEDRA[faces] || POLYHEDRA[20];
  // Find face whose label matches the rolled value
  let faceIdx = poly.faceLabels.indexOf(value);
  if (faceIdx === -1) {
    // For d100, value is 0-9 representing tens digit
    faceIdx = poly.faceLabels.indexOf(value % 10);
  }
  if (faceIdx === -1) faceIdx = 0;

  // Get face normal in the unrotated polyhedron
  const faceVerts = poly.faces[faceIdx];
  const normal = getFaceNormal(poly.vertices, faceVerts);
  const [nx, ny, nz] = normal;

  // Compute Euler angles (X then Y then Z) to rotate this normal to [0, 0, 1]
  // After Rx: normal_y becomes 0, normal_z becomes sqrt(ny² + nz²)
  const rx = Math.atan2(ny, nz);
  // After Ry: normal_x becomes 0, normal_z becomes 1
  const d = Math.sqrt(ny * ny + nz * nz);
  const ry = Math.atan2(-nx, d);
  // Rz is free — add a random twist so dice don't all face the same way
  return [rx, ry, extraRz];
}

// ═══════════════════════════════════════════════════════════════
// EXPORTED TYPES AND COMPONENT
// ═══════════════════════════════════════════════════════════════

export interface DieConfig {
  faces: number;
  value: number;
  dimmed?: boolean;
}

export interface DiePosition {
  x: number;       // 0-1 start x (fraction of viewport)
  y: number;       // 0-1 start y
  targetX: number;  // 0-1 end x (where the die lands)
  targetY: number;  // 0-1 end y
  spinSpeed: Vec3;
  bounceHeight: number; // pixels of bounce arc
  settleRz: number;     // random z-rotation for settled state
}

interface DiceCanvasProps {
  dice: DieConfig[];
  positions: DiePosition[];
  rolling: boolean;
  settled: boolean;
  width: number;
  height: number;
}

export function DiceCanvas({ dice, positions, rolling, settled, width, height }: DiceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, [dice]);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width * dpr;
    const h = height * dpr;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Die size — pixel radius. dieSize=55 → die is ~143px across at 1080p
    const dieSize = Math.max(40, Math.min(60, height * 0.065));

    // ── Animation timing ──
    // Phase 1: Throw arc (0 → throwEnd) — die flies from hand to table
    // Phase 2: First bounce (throwEnd → bounce1End)
    // Phase 3: Second bounce (bounce1End → bounce2End)
    // Phase 4: Settle wobble (bounce2End → settleEnd) — rotation eases to result face
    const throwEnd = 0.55;
    const bounce1End = 0.85;
    const bounce2End = 1.05;
    const settleEnd = 1.35;

    const elapsed = (time - startTimeRef.current) / 1000;

    for (let i = 0; i < dice.length; i++) {
      const die = dice[i];
      const pos = positions[i];
      if (!pos) continue;

      // Stagger each die slightly so they don't all move in lockstep
      const stagger = i * 0.06;
      const t = Math.max(0, elapsed - stagger);
      const spins = pos.spinSpeed;

      // Compute the target settled rotation for this die's result
      const settledRot = getSettledRotation(die.faces, die.value, pos.settleRz);

      let cx: number, cy: number;
      let rx: number, ry: number, rz: number;
      let airHeight = 0; // how high above ground (for shadow)

      // Start and target in pixels
      const sx = pos.x * width;
      const sy = pos.y * height;
      const tx = pos.targetX * width;
      const ty = pos.targetY * height;

      if ((rolling && !settled) || (!rolling && !settled && t === 0)) {
        if (t < throwEnd) {
          // ── Phase 1: Main throw arc ──
          const p = t / throwEnd; // 0→1
          const easeP = 1 - Math.pow(1 - p, 2); // ease-out for lateral
          cx = sx + (tx - sx) * easeP;
          // Gravity arc: parabolic, peaks around 40% through the throw
          const arcHeight = pos.bounceHeight * 1.2;
          const arcP = p;
          airHeight = arcHeight * 4 * arcP * (1 - arcP); // parabola: 0 at start/end, peak at 0.5
          // Y: lerp from start to target, minus air height
          cy = sy + (ty - sy) * easeP - airHeight;

          // Fast tumbling — accumulate rotation
          rx = spins[0] * t * 3.5;
          ry = spins[1] * t * 3.5;
          rz = spins[2] * t * 2.0;

        } else if (t < bounce1End) {
          // ── Phase 2: First bounce — 35% height ──
          const p = (t - throwEnd) / (bounce1End - throwEnd);
          cx = tx + (tx - sx) * 0.04 * (1 - p); // tiny drift
          const bounceH = pos.bounceHeight * 0.35;
          airHeight = bounceH * 4 * p * (1 - p);
          cy = ty - airHeight;

          // Decelerating spin, blending toward settled rotation
          const blend = p * 0.3;
          const decay = 1 - p * 0.6;
          rx = spins[0] * t * decay * 1.5 * (1 - blend) + settledRot[0] * blend;
          ry = spins[1] * t * decay * 1.5 * (1 - blend) + settledRot[1] * blend;
          rz = spins[2] * t * decay * 0.8 * (1 - blend) + settledRot[2] * blend;

        } else if (t < bounce2End) {
          // ── Phase 3: Second bounce — 10% height ──
          const p = (t - bounce1End) / (bounce2End - bounce1End);
          cx = tx;
          const bounceH = pos.bounceHeight * 0.1;
          airHeight = bounceH * 4 * p * (1 - p);
          cy = ty - airHeight;

          // Mostly settled rotation with residual wobble
          const blend = 0.3 + p * 0.5; // 0.3→0.8
          const decay = 1 - p * 0.8;
          rx = spins[0] * t * decay * 0.5 * (1 - blend) + settledRot[0] * blend;
          ry = spins[1] * t * decay * 0.5 * (1 - blend) + settledRot[1] * blend;
          rz = spins[2] * t * decay * 0.3 * (1 - blend) + settledRot[2] * blend;

        } else if (t < settleEnd) {
          // ── Phase 4: Final settle — ease into exact result rotation ──
          const p = (t - bounce2End) / (settleEnd - bounce2End);
          const easeP = p * p * (3 - 2 * p); // smoothstep
          cx = tx;
          cy = ty;
          airHeight = 0;

          // Blend from residual spin to exact settled rotation
          const wobbleDecay = Math.cos(p * Math.PI * 3) * (1 - p) * 0.08;
          rx = settledRot[0] + wobbleDecay;
          ry = settledRot[1] + wobbleDecay * 0.7;
          rz = settledRot[2];

        } else {
          // ── Fully stopped ──
          cx = tx;
          cy = ty;
          airHeight = 0;
          rx = settledRot[0];
          ry = settledRot[1];
          rz = settledRot[2];
        }
      } else {
        // Settled or not yet rolling — show result face
        cx = tx;
        cy = ty;
        airHeight = 0;
        rx = settledRot[0];
        ry = settledRot[1];
        rz = settledRot[2];
      }

      // ── Shadow on "ground" ──
      const shadowSpread = 1 + airHeight * 0.004;
      const shadowAlpha = Math.max(0.05, 0.25 / shadowSpread);
      ctx.save();
      ctx.beginPath();
      const shadowW = dieSize * 0.55 * shadowSpread;
      const groundY = ty + dieSize * 0.6;
      ctx.ellipse(tx, groundY, shadowW, shadowW * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.fill();
      ctx.restore();

      renderDie(ctx, die.faces, die.value, [rx, ry, rz], cx, cy, dieSize, 1, die.dimmed || false);
    }

    // Keep animating while rolling
    if (rolling && !settled) {
      // Check if ALL dice have finished (accounting for stagger)
      const maxStagger = (dice.length - 1) * 0.06;
      if (elapsed < settleEnd + maxStagger + 0.05) {
        animRef.current = requestAnimationFrame(render);
      }
    }
  }, [dice, positions, rolling, settled, width, height]);

  useEffect(() => {
    if (rolling || settled) {
      startTimeRef.current = performance.now();
      animRef.current = requestAnimationFrame(render);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [rolling, settled, render]);

  useEffect(() => {
    if (settled) {
      requestAnimationFrame(render);
    }
  }, [settled, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, position: 'absolute', top: 0, left: 0 }}
    />
  );
}
