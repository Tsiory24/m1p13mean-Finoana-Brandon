import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { ProduitService, ProduitItem } from '../../shared/service/produit.service';
import { HorairesService, HoraireBoutique } from '../../shared/service/horaires.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-boutique-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './boutique-detail.html',
  styleUrl: './boutique-detail.scss'
})
export class BoutiqueDetailComponent implements OnInit {
  boutiqueId = '';
  boutique: BoutiqueItem | null = null;
  produits: ProduitItem[] = [];
  horaires: HoraireBoutique[] = [];

  loadingBoutique = true;
  loadingProduits = true;
  loadingHoraires = true;
  errorBoutique = false;

  searchProduit = '';
  selectedSousCategorie = '';

  page = 1;
  readonly pageSize = 12;

  readonly apiBase = environment.apiBaseUrl;

  readonly joursOrdre = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  constructor(
    private route: ActivatedRoute,
    private boutiqueService: BoutiqueService,
    private produitService: ProduitService,
    private horairesService: HorairesService
  ) {}

  ngOnInit(): void {
    this.boutiqueId = this.route.snapshot.paramMap.get('id') ?? '';

    this.boutiqueService.getById(this.boutiqueId).subscribe({
      next: b => { this.boutique = b; this.loadingBoutique = false; },
      error: () => { this.loadingBoutique = false; this.errorBoutique = true; }
    });

    this.produitService.getAll({ boutiqueId: this.boutiqueId }).subscribe({
      next: p => { this.produits = p.filter(x => !x.deletedAt); this.loadingProduits = false; },
      error: () => { this.loadingProduits = false; }
    });

    this.horairesService.getHorairesBoutique(this.boutiqueId).subscribe({
      next: h => { this.horaires = h; this.loadingHoraires = false; },
      error: () => { this.loadingHoraires = false; }
    });
  }

  // ── Produits filtering ───────────────────────────────────────────
  get filteredProduits(): ProduitItem[] {
    let result = [...this.produits];
    if (this.searchProduit.trim()) {
      const q = this.searchProduit.trim().toLowerCase();
      result = result.filter(p => p.nom.toLowerCase().includes(q));
    }
    if (this.selectedSousCategorie) {
      result = result.filter(p =>
        p.sousCategorieIds?.some(sc => sc._id === this.selectedSousCategorie)
      );
    }
    return result;
  }

  get pagedProduits(): ProduitItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredProduits.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProduits.length / this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) { this.page = p; }
  }

  onFilterChange(): void { this.page = 1; }

  get sousCategories(): { _id: string; nom: string }[] {
    const map = new Map<string, string>();
    for (const p of this.produits) {
      for (const sc of p.sousCategorieIds ?? []) {
        if (!map.has(sc._id)) map.set(sc._id, sc.nom);
      }
    }
    return Array.from(map, ([_id, nom]) => ({ _id, nom }));
  }

  // ── Horaires helpers ─────────────────────────────────────────────
  get todayHoraire(): HoraireBoutique | undefined {
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

  horaireForJour(jour: string): HoraireBoutique | undefined {
    return this.horaires.find(h => h.jour?.toLowerCase() === jour);
  }

  formatHoraire(h: HoraireBoutique | undefined): string {
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
  getBoutiqueImage(): string | null {
    if (!this.boutique?.image) return null;
    const img = this.boutique.image;
    return img.startsWith('http') ? img : `${this.apiBase}${img}`;
  }

  getProduitImage(p: ProduitItem): string | null {
    if (!p.images || p.images.length === 0) return null;
    const img = p.images[0];
    return img.startsWith('http') ? img : `${this.apiBase}${img}`;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-MG', { style: 'decimal', maximumFractionDigits: 0 }).format(price) + ' Ar';
  }

  boutiqueInitial(nom: string): string {
    return nom.slice(0, 2).toUpperCase();
  }

  boutiqueColor(nom: string): string {
    const colors = ['#1a2744', '#c9963a', '#2c5282', '#702459', '#276749', '#744210'];
    let hash = 0;
    for (const c of nom) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffff;
    return colors[Math.abs(hash) % colors.length];
  }
}
