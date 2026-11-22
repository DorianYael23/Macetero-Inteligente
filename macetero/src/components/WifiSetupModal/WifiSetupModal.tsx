import { useEffect, useState } from 'react';
import type { ConnectionStatus, Telemetry } from '../../types/telemetry';
import { CheckCircleIcon, CloseIcon, ExternalLinkIcon, WifiIcon } from '../icons';
import styles from './WifiSetupModal.module.css';

const RECENT_TELEMETRY_MS = 15_000;

interface WifiSetupModalProps {
  open: boolean;
  onClose: () => void;
  connection: ConnectionStatus;
  telemetry: Telemetry | null;
  lastUpdate: Date | null;
}

export function WifiSetupModal({
  open,
  onClose,
  connection,
  telemetry,
  lastUpdate,
}: WifiSetupModalProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;

    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 2000);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasReadings =
    telemetry !== null &&
    (telemetry.humedad_suelo !== null ||
      telemetry.temperatura !== null ||
      telemetry.humedad_aire !== null);

  const isRecentlyOnline =
    connection === 'online' &&
    hasReadings &&
    lastUpdate !== null &&
    nowMs - lastUpdate.getTime() <= RECENT_TELEMETRY_MS;

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wifi-setup-title"
      >
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <span className={styles.iconBadge}>
              <WifiIcon />
            </span>
            <div>
              <h2 id="wifi-setup-title" className={styles.title}>
                Configurar Wi-Fi del Macetero
              </h2>
              <p className={styles.subtitle}>
                Vincula o cambia la red Wi-Fi de tu ESP32 en 3 pasos sencillos.
              </p>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar asistente de Wi-Fi"
          >
            <CloseIcon />
          </button>
        </header>

        {isRecentlyOnline && (
          <div className={styles.onlineBadge} role="status" aria-live="polite">
            <CheckCircleIcon className={styles.onlineIcon} />
            <div className={styles.onlineText}>
              <strong>¡Macetero conectado en línea!</strong>
              <span>
                Telemetría activa recibida a las{' '}
                {lastUpdate.toLocaleTimeString('es-MX', { hour12: false })}
              </span>
            </div>
          </div>
        )}

        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              1
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Activar modo vinculación</h3>
              <p className={styles.stepDesc}>
                Desconecta y conecta el macetero <strong>3 veces seguidas</strong> (esperando 1–2
                segundos entre cada conexión) hasta que aparezca el <strong>código QR</strong> en
                su pantalla OLED.
              </p>
            </div>
          </li>

          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              2
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Escanear QR</h3>
              <p className={styles.stepDesc}>
                Apunta la cámara de tu teléfono al código QR de la pantalla OLED (o conéctate
                manualmente a la red Wi-Fi{' '}
                <code className={styles.codePill}>Macetero-IoT</code>) para que se abra el portal
                automáticamente.
              </p>
            </div>
          </li>

          <li className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              3
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>Elegir red doméstica</h3>
              <p className={styles.stepDesc}>
                Selecciona tu red Wi-Fi de <strong>2.4 GHz</strong>, ingresa tu contraseña y
                guarda. El macetero se reiniciará y enviará datos automáticamente.
              </p>
              <a
                href="http://192.168.4.1"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.portalLink}
              >
                <ExternalLinkIcon />
                <span>Abrir portal manualmente</span>
              </a>
            </div>
          </li>
        </ol>

        <footer className={styles.footer}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}
