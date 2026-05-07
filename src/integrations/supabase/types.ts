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
      certificates: {
        Row: {
          display_name: string
          final_score: number
          hours_estimated: number
          id: string
          issued_at: string
          modules_completed: number
          user_id: string
        }
        Insert: {
          display_name: string
          final_score: number
          hours_estimated?: number
          id?: string
          issued_at?: string
          modules_completed: number
          user_id: string
        }
        Update: {
          display_name?: string
          final_score?: number
          hours_estimated?: number
          id?: string
          issued_at?: string
          modules_completed?: number
          user_id?: string
        }
        Relationships: []
      }
      exam_simulations: {
        Row: {
          correct: number
          domain_breakdown: Json | null
          duration_sec: number | null
          finished_at: string | null
          id: string
          score: number
          started_at: string
          total: number
          user_id: string
        }
        Insert: {
          correct?: number
          domain_breakdown?: Json | null
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          score?: number
          started_at?: string
          total?: number
          user_id: string
        }
        Update: {
          correct?: number
          domain_breakdown?: Json | null
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          score?: number
          started_at?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          due_date: string
          ease: number
          front: string
          id: string
          interval_days: number
          last_reviewed_at: string | null
          question_id: string | null
          repetitions: number
          topic: Database["public"]["Enums"]["question_topic"] | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          due_date?: string
          ease?: number
          front: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          question_id?: string | null
          repetitions?: number
          topic?: Database["public"]["Enums"]["question_topic"] | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          due_date?: string
          ease?: number
          front?: string
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          question_id?: string | null
          repetitions?: number
          topic?: Database["public"]["Enums"]["question_topic"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_slug: string
          topic: Database["public"]["Enums"]["question_topic"] | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_slug: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_slug?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          body_md: string
          created_at: string
          day: number
          est_minutes: number
          order_index: number
          slug: string
          sources: Json
          summary: string
          title: string
          topic: Database["public"]["Enums"]["question_topic"] | null
          week: number
        }
        Insert: {
          body_md: string
          created_at?: string
          day: number
          est_minutes?: number
          order_index: number
          slug: string
          sources?: Json
          summary: string
          title: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          week: number
        }
        Update: {
          body_md?: string
          created_at?: string
          day?: number
          est_minutes?: number
          order_index?: number
          slug?: string
          sources?: Json
          summary?: string
          title?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          week?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          experience_level: string | null
          id: string
          locale: string | null
          study_goal_date: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id: string
          locale?: string | null
          study_goal_date?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id?: string
          locale?: string | null
          study_goal_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          practice_pct: number
          readiness: number
          review_pct: number
          streak: number
          study_pct: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          practice_pct?: number
          readiness?: number
          review_pct?: number
          streak?: number
          study_pct?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          practice_pct?: number
          readiness?: number
          review_pct?: number
          streak?: number
          study_pct?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      questions: {
        Row: {
          acs_code: string
          common_mistake: string | null
          content_hash: string
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          options: Json
          question: string
          source: string
          tags: string[] | null
          topic: Database["public"]["Enums"]["question_topic"]
        }
        Insert: {
          acs_code: string
          common_mistake?: string | null
          content_hash: string
          correct_index: number
          created_at?: string
          difficulty?: string
          explanation: string
          id?: string
          options: Json
          question: string
          source: string
          tags?: string[] | null
          topic: Database["public"]["Enums"]["question_topic"]
        }
        Update: {
          acs_code?: string
          common_mistake?: string | null
          content_hash?: string
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          options?: Json
          question?: string
          source?: string
          tags?: string[] | null
          topic?: Database["public"]["Enums"]["question_topic"]
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number
          time_ms: number | null
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct: boolean
          question_id: string
          selected_index: number
          time_ms?: number | null
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number
          time_ms?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          correct: number
          duration_sec: number | null
          finished_at: string | null
          id: string
          mode: string
          score: number
          started_at: string
          topic: Database["public"]["Enums"]["question_topic"] | null
          total: number
          user_id: string
        }
        Insert: {
          correct?: number
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          mode?: string
          score?: number
          started_at?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          total?: number
          user_id: string
        }
        Update: {
          correct?: number
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          mode?: string
          score?: number
          started_at?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          total?: number
          user_id?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "admin" | "content_manager" | "support"
      question_topic:
        | "regulations"
        | "airspace"
        | "sectional"
        | "weather"
        | "performance"
        | "operations"
        | "adm"
        | "emergencies"
        | "remote_id"
        | "maintenance"
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
      app_role: ["student", "admin", "content_manager", "support"],
      question_topic: [
        "regulations",
        "airspace",
        "sectional",
        "weather",
        "performance",
        "operations",
        "adm",
        "emergencies",
        "remote_id",
        "maintenance",
      ],
    },
  },
} as const
