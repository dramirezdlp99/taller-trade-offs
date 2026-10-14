// Original file: ../proto/monitoring.proto

import type { Long } from '@grpc/proto-loader';

export interface RejectedPacket {
  'ambulance_id'?: (string);
  'reason'?: (string);
  'timestamp'?: (number | string | Long);
}

export interface RejectedPacket__Output {
  'ambulance_id': (string);
  'reason': (string);
  'timestamp': (string);
}
