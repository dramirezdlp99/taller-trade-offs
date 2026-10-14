const express = require('express');
const path = require('path');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
import { globalAuditWorker } from './AuditWorker';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Carga del contrato gRPC (Contract-First / SSOT)
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
 * Clase POO para gestionar el Dashboard del Hospital y la comunicación gRPC
 */
class HospitalDashboardManager {
  private grpcClient: any;

  constructor(hospitalServiceAddress: string = 'localhost:50051') {
    this.grpcClient = new neurahealthPackage.AmbulanceSyncService(
      hospitalServiceAddress,
      grpc.credentials.createInsecure()
    );
  }

  public simulateAmbulanceTelemetry(ioInstance: any): void {
    console.log('[Dashboard Manager]: Iniciando canal de telemetría dinámica hacia gRPC...');
    const call = this.grpcClient.StreamVitalSigns();

    call.on('data', (response: any) => {
      const sanitizedAlert = {
        ...response,
        timestamp: response.timestamp ? Number(response.timestamp) : Date.now()
      };

      ioInstance.emit('hospital-alert', sanitizedAlert);

      if (sanitizedAlert.severity === 'CRITICAL' || sanitizedAlert.severity === 'MEDIUM') {
        globalAuditWorker.pushAlert(sanitizedAlert);
      }
    });

    call.on('error', (error: Error) => {
      console.error('[Error de enlace gRPC]:', error.message);
    });

    // Simulación continua e infinita para que el frontend nunca se congele
    let sequence = 0;
    setInterval(() => {
      sequence++;
      
      const isCriticalEvent = Math.random() > 0.65;
      const simulatedHeartRate = isCriticalEvent 
        ? Math.floor(Math.random() * (155 - 125 + 1)) + 125 
        : Math.floor(Math.random() * (92 - 68 + 1)) + 68;
        
      const simulatedOxygen = simulatedHeartRate > 120 
        ? Math.floor(Math.random() * (87 - 80 + 1)) + 80 
        : Math.floor(Math.random() * (99 - 95 + 1)) + 95;

      const payload = {
        ambulance_id: `AMB-UNIT-0${Math.floor(Math.random() * 5) + 1}`,
        heart_rate: simulatedHeartRate,
        ecg_voltage: Number((Math.random() * (1.8 - 1.1) + 1.1).toFixed(2)),
        blood_oxygen: simulatedOxygen,
        timestamp: Date.now(),
      };

      console.log(`[IoT Telemetry]: Paquete #${sequence} | Unidad: ${payload.ambulance_id} | Pulso: ${payload.heart_rate} bpm`);
      call.write(payload);
      ioInstance.emit('vital-signs-update', payload);

    }, 3000);
  }
}

io.on('connection', (socket: any) => {
  console.log('[Frontend Conectado]: Personal médico en línea.');
  socket.on('disconnect', () => {
    console.log('[Frontend Desconectado].');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[Hospital Dashboard]: Servidor web corriendo en http://localhost:${PORT}`);
  const manager = new HospitalDashboardManager();
  manager.simulateAmbulanceTelemetry(io);
});