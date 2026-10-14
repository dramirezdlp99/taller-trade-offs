import { EventEmitter } from 'events';
import type { HospitalAlertResponse__Output } from './generated/neurahealth/HospitalAlertResponse';

export interface AuditRecord {
  alert_id: string;
  ambulance_id: string;
  severity: string;
  recordedAt: string;
}

/**
 * Worker asíncrono para el procesamiento de alertas graves en segundo plano.
 * Aplica principios de POO y separación de responsabilidades: el gateway
 * encola y sigue trabajando; el worker "persiste" sin bloquear el streaming.
 *
 * Mejora frente a la versión anterior: la cola tiene un tope (no crece sin
 * límite) y el historial guardado en memoria también está acotado.
 */
export class AuditWorker extends EventEmitter {
  private readonly queue: HospitalAlertResponse__Output[] = [];
  private readonly history: AuditRecord[] = [];
  private isProcessing = false;

  constructor(
    private readonly maxQueueSize: number = 200,
    private readonly maxHistory: number = 50,
    private readonly simulatedLatencyMs: number = 800,
  ) {
    super();
  }

  public pushAlert(alert: HospitalAlertResponse__Output): void {
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift(); // Se descarta la más antigua para proteger la memoria
    }
    this.queue.push(alert);
    void this.processQueue();
  }

  public get recentRecords(): AuditRecord[] {
    return [...this.history];
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const alert = this.queue.shift()!;
      // Simular la latencia de escritura en una base de datos o broker de mensajes
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));

      const record: AuditRecord = {
        alert_id: alert.alert_id,
        ambulance_id: alert.ambulance_id,
        severity: alert.severity,
        recordedAt: new Date().toISOString(),
      };
      this.history.unshift(record);
      this.history.length = Math.min(this.history.length, this.maxHistory);

      console.log(`[Background Worker - Auditoría Clínica]: Alerta ${record.alert_id} (${record.severity}) registrada.`);
      this.emit('recorded', record);
    }

    this.isProcessing = false;
  }
}
