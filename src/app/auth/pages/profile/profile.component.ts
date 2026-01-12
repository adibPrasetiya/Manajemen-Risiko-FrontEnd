import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UnitKerja, UnitKerjaService } from '../../services/unit-kerja.service';
import { ProfileService } from '../../services/profile.service';

type UserProfileLocal = {
  jabatan: string;
  unitKerja: string;      // nama untuk tampilan
  unitKerjaId: string;    // id untuk API
  nomorHp?: string;
  email?: string;         // tetap simpan local aja (API profile gak ada email)
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

  filteredUnitKerja: UnitKerja[] = [];
  showDropdown = false;

  // ini yang penting: simpan id unit kerja yang dipilih
  selectedUnitKerjaId = '';

  form = this.fb.group({
    jabatan: ['', [Validators.required, Validators.minLength(3)]],
    unitKerja: ['', [Validators.required]], // wajib karena unitKerjaId wajib
    nomorHp: [''],
    email: [''],
  });

  constructor(
    private fb: FormBuilder,
    private unitSvc: UnitKerjaService,
    private profileSvc: ProfileService,
    private router: Router
  ) {}

  onUnitInput() {
    const q = (this.form.value.unitKerja ?? '').trim();

    // kalau user ngetik manual, reset id dulu
    this.selectedUnitKerjaId = '';

    this.unitSvc.search(q).subscribe({
      next: (list) => {
        this.filteredUnitKerja = list;
        this.showDropdown = true; // tampilkan walau kosong biar ada "Tidak ada yang cocok"
      },
      error: () => {
        this.filteredUnitKerja = [];
        this.showDropdown = true;
      },
    });
  }

  pickUnit(u: UnitKerja) {
    this.form.patchValue({ unitKerja: u.name });
    this.selectedUnitKerjaId = u.id;
    this.showDropdown = false;
    queueMicrotask(() => this.unitInput?.nativeElement?.focus());
  }

  save() {
    if (this.form.invalid || !this.selectedUnitKerjaId) {
      this.form.markAllAsTouched();
      if (!this.selectedUnitKerjaId) alert('Pilih Unit Kerja dari dropdown ya.');
      return;
    }

    const payloadApi = {
      jabatan: this.form.value.jabatan!.trim(),
      unitKerjaId: this.selectedUnitKerjaId,
      nomorHp: (this.form.value.nomorHp ?? '').trim() || undefined,
    };

    // ✅ hit API create profile
    this.profileSvc.createProfile(payloadApi).subscribe({
      next: () => {
        // ✅ simpan local untuk kebutuhan UI kamu (dashboard/edit profile)
        const payloadLocal: UserProfileLocal = {
          jabatan: payloadApi.jabatan,
          unitKerja: (this.form.value.unitKerja ?? '').trim(),
          unitKerjaId: this.selectedUnitKerjaId,
          nomorHp: payloadApi.nomorHp,
          email: (this.form.value.email ?? '').trim() || undefined,
        };

        localStorage.setItem('user_profile', JSON.stringify(payloadLocal));

        // ✅ setelah create profile -> dashboard
        this.router.navigate(['/auth/dashboard']);
      },
      error: (e) => {
        alert(e?.error?.errors ?? 'Gagal membuat profile');
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
