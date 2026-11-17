"""Static configuration for the illustrative FCT demonstration network.

All facility inventory and consumption here is SIMULATED. Weather is real
Open-Meteo history for Abuja. Disease indicators are illustrative.
"""

TODAY = "2026-11-17"
HISTORY_DAYS = 731
FORECAST_HORIZON = 30

FACILITIES = [
    {
        "id": "fac_phc",
        "name": "Gwagwalada Primary Health Centre",
        "shortName": "Gwagwalada PHC",
        "type": "PHC",
        "ownership": "PUBLIC",
        "address": "Hospital Road, Gwagwalada",
        "lga": "Gwagwalada",
        "state": "FCT",
        "latitude": 8.9434,
        "longitude": 7.0806,
        "phone": "+234 803 114 2201",
        "contactName": "Amina Yusuf",
        "bedCount": 8,
        "scale": 0.72,
        "orderCycleDays": 14,
        "leadTimeOffset": 2,
    },
    {
        "id": "fac_gh",
        "name": "General Hospital Abuja",
        "shortName": "General Hospital Abuja",
        "type": "GENERAL",
        "ownership": "PUBLIC",
        "address": "Central Business District, Abuja",
        "lga": "Abuja Municipal",
        "state": "FCT",
        "latitude": 9.0579,
        "longitude": 7.4951,
        "phone": "+234 809 552 8810",
        "contactName": "Dr. Chidi Okonkwo",
        "bedCount": 220,
        "scale": 2.15,
        "orderCycleDays": 7,
        "leadTimeOffset": 0,
    },
    {
        "id": "fac_sunrise",
        "name": "Sunrise Private Hospital",
        "shortName": "Sunrise Hospital",
        "type": "PRIVATE",
        "ownership": "PRIVATE",
        "address": "Gwarinpa Estate, Abuja",
        "lga": "Abuja Municipal",
        "state": "FCT",
        "latitude": 9.1076,
        "longitude": 7.4040,
        "phone": "+234 806 447 1190",
        "contactName": "Dr. Bola Ajayi",
        "bedCount": 48,
        "scale": 0.95,
        "orderCycleDays": 14,
        "leadTimeOffset": 1,
    },
    {
        "id": "fac_carepoint",
        "name": "CarePoint Community Pharmacy",
        "shortName": "CarePoint Pharmacy",
        "type": "PHARMACY",
        "ownership": "PRIVATE",
        "address": "Ademola Adetokunbo Crescent, Wuse 2",
        "lga": "Abuja Municipal",
        "state": "FCT",
        "latitude": 9.0765,
        "longitude": 7.4705,
        "phone": "+234 802 335 7742",
        "contactName": "Emeka Nwosu",
        "bedCount": None,
        "scale": 1.05,
        "orderCycleDays": 14,
        "leadTimeOffset": 1,
    },
]

# affinity[facility_type][medicine_id]
AFFINITY = {
    "PHC": {
        "med_act": 1.55, "med_pcm": 1.2, "med_amox": 1.1, "med_ors": 1.5,
        "med_cipro": 0.8, "med_metformin": 0.45, "med_amlodipine": 0.45,
        "med_salbutamol": 0.7, "med_ceftriaxone": 0.35, "med_zinc": 1.6,
        "med_folic": 1.3, "med_ibuprofen": 0.9,
    },
    "GENERAL": {
        "med_act": 1.05, "med_pcm": 1.35, "med_amox": 1.25, "med_ors": 1.05,
        "med_cipro": 1.2, "med_metformin": 1.35, "med_amlodipine": 1.35,
        "med_salbutamol": 1.2, "med_ceftriaxone": 2.0, "med_zinc": 0.9,
        "med_folic": 1.0, "med_ibuprofen": 1.2,
    },
    "PRIVATE": {
        "med_act": 0.8, "med_pcm": 1.0, "med_amox": 1.05, "med_ors": 0.6,
        "med_cipro": 1.0, "med_metformin": 1.5, "med_amlodipine": 1.5,
        "med_salbutamol": 1.1, "med_ceftriaxone": 1.0, "med_zinc": 0.55,
        "med_folic": 1.1, "med_ibuprofen": 1.1,
    },
    "PHARMACY": {
        "med_act": 1.0, "med_pcm": 1.4, "med_amox": 1.1, "med_ors": 0.9,
        "med_cipro": 1.0, "med_metformin": 1.0, "med_amlodipine": 1.0,
        "med_salbutamol": 1.4, "med_ceftriaxone": 0.1, "med_zinc": 1.0,
        "med_folic": 0.9, "med_ibuprofen": 1.15,
    },
}

