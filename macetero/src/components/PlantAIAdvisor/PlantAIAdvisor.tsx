import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { getPlantCareMetrics, type PlantCareProfile } from '../../services/plantAiService';
import { login, updatePlantThreshold } from '../../services/thingsboard';
import { CameraIcon, DropletIcon, SproutIcon, ThermometerIcon } from '../icons';
import styles from './PlantAIAdvisor.module.css';

const QUICK_SUGGESTIONS = ['Suculenta', 'Monstera', 'Albahaca', 'Helecho'] as const;
const MAX_IMAGE_WIDTH = 800;
const JPEG_QUALITY = 0.8;

interface SelectedImage {
  dataUrl: string;
  base64: string;
  mimeType: string;
  name: string;
}

function compressImageToJpeg(file: File): Promise<SelectedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = img.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / img.width : 1;
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo inicializar el lienzo para comprimir la imagen.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({
        dataUrl,
        base64,
        mimeType: 'image/jpeg',
        name: file.name,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen seleccionada.'));
    };

    img.src = objectUrl;
  });
}

export interface PlantAIAdvisorProps {
  /** Función opcional (p. ej. de useThingsBoard) para reutilizar la sesión JWT activa. */
  onApplyThreshold?: (umbral: number, nombrePlanta: string) => Promise<void>;
}

