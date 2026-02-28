import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Promotion {
  _id: string;
  type: 'produit' | 'variant_option';
  produitId: string | null;
  variantId: string | null;
  optionId: string | null;
  optionValeur: string | null;
  boutiqueId: string;
  pourcentage: number;
  prixOriginal: number;
  prixReduit: number;
  dateDebut: string;
  dateFin: string;
  actif: boolean;
  terminePar: 'responsable' | 'expiration' | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionPayload {
  type: 'produit' | 'variant_option';
  produitId: string;
  variantId?: string;
  optionId?: string;
  optionValeur?: string;
  pourcentage: number;
  dateDebut: string;
  dateFin: string;
}

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private readonly endpoint = 'api/promotions';

  constructor(private api: ApiService) {}

  getPromotionsActives(produitId?: string, boutiqueId?: string): Observable<Promotion[]> {
    const qp = new URLSearchParams();
    if (produitId) qp.set('produitId', produitId);
    if (boutiqueId) qp.set('boutiqueId', boutiqueId);
    const url = `${this.endpoint}/actives${qp.toString() ? '?' + qp.toString() : ''}`;
    return this.api
      .getList<{ success: boolean; data: Promotion[] }>(url)
      .pipe(map(res => res.data));
  }

  getPromotionsByBoutique(page = 1, limit = 20): Observable<{
    data: Promotion[];
    total: number;
    page: number;
    limit: number;
  }> {
    const url = `${this.endpoint}/boutique?page=${page}&limit=${limit}`;
    return this.api
      .getList<{ success: boolean; data: Promotion[]; total: number; page: number; limit: number }>(url)
      .pipe(map(res => ({ data: res.data, total: res.total, page: res.page, limit: res.limit })));
  }

  creerPromotion(payload: CreatePromotionPayload): Observable<Promotion> {
    return this.api
      .create<{ success: boolean; data: Promotion }>(this.endpoint, payload)
      .pipe(map(res => res.data));
  }

  terminerPromotion(id: string): Observable<Promotion> {
    return this.api
      .deletest(`${this.endpoint}/${id}`)
      .pipe(map((res: any) => res.data));
  }
}
