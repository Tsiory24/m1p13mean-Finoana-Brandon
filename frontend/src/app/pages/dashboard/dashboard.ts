import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService, User } from '../../shared/service/auth.service';
import {
  DashboardService,
  DashboardStats,
  LoyerBoutiqueRow,
  LoyersStatsData,
  ResponsableStatsData,
  MeilleurProduit,
} from '../../shared/service/dashboard.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface StatCard {
  label: string;
  value: string;
  icon: string;
  color: string;
  route: string;
  queryParams?: Record<string, string>;
  roles: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('loyerChart') loyerChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ventesChart') ventesChartRef!: ElementRef<HTMLCanvasElement>;

  currentUser: User | null = null;
  loading = false;
  loyerBoutiques: LoyerBoutiqueRow[] = [];
  loyersLoading = false;
  loyerAnneeSelectionnee: number | null = null;

  // Années 2015 → année courante
  readonly currentYear: number = new Date().getFullYear();

  private chartInstance: Chart | null = null;
  chartData: LoyersStatsData | null = null;
  private viewInitialized = false;

  // ── Responsable boutique ──────────────────────────────────────────
  respLoading = false;
  respChiffreAffaires = 0;
  respTotalLoyersPaye = 0;
  respBenefice = 0;
  respMeilleurProduit: MeilleurProduit | null = null;
  respChartData: { labels: string[]; ventes: number[] } | null = null;
  respAnneeSelectionnee: number | null = null;
  private ventesChartInstance: Chart | null = null;

  // Cartes pour les rôles non-admin (responsable_boutique, etc.)
  readonly otherRoleCards: StatCard[] = [
    {
      label: 'Produits',
      value: '—',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>`,
      color: 'card-blue',
      route: '/backoffice/produits',
      roles: ['admin', 'responsable_boutique'],
    },
    {
      label: 'Commandes',
      value: '—',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
      color: 'card-green',
      route: '/backoffice/commandes',
      roles: ['admin', 'responsable_boutique', 'acheteur'],
    },
    {
      label: 'Stocks',
      value: '—',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>`,
      color: 'card-purple',
      route: '/backoffice/stocks',
      roles: ['admin', 'responsable_boutique'],
    },
  ];

  // Cartes admin chargées dynamiquement depuis l'API
  adminStatCards: StatCard[] = [
    {
      label: 'Boutiques avec local',
      value: '…',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4v2l8 5 8-5V4zm0 4.18L12 13 4 8.18V20h16V8.18z"/></svg>`,
      color: 'card-navy',
      route: '/backoffice/boutiques',
      roles: ['admin'],
    },
    {
      label: 'Total des locaux',
      value: '…',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
      color: 'card-gold',
      route: '/backoffice/locales',
      roles: ['admin'],
    },
    {
      label: 'Locaux sans boutique',
      value: '…',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      color: 'card-orange',
      route: '/backoffice/locales',
      queryParams: { dispo: 'true' },
      roles: ['admin'],
    },
    {
      label: 'Utilisateurs inscrits',
      value: '…',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
      color: 'card-red',
      route: '/backoffice/utilisateurs',
      roles: ['admin'],
    },
  ];

  get isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  get filteredCards(): StatCard[] {
    const role = this.currentUser?.role ?? '';
    return this.otherRoleCards.filter(c => c.roles.includes(role));
  }

  constructor(
    private authService: AuthService,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
  ) {}

  get isResponsable(): boolean {
    return this.currentUser?.role === 'responsable_boutique';
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u?.role === 'admin') {
        this.loadAdminStats();
        this.loadLoyersStats();
      } else if (u?.role === 'responsable_boutique') {
        this.loadResponsableStats();
      }
    });
    if (this.currentUser?.role === 'admin') {
      this.loadAdminStats();
      this.loadLoyersStats();
    } else if (this.currentUser?.role === 'responsable_boutique') {
      this.loadResponsableStats();
    }
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    if (this.chartData && this.chartData.chart.labels.length > 0) {
      this.renderChart(this.chartData);
    }
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
    this.ventesChartInstance?.destroy();
  }

  private loadAdminStats(): void {
    this.loading = true;
    this.dashboardService.getStats().subscribe({
      next: (stats: DashboardStats) => {
        this.adminStatCards[0].value = String(stats.totalBoutiquesAvecLocal);
        this.adminStatCards[1].value = String(stats.totalLocaux);
        this.adminStatCards[2].value = String(stats.totalLocauxSansLocataire);
        this.adminStatCards[3].value = String(stats.totalUtilisateurs);
        this.loading = false;
      },
      error: () => {
        this.adminStatCards.forEach(c => (c.value = '—'));
        this.loading = false;
      },
    });
  }

  private loadLoyersStats(): void {
    this.loyersLoading = true;
    this.dashboardService.getLoyersStats(this.loyerAnneeSelectionnee ?? undefined).subscribe({
      next: (data: LoyersStatsData) => {
        this.loyerBoutiques = data.boutiques;
        this.loyersLoading = false;
        this.chartData = data;
        // Force DOM update so <canvas> is inserted before renderChart accesses it
        this.cdr.detectChanges();
        if (data.chart.labels.length > 0) {
          this.renderChart(data);
        }
      },
      error: () => {
        this.loyersLoading = false;
      },
    });
  }

  onAnneeChange(annee: string): void {
    const val = annee ? +annee : null;
    // N'appliquer que si la valeur est vide ou une année valide (au moins 4 chiffres, >= 2015)
    if (val !== null && (val < 2015 || String(annee).length < 4)) {
      return;
    }
    this.loyerAnneeSelectionnee = val;
    this.loadLoyersStats();
  }

  get loyerTotaux(): { totalDu: number; totalPaye: number; totalImpaye: number } {
    return this.loyerBoutiques.reduce(
      (acc, row) => ({
        totalDu: acc.totalDu + row.totalDu,
        totalPaye: acc.totalPaye + row.totalPaye,
        totalImpaye: acc.totalImpaye + row.totalImpaye,
      }),
      { totalDu: 0, totalPaye: 0, totalImpaye: 0 },
    );
  }

  private renderChart(data: LoyersStatsData): void {
    if (!this.loyerChartRef?.nativeElement) return;
    this.chartInstance?.destroy();

    const labels = data.chart.labels.map(l => {
      const [y, m] = l.split('-');
      return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    });

    this.chartInstance = new Chart(this.loyerChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Payé (Ar)',
            data: data.chart.paye,
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34, 197, 94, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#22c55e',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
          {
            label: 'Impayé (Ar)',
            data: data.chart.impaye,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.07)',
            borderWidth: 2.5,
            pointBackgroundColor: '#ef4444',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 }, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${(ctx.raw as number).toLocaleString('fr-FR')} Ar`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => `${Number(v).toLocaleString('fr-FR')} Ar`,
              font: { size: 11 },
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  // ── Responsable boutique methods ──────────────────────────────────
  private loadResponsableStats(): void {
    this.respLoading = true;
    this.dashboardService.getResponsableStats(this.respAnneeSelectionnee ?? undefined).subscribe({
      next: (data: ResponsableStatsData) => {
        this.respChiffreAffaires = data.chiffreAffaires;
        this.respTotalLoyersPaye = data.totalLoyersPaye;
        this.respBenefice = data.benefice;
        this.respMeilleurProduit = data.meilleurProduit;
        this.respChartData = data.chart;
        this.respLoading = false;
        this.cdr.detectChanges();
        if (data.chart.labels.length > 0) {
          this.renderVentesChart(data.chart);
        }
      },
      error: () => {
        this.respLoading = false;
      },
    });
  }

  onRespAnneeChange(annee: string): void {
    const val = annee ? +annee : null;
    if (val !== null && (val < 2015 || String(annee).length < 4)) {
      return;
    }
    this.respAnneeSelectionnee = val;
    this.loadResponsableStats();
  }

  private renderVentesChart(data: { labels: string[]; ventes: number[] }): void {
    if (!this.ventesChartRef?.nativeElement) return;
    this.ventesChartInstance?.destroy();

    const labels = data.labels.map(l => {
      const [y, m] = l.split('-');
      return new Date(+y, +m - 1).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    });

    this.ventesChartInstance = new Chart(this.ventesChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ventes (Ar)',
            data: data.ventes,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            borderWidth: 2.5,
            pointBackgroundColor: '#3b82f6',
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { boxWidth: 12, font: { size: 11 }, padding: 16 },
          },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${(ctx.raw as number).toLocaleString('fr-FR')} Ar`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => `${Number(v).toLocaleString('fr-FR')} Ar`,
              font: { size: 11 },
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          x: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
  }

  formatMontant(value: number): string {
    return value.toLocaleString('fr-FR') + ' Ar';
  }

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  }

  get roleLabel(): string {
    switch (this.currentUser?.role) {
      case 'admin':
        return 'Administrateur';
      case 'responsable_boutique':
        return 'Responsable boutique';
      case 'acheteur':
        return 'Acheteur';
      default:
        return '';
    }
  }
}
