import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CrmDataService, Campagne } from '../../services/crm-data';

@Component({
  selector: 'app-campagnes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './campagnes.html',
  styleUrl: './campagnes.css'
})
export class Campagnes implements OnInit {
  crmData = inject(CrmDataService);

  searchTerm = '';
  selectedCampagne = signal<Campagne | null>(null);
  showAddModal = signal(false);

  newCampagne: { name: string; type: Campagne['type']; budget: number; start_date: string } = {
    name: '',
    type: 'Email',
    budget: 0,
    start_date: new Date().toISOString().split('T')[0]
  };

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.crmData.getCampagnes().subscribe({
      next: (data) => this.crmData.campagnes.set(data),
      error: (err) => console.error(err)
    });
  }

  filteredCampagnes = computed(() => {
    const term = this.searchTerm.toLowerCase();
    return this.crmData.campagnes().filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.type.toLowerCase().includes(term)
    );
  });

  selectCampagne(campagne: Campagne) {
    this.selectedCampagne.set(campagne);
  }

  closeDetail() {
    this.selectedCampagne.set(null);
  }

  openAddModal() {
    this.newCampagne = {
      name: '',
      type: 'Email',
      budget: 0,
      start_date: new Date().toISOString().split('T')[0]
    };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  submitCampagne() {
    this.crmData.addCampagne(this.newCampagne).subscribe({
      next: () => {
        this.refreshData();
        this.showAddModal.set(false);
      },
      error: (err) => console.error(err)
    });
  }
}