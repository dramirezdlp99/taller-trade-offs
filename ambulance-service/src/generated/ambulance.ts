import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { AmbulanceSyncServiceClient as _neurahealth_AmbulanceSyncServiceClient, AmbulanceSyncServiceDefinition as _neurahealth_AmbulanceSyncServiceDefinition } from './neurahealth/AmbulanceSyncService';
import type { HospitalAlertResponse as _neurahealth_HospitalAlertResponse, HospitalAlertResponse__Output as _neurahealth_HospitalAlertResponse__Output } from './neurahealth/HospitalAlertResponse';
import type { VitalSignsRequest as _neurahealth_VitalSignsRequest, VitalSignsRequest__Output as _neurahealth_VitalSignsRequest__Output } from './neurahealth/VitalSignsRequest';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  neurahealth: {
    AmbulanceSyncService: SubtypeConstructor<typeof grpc.Client, _neurahealth_AmbulanceSyncServiceClient> & { service: _neurahealth_AmbulanceSyncServiceDefinition }
    CardiacRhythm: EnumTypeDefinition
    HospitalAlertResponse: MessageTypeDefinition<_neurahealth_HospitalAlertResponse, _neurahealth_HospitalAlertResponse__Output>
    Severity: EnumTypeDefinition
    VitalSignsRequest: MessageTypeDefinition<_neurahealth_VitalSignsRequest, _neurahealth_VitalSignsRequest__Output>
  }
}

