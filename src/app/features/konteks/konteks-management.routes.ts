import { Routes } from '@angular/router';
import { DashboardLayoutComponent } from '../../layouts/dashboard/dashboard-layout.component';
import { KonteksComponent } from './pages/konteks/konteks.component';
import { KonteksDetailComponent } from './pages/konteks-detail/konteks-detail.component';

export const KONTEKS_MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    component: DashboardLayoutComponent,
    children: [
      { path: '', component: KonteksComponent },
      { path: ':konteksId', component: KonteksDetailComponent },
    ],
  },
];
