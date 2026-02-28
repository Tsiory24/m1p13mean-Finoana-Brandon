import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { ProduitService, ProduitItem } from '../../shared/service/produit.service';
import { HorairesService, HoraireCentre } from '../../shared/service/horaires.service';
import { CategorieService, CategorieItem } from '../../shared/service/categorie.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit {
  boutiques: BoutiqueItem[] = [];
  produits: ProduitItem[] = [];
  horaires: HoraireCentre[] = [];
  categories: CategorieItem[] = [];
  loading = true;
  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private horairesService: HorairesService,
    private categorieService: CategorieService
  ) {}

  ngOnInit(): void {
    this.boutiqueService.getAll().subscribe({
      next: b => this.boutiques = b.filter(x => !x.deletedAt && x.active).slice(0, 8),
      error: () => {}
    });

    this.produitService.getAll().subscribe({
      next: p => this.produits = p.filter(x => !x.deletedAt).slice(0, 8),
      error: () => {}
    });

    this.horairesService.getHorairesCentre().subscribe({
      next: h => { this.horaires = h; this.loading = false; },
      error: () => { this.loading = false; }
    });

    this.categorieService.getAllCategories().subscribe({
      next: c => this.categories = c,
      error: () => {}
    });
  }

  // ── Horaires helpers ─────────────────────────────────────────────
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
    if (h.heure_ouverture && h.heure_fermeture) {
      return `${h.heure_ouverture} – ${h.heure_fermeture}`;
    }
    return 'Horaires non renseignés';
  }

  get joursOrdre(): string[] {
    return ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
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

  // ── Image helpers ────────────────────────────────────────────────
  getBoutiqueImage(b: BoutiqueItem): string | null {
    if (!b.image) return null;
    if (b.image.startsWith('http')) return b.image;
    return `${this.apiBase}${b.image}`;
  }

  getProduitImage(p: ProduitItem): string | null {
    if (!p.images || p.images.length === 0) return null;
    const img = p.images[0];
    if (img.startsWith('http')) return img;
    return `${this.apiBase}${img}`;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(price) + ' Ar';
  }

  // Initialiales boutique
  boutiqueInitial(nom: string): string {
    return nom.slice(0, 2).toUpperCase();
  }

  // Couleur pseudo-aléatoire par nom
  boutiqueColor(nom: string): string {
    const colors = ['#1a2744', '#c9963a', '#2c5282', '#702459', '#276749', '#744210'];
    let hash = 0;
    for (const c of nom) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
    return colors[Math.abs(hash) % colors.length];
  }
}
