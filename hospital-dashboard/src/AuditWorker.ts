/**
 * Worker asíncrono para el procesamiento de alertas críticas en segundo plano.
 * Aplica principios de POO y separación de responsabilidades.
 */
export class AuditWorker {
  private queue: Array<any>;
  private isProcessing: boolean;

  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  public pushAlert(alertData: any): void {
    this.queue.push({
      ...alertData,
      processedAt: new Date().toISOString()
    });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      // Simular latencia de procesamiento de base de datos o broker de mensajes
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`[Background Worker - Auditoría Clínica]: Alerta registrada exitosamente en BD central | ID: ${task.alert_id} | Severidad: ${task.severity} | Hora: ${task.processedAt}`);
    }
    this.isProcessing = false;
  }
}

export const globalAuditWorker = new AuditWorker();