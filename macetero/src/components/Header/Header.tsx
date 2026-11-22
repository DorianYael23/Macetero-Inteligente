import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import type { ConnectionStatus } from '../../types/telemetry';
import { prefersReducedMotion } from '../../utils/motion';
import { SproutIcon, WifiIcon } from '../icons';
import styles from './Header.module.css';

interface HeaderProps {
  connection: ConnectionStatus;
  lastUpdate: Date | null;
  onOpenWifiSetup: () => void;
}

const LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  online: 'Conectado a ThingsBoard',
  offline: 'Desconectado',
};

export function Header({ connection, lastUpdate, onOpenWifiSetup }: HeaderProps) {
  const rippleRef = useRef<HTMLSpanElement>(null);

  // Onda que se expande desde el punto cuando hay conexión
  useEffect(() => {
    const el = rippleRef.current;
    if (!el || connection !== 'online' || prefersReducedMotion()) return;

    const anim = animate(el, {
      scale: [1, 2.8],
      opacity: [0.55, 0],
      duration: 1800,
      ease: 'outQuad',
      loop: true,
    });

    return () => {
      anim.pause();
    };
  }, [connection]);

  return (
    <header className={styles.header} data-reveal>
      <div className={styles.brand}>
        <span className={styles.logo}>
          <SproutIcon />
        </span>
        <div>
          <h1 className={styles.title}>Macetero Inteligente IoT</h1>
          <p className={styles.subtitle}>Monitoreo en tiempo real con gráficas históricas — UAEM</p>
        </div>
      </div>

      <div className={styles.right}>
        {lastUpdate && (
          <span className={styles.updated}>
            Última lectura {lastUpdate.toLocaleTimeString('es-MX', { hour12: false })}
          </span>
        )}
        <span className={styles.pill} data-state={connection}>
          <span className={styles.dotWrap}>
            <span ref={rippleRef} className={styles.ripple} />
            <span className={styles.dot} />
          </span>
          {LABELS[connection]}
        </span>
        <button
          type="button"
          className={styles.wifiBtn}
          onClick={onOpenWifiSetup}
          title="Configurar o cambiar red Wi-Fi del macetero"
        >
          <WifiIcon className={styles.wifiIcon} />
          <span>Configurar Wi-Fi</span>
        </button>
      </div>
    </header>
  );
}
