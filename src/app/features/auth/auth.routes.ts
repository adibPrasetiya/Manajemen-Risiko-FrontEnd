import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TotpComponent } from './pages/totp/totp.component';
import { CreateProfileComponent } from '../dashboard/pages/create-profile/create-profile.component';
import { WaitingVerificationComponent } from '../dashboard/pages/waiting-verification/waiting-verification.component';
import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'totp', component: TotpComponent },
  { path: 'create-profile', component: CreateProfileComponent },
  { path: 'waiting-verification', component: WaitingVerificationComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
