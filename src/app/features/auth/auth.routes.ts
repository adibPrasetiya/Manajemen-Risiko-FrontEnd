import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { TotpComponent } from './pages/totp/totp.component';
import { CreateProfileComponent } from '../dashboard/pages/create-profile/create-profile.component';
import { WaitingVerificationComponent } from '../dashboard/pages/waiting-verification/waiting-verification.component';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'totp', component: TotpComponent },
  { path: 'create-profile', component: CreateProfileComponent },
  { path: 'waiting-verification', component: WaitingVerificationComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
