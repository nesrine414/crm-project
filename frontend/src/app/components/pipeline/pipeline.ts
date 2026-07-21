import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, OpportunityItem, Company, Stage } from '../../services/crm-data';

@Component({
  selector: 'app-pipeline',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './pipeline.html',
  styleUrl: './pipeline.css'
})
export class Pipeline implements OnInit {
  crmData = inject(CrmDataService);

stages: Stage[] = ['Qualification', 'Chiffrage', 'Offre Soumise', 'Négociation', 'Clôturé'];  selectedOpportunity = signal<OpportunityItem | null>(null);
  showAddModal = signal(false);

  newOpportunity = {
    name: '',
    company: null as number | null,
    amount: 0,
    stage: 'Qualification' as Stage,
    probability: 10,
    due_date: ''
  };

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getOpportunities().subscribe({
      next: (opps) => this.crmData.opportunities.set(opps),
      error: (err) => console.error(err)
    });
    this.crmData.getClients().subscribe({
      next: (comps) => this.crmData.clients.set(comps),
      error: (err) => console.error(err)
    });
  }

  getOppsByStage(stage: Stage) {
    return this.crmData.opportunities().filter(o => o.stage === stage);
  }

  getCompanyName(companyId: number): string {
    const comp = this.crmData.clients().find(c => c.id === companyId);
    return comp ? comp.name : 'Structure inconnue';
  }

  getCompanyContacts(companyId: number) {
    const comp = this.crmData.clients().find(c => c.id === companyId);
    return comp ? comp.contacts : [];
  }

  selectOpportunity(opp: OpportunityItem) {
    this.selectedOpportunity.set(opp);
  }

  closeDetail() {
    this.selectedOpportunity.set(null);
  }

  updateStage(opp: OpportunityItem, newStage: Stage) {
    this.crmData.moveOpportunityStage(opp.id, newStage).subscribe({
      next: () => this.refreshData()
    });
  }

  openAddModal() {
    this.newOpportunity = { name: '', company: null, amount: 0, stage: 'Qualification', probability: 10, due_date: '' };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitOpportunity() {
  if (!this.newOpportunity.company) return;

  const payload = {
    project_subject: this.newOpportunity.name,
    company: this.newOpportunity.company,
    estimated_amount: this.newOpportunity.amount,
    stage: this.newOpportunity.stage,
    probability: this.newOpportunity.probability,
    expected_close_date: this.newOpportunity.due_date,
    result: 'En cours' as const
  };

  this.crmData.addOpportunity(payload as any).subscribe({
    next: () => {
      this.refreshData();
      this.showAddModal.set(false);
    },
    error: (err) => console.error(err)
  });
}
}