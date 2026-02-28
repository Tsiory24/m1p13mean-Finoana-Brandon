import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout').then(m => m.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'utilisateurs',
        loadComponent: () =>
          import('./pages/utilisateurs/utilisateurs').then(m => m.UtilisateursComponent)
      },
      {
        path: 'boutiques',
        loadComponent: () =>
          import('./pages/boutiques/boutiques').then(m => m.BoutiquesComponent)
      },
      {
        path: 'ma-boutique',
        loadComponent: () =>
          import('./pages/boutiques/boutiques').then(m => m.BoutiquesComponent)
      },
      {
        path: 'locales',
        loadComponent: () =>
          import('./pages/locales/locales').then(m => m.LocalesComponent)
      },
      {
        path: 'locales/ajouter',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/locales/locale-form/locale-form').then(m => m.LocaleFormComponent)
      },
      {
        path: 'locales/:id/modifier',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/locales/locale-form/locale-form').then(m => m.LocaleFormComponent)
      },
      {
        path: 'produits',
        loadComponent: () =>
          import('./pages/produits/produits').then(m => m.ProduitsComponent)
      },
      {
        path: 'commandes',
        loadComponent: () =>
          import('./pages/commandes/commandes').then(m => m.CommandesComponent)
      },
      {
        path: 'stocks',
        loadComponent: () =>
          import('./pages/stocks/stocks').then(m => m.StocksComponent)
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/categories').then(m => m.CategoriesComponent)
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./pages/logs/logs').then(m => m.LogsComponent)
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./pages/reservations/reservations').then(m => m.ReservationsComponent)
      },
      {
        path: 'prix-locales',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/prix-locale/prix-locale').then(m => m.PrixLocaleComponent)
      },
      {
        path: 'prix-locales/ajouter',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/prix-locale/prix-locale-form/prix-locale-form').then(m => m.PrixLocaleFormComponent)
      },
      {
        path: 'prix-locales/:id/modifier',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/prix-locale/prix-locale-form/prix-locale-form').then(m => m.PrixLocaleFormComponent)
      },
      {
        path: 'duree-contrats',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/duree-contrat/duree-contrat').then(m => m.DureeContratComponent)
      },
      {
        path: 'horaires',
        loadComponent: () =>
          import('./pages/horaires/horaires').then(m => m.HorairesComponent)
      },
      {
        path: 'affiches',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/affiches/affiches').then(m => m.AffichesComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
