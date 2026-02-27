import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface ReservationItem {
  _id: string;
  localeId: { _id: string; code: string; zone: string; surface: number; image: string | null } | null;
  boutiqueId: { _id: string; nom: string; proprietaire?: { nom: string; email: string } } | null;
  dateDebut: string | null;
  dateFin: string | null;
  statut: 'en_attente' | 'validée' | 'annulée';
  montant: number;
  prixMensuel: number;
  dureeLocation: number | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReservationService {
  constructor(private api: ApiService) {}

  getAll(): Observable<ReservationItem[]> {
    return this.api.getList<any>('api/reservations').pipe(
      map((res: any) => res.data?.reservations ?? [])
    );
  }

  getMes(): Observable<ReservationItem[]> {
    return this.api.getList<any>('api/reservations/mes').pipe(
      map((res: any) => res.data?.reservations ?? [])
    );
  }

  reserverLocale(localeId: string): Observable<ReservationItem> {
    return this.api.create<any>('api/locales/reserver', { localeId }).pipe(
      map((res: any) => res.data?.reservation ?? res)
    );
  }

  valider(id: string): Observable<ReservationItem> {
    return this.api.updates<any>(`api/reservations/${id}/valider`, {}).pipe(
      map((res: any) => res.data?.reservation ?? res)
    );
  }

  annuler(id: string): Observable<ReservationItem> {
    return this.api.updates<any>(`api/reservations/${id}/annuler`, {}).pipe(
      map((res: any) => res.data?.reservation ?? res)
    );
  }
}
