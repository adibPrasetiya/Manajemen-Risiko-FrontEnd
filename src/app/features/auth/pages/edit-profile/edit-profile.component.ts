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

  // data yang ditampilkan di halaman (diambil dari hasil registrasi / penyimpanan lokal)
  username = '-';
  profile: UserProfile = { jabatan: '-', unitKerja: '-' };

  // kontrol popup / modal
  showEditProfileModal = false;
  showChangePasswordModal = false;

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
    this.refreshDisplayedProfile();
    this.filteredUnitKerja = [...this.unitKerjaMaster];
  }
private isUnitValid(value: string | null | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return this.unitKerjaMaster.some((x) => x.trim().toLowerCase() === v);
}

  /** Ambil data dari localStorage untuk ditampilkan pada halaman */
  private refreshDisplayedProfile() {
    this.username = localStorage.getItem('auth_username') ?? '-';

    const raw = localStorage.getItem('user_profile');
    const data: UserProfile | null = raw ? JSON.parse(raw) : null;

    this.profile = {
      jabatan: data?.jabatan ?? '-',
      unitKerja: data?.unitKerja ?? '-',
      nomorHp: data?.nomorHp ?? undefined,
      email: data?.email ?? undefined,
    };
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

  // ====== MODAL: Edit Profile ======
  openEditProfile() {
    const raw = localStorage.getItem('user_profile');
    const data: UserProfile | null = raw ? JSON.parse(raw) : null;

    this.profileForm.patchValue({
      jabatan: data?.jabatan ?? '',
      unitKerja: data?.unitKerja ?? '',
      nomorHp: data?.nomorHp ?? '',
      email: data?.email ?? '',
    });

    this.filteredUnitKerja = [...this.unitKerjaMaster];
    this.passError = '';
    this.showEditProfileModal = true;

    setTimeout(() => this.unitInput?.nativeElement?.focus?.(), 0);
  }

  closeEditProfile() {
    this.showEditProfileModal = false;
    this.showUnitDropdown = false;
    this.justPicked = false;
  }

  // ====== MODAL: Change Password ======
  openChangePassword() {
    this.passwordForm.reset();
    this.passError = '';
    this.showChangePasswordModal = true;
  }

  closeChangePassword() {
    this.showChangePasswordModal = false;
    this.passError = '';
  }

  // ====== Unit Kerja Autocomplete ======
onUnitFocus() {
  // Jangan munculin dropdown saat fokus kalau belum mengetik
  this.showUnitDropdown = false;
}

onUnitInput() {
  if (this.justPicked) return;

  const q = (this.profileForm.value.unitKerja ?? '').toLowerCase().trim();

  // Kalau kosong, jangan tampilkan dropdown
  if (!q) {
    this.showUnitDropdown = false;
    this.filteredUnitKerja = [];
    return;
  }

  this.filteredUnitKerja = this.unitKerjaMaster
    .filter((x) => x.toLowerCase().includes(q))
    .slice(0, 8);

  this.showUnitDropdown = this.filteredUnitKerja.length > 0;
}

  
  pickUnit(value: string) {
    this.justPicked = true;
    this.profileForm.patchValue({ unitKerja: value });
    this.showUnitDropdown = false;

    setTimeout(() => (this.justPicked = false), 0);
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

  // ✅ SIMPAN PROFILE: update localStorage + update tampilan
  saveProfile() {
  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    return;
  }

  // ✅ Validasi Unit Kerja harus match salah satu item dropdown (exact match)
  const unitVal = this.profileForm.value.unitKerja ?? '';
  if (!this.isUnitValid(unitVal)) {
    this.profileForm.controls.unitKerja.setErrors({ notInList: true });
    this.showUnitDropdown = false;
    return;
  }

  const payload: UserProfile = {
    jabatan: this.profileForm.value.jabatan!.trim(),
    unitKerja: unitVal.trim(),
    nomorHp: (this.profileForm.value.nomorHp ?? '').trim() || undefined,
    email: (this.profileForm.value.email ?? '').trim() || undefined,
  };

  this.ui.showLoading();

  setTimeout(() => {
    localStorage.setItem('user_profile', JSON.stringify(payload));
    this.ui.hideLoading();

    this.refreshDisplayedProfile();
    this.closeEditProfile();

    this.ui.success('Perubahan profil berhasil disimpan', 'Profil diperbarui', 1500);
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

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.ui.hideLoading();
        this.closeChangePassword();
        this.ui.success('Password berhasil diubah', 'Berhasil', 1500);
      },
      error: (e) => {
        this.ui.hideLoading();

        // kalau password saat ini salah, munculkan error spesifik
        const rawMsg = (e?.error?.errors || e?.error?.message || '')
          .toString()
          .toLowerCase();

        if (
          e?.status === 400 ||
          e?.status === 401 ||
          rawMsg.includes('current') ||
          rawMsg.includes('password')
        ) {
          this.passError = 'Password tidak tepat.';
          console.error('[ChangePassword] Password tidak tepat:', e);
          return;
        }

        const msg =
          e?.error?.errors ||
          e?.error?.message ||
          'Gagal mengubah password. Coba lagi.';
        this.ui.error(msg, 'Gagal', 2200);
        console.error('[ChangePassword] Error:', e);
      },
    });
  }
}
