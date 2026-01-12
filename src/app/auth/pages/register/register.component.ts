import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthLayoutComponent } from '../../../shared/components/auth-layout/auth-layout.component';
import { PasswordStrengthComponent } from '../../../shared/components/password-strength/password-strength.component';
import { AuthService } from '../../services/auth.service';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    AuthLayoutComponent,
    PasswordStrengthComponent,
  ],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  showPassword = false;
  showConfirmPassword = false;

  loading = false;
  errorMsg = '';

  // input password strength (REACTIVE)
  passwordValue = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
      acceptPrivacy: [false, [Validators.requiredTrue]],
      acceptPolicy: [false, [Validators.requiredTrue]],
      subscribe: [false],
      agreeUpdates: [false],
    },
    { validators: passwordMatchValidator }
  );

  ngOnInit() {
    this.form.get('password')?.valueChanges.subscribe((val) => {
      this.passwordValue.set(val ?? '');
    });
    this.passwordValue.set(this.form.get('password')?.value ?? '');
  }

  get passwordMismatch(): boolean {
    const cp = this.form.get('confirmPassword');
    const interacted = !!(cp?.touched || cp?.dirty);
    return !!(this.form.hasError('passwordMismatch') && interacted);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    const payload = {
      username: (this.form.value.username ?? '').trim(),
      name: (this.form.value.fullName ?? '').trim(),
      email: (this.form.value.email ?? '').trim(),
      password: this.form.value.password ?? '',
    };

    this.auth.register(payload).subscribe({
      next: () => {
        // optional: simpan username supaya dashboard bisa tampil (kalau user langsung login)
        localStorage.setItem('auth_username', payload.username);

        // selesai register -> ke login
        this.router.navigate(['/auth/login']);
      },
      error: (e) => {
        this.errorMsg = e?.error?.message ?? 'Register gagal. Coba lagi.';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
