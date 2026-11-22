import { SOIL_DRY_THRESHOLD } from '../config/thresholds';
import type { ConnectionStatus, PlantStatus, Telemetry } from '../types/telemetry';

export function getPlantStatus(connection: ConnectionStatus, telemetry: Telemetry | null): PlantStatus {
  if (connection === 'offline') return 'offline';
  const soil = telemetry?.humedad_suelo;
  if (soil === null || soil === undefined) return 'loading';
  return soil < SOIL_DRY_THRESHOLD ? 'watering' : 'healthy';
}
