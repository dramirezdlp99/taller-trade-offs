const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Carga del contrato gRPC (Contract-First)
const PROTO_PATH = path.join(__dirname, '../../proto/ambulance.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const neurahealthPackage = protoDescriptor.neurahealth;

/**
 * Clase POO para manejar la lógica del servidor del Hospital
 */
class HospitalServer {
  private server: any;
  private port: string;

  constructor(port: string = '50051') {
    this.server = new grpc.Server();
    this.port = port;
    this.initializeService();
  }

  private initializeService(): void {
    this.server.addService(neurahealthPackage.AmbulanceSyncService.service, {
      StreamVitalSigns: this.handleStreamVitalSigns,
    });
  }

  /**
   * Manejador del streaming bidireccional de signos vitales
   */
  private handleStreamVitalSigns(call: any): void {
    console.log('[Servidor Hospital]: Conexión establecida con una unidad de emergencia en ruta.');

    call.on('data', (vitalSigns: any) => {
      console.log(`[Recepción en Vivo] Ambulancia: ${vitalSigns.ambulance_id} | Pulso: ${vitalSigns.heart_rate} bpm | SpO2: ${vitalSigns.blood_oxygen}%`);

      // Lógica de evaluación clínica automatizada
      let severity = 'LOW';
      let alertMessage = 'Signos vitales estables.';

      if (vitalSigns.heart_rate > 120 || vitalSigns.heart_rate < 50) {
        severity = 'CRITICAL';
        alertMessage = '¡Alerta máxima! Ritmo cardíaco anormal detectado en el paciente.';
      } else if (vitalSigns.blood_oxygen < 90) {
        severity = 'MEDIUM';
        alertMessage = 'Precaución: Niveles bajos de saturación de oxígeno.';
      }

      // Responder de vuelta al streaming de la ambulancia
      call.write({
        alert_id: `ALT-${Date.now()}`,
        severity: severity,
        message: alertMessage,
        timestamp: Date.now(),
      });
    });

    call.on('end', () => {
      console.log('[Servidor Hospital]: La ambulancia ha finalizado la transmisión.');
      call.end();
    });

    call.on('error', (error: Error) => {
      console.error('[Error en Streaming]:', error.message);
    });
  }

  public start(): void {
    this.server.bindAsync(
      `0.0.0.0:${this.port}`,
      grpc.ServerCredentials.createInsecure(),
      (err: Error | null, port: number) => {
        if (err) {
          console.error('Fallo al iniciar el servidor del hospital:', err);
          return;
        }
        console.log(`[Hospital Server]: Microservicio corriendo de manera exitosa en el puerto ${port}`);
        this.server.start();
      }
    );
  }
}

// Instanciar y encender el servidor
const hospitalApp = new HospitalServer();
hospitalApp.start();