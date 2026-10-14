'use strict';

/* =====================================================================
   NeuraHealth — Cliente del dashboard (POO, sin frameworks)
   El navegador recibe por WebSocket lo que el gateway obtiene por gRPC.
   ===================================================================== */

const SEVERITY_LABEL = {
  SEVERITY_UNSPECIFIED: 'Sin datos',
  SEVERITY_LOW: 'Riesgo bajo',
  SEVERITY_MEDIUM: 'Riesgo medio',
  SEVERITY_HIGH: 'Riesgo alto',
  SEVERITY_CRITICAL: 'Crítico',
};

const RHYTHM_LABEL = {
  CARDIAC_RHYTHM_UNSPECIFIED: '',
  CARDIAC_RHYTHM_SINUS: 'Ritmo sinusal',
  CARDIAC_RHYTHM_SINUS_TACHYCARDIA: 'Taquicardia sinusal',
  CARDIAC_RHYTHM_ATRIAL_FIBRILLATION: 'Fibrilación auricular',
  CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION: 'Fibrilación ventricular',
};

// Misma acción que propone el hospital para cada nivel (por si aún no llegó una alerta)
const SEVERITY_ACTION = {
  SEVERITY_LOW: 'Monitorización de rutina durante el traslado.',
  SEVERITY_MEDIUM: 'Valoración urgente por el médico de urgencias al llegar.',
  SEVERITY_HIGH: 'Preparar box de críticos y avisar al equipo de urgencias.',
  SEVERITY_CRITICAL: 'Activar el equipo de reanimación: respuesta inmediata.',
};

const SERIOUS = new Set(['SEVERITY_HIGH', 'SEVERITY_CRITICAL']);

/* ---------- Utilidades de formato ---------- */
class Format {
  static escape(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  static bytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  static clock(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  static time(epochMs) {
    return new Date(Number(epochMs) || Date.now()).toLocaleTimeString('es-CO', { hour12: false });
  }

  static number(value) {
    return (Number(value) || 0).toLocaleString('es-CO');
  }
}

/* ---------- Canal WebSocket con órdenes que esperan respuesta ---------- */
class SocketChannel {
  constructor() {
    this.socket = io(); // Empieza por polling y sube a WebSocket si la plataforma lo permite
  }

  on(event, handler) {
    this.socket.on(event, handler);
  }

  command(event, payload) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve({ ok: false, message: 'El servidor no respondió a tiempo.' }), 6000);
      this.socket.emit(event, payload, (result) => {
        clearTimeout(timeout);
        resolve(result);
      });
    });
  }
}

/* ---------- Estado de la flota (fuente de verdad del frontend) ---------- */
class FleetStore extends EventTarget {
  constructor() {
    super();
    this.units = new Map();
    this.selectedId = null;
    this.isRunning = false;
    this.endsAt = 0;
  }

  get selected() {
    return this.units.get(this.selectedId) ?? null;
  }

  applyFleetStatus(status) {
    this.isRunning = status.is_running;
    this.endsAt = Number(status.ends_at) || 0;

    const incoming = new Set(status.units.map((unit) => unit.ambulance_id));
    for (const id of this.units.keys()) {
      if (!incoming.has(id)) this.units.delete(id);
    }

    for (const info of status.units) {
      const unit = this.ensure(info.ambulance_id);
      if (unit.info && unit.info.patient_id !== info.patient_id) {
        // Nuevo paciente en la misma ambulancia: se limpian sus lecturas
        unit.vitals = null;
        unit.severity = 'SEVERITY_UNSPECIFIED';
        unit.score = null;
        unit.lastAlert = null;
      }
      unit.info = info;
    }

    if (!this.units.has(this.selectedId)) {
      this.selectedId = this.units.keys().next().value ?? null;
      this.emit('selection');
    }
    this.emit('fleet');
  }

  applySnapshot(snapshot) {
    const unit = this.ensure(snapshot.vitals.ambulance_id);
    if (unit.info && unit.info.patient_id !== snapshot.vitals.patient_id) return;
    unit.vitals = snapshot.vitals;
    unit.severity = snapshot.severity;
    unit.score = snapshot.triage_score;
    this.emit('vitals', snapshot.vitals.ambulance_id);
  }

