import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  displayName = 'User';
  displayEmail = '';
  dropdownOpen = false;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    // 1) ambil dari localStorage
    const u = localStorage.getItem('auth_username');
    const e = localStorage.getItem('auth_email');

    if (u) this.displayName = u;
    if (e) this.displayEmail = e;

    // 2) fallback: decode JWT kalau email belum ada
    if (!this.displayEmail) {
      const token = localStorage.getItem('accessToken') || '';
      const decoded = this.decodeJwt(token);

      // banyak backend taruh email di `email` / `username` / `sub`
      const email =
        decoded?.email ||
        decoded?.user?.email ||
        decoded?.data?.email ||
        '';

      const username =
        decoded?.username ||
        decoded?.user?.username ||
        decoded?.data?.username ||
        decoded?.sub ||
        '';

      if (!this.displayName || this.displayName === 'User') {
        if (username && !username.includes('@')) this.displayName = username;
      }

      if (email && typeof email === 'string' && email.includes('@')) {
        this.displayEmail = email;
        // simpan biar next load langsung ada
        localStorage.setItem('auth_email', email);
      }
    }
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
  }

  goEditProfile() {
    this.dropdownOpen = false;
    this.router.navigate(['/dashboard/profile']);
  }

  logout() {
    this.dropdownOpen = false;
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.router.navigate(['/auth/login']);
      },
    });
  }

  // ===== helpers =====
  private decodeJwt(token: string): any | null {
    try {
      if (!token || token.split('.').length < 2) return null;
      const payload = token.split('.')[1];

      // base64url -> base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

      const json = decodeURIComponent(
        atob(padded)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(json);
    } catch {
      return null;
    }
  }
}
