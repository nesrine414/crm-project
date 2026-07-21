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
  status: 'Client' | 'Lead' | 'Partenaire';
  created_at?: string;
  contacts: ContactItem[];
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

export interface ReclamationNote {
  id?: number;
  date: string;
  note: string;
}

export interface Reclamation {
  id: number;
  company: number;
  subject: string;
  description: string;
  status: 'Ouverte' | 'En cours' | 'Résolue';
  priority: 'Faible' | 'Moyenne' | 'Élevée';
  channel: 'Téléphone' | 'Email' | 'Réunion' | 'Formulaire web' | 'Portail client';
  assigned_to?: number;
  created_at?: string;
  notes: ReclamationNote[];
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

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

@Injectable({ providedIn: 'root' })
export class CrmDataService {
  private http = inject(HttpClient);
  private baseUrl = 'http://127.0.0.1:8000/api';

  clients = signal<Company[]>([]);
  partners = signal<Company[]>([]);
  opportunities = signal<OpportunityItem[]>([]);
  feedbacks = signal<Feedback[]>([]);
  reclamations = signal<Reclamation[]>([]);
  campagnes = signal<Campagne[]>([]);
  interactions = signal<Interaction[]>([]);
  getClients(): Observable<Company[]> {
    return this.http.get<Company[]>(`${this.baseUrl}/companies/`);
  }
  getUsers(): Observable<UserItem[]> {
  return this.http.get<UserItem[]>(`${this.baseUrl}/users/`);
}

  addCompany(company: Omit<Company, 'id' | 'contacts'>): Observable<Company> {
    return this.http.post<Company>(`${this.baseUrl}/companies/`, company);
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

  getReclamations(): Observable<Reclamation[]> {
    return this.http.get<Reclamation[]>(`${this.baseUrl}/reclamations/`);
  }

  addReclamation(rec: Omit<Reclamation, 'id' | 'notes'>): Observable<Reclamation> {
    return this.http.post<Reclamation>(`${this.baseUrl}/reclamations/`, rec);
  }

  updateReclamationStatus(id: number, status: Reclamation['status']): Observable<any> {
    return this.http.patch(`${this.baseUrl}/reclamations/${id}/`, { status });
  }

  getCampagnes(): Observable<Campagne[]> {
    return this.http.get<Campagne[]>(`${this.baseUrl}/campaigns/`);
  }

  addCampagne(campagne: Omit<Campagne, 'id'>): Observable<Campagne> {
    return this.http.post<Campagne>(`${this.baseUrl}/campaigns/`, campagne);
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
}
