import * as grpc from '@grpc/grpc-js';
import type { NeuraHealthPackage } from './ContractLoader';
import type { ClinicalScenario } from './generated/neurahealth/ClinicalScenario';
import type { FleetControlServiceClient } from './generated/neurahealth/FleetControlService';
import type { FleetStatus__Output } from './generated/neurahealth/FleetStatus';
import type { ScenarioAck__Output } from './generated/neurahealth/ScenarioAck';

/**
 * Cliente gRPC del contrato FleetControlService (llamadas unarias).
 * Envuelve los callbacks de gRPC en Promesas para usar async/await.
 */
export class FleetControlClient {
  private readonly client: FleetControlServiceClient;

  constructor(contracts: NeuraHealthPackage, address: string, private readonly timeoutMs: number = 3000) {
    this.client = new contracts.FleetControlService(address, grpc.credentials.createInsecure());
  }

  public startShift(unitCount: number, maxDurationSeconds: number): Promise<FleetStatus__Output> {
    return new Promise((resolve, reject) => {
      this.client.StartShift(
        { unit_count: unitCount, max_duration_seconds: maxDurationSeconds },
        this.options(),
        (error, response) => this.settle(error, response, resolve, reject),
      );
    });
  }

  public stopShift(reason: string): Promise<FleetStatus__Output> {
    return new Promise((resolve, reject) => {
      this.client.StopShift({ reason }, this.options(), (error, response) =>
        this.settle(error, response, resolve, reject),
      );
    });
  }

  public triggerScenario(ambulanceId: string, scenario: ClinicalScenario): Promise<ScenarioAck__Output> {
    return new Promise((resolve, reject) => {
      this.client.TriggerScenario({ ambulance_id: ambulanceId, scenario }, this.options(), (error, response) =>
        this.settle(error, response, resolve, reject),
      );
    });
  }

  public getStatus(): Promise<FleetStatus__Output> {
    return new Promise((resolve, reject) => {
      this.client.GetFleetStatus({}, this.options(), (error, response) =>
        this.settle(error, response, resolve, reject),
      );
    });
  }

  public close(): void {
    this.client.close();
  }

  // Cada llamada tiene un deadline: en sistemas distribuidos nunca se espera para siempre
  private options(): grpc.CallOptions {
    return { deadline: Date.now() + this.timeoutMs };
  }

  private settle<T>(
    error: grpc.ServiceError | null,
    response: T | undefined,
    resolve: (value: T) => void,
    reject: (reason: Error) => void,
  ): void {
    if (error || response === undefined) reject(error ?? new Error('Respuesta vacía'));
    else resolve(response);
  }
}
