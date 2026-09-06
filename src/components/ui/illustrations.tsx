/* Flat line-art illustration set — §05b of the redesign handoff.
   Black outline only, no fill/shading/gradient, uniform 2px stroke at a
   400px drawing width, loose and slightly imperfect. Exactly one lime
   accent fill is permitted per drawing, on a single small shape.
   Ship as inline SVG so stroke-width can stay non-scaling via CSS
   (see .ill-frame in index.css). Illustration is banned inside working
   screens — these eight slots are the only places it appears. */
import type { SVGProps } from 'react'

type Pose = {
  x: number
  y: number
  scale?: number
  armL?: number // left arm angle offset, degrees
  armR?: number
  wave?: boolean
}

/** One loose stick-ish figure: circle head, capsule torso, simple limbs. */
function Figure({ x, y, scale = 1, armL = 20, armR = -20, wave = false }: Pose) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* head */}
      <circle cx="0" cy="-58" r="14" />
      {/* torso */}
      <path d="M-11 -46 C -14 -20, -14 6, -10 26 M11 -46 C 14 -20, 14 6, 10 26" />
      <path d="M-11 -46 Q 0 -40 11 -46" />
      {/* legs */}
      <path d="M-10 26 L -16 58 M10 26 L 16 58" />
      {/* arms */}
      <path
        d={
          wave
            ? `M-11 -38 C -22 -46, -26 -60, -22 -70`
            : `M-11 -38 L ${-11 + 18 * Math.sin((armL * Math.PI) / 180)} ${-38 + 18 * Math.cos((armL * Math.PI) / 180)}`
        }
      />
      <path d={`M11 -38 L ${11 + 18 * Math.sin((armR * Math.PI) / 180)} ${-38 + 18 * Math.cos((armR * Math.PI) / 180)}`} />
    </g>
  )
}

/** Landing · "Is this for you?" — hero-scale group, 6-8 figures waving. */
export function IllCohort(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 560 240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <g strokeWidth="2.5">
        <Figure x={70} y={190} scale={1.15} wave />
        <Figure x={155} y={205} scale={0.95} armL={-30} armR={25} />
        <Figure x={235} y={185} scale={1.25} armL={30} wave />
        <Figure x={325} y={200} scale={1} armL={-20} armR={-30} />
        <Figure x={405} y={188} scale={1.15} armR={30} wave />
        <Figure x={485} y={202} scale={0.9} armL={25} armR={-15} />
      </g>
      <circle cx="405" cy="130" r="6" fill="var(--color-lime)" stroke="none" />
    </svg>
  )
}

/** Landing · blush panel — person at a laptop with a speech bubble of text. */
export function IllFeedback(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 560 200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <Figure x={150} y={190} scale={1.3} armL={40} armR={-10} />
      {/* laptop */}
      <path d="M195 150 h90 l8 26 h-106 z" />
      <path d="M205 150 v-38 h70 v38" />
      {/* speech bubble with marked-up lines */}
      <path d="M330 40 h190 a10 10 0 0 1 10 10 v70 a10 10 0 0 1 -10 10 h-140 l-25 22 v-22 h-25 a10 10 0 0 1 -10 -10 v-70 a10 10 0 0 1 10 -10 Z" />
      <path d="M352 68 h130 M352 90 h90" />
      <path d="M352 112 h60" stroke="var(--color-lime)" strokeWidth="4" />
    </svg>
  )
}

/** Landing · lime panel — two figures at a shared screen, one in a headset. */
export function IllMentor(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 560 200" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <Figure x={200} y={190} scale={1.3} armR={45} />
      <Figure x={340} y={190} scale={1.3} armL={-45} />
      {/* headset on right figure */}
      <path d="M366 78 a24 24 0 0 1 48 0" />
      <path d="M410 78 v14 a6 6 0 0 1 -6 6 h-4" />
      {/* shared monitor */}
      <rect x="230" y="70" width="100" height="66" rx="4" />
      <path d="M264 136 h32 v10 h-32 z" />
      <rect x="252" y="88" width="52" height="6" fill="var(--color-lime)" stroke="none" />
    </svg>
  )
}

