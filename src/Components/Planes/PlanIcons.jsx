// Planes/PlanIcons.jsx
// Íconos SVG originales (sin librerías) para las tarjetas de plan.
// Familia visual común: grid 48, trazo 2px con caps/joins redondeados,
// degradado dorado, nodos de degradado y UN nodo "clave" en oro brillante
// con halo sutil como firma compartida. Cada instancia genera ids únicos
// para sus gradientes (useId) y así no colisionan al repetirse en página.
import { useId } from 'react';

const GOLD = '#f0b429';
const GOLD_BRIGHT = '#ffd166';
const STROKE = 2;

// Lienzo común: fija viewBox, paleta y deja el ícono escalar con `size`.
const IconFrame = ({ size, gid, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient id={gid} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={GOLD} />
        <stop offset="1" stopColor={GOLD_BRIGHT} />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

// Nodo clave en oro brillante con halo tenue — el detalle que une a la familia.
const Accent = ({ cx, cy }) => (
  <>
    <circle cx={cx} cy={cy} r="6" fill="none" stroke={GOLD_BRIGHT} strokeWidth={STROKE} opacity="0.2" />
    <circle cx={cx} cy={cy} r="3.5" fill={GOLD_BRIGHT} />
  </>
);

// Genera un id de gradiente estable y seguro para usar en url(#...).
const useGradId = () => `pg-${useId().replace(/:/g, '')}`;

/* ── Plan Básico ──────────────────────────────────────────────
   Primeros pasos sobre una base: una ruta ascendente con hitos
   que culmina en el nodo clave. Fundamentos + progreso inicial. */
export const PlanBasicIcon = ({ size = 40 }) => {
  const gid = useGradId();
  const s = `url(#${gid})`;
  return (
    <IconFrame size={size} gid={gid}>
      {/* base / fundamento */}
      <path d="M10 38 H38" stroke={s} strokeWidth={STROKE} strokeLinecap="round" opacity="0.5" />
      {/* ascenso con hitos */}
      <path d="M14 33 L24 27 L33 17" stroke={s} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="33" r="2.5" fill={s} />
      <circle cx="24" cy="27" r="2.5" fill={s} />
      <Accent cx={33} cy={17} />
    </IconFrame>
  );
};

/* ── Plan Profesional ─────────────────────────────────────────
   Medidor de rendimiento: dial + aguja apuntando a la lectura
   clave (oro). Optimización, eficiencia y rendimiento. */
export const PlanProIcon = ({ size = 40 }) => {
  const gid = useGradId();
  const s = `url(#${gid})`;
  return (
    <IconFrame size={size} gid={gid}>
      {/* dial */}
      <path d="M11 29 A13 13 0 0 1 37 29" stroke={s} strokeWidth={STROKE} strokeLinecap="round" />
      <circle cx="11" cy="29" r="2.5" fill={s} />
      <circle cx="37" cy="29" r="2.5" fill={s} />
      {/* eje + aguja */}
      <circle cx="24" cy="29" r="2" fill={s} />
      <path d="M24 29 L33 20" stroke={s} strokeWidth={STROKE} strokeLinecap="round" />
      <Accent cx={33} cy={20} />
    </IconFrame>
  );
};

/* ── Plan Empresarial ─────────────────────────────────────────
   Celda hexagonal con hub central y radios: infraestructura,
   ecosistema integrado y escala corporativa. */
export const PlanEnterpriseIcon = ({ size = 40 }) => {
  const gid = useGradId();
  const s = `url(#${gid})`;
  return (
    <IconFrame size={size} gid={gid}>
      {/* perímetro / infraestructura */}
      <path
        d="M24 11 L35.26 17.5 L35.26 30.5 L24 37 L12.74 30.5 L12.74 17.5 Z"
        stroke={s}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      {/* radios desde el hub */}
      <path d="M24 24 L24 11" stroke={s} strokeWidth={STROKE} strokeLinecap="round" opacity="0.9" />
      <path d="M24 24 L35.26 30.5" stroke={s} strokeWidth={STROKE} strokeLinecap="round" opacity="0.9" />
      <path d="M24 24 L12.74 30.5" stroke={s} strokeWidth={STROKE} strokeLinecap="round" opacity="0.9" />
      {/* nodos del ecosistema */}
      <circle cx="24" cy="11" r="2.5" fill={s} />
      <circle cx="35.26" cy="30.5" r="2.5" fill={s} />
      <circle cx="12.74" cy="30.5" r="2.5" fill={s} />
      {/* hub */}
      <Accent cx={24} cy={24} />
    </IconFrame>
  );
};
