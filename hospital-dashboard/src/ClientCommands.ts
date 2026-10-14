import { z } from 'zod';

z.config(z.locales.es());

/**
 * Lo que llega desde el navegador NUNCA es confiable: se parsea con Zod
 * antes de convertirlo en una llamada gRPC.
 */
export const StartShiftCommand = z.object({
  unitCount: z.number().int().min(1).max(6).default(4),
});

export const StopShiftCommand = z.object({}).optional();

export const ScenarioCommand = z.object({
  ambulanceId: z.string().regex(/^AMB-[A-Z0-9-]+$/, 'Unidad no válida'),
  scenario: z.enum([
    'CLINICAL_SCENARIO_STABLE',
    'CLINICAL_SCENARIO_TACHYARRHYTHMIA',
    'CLINICAL_SCENARIO_HYPOXIA',
    'CLINICAL_SCENARIO_SEPTIC_SHOCK',
    'CLINICAL_SCENARIO_CARDIAC_ARREST',
    'CLINICAL_SCENARIO_SENSOR_FAULT',
  ]),
});

export interface CommandResult {
  ok: boolean;
  message: string;
}
