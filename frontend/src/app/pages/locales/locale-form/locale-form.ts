import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { LocaleService, LocaleCreatePayload, LocaleUpdatePayload } from '../../../shared/service/locale.service';

@Component({
  selector: 'app-locale-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './locale-form.html',
  styleUrl: './locale-form.scss'
})
export class LocaleFormComponent implements OnInit {
  isEditMode = false;
  localeId: string | null = null;
  loading = false;
  submitting = false;
  error = '';
  successMessage = '';
  showConfirmModal = false;

  form = {
    code: '',
    zone: '',
    surface: null as number | null,
    image: ''
  };

  formErrors: Record<string, string> = {};

  constructor(
    private localeService: LocaleService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.localeId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.localeId;

    if (this.isEditMode && this.localeId) {
      this.loading = true;
      this.localeService.getById(this.localeId).subscribe({
        next: (locale) => {
          this.form = {
            code: locale.code,
            zone: locale.zone,
            surface: locale.surface,
            image: locale.image ?? ''
          };
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors du chargement de la locale';
          this.loading = false;
        }
      });
    }
  }

  validate(): boolean {
    this.formErrors = {};
    if (!this.form.code.trim()) {
      this.formErrors['code'] = 'Le code est obligatoire';
    }
    if (!this.form.zone.trim()) {
      this.formErrors['zone'] = 'La zone est obligatoire';
    }
    if (this.form.surface === null || this.form.surface === undefined || isNaN(Number(this.form.surface))) {
      this.formErrors['surface'] = 'La surface est obligatoire';
    } else if (Number(this.form.surface) <= 0) {
      this.formErrors['surface'] = 'La surface doit être supérieure à 0';
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
    this.successMessage = '';

    if (this.isEditMode && this.localeId) {
      const payload: LocaleUpdatePayload = {
        code: this.form.code.trim(),
        zone: this.form.zone.trim(),
        surface: Number(this.form.surface),
        image: this.form.image.trim() || null
      };
      this.localeService.update(this.localeId, payload).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage = 'Locale modifiée avec succès !';
          setTimeout(() => this.router.navigate(['/locales']), 1200);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la modification';
          this.submitting = false;
        }
      });
    } else {
      const payload: LocaleCreatePayload = {
        code: this.form.code.trim(),
        zone: this.form.zone.trim(),
        surface: Number(this.form.surface),
        image: this.form.image.trim() || null
      };
      this.localeService.create(payload).subscribe({
        next: () => {
          this.submitting = false;
          this.successMessage = 'Locale créée avec succès !';
          setTimeout(() => this.router.navigate(['/locales']), 1200);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Erreur lors de la création';
          this.submitting = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/locales']);
  }
}
