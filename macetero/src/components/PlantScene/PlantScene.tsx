import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import type { PlantStatus } from '../../types/telemetry';
import { clamp } from '../../utils/math';
import { prefersReducedMotion } from '../../utils/motion';
import styles from './PlantScene.module.css';

interface PlantSceneProps {
  status: PlantStatus;
  /** Humedad del suelo en %, controla el nivel de agua dentro de la maceta */
  moisture: number | null;
}

type Animation = ReturnType<typeof animate>;

// Hojas: se dibujan apuntando hacia arriba y el <g> exterior las inclina.
// `side` indica hacia qué lado se caen cuando la planta tiene sed.
const LEAVES = [
  { x: 100, y: 118, angle: -58, scale: 1, side: -1 },
  { x: 100, y: 118, angle: 58, scale: 1, side: 1 },
  { x: 100, y: 96, angle: -34, scale: 0.8, side: -1 },
  { x: 100, y: 96, angle: 34, scale: 0.8, side: 1 },
  { x: 100, y: 74, angle: 0, scale: 0.7, side: 1 },
] as const;

const DROP_X = [46, 72, 98, 124, 150, 85, 137] as const;
const SPARKS = [
  { x: 52, y: 104 },
  { x: 152, y: 92 },
  { x: 70, y: 62 },
  { x: 132, y: 64 },
  { x: 40, y: 134 },
  { x: 162, y: 124 },
] as const;

export function PlantScene({ status, moisture }: PlantSceneProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  // Animaciones en bucle según el estado de la planta
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const q = (name: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-anim="${name}"]`));
    const thirsty = status === 'watering';
    const calm = status === 'loading' || status === 'offline';
    const anims: Animation[] = [];

    // Resplandor de fondo que "respira"
    anims.push(
      animate(q('glow'), {
        scale: [0.92, 1.08],
        opacity: [0.55, 1],
        duration: thirsty ? 1400 : 2800,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }),
    );

    // Toda la planta se balancea
    anims.push(
      animate(q('sway'), {
        rotate: thirsty ? [-1, 1] : [-2.5, 2.5],
        duration: calm ? 5200 : thirsty ? 4200 : 3000,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
      }),
    );

    // Hojas: primero se acomodan a su postura (erguidas o caídas) y luego oscilan
    q('leaf').forEach((leaf, i) => {
      const side = Number(leaf.dataset.side ?? 0);
      const base = thirsty ? side * 38 : 0;
      const amp = thirsty ? 1 : calm ? 2 : 4.5;

      anims.push(
        animate(leaf, {
          rotate: base - amp,
          duration: 800,
          delay: i * 90,
          ease: 'outQuad',
          onComplete: () => {
            anims.push(
              animate(leaf, {
                rotate: [base - amp, base + amp],
                duration: thirsty ? 3600 : 2200,
                ease: 'inOutSine',
                loop: true,
                alternate: true,
              }),
            );
          },
        }),
      );
    });

    // Gotas cayendo mientras la bomba riega
    const drops = q('drop');
    if (thirsty) {
      anims.push(
        animate(drops, {
          translateY: [0, 118],
          opacity: [{ to: 1, duration: 180 }, { to: 0, duration: 620 }],
          duration: 800,
          delay: stagger(170),
          ease: 'inQuad',
          loop: true,
        }),
      );
    }

    // Partículas de energía cuando todo está bien
    const sparks = q('spark');
    if (status === 'healthy') {
      anims.push(
        animate(sparks, {
          translateY: [0, -44],
          opacity: [{ to: 0.95, duration: 500 }, { to: 0, duration: 1100 }],
          duration: 1600,
          delay: stagger(320),
          ease: 'outSine',
          loop: true,
        }),
      );
    }

    return () => {
      anims.forEach((a) => a.pause());
      [...drops, ...sparks].forEach((el) => {
        el.style.opacity = '0';
      });
    };
  }, [status]);

  // Nivel de agua dentro de la maceta
  useEffect(() => {
    const el = rootRef.current?.querySelector<SVGElement>('[data-anim="moisture"]');
    if (!el) return;

    const target = moisture === null ? 0 : clamp(moisture, 0, 100) / 100;
    if (prefersReducedMotion()) {
      el.style.transform = `scaleY(${target})`;
      return;
    }

    const anim = animate(el, { scaleY: target, duration: 1000, ease: 'outCubic' });
    return () => {
      anim.pause();
    };
  }, [moisture]);

  return (
    <svg
      ref={rootRef}
      className={styles.scene}
      data-status={status}
      viewBox="0 0 200 220"
      role="img"
      aria-label="Ilustración animada del macetero"
    >
      <defs>
        <radialGradient id="plant-glow">
          <stop className={styles.glowStop} offset="0%" style={{ stopOpacity: 1 }} />
          <stop className={styles.glowStop} offset="100%" style={{ stopOpacity: 0 }} />
        </radialGradient>
        <clipPath id="pot-cavity">
          <path d="M64 160 L136 160 L128.5 203 Q127.5 207 123.5 207 L76.5 207 Q72.5 207 71.5 203 Z" />
        </clipPath>
      </defs>

      <circle data-anim="glow" className={styles.glow} cx="100" cy="104" r="88" fill="url(#plant-glow)" />
      <ellipse cx="100" cy="213" rx="46" ry="5" fill="rgba(0,0,0,0.3)" />

      {/* Maceta: la cavidad funciona como medidor de humedad */}
      <path className={styles.pot} d="M62 158 L138 158 L129 204 Q128 209 123 209 L77 209 Q72 209 71 204 Z" />
      <path className={styles.cavity} d="M64 160 L136 160 L128.5 203 Q127.5 207 123.5 207 L76.5 207 Q72.5 207 71.5 203 Z" />
      <g clipPath="url(#pot-cavity)">
        <rect
          data-anim="moisture"
          className={styles.moisture}
          x="60"
          y="160"
          width="80"
          height="48"
          style={{ transform: 'scaleY(0)' }}
        />
      </g>
      <rect className={styles.rim} x="55" y="148" width="90" height="13" rx="5" />
      <ellipse className={styles.soil} cx="100" cy="150" rx="38" ry="5" />

      {/* Planta */}
      <g data-anim="sway" className={styles.sway}>
        <path className={styles.stem} d="M100 150 C 100 124, 100 98, 100 74" fill="none" strokeWidth={5} strokeLinecap="round" />
        {LEAVES.map((leaf, i) => (
          <g key={i} transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`}>
            <g data-anim="leaf" data-side={leaf.side} className={styles.leafGroup}>
              <path className={styles.leaf} d="M0 0 C -20 -18 -22 -52 0 -78 C 22 -52 20 -18 0 0 Z" />
              <path className={styles.vein} d="M0 -4 L0 -62" />
            </g>
          </g>
        ))}
      </g>

      {/* Partículas (estado óptimo) */}
      {SPARKS.map((s, i) => (
        <g key={i} transform={`translate(${s.x} ${s.y})`}>
          <circle data-anim="spark" className={styles.spark} r="2.6" />
        </g>
      ))}

      {/* Gotas (bomba activada) */}
      {DROP_X.map((x, i) => (
        <g key={i} transform={`translate(${x} 16)`}>
          <path data-anim="drop" className={styles.drop} d="M0 -11 C 7 -2 9 5 0 11 C -9 5 -7 -2 0 -11 Z" />
        </g>
      ))}
    </svg>
  );
}