# base = reference daily demand before facility scale and affinity
MEDICINES = [
    {
        "id": "med_act", "name": "Artemether/Lumefantrine 20/120mg",
        "genericName": "Artemether/Lumefantrine", "strength": "20/120mg",
        "form": "Tablet", "category": "ANTIMALARIAL", "unit": "tablet",
        "packSize": 6, "barcode": "8901234500017", "atcCode": "P01BF01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 14,
        "shelfLifeDays": 730, "base": 5.0, "growth": 0.02,
        "weather": ["rain"],
    },
    {
        "id": "med_pcm", "name": "Paracetamol 500mg",
        "genericName": "Paracetamol", "strength": "500mg",
        "form": "Tablet", "category": "ANALGESIC", "unit": "tablet",
        "packSize": 100, "barcode": "8901234500024", "atcCode": "N02BE01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 10,
        "shelfLifeDays": 1095, "base": 34.0, "growth": 0.04,
        "weather": ["heat"],
    },
    {
        "id": "med_amox", "name": "Amoxicillin 500mg",
        "genericName": "Amoxicillin", "strength": "500mg",
        "form": "Capsule", "category": "ANTIBIOTIC", "unit": "capsule",
        "packSize": 100, "barcode": "8901234500031", "atcCode": "J01CA04",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 12,
        "shelfLifeDays": 730, "base": 15.0, "growth": 0.03,
        "weather": ["dry"],
    },
    {
        "id": "med_ors", "name": "Oral Rehydration Salts",
        "genericName": "Oral Rehydration Salts", "strength": "20.5g sachet",
        "form": "Sachet", "category": "ORS", "unit": "sachet",
        "packSize": 10, "barcode": "8901234500048", "atcCode": "A07CA",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 9,
        "shelfLifeDays": 1095, "base": 8.0, "growth": 0.03,
        "weather": ["rain", "heat"],
    },
    {
        "id": "med_cipro", "name": "Ciprofloxacin 500mg",
        "genericName": "Ciprofloxacin", "strength": "500mg",
        "form": "Tablet", "category": "ANTIBIOTIC", "unit": "tablet",
        "packSize": 20, "barcode": "8901234500055", "atcCode": "J01MA02",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 12,
        "shelfLifeDays": 730, "base": 5.0, "growth": 0.02,
        "weather": ["rain"],
    },
    {
        "id": "med_metformin", "name": "Metformin 500mg",
        "genericName": "Metformin", "strength": "500mg",
        "form": "Tablet", "category": "CHRONIC", "unit": "tablet",
        "packSize": 100, "barcode": "8901234500062", "atcCode": "A10BA02",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 14,
        "shelfLifeDays": 1095, "base": 20.0, "growth": 0.12,
        "weather": [],
    },
    {
        "id": "med_amlodipine", "name": "Amlodipine 5mg",
        "genericName": "Amlodipine", "strength": "5mg",
        "form": "Tablet", "category": "CHRONIC", "unit": "tablet",
        "packSize": 100, "barcode": "8901234500079", "atcCode": "C08CA01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 14,
        "shelfLifeDays": 1095, "base": 16.0, "growth": 0.12,
        "weather": [],
    },
    {
        "id": "med_salbutamol", "name": "Salbutamol 100mcg Inhaler",
        "genericName": "Salbutamol", "strength": "100mcg/dose",
        "form": "Inhaler", "category": "RESPIRATORY", "unit": "inhaler",
        "packSize": 1, "barcode": "8901234500086", "atcCode": "R03AC02",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 16,
        "shelfLifeDays": 730, "base": 4.0, "growth": 0.05,
        "weather": ["dry"],
    },
    {
        "id": "med_ceftriaxone", "name": "Ceftriaxone 1g Injection",
        "genericName": "Ceftriaxone", "strength": "1g",
        "form": "Vial", "category": "ANTIBIOTIC", "unit": "vial",
        "packSize": 1, "barcode": "8901234500093", "atcCode": "J01DD04",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 18,
        "shelfLifeDays": 730, "base": 3.0, "growth": 0.03,
        "weather": ["rain"],
    },
    {
        "id": "med_zinc", "name": "Zinc Sulphate 20mg",
        "genericName": "Zinc Sulphate", "strength": "20mg",
        "form": "Dispersible tablet", "category": "OTHER", "unit": "tablet",
        "packSize": 10, "barcode": "8901234500109", "atcCode": "A12CB01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 10,
        "shelfLifeDays": 730, "base": 7.0, "growth": 0.04,
        "weather": ["rain"],
    },
    {
        "id": "med_folic", "name": "Folic Acid 5mg",
        "genericName": "Folic Acid", "strength": "5mg",
        "form": "Tablet", "category": "OTHER", "unit": "tablet",
        "packSize": 100, "barcode": "8901234500116", "atcCode": "B03BB01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 12,
        "shelfLifeDays": 1095, "base": 11.0, "growth": 0.05,
        "weather": [],
    },
    {
        "id": "med_ibuprofen", "name": "Ibuprofen 400mg",
        "genericName": "Ibuprofen", "strength": "400mg",
        "form": "Tablet", "category": "ANALGESIC", "unit": "tablet",
        "packSize": 100, "barcode": "8901234500123", "atcCode": "M01AE01",
        "essential": True, "storage": "AMBIENT", "leadTimeDays": 10,
        "shelfLifeDays": 1095, "base": 12.0, "growth": 0.05,
        "weather": ["heat"],
    },
]

