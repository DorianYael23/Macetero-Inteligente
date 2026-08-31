# 🪴 Macetero Inteligente IoT: Arquitectura Cliente-Servidor

## Integrantes 
Jose Francisco Lopez Barrera
Daniel Antonio Antonio
Ivan Sanches Quiñones
Dorian Yael Zuñiga Santiago

## Descripción del Proyecto
Este proyecto implementa un sistema de monitoreo ambiental y riego automatizado basado en el Internet de las Cosas (IoT). Su objetivo es optimizar el cuidado de plantas en interiores.

Para lograrlo, el sistema soluciona el problema de la corrosión reemplazando los clásicos sensores resistivos por tecnología capacitiva, la cual mide la humedad del suelo de forma prolongada sin contacto metálico directo. Además, optimiza el ancho de banda y el consumo energético al comunicarse mediante mensajería ligera en lugar de mantener conexiones pesadas y constantes.

## Arquitectura del Sistema
El proyecto opera bajo un modelo de tres capas independientes, separando el hardware de la base de datos y de la interfaz de usuario:

* **Capa Edge (Física):** Un microcontrolador **ESP32** actúa como el nodo local. Recolecta los datos de los sensores, muestra un diagnóstico visual en una pantalla OLED y controla el hardware de actuación (relé y bomba de agua).
* **Capa de Servidor (Backend):** Una instancia de **ThingsBoard** alojada en **Ubuntu Linux** y respaldada por **PostgreSQL**. Funciona como el *Broker* central, recibiendo, procesando y almacenando el historial de telemetría de la maceta.
* **Capa Cliente (Frontend):** Una aplicación móvil desarrollada en **React Native** (Expo). Actúa como la interfaz de usuario para monitorear las gráficas en tiempo real y ejecutar comandos a distancia.

## Stack Tecnológico y Componentes

**Hardware Utilizado:**
* Microcontrolador ESP32 (Wi-Fi)
* Sensor Ambiental BME680 (Temperatura, Humedad del aire, Calidad del aire/Gases) vía I2C
* Sensor de Humedad de Suelo FC-28 YL-69
* Módulo Relé de 1 Canal y Bomba de agua sumergible de 5V
* Pantalla OLED 128x64 (SSD1306)

**Software Integrado:**
* **Firmware (C++):** Librerías `PubSubClient` para MQTT y `ArduinoJson` para estructuración de datos.
* **Infraestructura:** ThingsBoard CE, PostgreSQL, Ubuntu Server.
* **Aplicación Móvil:** React Native, Expo, Axios, Iconografía Material.

## Flujo de Operación

1. **Adquisición:** El ESP32 procesa localmente las variables ambientales (BME680) y el estado hídrico del sustrato (Sensor Capacitivo).
2. **Publicación (Publish MQTT):** Los datos se empaquetan en un formato JSON ligero y se envían al servidor ThingsBoard utilizando el protocolo MQTT (`v1/devices/me/telemetry`).
3. **Consumo de API (HTTP GET):** La aplicación móvil consulta la API REST de ThingsBoard para extraer los valores más recientes y renderizarlos en el panel de control del usuario.
4. **Comando Remoto (RPC):** Cuando el usuario presiona "Regar" en la app, React Native envía un comando de ejecución (HTTP POST) al servidor.
5. **Actuación Física:** ThingsBoard enruta automáticamente esa petición de vuelta al ESP32. El microcontrolador activa el relé, enciende la bomba de agua por el tiempo programado y cierra el ciclo de riego.

## Instrucciones de Despliegue

1. **Configuración del ESP32:** En el código fuente, reemplaza las variables estáticas con tus credenciales de red Wi-Fi, la dirección IP de tu servidor Ubuntu y el *Device Token* generado por ThingsBoard. Sube el código a la placa.
2. **Preparación del Servidor:** Asegúrate de que los servicios de ThingsBoard y PostgreSQL estén activos en Linux. Verifica en el firewall que el puerto `1883` (tráfico MQTT) y el `8080` (tráfico HTTP) estén abiertos.
3. **Ejecución de la App:** En el directorio del frontend, instala las dependencias (`npm install`), inserta la IP de tu servidor en el archivo de configuración y ejecuta `npx expo start` para compilar el cliente en tu dispositivo móvil.