import { Component, ElementRef, NgZone, OnDestroy } from '@angular/core';

/**
 * ═══════════════════════════════════════════════════════════════════════
 *  HERO — INTERACTIVE GRID MASK · v3 PRO
 *  Capas:
 *    1. <img> fondo real
 *    2. Aurora conic + overlay atmosférico
 *    3. Scan lines cross-hair
 *    4. Grid 16×9 con push-out 3D en celdas activas
 *
 *  El hero se inclina (tilt 3D) según posición del cursor.
 * ═══════════════════════════════════════════════════════════════════════
 */
@Component({
  selector: 'app-hero',
  standalone: true,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent implements OnDestroy {

  readonly cols = 16;
  readonly rows = 9;

  readonly cells = Array.from({ length: this.cols * this.rows }, (_, i) => {
    const col = i % this.cols;
    const row = Math.floor(i / this.cols);
    return {
      i,
      cx: +(((col + 0.5) / this.cols) * 100).toFixed(2),
      cy: +(((row + 0.5) / this.rows) * 100).toFixed(2),
    };
  });

  /* rAF throttle */
  private rafId = 0;
  private pendingX = 0;
  private pendingY = 0;
  private pendingHost: HTMLElement | null = null;

  constructor(private zone: NgZone, private host: ElementRef<HTMLElement>) {}

  onMove(e: MouseEvent, host: HTMLElement): void {
    this.pendingX = e.clientX;
    this.pendingY = e.clientY;
    this.pendingHost = host;

    if (this.rafId) return;
    this.zone.runOutsideAngular(() => {
      this.rafId = requestAnimationFrame(() => this.flushMove());
    });
  }

  private flushMove(): void {
    this.rafId = 0;
    const host = this.pendingHost;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    const mx = ((this.pendingX - rect.left) / rect.width) * 100;
    const my = ((this.pendingY - rect.top) / rect.height) * 100;

    /* Tilt 3D — el hero se inclina ±3.5° según cursor */
    const tx = ((mx - 50) / 50) * 3.5;
    const ty = ((my - 50) / 50) * -3.5;

    host.style.setProperty('--mx', mx.toFixed(2));
    host.style.setProperty('--my', my.toFixed(2));
    host.style.setProperty('--tx', tx.toFixed(2));
    host.style.setProperty('--ty', ty.toFixed(2));
  }

  onLeave(host: HTMLElement): void {
    host.style.setProperty('--mx', '-200');
    host.style.setProperty('--my', '-200');
    /* Resetea tilt al salir */
    host.style.setProperty('--tx', '0');
    host.style.setProperty('--ty', '0');
  }

  onClick(e: MouseEvent, host: HTMLElement): void {
    const rect = host.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * 100;
    const ry = ((e.clientY - rect.top) / rect.height) * 100;

    host.style.setProperty('--rx', rx.toFixed(2));
    host.style.setProperty('--ry', ry.toFixed(2));

    host.classList.remove('is-rippling');
    void host.offsetWidth;
    host.classList.add('is-rippling');
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
