import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Interaction {
  id?: number;
  company: number;
  type: 'Email' | 'Appel' | 'Réunion' | 'Entretien' | 'Visite';
  date: string;
  note: string;
}

export interface ContactItem {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role?: string;
}

export interface Company {
  id: number;
  name: string;
  sector?: string;
  activity_domain?: string;
  address?: string;
  country?: string;
  acquisition_channel?: string;
  service_provided?: 'Recrutement' | 'Formation' | 'Consulting' | '';
  status: 'Client' | 'Lead' | 'Partenaire';
  created_at?: string;
  contacts: ContactItem[];
  collaboration_type?: string;
  is_retained?: boolean;
}

// Les 5 vraies étapes du pipe LCA (fichier Excel)
export type Stage = 'Qualification' | 'Chiffrage' | 'Offre Soumise' | 'Négociation' | 'Clôturé';
export type OpportunityResult = 'En cours' | 'Gagné' | 'Perdu';

export interface OpportunityItem {
  id: number;
  offer_id?: string;
  year?: number;
  company: number;
  project_subject: string;
  stage: Stage;
  result: OpportunityResult;
  estimated_amount: number;
  probability: number;
  expected_close_date?: string;
  lost_reason?: string;
  entry_date?: string;
  action_plan?: string;
  weighted_revenue?: number;
}

export interface Feedback {
  id: number;
  company: number;
  rating: number;
  comment: string;
  date: string;
}





