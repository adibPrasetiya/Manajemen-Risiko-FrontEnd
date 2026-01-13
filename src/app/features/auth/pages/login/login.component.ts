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
    this.errorMsg = '';

    const identifier = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    this.auth.login({ identifier, password }).subscribe({
      next: (res) => {
        // token sudah disimpan di AuthService tap()
        // kalau mau tetap simpan username untuk header:
        localStorage.setItem('auth_username', res.data.user.username);

        // redirect
        this.router.navigate(['/auth/dashboard']);
      },
      error: (e) => {
        this.errorMsg = e?.error?.errors ?? e?.error?.message ?? 'Login gagal';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
