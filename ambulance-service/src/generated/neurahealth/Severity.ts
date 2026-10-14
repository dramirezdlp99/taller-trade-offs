// Original file: ../proto/ambulance.proto

export const Severity = {
  SEVERITY_UNSPECIFIED: 'SEVERITY_UNSPECIFIED',
  SEVERITY_LOW: 'SEVERITY_LOW',
  SEVERITY_MEDIUM: 'SEVERITY_MEDIUM',
  SEVERITY_HIGH: 'SEVERITY_HIGH',
  SEVERITY_CRITICAL: 'SEVERITY_CRITICAL',
} as const;

export type Severity =
  | 'SEVERITY_UNSPECIFIED'
  | 0
  | 'SEVERITY_LOW'
  | 1
  | 'SEVERITY_MEDIUM'
  | 2
  | 'SEVERITY_HIGH'
  | 3
  | 'SEVERITY_CRITICAL'
  | 4

export type Severity__Output = typeof Severity[keyof typeof Severity]
