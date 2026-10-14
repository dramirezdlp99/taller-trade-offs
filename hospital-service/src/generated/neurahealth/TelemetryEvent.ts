// Original file: ../proto/monitoring.proto

import type { VitalsSnapshot as _neurahealth_VitalsSnapshot, VitalsSnapshot__Output as _neurahealth_VitalsSnapshot__Output } from '../neurahealth/VitalsSnapshot';
import type { HospitalAlertResponse as _neurahealth_HospitalAlertResponse, HospitalAlertResponse__Output as _neurahealth_HospitalAlertResponse__Output } from '../neurahealth/HospitalAlertResponse';
import type { RejectedPacket as _neurahealth_RejectedPacket, RejectedPacket__Output as _neurahealth_RejectedPacket__Output } from '../neurahealth/RejectedPacket';
import type { TransportMetrics as _neurahealth_TransportMetrics, TransportMetrics__Output as _neurahealth_TransportMetrics__Output } from '../neurahealth/TransportMetrics';
import type { Long } from '@grpc/proto-loader';

export interface TelemetryEvent {
  'snapshot'?: (_neurahealth_VitalsSnapshot | null);
  'alert'?: (_neurahealth_HospitalAlertResponse | null);
  'rejected'?: (_neurahealth_RejectedPacket | null);
  'metrics'?: (_neurahealth_TransportMetrics | null);
  'emitted_at'?: (number | string | Long);
  'payload'?: "snapshot"|"alert"|"rejected";
}

export interface TelemetryEvent__Output {
  'snapshot'?: (_neurahealth_VitalsSnapshot__Output | null);
  'alert'?: (_neurahealth_HospitalAlertResponse__Output | null);
  'rejected'?: (_neurahealth_RejectedPacket__Output | null);
  'metrics': (_neurahealth_TransportMetrics__Output | null);
  'emitted_at': (string);
  'payload'?: "snapshot"|"alert"|"rejected";
}
