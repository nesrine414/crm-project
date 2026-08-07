import requests

r = requests.get('http://127.0.0.1:8000/api/companies/?status=Prestataire')
companies = r.json()
print("Type of response:", type(companies))
if isinstance(companies, list) and len(companies) > 0:
    pluxee = None
    for c in companies:
        if isinstance(c, dict) and 'Pluxee' in c.get('name', ''):
            pluxee = c
            break
    if pluxee:
        print("Found Pluxee with id =", pluxee['id'])
        # Test PATCH
        r2 = requests.patch(
            f'http://127.0.0.1:8000/api/companies/{pluxee["id"]}/',
            json={
                'name': 'Pluxee',
                'status': 'Prestataire',
                'service_provided': 'Fourniture',
                'email': 'test@test.com',
                'phone': '+216 12 345 678',
                'patente': '',
                'convention_contrat': '',
            }
        )
        print("PATCH Status:", r2.status_code)
        print("PATCH Response:", r2.text[:800])
    else:
        print("Pluxee not found. Companies available:")
        for c in companies[:5]:
            print(" -", c.get('name'))
else:
    print("Unexpected response format:", str(companies)[:300])
