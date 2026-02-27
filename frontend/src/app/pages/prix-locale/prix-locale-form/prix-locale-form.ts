import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { PrixLocaleService } from '../../../shared/service/prix-locale.service';

@Component({
  selector: 'app-prix-locale-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './prix-locale-form.html',
  styleUrl: './prix-locale-form.scss'
})
export class PrixLocaleFormComponent implements OnInit {
  isEditMode = false;
  prixId: string | null = null;
  loading = false;
  submitting = false;
  error = '';
  successMessage = '';
  showConfirmModal = false;

  form = {
    prix_par_m2: null as number | null
  };

  formErrors: Record<string, string> = {};

  constructor(
    private prixService: PrixLocaleService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.prixId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.prixId;

    if (this.isEditMode && this.prixId) {
      this.loading = true;
      this.prixService.getById(this.prixId).subscribe({
        next: (prix) => {
          this.form.prix_par_m2 = prix.prix_par_m2;
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors du chargement';
          this.loading = false;
        }
      });
    }
  }

  validate(): boolean {
    this.formErrors = {};
    if (this.form.prix_par_m2 === null || this.form.prix_par_m2 === undefined || isNaN(Number(this.form.prix_par_m2))) {
      this.formErrors['prix_par_m2'] = 'Le prix par m² est obligatoire';
    } else if (Number(this.form.prix_par_m2) < 0) {
      this.formErrors['prix_par_m2'] = 'Le prix doit être positif';
    }
    return Object.keys(this.formErrors).length === 0;
  }

  onSubmit(): void {
    if (!this.validate()) return;
    this.showConfirmModal = true;
  }

  cancelConfirm(): void {
    this.showConfirmModal = false;
  }

  confirmSubmit(): void {
    this.showConfirmModal = false;
    this.submitting = true;
    this.error = '';

    const val = Number(this.form.prix_par_m2);

    if (this.isEditMode && this.prixId) {
      this.prixService.update(this.prixId, val).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage = 'Prix modifié avec succès !';
          setTimeout(() => this.router.navigate(['/prix-locales']), 1200);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la modification';
          this.submitting = false;
        }
      });
    } else {
      this.prixService.create(val).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage = 'Prix créé avec succès !';
          setTimeout(() => this.router.navigate(['/prix-locales']), 1200);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la création';
          this.submitting = false;
        }
      });
    }
  }

  get montantExemple(): number {
    return (this.form.prix_par_m2 ?? 0) * 50;
  }

  goBack(): void {
    this.router.navigate(['/prix-locales']);
  }
}