  applyAlert(alert) {
    const unit = this.units.get(alert.ambulance_id);
    if (unit) {
      unit.lastAlert = alert;
      this.emit('vitals', alert.ambulance_id);
    }
  }

  select(id) {
    if (!this.units.has(id) || id === this.selectedId) return;
    this.selectedId = id;
    this.emit('selection');
    this.emit('fleet');
  }

  ensure(id) {
    if (!this.units.has(id)) {
      this.units.set(id, { id, info: null, vitals: null, severity: 'SEVERITY_UNSPECIFIED', score: null, lastAlert: null });
    }
    return this.units.get(id);
  }

  emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }
}

/* ---------- Lista de ambulancias ---------- */
class FleetList {
  constructor(store, listElement, countElement) {
    this.store = store;
    this.list = listElement;
    this.count = countElement;

    this.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-unit]');
      if (button) this.store.select(button.dataset.unit);
    });
  }

  render() {
    const units = [...this.store.units.values()].filter((unit) => unit.info);
    this.count.textContent = units.length;

    if (units.length === 0) {
      this.list.innerHTML = '<li class="fleet-empty">Sin unidades. Inicia un turno para despachar ambulancias.</li>';
      return;
    }

    this.list.innerHTML = units.map((unit) => this.renderUnit(unit)).join('');
  }

  renderUnit(unit) {
    const { info, vitals } = unit;
    const arrived = info.status === 'UNIT_STATUS_ARRIVED';
    const isArrest = vitals?.rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION';
    const heartRate = vitals ? (isArrest ? '—' : Math.round(vitals.heart_rate)) : '--';
    const oxygen = vitals ? Math.round(vitals.blood_oxygen) : '--';

    return `
      <li>
        <button type="button" class="unit" data-unit="${info.ambulance_id}"
          data-severity="${unit.severity}" data-status="${info.status}"
          aria-current="${info.ambulance_id === this.store.selectedId}">
          <span class="unit-stripe" aria-hidden="true"></span>
          <span class="unit-id">${Format.escape(info.ambulance_id)}</span>
          <span class="unit-eta">${arrived ? 'Entregado' : Format.clock(info.eta_seconds)}</span>
          <span class="unit-patient">${Format.escape(info.patient_summary)}</span>
          <span class="unit-readout">
            <span class="hr">${heartRate}<small>lpm</small></span>
            <span class="spo2">${oxygen}<small>%</small></span>
            <small>${SEVERITY_LABEL[unit.severity]}</small>
          </span>
        </button>
      </li>`;
  }
}