export function PlantAIAdvisor({ onApplyThreshold }: PlantAIAdvisorProps) {
  const [query, setQuery] = useState('');
  const [image, setImage] = useState<SelectedImage | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlantCareProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyStatus, setApplyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [applyMessage, setApplyMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImageError(null);
    try {
      const compressed = await compressImageToJpeg(file);
      setImage(compressed);
    } catch (err) {
      setImageError(
        err instanceof Error ? err.message : 'No se pudo procesar la foto seleccionada.',
      );
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImageError(null);
  };

  const handleConsult = async (plantName: string, attachedImage?: SelectedImage | null) => {
    const clean = plantName.trim();
    if ((!clean && !attachedImage) || isLoading) return;

    if (clean) setQuery(clean);
    setIsLoading(true);
    setApplyStatus('idle');
    setApplyMessage('');

    try {
      const result = await getPlantCareMetrics(
        clean,
        attachedImage?.base64,
        attachedImage?.mimeType,
      );
      setProfile(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleConsult(query, image);
  };

  const handleApplyThreshold = async () => {
    if (!profile || isApplying) return;

    setIsApplying(true);
    setApplyStatus('idle');
    setApplyMessage('');

    try {
      if (onApplyThreshold) {
        await onApplyThreshold(profile.humedadMinima, profile.nombre);
      } else {
        const token = await login();
        await updatePlantThreshold(token, profile.humedadMinima, profile.nombre);
      }
      setApplyStatus('success');
      setApplyMessage(
        `Umbral del ${profile.humedadMinima}% para ${profile.nombre} guardado en el macetero.`,
      );
    } catch (err) {
      setApplyStatus('error');
      setApplyMessage(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar el umbral a ThingsBoard.',
      );
    } finally {
      setIsApplying(false);
    }
  };

  const canConsult = query.trim().length > 0 || image !== null;

  return (
    <section className={styles.card} aria-label="Asistente de cultivo con IA">
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.iconBadge}>
            <SproutIcon />
          </span>
          <div>
            <h2 className={styles.title}>Asistente Botánico IA</h2>
            <p className={styles.subtitle}>
              Busca por nombre o toma una foto de tu planta para analizarla y aplicar su umbral.
            </p>
          </div>
        </div>
      </header>

      <form className={styles.searchForm} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej. Suculenta, Monstera, o sube una foto..."
          aria-label="Nombre de la planta"
          disabled={isLoading}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.hiddenFileInput}
          onChange={(e) => void handleImageChange(e)}
          aria-label="Tomar o subir foto de la planta"
          disabled={isLoading}
        />

        <button
          type="button"
          className={styles.photoBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          title="Tomar foto o elegir imagen"
        >
          <CameraIcon />
          <span>Foto</span>
        </button>

        <button
          type="submit"
          className={styles.consultBtn}
          disabled={isLoading || !canConsult}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              Consultando...
            </>
          ) : (
            'Consultar a la IA'
          )}
        </button>
      </form>

      {imageError && (
        <p className={styles.imageError} role="alert">
          {imageError}
        </p>
      )}

      {image && (
        <div className={styles.previewBox}>
          <img
            src={image.dataUrl}
            alt="Vista previa de la planta seleccionada"
            className={styles.previewImg}
          />
          <div className={styles.previewMeta}>
            <span className={styles.previewTitle}>Foto lista para analizar</span>
            <span className={styles.previewSub}>{image.name}</span>
          </div>
          <button
            type="button"
            className={styles.removePhotoBtn}
            onClick={handleRemoveImage}
            disabled={isLoading}
          >
            Quitar
          </button>
        </div>
      )}

      <div className={styles.chips} role="group" aria-label="Sugerencias rápidas">
        {QUICK_SUGGESTIONS.map((plant) => {
          const active = query.trim().toLowerCase() === plant.toLowerCase();
          return (
            <button
              key={plant}
              type="button"
              className={styles.chip}
              data-active={active || undefined}
              onClick={() => void handleConsult(plant, null)}
              disabled={isLoading}
            >
              {plant}
            </button>
          );
        })}
      </div>

      {profile && (
        <div className={styles.result}>
          <div className={styles.resultHeader}>
            <div>
              <div className={styles.eyebrowRow}>
                <span className={styles.resultEyebrow}>Perfil recomendado</span>
                <span className={styles.sourceBadge} data-source={profile.origen}>
                  {profile.origen === 'gemini' ? '✦ Gemini IA' : '⚡ Perfil local'}
                </span>
                <span className={styles.difficultyBadge}>
                  Dificultad: {profile.nivelDificultad}
                </span>
              </div>
              <h3 className={styles.plantName}>{profile.nombre}</h3>
              <p className={styles.scientificName}>{profile.nombreCientifico}</p>
            </div>
            <span className={styles.thresholdPill}>
              Umbral de riego: <strong>{profile.humedadMinima}%</strong>
            </span>
          </div>

          {profile.notaOrigen && (
            <p className={styles.fallbackNotice} role="note">
              ⚠ {profile.notaOrigen}
            </p>
          )}

          <div className={styles.metricsGrid}>
            <div className={styles.metricBox}>
              <div className={styles.metricLabel}>
                <DropletIcon className={styles.metricIconSky} />
                <span>Humedad óptima del suelo</span>
              </div>
              <div className={styles.metricValue}>
                {profile.humedadMinima}% – {profile.humedadMaxima}%
              </div>
              <div className={styles.rangeTrack} aria-hidden="true">
                <div
                  className={styles.rangeFill}
                  style={{
                    left: `${profile.humedadMinima}%`,
                    width: `${Math.max(4, profile.humedadMaxima - profile.humedadMinima)}%`,
                  }}
                />
              </div>
            </div>

            <div className={styles.metricBox}>
              <div className={styles.metricLabel}>
                <ThermometerIcon className={styles.metricIconAmber} />
                <span>Temperatura ideal</span>
              </div>
              <div className={styles.metricValue}>{profile.temperaturaIdeal}</div>
            </div>

            <div className={styles.metricBox}>
              <div className={styles.metricLabel}>
                <span aria-hidden="true">☀️</span>
                <span>Luz recomendada</span>
              </div>
              <div className={styles.metricDetail}>{profile.luzIdeal}</div>
            </div>

            <div className={styles.metricBox}>
              <div className={styles.metricLabel}>
                <span aria-hidden="true">💧</span>
                <span>Frecuencia de riego</span>
              </div>
              <div className={styles.metricDetail}>{profile.frecuenciaRiego}</div>
            </div>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Sustrato recomendado</span>
            <p className={styles.infoText}>{profile.sustratoRecomendado}</p>
          </div>

          <div className={styles.infoBlock}>
            <span className={styles.infoLabel}>Guía de cuidado</span>
            <p className={styles.advice}>{profile.consejoCuidado}</p>
          </div>

          {profile.senalesAlerta.length > 0 && (
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Señales de alerta a vigilar</span>
              <ul className={styles.alertList}>
                {profile.senalesAlerta.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.applyBtn}
              onClick={() => void handleApplyThreshold()}
              disabled={isApplying}
            >
              {isApplying ? 'Aplicando umbral...' : 'Aplicar umbral al Macetero'}
            </button>

            {applyStatus !== 'idle' && (
              <p
                className={styles.feedback}
                data-status={applyStatus}
                role="status"
                aria-live="polite"
              >
                {applyStatus === 'success' ? '✓ ' : '⚠ '}
                {applyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
