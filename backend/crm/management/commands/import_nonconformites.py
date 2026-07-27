import openpyxl
from datetime import datetime, date
from django.core.management.base import BaseCommand
from crm.models import NonConformite

EXCEL_FILENAME = "Suivi des NC (2) (1).xlsx"
SHEET_NAME = "Suivi des non conformités"
HEADER_ROW = 10  # ligne contenant "Numero", "Date", "Problème"...

GRAVITE_VALID = {1, 2, 3}
EFFICACITE_MAP = {
    'efficacité': 'Efficace',
    'efficacite': 'Efficace',
    'non efficace': 'Non efficace',
    'insuffisant': 'Insuffisant',
    'a vérifier': 'A vérifier',
    'à vérifier': 'A vérifier',
}
AVANCEMENT_VALID = {'P', 'D', 'C', 'A'}


def clean_str(value):
    if value is None:
        return ''
    return str(value).strip()


def to_date_str(value):
    """Convertit une date/datetime/année Excel en texte lisible, sans planter sur des formats inattendus."""
    if value is None:
        return ''
    if isinstance(value, (datetime, date)):
        return value.strftime('%d/%m/%Y')
    return str(value).strip()


def parse_gravite(value):
    try:
        g = int(value)
        return g if g in GRAVITE_VALID else 2
    except (TypeError, ValueError):
        return 2


def parse_efficacite(value):
    text = clean_str(value).lower()
    return EFFICACITE_MAP.get(text, '')


def parse_avancement(value):
    text = clean_str(value).upper()
    return text if text in AVANCEMENT_VALID else 'P'


def parse_statut(value):
    text = clean_str(value).lower()
    if 'clos' in text or 'ferm' in text:
        return 'Fermé'
    return 'Ouvert'


def parse_recurrence(value):
    text = clean_str(value).lower()
    return text.startswith('oui')


class Command(BaseCommand):
    help = "Importe les non-conformités existantes depuis le fichier Excel de suivi qualité."

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help="Applique réellement l'import. Sans cette option : aperçu seulement.")

    def handle(self, *args, **options):
        apply_changes = options['apply']

        wb = openpyxl.load_workbook(EXCEL_FILENAME, data_only=True)
        ws = wb[SHEET_NAME]

        created = 0
        skipped = 0

        for row in ws.iter_rows(min_row=HEADER_ROW + 1, values_only=False):
            numero_cell = row[0]  # colonne A
            if numero_cell.value is None:
                continue

            try:
                numero = int(numero_cell.value)
            except (TypeError, ValueError):
                continue

            if NonConformite.objects.filter(numero=numero).exists():
                self.stdout.write(self.style.WARNING(f"NC-{numero} existe déjà — ignorée."))
                skipped += 1
                continue

            date_val = row[1].value  # B
            date_obj = date_val if isinstance(date_val, (datetime, date)) else datetime.now().date()
            if isinstance(date_obj, datetime):
                date_obj = date_obj.date()

            data = {
                'numero': numero,
                'date': date_obj,
                'probleme': clean_str(row[2].value),          # C
                'origine': clean_str(row[3].value),            # D
                'processus': clean_str(row[4].value) or 'PMS',  # E
                'gravite': parse_gravite(row[5].value),         # F
                'action_immediate': clean_str(row[6].value),    # G
                'analyse_causes': clean_str(row[7].value),      # H
                'recurrence': parse_recurrence(row[8].value),   # I
                'action_corrective': clean_str(row[9].value),   # J
                'date_prevue': to_date_str(row[10].value),      # K
                'responsable': clean_str(row[11].value),        # L
                'date_realisation': to_date_str(row[12].value), # M
                'delais': clean_str(row[13].value),             # N
                'efficacite': parse_efficacite(row[14].value),  # O
                'commentaire': clean_str(row[15].value),        # P
                'avancement': parse_avancement(row[17].value) if len(row) > 17 else 'P',  # R
                'statut': parse_statut(row[18].value) if len(row) > 18 else 'Ouvert',      # S
            }

            self.stdout.write(f"-> NC-{numero} | {data['processus']} | {data['probleme'][:60]}")

            if apply_changes:
                NonConformite.objects.create(**data)
            created += 1

        self.stdout.write("")
        if apply_changes:
            self.stdout.write(self.style.SUCCESS(f"Terminé. {created} non-conformité(s) créée(s), {skipped} déjà existante(s) ignorée(s)."))
        else:
            self.stdout.write(self.style.WARNING(f"Aperçu (dry-run). {created} seraient créées, {skipped} déjà existantes. Relance avec --apply."))