/** Dashboard · track-complete card — figure holding a certificate scroll overhead. */
export function IllComplete(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 250 120" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <g transform="translate(125 108) scale(0.85)">
        <circle cx="0" cy="-58" r="14" />
        <path d="M-11 -46 C -14 -20, -14 6, -10 26 M11 -46 C 14 -20, 14 6, 10 26" />
        <path d="M-10 26 L -16 58 M10 26 L 16 58" />
        <path d="M-11 -40 C -20 -58, -18 -78, -8 -90" />
        <path d="M11 -40 C 20 -58, 18 -78, 8 -90" />
      </g>
      <rect x="105" y="8" width="40" height="14" rx="2" transform="rotate(-4 125 15)" />
      <path d="M112 8 v-4 M138 8 v-4" />
      <circle cx="140" cy="24" r="3" fill="var(--color-lime)" stroke="none" />
    </svg>
  )
}

/** Mentor queue · empty state — figure leaning back, empty tray on the desk. */
export function IllEmptyQueue(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 220 130" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <g transform="translate(120 118) scale(0.72) rotate(-6)">
        <circle cx="0" cy="-58" r="14" />
        <path d="M-11 -46 C -16 -20, -14 6, -8 24 M11 -46 C 16 -20, 16 6, 12 24" />
        <path d="M-8 24 L -14 58 M12 24 L 20 56" />
        <path d="M-11 -40 C -30 -46, -34 -30, -30 -14" />
        <path d="M11 -40 C 26 -50, 34 -42, 32 -28" />
      </g>
      <rect x="30" y="90" width="90" height="8" rx="2" />
      <rect x="42" y="72" width="50" height="16" rx="2" />
      <path d="M45 76 h44 M45 82 h30" opacity="0.5" />
    </svg>
  )
}

/** 404 / 500 — figure peering into an open, empty box. */
export function Ill404(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 400 240" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <Figure x={230} y={230} scale={1.5} armL={70} armR={-15} />
      <path d="M90 150 h130 l-14 60 h-102 z" />
      <path d="M90 150 l16 -22 h98 l16 22" />
      <path d="M155 128 v-8 M155 120 h20 M175 120 v8" opacity="0.5" />
      <circle cx="155" cy="180" r="5" fill="var(--color-lime)" stroke="none" />
    </svg>
  )
}

/** Signup · beside the card — single figure stepping through a doorway. */
export function IllSignup(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 320 320" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <path d="M110 290 V80 a70 70 0 0 1 100 0 V290" />
      <path d="M90 290 h140" />
      <g transform="translate(150 280) scale(1.5)">
        <circle cx="0" cy="-58" r="14" />
        <path d="M-11 -46 C -14 -20, -14 6, -10 26 M11 -46 C 14 -20, 14 6, 10 26" />
        <path d="M-10 26 L -18 58 M10 26 L 14 58" />
        <path d="M-11 -38 C -20 -30, -22 -18, -18 -6" />
        <path d="M11 -38 C 20 -30, 22 -18, 18 -6" />
      </g>
      <circle cx="200" cy="185" r="4" fill="var(--color-lime)" stroke="none" />
    </svg>
  )
}

/** Locked-week detail — figure at a closed door with a padlock. */
export function IllLocked(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 260 160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" {...props}>
      <rect x="150" y="20" width="70" height="128" rx="3" />
      <circle cx="205" cy="86" r="3" />
      <g transform="translate(95 148) scale(1.15)">
        <circle cx="0" cy="-58" r="14" />
        <path d="M-11 -46 C -14 -20, -14 6, -10 26 M11 -46 C 14 -20, 14 6, 10 26" />
        <path d="M-10 26 L -16 58 M10 26 L 16 58" />
        <path d="M-11 -38 L -26 -20" />
        <path d="M11 -38 C 20 -34, 24 -22, 20 -10" />
      </g>
      <g transform="translate(30 60)">
        <rect x="0" y="14" width="28" height="22" rx="4" />
        <path d="M6 14 v-8 a8 8 0 0 1 16 0 v8" />
        <circle cx="14" cy="25" r="2.5" fill="var(--color-lime)" stroke="none" />
      </g>
    </svg>
  )
}
