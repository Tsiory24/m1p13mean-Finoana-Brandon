import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HorairesService, HoraireCentre } from '../../shared/service/horaires.service';

@Component({
  selector: 'app-horaires-fo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './horaires-fo.html',
  styleUrl: './horaires-fo.scss'
})
export class HorairesFoComponent implements OnInit {
  horaires: HoraireCentre[] = [];
  loading = true;
  error = false;

  readonly joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  constructor(private horairesService: HorairesService) {}

  ngOnInit(): void {
    this.horairesService.getHorairesCentre().subscribe({
      next: h => { this.horaires = h; this.loading = false; },
      error: () => { this.loading = false; this.error = true; }
    });
  }

  get todayHoraire(): HoraireCentre | undefined {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = jours[new Date().getDay()];
    return this.horaires.find(h => h.jour?.toLowerCase() === today);
  }

  get isOpen(): boolean {
    const h = this.todayHoraire;
    if (!h || h.ferme || !h.heure_ouverture || !h.heure_fermeture) return false;
    const now = new Date();
    const [oh, om] = h.heure_ouverture.split(':').map(Number);
    const [fh, fm] = h.heure_fermeture.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= oh * 60 + om && nowMins < fh * 60 + fm;
  }

  get todayLabel(): string {
    const h = this.todayHoraire;
    if (!h) return 'Horaires non disponibles';
    if (h.ferme) return 'Fermé aujourd\'hui';
    if (h.heure_ouverture && h.heure_fermeture) return `${h.heure_ouverture} – ${h.heure_fermeture}`;
    return 'Horaires non renseignés';
  }

  horaireForJour(jour: string): HoraireCentre | undefined {
    return this.horaires.find(h => h.jour?.toLowerCase() === jour);
  }

  formatHoraire(h: HoraireCentre | undefined): string {
    if (!h) return '—';
    if (h.ferme) return 'Fermé';
    if (h.heure_ouverture && h.heure_fermeture) return `${h.heure_ouverture} – ${h.heure_fermeture}`;
    return '—';
  }

  isToday(jour: string): boolean {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return jours[new Date().getDay()] === jour;
  }

  get currentDayName(): string {
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const name = jours[new Date().getDay()];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}
