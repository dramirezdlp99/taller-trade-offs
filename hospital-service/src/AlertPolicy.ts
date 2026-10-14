import type { Severity__Output } from './generated/neurahealth/Severity';

export type AlertReason = 'connected' | 'worsened' | 'improved' | 'reminder';

export interface AlertDecision {
  publish: boolean;
  reason?: AlertReason;
}

/**
 * Decide cuándo un paquete merece una alerta visible en el dashboard.
 * Sin esta política, cada paquete generaría una alerta y la bitácora
 * se llenaría de ruido (problema que tenía la versión anterior).
 */
export class AlertPolicy {
  private static readonly RANK: Record<Severity__Output, number> = {
    SEVERITY_UNSPECIFIED: 0,
    SEVERITY_LOW: 1,
    SEVERITY_MEDIUM: 2,
    SEVERITY_HIGH: 3,
    SEVERITY_CRITICAL: 4,
  };

  private readonly lastSeverity = new Map<string, Severity__Output>();
  private readonly lastPublishedAt = new Map<string, number>();

  constructor(private readonly criticalReminderMs: number = 15_000) {}

  public decide(ambulanceId: string, severity: Severity__Output, now: number = Date.now()): AlertDecision {
    const previous = this.lastSeverity.get(ambulanceId);
    this.lastSeverity.set(ambulanceId, severity);

    if (previous === undefined) {
      return this.publish(ambulanceId, 'connected', now);
    }

    const delta = AlertPolicy.RANK[severity] - AlertPolicy.RANK[previous];
    if (delta > 0) return this.publish(ambulanceId, 'worsened', now);
    if (delta < 0) return this.publish(ambulanceId, 'improved', now);

    const lastPublished = this.lastPublishedAt.get(ambulanceId) ?? 0;
    if (severity === 'SEVERITY_CRITICAL' && now - lastPublished >= this.criticalReminderMs) {
      return this.publish(ambulanceId, 'reminder', now);
    }

    return { publish: false };
  }

  public forget(ambulanceId: string): void {
    this.lastSeverity.delete(ambulanceId);
    this.lastPublishedAt.delete(ambulanceId);
  }

  private publish(ambulanceId: string, reason: AlertReason, now: number): AlertDecision {
    this.lastPublishedAt.set(ambulanceId, now);
    return { publish: true, reason };
  }
}
