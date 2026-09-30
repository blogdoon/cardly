/**
 * Deterministic front-cover artwork generator.
 *
 * Card covers used to be a mix of ~60 bundled photos and a procedural SVG
 * generator. The bundled art has since been deleted (see git status) and the
 * catalog is populated through the admin studio, so covers are needed again.
 *
 * This produces vector covers from a seed: given the same occasion/style it
 * always yields the same artwork, which means a card's cover is stable across
 * reloads, reprints and the printer. SVG rather than raster so it stays crisp at
 * print resolution and costs nothing to store.
 */

export type CoverArtStyle =
  | 'botanical'
  | 'art-deco'
  | 'confetti'
  | 'terrazzo'
  | 'waves'
  | 'bloom';

/** Palettes chosen to read as premium stationery, not clip art. */
const PALETTES: Record<string, { bg: string; ink: string; accents: string[] }> = {
  blush: { bg: '#fdf2f4', ink: '#881337', accents: ['#f9a8b8', '#fbcfe8', '#be123c'] },
  sage: { bg: '#f4f7f2', ink: '#365314', accents: ['#a3b18a', '#d9e4c8', '#4d7c0f'] },
  ivory: { bg: '#faf8f5', ink: '#44403c', accents: ['#d6c7a1', '#a88b5c', '#292524'] },
  dusk: { bg: '#eef2ff', ink: '#312e81', accents: ['#a5b4fc', '#c7d2fe', '#4338ca'] },
  ember: { bg: '#fff7ed', ink: '#7c2d12', accents: ['#fdba74', '#fed7aa', '#c2410c'] },
};

