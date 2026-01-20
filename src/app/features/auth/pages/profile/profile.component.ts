import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UnitKerja, UnitKerjaService } from '../../../../core/services/unit-kerja.service';
import { ProfileService } from '../../../../core/services/profile.service';

type UserProfileLocal = {
  jabatan: string;
  unitKerja: string;      // nama untuk tampilan
  unitKerjaId: string;    // id untuk API
  nomorHP: string;        // ✅ sesuai backend (HP kapital)
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  @ViewChild('unitInput') unitInput!: ElementRef<HTMLInputElement>;

  loading = false;
  errorMsg = '';

  filteredUnitKerja: UnitKerja[] = [];
  showDropdown = false;

  // simpan id unit kerja yang dipilih
  selectedUnitKerjaId = '';

  form = this.fb.group({
    jabatan: ['', [Validators.required, Validators.minLength(3)]],
    unitKerja: ['', [Validators.required]], // tampilan teks
    nomorHP: ['', [Validators.required, Validators.minLength(9)]], // ✅ sesuai backend
  });

  constructor(
    private fb: FormBuilder,
    private unitSvc: UnitKerjaService,
    private profileSvc: ProfileService,
    private router: Router
  ) {}

  // ✅ fokus input: kalau sudah pilih unit, jangan buka dropdown lagi
  onUnitFocus() {
    if (this.selectedUnitKerjaId) {
      this.showDropdown = false;
      return;
    }
    this.onUnitInput();
  }

  onUnitInput() {
    const q = (this.form.value.unitKerja ?? '').trim();

    // ✅ kalau user ngetik manual, reset id dulu
    this.selectedUnitKerjaId = '';

    // ✅ kalau sebelumnya ada error notInList, hapus saat user mulai mengetik lagi
    if (this.form.controls.unitKerja.errors?.['notInList']) {
      this.form.controls.unitKerja.setErrors(null);
    }

    this.unitSvc.search(q).subscribe({
      next: (list) => {
        this.filteredUnitKerja = list;
        this.showDropdown = true;
      },
      error: () => {
        this.filteredUnitKerja = [];
        this.showDropdown = true;
      },
    });
  }

  // ✅ klik pilihan: dropdown langsung hilang + id tersimpan
  pickUnit(u: UnitKerja) {
    this.form.patchValue({ unitKerja: u.name });
    this.selectedUnitKerjaId = u.id;

    // hapus error notInList kalau ada
    this.form.controls.unitKerja.setErrors(null);

    // ✅ dropdown langsung ditutup
    this.showDropdown = false;
    this.filteredUnitKerja = [];

    // ❌ jangan refocus lagi (ini yang bikin id ke-reset lagi dulu)
    // queueMicrotask(() => this.unitInput?.nativeElement?.focus());
  }

  save() {
    this.errorMsg = '';

    // validasi unit kerja wajib dipilih dari dropdown
    if (!this.selectedUnitKerjaId) {
      this.form.controls.unitKerja.setErrors({ notInList: true });
    }

    if (this.form.invalid || !this.selectedUnitKerjaId) {
      this.form.markAllAsTouched();
      return;
    }

    const payloadApi = {
      jabatan: this.form.value.jabatan!.trim(),
      unitKerjaId: this.selectedUnitKerjaId,
      nomorHP: this.form.value.nomorHP!.trim(), // ✅ sesuai backend
    };

    this.loading = true;

    // ✅ hit API create profile: POST /users/me/profiles
    this.profileSvc.createProfile(payloadApi).subscribe({
      next: () => {
        const payloadLocal: UserProfileLocal = {
          jabatan: payloadApi.jabatan,
          unitKerja: (this.form.value.unitKerja ?? '').trim(),
          unitKerjaId: this.selectedUnitKerjaId,
          nomorHP: payloadApi.nomorHP,
        };

        // simpan local buat UI
        localStorage.setItem('user_profile', JSON.stringify(payloadLocal));
        localStorage.setItem('hasProfile', 'true'); // ✅ biar route guard lolos

        this.loading = false;
        this.router.navigate(['/auth/dashboard']);
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg = e?.error?.errors || e?.error?.message || 'Gagal membuat profile';
      },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const clickedInside = target.closest('.unit-wrapper') !== null;
    if (!clickedInside) this.showDropdown = false;
  }
}
