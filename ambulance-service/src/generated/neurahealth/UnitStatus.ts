// Original file: ../proto/fleet.proto

export const UnitStatus = {
  UNIT_STATUS_UNSPECIFIED: 'UNIT_STATUS_UNSPECIFIED',
  UNIT_STATUS_EN_ROUTE: 'UNIT_STATUS_EN_ROUTE',
  UNIT_STATUS_ARRIVED: 'UNIT_STATUS_ARRIVED',
} as const;

export type UnitStatus =
  | 'UNIT_STATUS_UNSPECIFIED'
  | 0
  | 'UNIT_STATUS_EN_ROUTE'
  | 1
  | 'UNIT_STATUS_ARRIVED'
  | 2

export type UnitStatus__Output = typeof UnitStatus[keyof typeof UnitStatus]
