import os
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from crm.models import Company, Opportunity, Feedback, Campaign

NAVY = (31 / 255, 59 / 255, 92 / 255)
TEAL = (26 / 255, 172 / 255, 192 / 255)
GRAY = (100 / 255, 116 / 255, 139 / 255)
LIGHT_BG = (248 / 255, 250 / 255, 252 / 255)

SECTOR_COLORS = [
    (26 / 255, 172 / 255, 192 / 255),
    (124 / 255, 58 / 255, 237 / 255),
    (185 / 255, 80 / 255, 0 / 255),
    (4 / 255, 132 / 255, 75 / 255),
    (220 / 255, 38 / 255, 38 / 255),
    (37 / 255, 99 / 255, 235 / 255),
]


def compute_kpis():
    clients = Company.objects.filter(status='Client')
    opportunities = Opportunity.objects.all()
    won = opportunities.filter(result='Gagné')
    feedbacks = Feedback.objects.all()
    campaigns = Campaign.objects.all()

    total_revenue = sum(float(o.estimated_amount) for o in won)

    # NPS
    nps = None
    if feedbacks.exists():
        total = feedbacks.count()
        promoters = feedbacks.filter(rating=5).count()
        detractors = feedbacks.filter(rating__lte=3).count()
        nps = round(((promoters - detractors) / total) * 100)

    # LTV moyen
    revenue_by_client = {}
    for o in won:
        revenue_by_client[o.company_id] = revenue_by_client.get(o.company_id, 0) + float(o.estimated_amount)
    ltv = round(sum(revenue_by_client.values()) / len(revenue_by_client)) if revenue_by_client else 0

    # CAC
    total_budget = sum(float(c.budget) for c in campaigns)
    client_count = clients.count()
    cac = round(total_budget / client_count) if client_count and campaigns.exists() else None

    # Répartition par secteur
    sector_counts = {}
    clients_with_sector = clients.exclude(sector='').exclude(sector__isnull=True)
    for c in clients_with_sector:
        sector_counts[c.sector] = sector_counts.get(c.sector, 0) + 1
    total_sector_clients = sum(sector_counts.values())
    sectors = []
    if total_sector_clients:
        for i, (sector, count) in enumerate(sorted(sector_counts.items(), key=lambda x: -x[1])):
            pct = round((count / total_sector_clients) * 100)
            sectors.append({'sector': sector, 'count': count, 'pct': pct, 'color': SECTOR_COLORS[i % len(SECTOR_COLORS)]})

    return {
        'client_count': client_count,
        'total_revenue': total_revenue,
        'nps': nps,
        'feedback_count': feedbacks.count(),
        'ltv': ltv,
        'cac': cac,
        'total_budget': total_budget,
        'campaign_count': campaigns.count(),
        'sectors': sectors,
    }


