import * as grpc from '@grpc/grpc-js';
import { randomUUID } from 'crypto';
import { ContractLoader, type NeuraHealthPackage } from './ContractLoader';
import { TriageEngine, type TriageResult } from './TriageEngine';
import { AlertPolicy, type AlertReason } from './AlertPolicy';
import { PayloadMeter } from './PayloadMeter';
import { TelemetryHub } from './TelemetryHub';
import { ValidationReport, VitalSignsSchema, type VitalSigns } from './VitalSignsSchema';
import type { AmbulanceSyncServiceHandlers } from './generated/neurahealth/AmbulanceSyncService';
import type { HospitalMonitoringServiceHandlers } from './generated/neurahealth/HospitalMonitoringService';
import type { HospitalAlertResponse } from './generated/neurahealth/HospitalAlertResponse';

/**
 * Contadores globales del microservicio (se exponen por GetHospitalStatus).
 */
class HospitalStats {
  public activeStreams = 0;
  public totalMessages = 0;
  public totalAlerts = 0;
  public rejectedMessages = 0;
  public protobufBytes = 0;
  public jsonBytes = 0;
  public readonly startedAt = Date.now();

  public get uptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }
}

/**
 * Microservicio del Hospital.
 * Implementa DOS contratos sobre el mismo servidor gRPC (HTTP/2):
 *  - AmbulanceSyncService      → streaming bidireccional con las ambulancias
 *  - HospitalMonitoringService → server streaming + unario hacia el dashboard
 */
class HospitalServer {
  private readonly server = new grpc.Server();
  private readonly contracts: NeuraHealthPackage = ContractLoader.load();
  private readonly triageEngine = new TriageEngine();
  private readonly alertPolicy = new AlertPolicy();
  private readonly payloadMeter = new PayloadMeter(ContractLoader.resolveProtoDir());
  private readonly telemetryHub = new TelemetryHub();
  private readonly stats = new HospitalStats();

  constructor(private readonly port: string = '50051') {
    this.registerServices();
  }

  private registerServices(): void {
    const ambulanceHandlers: AmbulanceSyncServiceHandlers = {
      StreamVitalSigns: this.handleStreamVitalSigns,
    };
    const monitoringHandlers: HospitalMonitoringServiceHandlers = {
      WatchTelemetry: this.handleWatchTelemetry,
      GetHospitalStatus: this.handleGetHospitalStatus,
    };

    this.server.addService(this.contracts.AmbulanceSyncService.service, ambulanceHandlers);
    this.server.addService(this.contracts.HospitalMonitoringService.service, monitoringHandlers);
  }

  /**
   * Streaming bidireccional: un canal abierto por cada ambulancia en ruta.
   * Se usan funciones flecha para conservar el "this" de la clase.
   */
  private readonly handleStreamVitalSigns: AmbulanceSyncServiceHandlers['StreamVitalSigns'] = (call) => {
    this.stats.activeStreams++;
    let ambulanceId: string | null = null;
    let finished = false;

    console.log(`[Servidor Hospital]: Canal abierto con una unidad en ruta (${this.stats.activeStreams} activos).`);

    const finish = (): void => {
      if (finished) return;
      finished = true;
      this.stats.activeStreams--;
      if (ambulanceId) this.alertPolicy.forget(ambulanceId);
      console.log(`[Servidor Hospital]: ${ambulanceId ?? 'Unidad'} cerró su canal (${this.stats.activeStreams} activos).`);
    };

    call.on('data', (rawPacket) => {
      this.stats.totalMessages++;
      const size = this.payloadMeter.measure(rawPacket);
      this.stats.protobufBytes += size.protobufBytes;
      this.stats.jsonBytes += size.jsonBytes;
      const metrics = { protobuf_bytes: size.protobufBytes, json_bytes: size.jsonBytes };

      // 1. PARSEAR antes de confiar en los datos (Zod en tiempo de ejecución)
      const parsed = VitalSignsSchema.safeParse(rawPacket);
      if (!parsed.success) {
        this.rejectPacket(call, rawPacket.ambulance_id, ValidationReport.describe(parsed.error), metrics);
        return;
      }

      const vitals = parsed.data;
      ambulanceId = vitals.ambulance_id;

      // 2. Triaje clínico automatizado (NEWS2)
      const triage = this.triageEngine.evaluate(vitals);

      // 3. Publicar la lectura evaluada a todos los dashboards suscritos
      this.telemetryHub.publish({
        snapshot: { vitals: rawPacket, triage_score: triage.score, severity: triage.severity },
        metrics,
        emitted_at: Date.now(),
      });

      // 4. Responder a la ambulancia por el mismo canal (acuse + triaje)
      const decision = this.alertPolicy.decide(vitals.ambulance_id, triage.severity);
      const response = this.buildResponse(vitals, triage, decision.reason);
      call.write(response);

      // 5. Solo los cambios relevantes se convierten en alertas visibles
      if (decision.publish) {
        this.stats.totalAlerts++;
        this.telemetryHub.publish({ alert: response, emitted_at: Date.now() });
      }
    });

    call.on('end', () => {
      finish();
      call.end();
    });
    call.on('cancelled', finish);
    call.on('error', (error: Error) => {
      console.error('[Error en Streaming]:', error.message);
      finish();
    });
  };

