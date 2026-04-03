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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      booking_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          booking_id: string
          created_at: string
          id: string
          payload: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          booking_id: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          booking_id?: string
          created_at?: string
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_audit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          booking_access_token?: string | null
          buffer_after_snapshot?: number
          buffer_before_snapshot?: number
          business_id: string
          cancel_reason?: string | null
          created_at?: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id?: string
          notes?: string | null
          price_snapshot?: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source?: string
          staff_id: string
          staff_name_snapshot?: string | null
          start_at: string
          status?: string
          timezone: string
          updated_at?: string
        }
        Update: {
          booking_access_token?: string | null
          buffer_after_snapshot?: number
          buffer_before_snapshot?: number
          business_id?: string
          cancel_reason?: string | null
          created_at?: string
          customer_id?: string
          effective_end_at?: string
          effective_start_at?: string
          end_at?: string
          id?: string
          notes?: string | null
          price_snapshot?: number | null
          service_duration_minutes_snapshot?: number
          service_id?: string
          service_name_snapshot?: string
          source?: string
          staff_id?: string
          staff_name_snapshot?: string | null
          start_at?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      business_hours: {
        Row: {
          business_id: string
          end_time: string | null
          id: string
          is_closed: boolean
          start_time: string | null
          weekday: number
        }
        Insert: {
          business_id: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          start_time?: string | null
          weekday: number
        }
        Update: {
          business_id?: string
          end_time?: string | null
          id?: string
          is_closed?: boolean
          start_time?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_members: {
        Row: {
          business_id: string
          id: string
          invited_at: string | null
          joined_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          invited_at?: string | null
          joined_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          plan: string
          slug: string
          suspended_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          plan?: string
          slug: string
          suspended_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          plan?: string
          slug?: string
          suspended_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          business_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          booking_id: string | null
          business_id: string
          channel: string
          created_at: string
          id: string
          sent_to: string | null
          status: string
          type: string
        }
        Insert: {
          booking_id?: string | null
          business_id: string
          channel?: string
          created_at?: string
          id?: string
          sent_to?: string | null
          status?: string
          type: string
        }
        Update: {
          booking_id?: string | null
          business_id?: string
          channel?: string
          created_at?: string
          id?: string
          sent_to?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          archived_at: string | null
          buffer_after_minutes: number
          buffer_before_minutes: number
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          archived_at: string | null
          avatar_url: string | null
          bio: string | null
          business_id: string
          color_code: string
          created_at: string
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          phone: string | null
          profile_user_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_id: string
          color_code?: string
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_user_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          business_id?: string
          color_code?: string
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          profile_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_services: {
        Row: {
          business_id: string
          created_at: string
          id: string
          service_id: string
          staff_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          service_id: string
          staff_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          service_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_services_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_time_off: {
        Row: {
          business_id: string
          created_at: string
          end_at: string
          id: string
          reason: string | null
          staff_id: string
          start_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_at: string
          id?: string
          reason?: string | null
          staff_id: string
          start_at: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_at?: string
          id?: string
          reason?: string | null
          staff_id?: string
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_time_off_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_time_off_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_working_hours: {
        Row: {
          business_id: string
          end_time: string | null
          id: string
          is_off: boolean
          staff_id: string
          start_time: string | null
          weekday: number
        }
        Insert: {
          business_id: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          staff_id: string
          start_time?: string | null
          weekday: number
        }
        Update: {
          business_id?: string
          end_time?: string | null
          id?: string
          is_off?: boolean
          staff_id?: string
          start_time?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "staff_working_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_working_hours_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _internal_cancel_booking: {
        Args: {
          p_actor_id: string
          p_actor_type: string
          p_booking_id: string
          p_reason?: string
        }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking_by_member: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_booking_by_token: {
        Args: { p_reason?: string; p_token: string }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking: {
        Args: {
          p_business_id: string
          p_customer_id: string
          p_notes?: string
          p_service_id: string
          p_source: string
          p_staff_id: string
          p_start_at: string
          p_timezone: string
        }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reschedule_booking_by_member: {
        Args: { p_booking_id: string; p_new_start_at: string }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reschedule_booking_by_token: {
        Args: { p_new_start_at: string; p_token: string }
        Returns: {
          booking_access_token: string | null
          buffer_after_snapshot: number
          buffer_before_snapshot: number
          business_id: string
          cancel_reason: string | null
          created_at: string
          customer_id: string
          effective_end_at: string
          effective_start_at: string
          end_at: string
          id: string
          notes: string | null
          price_snapshot: number | null
          service_duration_minutes_snapshot: number
          service_id: string
          service_name_snapshot: string
          source: string
          staff_id: string
          staff_name_snapshot: string | null
          start_at: string
          status: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
