// Original file: ../proto/monitoring.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { HospitalStatusRequest as _neurahealth_HospitalStatusRequest, HospitalStatusRequest__Output as _neurahealth_HospitalStatusRequest__Output } from '../neurahealth/HospitalStatusRequest';
import type { HospitalStatusResponse as _neurahealth_HospitalStatusResponse, HospitalStatusResponse__Output as _neurahealth_HospitalStatusResponse__Output } from '../neurahealth/HospitalStatusResponse';
import type { TelemetryEvent as _neurahealth_TelemetryEvent, TelemetryEvent__Output as _neurahealth_TelemetryEvent__Output } from '../neurahealth/TelemetryEvent';
import type { WatchTelemetryRequest as _neurahealth_WatchTelemetryRequest, WatchTelemetryRequest__Output as _neurahealth_WatchTelemetryRequest__Output } from '../neurahealth/WatchTelemetryRequest';

export interface HospitalMonitoringServiceClient extends grpc.Client {
  GetHospitalStatus(argument: _neurahealth_HospitalStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  GetHospitalStatus(argument: _neurahealth_HospitalStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  GetHospitalStatus(argument: _neurahealth_HospitalStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  GetHospitalStatus(argument: _neurahealth_HospitalStatusRequest, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  getHospitalStatus(argument: _neurahealth_HospitalStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  getHospitalStatus(argument: _neurahealth_HospitalStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  getHospitalStatus(argument: _neurahealth_HospitalStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  getHospitalStatus(argument: _neurahealth_HospitalStatusRequest, callback: grpc.requestCallback<_neurahealth_HospitalStatusResponse__Output>): grpc.ClientUnaryCall;
  
  WatchTelemetry(argument: _neurahealth_WatchTelemetryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_neurahealth_TelemetryEvent__Output>;
  WatchTelemetry(argument: _neurahealth_WatchTelemetryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_neurahealth_TelemetryEvent__Output>;
  watchTelemetry(argument: _neurahealth_WatchTelemetryRequest, metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientReadableStream<_neurahealth_TelemetryEvent__Output>;
  watchTelemetry(argument: _neurahealth_WatchTelemetryRequest, options?: grpc.CallOptions): grpc.ClientReadableStream<_neurahealth_TelemetryEvent__Output>;
  
}

export interface HospitalMonitoringServiceHandlers extends grpc.UntypedServiceImplementation {
  GetHospitalStatus: grpc.handleUnaryCall<_neurahealth_HospitalStatusRequest__Output, _neurahealth_HospitalStatusResponse>;
  
  WatchTelemetry: grpc.handleServerStreamingCall<_neurahealth_WatchTelemetryRequest__Output, _neurahealth_TelemetryEvent>;
  
}

export interface HospitalMonitoringServiceDefinition extends grpc.ServiceDefinition {
  GetHospitalStatus: MethodDefinition<_neurahealth_HospitalStatusRequest, _neurahealth_HospitalStatusResponse, _neurahealth_HospitalStatusRequest__Output, _neurahealth_HospitalStatusResponse__Output>
  WatchTelemetry: MethodDefinition<_neurahealth_WatchTelemetryRequest, _neurahealth_TelemetryEvent, _neurahealth_WatchTelemetryRequest__Output, _neurahealth_TelemetryEvent__Output>
}
