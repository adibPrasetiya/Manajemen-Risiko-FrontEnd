import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() illustrationSrc = '';
  @Input() illustrationAlt = 'Illustration';
}
