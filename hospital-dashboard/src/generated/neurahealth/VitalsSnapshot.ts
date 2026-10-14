// Original file: ../proto/monitoring.proto

import type { VitalSignsRequest as _neurahealth_VitalSignsRequest, VitalSignsRequest__Output as _neurahealth_VitalSignsRequest__Output } from '../neurahealth/VitalSignsRequest';
import type { Severity as _neurahealth_Severity, Severity__Output as _neurahealth_Severity__Output } from '../neurahealth/Severity';

export interface VitalsSnapshot {
  'vitals'?: (_neurahealth_VitalSignsRequest | null);
  'triage_score'?: (number);
  'severity'?: (_neurahealth_Severity);
}

export interface VitalsSnapshot__Output {
  'vitals': (_neurahealth_VitalSignsRequest__Output | null);
  'triage_score': (number);
  'severity': (_neurahealth_Severity__Output);
}