/* ---------- Trazado ECG + pletismografía (lienzo que barre como un monitor real) ---------- */
class VitalTrace {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.sweepSeconds = 6;
    this.signal = { heartRate: 0, rhythm: 'CARDIAC_RHYTHM_UNSPECIFIED', active: false };
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const styles = getComputedStyle(document.documentElement);
    this.colors = {
      ecg: styles.getPropertyValue('--hr').trim(),
      pleth: styles.getPropertyValue('--spo2').trim(),
      background: styles.getPropertyValue('--bg').trim(),
    };

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    if (!this.reducedMotion) requestAnimationFrame((time) => this.frame(time));
  }

  setSignal(signal) {
    const changed = signal.rhythm !== this.signal.rhythm || signal.active !== this.signal.active;
    this.signal = signal;
    if (this.reducedMotion && (changed || !this.drawnStatic)) this.drawStatic();
  }

  reset() {
    this.x = 0;
    this.time = 0;
    this.beatStart = 0;
    this.beatPeriod = 0.8;
    this.previous = null;
    this.context.fillStyle = this.colors.background;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.reducedMotion) this.drawStatic();
  }

  resize() {
    const ratio = window.devicePixelRatio || 1;
    this.ratio = ratio;
    this.canvas.width = Math.max(1, Math.floor(this.canvas.clientWidth * ratio));
    this.canvas.height = Math.max(1, Math.floor(this.canvas.clientHeight * ratio));
    this.reset();
  }

  frame(timestamp) {
    const delta = this.lastFrame ? Math.min((timestamp - this.lastFrame) / 1000, 0.1) : 0;
    this.lastFrame = timestamp;

    const pixelsPerSecond = this.canvas.width / this.sweepSeconds;
    const steps = Math.round(delta * pixelsPerSecond);
    for (let step = 0; step < steps; step++) this.advance(1 / pixelsPerSecond);

    requestAnimationFrame((time) => this.frame(time));
  }

  drawStatic() {
    this.drawnStatic = true;
    this.x = 0;
    this.previous = null;
    this.context.fillStyle = this.colors.background;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const pixelsPerSecond = this.canvas.width / this.sweepSeconds;
    for (let pixel = 0; pixel < this.canvas.width - 1; pixel++) this.advance(1 / pixelsPerSecond, false);
  }

  advance(seconds, erase = true) {
    this.time += seconds;
    this.scheduleBeats();

    const { width, height } = this.canvas;
    const ecgY = height * 0.36 - this.ecgSample() * height * 0.24;
    const plethY = height * 0.93 - this.plethSample() * height * 0.2;

    if (erase) {
      this.context.fillStyle = this.colors.background;
      this.context.fillRect(this.x + 1, 0, 16 * this.ratio, height);
    }

    if (this.previous) {
      this.stroke(this.colors.ecg, this.previous.ecgY, ecgY);
      this.stroke(this.colors.pleth, this.previous.plethY, plethY);
    }

    this.previous = { ecgY, plethY };
    this.x += 1;
    if (this.x >= width) {
      this.x = 0;
      this.previous = null;
    }
  }

  stroke(color, fromY, toY) {
    this.context.strokeStyle = color;
    this.context.lineWidth = 2 * this.ratio;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(this.x - 1, fromY);
    this.context.lineTo(this.x, toY);
    this.context.stroke();
  }

  scheduleBeats() {
    const { heartRate, rhythm } = this.signal;
    if (heartRate <= 0) return;
    if (this.time - this.beatStart < this.beatPeriod) return;

    this.beatStart = this.time;
    const base = 60 / heartRate;
    // En fibrilación auricular los latidos son irregulares
    this.beatPeriod = rhythm === 'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION' ? base * (0.7 + Math.random() * 0.6) : base;
  }

  gaussian(x, center, width, amplitude) {
    return amplitude * Math.exp(-((x - center) ** 2) / (2 * width * width));
  }

  ecgSample() {
    const { heartRate, rhythm, active } = this.signal;
    const t = this.time;
    const noise = (Math.random() - 0.5) * 0.02;
    if (!active) return noise * 0.5;

    if (rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION') {
      const envelope = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.3 * t);
      return 0.5 * envelope * Math.sin(2 * Math.PI * 4.6 * t + 1.4 * Math.sin(2 * Math.PI * 0.7 * t)) + noise * 3;
    }
    if (heartRate <= 0) return noise;

    const k = Math.min(1, this.beatPeriod / 0.75);
    const phase = (t - this.beatStart) / k;
    const isAtrialFibrillation = rhythm === 'CARDIAC_RHYTHM_ATRIAL_FIBRILLATION';

    let value = noise;
    value += isAtrialFibrillation
      ? 0.04 * Math.sin(2 * Math.PI * 7 * t) + 0.03 * Math.sin(2 * Math.PI * 11 * t)
      : this.gaussian(phase, 0.08, 0.025, 0.12);
    value += this.gaussian(phase, 0.17, 0.008, -0.12);
    value += this.gaussian(phase, 0.2, 0.01, 1.0);
    value += this.gaussian(phase, 0.225, 0.01, -0.28);
    value += this.gaussian(phase, 0.42, 0.045, 0.3);
    return value;
  }

  plethSample() {
    const { heartRate, rhythm, active } = this.signal;
    if (!active || heartRate <= 0 || rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION') {
      return 0.05 + (Math.random() - 0.5) * 0.03;
    }
    const progress = ((this.time - this.beatStart) / this.beatPeriod) % 1;
    return this.gaussian(progress, 0.3, 0.1, 0.9) + this.gaussian(progress, 0.58, 0.08, 0.3);
  }
}

