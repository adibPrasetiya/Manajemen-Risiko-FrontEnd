import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-totp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './totp.component.html',
  styleUrl: './totp.component.scss',
})
export class TotpComponent {
  loading = false;
  errorMsg = '';

  form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]], // 6 digit
  });

  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {}

  async submit() {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const code = this.form.value.code!;
      const ok = await this.verifyTotp(code);

      if (!ok) {
        this.errorMsg = 'Kode TOTP tidak valid.';
        return;
      }

      // ✅ sukses -> arahkan ke profile
      this.router.navigate(['/auth/profile']);
    } catch (e) {
      this.errorMsg = 'Terjadi kesalahan. Coba lagi.';
    } finally {
      this.loading = false;
    }
  }

  private verifyTotp(code: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(code === '123456'), 500);
    });
  }
}
