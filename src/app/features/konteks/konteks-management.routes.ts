import { Routes } from '@angular/router';
import { KonteksComponent } from './pages/konteks/konteks.component';
import { KonteksDetailComponent } from './pages/konteks-detail/konteks-detail.component';

export const KONTEKS_MANAGEMENT_ROUTES: Routes = [
  { path: '', component: KonteksComponent },
  { path: ':konteksId', component: KonteksDetailComponent },
];
