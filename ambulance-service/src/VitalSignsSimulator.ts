import type { CardiacRhythm__Output } from './generated/neurahealth/CardiacRhythm';
import type { ClinicalScenario__Output } from './generated/neurahealth/ClinicalScenario';

type PhysiologicalScenario = Exclude<
  ClinicalScenario__Output,
  'CLINICAL_SCENARIO_UNSPECIFIED' | 'CLINICAL_SCENARIO_SENSOR_FAULT'
>;

interface VitalState {
  heartRate: number;
  bloodOxygen: number;
  systolic: number;
  diastolic: number;
  temperature: number;
  respiratoryRate: number;
}

interface ScenarioProfile extends VitalState {
  rhythm: CardiacRhythm__Output;
}

export interface SimulatedReading {
  heart_rate: number;
  ecg_voltage: number;
  blood_oxygen: number;
  systolic_pressure: number;
  diastolic_pressure: number;
  body_temperature: number;
  respiratory_rate: number;
  rhythm: CardiacRhythm__Output | 'CARDIAC_RHYTHM_UNSPECIFIED';
}

/**
 * Genera signos vitales realistas: cada lectura se acerca poco a poco al
 * perfil del escenario clínico (no saltos bruscos) y añade ruido de sensor.
 */
export class VitalSignsSimulator {
  private static readonly PROFILES: Record<PhysiologicalScenario, ScenarioProfile> = {
    CLINICAL_SCENARIO_STABLE: {
      heartRate: 78, bloodOxygen: 97.5, systolic: 122, diastolic: 78,
      temperature: 36.8, respiratoryRate: 16, rhythm: 'CARDIAC_RHYTHM_SINUS',
    },
    CLINICAL_SCENARIO_TACHYARRHYTHMIA: {
      heartRate: 158, bloodOxygen: 94, systolic: 104, diastolic: 68,
      temperature: 37.0, respiratoryRate: 22, rhythm: 'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION',
    },
    CLINICAL_SCENARIO_HYPOXIA: {
      heartRate: 112, bloodOxygen: 85, systolic: 138, diastolic: 86,
      temperature: 37.4, respiratoryRate: 29, rhythm: 'CARDIAC_RHYTHM_SINUS_TACHYCARDIA',
    },
    CLINICAL_SCENARIO_SEPTIC_SHOCK: {
      heartRate: 128, bloodOxygen: 92, systolic: 82, diastolic: 46,
      temperature: 39.4, respiratoryRate: 26, rhythm: 'CARDIAC_RHYTHM_SINUS_TACHYCARDIA',
    },
    CLINICAL_SCENARIO_CARDIAC_ARREST: {
      heartRate: 0, bloodOxygen: 72, systolic: 40, diastolic: 20,
      temperature: 36.2, respiratoryRate: 4, rhythm: 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION',
    },
  };

  private static readonly FAULT_TICKS = 4;

  private state: VitalState;
  private currentScenario: ClinicalScenario__Output;
  private scenarioBeforeFault: PhysiologicalScenario = 'CLINICAL_SCENARIO_STABLE';
  private faultTicksLeft = 0;

  constructor(initialScenario: ClinicalScenario__Output = 'CLINICAL_SCENARIO_STABLE') {
    this.state = { ...VitalSignsSimulator.PROFILES.CLINICAL_SCENARIO_STABLE };
    this.currentScenario = 'CLINICAL_SCENARIO_STABLE';
    this.setScenario(initialScenario);
  }

  public get scenario(): ClinicalScenario__Output {
    return this.currentScenario;
  }

  public setScenario(scenario: ClinicalScenario__Output): void {
    if (scenario === 'CLINICAL_SCENARIO_UNSPECIFIED') return;

    if (scenario === 'CLINICAL_SCENARIO_SENSOR_FAULT') {
      // Se recuerda el escenario real para volver a él cuando pase la falla
      if (this.currentScenario !== 'CLINICAL_SCENARIO_SENSOR_FAULT') {
        this.scenarioBeforeFault = this.currentScenario as PhysiologicalScenario;
      }
      this.faultTicksLeft = VitalSignsSimulator.FAULT_TICKS;
    }
    this.currentScenario = scenario;
  }

  public nextReading(): SimulatedReading {
    if (this.currentScenario === 'CLINICAL_SCENARIO_SENSOR_FAULT') {
      return this.nextFaultyReading();
    }

    const profile = VitalSignsSimulator.PROFILES[this.currentScenario as PhysiologicalScenario];
    const isArrest = profile.rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION';

    this.state = {
      heartRate: isArrest ? 0 : this.drift(this.state.heartRate, profile.heartRate, 3),
      bloodOxygen: Math.min(100, this.drift(this.state.bloodOxygen, profile.bloodOxygen, 0.6)),
      systolic: this.drift(this.state.systolic, profile.systolic, 3),
      diastolic: this.drift(this.state.diastolic, profile.diastolic, 2),
      temperature: this.drift(this.state.temperature, profile.temperature, 0.05),
      respiratoryRate: this.drift(this.state.respiratoryRate, profile.respiratoryRate, 1),
    };

    return {
      heart_rate: Math.round(this.state.heartRate),
      ecg_voltage: this.ecgAmplitude(profile.rhythm),
      blood_oxygen: Math.round(this.state.bloodOxygen),
      systolic_pressure: Math.round(this.state.systolic),
      diastolic_pressure: Math.round(Math.min(this.state.diastolic, this.state.systolic - 10)),
      body_temperature: Number(this.state.temperature.toFixed(1)),
      respiratory_rate: Math.max(0, Math.round(this.state.respiratoryRate)),
      rhythm: profile.rhythm,
    };
  }

  /**
   * Falla de sensor: valores que Protobuf acepta sin problema (son números)
   * pero que son clínicamente imposibles. El hospital debe rechazarlos.
   */
  private nextFaultyReading(): SimulatedReading {
    this.faultTicksLeft--;
    if (this.faultTicksLeft <= 0) {
      this.currentScenario = this.scenarioBeforeFault;
    }

    const variants: SimulatedReading[] = [
      { heart_rate: -12, ecg_voltage: 9.9, blood_oxygen: 140, systolic_pressure: 120, diastolic_pressure: 80,
        body_temperature: 36.9, respiratory_rate: 16, rhythm: 'CARDIAC_RHYTHM_SINUS' },
      { heart_rate: 80, ecg_voltage: 1.2, blood_oxygen: 97, systolic_pressure: 70, diastolic_pressure: 130,
        body_temperature: 52.3, respiratory_rate: 16, rhythm: 'CARDIAC_RHYTHM_SINUS' },
      { heart_rate: 999, ecg_voltage: 0, blood_oxygen: 0, systolic_pressure: 0, diastolic_pressure: 0,
        body_temperature: 0, respiratory_rate: 0, rhythm: 'CARDIAC_RHYTHM_UNSPECIFIED' },
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }

  // Se acerca un 30 % al objetivo y suma ruido aleatorio
  private drift(current: number, target: number, noise: number): number {
    return current + (target - current) * 0.3 + (Math.random() * 2 - 1) * noise;
  }

  private ecgAmplitude(rhythm: CardiacRhythm__Output): number {
    const base = rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION' ? 0.5 : 1.2;
    return Number((base + (Math.random() * 0.3 - 0.15)).toFixed(2));
  }
}
