import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  UnitKerja,
  UnitKerjaService,
} from '../../../../core/services/unit-kerja.service';
import {
  ProfileService,
  CreateProfileResponse,
} from '../../../../core/services/profile.service';
import { UiService } from '../../../../core/services/ui.service';

@Component({
  selector: 'app-create-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-profile.component.html',
  styleUrl: './create-profile.component.scss',
})
export class CreateProfileComponent {
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
    nomorHP: ['', [Validators.pattern(/^(08|62)[0-9]{8,13}$/)]], // optional
  });

  constructor(
    private fb: FormBuilder,
    private unitSvc: UnitKerjaService,
    private profileSvc: ProfileService,
    private router: Router,
    private ui: UiService
  ) {}

  // fokus input: kalau sudah pilih unit, jangan buka dropdown lagi
  onUnitFocus() {
    if (this.selectedUnitKerjaId) {
      this.showDropdown = false;
      return;
    }
    this.onUnitInput();
  }

  onUnitInput() {
    const q = (this.form.value.unitKerja ?? '').trim();

    // kalau user ngetik manual, reset id dulu
    this.selectedUnitKerjaId = '';

    // kalau sebelumnya ada error notInList, hapus saat user mulai mengetik lagi
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

  // klik pilihan: dropdown langsung hilang + id tersimpan
  pickUnit(u: UnitKerja) {
    this.form.patchValue({ unitKerja: u.name });
    this.selectedUnitKerjaId = u.id;

    // hapus error notInList kalau ada
    this.form.controls.unitKerja.setErrors(null);

    // dropdown langsung ditutup
    this.showDropdown = false;
    this.filteredUnitKerja = [];
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

    const nomorHP = (this.form.value.nomorHP ?? '').trim();

    const payloadApi = {
      jabatan: this.form.value.jabatan!.trim(),
      unitKerjaId: this.selectedUnitKerjaId,
      nomorHP: nomorHP || undefined,
    };

    this.loading = true;

    // hit API create profile: POST /users/me/profiles
    this.profileSvc.createProfile(payloadApi).subscribe({
      next: (res: CreateProfileResponse) => {
        // update local storage
        localStorage.setItem('hasProfile', 'true');
        localStorage.setItem('profileVerified', 'false'); // Profile belum diverifikasi

        this.loading = false;

        // Tampilkan pesan sukses dan redirect ke halaman waiting verification
        this.ui.success(
          res.message ||
            'Profile berhasil dibuat. Silakan tunggu verifikasi dari administrator.',
          'Berhasil'
        );
        this.router.navigate(['/dashboard/waiting-verification']);
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg =
          e?.error?.errors || e?.error?.message || 'Gagal membuat profile';
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
