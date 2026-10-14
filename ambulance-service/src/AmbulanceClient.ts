import * as grpc from '@grpc/grpc-js';
import { ContractLoader } from './ContractLoader';
import { VitalSignsSimulator, type SimulatedReading } from './VitalSignsSimulator';
import type { AmbulanceSyncServiceClient } from './generated/neurahealth/AmbulanceSyncService';
import type { HospitalAlertResponse__Output } from './generated/neurahealth/HospitalAlertResponse';
import type { VitalSignsRequest } from './generated/neurahealth/VitalSignsRequest';

type VitalSignsChannel = grpc.ClientDuplexStream<VitalSignsRequest, HospitalAlertResponse__Output>;

/**
 * Clase POO que representa el dispositivo inteligente de UNA ambulancia.
 * Abre un canal de streaming bidireccional con el hospital y lo mantiene
 * vivo durante todo el traslado del paciente.
 */
export class AmbulanceClient {
  private channel: VitalSignsChannel | null = null;
  private sequence = 0;
  private isActive = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private latestResponse: HospitalAlertResponse__Output | null = null;

  constructor(
    private readonly hospitalClient: AmbulanceSyncServiceClient,
    public readonly ambulanceId: string,
    public readonly patientId: string,
  ) {}

  public get packetsSent(): number {
    return this.sequence;
  }

  public get lastHospitalResponse(): HospitalAlertResponse__Output | null {
    return this.latestResponse;
  }

  public startTransmission(): void {
    this.isActive = true;
    this.openChannel();
  }

  public send(reading: SimulatedReading): void {
    if (!this.channel || !this.isActive) return;

    this.sequence++;
    this.channel.write({
      ambulance_id: this.ambulanceId,
      patient_id: this.patientId,
      sequence: this.sequence,
      timestamp: Date.now(),
      ...reading,
    });
  }

  public stopTransmission(): void {
    this.isActive = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.channel?.end();
    this.channel = null;
  }

  private openChannel(): void {
    // Si el hospital aún no arrancó, el canal falla con UNAVAILABLE y se reintenta
    const channel = this.hospitalClient.StreamVitalSigns();
    this.channel = channel;

    // Escuchar las respuestas del hospital en tiempo real (mismo canal)
    channel.on('data', (response: HospitalAlertResponse__Output) => {
      this.latestResponse = response;
      if (response.severity === 'SEVERITY_CRITICAL' || response.severity === 'SEVERITY_HIGH') {
        console.log(`[${this.ambulanceId}] Hospital indica ${response.severity}: ${response.recommended_action}`);
      }
    });

    channel.on('error', (error: grpc.ServiceError) => {
      if (error.code === grpc.status.CANCELLED || !this.isActive) return;
      console.error(`[${this.ambulanceId}] Error de conexión con el hospital: ${error.details}. Reintentando...`);
      this.scheduleReconnect();
    });

    channel.on('end', () => {
      if (this.isActive && this.channel === channel) this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    this.channel = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.isActive) this.openChannel();
    }, 2000);
  }
}

/**
 * Modo demostración independiente (comportamiento original del taller):
 * `node dist/AmbulanceClient.js` envía 8 paquetes y en el 4.º simula una
 * anomalía cardíaca para ver la alerta crítica en la consola.
 */
function runStandaloneDemo(): void {
  const contracts = ContractLoader.load();
  const address = process.env.HOSPITAL_GRPC_ADDRESS ?? 'localhost:50051';
  const hospitalClient = new contracts.AmbulanceSyncService(address, grpc.credentials.createInsecure());
  const simulator = new VitalSignsSimulator('CLINICAL_SCENARIO_STABLE');
  const ambulance = new AmbulanceClient(hospitalClient, 'AMB-UNIT-07', 'PAC-0007');

  console.log(`[Ambulance Client]: Transmitiendo la unidad ${ambulance.ambulanceId} hacia ${address}...`);
  ambulance.startTransmission();

  let packet = 0;
  const interval = setInterval(() => {
    packet++;
    simulator.setScenario(packet === 4 ? 'CLINICAL_SCENARIO_CARDIAC_ARREST' : 'CLINICAL_SCENARIO_STABLE');
    const reading = simulator.nextReading();
    console.log(`[Enviando binario Protobuf] Paquete #${packet} → Pulso: ${reading.heart_rate} lpm | SpO2: ${reading.blood_oxygen} %`);
    ambulance.send(reading);

    setTimeout(() => {
      const response = ambulance.lastHospitalResponse;
      if (response) console.log(`   ↳ Hospital: [${response.severity}] ${response.message}`);
    }, 300);

    if (packet >= 8) {
      clearInterval(interval);
      setTimeout(() => {
        ambulance.stopTransmission();
        hospitalClient.close();
        console.log('[Ambulance Client]: Viaje finalizado. Canal de comunicación cerrado.');
      }, 500);
    }
  }, 2000);
}

if (require.main === module) {
  runStandaloneDemo();
}
