import fs from 'fs';
import path from 'path';

export interface ContractEntry {
  file: string;
  service: string;
  owner: string;
  consumer: string;
  rpcKinds: string[];
  source: string;
}

/**
 * Publica los contratos .proto en el dashboard para que se vea que todo
 * nace de ellos (Contract-First). Se leen del disco: si el contrato cambia,
 * el dashboard muestra automáticamente la nueva versión.
 */
export class ContractCatalog {
  private static readonly METADATA: Omit<ContractEntry, 'source'>[] = [
    {
      file: 'ambulance.proto',
      service: 'AmbulanceSyncService',
      owner: 'hospital-service',
      consumer: 'ambulance-service',
      rpcKinds: ['Streaming bidireccional'],
    },
    {
      file: 'monitoring.proto',
      service: 'HospitalMonitoringService',
      owner: 'hospital-service',
      consumer: 'hospital-dashboard',
      rpcKinds: ['Server streaming', 'Unario'],
    },
    {
      file: 'fleet.proto',
      service: 'FleetControlService',
      owner: 'ambulance-service',
      consumer: 'hospital-dashboard',
      rpcKinds: ['Unario'],
    },
  ];

  private readonly entries: ContractEntry[];

  constructor(protoDir: string) {
    this.entries = ContractCatalog.METADATA.map((meta) => ({
      ...meta,
      source: fs.readFileSync(path.join(protoDir, meta.file), 'utf8'),
    }));
  }

  public list(): ContractEntry[] {
    return this.entries;
  }
}
