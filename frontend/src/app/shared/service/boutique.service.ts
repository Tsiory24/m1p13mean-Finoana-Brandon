import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface BoutiqueItem {
  _id: string;
  nom: string;
  type: 'kiosque' | 'stand' | 'magasin';
  active: boolean;
  image: string | null;
  localeId: {
    _id: string;
    code: string;
    zone: string;
    surface: number;
    etat?: string;
  } | null;
  proprietaire: {
    _id: string;
    nom: string;
    email?: string;
    contact?: string;
  } | null;
  createdAt: string;
  updatedAt: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  deletedAt: string | null;
}

export interface BoutiqueCreatePayload {
  nom: string;
  type?: 'kiosque' | 'stand' | 'magasin';
  image?: string | null;
}

export interface BoutiqueUpdatePayload {
  nom?: string;
  type?: 'kiosque' | 'stand' | 'magasin';
  active?: boolean;
  image?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BoutiqueService {
  private readonly endpoint = 'api/boutiques';

  constructor(private api: ApiService) {}

  getAll(): Observable<BoutiqueItem[]> {
    return this.api
      .getList<{ success: boolean; data: { boutiques: BoutiqueItem[] } }>(this.endpoint)
      .pipe(map(res => res.data.boutiques));
  }

  getMaBoutique(): Observable<BoutiqueItem | null> {
    return this.api
      .getList<{ success: boolean; data: { boutique: BoutiqueItem | null } }>(`${this.endpoint}/ma-boutique`)
      .pipe(map(res => res.data.boutique));
  }

  create(payload: BoutiqueCreatePayload): Observable<BoutiqueItem> {
    return this.api
      .create<{ success: boolean; data: BoutiqueItem }>(this.endpoint, payload)
      .pipe(map(res => res.data));
  }

  update(id: string, payload: BoutiqueUpdatePayload): Observable<BoutiqueItem> {
    return this.api
      .updates<{ success: boolean; data: BoutiqueItem }>(`${this.endpoint}/${id}`, payload)
      .pipe(map(res => res.data));
  }

  valider(id: string): Observable<BoutiqueItem> {
    return this.api
      .updates<{ success: boolean; data: { boutique: BoutiqueItem } }>(`${this.endpoint}/${id}/valider`, {})
      .pipe(map(res => res.data.boutique));
  }

  annuler(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/${id}/annuler`);
  }

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('image', file);
    return this.api
      .create<{ success: boolean; data: { url: string } }>('api/upload', formData)
      .pipe(map(res => res.data.url));
  }
}