  /**
   * Server streaming: el dashboard se suscribe y recibe eventos sin pedirlos.
   */
  private readonly handleWatchTelemetry: HospitalMonitoringServiceHandlers['WatchTelemetry'] = (call) => {
    const subscriberId = call.request.subscriber_id || `dashboard-${randomUUID().slice(0, 8)}`;
    this.telemetryHub.subscribe(subscriberId, call);
  };

  /**
   * Unario: devuelve una fotografía de los contadores del hospital.
   */
  private readonly handleGetHospitalStatus: HospitalMonitoringServiceHandlers['GetHospitalStatus'] = (_call, callback) => {
    callback(null, {
      active_streams: this.stats.activeStreams,
      total_messages: this.stats.totalMessages,
      total_alerts: this.stats.totalAlerts,
      rejected_messages: this.stats.rejectedMessages,
      protobuf_bytes_total: this.stats.protobufBytes,
      json_bytes_total: this.stats.jsonBytes,
      uptime_seconds: this.stats.uptimeSeconds,
      watchers: this.telemetryHub.watcherCount,
    });
  };

  private rejectPacket(
    call: Parameters<AmbulanceSyncServiceHandlers['StreamVitalSigns']>[0],
    ambulanceId: string,
    reason: string,
    metrics: { protobuf_bytes: number; json_bytes: number },
  ): void {
    this.stats.rejectedMessages++;
    console.warn(`[Validación Zod]: Paquete de ${ambulanceId || 'origen desconocido'} rechazado → ${reason}`);

    this.telemetryHub.publish({
      rejected: { ambulance_id: ambulanceId, reason, timestamp: Date.now() },
      metrics,
      emitted_at: Date.now(),
    });

    call.write({
      alert_id: this.newAlertId(),
      severity: 'SEVERITY_MEDIUM',
      message: `Paquete descartado por datos imposibles: ${reason}`,
      timestamp: Date.now(),
      ambulance_id: ambulanceId,
      recommended_action: 'Revisar los sensores del monitor de la ambulancia.',
    });
  }

  private buildResponse(vitals: VitalSigns, triage: TriageResult, reason?: AlertReason): HospitalAlertResponse {
    const findings = triage.findings.length > 0 ? triage.findings.join(', ') : 'parámetros dentro de rango';
    const prefix: Record<AlertReason, string> = {
      connected: 'Unidad conectada',
      worsened: 'Empeoramiento',
      improved: 'Mejoría',
      reminder: 'Sigue en estado crítico',
    };

    return {
      alert_id: this.newAlertId(),
      severity: triage.severity,
      message: `${reason ? prefix[reason] : 'Lectura recibida'}: NEWS2 ${triage.score} — ${findings}.`,
      timestamp: Date.now(),
      ambulance_id: vitals.ambulance_id,
      triage_score: triage.score,
      recommended_action: triage.recommendedAction,
      receiving_unit: triage.receivingUnit,
    };
  }

  private newAlertId(): string {
    return `ALT-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  public start(): void {
    this.server.bindAsync(`0.0.0.0:${this.port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
      if (error) {
        console.error('Fallo al iniciar el servidor del hospital:', error.message);
        process.exit(1);
      }
      console.log(`[Hospital Server]: Microservicio gRPC escuchando en el puerto ${boundPort}`);
    });
  }

  public stop(): void {
    console.log('[Hospital Server]: Apagando de forma ordenada...');
    this.telemetryHub.closeAll();
    this.server.tryShutdown(() => process.exit(0));
  }
}

// Instanciar y encender el servidor
const hospitalApp = new HospitalServer(process.env.HOSPITAL_GRPC_PORT ?? '50051');
hospitalApp.start();

process.on('SIGINT', () => hospitalApp.stop());
process.on('SIGTERM', () => hospitalApp.stop());
