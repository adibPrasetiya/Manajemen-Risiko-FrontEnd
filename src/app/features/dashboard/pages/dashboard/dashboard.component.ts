import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

type UserProfile = {
  jabatan: string;
  unitKerja: string;
  nomorHp?: string;
  email?: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  dropdownOpen = false;

  // ✅ Sidebar state (default open)
  sidebarCollapsed = false;

  profile: UserProfile | null = null;

  constructor(private router: Router) {
    const raw = localStorage.getItem('user_profile');
    this.profile = raw ? (JSON.parse(raw) as UserProfile) : null;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  // ✅ Toggle sidebar collapse
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  goEditProfile() {
    this.dropdownOpen = false;
    this.router.navigate(['/auth/edit-profile']);
  }

  logout() {
    this.dropdownOpen = false;
    localStorage.removeItem('user_profile');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/auth/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent) {
    const el = ev.target as HTMLElement | null;
    if (!el) return;

    const inside = el.closest('.profile-menu') !== null;
    if (!inside) this.dropdownOpen = false;
  }

  get displayName() {
    const username = (localStorage.getItem('auth_username') ?? '').trim();
    if (username) return username;
    return this.profile?.jabatan || 'Profile';
  }
}
