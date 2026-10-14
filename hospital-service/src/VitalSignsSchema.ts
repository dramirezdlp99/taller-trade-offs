import { z } from 'zod';

// Mensajes de error de Zod en español
z.config(z.locales.es());

/**
 * "La falsa seguridad de TypeScript": los tipos desaparecen al compilar
 * (type erasure). Protobuf garantiza la FORMA del mensaje, pero no que los
 * valores tengan sentido clínico (un SpO2 de 140 % es un número válido para
 * Protobuf). Por eso cada paquete se PARSEA con Zod antes de usarlo.
 */
export const VitalSignsSchema = z
  .object({
    ambulance_id: z.string().regex(/^AMB-[A-Z0-9-]+$/, 'Identificador de ambulancia inválido'),
    patient_id: z.string().min(1, 'Falta el identificador del paciente'),
    heart_rate: z.number().min(0).max(300),
    ecg_voltage: z.number().min(-5).max(5),
    blood_oxygen: z.number().min(0).max(100),
    systolic_pressure: z.number().int().min(0).max(300),
    diastolic_pressure: z.number().int().min(0).max(200),
    body_temperature: z.number().min(25).max(45),
    respiratory_rate: z.number().int().min(0).max(80),
    timestamp: z.coerce.number().int().positive(),
    sequence: z.number().int().nonnegative(),
    rhythm: z.enum(
      [
        'CARDIAC_RHYTHM_SINUS',
        'CARDIAC_RHYTHM_SINUS_TACHYCARDIA',
        'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION',
        'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION',
      ],
      'Ritmo cardíaco no reconocido',
    ),
  })
  .refine((vitals) => vitals.systolic_pressure === 0 || vitals.diastolic_pressure < vitals.systolic_pressure, {
    message: 'La presión diastólica no puede ser mayor que la sistólica',
    path: ['diastolic_pressure'],
  });

// Tipo inferido del esquema: validación y tipo nunca se desincronizan
export type VitalSigns = z.infer<typeof VitalSignsSchema>;

/**
 * Convierte los errores de Zod en un texto corto y legible para la bitácora.
 */
export class ValidationReport {
  public static describe(error: z.ZodError): string {
    return error.issues
      .slice(0, 2)
      .map((issue) => `${issue.path.join('.') || 'paquete'}: ${issue.message}`)
      .join(' | ');
  }
}
