import type { FleetControlClient } from './FleetControlClient';

/**
 * Resuelve el problema de la simulación "infinita":
 *  - Cuando entra el primer visitante, inicia un turno automáticamente.
 *  - Cuando se va el último, espera un poco y apaga el turno.
 * Así el contenedor solo trabaja mientras alguien está mirando.
 */
export class ShiftAutopilot {
  private viewers = 0;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly fleet: FleetControlClient,
    private readonly autoStart: boolean,
    private readonly idleStopMs: number,
    private readonly shiftDurationSeconds: number,
  ) {}

  public get viewerCount(): number {
    return this.viewers;
  }

  public async viewerJoined(): Promise<void> {
    this.viewers++;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.viewers !== 1 || !this.autoStart) return;

    try {
      const status = await this.fleet.getStatus();
      if (!status.is_running) {
        await this.fleet.startShift(4, this.shiftDurationSeconds);
        console.log('[Autopilot]: Primer visitante conectado → turno iniciado automáticamente.');
      }
    } catch {
      console.warn('[Autopilot]: ambulance-service todavía no responde; el turno se puede iniciar a mano.');
    }
  }

  public viewerLeft(): void {
    this.viewers = Math.max(0, this.viewers - 1);
    if (this.viewers > 0) return;

    this.idleTimer = setTimeout(async () => {
      try {
        await this.fleet.stopShift('No hay nadie mirando el dashboard (ahorro de recursos).');
        console.log('[Autopilot]: Sin visitantes → turno detenido.');
      } catch {
        // Si el servicio no responde no hay nada que apagar
      }
    }, this.idleStopMs);
  }
}
