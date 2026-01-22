import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnChanges {
  @Input() collapsed = false;
  @Output() requestExpand = new EventEmitter<void>();
  usersMenuOpen = true;
  readonly isAdmin: boolean;
  readonly isKomitePusat: boolean;

  constructor(private auth: AuthService) {
    this.isAdmin = this.auth.hasRole('ADMINISTRATOR');
    this.isKomitePusat = this.auth.hasRole('KOMITE_PUSAT');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['collapsed']?.currentValue) {
      this.usersMenuOpen = false;
    }
  }

  toggleUsersMenu(): void {
    if (this.collapsed) {
      this.usersMenuOpen = true;
      this.requestExpand.emit();
      return;
    }

    this.usersMenuOpen = !this.usersMenuOpen;
  }
}
