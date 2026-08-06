import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

export interface Prestataire {
  id?: number;
  name: string;
  patente: string;
  service_provided: string;
  activity_domain?: string;
  interlocuteur_principal: string;
  fonction_interlocuteur: string;
  email?: string;
  phone?: string;
  convention_contrat: string;
  date_debut_contrat?: string;
  date_fin_contrat?: string;
  cv_document?: string;
  status?: string;
}

export interface PrestataireEval {
  id?: number;
  company: number;
  company_name?: string;
  year: number;
  prix?: number | null;
  qualite?: number | null;
  prestation_service?: number | null;
  respect_delais?: number | null;
  score_percent?: number | null;
  decision?: string;
  notes?: string;
}

@Component({
  selector: 'app-prestataires',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prestataires.html',
  styleUrl: './prestataires.css'
})
export class PrestatairesComponent implements OnInit {
  private apiUrl = 'http://127.0.0.1:8000/api';

  prestataires = signal<Prestataire[]>([]);
  evaluations = signal<PrestataireEval[]>([]);
  
  availableYears = signal<number[]>([2024, 2025, 2026]);
  activeTab = signal<string>('directory'); // 'directory' or year e.g. '2024'
  searchQuery = signal<string>('');

  // Modals
  showCompanyModal = false;
  isEditCompany = false;
  companyForm: Partial<Prestataire> = this.resetCompanyForm();
  selectedCvFile: File | null = null;

  showEvalModal = false;
  isEditEval = false;
  evalForm: Partial<PrestataireEval> = this.resetEvalForm();

  // Details Modal
  showDetailsModal = false;
  selectedPrestataire: Prestataire | null = null;
  selectedPrestataireEvals: PrestataireEval[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPrestataires();
    this.loadEvaluations();
  }

  resetCompanyForm(): Partial<Prestataire> {
    return {
      name: '',
      patente: 'Oui',
      service_provided: 'Recrutement',
      interlocuteur_principal: '',
      fonction_interlocuteur: '',
      email: '',
      phone: '',
      convention_contrat: 'Non',
      date_debut_contrat: '',
      date_fin_contrat: '',
      status: 'Prestataire'
    };
  }

  resetEvalForm(): Partial<PrestataireEval> {
    return {
      company: 0,
      year: new Date().getFullYear(),
      prix: null,
      qualite: null,
      prestation_service: null,
      respect_delais: null,
      score_percent: null,
      decision: '',
      notes: ''
    };
  }

  loadPrestataires(): void {
    this.http.get<Prestataire[]>(`${this.apiUrl}/companies/?status=Prestataire`).subscribe({
      next: (data) => {
        this.prestataires.set(data);
      },
      error: (err) => console.error('Error fetching prestataires', err)
    });
  }

