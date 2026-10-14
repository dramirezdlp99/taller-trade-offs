import type * as grpc from '@grpc/grpc-js';
import type { TelemetryEvent } from './generated/neurahealth/TelemetryEvent';
import type { WatchTelemetryRequest__Output } from './generated/neurahealth/WatchTelemetryRequest';

type TelemetryStream = grpc.ServerWritableStream<WatchTelemetryRequest__Output, TelemetryEvent>;

/**
 * Patrón publicador/suscriptor: cada dashboard abre un stream gRPC
 * (server streaming) y el hub le reenvía todos los eventos clínicos.
 */
export class TelemetryHub {
  private readonly watchers = new Map<string, TelemetryStream>();

  public subscribe(subscriberId: string, stream: TelemetryStream): void {
    this.watchers.set(subscriberId, stream);
    console.log(`[Telemetry Hub]: Dashboard "${subscriberId}" suscrito (${this.watchers.size} activos).`);

    const release = (): void => this.unsubscribe(subscriberId);
    stream.on('cancelled', release);
    stream.on('close', release);
    stream.on('error', release);
  }

  public publish(event: TelemetryEvent): void {
    for (const [subscriberId, stream] of this.watchers) {
      if (stream.cancelled || stream.destroyed) {
        this.unsubscribe(subscriberId);
        continue;
      }
      stream.write(event);
    }
  }

  public get watcherCount(): number {
    return this.watchers.size;
  }

  public closeAll(): void {
    for (const stream of this.watchers.values()) stream.end();
    this.watchers.clear();
  }

  private unsubscribe(subscriberId: string): void {
    if (this.watchers.delete(subscriberId)) {
      console.log(`[Telemetry Hub]: Dashboard "${subscriberId}" desconectado (${this.watchers.size} activos).`);
    }
  }
}
