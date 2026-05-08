import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function supabaseAdmin() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder')
}

export type Medicine = {
  id: string
  brand_name: string
  salt_name: string
  manufacturer: string | null
  category: string | null
  form: string | null
  strength: string | null
  pack_size: string | null
  nppa_ceiling: number | null
  slug: string
  has_generic: boolean
  source: string
  source_file: string | null
  source_row_hash: string | null
  source_updated_at: string | null
}

export type Price = {
  id: string
  medicine_id: string
  pharmacy: '1mg' | 'pharmeasy' | 'apollo' | 'netmeds' | 'medplus'
  price: number | null
  price_per_unit: number | null
  url: string | null
  in_stock: boolean
  scraped_at: string
}

export type Generic = {
  id: string
  salt_name: string
  jan_aushadhi_name: string | null
  jan_aushadhi_mrp: number | null
  jan_aushadhi_code: string | null
  who_essential: boolean
}

export type Store = {
  id: string
  name: string
  address: string | null
  pincode: string
  city: string | null
  state: string | null
  lat: number | null
  lng: number | null
  phone: string | null
}

export type BrandAlias = {
  id: string
  brand_name: string
  salt_name: string
  manufacturer: string | null
  medicine_id: string | null
}
