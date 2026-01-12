import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type StrengthLevel = 'Weak' | 'Standard' | 'Strong';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-strength.component.html',
})
export class PasswordStrengthComponent {
  // ✅ password dibuat signal supaya computed() reaktif
  private passwordSig = signal<string>('');

  @Input()
  set password(value: string) {
    this.passwordSig.set(value ?? '');
  }

  // ✅ scoring rules (0 - 5)
  private score = computed(() => {
    const p = this.passwordSig();
    let s = 0;

    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    if (p.length >= 12) s++;

    return Math.min(s, 5);
  });

  // ✅ 3 kategori
  level = computed<StrengthLevel>(() => {
    const s = this.score();
    if (s <= 2) return 'Weak';
    if (s <= 4) return 'Standard';
    return 'Strong';
  });

  // ✅ posisi indikator bergerak (Weak=0, Standard=50, Strong=100)
  indicatorLeft = computed(() => {
    const lvl = this.level();
    if (lvl === 'Weak') return 0;
    if (lvl === 'Standard') return 50;
    return 100;
  });

  // ✅ bar progress juga ikut berubah
  progress = computed(() => {
    const s = this.score(); // 0..5
    return (s / 5) * 100;   // 0..100
  });

  barClass = computed(() => {
    const lvl = this.level();
    if (lvl === 'Weak') return 'bg-red-500';
    if (lvl === 'Standard') return 'bg-yellow-500';
    return 'bg-secondary'; // teal
  });

  checks = computed(() => {
    const p = this.passwordSig();
    return {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      symbol: /[^A-Za-z0-9]/.test(p),
    };
  });
}