/* ---------- Monitor del paciente seleccionado ---------- */
class PatientMonitor {
  constructor(store, channel, toast) {
    this.store = store;
    this.channel = channel;
    this.toast = toast;
    this.root = {
      empty: document.getElementById('monitor-empty'),
      body: document.getElementById('monitor-body'),
      unit: document.getElementById('m-unit'),
      patient: document.getElementById('m-patient'),
      eta: document.getElementById('m-eta'),
      etaLabel: document.getElementById('m-eta-label'),
      origin: document.getElementById('m-origin'),
      rhythm: document.getElementById('m-rhythm'),
      trace: document.querySelector('.trace'),
      triage: document.getElementById('triage'),
      score: document.getElementById('t-score'),
      level: document.getElementById('t-level'),
      action: document.getElementById('t-action'),
      receiving: document.getElementById('t-unit'),
      scenarios: document.getElementById('scenarios'),
    };
    this.tiles = Object.fromEntries(
      [...document.querySelectorAll('.vital')].map((tile) => [tile.dataset.param, tile]),
    );
    this.trace = new VitalTrace(document.getElementById('ecg'));
    this.root.scenarios.addEventListener('click', (event) => this.onScenario(event));
  }

  onSelectionChanged() {
    this.trace.reset();
    this.render();
  }

  render() {
    const unit = this.store.selected;
    const hasUnit = Boolean(unit?.info);
    this.root.empty.hidden = hasUnit;
    this.root.body.hidden = !hasUnit;
    if (!hasUnit) {
      this.trace.setSignal({ heartRate: 0, rhythm: 'CARDIAC_RHYTHM_UNSPECIFIED', active: false });
      return;
    }

    const { info, vitals } = unit;
    const arrived = info.status === 'UNIT_STATUS_ARRIVED';

    this.root.unit.textContent = info.ambulance_id;
    this.root.patient.textContent = `${info.patient_summary} — ${info.patient_id}`;
    this.root.etaLabel.textContent = arrived ? 'Paciente entregado' : 'Llega en';
    this.root.eta.textContent = arrived ? 'En urgencias' : Format.clock(info.eta_seconds);
    this.root.origin.textContent = `Desde ${info.origin}`;

    this.renderVitals(vitals, arrived);
    this.renderTriage(unit, arrived);
    this.renderScenarioButtons(info, arrived);
  }

  renderVitals(vitals, arrived) {
    const rhythm = vitals?.rhythm ?? 'CARDIAC_RHYTHM_UNSPECIFIED';
    const isArrest = rhythm === 'CARDIAC_RHYTHM_VENTRICULAR_FIBRILLATION';

    this.root.trace.dataset.rhythm = rhythm;
    this.root.rhythm.textContent = arrived ? 'Transmisión finalizada' : RHYTHM_LABEL[rhythm];
    this.trace.setSignal({ heartRate: vitals ? vitals.heart_rate : 0, rhythm, active: Boolean(vitals) && !arrived });

    if (!vitals) {
      Object.values(this.tiles).forEach((tile) => {
        tile.querySelector('[data-value]').textContent = '--';
        tile.dataset.out = 'false';
      });
      return;
    }

    this.setTile('hr', isArrest ? '—' : Math.round(vitals.heart_rate), isArrest || vitals.heart_rate < 51 || vitals.heart_rate > 90);
    this.setTile('spo2', Math.round(vitals.blood_oxygen), vitals.blood_oxygen < 96);
    this.setTile('bp', `${vitals.systolic_pressure}/${vitals.diastolic_pressure}`, vitals.systolic_pressure < 111 || vitals.systolic_pressure > 219);
    this.setTile('rr', vitals.respiratory_rate, vitals.respiratory_rate < 12 || vitals.respiratory_rate > 20);
    this.setTile('temp', Number(vitals.body_temperature).toFixed(1), vitals.body_temperature < 36.1 || vitals.body_temperature > 38);
  }

  setTile(param, value, isOutOfRange) {
    const tile = this.tiles[param];
    tile.querySelector('[data-value]').textContent = value;
    tile.dataset.out = String(isOutOfRange);
  }

  renderTriage(unit, arrived) {
    const severity = unit.vitals ? unit.severity : 'SEVERITY_UNSPECIFIED';
    this.root.triage.dataset.severity = severity;
    this.root.score.textContent = unit.score ?? '–';
    this.root.level.textContent = SEVERITY_LABEL[severity];

    const alert = unit.lastAlert;
    if (arrived) {
      this.root.action.textContent = 'La ambulancia cerró su canal gRPC al llegar. Se despachará un nuevo traslado.';
      this.root.receiving.textContent = '';
    } else if (alert) {
      this.root.action.textContent = alert.recommended_action;
      this.root.receiving.textContent = alert.receiving_unit ? `Recibe: ${alert.receiving_unit}` : '';
    } else {
      this.root.action.textContent = SEVERITY_ACTION[severity] ?? 'El hospital calcula el triaje con cada paquete recibido.';
      this.root.receiving.textContent = '';
    }
  }

