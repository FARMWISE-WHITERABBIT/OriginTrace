// Auto-generated Supabase types. DO NOT EDIT BY HAND.
// Regenerate with: npm run gen:types
// Source project ref: gnvcvvsnnesieugnzmrz
// This file is the single source of truth for DB column names — a wrong
// column now fails `npm run check` instead of a production 500.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_sync_status: {
        Row: {
          agent_id: string
          device_info: Json | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          org_id: string
          pending_bags: number | null
          pending_batches: number | null
        }
        Insert: {
          agent_id: string
          device_info?: Json | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          org_id: string
          pending_bags?: number | null
          pending_batches?: number | null
        }
        Update: {
          agent_id?: string
          device_info?: Json | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          org_id?: string
          pending_bags?: number | null
          pending_batches?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_sync_status_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_sync_status_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          org_id: string
          rate_limit_per_hour: number | null
          scopes: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          org_id: string
          rate_limit_per_hour?: number | null
          scopes?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          org_id?: string
          rate_limit_per_hour?: number | null
          scopes?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          key_prefix: string
          request_count: number
          window_end: string
          window_start: string
        }
        Insert: {
          key_prefix: string
          request_count?: number
          window_end: string
          window_start?: string
        }
        Update: {
          key_prefix?: string
          request_count?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          org_id: string | null
          resource_id: string | null
          resource_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          org_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bags: {
        Row: {
          batch_id: string | null
          collection_batch_id: string | null
          created_at: string | null
          grade: string | null
          id: string
          is_compliant: boolean | null
          org_id: string
          serial: string
          status: string | null
          weight_kg: number | null
        }
        Insert: {
          batch_id?: string | null
          collection_batch_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          is_compliant?: boolean | null
          org_id: string
          serial: string
          status?: string | null
          weight_kg?: number | null
        }
        Update: {
          batch_id?: string | null
          collection_batch_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          is_compliant?: boolean | null
          org_id?: string
          serial?: string
          status?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bags_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bags_collection_batch"
            columns: ["collection_batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_contributions: {
        Row: {
          bag_count: number | null
          batch_id: string
          compliance_status: string | null
          created_at: string | null
          farm_id: string
          farmer_name: string | null
          id: string
          notes: string | null
          weight_kg: number | null
        }
        Insert: {
          bag_count?: number | null
          batch_id: string
          compliance_status?: string | null
          created_at?: string | null
          farm_id: string
          farmer_name?: string | null
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Update: {
          bag_count?: number | null
          batch_id?: string
          compliance_status?: string | null
          created_at?: string | null
          farm_id?: string
          farmer_name?: string | null
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_contributions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_contributions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_organizations: {
        Row: {
          contact_email: string | null
          country: string | null
          created_at: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
        }
        Insert: {
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
        }
        Update: {
          contact_email?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
        }
        Relationships: []
      }
      buyer_profiles: {
        Row: {
          buyer_org_id: string
          created_at: string | null
          full_name: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          buyer_org_id: string
          created_at?: string | null
          full_name: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          buyer_org_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_profiles_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "buyer_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_chain_logs: {
        Row: {
          alert_reason: string | null
          humidity_percent: number | null
          id: string
          is_alert: boolean | null
          location: string | null
          org_id: string
          recorded_at: string
          shipment_id: string
          temperature_celsius: number | null
        }
        Insert: {
          alert_reason?: string | null
          humidity_percent?: number | null
          id?: string
          is_alert?: boolean | null
          location?: string | null
          org_id: string
          recorded_at?: string
          shipment_id: string
          temperature_celsius?: number | null
        }
        Update: {
          alert_reason?: string | null
          humidity_percent?: number | null
          id?: string
          is_alert?: boolean | null
          location?: string | null
          org_id?: string
          recorded_at?: string
          shipment_id?: string
          temperature_celsius?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cold_chain_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cold_chain_logs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_batches: {
        Row: {
          agent_id: string
          bag_count: number | null
          batch_code: string | null
          collected_at: string | null
          commodity: string | null
          community: string | null
          completed_at: string | null
          compliance_status: string
          created_at: string | null
          dispatch_destination: string | null
          dispatch_recorded_at: string | null
          dispatched: boolean
          dispatched_at: string | null
          dispatched_by: string | null
          driver_name: string | null
          driver_phone: string | null
          expected_arrival_at: string | null
          farm_id: string
          grade: string | null
          has_gps: boolean
          id: string
          lga: string | null
          local_id: string | null
          notes: string | null
          org_id: string
          state: string | null
          status: string | null
          synced_at: string | null
          total_weight: number | null
          vehicle_reference: string | null
          yield_flag_reason: string | null
          yield_validated: boolean
        }
        Insert: {
          agent_id: string
          bag_count?: number | null
          batch_code?: string | null
          collected_at?: string | null
          commodity?: string | null
          community?: string | null
          completed_at?: string | null
          compliance_status?: string
          created_at?: string | null
          dispatch_destination?: string | null
          dispatch_recorded_at?: string | null
          dispatched?: boolean
          dispatched_at?: string | null
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          expected_arrival_at?: string | null
          farm_id: string
          grade?: string | null
          has_gps?: boolean
          id?: string
          lga?: string | null
          local_id?: string | null
          notes?: string | null
          org_id: string
          state?: string | null
          status?: string | null
          synced_at?: string | null
          total_weight?: number | null
          vehicle_reference?: string | null
          yield_flag_reason?: string | null
          yield_validated?: boolean
        }
        Update: {
          agent_id?: string
          bag_count?: number | null
          batch_code?: string | null
          collected_at?: string | null
          commodity?: string | null
          community?: string | null
          completed_at?: string | null
          compliance_status?: string
          created_at?: string | null
          dispatch_destination?: string | null
          dispatch_recorded_at?: string | null
          dispatched?: boolean
          dispatched_at?: string | null
          dispatched_by?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          expected_arrival_at?: string | null
          farm_id?: string
          grade?: string | null
          has_gps?: boolean
          id?: string
          lga?: string | null
          local_id?: string | null
          notes?: string | null
          org_id?: string
          state?: string | null
          status?: string | null
          synced_at?: string | null
          total_weight?: number | null
          vehicle_reference?: string | null
          yield_flag_reason?: string | null
          yield_validated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "collection_batches_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_batches_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_batches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          agent_id: string
          bag_id: string
          collected_at: string | null
          created_at: string | null
          farm_id: string
          grade: string | null
          id: string
          notes: string | null
          org_id: string
          synced_at: string | null
          weight: number
        }
        Insert: {
          agent_id: string
          bag_id: string
          collected_at?: string | null
          created_at?: string | null
          farm_id: string
          grade?: string | null
          id?: string
          notes?: string | null
          org_id: string
          synced_at?: string | null
          weight: number
        }
        Update: {
          agent_id?: string
          bag_id?: string
          collected_at?: string | null
          created_at?: string | null
          farm_id?: string
          grade?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          synced_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "collections_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: false
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commodity_master: {
        Row: {
          category: string
          code: string
          collection_metrics: Json | null
          created_at: string | null
          created_by_org_id: string | null
          grades: string[] | null
          id: number
          is_active: boolean
          is_global: boolean
          moisture_max: number | null
          moisture_min: number | null
          name: string
          org_id: string | null
          unit: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          code: string
          collection_metrics?: Json | null
          created_at?: string | null
          created_by_org_id?: string | null
          grades?: string[] | null
          id?: number
          is_active?: boolean
          is_global?: boolean
          moisture_max?: number | null
          moisture_min?: number | null
          name: string
          org_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          collection_metrics?: Json | null
          created_at?: string | null
          created_by_org_id?: string | null
          grades?: string[] | null
          id?: number
          is_active?: boolean
          is_global?: boolean
          moisture_max?: number | null
          moisture_min?: number | null
          name?: string
          org_id?: string | null
          unit?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commodity_master_created_by_org_id_fkey"
            columns: ["created_by_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commodity_master_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_files: {
        Row: {
          created_at: string | null
          farm_id: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          org_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          farm_id?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          org_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          farm_id?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          org_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_files_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_files_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_profiles: {
        Row: {
          buyer_org_id: string | null
          created_at: string | null
          custom_rules: Json | null
          destination_market: string
          geo_verification_level: string | null
          id: string
          is_default: boolean | null
          min_traceability_depth: number | null
          name: string
          org_id: string
          regulation_framework: string
          required_certifications: Json | null
          required_documents: Json | null
          updated_at: string | null
        }
        Insert: {
          buyer_org_id?: string | null
          created_at?: string | null
          custom_rules?: Json | null
          destination_market: string
          geo_verification_level?: string | null
          id?: string
          is_default?: boolean | null
          min_traceability_depth?: number | null
          name: string
          org_id: string
          regulation_framework: string
          required_certifications?: Json | null
          required_documents?: Json | null
          updated_at?: string | null
        }
        Update: {
          buyer_org_id?: string | null
          created_at?: string | null
          custom_rules?: Json | null
          destination_market?: string
          geo_verification_level?: string | null
          id?: string
          is_default?: boolean | null
          min_traceability_depth?: number | null
          name?: string
          org_id?: string
          regulation_framework?: string
          required_certifications?: Json | null
          required_documents?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_profiles_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "buyer_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_rulesets: {
        Row: {
          created_at: string
          description: string | null
          docs: Json
          id: string
          market_id: string
          market_name: string
          short_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          docs?: Json
          id?: string
          market_id: string
          market_name: string
          short_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          docs?: Json
          id?: string
          market_id?: string
          market_name?: string
          short_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      container_stuffing_records: {
        Row: {
          bag_count: number
          batch_id: string | null
          created_at: string | null
          gross_weight_kg: number
          id: string
          item_description: string
          lot_number: string | null
          net_weight_kg: number | null
          org_id: string
          recorded_by: string | null
          remarks: string | null
          shipment_id: string
          tare_weight_kg: number | null
          updated_at: string | null
        }
        Insert: {
          bag_count?: number
          batch_id?: string | null
          created_at?: string | null
          gross_weight_kg?: number
          id?: string
          item_description: string
          lot_number?: string | null
          net_weight_kg?: number | null
          org_id: string
          recorded_by?: string | null
          remarks?: string | null
          shipment_id: string
          tare_weight_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          bag_count?: number
          batch_id?: string | null
          created_at?: string | null
          gross_weight_kg?: number
          id?: string
          item_description?: string
          lot_number?: string | null
          net_weight_kg?: number | null
          org_id?: string
          recorded_by?: string | null
          remarks?: string | null
          shipment_id?: string
          tare_weight_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_stuffing_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_stuffing_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_stuffing_records_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_shipments: {
        Row: {
          contract_id: string
          created_at: string | null
          id: string
          shipment_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string | null
          id?: string
          shipment_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string | null
          id?: string
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_shipments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          buyer_org_id: string
          commodity: string
          compliance_profile_id: string | null
          contract_reference: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_deadline: string | null
          destination_port: string | null
          exporter_org_id: string
          id: string
          notes: string | null
          price_per_unit: number | null
          quality_requirements: Json | null
          quantity_mt: number | null
          required_certifications: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_org_id: string
          commodity: string
          compliance_profile_id?: string | null
          contract_reference: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_deadline?: string | null
          destination_port?: string | null
          exporter_org_id: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          quality_requirements?: Json | null
          quantity_mt?: number | null
          required_certifications?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_org_id?: string
          commodity?: string
          compliance_profile_id?: string | null
          contract_reference?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_deadline?: string | null
          destination_port?: string | null
          exporter_org_id?: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          quality_requirements?: Json | null
          quantity_mt?: number | null
          required_certifications?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "buyer_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_exporter_org_id_fkey"
            columns: ["exporter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dds_exports: {
        Row: {
          created_at: string | null
          created_by: string | null
          export_date: string | null
          geojson: Json
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          export_date?: string | null
          geojson: Json
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          export_date?: string | null
          geojson?: Json
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dds_exports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delegation_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          delegation_id: string
          details: Json | null
          id: string
          org_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          delegation_id: string
          details?: Json | null
          id?: string
          org_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          delegation_id?: string
          details?: Json | null
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegation_audit_log_delegation_id_fkey"
            columns: ["delegation_id"]
            isOneToOne: false
            referencedRelation: "delegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delegation_audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delegations: {
        Row: {
          created_at: string | null
          delegated_by: string
          delegated_to: string
          expires_at: string
          id: string
          is_active: boolean | null
          org_id: string
          permission: string
          region_scope: Json | null
        }
        Insert: {
          created_at?: string | null
          delegated_by: string
          delegated_to: string
          expires_at: string
          id?: string
          is_active?: boolean | null
          org_id: string
          permission: string
          region_scope?: Json | null
        }
        Update: {
          created_at?: string | null
          delegated_by?: string
          delegated_to?: string
          expires_at?: string
          id?: string
          is_active?: boolean | null
          org_id?: string
          permission?: string
          region_scope?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "delegations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_passports: {
        Row: {
          carbon_footprint_kg: number | null
          certifications: Json | null
          chain_of_custody: Json | null
          created_at: string | null
          created_by: string | null
          dpp_code: string
          finished_good_id: string
          id: string
          issued_at: string | null
          machine_readable_data: Json | null
          org_id: string
          origin_country: string | null
          passport_version: number | null
          processing_history: Json | null
          product_category: string
          qr_code_url: string | null
          regulatory_compliance: Json | null
          status: string | null
          sustainability_claims: Json | null
          updated_at: string | null
          valid_until: string | null
          verify_url: string | null
        }
        Insert: {
          carbon_footprint_kg?: number | null
          certifications?: Json | null
          chain_of_custody?: Json | null
          created_at?: string | null
          created_by?: string | null
          dpp_code: string
          finished_good_id: string
          id?: string
          issued_at?: string | null
          machine_readable_data?: Json | null
          org_id: string
          origin_country?: string | null
          passport_version?: number | null
          processing_history?: Json | null
          product_category: string
          qr_code_url?: string | null
          regulatory_compliance?: Json | null
          status?: string | null
          sustainability_claims?: Json | null
          updated_at?: string | null
          valid_until?: string | null
          verify_url?: string | null
        }
        Update: {
          carbon_footprint_kg?: number | null
          certifications?: Json | null
          chain_of_custody?: Json | null
          created_at?: string | null
          created_by?: string | null
          dpp_code?: string
          finished_good_id?: string
          id?: string
          issued_at?: string | null
          machine_readable_data?: Json | null
          org_id?: string
          origin_country?: string | null
          passport_version?: number | null
          processing_history?: Json | null
          product_category?: string
          qr_code_url?: string | null
          regulatory_compliance?: Json | null
          status?: string | null
          sustainability_claims?: Json | null
          updated_at?: string | null
          valid_until?: string | null
          verify_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_passports_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_passports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursement_calculations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          batch_id: string
          community: string | null
          created_at: string | null
          currency: string
          deductions: number
          farm_id: string
          farmer_name: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          org_id: string
          payment_id: string | null
          price_per_kg: number
          status: string
          updated_at: string | null
          weight_kg: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id: string
          community?: string | null
          created_at?: string | null
          currency?: string
          deductions?: number
          farm_id: string
          farmer_name: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          org_id: string
          payment_id?: string | null
          price_per_kg?: number
          status?: string
          updated_at?: string | null
          weight_kg: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          batch_id?: string
          community?: string | null
          created_at?: string | null
          currency?: string
          deductions?: number
          farm_id?: string
          farmer_name?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          org_id?: string
          payment_id?: string | null
          price_per_kg?: number
          status?: string
          updated_at?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "disbursement_calculations_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_calculations_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_calculations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursement_calculations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          document_id: string
          id: string
          org_id: string
          triggered_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          document_id: string
          id?: string
          org_id: string
          triggered_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          document_id?: string
          id?: string
          org_id?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_alerts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          document_type: string
          expiry_date: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          issued_date: string | null
          linked_entity_id: string | null
          linked_entity_type: string | null
          notes: string | null
          org_id: string
          status: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          notes?: string | null
          org_id: string
          status?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          expiry_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          notes?: string | null
          org_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_accounts: {
        Row: {
          buyer_org_id: string | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          held_amount: number
          id: string
          milestone_config: Json | null
          org_id: string
          released_amount: number
          shipment_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_org_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          held_amount?: number
          id?: string
          milestone_config?: Json | null
          org_id: string
          released_amount?: number
          shipment_id?: string | null
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_org_id?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          held_amount?: number
          id?: string
          milestone_config?: Json | null
          org_id?: string
          released_amount?: number
          shipment_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_accounts_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_accounts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_accounts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_disputes: {
        Row: {
          buyer_confirmed: boolean
          created_at: string
          escrow_id: string
          exporter_confirmed: boolean
          id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          buyer_confirmed?: boolean
          created_at?: string
          escrow_id: string
          exporter_confirmed?: boolean
          id?: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_confirmed?: boolean
          created_at?: string
          escrow_id?: string
          exporter_confirmed?: boolean
          id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_disputes_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_transactions: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          currency: string
          escrow_id: string
          id: string
          milestone_id: string | null
          payment_id: string | null
          reason: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          currency: string
          escrow_id: string
          id?: string
          milestone_id?: string | null
          payment_id?: string | null
          reason?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          escrow_id?: string
          id?: string
          milestone_id?: string | null
          payment_id?: string | null
          reason?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          currently_exporting: boolean | null
          email: string
          event_slug: string
          export_products: string | null
          full_name: string
          id: string
          nepc_registered: boolean | null
          organization: string
          phone: string
          registered_at: string
          role: string
          state: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          currently_exporting?: boolean | null
          email: string
          event_slug?: string
          export_products?: string | null
          full_name: string
          id?: string
          nepc_registered?: boolean | null
          organization: string
          phone: string
          registered_at?: string
          role: string
          state: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          currently_exporting?: boolean | null
          email?: string
          event_slug?: string
          export_products?: string | null
          full_name?: string
          id?: string
          nepc_registered?: boolean | null
          organization?: string
          phone?: string
          registered_at?: string
          role?: string
          state?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          image_url: string | null
          is_free: boolean
          location: string
          location_address: string | null
          partner: string | null
          registration_closes_at: string | null
          registration_open: boolean
          reminder_sent_day_before: boolean
          reminder_sent_day_of: boolean
          short_title: string | null
          slug: string
          start_time: string
          tags: string[] | null
          theme: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          location: string
          location_address?: string | null
          partner?: string | null
          registration_closes_at?: string | null
          registration_open?: boolean
          reminder_sent_day_before?: boolean
          reminder_sent_day_of?: boolean
          short_title?: string | null
          slug: string
          start_time?: string
          tags?: string[] | null
          theme?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          location?: string
          location_address?: string | null
          partner?: string | null
          registration_closes_at?: string | null
          registration_open?: boolean
          reminder_sent_day_before?: boolean
          reminder_sent_day_of?: boolean
          short_title?: string | null
          slug?: string
          start_time?: string
          tags?: string[] | null
          theme?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      evidence_packages: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          org_id: string
          shipment_id: string
          token: string
          views: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          org_id: string
          shipment_id: string
          token: string
          views?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          org_id?: string
          shipment_id?: string
          token?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "evidence_packages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_packages_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_certifications: {
        Row: {
          certificate_number: string | null
          certification_body: string
          created_at: string | null
          expiry_date: string | null
          farm_id: string
          id: string
          issued_date: string | null
          org_id: string
          status: string | null
          verification_url: string | null
          verified_by: string | null
        }
        Insert: {
          certificate_number?: string | null
          certification_body: string
          created_at?: string | null
          expiry_date?: string | null
          farm_id: string
          id?: string
          issued_date?: string | null
          org_id: string
          status?: string | null
          verification_url?: string | null
          verified_by?: string | null
        }
        Update: {
          certificate_number?: string | null
          certification_body?: string
          created_at?: string | null
          expiry_date?: string | null
          farm_id?: string
          id?: string
          issued_date?: string | null
          org_id?: string
          status?: string | null
          verification_url?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farm_certifications_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_certifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_conflicts: {
        Row: {
          created_at: string
          farm_a_id: string
          farm_b_id: string
          id: number
          org_id: string
          overlap_ratio: number | null
          resolution_action: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_a_id: string
          farm_b_id: string
          id?: number
          org_id: string
          overlap_ratio?: number | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_a_id?: string
          farm_b_id?: string
          id?: number
          org_id?: string
          overlap_ratio?: number | null
          resolution_action?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_conflicts_farm_a_id_fkey"
            columns: ["farm_a_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_conflicts_farm_b_id_fkey"
            columns: ["farm_b_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farm_conflicts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_accounts: {
        Row: {
          created_at: string | null
          created_by: string | null
          farm_id: string | null
          farmer_code: string | null
          id: string
          invite_token: string | null
          org_id: string
          phone: string
          pin_hash: string | null
          preferred_locale: string | null
          status: string | null
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          farm_id?: string | null
          farmer_code?: string | null
          id?: string
          invite_token?: string | null
          org_id: string
          phone: string
          pin_hash?: string | null
          preferred_locale?: string | null
          status?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          farm_id?: string | null
          farmer_code?: string | null
          id?: string
          invite_token?: string | null
          org_id?: string
          phone?: string
          pin_hash?: string | null
          preferred_locale?: string | null
          status?: string | null
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_accounts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at: string
          created_by: string | null
          farm_id: string | null
          farmer_name: string
          id: string
          is_verified: boolean
          org_id: string
          paystack_recipient_code: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code: string
          bank_name: string
          created_at?: string
          created_by?: string | null
          farm_id?: string | null
          farmer_name: string
          id?: string
          is_verified?: boolean
          org_id: string
          paystack_recipient_code?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string
          bank_name?: string
          created_at?: string
          created_by?: string | null
          farm_id?: string | null
          farmer_name?: string
          id?: string
          is_verified?: boolean
          org_id?: string
          paystack_recipient_code?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_bank_accounts_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_bank_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_deliveries: {
        Row: {
          batch_id: string | null
          commodity: string | null
          created_at: string | null
          delivered_at: string | null
          farm_id: string | null
          farmer_account_id: string | null
          grade: string | null
          id: string
          notes: string | null
          org_id: string
          status: string | null
          weight_kg: number | null
        }
        Insert: {
          batch_id?: string | null
          commodity?: string | null
          created_at?: string | null
          delivered_at?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          org_id: string
          status?: string | null
          weight_kg?: number | null
        }
        Update: {
          batch_id?: string | null
          commodity?: string | null
          created_at?: string | null
          delivered_at?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          grade?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          status?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_deliveries_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_deliveries_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_deliveries_farmer_account_id_fkey"
            columns: ["farmer_account_id"]
            isOneToOne: false
            referencedRelation: "farmer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_deliveries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_inputs: {
        Row: {
          application_date: string | null
          area_applied_hectares: number | null
          created_at: string | null
          farm_id: string
          id: string
          input_type: string
          notes: string | null
          org_id: string
          product_name: string | null
          quantity: number | null
          recorded_by: string | null
          unit: string | null
        }
        Insert: {
          application_date?: string | null
          area_applied_hectares?: number | null
          created_at?: string | null
          farm_id: string
          id?: string
          input_type: string
          notes?: string | null
          org_id: string
          product_name?: string | null
          quantity?: number | null
          recorded_by?: string | null
          unit?: string | null
        }
        Update: {
          application_date?: string | null
          area_applied_hectares?: number | null
          created_at?: string | null
          farm_id?: string
          id?: string
          input_type?: string
          notes?: string | null
          org_id?: string
          product_name?: string | null
          quantity?: number | null
          recorded_by?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_inputs_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_inputs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          farm_id: string | null
          farmer_account_id: string | null
          id: string
          notes: string | null
          org_id: string
          payment_date: string | null
          payment_method: string | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          payment_date?: string | null
          payment_method?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_payments_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_payments_farmer_account_id_fkey"
            columns: ["farmer_account_id"]
            isOneToOne: false
            referencedRelation: "farmer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_performance_ledger: {
        Row: {
          area_hectares: number | null
          avg_grade_score: number | null
          avg_quality_score: number | null
          commodity: string | null
          community: string | null
          compliance_status: string | null
          consent_collected: boolean | null
          created_at: string
          current_season: string | null
          deforestation_free: boolean | null
          farm_id: string
          farmer_name: string
          gps_recorded: boolean | null
          grade_a_percentage: number | null
          grade_b_percentage: number | null
          grade_c_percentage: number | null
          has_consent: boolean | null
          id: string
          last_delivery_date: string | null
          org_id: string
          payment_reliability: number | null
          state: string | null
          total_bag_count: number | null
          total_batch_count: number | null
          total_batches: number | null
          total_delivery_kg: number | null
          total_payments_ngn: number | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          avg_grade_score?: number | null
          avg_quality_score?: number | null
          commodity?: string | null
          community?: string | null
          compliance_status?: string | null
          consent_collected?: boolean | null
          created_at?: string
          current_season?: string | null
          deforestation_free?: boolean | null
          farm_id: string
          farmer_name: string
          gps_recorded?: boolean | null
          grade_a_percentage?: number | null
          grade_b_percentage?: number | null
          grade_c_percentage?: number | null
          has_consent?: boolean | null
          id?: string
          last_delivery_date?: string | null
          org_id: string
          payment_reliability?: number | null
          state?: string | null
          total_bag_count?: number | null
          total_batch_count?: number | null
          total_batches?: number | null
          total_delivery_kg?: number | null
          total_payments_ngn?: number | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          avg_grade_score?: number | null
          avg_quality_score?: number | null
          commodity?: string | null
          community?: string | null
          compliance_status?: string | null
          consent_collected?: boolean | null
          created_at?: string
          current_season?: string | null
          deforestation_free?: boolean | null
          farm_id?: string
          farmer_name?: string
          gps_recorded?: boolean | null
          grade_a_percentage?: number | null
          grade_b_percentage?: number | null
          grade_c_percentage?: number | null
          has_consent?: boolean | null
          id?: string
          last_delivery_date?: string | null
          org_id?: string
          payment_reliability?: number | null
          state?: string | null
          total_bag_count?: number | null
          total_batch_count?: number | null
          total_batches?: number | null
          total_delivery_kg?: number | null
          total_payments_ngn?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_performance_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_performance_ledger_table: {
        Row: {
          avg_grade: string | null
          compliance_score: number | null
          created_at: string | null
          credit_score: number | null
          farm_id: string
          id: string
          notes: string | null
          org_id: string
          payment_reliability: number | null
          quality_consistency: number | null
          season: string
          total_collections: number | null
          total_weight_kg: number | null
          updated_at: string | null
          yield_per_hectare: number | null
        }
        Insert: {
          avg_grade?: string | null
          compliance_score?: number | null
          created_at?: string | null
          credit_score?: number | null
          farm_id: string
          id?: string
          notes?: string | null
          org_id: string
          payment_reliability?: number | null
          quality_consistency?: number | null
          season: string
          total_collections?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          yield_per_hectare?: number | null
        }
        Update: {
          avg_grade?: string | null
          compliance_score?: number | null
          created_at?: string | null
          credit_score?: number | null
          farm_id?: string
          id?: string
          notes?: string | null
          org_id?: string
          payment_reliability?: number | null
          quality_consistency?: number | null
          season?: string
          total_collections?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          yield_per_hectare?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_performance_ledger_table_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_performance_ledger_table_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_price_agreements: {
        Row: {
          commodity: string
          created_at: string | null
          created_by: string | null
          currency: string
          effective_from: string
          effective_to: string | null
          farm_id: string | null
          id: string
          notes: string | null
          org_id: string
          price_per_kg: number
        }
        Insert: {
          commodity: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          org_id: string
          price_per_kg: number
        }
        Update: {
          commodity?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string
          effective_from?: string
          effective_to?: string | null
          farm_id?: string | null
          id?: string
          notes?: string | null
          org_id?: string
          price_per_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "farmer_price_agreements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_price_agreements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_training: {
        Row: {
          assigned_by: string | null
          certificate_url: string | null
          completed_at: string | null
          created_at: string | null
          farm_id: string | null
          farmer_account_id: string | null
          id: string
          module_name: string
          module_type: string
          org_id: string
          score: number | null
          status: string | null
        }
        Insert: {
          assigned_by?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          id?: string
          module_name: string
          module_type: string
          org_id: string
          score?: number | null
          status?: string | null
        }
        Update: {
          assigned_by?: string | null
          certificate_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          farm_id?: string | null
          farmer_account_id?: string | null
          id?: string
          module_name?: string
          module_type?: string
          org_id?: string
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmer_training_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_training_farmer_account_id_fkey"
            columns: ["farmer_account_id"]
            isOneToOne: false
            referencedRelation: "farmer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_training_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          area_hectares: number | null
          boundary: Json | null
          boundary_analysis: Json | null
          boundary_geo: unknown
          commodity: string | null
          community: string
          compliance_notes: string | null
          compliance_status: string | null
          conflict_status: string | null
          consent_photo_url: string | null
          consent_signature: string | null
          consent_timestamp: string | null
          created_at: string | null
          created_by: string | null
          deforestation_check: Json | null
          farmer_id: string | null
          farmer_name: string
          id: string
          legality_doc_url: string | null
          lga_id: string | null
          org_id: string
          phone: string | null
          state_id: string | null
          updated_at: string | null
          village_id: string | null
        }
        Insert: {
          area_hectares?: number | null
          boundary?: Json | null
          boundary_analysis?: Json | null
          boundary_geo?: unknown
          commodity?: string | null
          community: string
          compliance_notes?: string | null
          compliance_status?: string | null
          conflict_status?: string | null
          consent_photo_url?: string | null
          consent_signature?: string | null
          consent_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          deforestation_check?: Json | null
          farmer_id?: string | null
          farmer_name: string
          id?: string
          legality_doc_url?: string | null
          lga_id?: string | null
          org_id: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string | null
          village_id?: string | null
        }
        Update: {
          area_hectares?: number | null
          boundary?: Json | null
          boundary_analysis?: Json | null
          boundary_geo?: unknown
          commodity?: string | null
          community?: string
          compliance_notes?: string | null
          compliance_status?: string | null
          conflict_status?: string | null
          consent_photo_url?: string | null
          consent_signature?: string | null
          consent_timestamp?: string | null
          created_at?: string | null
          created_by?: string | null
          deforestation_check?: Json | null
          farmer_id?: string | null
          farmer_name?: string
          id?: string
          legality_doc_url?: string | null
          lga_id?: string | null
          org_id?: string
          phone?: string | null
          state_id?: string | null
          updated_at?: string | null
          village_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farms_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farms_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_goods: {
        Row: {
          batch_number: string | null
          buyer_company: string | null
          buyer_name: string | null
          certificate_url: string | null
          created_at: string | null
          created_by: string | null
          dds_reference: string | null
          dds_submitted: boolean | null
          dds_submitted_at: string | null
          destination_country: string | null
          expiry_date: string | null
          id: string
          lot_number: string | null
          mass_balance_valid: boolean
          org_id: string
          pedigree_code: string
          pedigree_verified: boolean | null
          processing_run_id: string
          product_name: string
          product_type: string
          production_date: string
          qr_code_url: string | null
          updated_at: string | null
          verification_notes: string | null
          weight_kg: number
        }
        Insert: {
          batch_number?: string | null
          buyer_company?: string | null
          buyer_name?: string | null
          certificate_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dds_reference?: string | null
          dds_submitted?: boolean | null
          dds_submitted_at?: string | null
          destination_country?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          mass_balance_valid?: boolean
          org_id: string
          pedigree_code: string
          pedigree_verified?: boolean | null
          processing_run_id: string
          product_name: string
          product_type: string
          production_date: string
          qr_code_url?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          weight_kg: number
        }
        Update: {
          batch_number?: string | null
          buyer_company?: string | null
          buyer_name?: string | null
          certificate_url?: string | null
          created_at?: string | null
          created_by?: string | null
          dds_reference?: string | null
          dds_submitted?: boolean | null
          dds_submitted_at?: string | null
          destination_country?: string | null
          expiry_date?: string | null
          id?: string
          lot_number?: string | null
          mass_balance_valid?: boolean
          org_id?: string
          pedigree_code?: string
          pedigree_verified?: boolean | null
          processing_run_id?: string
          product_name?: string
          product_type?: string
          production_date?: string
          qr_code_url?: string | null
          updated_at?: string | null
          verification_notes?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "finished_goods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_goods_processing_run_id_fkey"
            columns: ["processing_run_id"]
            isOneToOne: false
            referencedRelation: "processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          batch_id: string | null
          certificate_expiry_date: string | null
          certificate_number: string | null
          certificate_validity_days: number | null
          commodity: string | null
          created_at: string
          document_id: string | null
          file_name: string | null
          file_url: string | null
          finished_good_id: string | null
          id: string
          lab_provider: string
          mrl_flags: Json | null
          org_id: string
          result: string
          result_notes: string | null
          result_unit: string | null
          result_value: number | null
          shipment_id: string | null
          target_markets: string[] | null
          test_date: string
          test_method: string | null
          test_type: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          batch_id?: string | null
          certificate_expiry_date?: string | null
          certificate_number?: string | null
          certificate_validity_days?: number | null
          commodity?: string | null
          created_at?: string
          document_id?: string | null
          file_name?: string | null
          file_url?: string | null
          finished_good_id?: string | null
          id?: string
          lab_provider: string
          mrl_flags?: Json | null
          org_id: string
          result: string
          result_notes?: string | null
          result_unit?: string | null
          result_value?: number | null
          shipment_id?: string | null
          target_markets?: string[] | null
          test_date: string
          test_method?: string | null
          test_type: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          batch_id?: string | null
          certificate_expiry_date?: string | null
          certificate_number?: string | null
          certificate_validity_days?: number | null
          commodity?: string | null
          created_at?: string
          document_id?: string | null
          file_name?: string | null
          file_url?: string | null
          finished_good_id?: string | null
          id?: string
          lab_provider?: string
          mrl_flags?: Json | null
          org_id?: string
          result?: string
          result_notes?: string | null
          result_unit?: string | null
          result_value?: number | null
          shipment_id?: string | null
          target_markets?: string[] | null
          test_date?: string
          test_method?: string | null
          test_type?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nurture_jobs: {
        Row: {
          calcom_booking_uid: string | null
          commodity: string | null
          created_at: string
          hubspot_deal_id: string | null
          id: string
          lead_company: string | null
          lead_email: string
          lead_name: string
          lead_phone: string | null
          meeting_at: string | null
          nurture_step: number
          org_type: string | null
          reminders_sent: Json
          status: string
          updated_at: string
        }
        Insert: {
          calcom_booking_uid?: string | null
          commodity?: string | null
          created_at?: string
          hubspot_deal_id?: string | null
          id?: string
          lead_company?: string | null
          lead_email: string
          lead_name: string
          lead_phone?: string | null
          meeting_at?: string | null
          nurture_step?: number
          org_type?: string | null
          reminders_sent?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          calcom_booking_uid?: string | null
          commodity?: string | null
          created_at?: string
          hubspot_deal_id?: string | null
          id?: string
          lead_company?: string | null
          lead_email?: string
          lead_name?: string
          lead_phone?: string | null
          meeting_at?: string | null
          nurture_step?: number
          org_type?: string | null
          reminders_sent?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lgas: {
        Row: {
          id: string
          name: string
          state_id: string
        }
        Insert: {
          id?: string
          name: string
          state_id: string
        }
        Update: {
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgas_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          org_id: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          org_id?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          org_id?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_integrations: {
        Row: {
          api_key_enc: string | null
          created_at: string
          created_by: string | null
          endpoint_url: string
          event_subscriptions: string[] | null
          field_mapping: Json | null
          headers: Json | null
          http_method: string
          id: string
          is_active: boolean
          last_error: string | null
          last_synced_at: string | null
          name: string
          org_id: string
          type: string
          updated_at: string
        }
        Insert: {
          api_key_enc?: string | null
          created_at?: string
          created_by?: string | null
          endpoint_url: string
          event_subscriptions?: string[] | null
          field_mapping?: Json | null
          headers?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          name: string
          org_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          api_key_enc?: string | null
          created_at?: string
          created_by?: string | null
          endpoint_url?: string
          event_subscriptions?: string[] | null
          field_mapping?: Json | null
          headers?: Json | null
          http_method?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_synced_at?: string | null
          name?: string
          org_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_integrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "org_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_kyc_records: {
        Row: {
          account_verified_at: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          bank_name: string | null
          cac_registration_number: string | null
          created_at: string
          director_id_number: string | null
          director_id_type: string | null
          director_id_url: string | null
          director_name: string | null
          id: string
          kyc_notes: string | null
          kyc_status: string
          org_id: string
          paystack_recipient_code: string | null
          rc_number: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          tin: string | null
          updated_at: string
        }
        Insert: {
          account_verified_at?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          cac_registration_number?: string | null
          created_at?: string
          director_id_number?: string | null
          director_id_type?: string | null
          director_id_url?: string | null
          director_name?: string | null
          id?: string
          kyc_notes?: string | null
          kyc_status?: string
          org_id: string
          paystack_recipient_code?: string | null
          rc_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          tin?: string | null
          updated_at?: string
        }
        Update: {
          account_verified_at?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          cac_registration_number?: string | null
          created_at?: string
          director_id_number?: string | null
          director_id_type?: string | null
          director_id_url?: string | null
          director_name?: string | null
          id?: string
          kyc_notes?: string | null
          kyc_status?: string
          org_id?: string
          paystack_recipient_code?: string | null
          rc_number?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          tin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_kyc_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active_lgas: string[] | null
          blockradar_wallet_id: string | null
          brand_colors: Json | null
          commodities: string[] | null
          created_at: string | null
          grace_period_ends_at: string | null
          grey_virtual_accounts: Json | null
          id: string
          invite_code: string | null
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          subscription_expires_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          totp_enabled: boolean
          totp_pending_secret: string | null
          totp_secret: string | null
          updated_at: string | null
          usdc_balance: number | null
          usdc_deposit_address: string | null
        }
        Insert: {
          active_lgas?: string[] | null
          blockradar_wallet_id?: string | null
          brand_colors?: Json | null
          commodities?: string[] | null
          created_at?: string | null
          grace_period_ends_at?: string | null
          grey_virtual_accounts?: Json | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          totp_enabled?: boolean
          totp_pending_secret?: string | null
          totp_secret?: string | null
          updated_at?: string | null
          usdc_balance?: number | null
          usdc_deposit_address?: string | null
        }
        Update: {
          active_lgas?: string[] | null
          blockradar_wallet_id?: string | null
          brand_colors?: Json | null
          commodities?: string[] | null
          created_at?: string | null
          grace_period_ends_at?: string | null
          grey_virtual_accounts?: Json | null
          id?: string
          invite_code?: string | null
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_expires_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          totp_enabled?: boolean
          totp_pending_secret?: string | null
          totp_secret?: string | null
          updated_at?: string | null
          usdc_balance?: number | null
          usdc_deposit_address?: string | null
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount_ngn: number
          billing_period: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          metadata: Json | null
          org_id: string
          paid_at: string | null
          paystack_link: string | null
          paystack_reference: string | null
          status: string | null
          tier: string
        }
        Insert: {
          amount_ngn: number
          billing_period?: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          org_id: string
          paid_at?: string | null
          paystack_link?: string | null
          paystack_reference?: string | null
          status?: string | null
          tier: string
        }
        Update: {
          amount_ngn?: number
          billing_period?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string
          paid_at?: string | null
          paystack_link?: string | null
          paystack_reference?: string | null
          status?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          linked_entity_id: string | null
          linked_entity_type: string | null
          notes: string | null
          org_id: string
          payee_id: string | null
          payee_name: string
          payee_type: string
          payment_date: string
          payment_method: string
          recorded_by: string | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          notes?: string | null
          org_id: string
          payee_id?: string | null
          payee_name: string
          payee_type: string
          payment_date?: string
          payment_method: string
          recorded_by?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          linked_entity_id?: string | null
          linked_entity_type?: string | null
          notes?: string | null
          org_id?: string
          payee_id?: string | null
          payee_name?: string
          payee_type?: string
          payment_date?: string
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      pedigree_verification_records: {
        Row: {
          buyer_company: string | null
          buyer_name: string | null
          created_at: string | null
          dds_reference: string | null
          dds_submitted: boolean | null
          dds_submitted_at: string | null
          destination_country: string | null
          facility_location: string | null
          facility_name: string | null
          finished_good_id: string
          finished_weight_kg: number | null
          id: string
          mass_balance_valid: boolean | null
          mass_balance_variance: number | null
          organization_logo: string | null
          organization_name: string | null
          pedigree_code: string
          pedigree_verified: boolean | null
          processed_at: string | null
          processed_output_kg: number | null
          processing_run_code: string | null
          product_name: string
          product_type: string
          production_date: string | null
          raw_input_kg: number | null
          recovery_rate: number | null
          source_farms: Json | null
          standard_recovery_rate: number | null
          total_farm_area_hectares: number | null
          total_smallholders: number | null
          updated_at: string | null
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          buyer_company?: string | null
          buyer_name?: string | null
          created_at?: string | null
          dds_reference?: string | null
          dds_submitted?: boolean | null
          dds_submitted_at?: string | null
          destination_country?: string | null
          facility_location?: string | null
          facility_name?: string | null
          finished_good_id: string
          finished_weight_kg?: number | null
          id?: string
          mass_balance_valid?: boolean | null
          mass_balance_variance?: number | null
          organization_logo?: string | null
          organization_name?: string | null
          pedigree_code: string
          pedigree_verified?: boolean | null
          processed_at?: string | null
          processed_output_kg?: number | null
          processing_run_code?: string | null
          product_name: string
          product_type: string
          production_date?: string | null
          raw_input_kg?: number | null
          recovery_rate?: number | null
          source_farms?: Json | null
          standard_recovery_rate?: number | null
          total_farm_area_hectares?: number | null
          total_smallholders?: number | null
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          buyer_company?: string | null
          buyer_name?: string | null
          created_at?: string | null
          dds_reference?: string | null
          dds_submitted?: boolean | null
          dds_submitted_at?: string | null
          destination_country?: string | null
          facility_location?: string | null
          facility_name?: string | null
          finished_good_id?: string
          finished_weight_kg?: number | null
          id?: string
          mass_balance_valid?: boolean | null
          mass_balance_variance?: number | null
          organization_logo?: string | null
          organization_name?: string | null
          pedigree_code?: string
          pedigree_verified?: boolean | null
          processed_at?: string | null
          processed_output_kg?: number | null
          processing_run_code?: string | null
          product_name?: string
          product_type?: string
          production_date?: string | null
          raw_input_kg?: number | null
          recovery_rate?: number | null
          source_farms?: Json | null
          standard_recovery_rate?: number | null
          total_farm_area_hectares?: number | null
          total_smallholders?: number | null
          updated_at?: string | null
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedigree_verification_records_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: true
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_run_batches: {
        Row: {
          collection_batch_id: string
          created_at: string | null
          id: string
          processing_run_id: string
          weight_contribution_kg: number
        }
        Insert: {
          collection_batch_id: string
          created_at?: string | null
          id?: string
          processing_run_id: string
          weight_contribution_kg: number
        }
        Update: {
          collection_batch_id?: string
          created_at?: string | null
          id?: string
          processing_run_id?: string
          weight_contribution_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "processing_run_batches_collection_batch_id_fkey"
            columns: ["collection_batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_run_batches_processing_run_id_fkey"
            columns: ["processing_run_id"]
            isOneToOne: false
            referencedRelation: "processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_runs: {
        Row: {
          commodity: string
          created_at: string | null
          created_by: string | null
          dispatch_destination: string | null
          dispatch_driver_name: string | null
          dispatch_driver_phone: string | null
          dispatch_notes: string | null
          dispatch_recorded_at: string | null
          dispatch_vehicle_ref: string | null
          dispatched_output_at: string | null
          expected_arrival_at: string | null
          facility_location: string | null
          facility_name: string
          id: string
          input_weight_kg: number
          mass_balance_valid: boolean | null
          mass_balance_variance: number | null
          notes: string | null
          org_id: string
          output_weight_kg: number | null
          processed_at: string
          recovery_rate: number | null
          run_code: string
          standard_recovery_rate: number | null
          updated_at: string | null
        }
        Insert: {
          commodity: string
          created_at?: string | null
          created_by?: string | null
          dispatch_destination?: string | null
          dispatch_driver_name?: string | null
          dispatch_driver_phone?: string | null
          dispatch_notes?: string | null
          dispatch_recorded_at?: string | null
          dispatch_vehicle_ref?: string | null
          dispatched_output_at?: string | null
          expected_arrival_at?: string | null
          facility_location?: string | null
          facility_name: string
          id?: string
          input_weight_kg: number
          mass_balance_valid?: boolean | null
          mass_balance_variance?: number | null
          notes?: string | null
          org_id: string
          output_weight_kg?: number | null
          processed_at: string
          recovery_rate?: number | null
          run_code: string
          standard_recovery_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          commodity?: string
          created_at?: string | null
          created_by?: string | null
          dispatch_destination?: string | null
          dispatch_driver_name?: string | null
          dispatch_driver_phone?: string | null
          dispatch_notes?: string | null
          dispatch_recorded_at?: string | null
          dispatch_vehicle_ref?: string | null
          dispatched_output_at?: string | null
          expected_arrival_at?: string | null
          facility_location?: string | null
          facility_name?: string
          id?: string
          input_weight_kg?: number
          mass_balance_valid?: boolean | null
          mass_balance_variance?: number | null
          notes?: string | null
          org_id?: string
          output_weight_kg?: number | null
          processed_at?: string
          recovery_rate?: number | null
          run_code?: string
          standard_recovery_rate?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assigned_lga: string | null
          assigned_state: string | null
          avatar_url: string | null
          created_at: string | null
          full_name: string
          id: string
          org_id: string
          preferred_locale: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_lga?: string | null
          assigned_state?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          org_id: string
          preferred_locale?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_lga?: string | null
          assigned_state?: string | null
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          org_id?: string
          preferred_locale?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_standards: {
        Row: {
          commodity: string
          created_at: string | null
          id: string
          notes: string | null
          product_type: string
          standard_recovery_rate: number
          tolerance_percent: number | null
          unit: string | null
        }
        Insert: {
          commodity: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type: string
          standard_recovery_rate: number
          tolerance_percent?: number | null
          unit?: string | null
        }
        Update: {
          commodity?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_type?: string
          standard_recovery_rate?: number
          tolerance_percent?: number | null
          unit?: string | null
        }
        Relationships: []
      }
      service_providers: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          is_preferred: boolean
          name: string
          notes: string | null
          org_id: string
          provider_type: string
          registration_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          name: string
          notes?: string | null
          org_id: string
          provider_type: string
          registration_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_preferred?: boolean
          name?: string
          notes?: string | null
          org_id?: string
          provider_type?: string
          registration_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_providers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_items: {
        Row: {
          batch_id: string | null
          compliance_status: string | null
          created_at: string | null
          farm_count: number | null
          farm_id: string | null
          finished_good_id: string | null
          id: string
          item_type: string
          shipment_id: string
          traceability_complete: boolean | null
          weight_kg: number | null
        }
        Insert: {
          batch_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          farm_count?: number | null
          farm_id?: string | null
          finished_good_id?: string | null
          id?: string
          item_type: string
          shipment_id: string
          traceability_complete?: boolean | null
          weight_kg?: number | null
        }
        Update: {
          batch_id?: string | null
          compliance_status?: string | null
          created_at?: string | null
          farm_count?: number | null
          farm_id?: string | null
          finished_good_id?: string | null
          id?: string
          item_type?: string
          shipment_id?: string
          traceability_complete?: boolean | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_finished_good_id_fkey"
            columns: ["finished_good_id"]
            isOneToOne: false
            referencedRelation: "finished_goods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_lot_items: {
        Row: {
          bag_count: number | null
          batch_id: string | null
          created_at: string | null
          id: string
          lot_id: string
          shipment_item_id: string | null
          weight_kg: number | null
        }
        Insert: {
          bag_count?: number | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          lot_id: string
          shipment_item_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          bag_count?: number | null
          batch_id?: string | null
          created_at?: string | null
          id?: string
          lot_id?: string
          shipment_item_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_lot_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lot_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "shipment_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lot_items_shipment_item_id_fkey"
            columns: ["shipment_item_id"]
            isOneToOne: false
            referencedRelation: "shipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_lots: {
        Row: {
          commodity: string | null
          created_at: string | null
          farm_count: number | null
          id: string
          lot_code: string
          mass_balance_valid: boolean | null
          notes: string | null
          org_id: string
          shipment_id: string
          total_bags: number | null
          total_weight_kg: number | null
          updated_at: string | null
        }
        Insert: {
          commodity?: string | null
          created_at?: string | null
          farm_count?: number | null
          id?: string
          lot_code: string
          mass_balance_valid?: boolean | null
          notes?: string | null
          org_id: string
          shipment_id: string
          total_bags?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          commodity?: string | null
          created_at?: string | null
          farm_count?: number | null
          id?: string
          lot_code?: string
          mass_balance_valid?: boolean | null
          notes?: string | null
          org_id?: string
          shipment_id?: string
          total_bags?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_lots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_lots_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_outcomes: {
        Row: {
          customs_reference: string | null
          destination_country: string | null
          financial_impact_usd: number | null
          id: string
          inspector_notes: string | null
          org_id: string
          outcome: string
          outcome_date: string | null
          port_of_entry: string | null
          reason: string | null
          recorded_at: string
          recorded_by: string | null
          rejection_category: string | null
          rejection_reason: string | null
          shipment_id: string | null
        }
        Insert: {
          customs_reference?: string | null
          destination_country?: string | null
          financial_impact_usd?: number | null
          id?: string
          inspector_notes?: string | null
          org_id: string
          outcome: string
          outcome_date?: string | null
          port_of_entry?: string | null
          reason?: string | null
          recorded_at?: string
          recorded_by?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          shipment_id?: string | null
        }
        Update: {
          customs_reference?: string | null
          destination_country?: string | null
          financial_impact_usd?: number | null
          id?: string
          inspector_notes?: string | null
          org_id?: string
          outcome?: string
          outcome_date?: string | null
          port_of_entry?: string | null
          reason?: string | null
          recorded_at?: string
          recorded_by?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          shipment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_outcomes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_outcomes_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_templates: {
        Row: {
          buyer_company: string | null
          buyer_contact: string | null
          certification_costs_ngn: number | null
          clearing_agent_contact: string | null
          clearing_agent_name: string | null
          commodity: string | null
          container_type: string | null
          contract_price_per_mt: number | null
          created_at: string | null
          created_by: string | null
          customs_fees_ngn: number | null
          description: string | null
          destination_country: string | null
          destination_port: string | null
          freight_cost_usd: number | null
          freight_forwarder_contact: string | null
          freight_forwarder_name: string | null
          freight_insurance_usd: number | null
          id: string
          inspection_fees_ngn: number | null
          is_active: boolean
          name: string
          org_id: string
          phyto_lab_costs_ngn: number | null
          port_handling_charges_ngn: number | null
          port_of_discharge: string | null
          port_of_loading: string | null
          shipping_line: string | null
          target_regulations: string[] | null
          updated_at: string | null
          usd_ngn_rate: number | null
        }
        Insert: {
          buyer_company?: string | null
          buyer_contact?: string | null
          certification_costs_ngn?: number | null
          clearing_agent_contact?: string | null
          clearing_agent_name?: string | null
          commodity?: string | null
          container_type?: string | null
          contract_price_per_mt?: number | null
          created_at?: string | null
          created_by?: string | null
          customs_fees_ngn?: number | null
          description?: string | null
          destination_country?: string | null
          destination_port?: string | null
          freight_cost_usd?: number | null
          freight_forwarder_contact?: string | null
          freight_forwarder_name?: string | null
          freight_insurance_usd?: number | null
          id?: string
          inspection_fees_ngn?: number | null
          is_active?: boolean
          name: string
          org_id: string
          phyto_lab_costs_ngn?: number | null
          port_handling_charges_ngn?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          shipping_line?: string | null
          target_regulations?: string[] | null
          updated_at?: string | null
          usd_ngn_rate?: number | null
        }
        Update: {
          buyer_company?: string | null
          buyer_contact?: string | null
          certification_costs_ngn?: number | null
          clearing_agent_contact?: string | null
          clearing_agent_name?: string | null
          commodity?: string | null
          container_type?: string | null
          contract_price_per_mt?: number | null
          created_at?: string | null
          created_by?: string | null
          customs_fees_ngn?: number | null
          description?: string | null
          destination_country?: string | null
          destination_port?: string | null
          freight_cost_usd?: number | null
          freight_forwarder_contact?: string | null
          freight_forwarder_name?: string | null
          freight_insurance_usd?: number | null
          id?: string
          inspection_fees_ngn?: number | null
          is_active?: boolean
          name?: string
          org_id?: string
          phyto_lab_costs_ngn?: number | null
          port_handling_charges_ngn?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          shipping_line?: string | null
          target_regulations?: string[] | null
          updated_at?: string | null
          usd_ngn_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          actual_arrival_date: string | null
          actual_departure_date: string | null
          bill_of_lading_number: string | null
          booking_reference: string | null
          buyer_company: string | null
          buyer_contact: string | null
          certification_costs_ngn: number | null
          clearing_agent_contact: string | null
          clearing_agent_name: string | null
          commodity: string | null
          compliance_profile_id: string | null
          container_number: string | null
          container_seal_number: string | null
          container_type: string | null
          contract_price_per_mt: number | null
          created_at: string | null
          created_by: string | null
          current_stage: number | null
          customs_declaration_number: string | null
          customs_fees_ngn: number | null
          destination_country: string | null
          destination_port: string | null
          doc_status: Json | null
          estimated_ship_date: string | null
          eta: string | null
          etd: string | null
          exit_certificate_number: string | null
          freight_cost_usd: number | null
          freight_forwarder_contact: string | null
          freight_forwarder_name: string | null
          freight_insurance_usd: number | null
          id: string
          imo_number: string | null
          inspection_body: string | null
          inspection_certificate_number: string | null
          inspection_date: string | null
          inspection_fees_ngn: number | null
          inspection_result: string | null
          notes: string | null
          org_id: string
          outcome_recorded_at: string | null
          payment_instruction_token: string | null
          payment_method: string | null
          payment_status: string
          phyto_lab_costs_ngn: number | null
          port_handling_charges_ngn: number | null
          port_of_discharge: string | null
          port_of_loading: string | null
          prenotif_eu_traces: string | null
          prenotif_eu_traces_filed_at: string | null
          prenotif_eu_traces_ref: string | null
          prenotif_uk_ipaffs: string | null
          prenotif_uk_ipaffs_filed_at: string | null
          prenotif_uk_ipaffs_ref: string | null
          prenotif_us_fda: string | null
          prenotif_us_fda_filed_at: string | null
          prenotif_us_fda_ref: string | null
          purchase_order_date: string | null
          purchase_order_number: string | null
          readiness_decision: string | null
          readiness_score: number | null
          rejection_reason: string | null
          risk_flags: Json | null
          score_breakdown: Json | null
          shipment_code: string | null
          shipment_outcome: string | null
          shipping_line: string | null
          stage_data: Json | null
          stage_history: Json | null
          status: string | null
          storage_controls: Json | null
          target_regulations: string[] | null
          total_items: number | null
          total_shipment_value_usd: number | null
          total_weight_kg: number | null
          updated_at: string | null
          usd_ngn_rate: number | null
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          bill_of_lading_number?: string | null
          booking_reference?: string | null
          buyer_company?: string | null
          buyer_contact?: string | null
          certification_costs_ngn?: number | null
          clearing_agent_contact?: string | null
          clearing_agent_name?: string | null
          commodity?: string | null
          compliance_profile_id?: string | null
          container_number?: string | null
          container_seal_number?: string | null
          container_type?: string | null
          contract_price_per_mt?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stage?: number | null
          customs_declaration_number?: string | null
          customs_fees_ngn?: number | null
          destination_country?: string | null
          destination_port?: string | null
          doc_status?: Json | null
          estimated_ship_date?: string | null
          eta?: string | null
          etd?: string | null
          exit_certificate_number?: string | null
          freight_cost_usd?: number | null
          freight_forwarder_contact?: string | null
          freight_forwarder_name?: string | null
          freight_insurance_usd?: number | null
          id?: string
          imo_number?: string | null
          inspection_body?: string | null
          inspection_certificate_number?: string | null
          inspection_date?: string | null
          inspection_fees_ngn?: number | null
          inspection_result?: string | null
          notes?: string | null
          org_id: string
          outcome_recorded_at?: string | null
          payment_instruction_token?: string | null
          payment_method?: string | null
          payment_status?: string
          phyto_lab_costs_ngn?: number | null
          port_handling_charges_ngn?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          prenotif_eu_traces?: string | null
          prenotif_eu_traces_filed_at?: string | null
          prenotif_eu_traces_ref?: string | null
          prenotif_uk_ipaffs?: string | null
          prenotif_uk_ipaffs_filed_at?: string | null
          prenotif_uk_ipaffs_ref?: string | null
          prenotif_us_fda?: string | null
          prenotif_us_fda_filed_at?: string | null
          prenotif_us_fda_ref?: string | null
          purchase_order_date?: string | null
          purchase_order_number?: string | null
          readiness_decision?: string | null
          readiness_score?: number | null
          rejection_reason?: string | null
          risk_flags?: Json | null
          score_breakdown?: Json | null
          shipment_code?: string | null
          shipment_outcome?: string | null
          shipping_line?: string | null
          stage_data?: Json | null
          stage_history?: Json | null
          status?: string | null
          storage_controls?: Json | null
          target_regulations?: string[] | null
          total_items?: number | null
          total_shipment_value_usd?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          usd_ngn_rate?: number | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          actual_arrival_date?: string | null
          actual_departure_date?: string | null
          bill_of_lading_number?: string | null
          booking_reference?: string | null
          buyer_company?: string | null
          buyer_contact?: string | null
          certification_costs_ngn?: number | null
          clearing_agent_contact?: string | null
          clearing_agent_name?: string | null
          commodity?: string | null
          compliance_profile_id?: string | null
          container_number?: string | null
          container_seal_number?: string | null
          container_type?: string | null
          contract_price_per_mt?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stage?: number | null
          customs_declaration_number?: string | null
          customs_fees_ngn?: number | null
          destination_country?: string | null
          destination_port?: string | null
          doc_status?: Json | null
          estimated_ship_date?: string | null
          eta?: string | null
          etd?: string | null
          exit_certificate_number?: string | null
          freight_cost_usd?: number | null
          freight_forwarder_contact?: string | null
          freight_forwarder_name?: string | null
          freight_insurance_usd?: number | null
          id?: string
          imo_number?: string | null
          inspection_body?: string | null
          inspection_certificate_number?: string | null
          inspection_date?: string | null
          inspection_fees_ngn?: number | null
          inspection_result?: string | null
          notes?: string | null
          org_id?: string
          outcome_recorded_at?: string | null
          payment_instruction_token?: string | null
          payment_method?: string | null
          payment_status?: string
          phyto_lab_costs_ngn?: number | null
          port_handling_charges_ngn?: number | null
          port_of_discharge?: string | null
          port_of_loading?: string | null
          prenotif_eu_traces?: string | null
          prenotif_eu_traces_filed_at?: string | null
          prenotif_eu_traces_ref?: string | null
          prenotif_uk_ipaffs?: string | null
          prenotif_uk_ipaffs_filed_at?: string | null
          prenotif_uk_ipaffs_ref?: string | null
          prenotif_us_fda?: string | null
          prenotif_us_fda_filed_at?: string | null
          prenotif_us_fda_ref?: string | null
          purchase_order_date?: string | null
          purchase_order_number?: string | null
          readiness_decision?: string | null
          readiness_score?: number | null
          rejection_reason?: string | null
          risk_flags?: Json | null
          score_breakdown?: Json | null
          shipment_code?: string | null
          shipment_outcome?: string | null
          shipping_line?: string | null
          stage_data?: Json | null
          stage_history?: Json | null
          status?: string | null
          storage_controls?: Json | null
          target_regulations?: string[] | null
          total_items?: number | null
          total_shipment_value_usd?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
          usd_ngn_rate?: number | null
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_events: {
        Row: {
          classifier: string
          created_at: string
          event_code: string
          event_time: string
          id: string
          location_locode: string | null
          location_name: string | null
          org_id: string
          process_outcome: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          raw: Json | null
          shipment_id: string
          subscription_id: string
          vessel_name: string | null
          voyage_number: string | null
        }
        Insert: {
          classifier?: string
          created_at?: string
          event_code: string
          event_time: string
          id?: string
          location_locode?: string | null
          location_name?: string | null
          org_id: string
          process_outcome?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          raw?: Json | null
          shipment_id: string
          subscription_id: string
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Update: {
          classifier?: string
          created_at?: string
          event_code?: string
          event_time?: string
          id?: string
          location_locode?: string | null
          location_name?: string | null
          org_id?: string
          process_outcome?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          raw?: Json | null
          shipment_id?: string
          subscription_id?: string
          vessel_name?: string | null
          voyage_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_events_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tracking_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      states: {
        Row: {
          code: string
          id: string
          name: string
        }
        Insert: {
          code: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          billing_period: string | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          label: string
          price_ngn: number | null
          price_usd: number | null
          tier: string
        }
        Insert: {
          billing_period?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          label: string
          price_ngn?: number | null
          price_usd?: number | null
          tier: string
        }
        Update: {
          billing_period?: string | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          label?: string
          price_ngn?: number | null
          price_usd?: number | null
          tier?: string
        }
        Relationships: []
      }
      superadmin_audit_logs: {
        Row: {
          action: string
          after_state: Json | null
          before_state: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          superadmin_id: string
          target_id: string | null
          target_label: string | null
          target_type: string
        }
        Insert: {
          action: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          superadmin_id: string
          target_id?: string | null
          target_label?: string | null
          target_type: string
        }
        Update: {
          action?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          superadmin_id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string
        }
        Relationships: []
      }
      superadmin_impersonation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          superadmin_id: string
          superadmin_user_id: string
          target_org_id: number | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          superadmin_id: string
          superadmin_user_id: string
          target_org_id?: number | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          superadmin_id?: string
          superadmin_user_id?: string
          target_org_id?: number | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "superadmin_impersonation_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "superadmin_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "superadmin_impersonation_actions_superadmin_id_fkey"
            columns: ["superadmin_id"]
            isOneToOne: false
            referencedRelation: "system_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      superadmin_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean
          last_activity_at: string
          started_at: string
          system_admin_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          started_at?: string
          system_admin_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean
          last_activity_at?: string
          started_at?: string
          system_admin_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "superadmin_sessions_system_admin_id_fkey"
            columns: ["system_admin_id"]
            isOneToOne: false
            referencedRelation: "system_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_chain_links: {
        Row: {
          accepted_at: string | null
          buyer_org_id: string
          exporter_org_id: string | null
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string | null
          invited_by: string | null
          invited_email: string | null
          invited_org_name: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          buyer_org_id: string
          exporter_org_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_org_name?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          buyer_org_id?: string
          exporter_org_id?: string | null
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          invited_email?: string | null
          invited_org_name?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supply_chain_links_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "buyer_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_chain_links_exporter_org_id_fkey"
            columns: ["exporter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          agent_id: string
          batch_id: string
          created_at: string
          field_data: Json
          id: string
          org_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          server_data: Json
          status: string
        }
        Insert: {
          agent_id: string
          batch_id: string
          created_at?: string
          field_data: Json
          id?: string
          org_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_data: Json
          status?: string
        }
        Update: {
          agent_id?: string
          batch_id?: string
          created_at?: string
          field_data?: Json
          id?: string
          org_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          server_data?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "sync_conflicts_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "collection_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_conflicts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          last_login_ip: string | null
          mfa_enrolled: boolean
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_login_ip?: string | null
          mfa_enrolled?: boolean
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          last_login_ip?: string | null
          mfa_enrolled?: boolean
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tenant_health_metrics: {
        Row: {
          agent_count: number | null
          flagged_batches: number | null
          growth_trend: string | null
          last_collection_date: string | null
          org_created_at: string | null
          org_id: string
          org_name: string | null
          subscription_tier: string | null
          total_batches: number | null
          total_farms: number | null
          total_users: number | null
          total_weight_kg: number | null
          updated_at: string | null
        }
        Insert: {
          agent_count?: number | null
          flagged_batches?: number | null
          growth_trend?: string | null
          last_collection_date?: string | null
          org_created_at?: string | null
          org_id: string
          org_name?: string | null
          subscription_tier?: string | null
          total_batches?: number | null
          total_farms?: number | null
          total_users?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_count?: number | null
          flagged_batches?: number | null
          growth_trend?: string | null
          last_collection_date?: string | null
          org_created_at?: string | null
          org_id?: string
          org_name?: string | null
          subscription_tier?: string | null
          total_batches?: number | null
          total_farms?: number | null
          total_users?: number | null
          total_weight_kg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_health_metrics_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_bids: {
        Row: {
          certifications: string[] | null
          compliance_score: number | null
          created_at: string | null
          delivery_date: string | null
          exporter_org_id: string
          id: string
          notes: string | null
          price_per_mt: number
          quantity_available_mt: number
          status: string | null
          submitted_by: string | null
          tender_id: string
        }
        Insert: {
          certifications?: string[] | null
          compliance_score?: number | null
          created_at?: string | null
          delivery_date?: string | null
          exporter_org_id: string
          id?: string
          notes?: string | null
          price_per_mt: number
          quantity_available_mt: number
          status?: string | null
          submitted_by?: string | null
          tender_id: string
        }
        Update: {
          certifications?: string[] | null
          compliance_score?: number | null
          created_at?: string | null
          delivery_date?: string | null
          exporter_org_id?: string
          id?: string
          notes?: string | null
          price_per_mt?: number
          quantity_available_mt?: number
          status?: string | null
          submitted_by?: string | null
          tender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_bids_exporter_org_id_fkey"
            columns: ["exporter_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          buyer_org_id: string
          certifications_required: string[] | null
          closes_at: string | null
          closing_date: string | null
          commodity: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          delivery_deadline: string | null
          destination_country: string | null
          destination_port: string | null
          id: string
          invited_orgs: string[] | null
          quality_requirements: Json | null
          quantity_mt: number
          regulation_framework: string | null
          required_certifications: string[] | null
          status: string | null
          target_price_per_mt: number | null
          title: string
          visibility: string | null
        }
        Insert: {
          buyer_org_id: string
          certifications_required?: string[] | null
          closes_at?: string | null
          closing_date?: string | null
          commodity: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_deadline?: string | null
          destination_country?: string | null
          destination_port?: string | null
          id?: string
          invited_orgs?: string[] | null
          quality_requirements?: Json | null
          quantity_mt: number
          regulation_framework?: string | null
          required_certifications?: string[] | null
          status?: string | null
          target_price_per_mt?: number | null
          title: string
          visibility?: string | null
        }
        Update: {
          buyer_org_id?: string
          certifications_required?: string[] | null
          closes_at?: string | null
          closing_date?: string | null
          commodity?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          delivery_deadline?: string | null
          destination_country?: string | null
          destination_port?: string | null
          id?: string
          invited_orgs?: string[] | null
          quality_requirements?: Json | null
          quantity_mt?: number
          regulation_framework?: string | null
          required_certifications?: string[] | null
          status?: string | null
          target_price_per_mt?: number | null
          title?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenders_buyer_org_id_fkey"
            columns: ["buyer_org_id"]
            isOneToOne: false
            referencedRelation: "buyer_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_subscriptions: {
        Row: {
          auto_release_enabled: boolean
          bill_of_lading_number: string | null
          carrier_scac: string | null
          container_number: string | null
          created_at: string
          created_by: string | null
          id: string
          org_id: string
          provider: string
          provider_reference_id: string
          shipment_id: string
          status: string
          updated_at: string
        }
        Insert: {
          auto_release_enabled?: boolean
          bill_of_lading_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id: string
          provider: string
          provider_reference_id: string
          shipment_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          auto_release_enabled?: boolean
          bill_of_lading_number?: string | null
          carrier_scac?: string | null
          container_number?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          org_id?: string
          provider?: string
          provider_reference_id?: string
          shipment_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_subscriptions_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          id: string
          lga_id: string
          name: string
        }
        Insert: {
          id?: string
          lga_id: string
          name: string
        }
        Update: {
          id?: string
          lga_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "villages_lga_id_fkey"
            columns: ["lga_id"]
            isOneToOne: false
            referencedRelation: "lgas"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string
          id: string
          last_attempted_at: string | null
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          webhook_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          last_attempted_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          last_attempted_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          description: string | null
          events: string[]
          id: string
          org_id: string
          secret: string
          status: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          org_id: string
          secret: string
          status?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          events?: string[]
          id?: string
          org_id?: string
          secret?: string
          status?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number | null
          created_at: string | null
          event_type: string
          id: string
          org_id: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          webhook_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          org_id?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          org_id?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      yield_benchmarks: {
        Row: {
          avg_yield_per_hectare: number | null
          commodity: string
          country: string | null
          created_at: string | null
          id: string
          max_yield: number | null
          min_yield: number | null
          region: string | null
          season: string | null
          source: string | null
          year: number | null
        }
        Insert: {
          avg_yield_per_hectare?: number | null
          commodity: string
          country?: string | null
          created_at?: string | null
          id?: string
          max_yield?: number | null
          min_yield?: number | null
          region?: string | null
          season?: string | null
          source?: string | null
          year?: number | null
        }
        Update: {
          avg_yield_per_hectare?: number | null
          commodity?: string
          country?: string | null
          created_at?: string | null
          id?: string
          max_yield?: number | null
          min_yield?: number | null
          region?: string | null
          season?: string | null
          source?: string | null
          year?: number | null
        }
        Relationships: []
      }
      yield_predictions: {
        Row: {
          actual_yield_kg: number | null
          alert_level: string | null
          alert_message: string | null
          commodity: string | null
          created_at: string | null
          farm_id: string | null
          id: string
          org_id: string | null
          predicted_yield_kg: number | null
          prediction_date: string | null
          season: string | null
          variance_pct: number | null
        }
        Insert: {
          actual_yield_kg?: number | null
          alert_level?: string | null
          alert_message?: string | null
          commodity?: string | null
          created_at?: string | null
          farm_id?: string | null
          id?: string
          org_id?: string | null
          predicted_yield_kg?: number | null
          prediction_date?: string | null
          season?: string | null
          variance_pct?: number | null
        }
        Update: {
          actual_yield_kg?: number | null
          alert_level?: string | null
          alert_message?: string | null
          commodity?: string | null
          created_at?: string | null
          farm_id?: string | null
          id?: string
          org_id?: string | null
          predicted_yield_kg?: number | null
          prediction_date?: string | null
          season?: string | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "yield_predictions_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yield_predictions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      create_shipment_atomic: {
        Args: {
          p_buyer_company?: string
          p_buyer_contact?: string
          p_commodity: string
          p_compliance_profile_id?: string
          p_contract_id?: string
          p_created_by: string
          p_destination_country: string
          p_destination_port?: string
          p_document_ids?: string[]
          p_estimated_ship_date?: string
          p_notes?: string
          p_org_id: string
          p_shipment_code: string
          p_target_regulations?: string[]
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_org_tier: { Args: { p_org_id: string }; Returns: string }
      get_user_org_id: { Args: never; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      increment_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_sec: number }
        Returns: {
          allowed: boolean
          current_count: number
          window_end: string
        }[]
      }
      is_system_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      scan_farm_boundary_conflicts: {
        Args: { p_min_overlap_ratio?: number; p_org_id: string }
        Returns: {
          farm_a_id: string
          farm_b_id: string
          overlap_ratio: number
        }[]
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      sync_batches_atomic: {
        Args: { p_batches: Json; p_org_id: string; p_user_id: string }
        Returns: Json
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
