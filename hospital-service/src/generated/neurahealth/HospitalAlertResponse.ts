// Original file: ../proto/ambulance.proto

import type { Severity as _neurahealth_Severity, Severity__Output as _neurahealth_Severity__Output } from '../neurahealth/Severity';
import type { Long } from '@grpc/proto-loader';

export interface HospitalAlertResponse {
  'alert_id'?: (string);
  'severity'?: (_neurahealth_Severity);
  'message'?: (string);
  'timestamp'?: (number | string | Long);
  'ambulance_id'?: (string);
  'triage_score'?: (number);
  'recommended_action'?: (string);
  'receiving_unit'?: (string);
}

export interface HospitalAlertResponse__Output {
  'alert_id': (string);
  'severity': (_neurahealth_Severity__Output);
  'message': (string);
  'timestamp': (string);
  'ambulance_id': (string);
  'triage_score': (number);
  'recommended_action': (string);
  'receiving_unit': (string);
}
