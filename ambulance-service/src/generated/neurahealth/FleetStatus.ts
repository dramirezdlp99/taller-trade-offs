// Original file: ../proto/fleet.proto

import type { AmbulanceUnit as _neurahealth_AmbulanceUnit, AmbulanceUnit__Output as _neurahealth_AmbulanceUnit__Output } from '../neurahealth/AmbulanceUnit';
import type { Long } from '@grpc/proto-loader';

export interface FleetStatus {
  'is_running'?: (boolean);
  'units'?: (_neurahealth_AmbulanceUnit)[];
  'started_at'?: (number | string | Long);
  'ends_at'?: (number | string | Long);
  'message'?: (string);
}

export interface FleetStatus__Output {
  'is_running': (boolean);
  'units': (_neurahealth_AmbulanceUnit__Output)[];
  'started_at': (string);
  'ends_at': (string);
  'message': (string);
}
