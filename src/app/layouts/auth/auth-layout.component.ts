import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-layout.component.html',
  styleUrls: ['./auth-layout.component.scss'],
})
export class AuthLayoutComponent {
  @Input() title = '';
  @Input() subtitle = '';

  /** Optional illustration (shown on the right panel) */
  @Input() illustrationSrc = '';
  @Input() illustrationAlt = 'Illustration';

  /** Set to false if you want the right panel empty (e.g. login page for now) */
  @Input() showIllustration = true;
}
