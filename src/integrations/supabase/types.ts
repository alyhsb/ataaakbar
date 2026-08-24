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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_recovery_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          note: string | null
          phone: string
          requester_name: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          phone: string
          requester_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          note?: string | null
          phone?: string
          requester_name?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      amount_change_requests: {
        Row: {
          created_at: string
          current_amount: number
          decided_at: string | null
          decided_by: string | null
          donor_id: string
          id: string
          note: string | null
          requested_amount: number
          status: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          decided_at?: string | null
          decided_by?: string | null
          donor_id: string
          id?: string
          note?: string | null
          requested_amount: number
          status?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          decided_at?: string | null
          decided_by?: string | null
          donor_id?: string
          id?: string
          note?: string | null
          requested_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "amount_change_requests_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      amount_history: {
        Row: {
          changed_by: string | null
          created_at: string
          donor_id: string
          id: string
          new_amount: number
          old_amount: number
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          donor_id: string
          id?: string
          new_amount: number
          old_amount: number
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          donor_id?: string
          id?: string
          new_amount?: number
          old_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "amount_history_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          access_code: string | null
          area: string
          created_at: string
          currency: string
          deleted_at: string | null
          donor_code: string | null
          due_day: number
          id: string
          joined_at: string
          last_login_at: string | null
          last_profile_update_at: string | null
          location: string
          mawkib_id: string | null
          membership_status: string
          monthly_amount: number
          name: string
          notes: string | null
          phone: string
          profile_completed: boolean
          user_id: string | null
          username: string | null
        }
        Insert: {
          access_code?: string | null
          area?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          donor_code?: string | null
          due_day?: number
          id?: string
          joined_at?: string
          last_login_at?: string | null
          last_profile_update_at?: string | null
          location?: string
          mawkib_id?: string | null
          membership_status?: string
          monthly_amount?: number
          name: string
          notes?: string | null
          phone?: string
          profile_completed?: boolean
          user_id?: string | null
          username?: string | null
        }
        Update: {
          access_code?: string | null
          area?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          donor_code?: string | null
          due_day?: number
          id?: string
          joined_at?: string
          last_login_at?: string | null
          last_profile_update_at?: string | null
          location?: string
          mawkib_id?: string | null
          membership_status?: string
          monthly_amount?: number
          name?: string
          notes?: string | null
          phone?: string
          profile_completed?: boolean
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donors_mawkib_id_fkey"
            columns: ["mawkib_id"]
            isOneToOne: false
            referencedRelation: "mawakib"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          contributed_on: string
          created_at: string
          currency: string
          donor_id: string
          goal_id: string
          id: string
          notes: string | null
        }
        Insert: {
          amount?: number
          contributed_on?: string
          created_at?: string
          currency?: string
          donor_id: string
          goal_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          contributed_on?: string
          created_at?: string
          currency?: string
          donor_id?: string
          goal_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "mawkib_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      mawakib: {
        Row: {
          area: string
          created_at: string
          description: string
          disabled_at: string | null
          id: string
          name: string
          phone: string
        }
        Insert: {
          area?: string
          created_at?: string
          description?: string
          disabled_at?: string | null
          id?: string
          name: string
          phone?: string
        }
        Update: {
          area?: string
          created_at?: string
          description?: string
          disabled_at?: string | null
          id?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      mawkib_goals: {
        Row: {
          created_at: string
          currency: string
          deadline: string | null
          description: string
          id: string
          image_url: string | null
          mawkib_id: string
          published: boolean
          status: string
          target_amount: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string
          id?: string
          image_url?: string | null
          mawkib_id: string
          published?: boolean
          status?: string
          target_amount?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string
          id?: string
          image_url?: string | null
          mawkib_id?: string
          published?: boolean
          status?: string
          target_amount?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mawkib_goals_mawkib_id_fkey"
            columns: ["mawkib_id"]
            isOneToOne: false
            referencedRelation: "mawakib"
            referencedColumns: ["id"]
          },
        ]
      }
      mawkib_posts: {
        Row: {
          content: string
          created_at: string
          hijri_date: string | null
          id: string
          images: string[]
          mawkib_id: string
          post_date: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          hijri_date?: string | null
          id?: string
          images?: string[]
          mawkib_id: string
          post_date?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          hijri_date?: string | null
          id?: string
          images?: string[]
          mawkib_id?: string
          post_date?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mawkib_posts_mawkib_id_fkey"
            columns: ["mawkib_id"]
            isOneToOne: false
            referencedRelation: "mawakib"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          donor_id: string
          id: string
          kind: string
          read: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          donor_id: string
          id?: string
          kind: string
          read?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          donor_id?: string
          id?: string
          kind?: string
          read?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          donor_id: string
          id: string
          month: number
          notes: string | null
          paid_at: string | null
          status: string
          txn_code: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id: string
          id?: string
          month: number
          notes?: string | null
          paid_at?: string | null
          status?: string
          txn_code?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          donor_id?: string
          id?: string
          month?: number
          notes?: string | null
          paid_at?: string | null
          status?: string
          txn_code?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          location: string | null
          mawkib_id: string | null
          phone: string | null
          status: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          location?: string | null
          mawkib_id?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          location?: string | null
          mawkib_id?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_mawkib_id_fkey"
            columns: ["mawkib_id"]
            isOneToOne: false
            referencedRelation: "mawakib"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_mawkib: { Args: { _mawkib: string }; Returns: boolean }
      current_mawkib_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_mawkib_member: { Args: { _mawkib: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "donor" | "owner"
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
      app_role: ["admin", "donor", "owner"],
    },
  },
} as const
