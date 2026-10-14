// Original file: ../proto/fleet.proto

import type { ClinicalScenario as _neurahealth_ClinicalScenario, ClinicalScenario__Output as _neurahealth_ClinicalScenario__Output } from '../neurahealth/ClinicalScenario';
import type { UnitStatus as _neurahealth_UnitStatus, UnitStatus__Output as _neurahealth_UnitStatus__Output } from '../neurahealth/UnitStatus';

export interface AmbulanceUnit {
  'ambulance_id'?: (string);
  'patient_id'?: (string);
  'patient_summary'?: (string);
  'origin'?: (string);
  'scenario'?: (_neurahealth_ClinicalScenario);
  'status'?: (_neurahealth_UnitStatus);
  'eta_seconds'?: (number);
  'packets_sent'?: (number);
}

export interface AmbulanceUnit__Output {
  'ambulance_id': (string);
  'patient_id': (string);
  'patient_summary': (string);
  'origin': (string);
  'scenario': (_neurahealth_ClinicalScenario__Output);
  'status': (_neurahealth_UnitStatus__Output);
  'eta_seconds': (number);
  'packets_sent': (number);
}
