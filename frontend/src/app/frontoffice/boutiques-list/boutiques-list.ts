import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BoutiqueService, BoutiqueItem } from '../../shared/service/boutique.service';
import { CategorieService, CategorieItem } from '../../shared/service/categorie.service';
import { SeoService } from '../../shared/service/seo.service';
import { environment } from '../../../environnements/environnement';

@Component({
  selector: 'app-boutiques-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './boutiques-list.html',
  styleUrl: './boutiques-list.scss'
})
export class BoutiquesListComponent implements OnInit {
  boutiques: BoutiqueItem[] = [];
  filtered: BoutiqueItem[] = [];
  categories: CategorieItem[] = [];

  search = '';
  selectedCat = '';
  loading = true;
  error = false;

  page = 1;
  readonly pageSize = 12;

  readonly apiBase = environment.apiBaseUrl;

  constructor(
    private boutiqueService: BoutiqueService,
    private categorieService: CategorieService,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setPage({
      title: 'Nos Boutiques',
      description: 'Explorez toutes les boutiques de notre centre commercial : mode, alimentation, loisirs et bien plus encore.'
    });

    this.boutiqueService.getAll({ activeLocaleOnly: true }).subscribe({
      next: b => {
        this.boutiques = b.filter(x => !x.deletedAt && x.active);
        this.applyFilters();
        this.loading = false;
      },
      error: () => { this.loading = false; this.error = true; }
    });

    this.categorieService.getAllCategories().subscribe({
      next: c => this.categories = c,
      error: () => {}
    });
  }

  applyFilters(): void {
    this.page = 1;
    let result = [...this.boutiques];

    if (this.search.trim()) {
      const q = this.search.trim().toLowerCase();
      result = result.filter(b => b.nom.toLowerCase().includes(q));
    }

    if (this.selectedCat) {
      result = result.filter(b => b.categorieId?._id === this.selectedCat);
    }

    result.sort((a, b) => a.nom.localeCompare(b.nom));
    this.filtered = result;
  }

  get totalPages(): number {
    return Math.ceil(this.filtered.length / this.pageSize);
  }

  get paged(): BoutiqueItem[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.page = p;
  }

  resetFilters(): void {
    this.search = '';
    this.selectedCat = '';
    this.applyFilters();
  }

  getImage(b: BoutiqueItem): string | null {
    if (!b.image) return null;
    if (b.image.startsWith('http')) return b.image;
    return `${this.apiBase}${b.image}`;
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