  renderScenarioButtons(info, arrived) {
    this.root.scenarios.querySelectorAll('[data-scenario]').forEach((button) => {
      button.disabled = arrived || !this.store.isRunning;
      button.setAttribute('aria-pressed', String(button.dataset.scenario === info.scenario));
    });
  }

  async onScenario(event) {
    const button = event.target.closest('[data-scenario]');
    const unit = this.store.selected;
    if (!button || !unit) return;

    button.disabled = true;
    const result = await this.channel.command('fleet:scenario', {
      ambulanceId: unit.id,
      scenario: button.dataset.scenario,
    });
    button.disabled = false;
    this.toast.show(result.message, result.ok ? 'info' : 'error');
  }
}

/* ---------- Bitácora de alertas ---------- */
class AlertFeed {
  constructor(listElement, filterToggle, maxItems = 60) {
    this.list = listElement;
    this.maxItems = maxItems;
    this.pendingAudit = new Map();
    this.auditedIds = new Set();

    filterToggle.addEventListener('change', () => {
      this.list.dataset.filter = filterToggle.checked ? 'serious' : 'all';
    });
  }

  addAlert(alert, emittedAt) {
    const needsAudit = SERIOUS.has(alert.severity);
    const item = this.createItem('alert', alert.severity, `
      <div class="alert-top">
        <strong>${Format.escape(alert.ambulance_id)} · ${SEVERITY_LABEL[alert.severity]}</strong>
        <time>${Format.time(emittedAt)}</time>
      </div>
      <p class="alert-msg">${Format.escape(alert.message)}</p>
      ${alert.receiving_unit ? `<p class="alert-meta">${Format.escape(alert.recommended_action)} Recibe: ${Format.escape(alert.receiving_unit)}.</p>` : ''}
      ${needsAudit ? `<p class="alert-audit" data-pending="true">Auditoría en cola (worker en segundo plano)…</p>` : ''}
    `);

    if (needsAudit) {
      this.pendingAudit.set(alert.alert_id, item);
      if (this.auditedIds.has(alert.alert_id)) this.markAudited({ alert_id: alert.alert_id });
    }
    this.prepend(item);
  }

  addRejected(rejected, metrics, emittedAt) {
    const item = this.createItem('rejected', 'SEVERITY_UNSPECIFIED', `
      <div class="alert-top">
        <strong>${Format.escape(rejected.ambulance_id || 'Origen desconocido')} · Paquete rechazado</strong>
        <time>${Format.time(emittedAt)}</time>
      </div>
      <p class="alert-msg">Zod descartó datos imposibles antes de usarlos: ${Format.escape(rejected.reason)}</p>
      <p class="alert-meta">Protobuf lo aceptó (${metrics?.protobuf_bytes ?? '?'} bytes válidos), pero el valor no tiene sentido clínico.</p>
    `);
    this.prepend(item);
  }

  markAudited(record) {
    this.auditedIds.add(record.alert_id);
    const item = this.pendingAudit.get(record.alert_id);
    if (!item) return;
    const label = item.querySelector('.alert-audit');
    label.dataset.pending = 'false';
    label.textContent = `Registrada en auditoría a las ${Format.time(Date.parse(record.recordedAt) || Date.now())}`;
    this.pendingAudit.delete(record.alert_id);
  }

  createItem(kind, severity, html) {
    const item = document.createElement('li');
    item.className = 'alert';
    item.dataset.kind = kind;
    item.dataset.severity = severity;
    item.innerHTML = html;
    return item;
  }

  prepend(item) {
    this.list.querySelector('.alert-empty')?.remove();
    this.list.prepend(item);
    while (this.list.children.length > this.maxItems) {
      this.list.lastElementChild.remove();
    }
  }
}

/* ---------- Métricas de transporte (pie de página) ---------- */
class WireMetrics {
  constructor() {
    this.elements = {
      barProto: document.getElementById('bar-proto'),
      barJson: document.getElementById('bar-json'),
      bytesProto: document.getElementById('bytes-proto'),
      bytesJson: document.getElementById('bytes-json'),
      savings: document.getElementById('stat-savings'),
      messages: document.getElementById('stat-messages'),
      streams: document.getElementById('stat-streams'),
      rejected: document.getElementById('stat-rejected'),
      liveSavings: document.querySelectorAll('[data-live="savings"]'),
    };
  }

