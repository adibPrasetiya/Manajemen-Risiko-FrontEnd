import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiService } from '../../../../core/services/ui.service';
import { AuthService } from '../../../../core/services/auth.service';


type UserProfile = {
  jabatan: string;
  unitKerja: string;
  nomorHp?: string;
  email?: string;
};

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent {
  dropdownOpen = false;
  justPicked = false;

  profileForm = this.fb.group({
    jabatan: ['', [Validators.required, Validators.minLength(3)]],
    unitKerja: ['', [Validators.required]],
    nomorHp: [''],
    email: [''],
  });

  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  passError = '';

  @ViewChild('unitInput') unitInput!: ElementRef<HTMLInputElement>;

  private unitKerjaMaster: string[] = [
    'Direktorat Keamanan Siber',
    'Direktorat Tata Kelola Keamanan Siber',
    'Direktorat Operasi Keamanan Siber',
    'Direktorat Proteksi Infrastruktur Informasi Vital',
    'Pusat Data dan TIK',
    'Unit Kerja SDM',
    'Unit Kerja Keuangan',
    'Unit Kerja Hukum',
  ];

  filteredUnitKerja: string[] = [];
  showUnitDropdown = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private ui: UiService,
    private auth: AuthService
  ) {
    const raw = localStorage.getItem('user_profile');
    const data: UserProfile | null = raw ? JSON.parse(raw) : null;

    if (data) {
      this.profileForm.patchValue({
        jabatan: data.jabatan ?? '',
        unitKerja: data.unitKerja ?? '',
        nomorHp: data.nomorHp ?? '',
        email: data.email ?? '',
      });
    }

    this.filteredUnitKerja = [...this.unitKerjaMaster];
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goDashboard() {
    this.dropdownOpen = false;
    this.router.navigate(['/auth/dashboard']);
  }

  logout() {
    this.dropdownOpen = false;

    localStorage.removeItem('user_profile');
    localStorage.removeItem('auth_username');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    this.router.navigate(['/auth/login']);
  }

  onUnitFocus() {
    if (this.justPicked) return;
    this.onUnitInput();
    this.showUnitDropdown = true;
  }

  onUnitInput() {
    if (this.justPicked) return;

    const q = (this.profileForm.value.unitKerja ?? '').toLowerCase().trim();
    this.filteredUnitKerja = this.unitKerjaMaster
      .filter((x) => x.toLowerCase().includes(q))
      .slice(0, 8);

    this.showUnitDropdown = this.filteredUnitKerja.length > 0;
  }

  pickUnit(value: string) {
    this.profileForm.patchValue({ unitKerja: value });
    this.showUnitDropdown = false;

    this.justPicked = true;
    this.unitInput?.nativeElement?.blur();
    setTimeout(() => (this.justPicked = false), 150);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement | null;
    if (!el) return;

    const insideMenu = el.closest('.profile-menu') !== null;
    if (!insideMenu) this.dropdownOpen = false;

    const insideUnit = el.closest('.unit-wrapper') !== null;
    if (!insideUnit) this.showUnitDropdown = false;
  }

  // ✅ SAVE PROFILE dengan loading + toast sukses + redirect
  saveProfile() {
  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    return;
  }

  const payload: UserProfile = {
    jabatan: this.profileForm.value.jabatan!.trim(),
    unitKerja: (this.profileForm.value.unitKerja ?? '').trim(),
    nomorHp: (this.profileForm.value.nomorHp ?? '').trim() || undefined,
    email: (this.profileForm.value.email ?? '').trim() || undefined,
  };

  // kalau save ke local saja, minimal kasih UX loading yang konsisten
  this.ui.showLoading();

  // simulasi delay kecil biar UX smooth (kalau nanti diganti API, tinggal hapus setTimeout)
  setTimeout(() => {
    localStorage.setItem('user_profile', JSON.stringify(payload));
    this.ui.hideLoading();

    this.ui.success('Perubahan profil berhasil disimpan', 'Profil diperbarui', 1500);
    this.router.navigate(['/auth/dashboard']);
  }, 250);
}

changePassword() {
  this.passError = '';

  if (this.passwordForm.invalid) {
    this.passwordForm.markAllAsTouched();
    return;
  }

  const currentPassword = this.passwordForm.value.currentPassword ?? '';
  const newPassword = this.passwordForm.value.newPassword ?? '';
  const confirmPassword = this.passwordForm.value.confirmPassword ?? '';

  if (newPassword !== confirmPassword) {
    this.passError = 'Konfirmasi password tidak sama dengan password baru.';
    return;
  }

  this.ui.showLoading();

  // ✅ pakai API beneran (AuthService.changePassword)
  // Pastikan kamu inject AuthService juga di constructor
  this.auth.changePassword(currentPassword, newPassword).subscribe({
    next: () => {
      this.passwordForm.reset();
      this.ui.hideLoading();
      this.ui.success('Password berhasil diubah', 'Berhasil', 1500);
    },
    error: (e) => {
      this.ui.hideLoading();
      const msg =
        e?.error?.errors ||
        e?.error?.message ||
        'Gagal mengubah password. Coba lagi.';
      this.ui.error(msg, 'Gagal', 2200);
    },
  });
}
}
