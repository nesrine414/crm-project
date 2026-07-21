import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CrmDataService } from '../../services/crm-data';

@Component({
  selector: 'app-rapports',
  imports: [DecimalPipe],
  templateUrl: './rapports.html',
  styleUrl: './rapports.css'
})
export class Rapports {
  crmData = inject(CrmDataService);

  // ---- NPS (réel, approximé depuis les notes 1-5 étoiles) ----
  npsScore = computed(() => {
    const list = this.crmData.feedbacks();
    if (list.length === 0) return null;
    const promoters = list.filter(f => f.rating === 5).length;
    const detractors = list.filter(f => f.rating <= 3).length;
    const total = list.length;
    return Math.round(((promoters - detractors) / total) * 100);
  });

  // ---- LTV moyen (réel) ----
  ltvMoyen = computed(() => {
    const clientsWithRevenue = new Map<number, number>();
    this.crmData.opportunities()
      .filter(o => o.result === 'Gagné')
      .forEach(o => {
        clientsWithRevenue.set(o.company, (clientsWithRevenue.get(o.company) ?? 0) + o.estimated_amount);
      });
    if (clientsWithRevenue.size === 0) return 0;
    const total = Array.from(clientsWithRevenue.values()).reduce((sum, v) => sum + v, 0);
    return Math.round(total / clientsWithRevenue.size);
  });

  // ---- CAC (calcul réel, basé sur les budgets de campagnes réels) ----
  totalCampaignBudget = computed(() =>
    this.crmData.campagnes().reduce((sum, c) => sum + Number(c.budget), 0)
  );

  cac = computed(() => {
    const clients = this.crmData.clients().length;
    if (clients === 0) return 0;
    return Math.round(this.totalCampaignBudget() / clients);
  });

  // ---- Répartition par secteur (réel) ----
  sectorColors = ['#1AACC0', '#7C3AED', '#B95000', '#04844B', '#DC2626', '#2563EB'];

  sectorDistribution = computed(() => {
    const clients = this.crmData.clients().filter(c => c.sector);
    const total = clients.length;
    if (total === 0) return [];

    const counts = new Map<string, number>();
    for (const c of clients) {
      counts.set(c.sector!, (counts.get(c.sector!) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([sector, count], i) => ({
        sector,
        count,
        pct: Math.round((count / total) * 100),
        color: this.sectorColors[i % this.sectorColors.length]
      }))
      .sort((a, b) => b.count - a.count);
  });

  hasSectorData = computed(() => this.sectorDistribution().length > 0);
}