const SEEDED = (seed: number) => {
  // mulberry32 — small, fast, deterministic.
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Build the cover SVG. No <text> — the customer writes their own wording. */
export function generateCoverSvg(input: {
  id: string;
  style: CoverArtStyle;
  palette?: keyof typeof PALETTES | string;
}): string {
  const palette =
    PALETTES[input.palette as string] ??
    PALETTES[Object.keys(PALETTES)[hash(input.id) % Object.keys(PALETTES).length]];
  const rnd = SEEDED(hash(`${input.id}:${input.style}`));
  const pick = <T,>(list: T[]): T => list[Math.floor(rnd() * list.length)];

  const body = {
    botanical: () => {
      const parts: string[] = [];
      // A stem with leaves sweeping up the left margin.
      const stemX = 70 + rnd() * 40;
      parts.push(
        `<path d="M${stemX} 560 C ${stemX - 30} 400, ${stemX + 40} 300, ${stemX} 120" fill="none" stroke="${palette.ink}" stroke-width="3" opacity="0.75"/>`
      );
      for (let i = 0; i < 11; i++) {
        const t = i / 10;
        const y = 540 - t * 400;
        const side = i % 2 === 0 ? 1 : -1;
        const len = 46 + rnd() * 54;
        const x = stemX + side * (18 + rnd() * 20);
        parts.push(
          `<path d="M${x} ${y} q ${side * len * 0.6} ${-len * 0.5}, ${side * len} ${-len * 0.15} q ${-side * len * 0.55} ${len * 0.3}, ${-side * len} ${len * 0.15} Z" fill="${pick(palette.accents)}" opacity="${(0.55 + rnd() * 0.35).toFixed(2)}"/>`
        );
      }
      // A few blossoms.
      for (let i = 0; i < 5; i++) {
        const cx = stemX + (rnd() - 0.5) * 130;
        const cy = 140 + rnd() * 380;
        const r = 13 + rnd() * 12;
        const petals = 5 + Math.floor(rnd() * 3);
        const flower = Array.from({ length: petals }, (_, p) => {
          const a = (p / petals) * Math.PI * 2;
          return `<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${(r * 0.62).toFixed(1)}" fill="${palette.accents[0]}" opacity="0.8"/>`;
        }).join('');
        parts.push(`${flower}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r * 0.42).toFixed(1)}" fill="${palette.ink}" opacity="0.85"/>`);
      }
      return parts.join('');
    },

    'art-deco': () => {
      const parts: string[] = [];
      const cx = 200;
      const cy = 290;
      // Concentric rings alternating between a many-pointed star and a circle,
      // which is what makes the motif read as art deco rather than a target.
      for (let ring = 0; ring < 5; ring++) {
        const r = 62 + ring * 36;
        if (ring % 2 === 0) {
          const spokes = 8 + ring * 2;
          // `points` takes bare coordinate pairs separated by whitespace. Joining
          // with a path command ("L") silently invalidates the polygon and the
          // browser drops it without warning.
          const points = Array.from({ length: spokes }, (_, s) => {
            const a = (s / spokes) * Math.PI * 2 - Math.PI / 2;
            const a2 = a + Math.PI / spokes;
            return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} ${(cx + Math.cos(a2) * r).toFixed(1)},${(cy + Math.sin(a2) * r).toFixed(1)}`;
          }).join(' ');
          parts.push(
            `<polygon points="${points}" fill="none" stroke="${palette.ink}" stroke-width="${(2.2 - ring * 0.3).toFixed(1)}" opacity="${(0.85 - ring * 0.1).toFixed(2)}"/>`
          );
        } else {
          parts.push(
            `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${palette.ink}" stroke-width="1.2" opacity="0.5"/>`
          );
        }
      }
      // Radiating hairlines, which give the motif its sunburst structure.
      const rays = Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const r0 = 30;
        const r1 = 214;
        return `<line x1="${(cx + Math.cos(a) * r0).toFixed(1)}" y1="${(cy + Math.sin(a) * r0).toFixed(1)}" x2="${(cx + Math.cos(a) * r1).toFixed(1)}" y2="${(cy + Math.sin(a) * r1).toFixed(1)}" stroke="${palette.ink}" stroke-width="0.6" opacity="0.22"/>`;
      }).join('');
      parts.push(rays);
      parts.push(
        `<circle cx="${cx}" cy="${cy}" r="26" fill="${palette.ink}"/><circle cx="${cx}" cy="${cy}" r="13" fill="${palette.bg}"/>`
      );
      // Deco corner fans, inset so they read as a deliberate corner motif
      // rather than as lines running off the trim edge.
      const inset = 18;
      for (const [ox, oy, flipX, flipY] of [
        [inset, inset, 1, 1],
        [400 - inset, inset, -1, 1],
        [inset, 580 - inset, 1, -1],
        [400 - inset, 580 - inset, -1, -1],
      ] as const) {
        const fan = Array.from({ length: 7 }, (_, i) => {
          const a = (i / 6) * (Math.PI / 2);
          return `<line x1="${ox}" y1="${oy}" x2="${(ox + Math.cos(a) * 46 * flipX).toFixed(1)}" y2="${(oy + Math.sin(a) * 46 * flipY).toFixed(1)}" stroke="${palette.ink}" stroke-width="1.4" opacity="0.55"/>`;
        }).join('');
        parts.push(fan);
      }
      return parts.join('');
    },

    confetti: () => {
      const parts: string[] = [];
      for (let i = 0; i < 90; i++) {
        const x = rnd() * 400;
        const y = rnd() * 580;
        const w = 6 + rnd() * 12;
        const h = w * (0.4 + rnd() * 1.6);
        const rot = Math.floor(rnd() * 360);
        const fill = pick(palette.accents);
        const shape = rnd();
        if (shape < 0.45) {
          parts.push(
            `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(w / 2.2).toFixed(1)}" fill="${fill}" opacity="${(0.4 + rnd() * 0.5).toFixed(2)}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`
          );
        } else if (shape < 0.75) {
          parts.push(
            `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(w / 2).toFixed(1)}" fill="${fill}" opacity="${(0.35 + rnd() * 0.45).toFixed(2)}"/>`
          );
        } else {
          // Thin streamer.
          parts.push(
            `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q ${(rnd() * 30 - 15).toFixed(1)} ${(10 + rnd() * 26).toFixed(1)} ${(rnd() * 24 - 12).toFixed(1)} ${(20 + rnd() * 40).toFixed(1)}" fill="none" stroke="${fill}" stroke-width="${(1 + rnd() * 2).toFixed(1)}" opacity="${(0.4 + rnd() * 0.4).toFixed(2)}"/>`
          );
        }
      }
      return parts.join('');
    },

    terrazzo: () => {
      const parts: string[] = [];
      for (let i = 0; i < 150; i++) {
        const x = rnd() * 400;
        const y = rnd() * 580;
        const r = 3 + rnd() * 11;
        const fill = pick(palette.accents);
        const sides = 3 + Math.floor(rnd() * 4);
        const pts = Array.from({ length: sides }, (_, s) => {
          const a = (s / sides) * Math.PI * 2 + rnd() * 0.5;
          const rr = r * (0.6 + rnd() * 0.6);
          return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
        }).join(' ');
        parts.push(
          `<polygon points="${pts}" fill="${fill}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`
        );
      }
      return parts.join('');
    },

    waves: () => {
      const parts: string[] = [];
      for (let band = 0; band < 7; band++) {
        const baseY = 90 + band * 66;
        const amp = 16 + rnd() * 26;
        const phase = rnd() * 6.28;
        const d = Array.from({ length: 5 }, (_, i) => {
          const x = i * 100;
          const y = baseY + Math.sin(phase + i * 0.9) * amp;
          return `L ${x} ${y.toFixed(1)}`;
        }).join(' ');
        parts.push(
          `<path d="M0 ${baseY} ${d} L 400 580 L 0 580 Z" fill="${band % 2 ? palette.accents[band % palette.accents.length] : palette.ink}" opacity="${(0.10 + rnd() * 0.14).toFixed(2)}"/>`
        );
      }
      // A thin foil rule.
      parts.push(
        `<rect x="40" y="272" width="320" height="2.5" fill="${palette.ink}" opacity="0.5"/><rect x="150" y="300" width="100" height="1.5" fill="${palette.ink}" opacity="0.35"/>`
      );
      return parts.join('');
    },

    bloom: () => {
      const parts: string[] = [];
      for (let i = 0; i < 26; i++) {
        const cx = rnd() * 400;
        const cy = rnd() * 580;
        const petals = 4 + Math.floor(rnd() * 5);
        const size = 16 + rnd() * 40;
        const fill = pick(palette.accents);
        const rot = rnd() * 360;
        const flower = Array.from({ length: petals }, (_, p) => {
          const a = (p / petals) * Math.PI * 2;
          return `<ellipse cx="${(Math.cos(a) * size * 0.6).toFixed(1)}" cy="${(Math.sin(a) * size * 0.6).toFixed(1)}" rx="${(size * 0.58).toFixed(1)}" ry="${(size * 0.3).toFixed(1)}" fill="${fill}" opacity="${(0.3 + rnd() * 0.4).toFixed(2)}"/>`;
        }).join('');
        parts.push(
          `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rot.toFixed(0)})">${flower}</g>`
        );
      }
      return parts.join('');
    },
  }[input.style]();

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 580" width="400" height="580" role="img">
  <rect width="400" height="580" fill="${palette.bg}"/>
  ${body}
</svg>`;
}

/** A data URL, ready to drop into a template's thumbnail or front background. */
export const generateCoverDataUrl = (input: Parameters<typeof generateCoverSvg>[0]): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(generateCoverSvg(input))}`;
