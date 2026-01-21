import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthLayoutComponent } from '../../../../layouts/auth/auth-layout.component';
import { AuthService } from '../../../../core/services/auth.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loading = false;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private ui: UiService
  ) {}

  form = this.fb.group({
    username: ['', [Validators.required]], // identifier (username/email)
    password: ['', [Validators.required]],
    remember: [false],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const identifier = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    this.auth.login({ identifier, password }).subscribe({
      next: (res) => {
        localStorage.setItem('auth_username', res.data.user.username);

        const hasProfile = res.data.user.hasProfile === true;
        localStorage.setItem('hasProfile', String(hasProfile));

        if (!hasProfile) {
          // User belum punya profile, redirect ke halaman create profile
          this.router.navigate(['/auth/create-profile']);
          return;
        }

        this.router.navigate(['/dashboard']);
      },

      error: (e) => {
        if (e?.error?.mustVerifyProfile || e?.error?.mustCreateProfile) {
          return;
        }
        const msg = e?.error?.errors ?? e?.error?.message ?? 'Login gagal';
        this.ui.error(msg);
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
