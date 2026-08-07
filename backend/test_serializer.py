import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from crm.models import Company

# Find Pluxee
pluxee = Company.objects.filter(name__icontains='Pluxee').first()
if pluxee:
    print(f"Found: {pluxee.name}, id={pluxee.id}")
    print(f"  service_provided='{pluxee.service_provided}'")
    print(f"  email='{pluxee.email}'")
    print(f"  phone='{pluxee.phone}'")
    
    # Try saving with 'Fourniture' (not in choices)
    from rest_framework.test import APIRequestFactory
    from crm.serializers import CompanySerializer
    
    data = {
        'name': 'Pluxee',
        'status': 'Prestataire',
        'service_provided': 'Fourniture',  # This might be the problem
        'email': 'test@test.com',
        'phone': '+216 12 345 678',
        'patente': '',
        'convention_contrat': '',
    }
    serializer = CompanySerializer(pluxee, data=data, partial=True)
    if serializer.is_valid():
        print("Serializer is VALID")
    else:
        print("Serializer ERRORS:", serializer.errors)
else:
    print("Pluxee not found")
    # Show all prestataires
    prest = Company.objects.filter(status='Prestataire')
    print(f"Total prestataires: {prest.count()}")
    for p in prest[:5]:
        print(f"  {p.name}: service='{p.service_provided}'")
