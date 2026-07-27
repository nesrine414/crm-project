import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmDataService, SatisfactionSurveyPDF, Company } from '../../services/crm-data';

interface UploadForm {
  company: number | null;
  year: number;
  notes: string;
  file: File | null;
}

@Component({
  selector: 'app-satisfaction-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './satisfaction-client.html',
  styleUrl: './satisfaction-client.css'
})
export class SatisfactionClientComponent implements OnInit {
  surveys = signal<SatisfactionSurveyPDF[]>([]);
  companies = signal<Company[]>([]);
  searchTerm = signal('');
  yearFilter = signal<number | null>(null);

  showUploadModal = signal(false);
  uploadForm: UploadForm = this.emptyForm();
  isUploading = signal(false);
  errorMessage = signal('');

  constructor(private crmData: CrmDataService) {}

  ngOnInit(): void {
    this.loadSurveys();
    this.loadCompanies();
  }

  loadSurveys(): void {
    this.crmData.getSatisfactionPDFs().subscribe({
      next: (data) => this.surveys.set(data),
      error: (err) => console.error('Erreur chargement enquêtes satisfaction', err)
    });
  }

  loadCompanies(): void {
    this.crmData.getCompanies().subscribe({
      next: (data) => this.companies.set(data),
      error: (err) => console.error('Erreur chargement clients', err)
    });
  }

  get filteredSurveys(): SatisfactionSurveyPDF[] {
    const term = this.searchTerm().toLowerCase().trim();
    const year = this.yearFilter();

    return this.surveys().filter(s => {
      const matchesTerm = !term ||
        (s.company_name?.toLowerCase().includes(term) ?? false) ||
        (s.notes?.toLowerCase().includes(term) ?? false);
      const matchesYear = !year || s.year === year;
      return matchesTerm && matchesYear;
    });
  }

  get availableYears(): number[] {
    const years = new Set(this.surveys().map(s => s.year));
    return Array.from(years).sort((a, b) => b - a);
  }

  emptyForm(): UploadForm {
    return {
      company: null,
      year: new Date().getFullYear(),
      notes: '',
      file: null
    };
  }

  openUploadModal(): void {
    this.uploadForm = this.emptyForm();
    this.errorMessage.set('');
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.errorMessage.set('Le fichier doit être un PDF.');
        this.uploadForm.file = null;
        return;
      }
      this.errorMessage.set('');
      this.uploadForm.file = file;
    }
  }

  submitUpload(): void {
    if (!this.uploadForm.company || !this.uploadForm.year || !this.uploadForm.file) {
      this.errorMessage.set('Veuillez sélectionner un client, une année et un fichier PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('company', String(this.uploadForm.company));
    formData.append('year', String(this.uploadForm.year));
    formData.append('notes', this.uploadForm.notes);
    formData.append('pdf_file', this.uploadForm.file);

    this.isUploading.set(true);
    this.crmData.uploadSatisfactionPDF(formData).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.closeUploadModal();
        this.loadSurveys();
      },
      error: (err) => {
        this.isUploading.set(false);
        if (err.status === 400 && err.error?.non_field_errors) {
          this.errorMessage.set('Un PDF existe déjà pour ce client et cette année.');
        } else {
          this.errorMessage.set('Erreur lors de l\'envoi du fichier.');
        }
        console.error('Erreur upload PDF satisfaction', err);
      }
    });
  }

  deleteSurvey(id: number | undefined): void {
    if (!id) return;
    if (!confirm('Supprimer ce PDF d\'enquête de satisfaction ?')) return;

    this.crmData.deleteSatisfactionPDF(id).subscribe({
      next: () => this.loadSurveys(),
      error: (err) => console.error('Erreur suppression PDF satisfaction', err)
    });
  }

  viewPdf(url: string | undefined): void {
    if (url) window.open(url, '_blank');
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.yearFilter.set(null);
  }
}
