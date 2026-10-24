import { unlock } from './secrets';
import { sounds } from './sound';

/** Dry-brush painting on a canvas: each segment is drawn as a fan of bristles that runs out of ink. */
export class InkPainter {
  private readonly context: CanvasRenderingContext2D;
  private last: { x: number; y: number; time: number; width: number } | null = null;
  private inkLeft = 1;
  private painted = 0;
  enabled = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly surface: HTMLElement
  ) {
    this.context = canvas.getContext('2d')!;
    surface.addEventListener('pointerdown', this.onDown);
    surface.addEventListener('pointermove', this.onMove);
    surface.addEventListener('pointerup', this.onUp);
    surface.addEventListener('pointercancel', this.onUp);
  }

  resize() {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const { width, height } = this.canvas.getBoundingClientRect();
    const snapshot = this.canvas.width ? this.context.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (snapshot) this.context.putImageData(snapshot, 0, 0);
  }

  clear() {
    this.context.save();
    this.context.setTransform(1, 0, 0, 1, 0, 0);
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  destroy() {
    this.surface.removeEventListener('pointerdown', this.onDown);
    this.surface.removeEventListener('pointermove', this.onMove);
    this.surface.removeEventListener('pointerup', this.onUp);
    this.surface.removeEventListener('pointercancel', this.onUp);
  }

  private toCanvas(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private onDown = (event: PointerEvent) => {
    if (!this.enabled || (event.target as HTMLElement).closest('button, a, .mascot')) return;
    event.preventDefault();
    this.surface.setPointerCapture(event.pointerId);
    this.last = { ...this.toCanvas(event), time: performance.now(), width: 4 };
    this.inkLeft = 1;
  };

  private onMove = (event: PointerEvent) => {
    if (!this.enabled || !this.last) return;
    const point = this.toCanvas(event);
    const now = performance.now();
    const speed = Math.hypot(point.x - this.last.x, point.y - this.last.y) / Math.max(1, now - this.last.time);
    const width = this.last.width * 0.7 + Math.max(3, Math.min(24, 24 - speed * 9)) * 0.3;
    this.segment(this.last, point, width);
    this.last = { ...point, time: now, width };
  };

  private onUp = () => {
    if (this.last) sounds.brush();
    this.last = null;
  };

  private segment(from: { x: number; y: number; width: number }, to: { x: number; y: number }, width: number) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const bristles = 9;
    for (let i = 0; i < bristles; i++) {
      if (Math.random() < 0.18 * (1.2 - this.inkLeft)) continue;
      const offset = i / (bristles - 1) - 0.5;
      this.context.strokeStyle = `rgba(21, 21, 21, ${(0.45 + Math.random() * 0.5) * (0.35 + this.inkLeft * 0.65)})`;
      this.context.lineWidth = Math.max(0.8, (width / bristles) * 1.8);
      this.context.lineCap = 'round';
      this.context.beginPath();
      this.context.moveTo(from.x + nx * offset * from.width, from.y + ny * offset * from.width);
      this.context.lineTo(to.x + nx * offset * width, to.y + ny * offset * width);
      this.context.stroke();
    }
    this.inkLeft = Math.max(0, this.inkLeft - length / 2600);
    this.painted += length;
    if (this.painted > 400) unlock('painter');
  }
}
