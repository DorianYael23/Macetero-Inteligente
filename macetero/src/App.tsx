import { useMemo, useState } from 'react';
import { Header } from './components/Header/Header';
import { HistoryChart } from './components/HistoryChart/HistoryChart';
import {
  ChartIcon,
  CloudIcon,
  DownloadIcon,
  DropletIcon,
  SproutIcon,
  ThermometerIcon,
} from './components/icons';
import { MetricCard } from './components/MetricCard/MetricCard';
import { PlantAIAdvisor } from './components/PlantAIAdvisor/PlantAIAdvisor';
import { StatusBanner } from './components/StatusBanner/StatusBanner';
import { WifiSetupModal } from './components/WifiSetupModal/WifiSetupModal';
import { useReveal } from './hooks/useReveal';
import { useThingsBoard } from './hooks/useThingsBoard';
import type { HistoryPoint } from './types/telemetry';
import { getPlantStatus } from './utils/plantStatus';
import styles from './App.module.css';

type ActiveTab = 'control' | 'ai' | 'charts';

interface SeriesStats {
  min: number;
  avg: number;
  max: number;
}

function calcStats(values: Array<number | null>): SeriesStats | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (valid.length === 0) return null;
  let min = valid[0];
  let max = valid[0];
  let sum = 0;
  for (const v of valid) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, avg: sum / valid.length, max };
}

