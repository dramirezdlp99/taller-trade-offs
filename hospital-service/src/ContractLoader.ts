import path from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { ProtoGrpcType as AmbulanceContract } from './generated/ambulance';
import type { ProtoGrpcType as MonitoringContract } from './generated/monitoring';
import type { ProtoGrpcType as FleetContract } from './generated/fleet';

// Tipo del paquete "neurahealth" completo: es la unión de los tres contratos.
// Estos tipos NO se escriben a mano: los genera `npm run proto:gen` a partir
// de los archivos .proto (Single Source of Truth).
export type NeuraHealthPackage = AmbulanceContract['neurahealth'] &
  MonitoringContract['neurahealth'] &
  FleetContract['neurahealth'];

/**
 * Carga los contratos .proto en tiempo de ejecución y los expone tipados.
 */
export class ContractLoader {
  public static readonly PROTO_FILES = ['ambulance.proto', 'monitoring.proto', 'fleet.proto'];

  // La carpeta /proto está en la raíz del repositorio (../../proto desde dist/)
  public static resolveProtoDir(): string {
    return process.env.PROTO_DIR ?? path.join(__dirname, '../../proto');
  }

  public static load(): NeuraHealthPackage {
    const protoDir = ContractLoader.resolveProtoDir();
    const definition = protoLoader.loadSync(
      ContractLoader.PROTO_FILES.map((file) => path.join(protoDir, file)),
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [protoDir],
      },
    );

    const root = grpc.loadPackageDefinition(definition) as unknown as AmbulanceContract &
      MonitoringContract &
      FleetContract;

    return root.neurahealth;
  }
}
