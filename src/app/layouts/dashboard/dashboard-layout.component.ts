import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent],
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.scss'],
})
export class DashboardLayoutComponent {
  sidebarCollapsed = false;
  private readonly sidebarStorageKey = 'sidebarCollapsed';

  constructor() {
    const stored = localStorage.getItem(this.sidebarStorageKey);
    if (stored !== null) {
      this.sidebarCollapsed = stored === 'true';
    }
  }

  toggleSidebar() {
    this.setSidebarCollapsed(!this.sidebarCollapsed);
  }

  expandSidebar() {
    this.setSidebarCollapsed(false);
  }

  private setSidebarCollapsed(value: boolean) {
    this.sidebarCollapsed = value;
    localStorage.setItem(this.sidebarStorageKey, String(value));
  }
}