  render(status) {
    const protobuf = Number(status.protobuf_bytes_total) || 0;
    const json = Number(status.json_bytes_total) || 0;
    const { elements } = this;

    elements.bytesProto.textContent = Format.bytes(protobuf);
    elements.bytesJson.textContent = Format.bytes(json);
    elements.barJson.style.width = json > 0 ? '100%' : '0';
    elements.barProto.style.width = json > 0 ? `${(protobuf / json) * 100}%` : '0';
    elements.messages.textContent = Format.number(status.total_messages);
    elements.streams.textContent = status.active_streams;
    elements.rejected.textContent = Format.number(status.rejected_messages);

    if (json > 0) {
      const savings = `${Math.round((1 - protobuf / json) * 100)} %`;
      elements.savings.textContent = savings;
      elements.liveSavings.forEach((node) => { node.textContent = savings; });
    }
  }
}

/* ---------- Visor de contratos .proto ---------- */
class ContractViewer {
  constructor(listElement, codeElement) {
    this.list = listElement;
    this.code = codeElement;
    this.contracts = [];
    this.list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-file]');
      if (button) this.show(button.dataset.file);
    });
  }

  load(contracts) {
    this.contracts = contracts;
    this.list.innerHTML = contracts.map((contract) => `
      <li>
        <button type="button" class="contract" data-file="${contract.file}">
          <strong>${Format.escape(contract.file)}</strong>
          <span>${Format.escape(contract.service)}</span>
          <span>${Format.escape(contract.owner)} lo implementa, ${Format.escape(contract.consumer)} lo consume</span>
          <em>${contract.rpcKinds.map(Format.escape).join(' y ')}</em>
        </button>
      </li>`).join('');
    if (contracts.length > 0) this.show(this.current ?? contracts[0].file);
  }

  show(file) {
    const contract = this.contracts.find((entry) => entry.file === file);
    if (!contract) return;
    this.current = file;
    this.list.querySelectorAll('[data-file]').forEach((button) => {
      button.setAttribute('aria-current', String(button.dataset.file === file));
    });
    this.code.innerHTML = `<code>${this.highlight(contract.source)}</code>`;
  }

  highlight(source) {
    const keywords = /("[^"]*")|\b(syntax|package|import|service|rpc|returns|stream|message|enum|oneof|repeated)\b|\b(string|int32|int64|double|bool)\b|\b(\d+)\b/g;
    return Format.escape(source).split('\n').map((line) => {
      const commentIndex = line.indexOf('//');
      const code = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
      const comment = commentIndex >= 0 ? line.slice(commentIndex) : '';
      const coloured = code.replace(keywords, (match, text, keyword, type, number) => {
        if (text) return `<span class="tok-str">${text}</span>`;
        if (keyword) return `<span class="tok-kw">${keyword}</span>`;
        if (type) return `<span class="tok-type">${type}</span>`;
        return `<span class="tok-num">${number}</span>`;
      });
      return coloured + (comment ? `<span class="tok-comment">${comment}</span>` : '');
    }).join('\n');
  }
}

/* ---------- Barra superior: salud y turno ---------- */
class ShiftControls {
  constructor(store, channel, toast) {
    this.store = store;
    this.channel = channel;
    this.toast = toast;
    this.button = document.getElementById('shift-toggle');
    this.clock = document.getElementById('shift-clock');
    this.unitCount = document.getElementById('unit-count');
    this.links = document.querySelectorAll('[data-service]');

    this.button.addEventListener('click', () => this.toggle());
    document.querySelectorAll('[data-action="start-shift"]').forEach((button) => {
      button.addEventListener('click', () => this.start());
    });
    setInterval(() => this.renderClock(), 1000);
  }

  renderHealth(health) {
    this.links.forEach((link) => {
      link.dataset.state = health[link.dataset.service] ? 'up' : 'down';
    });
  }

  render() {
    const running = this.store.isRunning;
    this.button.textContent = running ? 'Detener turno' : 'Iniciar turno';
    this.button.dataset.mode = running ? 'stop' : 'start';
    this.unitCount.disabled = running;
    this.renderClock();
  }

