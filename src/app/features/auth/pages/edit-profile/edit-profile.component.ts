import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiService } from '../../../../core/services/ui.service';


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

  // ✅ flag biar dropdown tidak kebuka lagi tepat setelah pilih item
  justPicked = false;

  // =========================
  // Form: Profile
  // =========================
  profileForm = this.fb.group({
    jabatan: ['', [Validators.required]],
    unitKerja: [''],
    nomorHp: [''],
    email: [''],
  });

  // =========================
  // Form: Change Password
  // =========================
  passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  passError = '';

  // =========================
  // Unit Kerja Dropdown (Autocomplete)
  // =========================
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
    private ui: UiService
  ) {
    // Prefill dari localStorage
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

    // init list dropdown
    this.filteredUnitKerja = [...this.unitKerjaMaster];
  }

  // =========================
  // Top-right menu
  // =========================
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

  // =========================
  // Unit Kerja handlers
  // =========================
  onUnitFocus() {
    if (this.justPicked) return;
    this.onUnitInput();
    this.showUnitDropdown = true;
  }

  onUnitInput() {
    // ✅ kalau baru pick, jangan buka dropdown lagi
    if (this.justPicked) return;

    const q = (this.profileForm.value.unitKerja ?? '').toLowerCase().trim();
    this.filteredUnitKerja = this.unitKerjaMaster
      .filter((x) => x.toLowerCase().includes(q))
      .slice(0, 8);

    this.showUnitDropdown = this.filteredUnitKerja.length > 0;
  }

  pickUnit(value: string) {
    this.profileForm.patchValue({ unitKerja: value });

    // ✅ tutup dropdown
    this.showUnitDropdown = false;

    // ✅ cegah dropdown kebuka lagi karena focus/input
    this.justPicked = true;

    // ✅ hilangkan focus
    this.unitInput?.nativeElement?.blur();

    // setelah sebentar, boleh interaksi normal lagi
    setTimeout(() => (this.justPicked = false), 150);
  }

  // =========================
  // Click outside to close dropdowns
  // =========================
  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement | null;
    if (!el) return;

    // close menu kanan atas
    const insideMenu = el.closest('.profile-menu') !== null;
    if (!insideMenu) this.dropdownOpen = false;

    // close dropdown unit kerja
    const insideUnit = el.closest('.unit-wrapper') !== null;
    if (!insideUnit) this.showUnitDropdown = false;
  }

  // =========================
  // Actions
  // =========================
  saveProfile() {
  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    return;
  }

  const payload = {
    jabatan: this.profileForm.value.jabatan!.trim(),
    unitKerja: (this.profileForm.value.unitKerja ?? '').trim(),
    nomorHp: (this.profileForm.value.nomorHp ?? '').trim() || undefined,
    email: (this.profileForm.value.email ?? '').trim() || undefined,
  };

  localStorage.setItem('user_profile', JSON.stringify(payload));
  this.ui.success('Profil berhasil diperbarui');
  this.router.navigate(['/auth/dashboard']);
}


  changePassword() {
    this.passError = '';

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { newPassword, confirmPassword } = this.passwordForm.value;

    if (newPassword !== confirmPassword) {
      this.passError = 'Konfirmasi password tidak sama dengan password baru.';
      return;
    }

    alert('Password berhasil diubah ✅ (placeholder, belum connect API)');
    this.passwordForm.reset();
  }
}