class Command(BaseCommand):
    help = "Génère automatiquement le rapport PDF mensuel de performance du CRM."

    def handle(self, *args, **options):
        reports_dir = os.path.join(settings.BASE_DIR, 'reports')
        os.makedirs(reports_dir, exist_ok=True)

        kpis = compute_kpis()
        today = datetime.now()
        filename = f"rapport-lca-crm-{today.strftime('%Y-%m-%d')}.pdf"
        filepath = os.path.join(reports_dir, filename)

        c = canvas.Canvas(filepath, pagesize=A4)
        width, height = A4

        # ---- Bandeau d'en-tête ----
        c.setFillColorRGB(*NAVY)
        c.rect(0, height - 32 * mm, width, 32 * mm, fill=1, stroke=0)

        c.setFillColorRGB(*TEAL)
        c.roundRect(14 * mm, height - 24 * mm, 16 * mm, 16 * mm, 3 * mm, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont('Helvetica-Bold', 12)
        c.drawString(19 * mm, height - 17 * mm, 'L')

        c.setFont('Helvetica-Bold', 16)
        c.drawString(36 * mm, height - 13 * mm, 'LCA CRM — Rapport de performance')
        c.setFont('Helvetica', 10)
        date_str = today.strftime('%d/%m/%Y')
        c.drawString(36 * mm, height - 20 * mm, f"Généré automatiquement le {date_str}")

        y = height - 46 * mm

        # ---- KPIs ----
        c.setFillColorRGB(*NAVY)
        c.setFont('Helvetica-Bold', 13)
        c.drawString(14 * mm, y, 'Indicateurs clés')
        y -= 10 * mm

        nps_value = f"{'+' if kpis['nps'] and kpis['nps'] > 0 else ''}{kpis['nps']}" if kpis['nps'] is not None else '—'
        nps_sub = f"{kpis['feedback_count']} avis clients" if kpis['nps'] is not None else 'Aucun feedback collecté'

        cac_value = f"{kpis['cac']} DT" if kpis['cac'] is not None else '—'
        cac_sub = f"{kpis['total_budget']:.0f} DT de budget campagnes" if kpis['campaign_count'] else 'Aucune campagne enregistrée'

        kpi_list = [
            ('CHIFFRE D\'AFFAIRES', f"{kpis['total_revenue']:.0f} DT", 'Opportunités gagnées'),
            ('NPS SCORE', nps_value, nps_sub),
            ('LTV MOYEN', f"{kpis['ltv']} DT", 'Valeur moyenne par client'),
            ('CAC', cac_value, cac_sub),
        ]

        card_width = (width - 28 * mm - 12 * mm) / 2
        card_height = 22 * mm
        for i, (label, value, sub) in enumerate(kpi_list):
            col = i % 2
            row = i // 2
            x = 14 * mm + col * (card_width + 12 * mm)
            card_y = y - row * (card_height + 6 * mm) - card_height

            c.setFillColorRGB(*LIGHT_BG)
            c.roundRect(x, card_y, card_width, card_height, 2 * mm, fill=1, stroke=0)

            c.setFillColorRGB(*GRAY)
            c.setFont('Helvetica-Bold', 8)
            c.drawString(x + 5 * mm, card_y + card_height - 7 * mm, label)

            c.setFillColorRGB(*NAVY)
            c.setFont('Helvetica-Bold', 14)
            c.drawString(x + 5 * mm, card_y + card_height - 15 * mm, value)

            c.setFillColorRGB(*GRAY)
            c.setFont('Helvetica', 7)
            c.drawString(x + 5 * mm, card_y + 4 * mm, sub)

        y -= 2 * (card_height + 6 * mm) + 8 * mm

        # ---- Répartition par secteur ----
        c.setFillColorRGB(*NAVY)
        c.setFont('Helvetica-Bold', 13)
        c.drawString(14 * mm, y, 'Répartition par secteur')
        y -= 10 * mm

        if kpis['sectors']:
            bar_max_width = width - 28 * mm - 70 * mm
            for s in kpis['sectors']:
                c.setFillColorRGB(*NAVY)
                c.setFont('Helvetica', 10)
                c.drawString(14 * mm, y, s['sector'])

                c.setFillColorRGB(226 / 255, 232 / 255, 240 / 255)
                c.roundRect(60 * mm, y - 1 * mm, bar_max_width, 5 * mm, 1 * mm, fill=1, stroke=0)

                c.setFillColorRGB(*s['color'])
                filled_width = bar_max_width * s['pct'] / 100
                if filled_width > 0:
                    c.roundRect(60 * mm, y - 1 * mm, filled_width, 5 * mm, 1 * mm, fill=1, stroke=0)

                c.setFillColorRGB(*GRAY)
                c.setFont('Helvetica', 9)
                c.drawString(60 * mm + bar_max_width + 4 * mm, y, f"{s['pct']}% ({s['count']})")

                y -= 10 * mm
        else:
            c.setFillColorRGB(*GRAY)
            c.setFont('Helvetica', 10)
            c.drawString(14 * mm, y, "Aucun client n'a de secteur renseigné.")

        # ---- Pied de page ----
        c.setStrokeColorRGB(226 / 255, 232 / 255, 240 / 255)
        c.line(14 * mm, 14 * mm, width - 14 * mm, 14 * mm)
        c.setFillColorRGB(*GRAY)
        c.setFont('Helvetica', 7)
        c.drawString(14 * mm, 9 * mm, 'LCA CRM — Rapport généré automatiquement')

        c.save()

        self.stdout.write(self.style.SUCCESS(f"Rapport généré : {filepath}"))