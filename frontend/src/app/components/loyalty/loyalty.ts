import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface LocalLoyaltyAccount {
  id: number;
  clientName: string;
  tier: string;
  points: number;
}

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './loyalty.html',
  styleUrl: './loyalty.css'
})
export class Loyalty {
  searchTerm = '';
  showAddPointsModal = signal(false);
  selectedAccount = signal<LocalLoyaltyAccount | null>(null);

  // Formulaire d'ajustement
  addPointsForm = {
    points: 100,
    label: ''
  };

  // Liste fictive locale calée sur tes comptes clients
  accounts = signal<LocalLoyaltyAccount[]>([
    { id: 1, clientName: 'Société Tunisienne de Banque', tier: 'Or', points: 4500 },
    { id: 2, clientName: 'Tunisie Telecom', tier: 'Platine', points: 9200 },
    { id: 3, clientName: 'Ooredoo Distribution', tier: 'Argent', points: 1500 }
  ]);

  // Statistiques globales calculées à la volée
  stats = computed(() => {
    const list = this.accounts();
    const total = list.reduce((sum, acc) => sum + acc.points, 0);
    return {
      totalPoints: total,
      activeAccounts: list.length
    };
  });

  // Filtrage par barre de recherche
  filteredAccounts = computed(() => {
    const term = this.searchTerm.toLowerCase();
    return this.accounts().filter(acc => 
      acc.clientName.toLowerCase().includes(term) || 
      acc.tier.toLowerCase().includes(term)
    );
  });

  // Calcul du pourcentage de progression d'un palier (ex: max 10000 pts)
  progressToNextTier(points: number): number {
    const maxPoints = 10000;
    const percentage = (points / maxPoints) * 100;
    return Math.min(percentage, 100);
  }

  // Actions de la fenêtre modale
  openAddPoints(account: LocalLoyaltyAccount) {
    this.selectedAccount.set(account);
    this.addPointsForm = { points: 100, label: '' };
    this.showAddPointsModal.set(true);
  }

  closeAddPoints() {
    this.showAddPointsModal.set(false);
    this.selectedAccount.set(null);
  }

  submitAddPoints() {
    const account = this.selectedAccount();
    if (!account) return;

    // Mise à jour locale réactive du solde de points
    this.accounts.set(
      this.accounts().map(acc => {
        if (acc.id === account.id) {
          const newPoints = acc.points + Number(this.addPointsForm.points);
          // Ajustement dynamique du palier en fonction du nouveau solde
          let newTier = acc.tier;
          if (newPoints >= 8000) newTier = 'Platine';
          else if (newPoints >= 4000) newTier = 'Or';
          else if (newPoints >= 1000) newTier = 'Argent';
          
          return { ...acc, points: newPoints, tier: newTier };
        }
        return acc;
      })
    );

    this.closeAddPoints();
  }
}