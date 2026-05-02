import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path:       '',
    redirectTo: 'auth/login',
    pathMatch:  'full',
  },
  {
    path:          'auth/login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path:          'auth/register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.Register),
  },
  {
    path:        'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    children: [
      {
        path:          '',
        loadComponent: () =>
          import('./features/dashboard/views/home/home.component').then(m => m.HomeComponent),
      },
      {
        path:          'invoices',
        loadComponent: () =>
          import('./features/dashboard/views/invoices/invoices.component').then(m => m.InvoicesComponent),
      },
      {
        path:          'payments',
        loadComponent: () =>
          import('./features/dashboard/views/payments/payments.component').then(m => m.PaymentsComponent),
      },
      // {
      //   path:          'portfolio',
      //   loadComponent: () =>
      //     import('./features/dashboard/views/portfolio/portfolio.component').then(m => m.PortfolioComponent),
      // },
    ],
  },
  {
    path:       '**',
    redirectTo: 'auth/login',
  },
];
