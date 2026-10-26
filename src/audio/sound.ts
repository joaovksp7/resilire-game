import { AUDIO } from '../config';
import { loadSoundOn, saveSoundOn } from '../core/save';

type SoundListener = (on: boolean) => void;

/** Duração do ruído da chuva (segundos). Repete em loop; mais longo = a repetição não se percebe. */
const NOISE_SECONDS = 4;
/** Trecho (segundos) misturado na emenda do loop, para não estalar a cada volta. */
const NOISE_CROSSFADE = 0.05;
/** Faixa de frequências da chuva: chuva fraca soa mais abafada, chuva forte mais chiada. */
const RAIN_CUTOFF_MIN = 1400;
const RAIN_CUTOFF_MAX = 3800;
/** Tempo (segundos) para o volume e o chiado da chuva acompanharem uma mudança. */
const RAIN_SMOOTHING = 0.25;

/** Som do pin: dó, mi, sol e dó, subindo (Hz). */
const PIN_NOTES = [523.25, 659.25, 783.99, 1046.5] as const;
/** Som de acerto: sol e dó (Hz). */
const RIGHT_NOTES = [783.99, 1046.5] as const;

function audioContextClass(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * true quando o navegador deixa o som começar agora (dentro de um clique, toque ou tecla).
 * Criar o áudio fora disso gera aviso no console e ele fica mudo.
 */
function canStartAudio(): boolean {
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation;
  return activation ? activation.isActive : true;
}

/** Ruído rosa (mais grave e suave que o ruído branco), normalizado e com a emenda do loop disfarçada. */
function pinkNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const fade = Math.floor(rate * NOISE_CROSSFADE);
  const raw = new Float32Array(length + fade);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let peak = 0;
  for (let i = 0; i < raw.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.0526913;
    raw[i] = b0 + b1 + b2 + white * 0.1848;
    peak = Math.max(peak, Math.abs(raw[i]));
  }
  const scale = peak > 0 ? 0.9 / peak : 0;
  const buffer = ctx.createBuffer(1, length, rate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = raw[i] * scale;
  // O começo continua o fim: o que vem depois do último ponto é misturado no começo.
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] = (raw[i] * t + raw[length + i] * (1 - t)) * scale;
  }
  return buffer;
}

/**
 * Som do jogo, todo gerado por código com a Web Audio API (nenhum arquivo de som):
 * a chuva, que acompanha a chuva de cada eixo, e efeitos curtos (pin, dado, acerto).
 * O navegador só deixa tocar som depois de um gesto (clique, toque ou tecla), então o áudio
 * é criado no primeiro gesto. Sem Web Audio, o jogo segue normal, só sem som.
 */
