import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface MoisCalendrier {
  mois: string;           // ISO date string (1er du mois)
  montant: number;
  statut: 'paye' | 'en_attente' | 'non_paye';
  paiementId: string | null;
  statutPaiement: string | null;
}

export interface ResumeCalendrier {
  totalMois: number;
  totalPaye: number;
  montantPaye: number;
  montantTotal: number;
  resteAPayer: number;
}

export interface PaiementLoyerItem {
  _id: string;
  reservationId: any;
  boutiqueId: any;
  moisConcernes: string[];
  montantTotal: number;
  statut: 'en_attente' | 'validé' | 'refusé' | 'annulé';
  note: string | null;
  motifRefus: string | null;
  traitePar: any;
  createdAt: string;
  updatedAt: string;
}

export interface CalendrierResponse {
  reservation: any;
  paiements: PaiementLoyerItem[];
  calendrier: MoisCalendrier[];
  resume: ResumeCalendrier;
}

@Injectable({ providedIn: 'root' })
export class PaiementLoyerService {
  constructor(private api: ApiService) {}

  getCalendrier(reservationId: string): Observable<CalendrierResponse> {
    return this.api.getList<any>(`api/paiements-loyer/reservation/${reservationId}`).pipe(
      map((res: any) => res.data)
    );
  }

  getAll(params?: { statut?: string; search?: string; sortBy?: string; sortOrder?: string; page?: number; limit?: number }): Observable<{ paiements: PaiementLoyerItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.statut) query.set('statut', params.statut);
    if (params?.search) query.set('search', params.search);
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const q = query.toString();
    return this.api.getList<any>(`api/paiements-loyer${q ? '?' + q : ''}`).pipe(
      map((res: any) => res.data)
    );
  }

  getMesBoutique(): Observable<PaiementLoyerItem[]> {
    return this.api.getList<any>('api/paiements-loyer/boutique').pipe(
      map((res: any) => res.data?.paiements ?? [])
    );
  }

  creer(payload: { reservationId: string; moisConcernes: string[]; note?: string }): Observable<PaiementLoyerItem> {
    return this.api.create<any>('api/paiements-loyer', payload).pipe(
      map((res: any) => res.data?.paiement ?? res)
    );
  }

  valider(id: string): Observable<PaiementLoyerItem> {
    return this.api.updates<any>(`api/paiements-loyer/${id}/valider`, {}).pipe(
      map((res: any) => res.data?.paiement ?? res)
    );
  }

  refuser(id: string, motifRefus?: string): Observable<PaiementLoyerItem> {
    return this.api.updates<any>(`api/paiements-loyer/${id}/refuser`, { motifRefus: motifRefus || '' }).pipe(
      map((res: any) => res.data?.paiement ?? res)
    );
  }

  annuler(id: string): Observable<PaiementLoyerItem> {
    return this.api.updates<any>(`api/paiements-loyer/${id}/annuler`, {}).pipe(
      map((res: any) => res.data?.paiement ?? res)
    );
  }
}
