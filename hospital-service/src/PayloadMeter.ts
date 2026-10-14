import path from 'path';
import * as protobuf from 'protobufjs';

export interface PayloadSize {
  protobufBytes: number;
  jsonBytes: number;
}

/**
 * Mide el trade-off central del taller: cuántos bytes ocupa el MISMO
 * mensaje serializado en binario (Protobuf) frente a texto (JSON/REST).
 */
export class PayloadMeter {
  private readonly vitalsType: protobuf.Type;

  constructor(protoDir: string) {
    const root = new protobuf.Root();
    root.loadSync(path.join(protoDir, 'ambulance.proto'), { keepCase: true });
    this.vitalsType = root.lookupType('neurahealth.VitalSignsRequest');
  }

  public measure(message: object): PayloadSize {
    const encoded = this.vitalsType.encode(this.vitalsType.fromObject(message)).finish();
    return {
      protobufBytes: encoded.length,
      jsonBytes: Buffer.byteLength(JSON.stringify(message), 'utf8'),
    };
  }
}
