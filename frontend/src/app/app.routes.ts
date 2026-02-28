import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard, foGuestGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  // ── Front Office (public) ───────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./frontoffice/fo-layout/fo-layout').then(m => m.FoLayoutComponent),
    children: [
      {
        path: '',
        title: 'Accueil | Centre Commercial',
        loadComponent: () =>
          import('./frontoffice/home/home').then(m => m.HomeComponent)
      },
      {
        path: 'boutiques',
        title: 'Nos Boutiques | Centre Commercial',
        loadComponent: () =>
          import('./frontoffice/boutiques-list/boutiques-list').then(m => m.BoutiquesListComponent)
      },
      {
        path: 'boutiques/:slug',
        loadComponent: () =>
          import('./frontoffice/boutique-detail/boutique-detail').then(m => m.BoutiqueDetailComponent)
      },
      {
        path: 'boutiques/:boutiqueSlug/produits/:slug',
        loadComponent: () =>
          import('./frontoffice/produit-detail/produit-detail').then(m => m.ProduitDetailComponent)
      },
      {
        path: 'horaires',
        title: 'Horaires d’Ouverture | Centre Commercial',
        loadComponent: () =>
          import('./frontoffice/horaires-fo/horaires-fo').then(m => m.HorairesFoComponent)
      }
    ]
  },
  // ── Page connexion FO (sans header/footer) ──────────────────────
  {
    path: 'connexion',
    canActivate: [foGuestGuard],
    loadComponent: () =>
      import('./frontoffice/login-fo/login-fo').then(m => m.LoginFoComponent)
  },
  {
    path: 'login',
    redirectTo: 'backoffice',
    pathMatch: 'full'
  },
  // Login page
  {
    path: 'backoffice',
    canActivate: [guestGuard],
    data: { noIndex: true },
    loadComponent: () =>
      import('./pages/auth/login/login').then(m => m.LoginComponent)
  },
  // Authenticated back-office under /backoffice/*
  {
    path: 'backoffice',
    canActivate: [authGuard],
    data: { noIndex: true },
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
    redirectTo: ''
  }
];
