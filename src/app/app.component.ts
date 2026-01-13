import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ErrorToastComponent } from './core/components/error-toast/error-toast.component';
import { LoadingOverlayComponent } from './core/components/loading-overlay/loading-overlay.component';
import { RouteLoadingService } from './core/services/route-loading.service';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ErrorToastComponent, LoadingOverlayComponent, ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'bssn-auth-frontend';
  constructor(_rl: RouteLoadingService) {}
}
