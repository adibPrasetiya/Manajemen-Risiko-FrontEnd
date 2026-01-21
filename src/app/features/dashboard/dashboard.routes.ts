import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      // Redirects for backward compatibility
      { path: 'edit-profile', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'my-profile-requests', redirectTo: 'profile', pathMatch: 'full' },
    ],
  },
];