PRICE_NGN = {
    "med_act": 420.0, "med_pcm": 8.0, "med_amox": 28.0, "med_ors": 55.0,
    "med_cipro": 45.0, "med_metformin": 14.0, "med_amlodipine": 16.0,
    "med_salbutamol": 1450.0, "med_ceftriaxone": 950.0, "med_zinc": 32.0,
    "med_folic": 9.0, "med_ibuprofen": 11.0,
}

SUPPLIERS = [
    {
        "id": "sup_central", "name": "FCT Central Medical Store",
        "type": "CENTRAL_STORE", "leadTimeDays": 14,
        "phone": "+234 803 000 1100", "email": "orders@fctcms.gov.ng",
    },
    {
        "id": "sup_emzor", "name": "Emzor Pharmaceutical Distribution",
        "type": "DISTRIBUTOR", "leadTimeDays": 9,
        "phone": "+234 802 444 9080", "email": "supply@emzor.example",
    },
    {
        "id": "sup_fidson", "name": "Fidson Healthcare",
        "type": "MANUFACTURER", "leadTimeDays": 12,
        "phone": "+234 805 221 7744", "email": "orders@fidson.example",
    },
    {
        "id": "sup_swift", "name": "SwiftCare Medical Supplies",
        "type": "DISTRIBUTOR", "leadTimeDays": 7,
        "phone": "+234 807 900 3312", "email": "sales@swiftcare.example",
    },
]

