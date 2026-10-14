import type { ClinicalScenario__Output } from './generated/neurahealth/ClinicalScenario';

export interface PatientCase {
  summary: string;
  initialScenario: ClinicalScenario__Output;
}

/**
 * Casos clínicos ficticios para alimentar el simulador.
 */
export class PatientCatalog {
  private static readonly CASES: PatientCase[] = [
    { summary: 'Hombre, 64 años · dolor torácico opresivo', initialScenario: 'CLINICAL_SCENARIO_TACHYARRHYTHMIA' },
    { summary: 'Mujer, 71 años · EPOC con dificultad respiratoria', initialScenario: 'CLINICAL_SCENARIO_HYPOXIA' },
    { summary: 'Hombre, 58 años · fiebre alta y confusión', initialScenario: 'CLINICAL_SCENARIO_SEPTIC_SHOCK' },
    { summary: 'Mujer, 34 años · accidente de tránsito, consciente', initialScenario: 'CLINICAL_SCENARIO_STABLE' },
    { summary: 'Hombre, 22 años · fractura cerrada de tibia', initialScenario: 'CLINICAL_SCENARIO_STABLE' },
    { summary: 'Mujer, 80 años · caída en casa', initialScenario: 'CLINICAL_SCENARIO_STABLE' },
    { summary: 'Hombre, 49 años · palpitaciones y mareo', initialScenario: 'CLINICAL_SCENARIO_TACHYARRHYTHMIA' },
    { summary: 'Mujer, 55 años · síncope en la calle', initialScenario: 'CLINICAL_SCENARIO_STABLE' },
    { summary: 'Hombre, 67 años · diabético, decaimiento', initialScenario: 'CLINICAL_SCENARIO_STABLE' },
    { summary: 'Mujer, 29 años · crisis asmática', initialScenario: 'CLINICAL_SCENARIO_HYPOXIA' },
  ];

  private static readonly ORIGINS = [
    'Chapinero', 'Suba', 'Kennedy', 'Usaquén', 'Engativá',
    'Teusaquillo', 'Bosa', 'Fontibón', 'La Candelaria', 'Ciudad Bolívar',
  ];

  public static randomCase(): PatientCase {
    return PatientCatalog.pick(PatientCatalog.CASES);
  }

  public static randomOrigin(): string {
    return PatientCatalog.pick(PatientCatalog.ORIGINS);
  }

  public static newPatientId(): string {
    return `PAC-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private static pick<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}
