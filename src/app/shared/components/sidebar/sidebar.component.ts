import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() requestExpand = new EventEmitter<void>();
  usersMenuOpen = true;

  toggleUsersMenu(): void {
    if (this.collapsed) {
      this.usersMenuOpen = true;
      this.requestExpand.emit();
      return;
    }

    this.usersMenuOpen = !this.usersMenuOpen;
  }
}
