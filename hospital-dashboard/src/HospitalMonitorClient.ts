import * as grpc from '@grpc/grpc-js';
import { EventEmitter } from 'events';
import type { NeuraHealthPackage } from './ContractLoader';
import type { HospitalMonitoringServiceClient } from './generated/neurahealth/HospitalMonitoringService';
import type { HospitalStatusResponse__Output } from './generated/neurahealth/HospitalStatusResponse';
import type { TelemetryEvent__Output } from './generated/neurahealth/TelemetryEvent';

/**
 * Cliente gRPC del contrato HospitalMonitoringService.
 * Mantiene viva la suscripción (server streaming) y se reconecta solo
 * si el microservicio del hospital se reinicia.
 */
export class HospitalMonitorClient extends EventEmitter {
  private readonly client: HospitalMonitoringServiceClient;
  private stream: grpc.ClientReadableStream<TelemetryEvent__Output> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(contracts: NeuraHealthPackage, private readonly address: string) {
    super();
    this.client = new contracts.HospitalMonitoringService(address, grpc.credentials.createInsecure());
  }

  public connect(): void {
    const stream = this.client.WatchTelemetry({ subscriber_id: 'dashboard-gateway' });
    this.stream = stream;

    stream.on('data', (event: TelemetryEvent__Output) => this.emit('telemetry', event));
    stream.on('error', (error: grpc.ServiceError) => {
      if (error.code !== grpc.status.CANCELLED) {
        console.warn(`[Monitor gRPC]: Sin enlace con hospital-service (${error.details}). Reintentando...`);
      }
      this.scheduleReconnect(stream);
    });
    stream.on('end', () => this.scheduleReconnect(stream));
  }

  public getStatus(): Promise<HospitalStatusResponse__Output> {
    return new Promise((resolve, reject) => {
      this.client.GetHospitalStatus({}, { deadline: Date.now() + 2500 }, (error, response) => {
        if (error || !response) reject(error ?? new Error('Respuesta vacía'));
        else resolve(response);
      });
    });
  }

  public close(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.stream?.cancel();
    this.client.close();
  }

  private scheduleReconnect(failedStream: grpc.ClientReadableStream<TelemetryEvent__Output>): void {
    if (this.stream !== failedStream) return; // Evita reconexiones duplicadas
    this.stream = null;
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
}
