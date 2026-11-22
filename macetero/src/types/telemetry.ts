/** Última lectura de los sensores (null = el sensor no reportó dato). */
export interface Telemetry {
  temperatura: number | null;
  humedad_aire: number | null;
  humedad_suelo: number | null;
  bomba_activa: boolean | null;
  umbral_actual: number | null;
}

/** Un punto del historial que se grafica. */
export interface HistoryPoint {
  time: string;
  temperatura: number | null;
  humedadSuelo: number | null;
  humedadAire: number | null;
  bombaActiva: boolean | null;
}

export type ConnectionStatus = 'connecting' | 'online' | 'offline';

export type PlantStatus = 'loading' | 'offline' | 'watering' | 'healthy';