  renderClock() {
    if (!this.store.isRunning || !this.store.endsAt) {
      this.clock.textContent = 'Sin turno activo';
      this.clock.dataset.running = 'false';
      return;
    }
    const remaining = (this.store.endsAt - Date.now()) / 1000;
    this.clock.textContent = `Turno: ${Format.clock(remaining)} restantes`;
    this.clock.dataset.running = 'true';
  }

  toggle() {
    return this.store.isRunning ? this.stop() : this.start();
  }

  async start() {
    this.button.disabled = true;
    const result = await this.channel.command('fleet:start', { unitCount: Number(this.unitCount.value) });
    this.button.disabled = false;
    this.toast.show(result.message || 'Turno iniciado.', result.ok ? 'info' : 'error');
  }

  async stop() {
    this.button.disabled = true;
    const result = await this.channel.command('fleet:stop', {});
    this.button.disabled = false;
    this.toast.show(result.ok ? 'Turno detenido. Las ambulancias cerraron sus canales gRPC.' : result.message, result.ok ? 'info' : 'error');
  }
}

/* ---------- Pestañas y aviso flotante ---------- */
class ViewTabs {
  constructor() {
    this.tabs = document.querySelectorAll('[data-view]');
    this.tabs.forEach((tab) => tab.addEventListener('click', () => this.show(tab.dataset.view)));
  }

  show(view) {
    this.tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.view === view)));
    document.querySelectorAll('.view').forEach((section) => {
      section.hidden = section.id !== `view-${view}`;
    });
  }
}

class Toast {
  constructor(element) {
    this.element = element;
  }

  show(message, tone = 'info') {
    if (!message) return;
    this.element.textContent = message;
    this.element.dataset.tone = tone;
    this.element.dataset.visible = 'true';
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.element.dataset.visible = 'false'; }, 3200);
  }
}

/* ---------- Composición de la aplicación ---------- */
class DashboardApp {
  constructor() {
    this.channel = new SocketChannel();
    this.store = new FleetStore();
    this.toast = new Toast(document.getElementById('toast'));
    this.fleetList = new FleetList(this.store, document.getElementById('fleet-list'), document.getElementById('fleet-count'));
    this.monitor = new PatientMonitor(this.store, this.channel, this.toast);
    this.alerts = new AlertFeed(document.getElementById('alert-list'), document.getElementById('only-serious'));
    this.wire = new WireMetrics();
    this.contracts = new ContractViewer(document.getElementById('contract-list'), document.getElementById('contract-code'));
    this.shift = new ShiftControls(this.store, this.channel, this.toast);
    new ViewTabs();
  }

  start() {
    this.store.addEventListener('fleet', () => {
      this.fleetList.render();
      this.monitor.render();
      this.shift.render();
    });
    this.store.addEventListener('selection', () => this.monitor.onSelectionChanged());
    this.store.addEventListener('vitals', (event) => {
      this.fleetList.render();
      if (event.detail === this.store.selectedId) this.monitor.render();
    });

    this.channel.on('fleet:status', (status) => this.store.applyFleetStatus(status));
    this.channel.on('hospital:status', (status) => this.wire.render(status));
    this.channel.on('system:health', (health) => this.shift.renderHealth(health));
    this.channel.on('contracts:catalog', (contracts) => this.contracts.load(contracts));
    this.channel.on('audit:recorded', (record) => this.alerts.markAudited(record));
    this.channel.on('audit:history', (records) => records.forEach((record) => this.alerts.auditedIds.add(record.alert_id)));
    this.channel.on('telemetry', (event) => this.onTelemetry(event));
    this.channel.on('disconnect', () => {
      this.shift.renderHealth({ hospitalService: false, ambulanceService: false });
      this.toast.show('Se perdió la conexión con el gateway. Reintentando…', 'error');
    });

    this.fleetList.render();
    this.monitor.render();
  }

  onTelemetry(event) {
    if (event.snapshot) this.store.applySnapshot(event.snapshot);
    if (event.alert) {
      this.store.applyAlert(event.alert);
      this.alerts.addAlert(event.alert, event.emitted_at);
    }
    if (event.rejected) this.alerts.addRejected(event.rejected, event.metrics, event.emitted_at);
  }
}

new DashboardApp().start();
