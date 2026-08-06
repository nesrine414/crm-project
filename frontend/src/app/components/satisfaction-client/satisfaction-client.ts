import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmDataService, SatisfactionSurveyPDF, Company } from '../../services/crm-data';

type ServiceType = 'Consulting' | 'Formation' | 'Recrutement';

interface SurveyForm {
  company: number | null;
  year: number;
  service_type: ServiceType;
  detailed_scores: Record<string, number>;
  score_recommendation: number;
  future_intent: 'Oui' | 'Non' | 'Peut-être';
  point_fort: string;
  amelioration: string;
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

  // 👇 Grilles de critères officielles LCA par service (miroir du backend, pour affichage dynamique)
  readonly CRITERES_PAR_SERVICE: Record<ServiceType, string[]> = {
    Consulting: [
      'Diagnostic & Analyse',
      'Expertise Technique',
      'Qualité des Livrables',
      'Respect du Planning',
      'Pédagogie & Transfert de compétences',
      'Réactivité',
      'Professionnalisme',
      'Valeur Ajoutée',
    ],
    Formation: [
      'Ingénierie pédagogique',
      'Expertise du formateur',
      'Supports de cours',
      'Logistique',
      'Impact opérationnel',
      'Réactivité',
      'Professionnalisme',
      'Image de marque',
      'Rapport Qualité/Prix',
    ],
    Recrutement: [
      'Analyse du besoin',
      'Qualité des profils',
      'Pertinence des évaluations',
      'Délai de traitement',
      'Accompagnement',
      'Communication',
      'Professionnalisme',
      'Rapport Qualité/Prix',
    ],
  };

  surveys = signal<SatisfactionSurveyPDF[]>([]);
  companies = signal<Company[]>([]);
  searchTerm = signal('');
  yearFilter = signal<number | null>(null);
  serviceFilter = signal<string>('');

  showAddModal = signal(false);
  showEditModal = signal(false);
  editingSurveyId = signal<number | null>(null);
  selectedSurvey = signal<SatisfactionSurveyPDF | null>(null);
  isSubmitting = signal(false);
  errorMessage = signal('');

  form: SurveyForm = this.emptyForm();

  constructor(private crmData: CrmDataService) { }

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
    const service = this.serviceFilter();

