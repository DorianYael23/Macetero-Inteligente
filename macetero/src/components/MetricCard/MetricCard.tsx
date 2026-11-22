import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { animate } from 'animejs';
import { useCountUp } from '../../hooks/useCountUp';
import { clamp } from '../../utils/math';
import { prefersReducedMotion } from '../../utils/motion';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  label: string;
  sensor: string;
  icon: ReactNode;
  value: number | null;
  unit: string;
  decimals?: number;
  /** Color de acento (cualquier color CSS) */
  accent: string;
  /** 0-100: si se pasa, se muestra una barra de progreso animada */
  progress?: number | null;
}

export function MetricCard({ label, sensor, icon, value, unit, decimals = 0, accent, progress }: MetricCardProps) {
  const numberRef = useCountUp(value, decimals);
  const valueRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Pequeño "pulso" cada vez que llega un valor distinto
  useEffect(() => {
    const el = valueRef.current;
    if (!el || value === null || prefersReducedMotion()) return;

    const anim = animate(el, { scale: [1.07, 1], duration: 450, ease: 'outBack' });
    return () => {
      anim.pause();
    };
  }, [value]);

  // Barra de progreso
  useEffect(() => {
    const el = barRef.current;
    if (!el || progress === undefined) return;

    const target = progress === null ? 0 : clamp(progress, 0, 100) / 100;
    if (prefersReducedMotion()) {
      el.style.transform = `scaleX(${target})`;
      return;
    }

    const anim = animate(el, { scaleX: target, duration: 900, ease: 'outCubic' });
    return () => {
      anim.pause();
    };
  }, [progress]);

  return (
    <article className={styles.card} style={{ '--accent': accent } as CSSProperties} data-reveal>
      <header className={styles.head}>
        <span className={styles.icon}>{icon}</span>
        <div>
          <h3 className={styles.label}>{label}</h3>
          <p className={styles.sensor}>{sensor}</p>
        </div>
      </header>

      <div ref={valueRef} className={styles.value}>
        <span ref={numberRef} className={styles.number} />
        {value !== null && <span className={styles.unit}>{unit}</span>}
      </div>

      {progress !== undefined && (
        <div className={styles.track}>
          <div ref={barRef} className={styles.bar} style={{ transform: 'scaleX(0)' }} />
        </div>
      )}
    </article>
  );
}
