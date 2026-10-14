import type * as grpc from '@grpc/grpc-js';
import type { EnumTypeDefinition, MessageTypeDefinition } from '@grpc/proto-loader';

import type { AmbulanceUnit as _neurahealth_AmbulanceUnit, AmbulanceUnit__Output as _neurahealth_AmbulanceUnit__Output } from './neurahealth/AmbulanceUnit';
import type { FleetControlServiceClient as _neurahealth_FleetControlServiceClient, FleetControlServiceDefinition as _neurahealth_FleetControlServiceDefinition } from './neurahealth/FleetControlService';
import type { FleetStatus as _neurahealth_FleetStatus, FleetStatus__Output as _neurahealth_FleetStatus__Output } from './neurahealth/FleetStatus';
import type { FleetStatusRequest as _neurahealth_FleetStatusRequest, FleetStatusRequest__Output as _neurahealth_FleetStatusRequest__Output } from './neurahealth/FleetStatusRequest';
import type { ScenarioAck as _neurahealth_ScenarioAck, ScenarioAck__Output as _neurahealth_ScenarioAck__Output } from './neurahealth/ScenarioAck';
import type { StartShiftRequest as _neurahealth_StartShiftRequest, StartShiftRequest__Output as _neurahealth_StartShiftRequest__Output } from './neurahealth/StartShiftRequest';
import type { StopShiftRequest as _neurahealth_StopShiftRequest, StopShiftRequest__Output as _neurahealth_StopShiftRequest__Output } from './neurahealth/StopShiftRequest';
import type { TriggerScenarioRequest as _neurahealth_TriggerScenarioRequest, TriggerScenarioRequest__Output as _neurahealth_TriggerScenarioRequest__Output } from './neurahealth/TriggerScenarioRequest';

type SubtypeConstructor<Constructor extends new (...args: any) => any, Subtype> = {
  new(...args: ConstructorParameters<Constructor>): Subtype;
};

export interface ProtoGrpcType {
  neurahealth: {
    AmbulanceUnit: MessageTypeDefinition<_neurahealth_AmbulanceUnit, _neurahealth_AmbulanceUnit__Output>
    ClinicalScenario: EnumTypeDefinition
    FleetControlService: SubtypeConstructor<typeof grpc.Client, _neurahealth_FleetControlServiceClient> & { service: _neurahealth_FleetControlServiceDefinition }
    FleetStatus: MessageTypeDefinition<_neurahealth_FleetStatus, _neurahealth_FleetStatus__Output>
    FleetStatusRequest: MessageTypeDefinition<_neurahealth_FleetStatusRequest, _neurahealth_FleetStatusRequest__Output>
    ScenarioAck: MessageTypeDefinition<_neurahealth_ScenarioAck, _neurahealth_ScenarioAck__Output>
    StartShiftRequest: MessageTypeDefinition<_neurahealth_StartShiftRequest, _neurahealth_StartShiftRequest__Output>
    StopShiftRequest: MessageTypeDefinition<_neurahealth_StopShiftRequest, _neurahealth_StopShiftRequest__Output>
    TriggerScenarioRequest: MessageTypeDefinition<_neurahealth_TriggerScenarioRequest, _neurahealth_TriggerScenarioRequest__Output>
    UnitStatus: EnumTypeDefinition
  }
}

