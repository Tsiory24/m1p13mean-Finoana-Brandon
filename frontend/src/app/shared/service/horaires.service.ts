import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface HoraireCentre {
  _id?: string;
  jour: string;
  heure_ouverture: string | null;
  heure_fermeture: string | null;
  ferme: boolean;
}

export interface ExceptionCentre {
  _id: string;
  date: string;
  heure_ouverture: string | null;
  heure_fermeture: string | null;
  ferme: boolean;
  motif: string | null;
}

export interface HoraireBoutique extends HoraireCentre {
  boutiqueId?: string;
  fermePar?: 'centre' | 'boutique' | null;
}

export interface ExceptionBoutique extends ExceptionCentre {
  boutiqueId?: string;
  fermePar?: 'centre' | 'boutique' | null;
}

export interface HorairePayload {
  heure_ouverture?: string | null;
  heure_fermeture?: string | null;
  ferme: boolean;
}

export interface ExceptionPayload {
  date: string;
  heure_ouverture?: string | null;
  heure_fermeture?: string | null;
  ferme: boolean;
  motif?: string | null;
}

@Injectable({ providedIn: 'root' })
export class HorairesService {
  private readonly endpoint = 'api/horaires';

  constructor(private api: ApiService) {}

  // ── Centre ────────────────────────────────────────────────────────
  getHorairesCentre(): Observable<HoraireCentre[]> {
    return this.api
      .getList<{ success: boolean; data: HoraireCentre[] }>(`${this.endpoint}/centre`)
      .pipe(map(res => res.data));
  }

  upsertHoraireCentre(jour: string, payload: HorairePayload): Observable<HoraireCentre> {
    return this.api
      .update<{ success: boolean; data: HoraireCentre }>(`${this.endpoint}/centre/${jour}`, payload as any)
      .pipe(map(res => res.data));
  }

  getExceptionsCentre(annee: number, mois: number): Observable<ExceptionCentre[]> {
    return this.api
      .getList<{ success: boolean; data: ExceptionCentre[] }>(`${this.endpoint}/centre/exceptions?annee=${annee}&mois=${mois}`)
      .pipe(map(res => res.data));
  }

  createExceptionCentre(payload: ExceptionPayload): Observable<ExceptionCentre> {
    return this.api
      .create<{ success: boolean; data: ExceptionCentre }>(`${this.endpoint}/centre/exceptions`, payload)
      .pipe(map(res => res.data));
  }

  updateExceptionCentre(id: string, payload: Omit<ExceptionPayload, 'date'>): Observable<ExceptionCentre> {
    return this.api
      .update<{ success: boolean; data: ExceptionCentre }>(`${this.endpoint}/centre/exceptions/${id}`, payload as any)
      .pipe(map(res => res.data));
  }

  deleteExceptionCentre(id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/centre/exceptions/${id}`);
  }

  // ── Boutiques ─────────────────────────────────────────────────────
  getHorairesBoutique(boutiqueId: string): Observable<HoraireBoutique[]> {
    return this.api
      .getList<{ success: boolean; data: HoraireBoutique[] }>(`${this.endpoint}/boutiques/${boutiqueId}`)
      .pipe(map(res => res.data));
  }

  upsertHoraireBoutique(boutiqueId: string, jour: string, payload: HorairePayload): Observable<HoraireBoutique> {
    return this.api
      .update<{ success: boolean; data: HoraireBoutique }>(`${this.endpoint}/boutiques/${boutiqueId}/${jour}`, payload as any)
      .pipe(map(res => res.data));
  }

  getExceptionsBoutique(boutiqueId: string, annee: number, mois: number): Observable<{ data: ExceptionBoutique[]; exceptionsCentre: ExceptionCentre[] }> {
    return this.api
      .getList<{ success: boolean; data: ExceptionBoutique[]; exceptionsCentre: ExceptionCentre[] }>(`${this.endpoint}/boutiques/${boutiqueId}/exceptions?annee=${annee}&mois=${mois}`)
      .pipe(map(res => ({ data: res.data, exceptionsCentre: res.exceptionsCentre })));
  }

  createExceptionBoutique(boutiqueId: string, payload: ExceptionPayload): Observable<ExceptionBoutique> {
    return this.api
      .create<{ success: boolean; data: ExceptionBoutique }>(`${this.endpoint}/boutiques/${boutiqueId}/exceptions`, payload)
      .pipe(map(res => res.data));
  }

  updateExceptionBoutique(boutiqueId: string, id: string, payload: Omit<ExceptionPayload, 'date'>): Observable<ExceptionBoutique> {
    return this.api
      .update<{ success: boolean; data: ExceptionBoutique }>(`${this.endpoint}/boutiques/${boutiqueId}/exceptions/${id}`, payload as any)
      .pipe(map(res => res.data));
  }

  deleteExceptionBoutique(boutiqueId: string, id: string): Observable<void> {
    return this.api.deletes(`${this.endpoint}/boutiques/${boutiqueId}/exceptions/${id}`);
  }
}
