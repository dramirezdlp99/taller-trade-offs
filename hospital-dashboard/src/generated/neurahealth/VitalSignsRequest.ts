// Original file: ../proto/ambulance.proto

import type { CardiacRhythm as _neurahealth_CardiacRhythm, CardiacRhythm__Output as _neurahealth_CardiacRhythm__Output } from '../neurahealth/CardiacRhythm';
import type { Long } from '@grpc/proto-loader';

export interface VitalSignsRequest {
  'ambulance_id'?: (string);
  'heart_rate'?: (number | string);
  'ecg_voltage'?: (number | string);
  'blood_oxygen'?: (number | string);
  'timestamp'?: (number | string | Long);
  'systolic_pressure'?: (number);
  'diastolic_pressure'?: (number);
  'body_temperature'?: (number | string);
  'respiratory_rate'?: (number);
  'patient_id'?: (string);
  'sequence'?: (number);
  'rhythm'?: (_neurahealth_CardiacRhythm);
}

export interface VitalSignsRequest__Output {
  'ambulance_id': (string);
  'heart_rate': (number);
  'ecg_voltage': (number);
  'blood_oxygen': (number);
  'timestamp': (string);
  'systolic_pressure': (number);
  'diastolic_pressure': (number);
  'body_temperature': (number);
  'respiratory_rate': (number);
  'patient_id': (string);
  'sequence': (number);
  'rhythm': (_neurahealth_CardiacRhythm__Output);
}
