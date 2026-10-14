import * as grpc from '@grpc/grpc-js';
import { AmbulanceClient } from './AmbulanceClient';
import { PatientCatalog } from './PatientCatalog';
import { VitalSignsSimulator } from './VitalSignsSimulator';
import type { NeuraHealthPackage } from './ContractLoader';
import type { AmbulanceSyncServiceClient } from './generated/neurahealth/AmbulanceSyncService';
import type { AmbulanceUnit } from './generated/neurahealth/AmbulanceUnit';
import type { ClinicalScenario__Output } from './generated/neurahealth/ClinicalScenario';
import type { FleetStatus } from './generated/neurahealth/FleetStatus';
import type { ScenarioAck } from './generated/neurahealth/ScenarioAck';
import type { UnitStatus__Output } from './generated/neurahealth/UnitStatus';

interface Trip {
  client: AmbulanceClient;
  simulator: VitalSignsSimulator;
  summary: string;
  origin: string;
  status: UnitStatus__Output;
  etaSeconds: number;
  ticksSinceArrival: number;
}

export interface FleetOptions {
  tickMs: number;                // Cada cuánto envía un paquete cada ambulancia
  simulatedSecondsPerTick: number; // Cuánto avanza el reloj del trayecto por paquete
}

/**
 * Gestiona el turno de la flota: crea ambulancias, mueve su ETA,
 * cambia escenarios clínicos y apaga todo al terminar el turno.
 *
 * Todas las ambulancias comparten UN solo cliente gRPC: HTTP/2 multiplexa
 * todos los streams sobre una única conexión TCP.
 */
export class AmbulanceFleet {
  public static readonly MAX_UNITS = 6;

  private readonly hospitalClient: AmbulanceSyncServiceClient;
  private readonly trips = new Map<string, Trip>();
  private ticker: NodeJS.Timeout | null = null;
  private shiftTimer: NodeJS.Timeout | null = null;
  private startedAt = 0;
  private endsAt = 0;

  constructor(
    contracts: NeuraHealthPackage,
    hospitalAddress: string,
    private readonly options: FleetOptions = { tickMs: 1500, simulatedSecondsPerTick: 6 },
  ) {
    this.hospitalClient = new contracts.AmbulanceSyncService(hospitalAddress, grpc.credentials.createInsecure());
  }

  public get isRunning(): boolean {
    return this.ticker !== null;
  }

  public start(unitCount: number, maxDurationSeconds: number): FleetStatus {
    if (this.isRunning) return this.status('El turno ya estaba activo.');

    for (let index = 1; index <= unitCount; index++) {
      this.dispatch(`AMB-UNIT-${String(index).padStart(2, '0')}`);
    }

    this.startedAt = Date.now();
    this.endsAt = this.startedAt + maxDurationSeconds * 1000;
    this.ticker = setInterval(() => this.tick(), this.options.tickMs);
    this.shiftTimer = setTimeout(() => this.stop('Se cumplió la duración máxima del turno.'), maxDurationSeconds * 1000);

    console.log(`[Fleet]: Turno iniciado con ${unitCount} ambulancias (máx. ${maxDurationSeconds} s).`);
    return this.status(`Turno iniciado con ${unitCount} ambulancias.`);
  }

  public stop(reason: string): FleetStatus {
    if (!this.isRunning) return this.status('No había un turno activo.');

    if (this.ticker) clearInterval(this.ticker);
    if (this.shiftTimer) clearTimeout(this.shiftTimer);
    this.ticker = null;
    this.shiftTimer = null;

    for (const trip of this.trips.values()) trip.client.stopTransmission();
    this.trips.clear();
    this.startedAt = 0;
    this.endsAt = 0;

    console.log(`[Fleet]: Turno detenido. Motivo: ${reason}`);
    return this.status(`Turno detenido: ${reason}`);
  }

  public triggerScenario(ambulanceId: string, scenario: ClinicalScenario__Output): ScenarioAck {
    const trip = this.trips.get(ambulanceId);
    if (!trip) return { accepted: false, message: `No existe la unidad ${ambulanceId} en el turno actual.` };
    if (trip.status !== 'UNIT_STATUS_EN_ROUTE') {
      return { accepted: false, message: `${ambulanceId} ya entregó a su paciente.` };
    }

    trip.simulator.setScenario(scenario);
    console.log(`[Fleet]: ${ambulanceId} cambia a ${scenario}.`);
    return { accepted: true, message: `Escenario aplicado a ${ambulanceId}.` };
  }

  public status(message = ''): FleetStatus {
    const units: AmbulanceUnit[] = [...this.trips.entries()].map(([ambulanceId, trip]) => ({
      ambulance_id: ambulanceId,
      patient_id: trip.client.patientId,
      patient_summary: trip.summary,
      origin: trip.origin,
      scenario: trip.simulator.scenario,
      status: trip.status,
      eta_seconds: Math.max(0, Math.round(trip.etaSeconds)),
      packets_sent: trip.client.packetsSent,
    }));

    return { is_running: this.isRunning, units, started_at: this.startedAt, ends_at: this.endsAt, message };
  }

  public shutdown(): void {
    this.stop('Apagado del microservicio.');
    this.hospitalClient.close();
  }

  // Un "tick" = cada ambulancia en ruta envía un paquete y avanza su ETA
  private tick(): void {
    for (const [ambulanceId, trip] of this.trips) {
      if (trip.status === 'UNIT_STATUS_ARRIVED') {
        trip.ticksSinceArrival++;
        if (trip.ticksSinceArrival >= 4) this.dispatch(ambulanceId);
        continue;
      }

      this.maybeDeteriorate(trip);
      trip.client.send(trip.simulator.nextReading());
      trip.etaSeconds -= this.options.simulatedSecondsPerTick;

      if (trip.etaSeconds <= 0) {
        trip.status = 'UNIT_STATUS_ARRIVED';
        trip.client.stopTransmission();
        console.log(`[Fleet]: ${ambulanceId} llegó a urgencias con ${trip.client.patientId}.`);
      }
    }
  }

  // Crea (o reemplaza) el traslado de una unidad con un paciente nuevo
  private dispatch(ambulanceId: string): void {
    this.trips.get(ambulanceId)?.client.stopTransmission();

    const patientCase = PatientCatalog.randomCase();
    const client = new AmbulanceClient(this.hospitalClient, ambulanceId, PatientCatalog.newPatientId());
    const trip: Trip = {
      client,
      simulator: new VitalSignsSimulator(patientCase.initialScenario),
      summary: patientCase.summary,
      origin: PatientCatalog.randomOrigin(),
      status: 'UNIT_STATUS_EN_ROUTE',
      etaSeconds: 240 + Math.floor(Math.random() * 360),
      ticksSinceArrival: 0,
    };

    this.trips.set(ambulanceId, trip);
    client.startTransmission();
  }

  // Pequeña probabilidad de que un paciente estable empeore solo
  private maybeDeteriorate(trip: Trip): void {
    if (trip.simulator.scenario !== 'CLINICAL_SCENARIO_STABLE' || Math.random() > 0.008) return;

    const options: ClinicalScenario__Output[] = [
      'CLINICAL_SCENARIO_TACHYARRHYTHMIA',
      'CLINICAL_SCENARIO_HYPOXIA',
      'CLINICAL_SCENARIO_SEPTIC_SHOCK',
    ];
    trip.simulator.setScenario(options[Math.floor(Math.random() * options.length)]);
  }
}
