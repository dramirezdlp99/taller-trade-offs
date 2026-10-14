import { AmbulanceFleet } from './AmbulanceFleet';
import { ContractLoader } from './ContractLoader';
import { FleetControlServer } from './FleetControlServer';

/**
 * Punto de entrada del microservicio de ambulancias.
 *  - Cliente gRPC  → hospital-service (streaming bidireccional por unidad)
 *  - Servidor gRPC → FleetControlService (lo consume el dashboard)
 *
 * Importante: NO transmite nada hasta que alguien inicia un turno, y el turno
 * se apaga solo al cumplir su duración máxima. Cero consumo "infinito".
 */
class AmbulanceServiceApp {
  private readonly contracts = ContractLoader.load();
  private readonly fleet = new AmbulanceFleet(
    this.contracts,
    process.env.HOSPITAL_GRPC_ADDRESS ?? 'localhost:50051',
    {
      tickMs: Number(process.env.FLEET_TICK_MS ?? 1500),
      simulatedSecondsPerTick: 6,
    },
  );
  private readonly controlServer = new FleetControlServer(
    this.contracts,
    this.fleet,
    process.env.FLEET_GRPC_PORT ?? '50052',
  );

  public run(): void {
    this.controlServer.start();
    console.log('[Ambulance Service]: En espera. El turno se inicia desde el dashboard.');

    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private shutdown(): void {
    console.log('[Ambulance Service]: Apagando de forma ordenada...');
    this.fleet.shutdown();
    this.controlServer.stop(() => process.exit(0));
  }
}

new AmbulanceServiceApp().run();
