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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_sub_courses: {
        Row: {
          configuration_id: string
          created_at: string
          id: string
          sequence: number
          sub_course_id: string
        }
        Insert: {
          configuration_id: string
          created_at?: string
          id?: string
          sequence: number
          sub_course_id: string
        }
        Update: {
          configuration_id?: string
          created_at?: string
          id?: string
          sequence?: number
          sub_course_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "configuration_sub_courses_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "course_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_sub_courses_sub_course_id_fkey"
            columns: ["sub_course_id"]
            isOneToOne: false
            referencedRelation: "sub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_bookmarks: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_bookmarks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_configurations: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          total_holes: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          total_holes?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          total_holes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_configurations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_reviews: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          rating: number
          review_text: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          address: string | null
          available_tee_types: Database["public"]["Enums"]["tee_type"][] | null
          average_rating: number | null
          course_data: Json | null
          created_at: string | null
          description: string | null
          golf_course_api_id: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          is_active: boolean
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          total_holes: number | null
          total_par: number
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          available_tee_types?: Database["public"]["Enums"]["tee_type"][] | null
          average_rating?: number | null
          course_data?: Json | null
          created_at?: string | null
          description?: string | null
          golf_course_api_id?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          total_holes?: number | null
          total_par: number
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          available_tee_types?: Database["public"]["Enums"]["tee_type"][] | null
          average_rating?: number | null
          course_data?: Json | null
          created_at?: string | null
          description?: string | null
          golf_course_api_id?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          total_holes?: number | null
          total_par?: number
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string | null
          friend_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hole_scores: {
        Row: {
          created_at: string | null
          fairway_hit: boolean | null
          green_in_regulation: boolean | null
          hole_id: string
          id: string
          penalties: number | null
          putts: number | null
          round_id: string
          sand_saves: number | null
          strokes: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fairway_hit?: boolean | null
          green_in_regulation?: boolean | null
          hole_id: string
          id?: string
          penalties?: number | null
          putts?: number | null
          round_id: string
          sand_saves?: number | null
          strokes: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fairway_hit?: boolean | null
          green_in_regulation?: boolean | null
          hole_id?: string
          id?: string
          penalties?: number | null
          putts?: number | null
          round_id?: string
          sand_saves?: number | null
          strokes?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hole_scores_hole_id_fkey"
            columns: ["hole_id"]
            isOneToOne: false
            referencedRelation: "holes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hole_scores_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      holes: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          distance_meters: number | null
          distance_yards: number | null
          green_back_distance: number | null
          green_front_distance: number | null
          green_middle_distance: number | null
          handicap_index: number | null
          hazards: Json | null
          hole_coordinates: Json | null
          hole_number: number
          id: string
          notes: string | null
          par: number
          pin_back_latitude: number | null
          pin_back_longitude: number | null
          pin_front_latitude: number | null
          pin_front_longitude: number | null
          pin_latitude: number | null
          pin_longitude: number | null
          sub_course_id: string | null
          target_latitude: number | null
          target_longitude: number | null
          tee_latitude: number | null
          tee_longitude: number | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          distance_meters?: number | null
          distance_yards?: number | null
          green_back_distance?: number | null
          green_front_distance?: number | null
          green_middle_distance?: number | null
          handicap_index?: number | null
          hazards?: Json | null
          hole_coordinates?: Json | null
          hole_number: number
          id?: string
          notes?: string | null
          par: number
          pin_back_latitude?: number | null
          pin_back_longitude?: number | null
          pin_front_latitude?: number | null
          pin_front_longitude?: number | null
          pin_latitude?: number | null
          pin_longitude?: number | null
          sub_course_id?: string | null
          target_latitude?: number | null
          target_longitude?: number | null
          tee_latitude?: number | null
          tee_longitude?: number | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          distance_meters?: number | null
          distance_yards?: number | null
          green_back_distance?: number | null
          green_front_distance?: number | null
          green_middle_distance?: number | null
          handicap_index?: number | null
          hazards?: Json | null
          hole_coordinates?: Json | null
          hole_number?: number
          id?: string
          notes?: string | null
          par?: number
          pin_back_latitude?: number | null
          pin_back_longitude?: number | null
          pin_front_latitude?: number | null
          pin_front_longitude?: number | null
          pin_latitude?: number | null
          pin_longitude?: number | null
          sub_course_id?: string | null
          target_latitude?: number | null
          target_longitude?: number | null
          tee_latitude?: number | null
          tee_longitude?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holes_sub_course_id_fkey"
            columns: ["sub_course_id"]
            isOneToOne: false
            referencedRelation: "sub_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboards: {
        Row: {
          best_score: number
          course_id: string
          created_at: string | null
          date_achieved: string
          id: string
          round_id: string
          user_id: string
        }
        Insert: {
          best_score: number
          course_id: string
          created_at?: string | null
          date_achieved: string
          id?: string
          round_id: string
          user_id: string
        }
        Update: {
          best_score?: number
          course_id?: string
          created_at?: string | null
          date_achieved?: string
          id?: string
          round_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboards_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          related_post_id: string | null
          related_user_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_post_id?: string | null
          related_user_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_post_id?: string | null
          related_user_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_post_id_fkey"
            columns: ["related_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          comments_count: number | null
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          image_urls: Json | null
          likes_count: number | null
          round_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          likes_count?: number | null
          round_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          image_urls?: Json | null
          likes_count?: number | null
          round_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          handicap: number | null
          id: string
          membership: Database["public"]["Enums"]["membership_type"] | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          handicap?: number | null
          id: string
          membership?: Database["public"]["Enums"]["membership_type"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          handicap?: number | null
          id?: string
          membership?: Database["public"]["Enums"]["membership_type"] | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      rounds: {
        Row: {
          configuration_id: string | null
          course_id: string
          created_at: string | null
          current_hole: number | null
          date_played: string
          id: string
          is_completed: boolean | null
          mode: Database["public"]["Enums"]["play_mode"] | null
          notes: string | null
          total_score: number | null
          updated_at: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["round_visibility"] | null
          weather_condition: string | null
        }
        Insert: {
          configuration_id?: string | null
          course_id: string
          created_at?: string | null
          current_hole?: number | null
          date_played?: string
          id?: string
          is_completed?: boolean | null
          mode?: Database["public"]["Enums"]["play_mode"] | null
          notes?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["round_visibility"] | null
          weather_condition?: string | null
        }
        Update: {
          configuration_id?: string | null
          course_id?: string
          created_at?: string | null
          current_hole?: number | null
          date_played?: string
          id?: string
          is_completed?: boolean | null
          mode?: Database["public"]["Enums"]["play_mode"] | null
          notes?: string | null
          total_score?: number | null
          updated_at?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["round_visibility"] | null
          weather_condition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rounds_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "course_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rounds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shots: {
        Row: {
          club_used: string | null
          created_at: string | null
          distance_to_hole_after: number | null
          distance_to_hole_before: number | null
          hole_id: string
          id: string
          lie_type: string | null
          round_id: string
          shot_number: number
          strokes_gained_value: number | null
        }
        Insert: {
          club_used?: string | null
          created_at?: string | null
          distance_to_hole_after?: number | null
          distance_to_hole_before?: number | null
          hole_id: string
          id?: string
          lie_type?: string | null
          round_id: string
          shot_number: number
          strokes_gained_value?: number | null
        }
        Update: {
          club_used?: string | null
          created_at?: string | null
          distance_to_hole_after?: number | null
          distance_to_hole_before?: number | null
          hole_id?: string
          id?: string
          lie_type?: string | null
          round_id?: string
          shot_number?: number
          strokes_gained_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shots_hole_id_fkey"
            columns: ["hole_id"]
            isOneToOne: false
            referencedRelation: "holes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shots_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_courses: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          end_hole: number
          id: string
          name: string
          sequence: number
          start_hole: number
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          end_hole: number
          id?: string
          name: string
          sequence: number
          start_hole: number
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          end_hole?: number
          id?: string
          name?: string
          sequence?: number
          start_hole?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tee_positions: {
        Row: {
          created_at: string | null
          distance_to_pin: number
          elevation: number | null
          hole_id: string
          id: string
          latitude: number
          longitude: number
          tee_type: Database["public"]["Enums"]["tee_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distance_to_pin: number
          elevation?: number | null
          hole_id: string
          id?: string
          latitude: number
          longitude: number
          tee_type: Database["public"]["Enums"]["tee_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distance_to_pin?: number
          elevation?: number | null
          hole_id?: string
          id?: string
          latitude?: number
          longitude?: number
          tee_type?: Database["public"]["Enums"]["tee_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tee_positions_hole_id_fkey"
            columns: ["hole_id"]
            isOneToOne: false
            referencedRelation: "holes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      decrement_comments_count: {
        Args: { post_id: string }
        Returns: undefined
      }
      decrement_likes_count: { Args: { post_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_comments_count: {
        Args: { post_id: string }
        Returns: undefined
      }
      increment_likes_count: { Args: { post_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      membership_type: "free" | "premium"
      notification_type:
        | "friend_request"
        | "friend_accept"
        | "comment"
        | "like"
        | "round_shared"
      play_mode: "classic" | "strokes_gained"
      round_visibility: "everyone" | "friends" | "private"
      tee_type: "black" | "blue" | "white" | "yellow" | "red"
      user_role: "user" | "admin"
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
      membership_type: ["free", "premium"],
      notification_type: [
        "friend_request",
        "friend_accept",
        "comment",
        "like",
        "round_shared",
      ],
      play_mode: ["classic", "strokes_gained"],
      round_visibility: ["everyone", "friends", "private"],
      tee_type: ["black", "blue", "white", "yellow", "red"],
      user_role: ["user", "admin"],
    },
  },
} as const
