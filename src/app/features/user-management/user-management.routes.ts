import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { UsersComponent } from './pages/users/users.component';
import { SessionComponent } from './pages/session/session.component';
import { UnitKerjaComponent } from './pages/unit-kerja/unit-kerja.component';
import { ProfileRequestsComponent } from './pages/profile-requests/profile-requests.component';
import { UnverifiedProfilesComponent } from './pages/unverified-profiles/unverified-profiles.component';

export const USER_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: 'users', component: UsersComponent },
      { path: 'unit-kerja', component: UnitKerjaComponent },
      { path: 'session', component: SessionComponent },
      { path: 'profile-requests', component: ProfileRequestsComponent },
      { path: 'unverified-profiles', component: UnverifiedProfilesComponent },
      { path: '', redirectTo: 'users', pathMatch: 'full' },
    ],
  },
];
