import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface DashboardStats {
  totalBoutiquesAvecLocal: number;
  totalLocaux: number;
  totalLocauxSansLocataire: number;
  totalUtilisateurs: number;
}

export interface LoyerBoutiqueRow {
  boutiqueNom: string;
  totalDu: number;
  totalPaye: number;
  totalImpaye: number;
}

export interface LoyersStatsData {
  boutiques: LoyerBoutiqueRow[];
  chart: { labels: string[]; paye: number[]; impaye: number[] };
}

export interface MeilleurProduit {
  nom: string;
  image: string | null;
  quantiteVendue: number;
  montant: number;
}

export interface ResponsableStatsData {
  chiffreAffaires: number;
  totalLoyersPaye: number;
  benefice: number;
  chart: { labels: string[]; ventes: number[] };
  meilleurProduit: MeilleurProduit | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getStats(): Observable<DashboardStats> {
    return this.api.getList<{ success: boolean; data: DashboardStats }>('api/dashboard/stats').pipe(
      map(res => res.data)
    );
  }

  getLoyersStats(annee?: number): Observable<LoyersStatsData> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', String(annee));
    return this.api
      .getList<{ success: boolean; data: LoyersStatsData }>('api/dashboard/loyers-stats', params)
      .pipe(map(res => res.data));
  }

  getResponsableStats(annee?: number): Observable<ResponsableStatsData> {
    let params = new HttpParams();
    if (annee) params = params.set('annee', String(annee));
    return this.api
      .getList<{ success: boolean; data: ResponsableStatsData }>('api/dashboard/responsable-stats', params)
      .pipe(map(res => res.data));
  }
}
