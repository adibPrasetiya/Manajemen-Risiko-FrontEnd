import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthLayoutComponent } from '../../../../shared/components/auth-layout/auth-layout.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AuthLayoutComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  loading = false;
  errorMsg = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  form = this.fb.group({
    username: ['', [Validators.required]],  // bisa username / email (identifier)
    password: ['', [Validators.required]],
    remember: [false],
  });

  submit() {
  if (this.form.invalid) {
    this.form.markAllAsTouched();
    return;
  }

  const identifier = (this.form.value.username ?? '').trim();
  const password = this.form.value.password ?? '';

  this.auth.login({ identifier, password }).subscribe({
    next: (res) => {
      const hasProfile = !!res.data.user.hasProfile;
      localStorage.setItem('auth_username', res.data.user.username);

      if (!hasProfile) {
        this.router.navigate(['/auth/profile']);
        return;
      }
      this.router.navigate(['/auth/dashboard']);
    },
    error: (e) => {
      alert(e?.error?.errors ?? e?.error?.message ?? 'Login gagal');
    },
  });
}
}