/**
 * Lanzador de los 3 microservicios (local y en la nube).
 *
 * Dos modos (variable de entorno LAUNCH_MODE):
 *  - "processes" (por defecto): cada microservicio corre en su PROPIO proceso
 *    de Node. Prefija los logs con colores y, si uno se cae, apaga todo para
 *    que la plataforma reinicie el contenedor completo.
 *  - "single": los tres se cargan dentro de un solo proceso para caber en los
 *    256 MB de RAM del plan gratuito. Aun así siguen hablándose SOLO por gRPC
 *    a través de la red (localhost:50051 y localhost:50052): ninguno llama
 *    funciones del otro directamente.
 *
 * Uso: node scripts/launcher.js   (o "npm start" desde la raíz)
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

class ServiceLauncher {
  constructor(services) {
    this.services = services;
    this.children = [];
    this.shuttingDown = false;
  }

  start() {
    console.log('\n🚑  NeuraHealth: iniciando microservicios gRPC...\n');
    this.services.forEach((service, index) => {
      setTimeout(() => this.spawn(service), index * 700);
    });
    process.on('SIGINT', () => this.shutdown(0));
    process.on('SIGTERM', () => this.shutdown(0));
  }

  spawn(service) {
    const child = spawn(process.execPath, [service.entry], {
      cwd: root,
      env: { ...process.env, ...service.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const prefix = `\x1b[${service.color}m[${service.name}]\x1b[0m `;
    const pipe = (stream, target) =>
      stream.on('data', (chunk) =>
        chunk.toString().split('\n').filter(Boolean).forEach((line) => target.write(prefix + line + '\n')),
      );
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);

    child.on('exit', (code) => {
      if (this.shuttingDown) return;
      console.error(`${prefix}terminó inesperadamente (código ${code}). Apagando todo...`);
      this.shutdown(1);
    });
    this.children.push(child);
  }

  shutdown(exitCode) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.children.forEach((child) => child.kill('SIGTERM'));
    setTimeout(() => process.exit(exitCode), 1500);
  }
}

const memoryLimit = process.env.SERVICE_MAX_HEAP_MB || '96';
const nodeOptions = `--max-old-space-size=${memoryLimit}`;

const services = [
  {
    name: 'hospital-service',
    color: '36',
    entry: 'hospital-service/dist/HospitalServer.js',
    env: { NODE_OPTIONS: nodeOptions },
  },
  {
    name: 'ambulance-service',
    color: '33',
    entry: 'ambulance-service/dist/main.js',
    env: { NODE_OPTIONS: nodeOptions },
  },
  {
    name: 'hospital-dashboard',
    color: '35',
    entry: 'hospital-dashboard/dist/Server.js',
    env: { NODE_OPTIONS: nodeOptions },
  },
];

if (process.env.LAUNCH_MODE === 'single') {
  console.log('\n🚑  NeuraHealth: modo "single" (3 microservicios, 1 proceso, comunicación por gRPC)\n');
  services.forEach((service) => require(path.join(root, service.entry)));
} else {
  new ServiceLauncher(services).start();
}
