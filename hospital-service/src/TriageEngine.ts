import type { Severity__Output } from './generated/neurahealth/Severity';
import type { VitalSigns } from './VitalSignsSchema';

export interface TriageResult {
  score: number;
  severity: Severity__Output;
  findings: string[];
  recommendedAction: string;
  receivingUnit: string;
}

interface ParameterScore {
  points: number;
  finding: string;
}

/**
 * Motor de triaje prehospitalario basado en la escala NEWS2
 * (National Early Warning Score 2, Royal College of Physicians).
 * Uso académico: NO es un dispositivo médico.
 */
export class TriageEngine {
  private static readonly ACTIONS: Record<Severity__Output, string> = {
    SEVERITY_UNSPECIFIED: 'Sin evaluación disponible.',
    SEVERITY_LOW: 'Monitorización de rutina durante el traslado.',
    SEVERITY_MEDIUM: 'Valoración urgente por el médico de urgencias al llegar.',
    SEVERITY_HIGH: 'Preparar box de críticos y avisar al equipo de urgencias.',
    SEVERITY_CRITICAL: 'Activar el equipo de reanimación: respuesta inmediata.',
  };

  public evaluate(vitals: VitalSigns): TriageResult {
    const isCardiacArrest = vitals.rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION';

    const parameters: ParameterScore[] = [
      this.scoreRespiratoryRate(vitals.respiratory_rate),
      this.scoreOxygen(vitals.blood_oxygen),
      this.scoreSystolicPressure(vitals.systolic_pressure),
      this.scoreHeartRate(vitals.heart_rate, isCardiacArrest),
      this.scoreTemperature(vitals.body_temperature),
    ];

    const score = parameters.reduce((total, parameter) => total + parameter.points, 0);
    const hasRedFlag = parameters.some((parameter) => parameter.points === 3);
    const findings = parameters.filter((parameter) => parameter.points > 0).map((parameter) => parameter.finding);

    if (isCardiacArrest) {
      findings.unshift('Fibrilación ventricular');
    }
    if (vitals.rhythm === 'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION') {
      findings.push('Fibrilación auricular');
    }

    const severity = this.classify(score, hasRedFlag, isCardiacArrest);

    return {
      score,
      severity,
      findings,
      recommendedAction: TriageEngine.ACTIONS[severity],
      receivingUnit: this.chooseReceivingUnit(vitals, severity, isCardiacArrest),
    };
  }

  private classify(score: number, hasRedFlag: boolean, isCardiacArrest: boolean): Severity__Output {
    if (isCardiacArrest || score >= 7) return 'SEVERITY_CRITICAL';
    if (score >= 5) return 'SEVERITY_HIGH';
    if (hasRedFlag) return 'SEVERITY_MEDIUM';
    return 'SEVERITY_LOW';
  }

  private chooseReceivingUnit(vitals: VitalSigns, severity: Severity__Output, isCardiacArrest: boolean): string {
    if (isCardiacArrest) return 'Sala de reanimación (código azul)';
    if (vitals.blood_oxygen < 90) return 'Reanimación respiratoria';
    if (vitals.systolic_pressure < 95 && vitals.body_temperature >= 38) return 'Box de críticos (código sepsis)';
    if (vitals.heart_rate >= 130 || vitals.rhythm === 'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION') {
      return 'Unidad de dolor torácico';
    }
    return severity === 'SEVERITY_LOW' ? 'Urgencias generales' : 'Box de observación';
  }

  private scoreRespiratoryRate(rate: number): ParameterScore {
    const finding = `FR ${rate} rpm`;
    if (rate <= 8) return { points: 3, finding };
    if (rate <= 11) return { points: 1, finding };
    if (rate <= 20) return { points: 0, finding };
    if (rate <= 24) return { points: 2, finding };
    return { points: 3, finding };
  }

  private scoreOxygen(saturation: number): ParameterScore {
    const finding = `SpO2 ${Math.round(saturation)} %`;
    if (saturation <= 91) return { points: 3, finding };
    if (saturation <= 93) return { points: 2, finding };
    if (saturation <= 95) return { points: 1, finding };
    return { points: 0, finding };
  }

  private scoreSystolicPressure(systolic: number): ParameterScore {
    const finding = `PAS ${systolic} mmHg`;
    if (systolic <= 90) return { points: 3, finding };
    if (systolic <= 100) return { points: 2, finding };
    if (systolic <= 110) return { points: 1, finding };
    if (systolic <= 219) return { points: 0, finding };
    return { points: 3, finding };
  }

  private scoreHeartRate(rate: number, isCardiacArrest: boolean): ParameterScore {
    const finding = isCardiacArrest ? 'Sin pulso palpable' : `FC ${Math.round(rate)} lpm`;
    if (isCardiacArrest || rate <= 40) return { points: 3, finding };
    if (rate <= 50) return { points: 1, finding };
    if (rate <= 90) return { points: 0, finding };
    if (rate <= 110) return { points: 1, finding };
    if (rate <= 130) return { points: 2, finding };
    return { points: 3, finding };
  }

  private scoreTemperature(temperature: number): ParameterScore {
    const finding = `T ${temperature.toFixed(1)} °C`;
    if (temperature <= 35) return { points: 3, finding };
    if (temperature <= 36) return { points: 1, finding };
    if (temperature <= 38) return { points: 0, finding };
    if (temperature <= 39) return { points: 1, finding };
    return { points: 2, finding };
  }
}
