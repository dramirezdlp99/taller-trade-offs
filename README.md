# NeuraHealth: centro regulador de ambulancias con gRPC

Taller **Paradigmas de Comunicación Web: Evolución y Trade-Offs** (Programación Orientada a la Web).

Caso de estudio: varias ambulancias trasladan pacientes hacia urgencias y transmiten sus signos vitales
en tiempo real al hospital. El hospital calcula el triaje (escala NEWS2) con cada paquete y le responde a la
ambulancia por el mismo canal. Un centro regulador (dashboard) ve toda la flota, las alertas y cuántos bytes
se ahorran usando Protobuf en vez de JSON.

> Uso académico. La lógica clínica es una simplificación de NEWS2 y no es un dispositivo médico.

## Arquitectura

```
                 WebSocket                    gRPC (server streaming + unario)
  Navegador  ◄──────────────►  hospital-dashboard  ─────────────────────►  hospital-service  :50051
                               (gateway / BFF)                                  ▲
                                      │  gRPC (unario)                          │ gRPC (streaming bidireccional)
                                      └──────────────►  ambulance-service  ─────┘
                                                        :50052
```

| Microservicio | Rol | Contrato que implementa | Contrato que consume |
|---|---|---|---|
| `hospital-service` | Recibe la telemetría, valida con Zod, calcula NEWS2, publica eventos | `AmbulanceSyncService`, `HospitalMonitoringService` | — |
| `ambulance-service` | Simula la flota; cada ambulancia abre su propio stream | `FleetControlService` | `AmbulanceSyncService` |
| `hospital-dashboard` | Gateway web: traduce gRPC → WebSocket para el navegador | — | `HospitalMonitoringService`, `FleetControlService` |

No hay API REST: los microservicios solo se hablan por gRPC (HTTP/2 + Protobuf). El navegador no puede
hablar gRPC nativo, por eso el gateway lo traduce a WebSocket.

### Los 3 tipos de RPC que se usan

- **Streaming bidireccional**: `StreamVitalSigns` (ambulancia ⇄ hospital).
- **Server streaming**: `WatchTelemetry` (hospital → dashboard).
- **Unario**: `StartShift`, `StopShift`, `TriggerScenario`, `GetFleetStatus`, `GetHospitalStatus`.

## Conceptos del taller y dónde están

| Concepto | Dónde verlo |
|---|---|
| Contract-First / SSOT | `proto/ambulance.proto`, `proto/monitoring.proto`, `proto/fleet.proto` |
| Generación de código desde el contrato | `npm run proto:gen` → `*/src/generated/` |
| Tipado end-to-end | Los handlers usan los tipos generados; si no coinciden, `tsc` falla |
| La falsa seguridad de TypeScript (Zod) | `hospital-service/src/VitalSignsSchema.ts`; en el dashboard, botón **Falla de sensor** |
| Protobuf vs JSON | `hospital-service/src/PayloadMeter.ts`; barra inferior del dashboard |
| HTTP/2 multiplexado | `ambulance-service/src/AmbulanceFleet.ts`: todas las ambulancias comparten un cliente |
| Worker asíncrono | `hospital-dashboard/src/AuditWorker.ts` |
| POO | Cada responsabilidad es una clase: `TriageEngine`, `AlertPolicy`, `TelemetryHub`, `AmbulanceFleet`… |

## Ejecutar en local (Windows, PowerShell)

Requisitos: Node.js 20 o superior.

```powershell
cd "C:\DOCUMENTOS U\septimo_semestre\programacion_orientada_a_la_web\taller-trade-offs"
npm run install:all
npm run build
npm start
```

Abrir <http://localhost:3000>. El turno arranca solo al abrir la página.

Demostración por consola (el comportamiento original del cliente de ambulancia), en otra terminal
con `npm start` corriendo:

```powershell
npm run demo:ambulance
```

## La simulación ya no es infinita

- Nadie transmite hasta que se inicia un turno.
- El turno empieza al entrar el primer visitante y se apaga **45 s** después de que se va el último.
- Cada turno dura como máximo **10 minutos** (`SHIFT_DURATION_SECONDS`).
- La bitácora del navegador guarda máximo 60 alertas y la cola del worker máximo 200.

## Despliegue gratis (sin tarjeta de crédito)

La imagen Docker de la raíz empaqueta los 3 microservicios. En la nube corren en modo `LAUNCH_MODE=single`
(un solo proceso de Node, ~110 MB de RAM) para caber en el plan gratuito, **pero siguen comunicándose
únicamente por gRPC a través de la red** (`localhost:50051` y `localhost:50052`). El archivo
`docker-compose.yml` muestra la topología ideal: un contenedor por microservicio.

### Opción A: Back4app Containers (plan gratuito, sin tarjeta)

1. Sube el código a GitHub (`git push`).
2. Entra a <https://www.back4app.com>, crea una cuenta con GitHub y elige **Containers as a Service**.
3. Instala la app de GitHub de Back4app y dale acceso solo al repositorio `taller-trade-offs`.
4. Selecciona el repositorio. Branch: `main`. Root directory: `./`. Si pide puerto, usa `8080`.
5. Crea la app y espera a que termine el build. La URL pública aparece arriba a la izquierda.
6. Cada `git push` a `main` vuelve a desplegar automáticamente.

### Opción B: Azure for Students (100 USD de crédito, sin tarjeta)

Azure Container Apps soporta gRPC (transporte HTTP/2) y permite un contenedor por microservicio.
Requiere activar la cuenta con el correo institucional en <https://azure.microsoft.com/free/students>.

### ¿Por qué no Vercel?

Vercel ejecuta funciones serverless que viven unos segundos. Un servidor gRPC necesita un proceso
persistente escuchando HTTP/2 y los streams deben quedar abiertos minutos, así que no encaja.

## Variables de entorno

| Variable | Defecto | Uso |
|---|---|---|
| `PORT` | `3000` (`8080` en Docker) | Puerto web del gateway |
| `HOSPITAL_GRPC_PORT` / `FLEET_GRPC_PORT` | `50051` / `50052` | Puertos gRPC |
| `HOSPITAL_GRPC_ADDRESS` / `FLEET_GRPC_ADDRESS` | `localhost:…` | Dónde está cada microservicio |
| `LAUNCH_MODE` | `processes` (`single` en Docker) | Un proceso por servicio o todos en uno |
| `AUTO_START_SHIFT` | `true` | Iniciar turno al llegar el primer visitante |
| `IDLE_STOP_SECONDS` | `45` | Espera antes de apagar el turno sin visitantes |
| `SHIFT_DURATION_SECONDS` | `600` | Duración máxima de un turno |

## Estructura

```
taller-trade-offs/
├── proto/                     # Contratos (fuente única de verdad)
├── hospital-service/src/      # HospitalServer, TriageEngine, AlertPolicy, TelemetryHub, PayloadMeter, VitalSignsSchema
├── ambulance-service/src/     # main, AmbulanceFleet, AmbulanceClient, VitalSignsSimulator, FleetControlServer
├── hospital-dashboard/src/    # Server (gateway), clientes gRPC, AuditWorker, ShiftAutopilot
├── hospital-dashboard/public/ # Interfaz (HTML + CSS + JS con clases)
├── scripts/launcher.js        # Arranca los 3 microservicios
├── Dockerfile
└── docker-compose.yml
```
