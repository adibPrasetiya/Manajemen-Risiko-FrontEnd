import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { CreateProfileComponent } from './pages/create-profile/create-profile.component';
import { WaitingVerificationComponent } from './pages/waiting-verification/waiting-verification.component';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'create-profile', component: CreateProfileComponent },
      { path: 'waiting-verification', component: WaitingVerificationComponent },
      // Redirects for backward compatibility
      { path: 'edit-profile', redirectTo: 'profile', pathMatch: 'full' },
      { path: 'my-profile-requests', redirectTo: 'profile', pathMatch: 'full' },
    ],
  },
];
