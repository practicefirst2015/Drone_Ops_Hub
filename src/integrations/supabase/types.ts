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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      batteries: {
        Row: {
          acquired_date: string | null
          capacity_mah: number | null
          created_at: string
          cycle_count: number
          drone_id: string | null
          health_percent: number | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          retired_date: string | null
          serial_number: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          acquired_date?: string | null
          capacity_mah?: number | null
          created_at?: string
          cycle_count?: number
          drone_id?: string | null
          health_percent?: number | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          retired_date?: string | null
          serial_number?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          acquired_date?: string | null
          capacity_mah?: number | null
          created_at?: string
          cycle_count?: number
          drone_id?: string | null
          health_percent?: number | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          retired_date?: string | null
          serial_number?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batteries_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batteries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          certification_number: string | null
          created_at: string
          expiry_date: string | null
          id: string
          issued_date: string | null
          notes: string | null
          organization_id: string
          skill_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certification_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          organization_id: string
          skill_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certification_number?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          issued_date?: string | null
          notes?: string | null
          organization_id?: string
          skill_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          storage_path: string | null
          uploaded_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by: string
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          storage_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverable_documents: {
        Row: {
          created_at: string
          document_url: string
          file_name: string
          flight_deliverable_id: string | null
          id: string
          project_deliverable_id: string | null
          storage_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_url: string
          file_name: string
          flight_deliverable_id?: string | null
          id?: string
          project_deliverable_id?: string | null
          storage_path?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_url?: string
          file_name?: string
          flight_deliverable_id?: string | null
          id?: string
          project_deliverable_id?: string | null
          storage_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverable_documents_flight_deliverable_id_fkey"
            columns: ["flight_deliverable_id"]
            isOneToOne: false
            referencedRelation: "flight_log_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_documents_project_deliverable_id_fkey"
            columns: ["project_deliverable_id"]
            isOneToOne: false
            referencedRelation: "project_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverable_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_manufacturers: {
        Row: {
          country: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          organization_id: string
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          organization_id: string
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          organization_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_manufacturers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_model_payloads: {
        Row: {
          created_at: string
          id: string
          model_id: string
          notes: string | null
          payload_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_id: string
          notes?: string | null
          payload_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_id?: string
          notes?: string | null
          payload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drone_model_payloads_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "drone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_model_payloads_payload_id_fkey"
            columns: ["payload_id"]
            isOneToOne: false
            referencedRelation: "drone_payloads"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_models: {
        Row: {
          camera_resolution: string | null
          camera_sensor: string | null
          category: string
          created_at: string
          dimensions: string | null
          faa_category: string | null
          folded_dimensions: string | null
          gimbal_stabilization: string | null
          gps_type: string | null
          has_built_in_camera: boolean | null
          id: string
          image_url: string | null
          ip_rating: string | null
          manufacturer_id: string
          max_altitude_m: number | null
          max_flight_time_min: number | null
          max_payload_kg: number | null
          max_range_km: number | null
          max_speed_ms: number | null
          max_wind_resistance_ms: number | null
          model_3d_attribution: string | null
          model_3d_url: string | null
          motor_type: string | null
          name: string
          noise_level_db: number | null
          notes: string | null
          obstacle_avoidance: string | null
          operating_temp_range: string | null
          organization_id: string
          positioning_accuracy: string | null
          propeller_count: number | null
          remote_id_capable: boolean | null
          updated_at: string
          video_resolution: string | null
          weight_kg: number | null
        }
        Insert: {
          camera_resolution?: string | null
          camera_sensor?: string | null
          category?: string
          created_at?: string
          dimensions?: string | null
          faa_category?: string | null
          folded_dimensions?: string | null
          gimbal_stabilization?: string | null
          gps_type?: string | null
          has_built_in_camera?: boolean | null
          id?: string
          image_url?: string | null
          ip_rating?: string | null
          manufacturer_id: string
          max_altitude_m?: number | null
          max_flight_time_min?: number | null
          max_payload_kg?: number | null
          max_range_km?: number | null
          max_speed_ms?: number | null
          max_wind_resistance_ms?: number | null
          model_3d_attribution?: string | null
          model_3d_url?: string | null
          motor_type?: string | null
          name: string
          noise_level_db?: number | null
          notes?: string | null
          obstacle_avoidance?: string | null
          operating_temp_range?: string | null
          organization_id: string
          positioning_accuracy?: string | null
          propeller_count?: number | null
          remote_id_capable?: boolean | null
          updated_at?: string
          video_resolution?: string | null
          weight_kg?: number | null
        }
        Update: {
          camera_resolution?: string | null
          camera_sensor?: string | null
          category?: string
          created_at?: string
          dimensions?: string | null
          faa_category?: string | null
          folded_dimensions?: string | null
          gimbal_stabilization?: string | null
          gps_type?: string | null
          has_built_in_camera?: boolean | null
          id?: string
          image_url?: string | null
          ip_rating?: string | null
          manufacturer_id?: string
          max_altitude_m?: number | null
          max_flight_time_min?: number | null
          max_payload_kg?: number | null
          max_range_km?: number | null
          max_speed_ms?: number | null
          max_wind_resistance_ms?: number | null
          model_3d_attribution?: string | null
          model_3d_url?: string | null
          motor_type?: string | null
          name?: string
          noise_level_db?: number | null
          notes?: string | null
          obstacle_avoidance?: string | null
          operating_temp_range?: string | null
          organization_id?: string
          positioning_accuracy?: string | null
          propeller_count?: number | null
          remote_id_capable?: boolean | null
          updated_at?: string
          video_resolution?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "drone_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drone_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drone_payloads: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manufacturer: string | null
          name: string
          organization_id: string
          type: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          name: string
          organization_id: string
          type?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manufacturer?: string | null
          name?: string
          organization_id?: string
          type?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "drone_payloads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drones: {
        Row: {
          acquisition_date: string | null
          battery_level: number | null
          created_at: string
          drone_model_id: string | null
          flight_hours: number | null
          id: string
          last_maintenance_date: string | null
          last_maintenance_flight_hours: number | null
          last_maintenance_missions: number | null
          maintenance_interval_hours: number | null
          maintenance_interval_missions: number | null
          model: string
          name: string
          next_maintenance: string | null
          organization_id: string
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acquisition_date?: string | null
          battery_level?: number | null
          created_at?: string
          drone_model_id?: string | null
          flight_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_flight_hours?: number | null
          last_maintenance_missions?: number | null
          maintenance_interval_hours?: number | null
          maintenance_interval_missions?: number | null
          model: string
          name: string
          next_maintenance?: string | null
          organization_id: string
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acquisition_date?: string | null
          battery_level?: number | null
          created_at?: string
          drone_model_id?: string | null
          flight_hours?: number | null
          id?: string
          last_maintenance_date?: string | null
          last_maintenance_flight_hours?: number | null
          last_maintenance_missions?: number | null
          maintenance_interval_hours?: number | null
          maintenance_interval_missions?: number | null
          model?: string
          name?: string
          next_maintenance?: string | null
          organization_id?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drones_drone_model_id_fkey"
            columns: ["drone_model_id"]
            isOneToOne: false
            referencedRelation: "drone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drones_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          organization_id: string | null
          query_key: string | null
          severity: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          component?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          query_key?: string | null
          severity?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          component?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          query_key?: string | null
          severity?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_crew: {
        Row: {
          created_at: string
          flight_log_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          flight_log_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          flight_log_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_crew_flight_log_id_fkey"
            columns: ["flight_log_id"]
            isOneToOne: false
            referencedRelation: "flight_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_crew_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_log_deliverables: {
        Row: {
          created_at: string
          deliverable_type: Database["public"]["Enums"]["deliverable_type"]
          flight_log_id: string
          id: string
          label: string | null
          notes: string | null
          organization_id: string
          status: Database["public"]["Enums"]["deliverable_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliverable_type: Database["public"]["Enums"]["deliverable_type"]
          flight_log_id: string
          id?: string
          label?: string | null
          notes?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliverable_type?: Database["public"]["Enums"]["deliverable_type"]
          flight_log_id?: string
          id?: string
          label?: string | null
          notes?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_log_deliverables_flight_log_id_fkey"
            columns: ["flight_log_id"]
            isOneToOne: false
            referencedRelation: "flight_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_log_deliverables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_log_files: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_type: string
          flight_log_id: string
          generated_by: string
          id: string
          organization_id: string
          snapshot_duration_minutes: number | null
          snapshot_outcome: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string
          flight_log_id: string
          generated_by: string
          id?: string
          organization_id: string
          snapshot_duration_minutes?: number | null
          snapshot_outcome?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          flight_log_id?: string
          generated_by?: string
          id?: string
          organization_id?: string
          snapshot_duration_minutes?: number | null
          snapshot_outcome?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_log_files_flight_log_id_fkey"
            columns: ["flight_log_id"]
            isOneToOne: false
            referencedRelation: "flight_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_log_files_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_log_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_logs: {
        Row: {
          airspace_notes: string | null
          battery_equipment_notes: string | null
          created_at: string
          deliverables_summary: string | null
          drone_id: string | null
          drone_model_id: string | null
          drone_utilization_contribution: number | null
          duration_minutes: number | null
          flight_area_summary: string | null
          flight_date: string
          flight_hours_contribution: number | null
          id: string
          incidents: string | null
          landing_time: string | null
          launch_location: string | null
          launch_time: string | null
          mission_id: string | null
          objective: string | null
          organization_id: string
          outcome: Database["public"]["Enums"]["flight_outcome"]
          pilot_id: string
          postflight_notes: string | null
          preflight_completed: boolean
          project_id: string
          title: string
          updated_at: string
          weather_summary: string | null
        }
        Insert: {
          airspace_notes?: string | null
          battery_equipment_notes?: string | null
          created_at?: string
          deliverables_summary?: string | null
          drone_id?: string | null
          drone_model_id?: string | null
          drone_utilization_contribution?: number | null
          duration_minutes?: number | null
          flight_area_summary?: string | null
          flight_date: string
          flight_hours_contribution?: number | null
          id?: string
          incidents?: string | null
          landing_time?: string | null
          launch_location?: string | null
          launch_time?: string | null
          mission_id?: string | null
          objective?: string | null
          organization_id: string
          outcome?: Database["public"]["Enums"]["flight_outcome"]
          pilot_id: string
          postflight_notes?: string | null
          preflight_completed?: boolean
          project_id: string
          title: string
          updated_at?: string
          weather_summary?: string | null
        }
        Update: {
          airspace_notes?: string | null
          battery_equipment_notes?: string | null
          created_at?: string
          deliverables_summary?: string | null
          drone_id?: string | null
          drone_model_id?: string | null
          drone_utilization_contribution?: number | null
          duration_minutes?: number | null
          flight_area_summary?: string | null
          flight_date?: string
          flight_hours_contribution?: number | null
          id?: string
          incidents?: string | null
          landing_time?: string | null
          launch_location?: string | null
          launch_time?: string | null
          mission_id?: string | null
          objective?: string | null
          organization_id?: string
          outcome?: Database["public"]["Enums"]["flight_outcome"]
          pilot_id?: string
          postflight_notes?: string | null
          preflight_completed?: boolean
          project_id?: string
          title?: string
          updated_at?: string
          weather_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flight_logs_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_drone_model_id_fkey"
            columns: ["drone_model_id"]
            isOneToOne: false
            referencedRelation: "drone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_files: {
        Row: {
          created_at: string
          file_category: string
          file_name: string
          file_size_bytes: number | null
          flight_log_id: string | null
          id: string
          mime_type: string | null
          mission_id: string | null
          notes: string | null
          organization_id: string
          processing_status: string
          project_id: string
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_category?: string
          file_name: string
          file_size_bytes?: number | null
          flight_log_id?: string | null
          id?: string
          mime_type?: string | null
          mission_id?: string | null
          notes?: string | null
          organization_id: string
          processing_status?: string
          project_id: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_category?: string
          file_name?: string
          file_size_bytes?: number | null
          flight_log_id?: string | null
          id?: string
          mime_type?: string | null
          mission_id?: string | null
          notes?: string | null
          organization_id?: string
          processing_status?: string
          project_id?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_files_flight_log_id_fkey"
            columns: ["flight_log_id"]
            isOneToOne: false
            referencedRelation: "flight_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_files_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_files: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          generated_by: string
          id: string
          invoice_id: string
          organization_id: string
          snapshot_discount_amount: number
          snapshot_line_item_count: number
          snapshot_status: string
          snapshot_subtotal: number
          snapshot_tax_amount: number
          snapshot_total: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          generated_by: string
          id?: string
          invoice_id: string
          organization_id: string
          snapshot_discount_amount?: number
          snapshot_line_item_count?: number
          snapshot_status?: string
          snapshot_subtotal?: number
          snapshot_tax_amount?: number
          snapshot_total?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          generated_by?: string
          id?: string
          invoice_id?: string
          organization_id?: string
          snapshot_discount_amount?: number
          snapshot_line_item_count?: number
          snapshot_status?: string
          snapshot_subtotal?: number
          snapshot_tax_amount?: number
          snapshot_total?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_files_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_files_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          discount_amount: number | null
          discount_type: string
          due_date: string | null
          id: string
          invoice_number: string
          issued_date: string | null
          notes: string | null
          organization_id: string
          project_id: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_type?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issued_date?: string | null
          notes?: string | null
          organization_id: string
          project_id?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          discount_amount?: number | null
          discount_type?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issued_date?: string | null
          notes?: string | null
          organization_id?: string
          project_id?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_events: {
        Row: {
          cost: number | null
          created_at: string
          description: string
          drone_id: string
          event_type: string
          flight_hours_at_service: number | null
          id: string
          notes: string | null
          organization_id: string
          parts_replaced: string | null
          performed_at: string
          performed_by: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description: string
          drone_id: string
          event_type?: string
          flight_hours_at_service?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          parts_replaced?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string
          drone_id?: string
          event_type?: string
          flight_hours_at_service?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          parts_replaced?: string | null
          performed_at?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_events_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_events_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["membership_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_certifications: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          notes: string | null
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          notes?: string | null
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          notes?: string | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_certifications_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_certifications_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_drone_models: {
        Row: {
          created_at: string
          drone_model_id: string
          id: string
          mission_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          drone_model_id: string
          id?: string
          mission_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          drone_model_id?: string
          id?: string
          mission_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_drone_models_drone_model_id_fkey"
            columns: ["drone_model_id"]
            isOneToOne: false
            referencedRelation: "drone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_drone_models_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_drones: {
        Row: {
          created_at: string
          drone_id: string
          id: string
          mission_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          drone_id: string
          id?: string
          mission_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          drone_id?: string
          id?: string
          mission_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mission_drones_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_drones_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_files: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_type: string
          generated_by: string
          id: string
          mission_id: string
          organization_id: string
          snapshot_go_status: string
          snapshot_preflight_status: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_type?: string
          generated_by: string
          id?: string
          mission_id: string
          organization_id: string
          snapshot_go_status?: string
          snapshot_preflight_status?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_type?: string
          generated_by?: string
          id?: string
          mission_id?: string
          organization_id?: string
          snapshot_go_status?: string
          snapshot_preflight_status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_files_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_files_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_operators: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_operators_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_operators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mission_skills: {
        Row: {
          created_at: string
          id: string
          mission_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mission_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mission_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_skills_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          airspace_notes: string | null
          altitude_notes: string | null
          created_at: string
          flight_duration_estimate_min: number | null
          go_status: Database["public"]["Enums"]["mission_go_status"]
          id: string
          latitude: number | null
          launch_location: string | null
          longitude: number | null
          mission_date: string | null
          objective: string | null
          organization_id: string
          planned_flight_zone: string | null
          postflight_notes: string | null
          preflight_status: Database["public"]["Enums"]["preflight_status"]
          project_id: string
          readiness_notes: string | null
          risk_notes: string | null
          status: Database["public"]["Enums"]["mission_status"]
          target_area: string | null
          title: string
          updated_at: string
          weather_notes: string | null
        }
        Insert: {
          airspace_notes?: string | null
          altitude_notes?: string | null
          created_at?: string
          flight_duration_estimate_min?: number | null
          go_status?: Database["public"]["Enums"]["mission_go_status"]
          id?: string
          latitude?: number | null
          launch_location?: string | null
          longitude?: number | null
          mission_date?: string | null
          objective?: string | null
          organization_id: string
          planned_flight_zone?: string | null
          postflight_notes?: string | null
          preflight_status?: Database["public"]["Enums"]["preflight_status"]
          project_id: string
          readiness_notes?: string | null
          risk_notes?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target_area?: string | null
          title: string
          updated_at?: string
          weather_notes?: string | null
        }
        Update: {
          airspace_notes?: string | null
          altitude_notes?: string | null
          created_at?: string
          flight_duration_estimate_min?: number | null
          go_status?: Database["public"]["Enums"]["mission_go_status"]
          id?: string
          latitude?: number | null
          launch_location?: string | null
          longitude?: number | null
          mission_date?: string | null
          objective?: string | null
          organization_id?: string
          planned_flight_zone?: string | null
          postflight_notes?: string | null
          preflight_status?: Database["public"]["Enums"]["preflight_status"]
          project_id?: string
          readiness_notes?: string | null
          risk_notes?: string | null
          status?: Database["public"]["Enums"]["mission_status"]
          target_area?: string | null
          title?: string
          updated_at?: string
          weather_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "missions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dismissals: {
        Row: {
          alert_key: string
          dismissed_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          alert_key: string
          dismissed_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          alert_key?: string
          dismissed_at?: string
          id?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dismissals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_integrations: {
        Row: {
          config: Json
          created_at: string
          credentials_encrypted: Json
          enabled: boolean
          id: string
          integration_key: string
          last_synced_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials_encrypted?: Json
          enabled?: boolean
          id?: string
          integration_key: string
          last_synced_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials_encrypted?: Json
          enabled?: boolean
          id?: string
          integration_key?: string
          last_synced_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          alert_cert_expiry_days: number | null
          alert_issue_age_days: number | null
          alert_maintenance_threshold: number | null
          alerts_enabled: boolean | null
          client_can_view_deliverables: boolean | null
          client_can_view_flight_logs: boolean | null
          client_can_view_invoices: boolean | null
          client_can_view_mission_status: boolean | null
          created_at: string
          data_insights_opt_in: boolean
          default_currency: string | null
          default_discount_type: string | null
          default_payment_terms_days: number | null
          default_tax_rate: number | null
          id: string
          invoice_notes_template: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          alert_cert_expiry_days?: number | null
          alert_issue_age_days?: number | null
          alert_maintenance_threshold?: number | null
          alerts_enabled?: boolean | null
          client_can_view_deliverables?: boolean | null
          client_can_view_flight_logs?: boolean | null
          client_can_view_invoices?: boolean | null
          client_can_view_mission_status?: boolean | null
          created_at?: string
          data_insights_opt_in?: boolean
          default_currency?: string | null
          default_discount_type?: string | null
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          id?: string
          invoice_notes_template?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          alert_cert_expiry_days?: number | null
          alert_issue_age_days?: number | null
          alert_maintenance_threshold?: number | null
          alerts_enabled?: boolean | null
          client_can_view_deliverables?: boolean | null
          client_can_view_flight_logs?: boolean | null
          client_can_view_invoices?: boolean | null
          client_can_view_mission_status?: boolean | null
          created_at?: string
          data_insights_opt_in?: boolean
          default_currency?: string | null
          default_discount_type?: string | null
          default_payment_terms_days?: number | null
          default_tax_rate?: number | null
          id?: string
          invoice_notes_template?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      postflight_issues: {
        Row: {
          category: string
          created_at: string
          description: string | null
          drone_model_id: string | null
          flight_log_id: string
          id: string
          mission_id: string | null
          organization_id: string
          pilot_id: string | null
          reported_by: string
          resolution_notes: string | null
          resolution_status: Database["public"]["Enums"]["issue_resolution_status"]
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          drone_model_id?: string | null
          flight_log_id: string
          id?: string
          mission_id?: string | null
          organization_id: string
          pilot_id?: string | null
          reported_by: string
          resolution_notes?: string | null
          resolution_status?: Database["public"]["Enums"]["issue_resolution_status"]
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          drone_model_id?: string | null
          flight_log_id?: string
          id?: string
          mission_id?: string | null
          organization_id?: string
          pilot_id?: string | null
          reported_by?: string
          resolution_notes?: string | null
          resolution_status?: Database["public"]["Enums"]["issue_resolution_status"]
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postflight_issues_drone_model_id_fkey"
            columns: ["drone_model_id"]
            isOneToOne: false
            referencedRelation: "drone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_flight_log_id_fkey"
            columns: ["flight_log_id"]
            isOneToOne: false
            referencedRelation: "flight_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postflight_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preflight_checklist_items: {
        Row: {
          auto_status: string | null
          check_key: string
          checked_at: string | null
          checked_by: string | null
          created_at: string
          id: string
          is_auto: boolean
          is_critical: boolean
          label: string
          manual_checked: boolean
          mission_id: string
          override_note: string | null
        }
        Insert: {
          auto_status?: string | null
          check_key: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_auto?: boolean
          is_critical?: boolean
          label: string
          manual_checked?: boolean
          mission_id: string
          override_note?: string | null
        }
        Update: {
          auto_status?: string | null
          check_key?: string
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string
          id?: string
          is_auto?: boolean
          is_critical?: boolean
          label?: string
          manual_checked?: boolean
          mission_id?: string
          override_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preflight_checklist_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preflight_checklist_items_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliverables: {
        Row: {
          created_at: string
          deliverable_type: Database["public"]["Enums"]["deliverable_type"]
          description: string | null
          id: string
          label: string | null
          notes: string | null
          organization_id: string
          project_id: string
          status: Database["public"]["Enums"]["deliverable_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deliverable_type: Database["public"]["Enums"]["deliverable_type"]
          description?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          organization_id: string
          project_id: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deliverable_type?: Database["public"]["Enums"]["deliverable_type"]
          description?: string | null
          id?: string
          label?: string | null
          notes?: string | null
          organization_id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["deliverable_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_deliverables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_deliverables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          project_id: string
          storage_path: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          project_id: string
          storage_path?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          storage_path?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_drones: {
        Row: {
          created_at: string
          drone_id: string
          id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          drone_id: string
          id?: string
          project_id: string
        }
        Update: {
          created_at?: string
          drone_id?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_drones_drone_id_fkey"
            columns: ["drone_id"]
            isOneToOne: false
            referencedRelation: "drones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_drones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          note_type: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_type?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_type?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_skills: {
        Row: {
          created_at: string
          id: string
          project_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          estimated_budget_max: number | null
          estimated_budget_min: number | null
          estimated_duration_days: number | null
          id: string
          is_global: boolean
          name: string
          organization_id: string
          required_skills: string[]
          risk_notes: string | null
          suggested_drone_categories: string[]
          suggested_payload_types: string[]
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          estimated_duration_days?: number | null
          id?: string
          is_global?: boolean
          name: string
          organization_id: string
          required_skills?: string[]
          risk_notes?: string | null
          suggested_drone_categories?: string[]
          suggested_payload_types?: string[]
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          estimated_budget_max?: number | null
          estimated_budget_min?: number | null
          estimated_duration_days?: number | null
          id?: string
          is_global?: boolean
          name?: string
          organization_id?: string
          required_skills?: string[]
          risk_notes?: string | null
          suggested_drone_categories?: string[]
          suggested_payload_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          client_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          flight_altitude_m: number | null
          flight_radius_m: number | null
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          name: string
          organization_id: string
          priority: string
          progress: number
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flight_altitude_m?: number | null
          flight_radius_m?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name: string
          organization_id: string
          priority?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          flight_altitude_m?: number | null
          flight_radius_m?: number | null
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          name?: string
          organization_id?: string
          priority?: string
          progress?: number
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          created_at: string
          id: string
          is_verified: boolean
          notes: string | null
          organization_id: string
          proficiency_level: string
          skill_id: string
          updated_at: string
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          organization_id: string
          proficiency_level?: string
          skill_id: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          organization_id?: string
          proficiency_level?: string
          skill_id?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      get_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["membership_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_member_by_email: {
        Args: {
          _email: string
          _org_id: string
          _role: Database["public"]["Enums"]["membership_role"]
        }
        Returns: string
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      client_status: "active" | "inactive"
      deliverable_status:
        | "expected"
        | "captured"
        | "partial"
        | "not_captured"
        | "in_processing"
        | "completed"
      deliverable_type:
        | "rgb_imagery"
        | "thermal_imagery"
        | "multispectral_imagery"
        | "video"
        | "orthomosaic_source"
        | "lidar_data"
        | "inspection_notes"
        | "mapping_data"
        | "survey_data"
        | "other"
      flight_outcome: "completed" | "partial" | "aborted" | "cancelled"
      issue_resolution_status:
        | "open"
        | "investigating"
        | "resolved"
        | "wont_fix"
      issue_severity: "low" | "medium" | "high" | "critical"
      membership_role: "owner" | "admin" | "manager" | "pilot" | "viewer"
      mission_go_status: "pending" | "go" | "no_go"
      mission_status:
        | "draft"
        | "planning"
        | "approved"
        | "ready"
        | "in_progress"
        | "completed"
        | "aborted"
        | "cancelled"
      preflight_status: "not_started" | "in_progress" | "complete" | "failed"
      project_status: "draft" | "active" | "pending" | "complete" | "archived"
      task_priority: "low" | "medium" | "high" | "critical"
      task_status: "todo" | "in_progress" | "in_review" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      client_status: ["active", "inactive"],
      deliverable_status: [
        "expected",
        "captured",
        "partial",
        "not_captured",
        "in_processing",
        "completed",
      ],
      deliverable_type: [
        "rgb_imagery",
        "thermal_imagery",
        "multispectral_imagery",
        "video",
        "orthomosaic_source",
        "lidar_data",
        "inspection_notes",
        "mapping_data",
        "survey_data",
        "other",
      ],
      flight_outcome: ["completed", "partial", "aborted", "cancelled"],
      issue_resolution_status: [
        "open",
        "investigating",
        "resolved",
        "wont_fix",
      ],
      issue_severity: ["low", "medium", "high", "critical"],
      membership_role: ["owner", "admin", "manager", "pilot", "viewer"],
      mission_go_status: ["pending", "go", "no_go"],
      mission_status: [
        "draft",
        "planning",
        "approved",
        "ready",
        "in_progress",
        "completed",
        "aborted",
        "cancelled",
      ],
      preflight_status: ["not_started", "in_progress", "complete", "failed"],
      project_status: ["draft", "active", "pending", "complete", "archived"],
      task_priority: ["low", "medium", "high", "critical"],
      task_status: ["todo", "in_progress", "in_review", "done"],
    },
  },
} as const
