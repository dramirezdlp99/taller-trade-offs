import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { AmbulanceSyncServiceClient as _neurahealth_AmbulanceSyncServiceClient, AmbulanceSyncServiceDefinition as _neurahealth_AmbulanceSyncServiceDefinition } from './neurahealth/AmbulanceSyncService';
import type { HospitalAlertResponse as _neurahealth_HospitalAlertResponse, HospitalAlertResponse__Output as _neurahealth_HospitalAlertResponse__Output } from './neurahealth/HospitalAlertResponse';
import type { HospitalMonitoringServiceClient as _neurahealth_HospitalMonitoringServiceClient, HospitalMonitoringServiceDefinition as _neurahealth_HospitalMonitoringServiceDefinition } from './neurahealth/HospitalMonitoringService';
import type { HospitalStatusRequest as _neurahealth_HospitalStatusRequest, HospitalStatusRequest__Output as _neurahealth_HospitalStatusRequest__Output } from './neurahealth/HospitalStatusRequest';
import type { HospitalStatusResponse as _neurahealth_HospitalStatusResponse, HospitalStatusResponse__Output as _neurahealth_HospitalStatusResponse__Output } from './neurahealth/HospitalStatusResponse';
import type { RejectedPacket as _neurahealth_RejectedPacket, RejectedPacket__Output as _neurahealth_RejectedPacket__Output } from './neurahealth/RejectedPacket';
import type { TelemetryEvent as _neurahealth_TelemetryEvent, TelemetryEvent__Output as _neurahealth_TelemetryEvent__Output } from './neurahealth/TelemetryEvent';
import type { TransportMetrics as _neurahealth_TransportMetrics, TransportMetrics__Output as _neurahealth_TransportMetrics__Output } from './neurahealth/TransportMetrics';
import type { VitalSignsRequest as _neurahealth_VitalSignsRequest, VitalSignsRequest__Output as _neurahealth_VitalSignsRequest__Output } from './neurahealth/VitalSignsRequest';
import type { VitalsSnapshot as _neurahealth_VitalsSnapshot, VitalsSnapshot__Output as _neurahealth_VitalsSnapshot__Output } from './neurahealth/VitalsSnapshot';
import type { WatchTelemetryRequest as _neurahealth_WatchTelemetryRequest, WatchTelemetryRequest__Output as _neurahealth_WatchTelemetryRequest__Output } from './neurahealth/WatchTelemetryRequest';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  neurahealth: {
    AmbulanceSyncService: SubtypeConstructor<typeof grpc.Client, _neurahealth_AmbulanceSyncServiceClient> & { service: _neurahealth_AmbulanceSyncServiceDefinition }
    CardiacRhythm: EnumTypeDefinition
    HospitalAlertResponse: MessageTypeDefinition<_neurahealth_HospitalAlertResponse, _neurahealth_HospitalAlertResponse__Output>
    HospitalMonitoringService: SubtypeConstructor<typeof grpc.Client, _neurahealth_HospitalMonitoringServiceClient> & { service: _neurahealth_HospitalMonitoringServiceDefinition }
    HospitalStatusRequest: MessageTypeDefinition<_neurahealth_HospitalStatusRequest, _neurahealth_HospitalStatusRequest__Output>
    HospitalStatusResponse: MessageTypeDefinition<_neurahealth_HospitalStatusResponse, _neurahealth_HospitalStatusResponse__Output>
    RejectedPacket: MessageTypeDefinition<_neurahealth_RejectedPacket, _neurahealth_RejectedPacket__Output>
    Severity: EnumTypeDefinition
    TelemetryEvent: MessageTypeDefinition<_neurahealth_TelemetryEvent, _neurahealth_TelemetryEvent__Output>
    TransportMetrics: MessageTypeDefinition<_neurahealth_TransportMetrics, _neurahealth_TransportMetrics__Output>
    VitalSignsRequest: MessageTypeDefinition<_neurahealth_VitalSignsRequest, _neurahealth_VitalSignsRequest__Output>
    VitalsSnapshot: MessageTypeDefinition<_neurahealth_VitalsSnapshot, _neurahealth_VitalsSnapshot__Output>
    WatchTelemetryRequest: MessageTypeDefinition<_neurahealth_WatchTelemetryRequest, _neurahealth_WatchTelemetryRequest__Output>
  }
}

