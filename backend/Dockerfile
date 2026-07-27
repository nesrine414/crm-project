# Étape 1 : on part d'une image Python légère déjà prête
FROM python:3.12-slim
# Étape 2 : on définit le dossier de travail à l'intérieur du conteneur
WORKDIR /app

# Étape 3 : on installe les dépendances système nécessaires à MySQL
RUN apt-get update && apt-get install -y default-libmysqlclient-dev gcc pkg-config

# Étape 4 : on copie uniquement requirements.txt d'abord (optimisation du cache)
COPY requirements.txt .

# Étape 5 : on installe les librairies Python
RUN pip install --no-cache-dir -r requirements.txt

# Étape 6 : on copie tout le reste du code Django
COPY . .

# Étape 7 : on expose le port sur lequel Django va écouter
EXPOSE 8000

# Étape 8 : la commande lancée quand le conteneur démarre
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]