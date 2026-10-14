// Original file: ../proto/fleet.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { FleetStatus as _neurahealth_FleetStatus, FleetStatus__Output as _neurahealth_FleetStatus__Output } from '../neurahealth/FleetStatus';
import type { FleetStatusRequest as _neurahealth_FleetStatusRequest, FleetStatusRequest__Output as _neurahealth_FleetStatusRequest__Output } from '../neurahealth/FleetStatusRequest';
import type { ScenarioAck as _neurahealth_ScenarioAck, ScenarioAck__Output as _neurahealth_ScenarioAck__Output } from '../neurahealth/ScenarioAck';
import type { StartShiftRequest as _neurahealth_StartShiftRequest, StartShiftRequest__Output as _neurahealth_StartShiftRequest__Output } from '../neurahealth/StartShiftRequest';
import type { StopShiftRequest as _neurahealth_StopShiftRequest, StopShiftRequest__Output as _neurahealth_StopShiftRequest__Output } from '../neurahealth/StopShiftRequest';
import type { TriggerScenarioRequest as _neurahealth_TriggerScenarioRequest, TriggerScenarioRequest__Output as _neurahealth_TriggerScenarioRequest__Output } from '../neurahealth/TriggerScenarioRequest';

export interface FleetControlServiceClient extends grpc.Client {
  GetFleetStatus(argument: _neurahealth_FleetStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  GetFleetStatus(argument: _neurahealth_FleetStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  GetFleetStatus(argument: _neurahealth_FleetStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  GetFleetStatus(argument: _neurahealth_FleetStatusRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  getFleetStatus(argument: _neurahealth_FleetStatusRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  getFleetStatus(argument: _neurahealth_FleetStatusRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  getFleetStatus(argument: _neurahealth_FleetStatusRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  getFleetStatus(argument: _neurahealth_FleetStatusRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  
  StartShift(argument: _neurahealth_StartShiftRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StartShift(argument: _neurahealth_StartShiftRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StartShift(argument: _neurahealth_StartShiftRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StartShift(argument: _neurahealth_StartShiftRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  startShift(argument: _neurahealth_StartShiftRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  startShift(argument: _neurahealth_StartShiftRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  startShift(argument: _neurahealth_StartShiftRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  startShift(argument: _neurahealth_StartShiftRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  
  StopShift(argument: _neurahealth_StopShiftRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StopShift(argument: _neurahealth_StopShiftRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StopShift(argument: _neurahealth_StopShiftRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  StopShift(argument: _neurahealth_StopShiftRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  stopShift(argument: _neurahealth_StopShiftRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  stopShift(argument: _neurahealth_StopShiftRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  stopShift(argument: _neurahealth_StopShiftRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  stopShift(argument: _neurahealth_StopShiftRequest, callback: grpc.requestCallback<_neurahealth_FleetStatus__Output>): grpc.ClientUnaryCall;
  
  TriggerScenario(argument: _neurahealth_TriggerScenarioRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  TriggerScenario(argument: _neurahealth_TriggerScenarioRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  TriggerScenario(argument: _neurahealth_TriggerScenarioRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  TriggerScenario(argument: _neurahealth_TriggerScenarioRequest, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  triggerScenario(argument: _neurahealth_TriggerScenarioRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  triggerScenario(argument: _neurahealth_TriggerScenarioRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  triggerScenario(argument: _neurahealth_TriggerScenarioRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  triggerScenario(argument: _neurahealth_TriggerScenarioRequest, callback: grpc.requestCallback<_neurahealth_ScenarioAck__Output>): grpc.ClientUnaryCall;
  
}

export interface FleetControlServiceHandlers extends grpc.UntypedServiceImplementation {
  GetFleetStatus: grpc.handleUnaryCall<_neurahealth_FleetStatusRequest__Output, _neurahealth_FleetStatus>;
  
  StartShift: grpc.handleUnaryCall<_neurahealth_StartShiftRequest__Output, _neurahealth_FleetStatus>;
  
  StopShift: grpc.handleUnaryCall<_neurahealth_StopShiftRequest__Output, _neurahealth_FleetStatus>;
  
  TriggerScenario: grpc.handleUnaryCall<_neurahealth_TriggerScenarioRequest__Output, _neurahealth_ScenarioAck>;
  
}

export interface FleetControlServiceDefinition extends grpc.ServiceDefinition {
  GetFleetStatus: MethodDefinition<_neurahealth_FleetStatusRequest, _neurahealth_FleetStatus, _neurahealth_FleetStatusRequest__Output, _neurahealth_FleetStatus__Output>
  StartShift: MethodDefinition<_neurahealth_StartShiftRequest, _neurahealth_FleetStatus, _neurahealth_StartShiftRequest__Output, _neurahealth_FleetStatus__Output>
  StopShift: MethodDefinition<_neurahealth_StopShiftRequest, _neurahealth_FleetStatus, _neurahealth_StopShiftRequest__Output, _neurahealth_FleetStatus__Output>
  TriggerScenario: MethodDefinition<_neurahealth_TriggerScenarioRequest, _neurahealth_ScenarioAck, _neurahealth_TriggerScenarioRequest__Output, _neurahealth_ScenarioAck__Output>
}
