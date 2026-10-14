import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { AuditWorker } from './AuditWorker';
import { ScenarioCommand, StartShiftCommand, type CommandResult } from './ClientCommands';
import { ContractCatalog } from './ContractCatalog';
import { ContractLoader } from './ContractLoader';
import { FleetControlClient } from './FleetControlClient';
import { HospitalMonitorClient } from './HospitalMonitorClient';
import { ShiftAutopilot } from './ShiftAutopilot';
import type { TelemetryEvent__Output } from './generated/neurahealth/TelemetryEvent';

type CommandAck = (result: CommandResult) => void;

interface SystemHealth {
  hospitalService: boolean;
  ambulanceService: boolean;
  checkedAt: number;
}

/**
 * Gateway web (patrón BFF: Backend For Frontend) del hospital.
 *
 * Los navegadores no hablan gRPC nativo (no controlan los frames HTTP/2),
 * así que este proceso es el puente:
 *   Microservicios ⇄ gRPC/HTTP2 ⇄ Gateway ⇄ WebSocket ⇄ Navegador
 * No existe ningún endpoint REST: solo archivos estáticos + WebSocket.
 */
class DashboardGateway {
  private readonly app = express();
  private readonly httpServer = http.createServer(this.app);
  private readonly io = new SocketIOServer(this.httpServer);

  private readonly contracts = ContractLoader.load();
  private readonly catalog = new ContractCatalog(ContractLoader.resolveProtoDir());
  private readonly monitor = new HospitalMonitorClient(
    this.contracts,
    process.env.HOSPITAL_GRPC_ADDRESS ?? 'localhost:50051',
  );
  private readonly fleet = new FleetControlClient(this.contracts, process.env.FLEET_GRPC_ADDRESS ?? 'localhost:50052');
  private readonly auditWorker = new AuditWorker();
  private readonly autopilot = new ShiftAutopilot(
    this.fleet,
    (process.env.AUTO_START_SHIFT ?? 'true') === 'true',
    Number(process.env.IDLE_STOP_SECONDS ?? 45) * 1000,
    Number(process.env.SHIFT_DURATION_SECONDS ?? 600),
  );

  private health: SystemHealth = { hospitalService: false, ambulanceService: false, checkedAt: 0 };
  private pollTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.wireTelemetry();
    this.wireAudit();
    this.io.on('connection', (socket) => this.handleConnection(socket));
  }

  public start(port: number): void {
    this.httpServer.listen(port, () => {
      console.log(`[Hospital Dashboard]: Gateway web corriendo en http://localhost:${port}`);
      this.monitor.connect();
    });
  }

  public stop(): void {
    this.monitor.close();
    this.fleet.close();
    this.io.close();
    this.httpServer.close(() => process.exit(0));
  }

  // gRPC (server streaming) → WebSocket: cada evento del hospital llega al navegador
  private wireTelemetry(): void {
    this.monitor.on('telemetry', (event: TelemetryEvent__Output) => {
      this.io.emit('telemetry', event);

      const alert = event.alert;
      if (alert && (alert.severity === 'SEVERITY_CRITICAL' || alert.severity === 'SEVERITY_HIGH')) {
        this.auditWorker.pushAlert(alert);
      }
    });
  }

  private wireAudit(): void {
    this.auditWorker.on('recorded', (record) => this.io.emit('audit:recorded', record));
  }

  private handleConnection(socket: Socket): void {
    console.log(`[Frontend Conectado]: Personal médico en línea (${this.autopilot.viewerCount + 1}).`);

    socket.emit('contracts:catalog', this.catalog.list());
    socket.emit('audit:history', this.auditWorker.recentRecords);
    void this.autopilot.viewerJoined().then(() => this.refresh());
    this.ensurePolling();

    socket.on('fleet:start', (payload: unknown, ack?: CommandAck) => this.onStartShift(payload, ack));
    socket.on('fleet:stop', (_payload: unknown, ack?: CommandAck) => this.onStopShift(ack));
    socket.on('fleet:scenario', (payload: unknown, ack?: CommandAck) => this.onScenario(payload, ack));

    socket.on('disconnect', () => {
      this.autopilot.viewerLeft();
      console.log(`[Frontend Desconectado]: quedan ${this.autopilot.viewerCount}.`);
      if (this.autopilot.viewerCount === 0) this.stopPolling();
    });
  }

  private async onStartShift(payload: unknown, ack?: CommandAck): Promise<void> {
    const parsed = StartShiftCommand.safeParse(payload ?? {});
    if (!parsed.success) return this.reply(ack, false, parsed.error.issues[0].message);

    try {
      const status = await this.fleet.startShift(parsed.data.unitCount, Number(process.env.SHIFT_DURATION_SECONDS ?? 600));
      this.reply(ack, true, status.message);
    } catch {
      this.reply(ack, false, 'El servicio de ambulancias no responde.');
    }
    await this.refresh();
  }

  private async onStopShift(ack?: CommandAck): Promise<void> {
    try {
      const status = await this.fleet.stopShift('Detenido manualmente desde el dashboard.');
      this.reply(ack, true, status.message);
    } catch {
      this.reply(ack, false, 'El servicio de ambulancias no responde.');
    }
    await this.refresh();
  }

  private async onScenario(payload: unknown, ack?: CommandAck): Promise<void> {
    const parsed = ScenarioCommand.safeParse(payload);
    if (!parsed.success) return this.reply(ack, false, parsed.error.issues[0].message);

    try {
      const result = await this.fleet.triggerScenario(parsed.data.ambulanceId, parsed.data.scenario);
      this.reply(ack, result.accepted, result.message);
    } catch {
      this.reply(ack, false, 'El servicio de ambulancias no responde.');
    }
    await this.refresh();
  }

  private reply(ack: CommandAck | undefined, ok: boolean, message: string): void {
    if (typeof ack === 'function') ack({ ok, message });
  }

  // Sondeo (llamadas unarias) solo mientras haya alguien mirando
  private ensurePolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => void this.refresh(), 2000);
  }

  private stopPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private async refresh(): Promise<void> {
    const [fleetResult, hospitalResult] = await Promise.allSettled([this.fleet.getStatus(), this.monitor.getStatus()]);

    if (fleetResult.status === 'fulfilled') this.io.emit('fleet:status', fleetResult.value);
    if (hospitalResult.status === 'fulfilled') this.io.emit('hospital:status', hospitalResult.value);

    this.health = {
      ambulanceService: fleetResult.status === 'fulfilled',
      hospitalService: hospitalResult.status === 'fulfilled',
      checkedAt: Date.now(),
    };
    this.io.emit('system:health', this.health);
  }
}

const gateway = new DashboardGateway();
gateway.start(Number(process.env.PORT ?? 3000));

process.on('SIGINT', () => gateway.stop());
process.on('SIGTERM', () => gateway.stop());