  loadEvaluations(): void {
    this.http.get<PrestataireEval[]>(`${this.apiUrl}/prestataire-evaluations/`).subscribe({
      next: (data) => {
        this.evaluations.set(data);
        const fetchedYears = Array.from(new Set(data.map(e => e.year))).sort((a, b) => a - b);
        const currentYears = new Set([...this.availableYears(), ...fetchedYears]);
        this.availableYears.set(Array.from(currentYears).sort((a, b) => a - b));
      },
      error: (err) => console.error('Error fetching evaluations', err)
    });
  }

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }

  addYear(): void {
    const nextYear = Math.max(...this.availableYears(), 2026) + 1;
    this.availableYears.update((years: number[]) => [...years, nextYear]);
    this.selectTab(nextYear.toString());
  }

  filteredPrestataires(): Prestataire[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.prestataires();
    return this.prestataires().filter((p: Prestataire) =>
      p.name.toLowerCase().includes(q) ||
      p.service_provided.toLowerCase().includes(q) ||
      (p.interlocuteur_principal && p.interlocuteur_principal.toLowerCase().includes(q)) ||
      (p.fonction_interlocuteur && p.fonction_interlocuteur.toLowerCase().includes(q))
    );
  }

  getEvaluationsForActiveYear(): { provider: Prestataire; eval: PrestataireEval }[] {
    const yearNum = parseInt(this.activeTab(), 10);
    const q = this.searchQuery().toLowerCase().trim();

    const result: { provider: Prestataire; eval: PrestataireEval }[] = [];
    for (const ev of this.evaluations()) {
      if (ev.year === yearNum) {
        const p = this.prestataires().find((item: Prestataire) => item.id === ev.company);
        if (p && (!q || p.name.toLowerCase().includes(q) || p.service_provided.toLowerCase().includes(q))) {
          result.push({ provider: p, eval: ev });
        }
      }
    }
    return result;
  }

  // Details Modal Handlers
  openDetailsModal(p: Prestataire): void {
    this.selectedPrestataire = p;
    this.selectedPrestataireEvals = this.evaluations().filter((e: PrestataireEval) => e.company === p.id);
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedPrestataire = null;
  }

  // Company Modal Handlers
  openAddCompanyModal(): void {
    this.isEditCompany = false;
    this.companyForm = this.resetCompanyForm();
    this.selectedCvFile = null;
    this.showCompanyModal = true;
  }

  openEditCompanyModal(p: Prestataire, event?: Event): void {
    if (event) event.stopPropagation();
    this.isEditCompany = true;
    this.companyForm = { ...p };
    this.selectedCvFile = null;
    this.showCompanyModal = true;
  }

  closeCompanyModal(): void {
    this.showCompanyModal = false;
  }

  onCvFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedCvFile = event.target.files[0];
    }
  }

  saveCompany(): void {
    if (!this.companyForm.name) {
      alert('Le nom du prestataire est obligatoire.');
      return;
    }

    const payload: any = {
      name: this.companyForm.name || '',
      status: 'Prestataire',
      service_provided: this.companyForm.service_provided || 'Autre',
      patente: this.companyForm.patente || 'Oui',
      interlocuteur_principal: this.companyForm.interlocuteur_principal || '',
      fonction_interlocuteur: this.companyForm.fonction_interlocuteur || '',
      email: this.companyForm.email || '',
      phone: this.companyForm.phone || '',
      convention_contrat: this.companyForm.convention_contrat || 'Non',
      date_debut_contrat: this.companyForm.date_debut_contrat ? this.companyForm.date_debut_contrat : null,
      date_fin_contrat: this.companyForm.date_fin_contrat ? this.companyForm.date_fin_contrat : null,
    };

    if (this.selectedCvFile) {
      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
          formData.append(key, payload[key]);
        }
      });
      formData.append('cv_document', this.selectedCvFile);

      if (this.isEditCompany && this.companyForm.id) {
        this.http.patch<Prestataire>(`${this.apiUrl}/companies/${this.companyForm.id}/`, formData).subscribe({
          next: () => {
            this.loadPrestataires();
            this.closeCompanyModal();
          },
          error: (err) => {
            console.error('Erreur modification prestataire:', err);
            alert('Erreur lors de la modification du prestataire.');
          }
        });
      } else {
        this.http.post<Prestataire>(`${this.apiUrl}/companies/`, formData).subscribe({
          next: () => {
            this.loadPrestataires();
            this.closeCompanyModal();
          },
          error: (err) => {
            console.error('Erreur création prestataire:', err);
            alert('Erreur lors de la création du prestataire.');
          }
        });
      }
    } else {
      if (this.isEditCompany && this.companyForm.id) {
        this.http.patch<Prestataire>(`${this.apiUrl}/companies/${this.companyForm.id}/`, payload).subscribe({
          next: () => {
            this.loadPrestataires();
            this.closeCompanyModal();
          },
          error: (err) => {
            console.error('Erreur modification prestataire:', err);
            alert('Erreur lors de la modification du prestataire.');
          }
        });
      } else {
        this.http.post<Prestataire>(`${this.apiUrl}/companies/`, payload).subscribe({
          next: () => {
            this.loadPrestataires();
            this.closeCompanyModal();
          },
          error: (err) => {
            console.error('Erreur création prestataire:', err);
            alert('Erreur lors de la création du prestataire.');
          }
        });
      }
    }
  }

  deleteCompany(p: Prestataire, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Voulez-vous vraiment supprimer le prestataire ${p.name} ?`)) {
      this.http.delete(`${this.apiUrl}/companies/${p.id}/`).subscribe({
        next: () => {
          this.loadPrestataires();
          if (this.showDetailsModal && this.selectedPrestataire?.id === p.id) {
            this.closeDetailsModal();
          }
        },
        error: () => alert('Erreur lors de la suppression.')
      });
    }
  }

  // Evaluation Modal Handlers
  openAddEvalForActiveYear(): void {
    const yearNum = parseInt(this.activeTab(), 10);
    this.isEditEval = false;
    const firstProvider = this.prestataires().length > 0 ? this.prestataires()[0] : null;
    
    this.evalForm = {
      company: firstProvider ? firstProvider.id : 0,
      company_name: firstProvider ? firstProvider.name : '',
      year: yearNum,
      prix: null,
      qualite: null,
      prestation_service: null,
      respect_delais: null,
      score_percent: null,
      decision: '',
      notes: ''
    };
    this.liveScore = null;
    this.liveDecision = 'N/A';
    this.showEvalModal = true;
  }

  onEvalCompanySelect(target: any): void {
    const companyId = Number(target.value);
    const found = this.prestataires().find(p => p.id === companyId);
    if (found) {
      this.evalForm.company = found.id;
      this.evalForm.company_name = found.name;
    }
  }

  openAddOrEditEvalModal(provider: Prestataire, existingEval?: PrestataireEval, event?: Event): void {
    if (event) event.stopPropagation();
    const yearNum = parseInt(this.activeTab(), 10);
    this.isEditEval = !!existingEval;

    if (existingEval) {
      this.evalForm = { ...existingEval };
    } else {
      this.evalForm = {
        company: provider.id,
        company_name: provider.name,
        year: yearNum,
        prix: null,
        qualite: null,
        prestation_service: null,
        respect_delais: null,
        score_percent: null,
        decision: '',
        notes: ''
      };
    }
    // Initialize live score
    this.liveScore = this.calculatePreviewScore();
    this.liveDecision = this.getDecisionPreview(this.liveScore);
    this.showEvalModal = true;
  }

  closeEvalModal(): void {
    this.showEvalModal = false;
  }

  // Live preview score (reactive, called from template)
  liveScore: number | null = null;
  liveDecision: string = 'N/A';

  onNoteChange(): void {
    this.liveScore = this.calculatePreviewScore();
    this.liveDecision = this.getDecisionPreview(this.liveScore);
  }

  calculatePreviewScore(): number | null {
    const rawScores = [this.evalForm.prix, this.evalForm.qualite, this.evalForm.prestation_service, this.evalForm.respect_delais];
    const validScores: number[] = [];
    for (const s of rawScores) {
      if (s !== null && s !== undefined && s !== ('' as any) && !isNaN(Number(s))) {
        validScores.push(Number(s));
      }
    }
    if (validScores.length === 0) return null;
    const sum = validScores.reduce((acc, val) => acc + val, 0);
    const avg = sum / validScores.length;
    return Math.round((avg / 4.0) * 100 * 100) / 100;
  }

  getDecisionPreview(score: number | null): string {
    if (score === null) return 'N/A';
    if (score > 80) return 'Maintenir le fournisseur et le privilégier';
    if (score >= 60) return 'Maintenir le fournisseur';
    if (score >= 40) return 'Maintenir le fournisseur sous surveillance';
    return 'Fournisseurs douteux';
  }

  saveEval(): void {
    if (!this.evalForm.company || !this.evalForm.year) {
      alert('Veuillez sélectionner un prestataire et une année.');
      return;
    }

    const payload = {
      company: this.evalForm.company,
      year: this.evalForm.year,
      prix: this.evalForm.prix !== null && this.evalForm.prix !== undefined ? Number(this.evalForm.prix) : null,
      qualite: this.evalForm.qualite !== null && this.evalForm.qualite !== undefined ? Number(this.evalForm.qualite) : null,
      prestation_service: this.evalForm.prestation_service !== null && this.evalForm.prestation_service !== undefined ? Number(this.evalForm.prestation_service) : null,
      respect_delais: this.evalForm.respect_delais !== null && this.evalForm.respect_delais !== undefined ? Number(this.evalForm.respect_delais) : null,
      notes: this.evalForm.notes || ''
    };

    if (this.isEditEval && this.evalForm.id) {
      this.http.patch<PrestataireEval>(`${this.apiUrl}/prestataire-evaluations/${this.evalForm.id}/`, payload).subscribe({
        next: () => {
          this.loadEvaluations();
          this.closeEvalModal();
        },
        error: (err) => {
          console.error('Erreur sauvegarde évaluation:', err);
          alert('Erreur lors de la sauvegarde de l\'évaluation.');
        }
      });
    } else {
      this.http.post<PrestataireEval>(`${this.apiUrl}/prestataire-evaluations/`, payload).subscribe({
        next: () => {
          this.loadEvaluations();
          this.closeEvalModal();
        },
        error: (err) => {
          console.error('Erreur sauvegarde évaluation:', err);
          alert('Erreur lors de la sauvegarde de l\'évaluation.');
        }
      });
    }
  }

  getBadgeClass(decision?: string): string {
    if (!decision) return 'badge-neutral';
    if (decision.includes('privilégier')) return 'badge-success-dark';
    if (decision.includes('Maintenir le fournisseur') && !decision.includes('surveillance')) return 'badge-success-light';
    if (decision.includes('surveillance')) return 'badge-warning';
    return 'badge-danger';
  }
}
