const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Carga del contrato gRPC
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
 * Clase POO para simular el dispositivo inteligente de la ambulancia
 */
class AmbulanceClient {
  private client: any;
  private ambulanceId: string;

  constructor(serverAddress: string, ambulanceId: string) {
    this.client = new neurahealthPackage.AmbulanceSyncService(
      serverAddress,
      grpc.credentials.createInsecure()
    );
    this.ambulanceId = ambulanceId;
  }

  public startTransmission(): void {
    console.log(`[Ambulance Client]: Iniciando transmisión de signos vitales para la unidad ${this.ambulanceId}...`);

    const call = this.client.StreamVitalSigns();

    // Escuchar respuestas y alertas enviadas por el hospital en tiempo real
    call.on('data', (response: any) => {
      console.log(`[Respuesta del Hospital] Severidad: [${response.severity}] -> ${response.message}`);
    });

    call.on('error', (error: Error) => {
      console.error('[Error de Conexión con Hospital]:', error.message);
    });

    call.on('end', () => {
      console.log('[Ambulance Client]: Transmisión finalizada por el servidor.');
    });

    // Simular el envío de datos médicos cada 3 segundos
    let sequence = 0;
    const interval = setInterval(() => {
      sequence++;
      
      // Simulamos una anomalía en el pulso en la iteración 4 para probar las alertas críticas
      const simulatedHeartRate = sequence === 4 ? 135 : 75 + Math.floor(Math.random() * 10);
      const simulatedOxygen = 96 + Math.floor(Math.random() * 3);

      const payload = {
        ambulance_id: this.ambulanceId,
        heart_rate: simulatedHeartRate,
        ecg_voltage: 1.2,
        blood_oxygen: simulatedOxygen,
        timestamp: Date.now(),
      };

      console.log(`[Enviando Binario Protobuf] Paquete #${sequence} -> Pulso: ${payload.heart_rate} bpm`);
      call.write(payload);

      if (sequence >= 8) {
        clearInterval(interval);
        call.end();
        console.log('[Ambulance Client]: Viaje finalizado. Cerrando canal de comunicación.');
      }
    }, 3000);
  }
}

// Ejecutar cliente simulando la ambulancia "AMB-UNIT-07"
const clientApp = new AmbulanceClient('localhost:50051', 'AMB-UNIT-07');
clientApp.startTransmission();