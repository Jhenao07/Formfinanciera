import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { Register } from './features/auth/register/register.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'auth/login',
    component: LoginComponent
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    // canActivate: [authGuard]
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
