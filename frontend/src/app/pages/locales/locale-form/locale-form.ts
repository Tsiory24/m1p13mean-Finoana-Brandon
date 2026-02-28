import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { switchMap, of } from 'rxjs';
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

  // ── File upload state ──
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadError = '';
  isDragOver = false;

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

  // ── File selection via file input ──
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  // ── Drag & drop handlers ──
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  private processFile(file: File): void {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.uploadError = 'Format non supporté. Formats acceptés : JPG, PNG, GIF, WEBP';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'Fichier trop volumineux (max 5 Mo)';
      return;
    }
    this.uploadError = '';
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.form.image = '';
    this.uploadError = '';
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

    // Upload image first if a new file was selected, then save locale
    const upload$ = this.selectedFile
      ? this.localeService.uploadImage(this.selectedFile)
      : of(this.form.image || null);

    upload$.pipe(
      switchMap((imageUrl) => {
        const basePayload = {
          code: this.form.code.trim(),
          zone: this.form.zone.trim(),
          surface: Number(this.form.surface),
          image: imageUrl || null
        };

        if (this.isEditMode && this.localeId) {
          return this.localeService.update(this.localeId, basePayload as LocaleUpdatePayload);
        } else {
          return this.localeService.create(basePayload as LocaleCreatePayload);
        }
      })
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = this.isEditMode
          ? 'Locale modifiée avec succès !'
          : 'Locale créée avec succès !';
        setTimeout(() => this.router.navigate(['/backoffice/locales']), 1200);
      },
      error: (err) => {
        this.error = err?.error?.message ||
          (this.isEditMode ? 'Erreur lors de la modification' : 'Erreur lors de la création');
        this.submitting = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/backoffice/locales']);
  }
}