    return this.surveys().filter(s => {
      const matchesTerm = !term ||
        (s.company_name?.toLowerCase().includes(term) ?? false) ||
        (s.notes?.toLowerCase().includes(term) ?? false) ||
        (s.point_fort?.toLowerCase().includes(term) ?? false) ||
        (s.amelioration?.toLowerCase().includes(term) ?? false);
      const matchesYear = !year || s.year === year;
      const matchesService = !service || s.service_type === service;
      return matchesTerm && matchesYear && matchesService;
    });
  }

  get availableYears(): number[] {
    const years = new Set(this.surveys().map(s => s.year));
    if (years.size === 0) years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }

  // KPIs
  avgSatisfaction = computed(() => {
    const list = this.surveys();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + (s.score_global || 5), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  avgNps = computed(() => {
    const list = this.surveys();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, s) => acc + (s.score_recommendation || 10), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  reengagementRate = computed(() => {
    const list = this.surveys();
    if (list.length === 0) return 100;
    const yesCount = list.filter(s => s.future_intent === 'Oui').length;
    return Math.round((yesCount / list.length) * 100);
  });

  // 👇 Liste des critères à afficher dans le formulaire, selon le service sélectionné
  get currentCriteres(): string[] {
    return this.CRITERES_PAR_SERVICE[this.form.service_type] || [];
  }

  // 👇 Calcul en direct de la moyenne pendant la saisie (aperçu avant enregistrement)
  get computedScoreGlobal(): number {
    const values = Object.values(this.form.detailed_scores).filter(v => typeof v === 'number' && !isNaN(v));
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  // 👇 Initialise detailed_scores avec tous les critères du service à une valeur par défaut
  private buildDefaultScores(service: ServiceType, defaultVal = 4): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const critere of this.CRITERES_PAR_SERVICE[service]) {
      scores[critere] = defaultVal;
    }
    return scores;
  }

  // 👇 Appelé quand on change le service dans le <select> du formulaire
  onServiceTypeChange(): void {
    this.form.detailed_scores = this.buildDefaultScores(this.form.service_type);
  }

  updateCritereScore(critere: string, value: number): void {
    this.form.detailed_scores[critere] = value;
  }

  emptyForm(): SurveyForm {
    const defaultService: ServiceType = 'Consulting';
    return {
      company: null,
      year: new Date().getFullYear(),
      service_type: defaultService,
      detailed_scores: this.buildDefaultScores(defaultService),
      score_recommendation: 9,
      future_intent: 'Oui',
      point_fort: '',
      amelioration: '',
      notes: '',
      file: null
    };
  }

  openAddModal(): void {
    this.form = this.emptyForm();
    this.errorMessage.set('');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
  }

  openDetail(survey: SatisfactionSurveyPDF): void {
    this.selectedSurvey.set(survey);
  }

  closeDetail(): void {
    this.selectedSurvey.set(null);
  }

  openEditModal(survey: SatisfactionSurveyPDF, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingSurveyId.set(survey.id ?? null);

    // Si l'enquête a déjà un détail par critère, on le reprend ; sinon on initialise avec les critères du service
    const existingScores = survey.detailed_scores && Object.keys(survey.detailed_scores).length > 0
      ? { ...survey.detailed_scores }
      : this.buildDefaultScores(survey.service_type, survey.score_global || 4);

    this.form = {
      company: survey.company,
      year: survey.year,
      service_type: survey.service_type,
      detailed_scores: existingScores,
      score_recommendation: survey.score_recommendation,
      future_intent: survey.future_intent,
      point_fort: survey.point_fort ?? '',
      amelioration: survey.amelioration ?? '',
      notes: survey.notes ?? '',
      file: null
    };
    this.errorMessage.set('');
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingSurveyId.set(null);
  }

  private buildFormData(): FormData {
    const formData = new FormData();
    formData.append('company', String(this.form.company));
    formData.append('year', String(this.form.year));
    formData.append('service_type', this.form.service_type);
    formData.append('detailed_scores', JSON.stringify(this.form.detailed_scores));
    formData.append('score_recommendation', String(this.form.score_recommendation));
    formData.append('future_intent', this.form.future_intent);
    formData.append('point_fort', this.form.point_fort);
    formData.append('amelioration', this.form.amelioration);
    formData.append('notes', this.form.notes);
    if (this.form.file) {
      formData.append('pdf_file', this.form.file);
    }
    return formData;
  }

  submitEditSurvey(): void {
    const id = this.editingSurveyId();
    if (!id || !this.form.company || !this.form.year) {
      this.errorMessage.set('Veuillez sélectionner une entreprise et une année.');
      return;
    }

    this.isSubmitting.set(true);
    this.crmData.updateSatisfactionPDF(id, this.buildFormData()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeEditModal();
        this.closeDetail();
        this.loadSurveys();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Erreur lors de la mise à jour de l\'enquête.');
        console.error('Erreur modification enquête satisfaction', err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.errorMessage.set('Le fichier doit être un PDF.');
        this.form.file = null;
        return;
      }
      this.errorMessage.set('');
      this.form.file = file;
    }
  }

  submitSurvey(): void {
    if (!this.form.company || !this.form.year) {
      this.errorMessage.set('Veuillez sélectionner une entreprise et une année.');
      return;
    }

    this.isSubmitting.set(true);
    this.crmData.uploadSatisfactionPDF(this.buildFormData()).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAddModal();
        this.loadSurveys();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Erreur lors de l\'enregistrement de l\'enquête.');
        console.error('Erreur enregistrement enquête satisfaction', err);
      }
    });
  }

  deleteSurvey(id: number | undefined, event?: Event): void {
    if (event) event.stopPropagation();
    if (!id) return;
    if (!confirm('Supprimer cette enquête de satisfaction ?')) return;

    this.crmData.deleteSatisfactionPDF(id).subscribe({
      next: () => {
        if (this.selectedSurvey()?.id === id) this.closeDetail();
        this.loadSurveys();
      },
      error: (err) => console.error('Erreur suppression enquête satisfaction', err)
    });
  }

  viewPdf(url: string | undefined, event?: Event): void {
    if (event) event.stopPropagation();
    if (url) window.open(url, '_blank');
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.yearFilter.set(null);
    this.serviceFilter.set('');
  }

  // Utilitaire pour le template : convertit les entrées de detailed_scores d'une enquête en tableau affichable
  getDetailEntries(survey: SatisfactionSurveyPDF | null): { critere: string; note: number }[] {
    if (!survey?.detailed_scores) return [];
    return Object.entries(survey.detailed_scores).map(([critere, note]) => ({ critere, note: Number(note) }));
  }
}