export interface Campagne {
  id: number;
  name: string;
  type: 'Email' | 'SMS' | 'Social';
  status?: 'Active' | 'Planifiée' | 'Terminée';
  sent_count?: number;
  opens_count?: number;
  conversions_count?: number;
  budget: number;
  start_date: string;
}
export interface UserItem {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;   // 👈 ajouté
  last_login: string | null;
  date_joined: string;
}
export interface NotificationItem {
  id: number;
  type: 'lead' | 'reclamation';
  message: string;
  is_read: boolean;
  created_at: string;
}
export interface NonConformite {
  id: number;
  numero: number;
  date: string;
  probleme: string;
  origine?: string;
  processus: 'PMS' | 'PCS' | 'PRT' | 'PFR' | 'GFS';
  gravite: 1 | 2 | 3;
  action_immediate?: string;
  analyse_causes?: string;
  recurrence: boolean;
  action_corrective?: string;
  date_prevue?: string;
  responsable?: string;
  date_realisation?: string;
  delais?: string;
  efficacite?: 'Efficace' | 'Non efficace' | 'Insuffisant' | 'A vérifier' | '';
  commentaire?: string;
  avancement: 'P' | 'D' | 'C' | 'A';
  statut: 'Ouvert' | 'Fermé';
}
export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface SatisfactionSurveyPDF {
  id?: number;
  company: number;
  company_name?: string;
  year: number;
  service_type: 'Consulting' | 'Formation' | 'Recrutement';
  detailed_scores?: Record<string, number>;   // 👈 NOUVEAU : notes par critère
  criteres_disponibles?: string[];             // 👈 NOUVEAU : renvoyé par le backend, liste des critères attendus
  score_global: number;
  score_recommendation: number;
  future_intent: 'Oui' | 'Non' | 'Peut-être';
  point_fort?: string;
  amelioration?: string;
  pdf_file?: string;
  uploaded_at?: string;
  uploaded_by_name?: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class CrmDataService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api';

  clients = signal<Company[]>([]);
  partners = signal<Company[]>([]);
  opportunities = signal<OpportunityItem[]>([]);
  feedbacks = signal<Feedback[]>([]);
  campagnes = signal<Campagne[]>([]);
  interactions = signal<Interaction[]>([]);
  getClients(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.baseUrl}/companies/`);
  }
  getUsers(): Observable<UserItem[]> {
    return this.http.get<UserItem[]>(`${this.baseUrl}/users/`);
  }
  updateProfile(data: Partial<UserItem>): Observable<UserItem> {
    return this.http.patch<UserItem>(`${this.baseUrl}/users/update-profile/`, data);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users/change-password/`, { old_password: oldPassword, new_password: newPassword });
  }

  createUser(data: any): Observable<UserItem> {
    return this.http.post<UserItem>(`${this.baseUrl}/users/`, data);
  }

  updateUser(id: number, data: Partial<UserItem>): Observable<UserItem> {
    return this.http.patch<UserItem>(`${this.baseUrl}/users/${id}/`, data);
  }

  deactivateUser(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/users/${id}/`);
  }

  reactivateUser(id: number): Observable<UserItem> {
    return this.http.post<UserItem>(`${this.baseUrl}/users/${id}/reactivate/`, {});
  }

  addCompany(company: Omit<Company, 'id' | 'contacts'>): Observable<Company> {
    return this.http.post<Company>(`${this.baseUrl}/companies/`, company);
  }

  updateCompany(id: number, company: Partial<Company>): Observable<Company> {
    return this.http.patch<Company>(`${this.baseUrl}/companies/${id}/`, company);
  }
  deleteCompany(id: number): Observable<any> {   // 👈 NOUVEAU
    return this.http.delete(`${this.baseUrl}/companies/${id}/`);
  }

  getOpportunities(): Observable<OpportunityItem[]> {
    return this.http.get<OpportunityItem[]>(`${this.baseUrl}/opportunities/`);
  }

  addOpportunity(opp: Omit<OpportunityItem, 'id' | 'weighted_revenue'>): Observable<OpportunityItem> {
    return this.http.post<OpportunityItem>(`${this.baseUrl}/opportunities/`, opp);
  }

  moveOpportunityStage(id: number, stage: Stage): Observable<any> {
    return this.http.patch(`${this.baseUrl}/opportunities/${id}/`, { stage });
  }

  removeOpportunity(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/opportunities/${id}/`);
  }

  getFeedbacks(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.baseUrl}/feedbacks/`);
  }

  addFeedback(feedback: Omit<Feedback, 'id'>): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.baseUrl}/feedbacks/`, feedback);
  }

  getCampagnes(): Observable<Campagne[]> {
    return this.http.get<Campagne[]>(`${this.baseUrl}/campaigns/`);
  }

  addCampagne(campagne: Omit<Campagne, 'id'>): Observable<Campagne> {
    return this.http.post<Campagne>(`${this.baseUrl}/campaigns/`, campagne);
  }
  addContact(companyId: number, contact: Omit<ContactItem, 'id'>): Observable<ContactItem> {
    return this.http.post<ContactItem>(`${this.baseUrl}/contacts/`, { ...contact, company: companyId });
  }

  updateContact(id: number, contact: Partial<ContactItem>): Observable<ContactItem> {
    return this.http.patch<ContactItem>(`${this.baseUrl}/contacts/${id}/`, contact);
  }

  deleteContact(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/contacts/${id}/`);
  }
  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.baseUrl}/notifications/`);
  }

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${this.baseUrl}/me/`);
  }
  getInteractions(): Observable<Interaction[]> {
    return this.http.get<Interaction[]>(`${this.baseUrl}/interactions/`);
  }

  addInteraction(interaction: Omit<Interaction, 'id'>): Observable<Interaction> {
    return this.http.post<Interaction>(`${this.baseUrl}/interactions/`, interaction);
  }
  nonConformites = signal<NonConformite[]>([]);

  getNonConformites(): Observable<NonConformite[]> {
    return this.http.get<NonConformite[]>(`${this.baseUrl}/non-conformites/`);
  }

  addNonConformite(nc: Omit<NonConformite, 'id'>): Observable<NonConformite> {
    return this.http.post<NonConformite>(`${this.baseUrl}/non-conformites/`, nc);
  }

  updateNonConformite(id: number, data: Partial<NonConformite>): Observable<any> {
    return this.http.patch(`${this.baseUrl}/non-conformites/${id}/`, data);
  }

  getCompanies(): Observable<Company[]> {
    return this.getClients();
  }

  getSatisfactionPDFs(): Observable<SatisfactionSurveyPDF[]> {
    return this.http.get<SatisfactionSurveyPDF[]>(`${this.baseUrl}/satisfaction-pdfs/`);
  }

  uploadSatisfactionPDF(formData: FormData): Observable<SatisfactionSurveyPDF> {
    return this.http.post<SatisfactionSurveyPDF>(`${this.baseUrl}/satisfaction-pdfs/`, formData);
  }

  deleteSatisfactionPDF(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/satisfaction-pdfs/${id}/`);
  }

  updateSatisfactionPDF(id: number, formData: FormData): Observable<SatisfactionSurveyPDF> {
    return this.http.patch<SatisfactionSurveyPDF>(`${this.baseUrl}/satisfaction-pdfs/${id}/`, formData);
  }
}

