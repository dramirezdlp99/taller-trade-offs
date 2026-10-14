// Original file: ../proto/monitoring.proto

import type { Long } from '@grpc/proto-loader';

export interface HospitalStatusResponse {
  'active_streams'?: (number);
  'total_messages'?: (number | string | Long);
  'total_alerts'?: (number | string | Long);
  'rejected_messages'?: (number | string | Long);
  'protobuf_bytes_total'?: (number | string | Long);
  'json_bytes_total'?: (number | string | Long);
  'uptime_seconds'?: (number | string | Long);
  'watchers'?: (number);
}

export interface HospitalStatusResponse__Output {
  'active_streams': (number);
  'total_messages': (string);
  'total_alerts': (string);
  'rejected_messages': (string);
  'protobuf_bytes_total': (string);
  'json_bytes_total': (string);
  'uptime_seconds': (string);
  'watchers': (number);
}
