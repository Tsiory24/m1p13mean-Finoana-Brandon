import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface AttributProduit {
  cle: string;
  valeur: string;
}

export interface ProduitItem {
  _id: string;
  nom: string;
  slug?: string;
  description: string | null;
  prix_actuel: number;
  uniteId: { _id: string; nom: string } | null;
  boutiqueId: {
    _id: string;
    nom: string;
    slug?: string;
    categorieId: { _id: string; nom: string } | null;
  } | null;
  sousCategorieIds: { _id: string; nom: string }[];
  attributs: AttributProduit[];
  images: string[];
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface ProduitCreatePayload {
  nom: string;
  description?: string | null;
  prix_actuel: number;
  uniteId: string;
  boutiqueId: string;
  sousCategorieIds?: string[];
  attributs?: AttributProduit[];
  images?: string[];
}

export interface ProduitUpdatePayload {
  nom?: string;
  description?: string | null;
  prix_actuel?: number;
  uniteId?: string;
  sousCategorieIds?: string[];
  attributs?: AttributProduit[];
  images?: string[];
}

@Injectable({ providedIn: 'root' })
export class ProduitService {
  private readonly endpoint = 'api/produits';

  constructor(private api: ApiService) {}

  getAll(params?: { boutiqueId?: string; sousCategorieId?: string; uniteId?: string; activeLocale?: boolean }): Observable<ProduitItem[]> {
    let url = this.endpoint;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }
    return this.api
      .getList<{ success: boolean; data: ProduitItem[] }>(url)
      .pipe(map(res => res.data));
  }

  getById(id: string): Observable<ProduitItem> {
    return this.api
      .getList<{ success: boolean; data: ProduitItem }>(`${this.endpoint}/${id}`)
      .pipe(map(res => res.data));
  }

  getBySlug(slug: string): Observable<ProduitItem> {
    return this.api
      .getList<{ success: boolean; data: ProduitItem }>(`${this.endpoint}/by-slug/${slug}`)
      .pipe(map(res => res.data));
  }

  create(payload: ProduitCreatePayload): Observable<ProduitItem> {
    return this.api
      .create<{ success: boolean; data: ProduitItem }>(this.endpoint, payload)
      .pipe(map(res => res.data));
  }

  update(id: string, payload: ProduitUpdatePayload): Observable<ProduitItem> {
    return this.api
      .updates<{ success: boolean; data: ProduitItem }>(`${this.endpoint}/${id}`, payload)
      .pipe(map(res => res.data));
  }

  delete(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/${id}`);
  }
}
