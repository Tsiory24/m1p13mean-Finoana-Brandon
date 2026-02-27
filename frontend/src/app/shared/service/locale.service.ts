import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface LocaleItem {
  _id: string;
  code: string;
  zone: string;
  surface: number;
  prixParm2: number;
  etat: 'libre' | 'occupé' | 'maintenance';
  boutiqueId: string | null;
  image: string | null;
  disponibilite: boolean;
  disponibleLe: string | null;
  enAttente: boolean;
  derniereBoutique: { _id: string; nom: string } | null;
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface LocalesResponse {
  success: boolean;
  data: { locales: LocaleItem[] };
}

export interface LocaleResponse {
  success: boolean;
  data: { locale: LocaleItem };
}

export interface LocaleCreatePayload {
  code: string;
  zone: string;
  surface: number;
  etat?: string;
  image?: string | null;
}

export interface LocaleUpdatePayload {
  code?: string;
  zone?: string;
  surface?: number;
  etat?: string;
  image?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly endpoint = 'api/locales';

  constructor(private api: ApiService) {}

  getLocalesAvecDisponibilite(): Observable<LocaleItem[]> {
    return this.api
      .getList<LocalesResponse>(`${this.endpoint}/disponibilite`)
      .pipe(map(res => res.data.locales));
  }

  getById(id: string): Observable<LocaleItem> {
    return this.api
      .getById<LocaleResponse>(this.endpoint, id)
      .pipe(map(res => res.data.locale));
  }

  create(payload: LocaleCreatePayload): Observable<LocaleItem> {
    return this.api
      .create<{ success: boolean; data: { newLocale: LocaleItem } }>(this.endpoint, payload)
      .pipe(map(res => res.data.newLocale));
  }

  update(id: string, payload: LocaleUpdatePayload): Observable<LocaleItem> {
    return this.api
      .updates<{ success: boolean; data: { updatedLocale: LocaleItem } }>(`${this.endpoint}/${id}`, payload)
      .pipe(map(res => res.data.updatedLocale));
  }
}

