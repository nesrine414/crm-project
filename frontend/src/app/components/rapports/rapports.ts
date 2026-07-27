import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { CrmDataService } from '../../services/crm-data';
import jsPDF from 'jspdf';

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

   exportPdf() {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const navy: [number, number, number] = [31, 59, 92];
    const teal: [number, number, number] = [26, 172, 192];
    const gray: [number, number, number] = [100, 116, 139];
    const lightBg: [number, number, number] = [248, 250, 252];

    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // ---- Bandeau d'en-tête ----
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setFillColor(...teal);
    doc.roundedRect(14, 8, 16, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('L', 20.5, 19);

    doc.setFontSize(16);
    doc.text('LCA CRM — Rapport de performance', 36, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le ${today}`, 36, 23);

    let y = 46;

    // ---- Section KPIs ----
    doc.setTextColor(...navy);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicateurs clés', 14, y);
    y += 8;

    const nps = this.npsScore();
    const kpis = [
      { label: 'NPS Score', value: nps !== null ? `${nps! > 0 ? '+' : ''}${nps}` : '—', sub: nps !== null ? `${this.crmData.feedbacks().length} avis clients` : 'Aucun feedback collecté' },
      { label: 'LTV moyen', value: `${this.ltvMoyen()} DT`, sub: 'Valeur moyenne par client actif' },
      { label: 'Taux de churn', value: '—', sub: 'Nécessite un historique dans le temps' },
      {
        label: 'CAC',
        value: this.crmData.campagnes().length > 0 ? `${this.cac()} DT` : '—',
        sub: this.crmData.campagnes().length > 0 ? `${this.totalCampaignBudget()} DT de budget campagnes` : 'Aucune campagne enregistrée'
      }
    ];

    const cardWidth = (pageWidth - 28 - 12) / 2;
    const cardHeight = 26;
    kpis.forEach((kpi, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 14 + col * (cardWidth + 12);
      const cardY = y + row * (cardHeight + 8);

      doc.setFillColor(...lightBg);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 2, 2, 'F');

      doc.setTextColor(...gray);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.label.toUpperCase(), x + 6, cardY + 8);

      doc.setTextColor(...navy);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text(kpi.value, x + 6, cardY + 17);

      doc.setTextColor(...gray);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.sub, x + 6, cardY + 22);
    });

    y += 2 * (cardHeight + 8) + 8;

    // ---- Section Répartition par secteur ----
    doc.setTextColor(...navy);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Répartition par secteur', 14, y);
    y += 10;

    if (this.hasSectorData()) {
      const barMaxWidth = pageWidth - 28 - 70;
      for (const s of this.sectorDistribution()) {
        doc.setTextColor(...navy);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(s.sector, 14, y + 4);

        doc.setFillColor(226, 232, 240);
        doc.roundedRect(60, y - 1, barMaxWidth, 6, 1, 1, 'F');

        const [r, g, b] = this.hexToRgb(s.color);
        doc.setFillColor(r, g, b);
        doc.roundedRect(60, y - 1, (barMaxWidth * s.pct) / 100, 6, 1, 1, 'F');

        doc.setTextColor(...gray);
        doc.setFontSize(9);
        doc.text(`${s.pct}%  (${s.count})`, 60 + barMaxWidth + 4, y + 4);

        y += 12;
      }
    } else {
      doc.setTextColor(...gray);
      doc.setFontSize(10);
      doc.text("Aucun client n'a de secteur renseigné.", 14, y);
    }

    // ---- Pied de page ----
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);
    doc.setTextColor(...gray);
    doc.setFontSize(8);
    doc.text('LCA CRM — Document généré automatiquement', 14, pageHeight - 10);

    const filename = `rapport-lca-crm-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  private hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
}
