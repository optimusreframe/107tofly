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
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      certificates: {
        Row: {
          display_name: string
          final_score: number
          hours_estimated: number
          id: string
          issued_at: string
          modules_completed: number
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          display_name: string
          final_score: number
          hours_estimated?: number
          id?: string
          issued_at?: string
          modules_completed: number
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          display_name?: string
          final_score?: number
          hours_estimated?: number
          id?: string
          issued_at?: string
          modules_completed?: number
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      concepts: {
        Row: {
          body_md: string | null
          created_at: string
          id: string
          locale: string
          order_index: number
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          id?: string
          locale?: string
          order_index?: number
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          body_md?: string | null
          created_at?: string
          id?: string
          locale?: string
          order_index?: number
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "learning_units"
            referencedColumns: ["id"]
          },
        ]
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
      exercises: {
        Row: {
          answer: Json
          concept_id: string
          created_at: string
          difficulty: number
          explanation: string | null
          id: string
          kind: Database["public"]["Enums"]["exercise_kind"]
          locale: string
          payload: Json
          updated_at: string
        }
        Insert: {
          answer?: Json
          concept_id: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          kind: Database["public"]["Enums"]["exercise_kind"]
          locale?: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          answer?: Json
          concept_id?: string
          created_at?: string
          difficulty?: number
          explanation?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["exercise_kind"]
          locale?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
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
      landing_sections: {
        Row: {
          archived_at: string | null
          body: string | null
          content: Json
          created_at: string
          cta_href: string | null
          cta_label: string | null
          id: string
          image_url: string | null
          locale: string
          published_at: string | null
          section_key: string
          sort_order: number
          status: string
          subtitle: string | null
          title: string | null
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
          body?: string | null
          content?: Json
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string | null
          locale?: string
          published_at?: string | null
          section_key: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
          body?: string | null
          content?: Json
          created_at?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          image_url?: string | null
          locale?: string
          published_at?: string | null
          section_key?: string
          sort_order?: number
          status?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      learning_units: {
        Row: {
          created_at: string
          id: string
          lesson_id: string | null
          locale: string
          order_index: number
          slug: string
          status: Database["public"]["Enums"]["learning_unit_status"]
          summary: string | null
          title: string
          translation_group_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          locale?: string
          order_index?: number
          slug: string
          status?: Database["public"]["Enums"]["learning_unit_status"]
          summary?: string | null
          title: string
          translation_group_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string | null
          locale?: string
          order_index?: number
          slug?: string
          status?: Database["public"]["Enums"]["learning_unit_status"]
          summary?: string | null
          title?: string
          translation_group_id?: string
          updated_at?: string
        }
        Relationships: []
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
      lesson_quiz_progress: {
        Row: {
          attempts_count: number
          best_score: number
          created_at: string
          id: string
          last_attempt_at: string | null
          lesson_id: string | null
          lesson_slug: string
          passed: boolean
          updated_at: string
          user_id: string
          xp_awarded: boolean
        }
        Insert: {
          attempts_count?: number
          best_score?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          lesson_id?: string | null
          lesson_slug: string
          passed?: boolean
          updated_at?: string
          user_id: string
          xp_awarded?: boolean
        }
        Update: {
          attempts_count?: number
          best_score?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          lesson_id?: string | null
          lesson_slug?: string
          passed?: boolean
          updated_at?: string
          user_id?: string
          xp_awarded?: boolean
        }
        Relationships: []
      }
      lessons: {
        Row: {
          ai_translation_metadata: Json
          archived_at: string | null
          body_md: string
          created_at: string
          day: number
          est_minutes: number
          id: string
          locale: string
          media_assets: Json
          order_index: number
          published_at: string | null
          slug: string
          source_lesson_id: string | null
          sources: Json
          status: string
          summary: string
          title: string
          topic: Database["public"]["Enums"]["question_topic"] | null
          translated_from_locale: string | null
          translation_group_id: string | null
          translation_status: string
          updated_at: string
          updated_by: string | null
          version: number
          week: number
        }
        Insert: {
          ai_translation_metadata?: Json
          archived_at?: string | null
          body_md: string
          created_at?: string
          day: number
          est_minutes?: number
          id?: string
          locale?: string
          media_assets?: Json
          order_index: number
          published_at?: string | null
          slug: string
          source_lesson_id?: string | null
          sources?: Json
          status?: string
          summary: string
          title: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          translated_from_locale?: string | null
          translation_group_id?: string | null
          translation_status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          week: number
        }
        Update: {
          ai_translation_metadata?: Json
          archived_at?: string | null
          body_md?: string
          created_at?: string
          day?: number
          est_minutes?: number
          id?: string
          locale?: string
          media_assets?: Json
          order_index?: number
          published_at?: string | null
          slug?: string
          source_lesson_id?: string | null
          sources?: Json
          status?: string
          summary?: string
          title?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          translated_from_locale?: string | null
          translation_group_id?: string | null
          translation_status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_source_lesson_fk"
            columns: ["source_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery: {
        Row: {
          concept_id: string
          correct_streak: number
          created_at: string
          last_seen_at: string | null
          level: number
          next_due_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concept_id: string
          correct_streak?: number
          created_at?: string
          last_seen_at?: string | null
          level?: number
          next_due_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concept_id?: string
          correct_streak?: number
          created_at?: string
          last_seen_at?: string | null
          level?: number
          next_due_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          locale: string | null
          metadata: Json
          mime_type: string | null
          owner_id: string | null
          public_url: string | null
          status: string
          storage_path: string | null
          tags: string[]
          updated_at: string
          usage_context: string | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          id?: string
          locale?: string | null
          metadata?: Json
          mime_type?: string | null
          owner_id?: string | null
          public_url?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          usage_context?: string | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          locale?: string | null
          metadata?: Json
          mime_type?: string | null
          owner_id?: string | null
          public_url?: string | null
          status?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          usage_context?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_goal_minutes: number | null
          display_name: string | null
          experience_level: string | null
          id: string
          locale: string | null
          membership_plan: string
          membership_status: string
          preferred_language: string | null
          preferred_theme: string | null
          study_goal_date: string | null
          study_plan: string | null
          target_exam_date: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          display_name?: string | null
          experience_level?: string | null
          id: string
          locale?: string | null
          membership_plan?: string
          membership_status?: string
          preferred_language?: string | null
          preferred_theme?: string | null
          study_goal_date?: string | null
          study_plan?: string | null
          target_exam_date?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_goal_minutes?: number | null
          display_name?: string | null
          experience_level?: string | null
          id?: string
          locale?: string | null
          membership_plan?: string
          membership_status?: string
          preferred_language?: string | null
          preferred_theme?: string | null
          study_goal_date?: string | null
          study_plan?: string | null
          target_exam_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      progress: {
        Row: {
          last_activity_date: string | null
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
          last_activity_date?: string | null
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
          last_activity_date?: string | null
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
          ai_translation_metadata: Json
          archived_at: string | null
          common_mistake: string | null
          content_hash: string
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string
          id: string
          locale: string
          options: Json
          published_at: string | null
          question: string
          source: string
          source_question_id: string | null
          status: string
          tags: string[] | null
          topic: Database["public"]["Enums"]["question_topic"]
          translated_from_locale: string | null
          translation_group_id: string | null
          translation_status: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          acs_code: string
          ai_translation_metadata?: Json
          archived_at?: string | null
          common_mistake?: string | null
          content_hash: string
          correct_index: number
          created_at?: string
          difficulty?: string
          explanation: string
          id?: string
          locale?: string
          options: Json
          published_at?: string | null
          question: string
          source: string
          source_question_id?: string | null
          status?: string
          tags?: string[] | null
          topic: Database["public"]["Enums"]["question_topic"]
          translated_from_locale?: string | null
          translation_group_id?: string | null
          translation_status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          acs_code?: string
          ai_translation_metadata?: Json
          archived_at?: string | null
          common_mistake?: string | null
          content_hash?: string
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string
          id?: string
          locale?: string
          options?: Json
          published_at?: string | null
          question?: string
          source?: string
          source_question_id?: string | null
          status?: string
          tags?: string[] | null
          topic?: Database["public"]["Enums"]["question_topic"]
          translated_from_locale?: string | null
          translation_group_id?: string | null
          translation_status?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
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
          attempt_type: string | null
          correct: number
          duration_sec: number | null
          finished_at: string | null
          id: string
          lesson_id: string | null
          lesson_slug: string | null
          mode: string
          score: number
          started_at: string
          topic: Database["public"]["Enums"]["question_topic"] | null
          total: number
          user_id: string
        }
        Insert: {
          attempt_type?: string | null
          correct?: number
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_slug?: string | null
          mode?: string
          score?: number
          started_at?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          total?: number
          user_id: string
        }
        Update: {
          attempt_type?: string | null
          correct?: number
          duration_sec?: number | null
          finished_at?: string | null
          id?: string
          lesson_id?: string | null
          lesson_slug?: string | null
          mode?: string
          score?: number
          started_at?: string
          topic?: Database["public"]["Enums"]["question_topic"] | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      session_events: {
        Row: {
          concept_id: string | null
          correct: boolean | null
          created_at: string
          exercise_id: string | null
          id: string
          kind: Database["public"]["Enums"]["session_event_kind"]
          latency_ms: number | null
          note: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          concept_id?: string | null
          correct?: boolean | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["session_event_kind"]
          latency_ms?: number | null
          note?: string | null
          unit_id?: string | null
          user_id: string
        }
        Update: {
          concept_id?: string | null
          correct?: boolean | null
          created_at?: string
          exercise_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["session_event_kind"]
          latency_ms?: number | null
          note?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_events_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "learning_units"
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
      exercise_kind: "mcq" | "cloze" | "order" | "match"
      learning_unit_status: "draft" | "review" | "published" | "archived"
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
      session_event_kind: "start" | "answer" | "end" | "feedback"
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
      exercise_kind: ["mcq", "cloze", "order", "match"],
      learning_unit_status: ["draft", "review", "published", "archived"],
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
      session_event_kind: ["start", "answer", "end", "feedback"],
    },
  },
} as const