function exportHistoryCsv(points: HistoryPoint[]) {
  const header = [
    'Hora',
    'Humedad del suelo (%)',
    'Temperatura (°C)',
    'Humedad del aire (%)',
    'Bomba activa',
  ];
  const rows = points.map((p) => [
    p.time,
    p.humedadSuelo ?? '',
    p.temperatura ?? '',
    p.humedadAire ?? '',
    p.bombaActiva === null ? '' : p.bombaActiva ? 'true' : 'false',
  ]);
  const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  link.href = url;
  link.download = `macetero-historial-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const { telemetry, history, wateringLog, connection, lastUpdate, togglePump, updatePlantThreshold } =
    useThingsBoard();
  const rootRef = useReveal<HTMLDivElement>();

  const [activeTab, setActiveTab] = useState<ActiveTab>('control');
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [pumpBusy, setPumpBusy] = useState(false);
  const [pumpError, setPumpError] = useState<string | null>(null);

  const status = getPlantStatus(connection, telemetry);
  const soil = telemetry?.humedad_suelo ?? null;
  const temperature = telemetry?.temperatura ?? null;
  const airHumidity = telemetry?.humedad_aire ?? null;
  const bombaActiva = telemetry?.bomba_activa ?? false;
  const umbralActual = telemetry?.umbral_actual ?? null;

  const soilStats = useMemo(() => calcStats(history.map((p) => p.humedadSuelo)), [history]);
  const tempStats = useMemo(() => calcStats(history.map((p) => p.temperatura)), [history]);

  const handleTogglePump = async () => {
    if (pumpBusy) return;
    setPumpBusy(true);
    setPumpError(null);
    try {
      await togglePump(!bombaActiva);
    } catch (err) {
      setPumpError(err instanceof Error ? err.message : 'No se pudo enviar el comando a la bomba.');
    } finally {
      setPumpBusy(false);
    }
  };

  return (
    <div ref={rootRef} className={styles.app}>
      <Header
        connection={connection}
        lastUpdate={lastUpdate}
        onOpenWifiSetup={() => setWifiModalOpen(true)}
      />

      <nav className={styles.nav} aria-label="Vistas del macetero">
        <button
          type="button"
          className={styles.navItem}
          data-active={activeTab === 'control' || undefined}
          onClick={() => setActiveTab('control')}
        >
          <DropletIcon className={styles.navIcon} />
          <span>Control</span>
        </button>
        <button
          type="button"
          className={styles.navItem}
          data-active={activeTab === 'ai' || undefined}
          onClick={() => setActiveTab('ai')}
        >
          <SproutIcon className={styles.navIcon} />
          <span>Asistente IA</span>
        </button>
        <button
          type="button"
          className={styles.navItem}
          data-active={activeTab === 'charts' || undefined}
          onClick={() => setActiveTab('charts')}
        >
          <ChartIcon className={styles.navIcon} />
          <span>Gráficas</span>
        </button>
      </nav>

      <main className={styles.main}>
        {activeTab === 'control' && (
          <div className={styles.tabContent}>
            <StatusBanner status={status} soilMoisture={soil} />

            <section className={styles.pumpCard} data-active={bombaActiva || undefined}>
              <div className={styles.pumpInfo}>
                <span className={styles.pumpEyebrow}>
                  <span className={styles.pumpDot} />
                  {bombaActiva ? 'Bomba activa · Regando' : 'Riego manual'}
                </span>
                <p className={styles.pumpSubtitle}>
                  {bombaActiva
                    ? 'El flujo de agua está encendido en este momento.'
                    : 'Activa la bomba de agua de forma remota cuando lo necesites.'}
                </p>
                {pumpError && (
                  <p className={styles.pumpError} role="alert">
                    {pumpError}
                  </p>
                )}
              </div>

              <button
                type="button"
                className={styles.pumpBtn}
                data-active={bombaActiva || undefined}
                onClick={() => void handleTogglePump()}
                disabled={pumpBusy || connection === 'offline'}
              >
                <DropletIcon />
                <span>
                  {pumpBusy
                    ? 'Enviando...'
                    : bombaActiva
                      ? 'Detener Bomba'
                      : 'Regar Ahora'}
                </span>
              </button>
            </section>

            <section className={styles.metrics}>
              <MetricCard
                label="Humedad del suelo"
                sensor={
                  umbralActual !== null
                    ? `Sensor FC-28 · Umbral: ${umbralActual}%`
                    : 'Sensor FC-28'
                }
                icon={<DropletIcon />}
                value={soil}
                unit="%"
                accent="#38bdf8"
                progress={soil}
              />
              <MetricCard
                label="Temperatura"
                sensor="Sensor DHT11"
                icon={<ThermometerIcon />}
                value={temperature}
                unit="°C"
                decimals={1}
                accent="#fbbf24"
              />
              <MetricCard
                label="Humedad del aire"
                sensor="Sensor DHT11"
                icon={<CloudIcon />}
                value={airHumidity}
                unit="%"
                accent="#a78bfa"
                progress={airHumidity}
              />
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className={styles.tabContent}>
            <PlantAIAdvisor onApplyThreshold={updatePlantThreshold} />
          </div>
        )}

        {activeTab === 'charts' && (
          <section className={styles.chartsSection} aria-label="Gráficas históricas">
            <div className={styles.chartsHeader}>
              <div className={styles.statsBar}>
                <div className={styles.statGroup}>
                  <span className={styles.statLabel} style={{ color: 'var(--sky)' }}>
                    <DropletIcon /> Humedad suelo
                  </span>
                  <div className={styles.statValues}>
                    <span>
                      Mín{' '}
                      <strong>{soilStats ? `${soilStats.min.toFixed(0)}%` : '—'}</strong>
                    </span>
                    <span>
                      Prom{' '}
                      <strong>{soilStats ? `${soilStats.avg.toFixed(1)}%` : '—'}</strong>
                    </span>
                    <span>
                      Máx{' '}
                      <strong>{soilStats ? `${soilStats.max.toFixed(0)}%` : '—'}</strong>
                    </span>
                  </div>
                </div>

                <div className={styles.statDivider} aria-hidden="true" />

                <div className={styles.statGroup}>
                  <span className={styles.statLabel} style={{ color: 'var(--amber)' }}>
                    <ThermometerIcon /> Temperatura
                  </span>
                  <div className={styles.statValues}>
                    <span>
                      Mín{' '}
                      <strong>{tempStats ? `${tempStats.min.toFixed(1)}°C` : '—'}</strong>
                    </span>
                    <span>
                      Prom{' '}
                      <strong>{tempStats ? `${tempStats.avg.toFixed(1)}°C` : '—'}</strong>
                    </span>
                    <span>
                      Máx{' '}
                      <strong>{tempStats ? `${tempStats.max.toFixed(1)}°C` : '—'}</strong>
                    </span>
                  </div>
                </div>

                <div className={styles.statDivider} aria-hidden="true" />

                <div className={styles.statGroup}>
                  <span className={styles.statLabel} style={{ color: 'var(--green)' }}>
                    <SproutIcon /> Umbral objetivo
                  </span>
                  <div className={styles.statValues}>
                    <strong>{umbralActual !== null ? `${umbralActual}%` : '—'}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.exportBtn}
                onClick={() => exportHistoryCsv(history)}
                disabled={history.length === 0}
                title="Descargar historial actual en formato CSV"
              >
                <DownloadIcon />
                <span>Exportar CSV</span>
              </button>
            </div>

            <div className={styles.charts}>
              <div className={styles.chartSlot}>
                <HistoryChart
                  title="Historial de humedad del suelo"
                  unit="%"
                  color="#38bdf8"
                  points={history}
                  field="humedadSuelo"
                  min={0}
                  max={100}
                  threshold={umbralActual}
                  thresholdLabel="Umbral IA"
                />
              </div>
              <div className={styles.chartSlot}>
                <HistoryChart
                  title="Historial de temperatura ambiente"
                  unit="°C"
                  color="#fbbf24"
                  points={history}
                  field="temperatura"
                />
              </div>
              <div className={styles.chartSlot}>
                <HistoryChart
                  title="Historial de humedad del aire"
                  unit="%"
                  color="#a78bfa"
                  points={history}
                  field="humedadAire"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            <div className={styles.wateringLogCard}>
              <div className={styles.wateringLogHead}>
                <span className={styles.wateringLogTitle}>
                  <DropletIcon /> Bitácora de riegos
                </span>
                <span className={styles.wateringLogCount}>
                  {wateringLog.length}{' '}
                  {wateringLog.length === 1 ? 'activación' : 'activaciones'}
                </span>
              </div>
              {wateringLog.length === 0 ? (
                <p className={styles.wateringLogEmpty}>
                  Sin activaciones de bomba registradas en esta sesión.
                </p>
              ) : (
                <ul className={styles.wateringLogList}>
                  {wateringLog.map((time, idx) => (
                    <li key={`${time}-${idx}`} className={styles.wateringLogChip}>
                      <span className={styles.wateringLogDot} />
                      <span>{time}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>Macetero Inteligente IoT · UAEM</footer>

      <WifiSetupModal
        open={wifiModalOpen}
        onClose={() => setWifiModalOpen(false)}
        connection={connection}
        telemetry={telemetry}
        lastUpdate={lastUpdate}
      />
    </div>
  );
}
