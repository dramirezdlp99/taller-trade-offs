// Original file: ../proto/ambulance.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { HospitalAlertResponse as _neurahealth_HospitalAlertResponse, HospitalAlertResponse__Output as _neurahealth_HospitalAlertResponse__Output } from '../neurahealth/HospitalAlertResponse';
import type { VitalSignsRequest as _neurahealth_VitalSignsRequest, VitalSignsRequest__Output as _neurahealth_VitalSignsRequest__Output } from '../neurahealth/VitalSignsRequest';

export interface AmbulanceSyncServiceClient extends grpc.Client {
  StreamVitalSigns(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_neurahealth_VitalSignsRequest, _neurahealth_HospitalAlertResponse__Output>;
  StreamVitalSigns(options?: grpc.CallOptions): grpc.ClientDuplexStream<_neurahealth_VitalSignsRequest, _neurahealth_HospitalAlertResponse__Output>;
  streamVitalSigns(metadata: grpc.Metadata, options?: grpc.CallOptions): grpc.ClientDuplexStream<_neurahealth_VitalSignsRequest, _neurahealth_HospitalAlertResponse__Output>;
  streamVitalSigns(options?: grpc.CallOptions): grpc.ClientDuplexStream<_neurahealth_VitalSignsRequest, _neurahealth_HospitalAlertResponse__Output>;
  
}

export interface AmbulanceSyncServiceHandlers extends grpc.UntypedServiceImplementation {
  StreamVitalSigns: grpc.handleBidiStreamingCall<_neurahealth_VitalSignsRequest__Output, _neurahealth_HospitalAlertResponse>;
  
}

export interface AmbulanceSyncServiceDefinition extends grpc.ServiceDefinition {
  StreamVitalSigns: MethodDefinition<_neurahealth_VitalSignsRequest, _neurahealth_HospitalAlertResponse, _neurahealth_VitalSignsRequest__Output, _neurahealth_HospitalAlertResponse__Output>
}
