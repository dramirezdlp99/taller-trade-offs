// Original file: ../proto/fleet.proto

import type { ClinicalScenario as _neurahealth_ClinicalScenario, ClinicalScenario__Output as _neurahealth_ClinicalScenario__Output } from '../neurahealth/ClinicalScenario';

export interface TriggerScenarioRequest {
  'ambulance_id'?: (string);
  'scenario'?: (_neurahealth_ClinicalScenario);
}

export interface TriggerScenarioRequest__Output {
  'ambulance_id': (string);
  'scenario': (_neurahealth_ClinicalScenario__Output);
}