export class GameSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private failed = false;
  private enabled: boolean;
  private rainLevel = 0;
  private suspendTimer = 0;
  private readonly listeners = new Set<SoundListener>();

  constructor() {
    // Começa ligado, a não ser que o jogador já tenha desligado antes.
    this.enabled = loadSoundOn() ?? true;
    // Fase de captura: o áudio é criado antes de o botão clicado tocar algum som.
    const unlock = (): void => this.unlock();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown']) window.addEventListener(type, unlock, true);
    document.addEventListener('visibilitychange', () => this.syncRunning());
  }

  /** true = som ligado (escolha do jogador). O som de fato só começa depois do primeiro gesto. */
  get on(): boolean {
    return this.enabled;
  }

  toggle(): void {
    this.setOn(!this.enabled);
  }

  setOn(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    saveSoundOn(on);
    if (on && !this.ctx) this.create();
    this.syncRunning();
    for (const listener of this.listeners) listener(on);
  }

  /** Avisa quando o som liga ou desliga. Devolve a função que para de avisar. */
  onChange(listener: SoundListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Quantidade de chuva, de 0 a 1 (chamado a cada quadro; só muda o som quando o valor muda). */
  setRain(level: number): void {
    if (Math.abs(level - this.rainLevel) < 0.01) return;
    this.rainLevel = level;
    this.applyRain();
  }

  /** Pin conquistado: quatro notas subindo e um brilho no fim. */
  pin(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    PIN_NOTES.forEach((freq, i) => this.tone(freq, t + i * 0.09, 0.5, 0.4));
    this.tone(PIN_NOTES[PIN_NOTES.length - 1] * 2, t + 0.27, 0.7, 0.1, 'sine');
  }

  /** Resposta certa (pergunta ou mochila): duas notas curtas subindo. Errar não tem som. */
  right(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    RIGHT_NOTES.forEach((freq, i) => this.tone(freq, t + i * 0.08, 0.35, 0.3, 'sine'));
  }

  /** Dado saindo da mão: três batidinhas rápidas. */
  diceShake(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    [0, 0.06, 0.13].forEach((delay, i) => this.knock(t + delay, 0.35 - i * 0.05, 1300 + Math.random() * 200));
  }

  /** Dado parando no chão: uma batida e um quique mais fraco. */
  diceLand(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + 0.01;
    this.knock(t, 0.5, 900);
    this.knock(t + 0.09, 0.2, 1000);
  }

  private unlock(): void {
    if (!this.ctx) {
      if (this.enabled) this.create();
      return;
    }
    // O celular pode suspender o áudio sozinho (ex.: depois de uma ligação): retoma no próximo gesto.
    if (this.enabled && !document.hidden && this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
  }

  private create(): void {
    if (this.ctx || this.failed || !canStartAudio()) return;
    const Ctor = audioContextClass();
    if (!Ctor) {
      this.failed = true;
      return;
    }
    let ctx: AudioContext;
    try {
      ctx = new Ctor();
    } catch {
      this.failed = true;
      return;
    }

    const master = ctx.createGain();
    // Começa em silêncio e sobe aos poucos (syncRunning), sem estalo.
    master.gain.value = 0;
    master.connect(ctx.destination);
    const effects = ctx.createGain();
    effects.gain.value = AUDIO.effects;
    effects.connect(master);

    // Chuva: ruído rosa em loop, sem os graves (ronco) e com os agudos controlados pelo filtro.
    const source = ctx.createBufferSource();
    source.buffer = pinkNoise(ctx, NOISE_SECONDS);
    source.loop = true;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 350;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = RAIN_CUTOFF_MIN;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    source.connect(highpass).connect(lowpass).connect(rainGain).connect(master);
    source.start();

    this.ctx = ctx;
    this.master = master;
    this.effects = effects;
    this.rainGain = rainGain;
    this.rainFilter = lowpass;
    this.applyRain();
    this.syncRunning();
  }

  /** Com o som desligado ou a aba escondida, o áudio fica suspenso (não gasta processamento). */
  private syncRunning(): void {
    const { ctx, master } = this;
    if (!ctx || !master) return;
    window.clearTimeout(this.suspendTimer);
    const run = this.enabled && !document.hidden;
    master.gain.setTargetAtTime(run ? AUDIO.master : 0, ctx.currentTime, 0.03);
    if (run) {
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    } else if (ctx.state === 'running') {
      // Abaixa o volume antes de suspender, para não estalar.
      this.suspendTimer = window.setTimeout(() => void ctx.suspend().catch(() => undefined), 200);
    }
  }

  private applyRain(): void {
    const { ctx, rainGain, rainFilter } = this;
    if (!ctx || !rainGain || !rainFilter) return;
    const level = this.rainLevel;
    const t = ctx.currentTime;
    // Raiz quadrada: a chuva fraca ainda se ouve (metade do volume com um quarto da chuva).
    rainGain.gain.setTargetAtTime(AUDIO.rain * Math.sqrt(level), t, RAIN_SMOOTHING);
    rainFilter.frequency.setTargetAtTime(RAIN_CUTOFF_MIN + (RAIN_CUTOFF_MAX - RAIN_CUTOFF_MIN) * level, t, RAIN_SMOOTHING);
  }

  /** Contexto pronto para tocar um efeito agora (som ligado e áudio rodando), ou null. */
  private ready(): AudioContext | null {
    const { ctx } = this;
    return ctx && this.effects && this.enabled && ctx.state === 'running' ? ctx : null;
  }

  /** Uma nota curta: ataque rápido e final suave. */
  private tone(freq: number, start: number, duration: number, peak: number, type: OscillatorType = 'triangle'): void {
    const { ctx, effects } = this;
    if (!ctx || !effects) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(env).connect(effects);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** Batidinha de madeira: um tom que cai rápido de altura e some em poucos centésimos. */
  private knock(start: number, peak: number, freq: number): void {
    const { ctx, effects } = this;
    if (!ctx || !effects) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.35, start + 0.05);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.003);
    env.gain.exponentialRampToValueAtTime(0.001, start + 0.07);
    osc.connect(env).connect(effects);
    osc.start(start);
    osc.stop(start + 0.1);
  }
}
