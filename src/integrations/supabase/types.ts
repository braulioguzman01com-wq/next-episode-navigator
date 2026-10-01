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
      animes: {
        Row: {
          anilist_id: number | null
          banner_url: string | null
          color: string | null
          cover_url: string | null
          created_at: string
          duration: number | null
          episodes: number | null
          genres: string[]
          hidden: boolean
          id: string
          latest_episode: number | null
          latest_episode_at: string | null
          mal_id: number | null
          match_keys: string[]
          next_airing_at: string | null
          next_episode: number | null
          primary_source_id: string | null
          search_text: string
          season: string | null
          start_date: string | null
          status: string | null
          studio: string | null
          synonyms: string[]
          synopsis: string | null
          title: string
          title_english: string | null
          title_native: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          anilist_id?: number | null
          banner_url?: string | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          episodes?: number | null
          genres?: string[]
          hidden?: boolean
          id?: string
          latest_episode?: number | null
          latest_episode_at?: string | null
          mal_id?: number | null
          match_keys?: string[]
          next_airing_at?: string | null
          next_episode?: number | null
          primary_source_id?: string | null
          search_text?: string
          season?: string | null
          start_date?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title: string
          title_english?: string | null
          title_native?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          anilist_id?: number | null
          banner_url?: string | null
          color?: string | null
          cover_url?: string | null
          created_at?: string
          duration?: number | null
          episodes?: number | null
          genres?: string[]
          hidden?: boolean
          id?: string
          latest_episode?: number | null
          latest_episode_at?: string | null
          mal_id?: number | null
          match_keys?: string[]
          next_airing_at?: string | null
          next_episode?: number | null
          primary_source_id?: string | null
          search_text?: string
          season?: string | null
          start_date?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title?: string
          title_english?: string | null
          title_native?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "animes_primary_source_id_fkey"
            columns: ["primary_source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          anime_id: string | null
          created_at: string
          field: string | null
          id: number
          kind: string
          new_value: string | null
          old_value: string | null
          run_id: number | null
          source_id: string | null
        }
        Insert: {
          anime_id?: string | null
          created_at?: string
          field?: string | null
          id?: number
          kind: string
          new_value?: string | null
          old_value?: string | null
          run_id?: number | null
          source_id?: string | null
        }
        Update: {
          anime_id?: string | null
          created_at?: string
          field?: string | null
          id?: number
          kind?: string
          new_value?: string | null
          old_value?: string | null
          run_id?: number | null
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_history_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_history_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sync_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_history_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          aired_at: string | null
          anime_id: string
          created_at: string
          id: string
          number: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          aired_at?: string | null
          anime_id: string
          created_at?: string
          id?: string
          number: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          aired_at?: string | null
          anime_id?: string
          created_at?: string
          id?: string
          number?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          anime_id: string | null
          created_at: string
          id: string
          published_at: string | null
          source_id: string
          title: string
          url: string
        }
        Insert: {
          anime_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          source_id: string
          title: string
          url: string
        }
        Update: {
          anime_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          source_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_items_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_errors: {
        Row: {
          code: string | null
          created_at: string
          id: number
          message: string | null
          site_id: string | null
          url: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: never
          message?: string | null
          site_id?: string | null
          url?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: never
          message?: string | null
          site_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_errors_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "scan_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_sites: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_chapters: number
          last_contents: number
          last_error: string | null
          last_scan_at: string | null
          name: string
          scanning_until: string | null
          status: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_chapters?: number
          last_contents?: number
          last_error?: string | null
          last_scan_at?: string | null
          name: string
          scanning_until?: string | null
          status?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_chapters?: number
          last_contents?: number
          last_error?: string | null
          last_scan_at?: string | null
          name?: string
          scanning_until?: string | null
          status?: string
          url?: string
        }
        Relationships: []
      }
      site_chapters: {
        Row: {
          content_id: string
          created_at: string
          id: string
          lang: string
          number: number
          page_url: string | null
          play_url: string | null
          title: string | null
          updated_at: string
          video_type: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          lang?: string
          number: number
          page_url?: string | null
          play_url?: string | null
          title?: string | null
          updated_at?: string
          video_type?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          lang?: string
          number?: number
          page_url?: string | null
          play_url?: string | null
          title?: string | null
          updated_at?: string
          video_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_chapters_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "site_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      site_contents: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          missing_since: string | null
          page_url: string | null
          site_id: string
          stable_key: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          missing_since?: string | null
          page_url?: string | null
          site_id: string
          stable_key: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          missing_since?: string | null
          page_url?: string | null
          site_id?: string
          stable_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_contents_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "scan_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      source_errors: {
        Row: {
          code: string
          first_seen: string
          id: string
          last_seen: string
          message: string | null
          occurrences: number
          reviewed: boolean
          source_id: string
        }
        Insert: {
          code: string
          first_seen?: string
          id?: string
          last_seen?: string
          message?: string | null
          occurrences?: number
          reviewed?: boolean
          source_id: string
        }
        Update: {
          code?: string
          first_seen?: string
          id?: string
          last_seen?: string
          message?: string | null
          occurrences?: number
          reviewed?: boolean
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_errors_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          consecutive_failures: number
          created_at: string
          feed_url: string | null
          id: string
          integration_method: string
          items_found: number
          kind: string
          last_error: string | null
          last_response_ms: number | null
          last_sync_at: string | null
          name: string
          priority: number
          search_url: string | null
          site_url: string | null
          status: string
          trust: string
        }
        Insert: {
          consecutive_failures?: number
          created_at?: string
          feed_url?: string | null
          id?: string
          integration_method?: string
          items_found?: number
          kind: string
          last_error?: string | null
          last_response_ms?: number | null
          last_sync_at?: string | null
          name: string
          priority?: number
          search_url?: string | null
          site_url?: string | null
          status?: string
          trust?: string
        }
        Update: {
          consecutive_failures?: number
          created_at?: string
          feed_url?: string | null
          id?: string
          integration_method?: string
          items_found?: number
          kind?: string
          last_error?: string | null
          last_response_ms?: number | null
          last_sync_at?: string | null
          name?: string
          priority?: number
          search_url?: string | null
          site_url?: string | null
          status?: string
          trust?: string
        }
        Relationships: []
      }
      sync_lock: {
        Row: {
          id: number
          locked_until: string
        }
        Insert: {
          id?: number
          locked_until?: string
        }
        Update: {
          id?: number
          locked_until?: string
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          animes_found: number
          animes_new: number
          changes: number
          duration_ms: number | null
          episodes_new: number
          finished_at: string | null
          id: number
          log: Json
          merged: number
          sources_failed: number
          sources_ok: number
          sources_total: number
          stage: string
          started_at: string
          status: string
          trigger: string
        }
        Insert: {
          animes_found?: number
          animes_new?: number
          changes?: number
          duration_ms?: number | null
          episodes_new?: number
          finished_at?: string | null
          id?: number
          log?: Json
          merged?: number
          sources_failed?: number
          sources_ok?: number
          sources_total?: number
          stage?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Update: {
          animes_found?: number
          animes_new?: number
          changes?: number
          duration_ms?: number | null
          episodes_new?: number
          finished_at?: string | null
          id?: number
          log?: Json
          merged?: number
          sources_failed?: number
          sources_ok?: number
          sources_total?: number
          stage?: string
          started_at?: string
          status?: string
          trigger?: string
        }
        Relationships: []
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
      watch_links: {
        Row: {
          anime_id: string
          created_at: string
          episode_id: string | null
          id: string
          label: string | null
          source_id: string
          url: string
        }
        Insert: {
          anime_id: string
          created_at?: string
          episode_id?: string | null
          id?: string
          label?: string | null
          source_id: string
          url: string
        }
        Update: {
          anime_id?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          label?: string | null
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_links_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_links_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_sync_lock: { Args: { _seconds: number }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_sync_lock: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