USERS = [
    {
        "id": "usr_amara", "name": "Amina Yusuf", "email": "amina@aisec.health",
        "role": "INVENTORY_OFFICER", "title": "Inventory Officer",
        "phone": "+234 803 114 2201",
        "memberships": [{"facilityId": "fac_phc", "role": "INVENTORY_OFFICER", "isPrimary": True}],
    },
    {
        "id": "usr_chidi", "name": "Dr. Chidi Okonkwo", "email": "chidi@aisec.health",
        "role": "FACILITY_MANAGER", "title": "Medical Director",
        "phone": "+234 809 552 8810",
        "memberships": [{"facilityId": "fac_gh", "role": "FACILITY_MANAGER", "isPrimary": True}],
    },
    {
        "id": "usr_ngozi", "name": "Dr. Ngozi Adeyemi", "email": "ngozi@aisec.health",
        "role": "NETWORK_AUTHORITY", "title": "FCT Supply Chain Lead",
        "phone": "+234 806 112 3300",
        "memberships": [
            {"facilityId": "fac_phc", "role": "NETWORK_AUTHORITY", "isPrimary": False},
            {"facilityId": "fac_gh", "role": "NETWORK_AUTHORITY", "isPrimary": False},
            {"facilityId": "fac_sunrise", "role": "NETWORK_AUTHORITY", "isPrimary": False},
            {"facilityId": "fac_carepoint", "role": "NETWORK_AUTHORITY", "isPrimary": False},
        ],
    },
    {
        "id": "usr_bola", "name": "Dr. Bola Ajayi", "email": "bola@aisec.health",
        "role": "FACILITY_MANAGER", "title": "Hospital Administrator",
        "phone": "+234 806 447 1190",
        "memberships": [{"facilityId": "fac_sunrise", "role": "FACILITY_MANAGER", "isPrimary": True}],
    },
    {
        "id": "usr_emeka", "name": "Emeka Nwosu", "email": "emeka@aisec.health",
        "role": "FACILITY_MANAGER", "title": "Superintendent Pharmacist",
        "phone": "+234 802 335 7742",
        "memberships": [{"facilityId": "fac_carepoint", "role": "FACILITY_MANAGER", "isPrimary": True}],
    },
    {
        "id": "usr_tunde", "name": "Tunde Bakare", "email": "tunde@aisec.health",
        "role": "SUPPLIER", "title": "Key Accounts Manager",
        "phone": "+234 802 444 9080",
        "memberships": [],
    },
]

# Scenario overrides expressed in *days of forecast cover*, not raw quantities.
# The pipeline converts these into units after forecasting so the demo story is
# internally consistent and survives model changes.
SCENARIO = {
    "hero": {
        "facilityId": "fac_phc",
        "medicineId": "med_act",
        "stockDays": 11.5,
        "batchExpiryDays": 240,
        "batchReceivedDaysAgo": 38,
    },
    "surplus": {
        "facilityId": "fac_gh",
        "medicineId": "med_act",
        "stockDays": 45.0,
        "surplusUnits": 840,
        "batchExpiryDays": 430,
        "batchReceivedDaysAgo": 60,
    },
    "transferUnits": 260,
    "incomingOrder": {
        "facilityId": "fac_phc",
        "medicineId": "med_act",
        "quantity": 200,
        "expectedInDays": 21,
        "supplierId": "sup_central",
    },
    "nearExpiry": [
        {"facilityId": "fac_carepoint", "medicineId": "med_ibuprofen", "units": 620, "expiryDays": 41},
        {"facilityId": "fac_gh", "medicineId": "med_ors", "units": 310, "expiryDays": 52},
    ],
    "overstock": [
        {"facilityId": "fac_gh", "medicineId": "med_folic", "units": 4200},
    ],
}

# Illustrative disease baselines (weekly cases, FCT). Not official NCDC figures.
DISEASE_BASE = {
    "MALARIA": 640,
    "CHOLERA": 14,
    "RESPIRATORY": 210,
    "MENINGITIS": 8,
    "LASSA_FEVER": 3,
}
