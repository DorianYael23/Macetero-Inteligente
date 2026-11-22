import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import type { PlantStatus } from '../../types/telemetry';
import { prefersReducedMotion } from '../../utils/motion';
import { PlantScene } from '../PlantScene/PlantScene';
import styles from './StatusBanner.module.css';

interface StatusBannerProps {
  status: PlantStatus;
  soilMoisture: number | null;
}

const CONTENT: Record<PlantStatus, { eyebrow: string; title: string; description: string }> = {
  loading: {
    eyebrow: 'Iniciando',
    title: 'Esperando datos del macetero',
    description: 'Conectando con ThingsBoard y leyendo los sensores.',
  },
  offline: {
    eyebrow: 'Sin conexión',
    title: 'No se pudo contactar a ThingsBoard',
    description: 'Verifica que el servidor esté encendido. Se reintentará automáticamente.',
  },
  watering: {
    eyebrow: 'Riego automático',
    title: 'Suelo seco — bomba activada regando',
    description: 'El sistema activó la bomba de agua de manera automática.',
  },
  healthy: {
    eyebrow: 'Todo en orden',
    title: 'Planta feliz — humedad óptima',
    description: 'El sistema monitorea las variables ambientales del sustrato.',
  },
};

export function StatusBanner({ status, soilMoisture }: StatusBannerProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const content = CONTENT[status];

  // El texto entra con un pequeño desplazamiento cada vez que cambia el estado
  useEffect(() => {
    const el = textRef.current;
    if (!el || prefersReducedMotion()) return;

    const anim = animate(el, {
      opacity: [0, 1],
      translateX: [-14, 0],
      duration: 600,
      ease: 'outCubic',
    });
    return () => {
      anim.pause();
    };
  }, [status]);

  return (
    <section className={styles.banner} data-status={status} data-reveal aria-live="polite">
      <div ref={textRef} className={styles.text}>
        <span className={styles.eyebrow}>
          <span className={styles.dot} />
          {content.eyebrow}
        </span>
        <h2 className={styles.title}>{content.title}</h2>
        <p className={styles.description}>{content.description}</p>
      </div>
      <div className={styles.scene}>
        <PlantScene status={status} moisture={soilMoisture} />
      </div>
    </section>
  );
}
