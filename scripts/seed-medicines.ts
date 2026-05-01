/**
 * Seeds the database with ~70 common Indian medicines + their generic mappings.
 * Run with: npx tsx scripts/seed-medicines.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── MEDICINES ──────────────────────────────────────────────────────────────

const medicines = [
  // Analgesics / Antipyretics
  { brand_name: 'Dolo 650', salt_name: 'Paracetamol', strength: '650mg', form: 'Tablet', pack_size: '15 tablets', category: 'Analgesic', manufacturer: 'Micro Labs', nppa_ceiling: 30.35 },
  { brand_name: 'Crocin 500', salt_name: 'Paracetamol', strength: '500mg', form: 'Tablet', pack_size: '15 tablets', category: 'Analgesic', manufacturer: 'Haleon', nppa_ceiling: 16.62 },
  { brand_name: 'Crocin 650', salt_name: 'Paracetamol', strength: '650mg', form: 'Tablet', pack_size: '15 tablets', category: 'Analgesic', manufacturer: 'Haleon', nppa_ceiling: 30.35 },
  { brand_name: 'Combiflam', salt_name: 'Ibuprofen + Paracetamol', strength: '400mg + 325mg', form: 'Tablet', pack_size: '20 tablets', category: 'Analgesic', manufacturer: 'Sanofi', nppa_ceiling: 53.10 },
  { brand_name: 'Brufen 400', salt_name: 'Ibuprofen', strength: '400mg', form: 'Tablet', pack_size: '15 tablets', category: 'Analgesic', manufacturer: 'Abbott', nppa_ceiling: 18.50 },
  { brand_name: 'Voveran 50', salt_name: 'Diclofenac', strength: '50mg', form: 'Tablet', pack_size: '10 tablets', category: 'Analgesic', manufacturer: 'Novartis', nppa_ceiling: 15.00 },
  { brand_name: 'Disprin', salt_name: 'Aspirin', strength: '350mg', form: 'Tablet', pack_size: '10 tablets', category: 'Analgesic', manufacturer: 'Bayer', nppa_ceiling: 12.00 },

  // Antibiotics
  { brand_name: 'Azithral 500', salt_name: 'Azithromycin', strength: '500mg', form: 'Tablet', pack_size: '3 tablets', category: 'Antibiotic', manufacturer: 'Alembic', nppa_ceiling: 82.65 },
  { brand_name: 'Azithral 250', salt_name: 'Azithromycin', strength: '250mg', form: 'Tablet', pack_size: '6 tablets', category: 'Antibiotic', manufacturer: 'Alembic', nppa_ceiling: 75.30 },
  { brand_name: 'Augmentin 625', salt_name: 'Amoxicillin + Clavulanate', strength: '500mg + 125mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antibiotic', manufacturer: 'GlaxoSmithKline', nppa_ceiling: 214.00 },
  { brand_name: 'Mox 500', salt_name: 'Amoxicillin', strength: '500mg', form: 'Capsule', pack_size: '10 capsules', category: 'Antibiotic', manufacturer: 'Cipla', nppa_ceiling: 48.00 },
  { brand_name: 'Ciplox 500', salt_name: 'Ciprofloxacin', strength: '500mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antibiotic', manufacturer: 'Cipla', nppa_ceiling: 40.00 },
  { brand_name: 'Norflox 400', salt_name: 'Norfloxacin', strength: '400mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antibiotic', manufacturer: 'Cipla', nppa_ceiling: 31.00 },
  { brand_name: 'Flagyl 400', salt_name: 'Metronidazole', strength: '400mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antibiotic', manufacturer: 'Abbott', nppa_ceiling: 18.50 },
  { brand_name: 'Doxycycline 100', salt_name: 'Doxycycline', strength: '100mg', form: 'Capsule', pack_size: '10 capsules', category: 'Antibiotic', manufacturer: 'Various', nppa_ceiling: 35.00 },

  // Antacids / GI
  { brand_name: 'Pan 40', salt_name: 'Pantoprazole', strength: '40mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antacid', manufacturer: 'Alkem', nppa_ceiling: 70.45 },
  { brand_name: 'Omez 20', salt_name: 'Omeprazole', strength: '20mg', form: 'Capsule', pack_size: '15 capsules', category: 'Antacid', manufacturer: 'Dr Reddys', nppa_ceiling: 45.00 },
  { brand_name: 'Rantac 150', salt_name: 'Ranitidine', strength: '150mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antacid', manufacturer: 'JB Chemicals', nppa_ceiling: 22.00 },
  { brand_name: 'Nexium 40', salt_name: 'Esomeprazole', strength: '40mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antacid', manufacturer: 'AstraZeneca', nppa_ceiling: 145.00 },
  { brand_name: 'Cremaffin Plus', salt_name: 'Liquid Paraffin + Sodium Picosulfate', strength: 'Standard', form: 'Syrup', pack_size: '225ml', category: 'Laxative', manufacturer: 'Abbott', nppa_ceiling: 135.00 },

  // Diabetes
  { brand_name: 'Glycomet 500', salt_name: 'Metformin', strength: '500mg', form: 'Tablet', pack_size: '20 tablets', category: 'Antidiabetic', manufacturer: 'USV', nppa_ceiling: 28.00 },
  { brand_name: 'Glycomet 850', salt_name: 'Metformin', strength: '850mg', form: 'Tablet', pack_size: '20 tablets', category: 'Antidiabetic', manufacturer: 'USV', nppa_ceiling: 42.00 },
  { brand_name: 'Glucophage 500', salt_name: 'Metformin', strength: '500mg', form: 'Tablet', pack_size: '20 tablets', category: 'Antidiabetic', manufacturer: 'Merck', nppa_ceiling: 28.00 },
  { brand_name: 'Amaryl 1', salt_name: 'Glimepiride', strength: '1mg', form: 'Tablet', pack_size: '30 tablets', category: 'Antidiabetic', manufacturer: 'Sanofi', nppa_ceiling: 56.00 },
  { brand_name: 'Januvia 100', salt_name: 'Sitagliptin', strength: '100mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antidiabetic', manufacturer: 'MSD', nppa_ceiling: 1550.00 },
  { brand_name: 'Voglibose 0.2', salt_name: 'Voglibose', strength: '0.2mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antidiabetic', manufacturer: 'Various', nppa_ceiling: 35.00 },

  // Hypertension / Heart
  { brand_name: 'Amlokind 5', salt_name: 'Amlodipine', strength: '5mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antihypertensive', manufacturer: 'Mankind', nppa_ceiling: 18.00 },
  { brand_name: 'Norvasc 5', salt_name: 'Amlodipine', strength: '5mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antihypertensive', manufacturer: 'Pfizer', nppa_ceiling: 18.00 },
  { brand_name: 'Telma 40', salt_name: 'Telmisartan', strength: '40mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antihypertensive', manufacturer: 'Glenmark', nppa_ceiling: 75.00 },
  { brand_name: 'Repace 50', salt_name: 'Losartan', strength: '50mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antihypertensive', manufacturer: 'Sun Pharma', nppa_ceiling: 45.00 },
  { brand_name: 'Atenolol 50', salt_name: 'Atenolol', strength: '50mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antihypertensive', manufacturer: 'Various', nppa_ceiling: 15.00 },
  { brand_name: 'Ecosprin 75', salt_name: 'Aspirin', strength: '75mg', form: 'Tablet', pack_size: '14 tablets', category: 'Antiplatelet', manufacturer: 'USV', nppa_ceiling: 12.00 },
  { brand_name: 'Clopitab 75', salt_name: 'Clopidogrel', strength: '75mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antiplatelet', manufacturer: 'Sun Pharma', nppa_ceiling: 55.00 },

  // Thyroid
  { brand_name: 'Thyronorm 50', salt_name: 'Levothyroxine', strength: '50mcg', form: 'Tablet', pack_size: '120 tablets', category: 'Thyroid', manufacturer: 'Abbott', nppa_ceiling: 52.00 },
  { brand_name: 'Thyronorm 100', salt_name: 'Levothyroxine', strength: '100mcg', form: 'Tablet', pack_size: '120 tablets', category: 'Thyroid', manufacturer: 'Abbott', nppa_ceiling: 75.00 },
  { brand_name: 'Eltroxin 50', salt_name: 'Levothyroxine', strength: '50mcg', form: 'Tablet', pack_size: '100 tablets', category: 'Thyroid', manufacturer: 'Glaxo', nppa_ceiling: 52.00 },

  // Vitamins / Supplements
  { brand_name: 'Shelcal 500', salt_name: 'Calcium Carbonate + Vitamin D3', strength: '500mg + 250IU', form: 'Tablet', pack_size: '15 tablets', category: 'Supplement', manufacturer: 'Torrent', nppa_ceiling: 65.00 },
  { brand_name: 'Calcirol 60000', salt_name: 'Cholecalciferol', strength: '60000 IU', form: 'Capsule', pack_size: '4 capsules', category: 'Supplement', manufacturer: 'Cadila', nppa_ceiling: 75.00 },
  { brand_name: 'Neurobion Forte', salt_name: 'Vitamin B Complex', strength: 'Standard', form: 'Tablet', pack_size: '30 tablets', category: 'Supplement', manufacturer: 'Merck', nppa_ceiling: 40.00 },
  { brand_name: 'Becosules', salt_name: 'Vitamin B Complex + Vitamin C', strength: 'Standard', form: 'Capsule', pack_size: '20 capsules', category: 'Supplement', manufacturer: 'Pfizer', nppa_ceiling: 38.00 },
  { brand_name: 'Zincovit', salt_name: 'Zinc + Vitamins', strength: 'Standard', form: 'Tablet', pack_size: '15 tablets', category: 'Supplement', manufacturer: 'Apex', nppa_ceiling: 72.00 },

  // Allergy / Cold
  { brand_name: 'Allegra 120', salt_name: 'Fexofenadine', strength: '120mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antiallergic', manufacturer: 'Sanofi', nppa_ceiling: 89.00 },
  { brand_name: 'Zyrtec 10', salt_name: 'Cetirizine', strength: '10mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antiallergic', manufacturer: 'GSK', nppa_ceiling: 25.00 },
  { brand_name: 'Atarax 25', salt_name: 'Hydroxyzine', strength: '25mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antiallergic', manufacturer: 'UCB', nppa_ceiling: 35.00 },
  { brand_name: 'Montair LC', salt_name: 'Montelukast + Levocetirizine', strength: '10mg + 5mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antiallergic', manufacturer: 'Cipla', nppa_ceiling: 125.00 },
  { brand_name: 'Sinarest', salt_name: 'Paracetamol + Phenylephrine + Chlorpheniramine', strength: 'Standard', form: 'Tablet', pack_size: '10 tablets', category: 'Cold', manufacturer: 'Centaur', nppa_ceiling: 28.00 },

  // Cholesterol
  { brand_name: 'Rozavel 10', salt_name: 'Rosuvastatin', strength: '10mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antilipidemic', manufacturer: 'Sun Pharma', nppa_ceiling: 110.00 },
  { brand_name: 'Storvas 10', salt_name: 'Atorvastatin', strength: '10mg', form: 'Tablet', pack_size: '15 tablets', category: 'Antilipidemic', manufacturer: 'Sun Pharma', nppa_ceiling: 75.00 },
  { brand_name: 'Lipitor 20', salt_name: 'Atorvastatin', strength: '20mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antilipidemic', manufacturer: 'Pfizer', nppa_ceiling: 120.00 },

  // Respiratory
  { brand_name: 'Asthalin 100', salt_name: 'Salbutamol', strength: '100mcg', form: 'Inhaler', pack_size: '200 doses', category: 'Bronchodilator', manufacturer: 'Cipla', nppa_ceiling: 120.00 },
  { brand_name: 'Deriphyllin', salt_name: 'Etofylline + Theophylline', strength: '77mg + 23mg', form: 'Tablet', pack_size: '30 tablets', category: 'Bronchodilator', manufacturer: 'Franco-Indian', nppa_ceiling: 45.00 },
  { brand_name: 'Montek 10', salt_name: 'Montelukast', strength: '10mg', form: 'Tablet', pack_size: '10 tablets', category: 'Antiasthmatic', manufacturer: 'Sun Pharma', nppa_ceiling: 90.00 },

  // Antifungal
  { brand_name: 'Flucan 150', salt_name: 'Fluconazole', strength: '150mg', form: 'Capsule', pack_size: '1 capsule', category: 'Antifungal', manufacturer: 'Cipla', nppa_ceiling: 35.00 },
  { brand_name: 'Candid B', salt_name: 'Clotrimazole + Beclomethasone', strength: 'Standard', form: 'Cream', pack_size: '20g', category: 'Antifungal', manufacturer: 'Glenmark', nppa_ceiling: 85.00 },

  // Sleep / Anxiety
  { brand_name: 'Clonazepam 0.5', salt_name: 'Clonazepam', strength: '0.5mg', form: 'Tablet', pack_size: '15 tablets', category: 'Anxiolytic', manufacturer: 'Various', nppa_ceiling: 18.00 },
  { brand_name: 'Lonazep 0.5', salt_name: 'Clonazepam', strength: '0.5mg', form: 'Tablet', pack_size: '15 tablets', category: 'Anxiolytic', manufacturer: 'Sun Pharma', nppa_ceiling: 18.00 },

  // Iron / Anaemia
  { brand_name: 'Ferikind', salt_name: 'Ferrous Ascorbate + Folic Acid', strength: 'Standard', form: 'Tablet', pack_size: '30 tablets', category: 'Haematinic', manufacturer: 'Mankind', nppa_ceiling: 55.00 },
  { brand_name: 'Autrin', salt_name: 'Ferrous Fumarate + Folic Acid', strength: 'Standard', form: 'Capsule', pack_size: '30 capsules', category: 'Haematinic', manufacturer: 'Pfizer', nppa_ceiling: 65.00 },

  // Skin
  { brand_name: 'Betnovate N', salt_name: 'Betamethasone + Neomycin', strength: 'Standard', form: 'Cream', pack_size: '20g', category: 'Topical Steroid', manufacturer: 'GSK', nppa_ceiling: 55.00 },
  { brand_name: 'Soframycin', salt_name: 'Framycetin', strength: 'Standard', form: 'Cream', pack_size: '30g', category: 'Topical Antibiotic', manufacturer: 'Sanofi', nppa_ceiling: 65.00 },
  { brand_name: 'Fourderm', salt_name: 'Clobetasol + Miconazole + Neomycin', strength: 'Standard', form: 'Cream', pack_size: '15g', category: 'Topical Combination', manufacturer: 'Fulford', nppa_ceiling: 72.00 },
]

// ─── GENERICS (Jan Aushadhi prices) ─────────────────────────────────────────

const generics = [
  { salt_name: 'Paracetamol', jan_aushadhi_name: 'Paracetamol 500mg', jan_aushadhi_mrp: 2.00, who_essential: true },
  { salt_name: 'Ibuprofen', jan_aushadhi_name: 'Ibuprofen 400mg', jan_aushadhi_mrp: 5.50, who_essential: true },
  { salt_name: 'Ibuprofen + Paracetamol', jan_aushadhi_name: 'Ibuprofen+Paracetamol', jan_aushadhi_mrp: 8.00, who_essential: false },
  { salt_name: 'Diclofenac', jan_aushadhi_name: 'Diclofenac 50mg', jan_aushadhi_mrp: 4.50, who_essential: true },
  { salt_name: 'Aspirin', jan_aushadhi_name: 'Aspirin 75mg', jan_aushadhi_mrp: 2.50, who_essential: true },
  { salt_name: 'Azithromycin', jan_aushadhi_name: 'Azithromycin 500mg', jan_aushadhi_mrp: 18.00, who_essential: true },
  { salt_name: 'Amoxicillin', jan_aushadhi_name: 'Amoxicillin 500mg', jan_aushadhi_mrp: 12.00, who_essential: true },
  { salt_name: 'Ciprofloxacin', jan_aushadhi_name: 'Ciprofloxacin 500mg', jan_aushadhi_mrp: 10.00, who_essential: true },
  { salt_name: 'Metronidazole', jan_aushadhi_name: 'Metronidazole 400mg', jan_aushadhi_mrp: 3.50, who_essential: true },
  { salt_name: 'Doxycycline', jan_aushadhi_name: 'Doxycycline 100mg', jan_aushadhi_mrp: 6.00, who_essential: true },
  { salt_name: 'Pantoprazole', jan_aushadhi_name: 'Pantoprazole 40mg', jan_aushadhi_mrp: 5.00, who_essential: false },
  { salt_name: 'Omeprazole', jan_aushadhi_name: 'Omeprazole 20mg', jan_aushadhi_mrp: 3.50, who_essential: true },
  { salt_name: 'Ranitidine', jan_aushadhi_name: 'Ranitidine 150mg', jan_aushadhi_mrp: 3.00, who_essential: true },
  { salt_name: 'Metformin', jan_aushadhi_name: 'Metformin 500mg', jan_aushadhi_mrp: 3.00, who_essential: true },
  { salt_name: 'Glimepiride', jan_aushadhi_name: 'Glimepiride 1mg', jan_aushadhi_mrp: 6.00, who_essential: false },
  { salt_name: 'Amlodipine', jan_aushadhi_name: 'Amlodipine 5mg', jan_aushadhi_mrp: 2.50, who_essential: true },
  { salt_name: 'Telmisartan', jan_aushadhi_name: 'Telmisartan 40mg', jan_aushadhi_mrp: 7.00, who_essential: false },
  { salt_name: 'Losartan', jan_aushadhi_name: 'Losartan 50mg', jan_aushadhi_mrp: 6.00, who_essential: true },
  { salt_name: 'Atenolol', jan_aushadhi_name: 'Atenolol 50mg', jan_aushadhi_mrp: 2.00, who_essential: true },
  { salt_name: 'Clopidogrel', jan_aushadhi_name: 'Clopidogrel 75mg', jan_aushadhi_mrp: 8.00, who_essential: true },
  { salt_name: 'Levothyroxine', jan_aushadhi_name: 'Levothyroxine 50mcg', jan_aushadhi_mrp: 4.00, who_essential: true },
  { salt_name: 'Fexofenadine', jan_aushadhi_name: 'Fexofenadine 120mg', jan_aushadhi_mrp: 12.00, who_essential: false },
  { salt_name: 'Cetirizine', jan_aushadhi_name: 'Cetirizine 10mg', jan_aushadhi_mrp: 2.50, who_essential: false },
  { salt_name: 'Rosuvastatin', jan_aushadhi_name: 'Rosuvastatin 10mg', jan_aushadhi_mrp: 15.00, who_essential: false },
  { salt_name: 'Atorvastatin', jan_aushadhi_name: 'Atorvastatin 10mg', jan_aushadhi_mrp: 10.00, who_essential: false },
  { salt_name: 'Salbutamol', jan_aushadhi_name: 'Salbutamol Inhaler 100mcg', jan_aushadhi_mrp: 55.00, who_essential: true },
  { salt_name: 'Montelukast', jan_aushadhi_name: 'Montelukast 10mg', jan_aushadhi_mrp: 8.00, who_essential: false },
  { salt_name: 'Fluconazole', jan_aushadhi_name: 'Fluconazole 150mg', jan_aushadhi_mrp: 8.00, who_essential: true },
  { salt_name: 'Clonazepam', jan_aushadhi_name: 'Clonazepam 0.5mg', jan_aushadhi_mrp: 4.00, who_essential: true },
  { salt_name: 'Cholecalciferol', jan_aushadhi_name: 'Vitamin D3 60000 IU', jan_aushadhi_mrp: 18.00, who_essential: false },
]

// ─── RUN ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding medicines...')

  const medicineRows = medicines.map(m => ({
    ...m,
    slug: slug(m.brand_name),
    has_generic: generics.some(g => g.salt_name === m.salt_name),
  }))

  const { error: mErr } = await supabase
    .from('medicines')
    .upsert(medicineRows, { onConflict: 'slug' })

  if (mErr) {
    console.error('Medicine insert error:', mErr.message)
    process.exit(1)
  }
  console.log(`✓ Inserted ${medicineRows.length} medicines`)

  console.log('Seeding generics...')
  const { error: gErr } = await supabase
    .from('generics')
    .upsert(generics, { onConflict: 'salt_name' })

  if (gErr) {
    console.error('Generic insert error:', gErr.message)
    process.exit(1)
  }
  console.log(`✓ Inserted ${generics.length} generic mappings`)

  console.log('\nDone! Search for "Dolo", "Metformin", or "Thyronorm" to test.')
}

seed()
