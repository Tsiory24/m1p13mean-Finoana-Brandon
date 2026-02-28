import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface DemandeAffiche {
  _id: string;
  produitId: {
    _id: string;
    nom: string;
    slug?: string;
    prix_actuel: number;
    images: string[];
  };
  boutiqueId: {
    _id: string;
    nom: string;
    slug?: string;
    image?: string | null;
  };
  statut: 'en_attente' | 'accepte' | 'refuse';
  ordre: number | null;
  motifRefus: string | null;
  dateRefus: string | null;
  traitePar: { _id: string; nom: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AfficheConfig {
  _id?: string;
  delaiResoumissionAffiche: number;
  maxProduitsAffiche: number;
  maxBoutiquesAffiche: number;
}

@Injectable({ providedIn: 'root' })
export class AfficheService {
  private readonly endpoint = 'api/affiches';

  constructor(private api: ApiService) {}

  getProduitAffiches(): Observable<DemandeAffiche[]> {
    return this.api
      .getList<{ success: boolean; data: DemandeAffiche[] }>(`${this.endpoint}/produits`)
      .pipe(map(res => res.data));
  }

  getDemandesAdmin(params?: { statut?: string; page?: number; limit?: number }): Observable<{
    data: DemandeAffiche[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qp = new URLSearchParams();
    if (params?.statut) qp.set('statut', params.statut);
    if (params?.page) qp.set('page', String(params.page));
    if (params?.limit) qp.set('limit', String(params.limit));
    const url = `${this.endpoint}/produits/demandes${qp.toString() ? '?' + qp.toString() : ''}`;
    return this.api
      .getList<{ success: boolean; data: DemandeAffiche[]; total: number; page: number; limit: number }>(url)
      .pipe(map(res => ({ data: res.data, total: res.total, page: res.page, limit: res.limit })));
  }

  getDemandesByBoutique(): Observable<DemandeAffiche[]> {
    return this.api
      .getList<{ success: boolean; data: DemandeAffiche[] }>(`${this.endpoint}/produits/mes-demandes`)
      .pipe(map(res => res.data));
  }

  demanderAffiche(produitId: string): Observable<DemandeAffiche> {
    return this.api
      .create<{ success: boolean; data: DemandeAffiche }>(`${this.endpoint}/produits/demander/${produitId}`, {})
      .pipe(map(res => res.data));
  }

  accepterDemande(id: string, ordre?: number): Observable<DemandeAffiche> {
    return this.api
      .updates<{ success: boolean; data: DemandeAffiche }>(`${this.endpoint}/produits/${id}/accepter`, { ordre: ordre ?? null })
      .pipe(map(res => res.data));
  }

  refuserDemande(id: string, motif?: string): Observable<DemandeAffiche> {
    return this.api
      .updates<{ success: boolean; data: DemandeAffiche }>(`${this.endpoint}/produits/${id}/refuser`, { motif: motif ?? null })
      .pipe(map(res => res.data));
  }

  retirerAffiche(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/produits/${id}`);
  }

  reorderAffiches(ordre: { demandeId: string; ordre: number }[]): Observable<void> {
    return this.api
      .updates<{ success: boolean }>(`${this.endpoint}/produits/reorder`, ordre)
      .pipe(map(() => undefined));
  }

  getConfig(): Observable<AfficheConfig> {
    return this.api
      .getList<{ success: boolean; data: AfficheConfig }>(`${this.endpoint}/config`)
      .pipe(map(res => res.data));
  }

  updateConfig(config: Partial<AfficheConfig>): Observable<AfficheConfig> {
    return this.api
      .updates<{ success: boolean; data: AfficheConfig }>(`${this.endpoint}/config`, config)
      .pipe(map(res => res.data));
  }

  retirerAfficheResponsable(demandeId: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/produits/mes-demandes/${demandeId}`);
  }
}
