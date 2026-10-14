import * as grpc from '@grpc/grpc-js';
import { z } from 'zod';
import { AmbulanceFleet } from './AmbulanceFleet';
import type { NeuraHealthPackage } from './ContractLoader';
import type { FleetControlServiceHandlers } from './generated/neurahealth/FleetControlService';

z.config(z.locales.es());

// Validación en tiempo de ejecución de las órdenes que llegan por gRPC
const StartShiftSchema = z.object({
  unit_count: z.number().int().min(0).max(AmbulanceFleet.MAX_UNITS),
  max_duration_seconds: z.number().int().min(0).max(3600),
});

const TriggerScenarioSchema = z.object({
  ambulance_id: z.string().regex(/^AMB-[A-Z0-9-]+$/),
  scenario: z.enum([
    'CLINICAL_SCENARIO_STABLE',
    'CLINICAL_SCENARIO_TACHYARRHYTHMIA',
    'CLINICAL_SCENARIO_HYPOXIA',
    'CLINICAL_SCENARIO_SEPTIC_SHOCK',
    'CLINICAL_SCENARIO_CARDIAC_ARREST',
    'CLINICAL_SCENARIO_SENSOR_FAULT',
  ]),
});

/**
 * Servidor gRPC que expone el contrato FleetControlService.
 * Son llamadas unarias: "funciones remotas", no recursos REST.
 */
export class FleetControlServer {
  private static readonly DEFAULT_UNITS = 4;
  private static readonly DEFAULT_DURATION_SECONDS = 600;

  private readonly server = new grpc.Server();

  constructor(
    contracts: NeuraHealthPackage,
    private readonly fleet: AmbulanceFleet,
    private readonly port: string,
  ) {
    const handlers: FleetControlServiceHandlers = {
      StartShift: this.handleStartShift,
      StopShift: this.handleStopShift,
      TriggerScenario: this.handleTriggerScenario,
      GetFleetStatus: this.handleGetFleetStatus,
    };
    this.server.addService(contracts.FleetControlService.service, handlers);
  }

  private readonly handleStartShift: FleetControlServiceHandlers['StartShift'] = (call, callback) => {
    const parsed = StartShiftSchema.safeParse(call.request);
    if (!parsed.success) {
      callback({ code: grpc.status.INVALID_ARGUMENT, details: parsed.error.issues[0].message });
      return;
    }

    // 0 significa "usar el valor por defecto" (proto3 no distingue vacío de 0)
    const units = parsed.data.unit_count || FleetControlServer.DEFAULT_UNITS;
    const duration = parsed.data.max_duration_seconds || FleetControlServer.DEFAULT_DURATION_SECONDS;
    callback(null, this.fleet.start(units, Math.max(30, duration)));
  };

  private readonly handleStopShift: FleetControlServiceHandlers['StopShift'] = (call, callback) => {
    callback(null, this.fleet.stop(call.request.reason || 'Detenido desde el dashboard.'));
  };

  private readonly handleTriggerScenario: FleetControlServiceHandlers['TriggerScenario'] = (call, callback) => {
    const parsed = TriggerScenarioSchema.safeParse(call.request);
    if (!parsed.success) {
      callback({ code: grpc.status.INVALID_ARGUMENT, details: 'Unidad o escenario no válido.' });
      return;
    }
    callback(null, this.fleet.triggerScenario(parsed.data.ambulance_id, parsed.data.scenario));
  };

  private readonly handleGetFleetStatus: FleetControlServiceHandlers['GetFleetStatus'] = (_call, callback) => {
    callback(null, this.fleet.status());
  };

  public start(): void {
    this.server.bindAsync(`0.0.0.0:${this.port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
      if (error) {
        console.error('Fallo al iniciar el control de flota:', error.message);
        process.exit(1);
      }
      console.log(`[Fleet Control]: Microservicio gRPC escuchando en el puerto ${boundPort}`);
    });
  }

  public stop(onStopped: () => void): void {
    this.server.tryShutdown(onStopped);
  }
}
