# Macetero Inteligente IoT — Dashboard

Dashboard en React + TypeScript (Vite) que lee la telemetría del macetero desde ThingsBoard
(humedad del suelo, temperatura y humedad del aire) y la muestra con animaciones de anime.js.

## Instalación

```bash
npm install
npm install animejs chart.js react-chartjs-2
cp .env.example .env.local   # ajusta host, device id y credenciales
npm run dev
```

## Estructura

```
src/
├── main.tsx                 Punto de entrada
├── App.tsx                  Ensambla la pantalla
├── App.module.css
├── index.css                Variables de diseño y estilos globales
├── config/
│   ├── thingsboard.ts       Host, device, credenciales (vía .env.local), intervalo de lectura
│   └── thresholds.ts        Umbral de suelo seco
├── types/telemetry.ts       Tipos compartidos
├── services/thingsboard.ts  login() y fetchTelemetry() — sin React
├── hooks/
│   ├── useThingsBoard.ts    Sesión + polling + historial + reconexión
│   ├── useCountUp.ts        Números que cuentan hasta su valor (anime.js)
│   └── useReveal.ts         Entrada escalonada de las tarjetas (anime.js)
├── utils/                   plantStatus, color, math, motion
├── lib/chartSetup.ts        Registro único de Chart.js
└── components/
    ├── Header/
    ├── StatusBanner/        Mensaje de estado + escena animada
    ├── PlantScene/          Planta SVG animada con anime.js
    ├── MetricCard/          Tarjeta con número animado y barra
    ├── HistoryChart/        Gráfica de línea con degradado
    └── icons.tsx
```

## Animaciones (anime.js)

- **PlantScene**: la planta se balancea; con suelo seco las hojas se caen, el resplandor se vuelve
  naranja y caen gotas mientras la bomba riega; con humedad óptima suben partículas. El nivel de agua
  dentro de la maceta sigue la humedad real del suelo.
- **MetricCard**: el número cuenta hasta el nuevo valor, hace un pequeño pulso y la barra se llena.
- **Header**: onda expansiva en el indicador de conexión.
- **useReveal**: las tarjetas entran escalonadas al cargar.
- Todo respeta `prefers-reduced-motion`.
