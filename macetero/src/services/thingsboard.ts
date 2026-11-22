import { TB_CONFIG } from '../config/thingsboard';
import type { Telemetry } from '../types/telemetry';

interface TbDatapoint {
  ts: number;
  value: string;
}

type TbTimeseries = Partial<Record<keyof Telemetry, TbDatapoint[]>>;

/** Se lanza cuando el JWT expiró y hay que volver a iniciar sesión. */
export class AuthError extends Error {
  constructor() {
    super('La sesión de ThingsBoard expiró');
    this.name = 'AuthError';
  }
}

export async function login(): Promise<string> {
  const res = await fetch(`${TB_CONFIG.host}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TB_CONFIG.user, password: TB_CONFIG.password }),
  });
  if (!res.ok) throw new Error(`Login falló (${res.status})`);

  const data: { token?: string } = await res.json();
  if (!data.token) throw new Error('ThingsBoard no devolvió un token');
  return data.token;
}

function latestValue(points?: TbDatapoint[]): number | null {
  const first = points?.[0];
  if (!first) return null;
  const n = Number.parseFloat(first.value);
  return Number.isFinite(n) ? n : null;
}

function latestBoolean(points?: TbDatapoint[]): boolean | null {
  const first = points?.[0];
  if (!first) return null;
  if (typeof first.value === 'boolean') return first.value;
  const normalized = String(first.value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
}

async function postAuthenticated(
  url: string,
  token: string,
  body: unknown,
  errorLabel: string,
): Promise<void> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`${errorLabel} (${res.status})`);
}

export async function fetchTelemetry(token: string): Promise<Telemetry> {
  const keys = 'temperatura,humedad_aire,humedad_suelo,bomba_activa,umbral_actual';
  const url = `${TB_CONFIG.host}/api/plugins/telemetry/DEVICE/${TB_CONFIG.deviceId}/values/timeseries?keys=${keys}`;

  const res = await fetch(url, { headers: { 'X-Authorization': `Bearer ${token}` } });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) throw new Error(`Telemetría falló (${res.status})`);

  const data: TbTimeseries = await res.json();
  return {
    temperatura: latestValue(data.temperatura),
    humedad_aire: latestValue(data.humedad_aire),
    humedad_suelo: latestValue(data.humedad_suelo),
    bomba_activa: latestBoolean(data.bomba_activa),
    umbral_actual: latestValue(data.umbral_actual),
  };
}

/** Envía un comando One-Way RPC para activar o desactivar la bomba de riego. */
export async function togglePump(token: string, activar: boolean): Promise<void> {
  const url = `${TB_CONFIG.host}/api/plugins/rpc/oneway/${TB_CONFIG.deviceId}`;
  await postAuthenticated(
    url,
    token,
    { method: 'regar', params: activar },
    'Comando RPC de bomba falló',
  );
}

/** Guarda el umbral de humedad y el nombre de la planta como atributos compartidos. */
export async function updatePlantThreshold(
  token: string,
  umbral: number,
  nombrePlanta: string,
): Promise<void> {
  const url = `${TB_CONFIG.host}/api/plugins/telemetry/DEVICE/${TB_CONFIG.deviceId}/SHARED_SCOPE`;
  await postAuthenticated(
    url,
    token,
    { umbral_humedad: umbral, planta_actual: nombrePlanta },
    'Actualización de atributos compartidos falló',
  );
}
