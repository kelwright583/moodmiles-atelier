export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_suggestions: {
        Row: {
          booking_url: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_promoted: boolean
          location: string | null
          name: string
          price_from: string | null
          price_level: string | null
          promoted_by: string | null
          rating: number | null
          source_url: string | null
          trip_id: string
        }
        Insert: {
          booking_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_promoted?: boolean
          location?: string | null
          name: string
          price_from?: string | null
          price_level?: string | null
          promoted_by?: string | null
          rating?: number | null
          source_url?: string | null
          trip_id: string
        }
        Update: {
          booking_url?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_promoted?: boolean
          location?: string | null
          name?: string
          price_from?: string | null
          price_level?: string | null
          promoted_by?: string | null
          rating?: number | null
          source_url?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_suggestions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          brand: string | null
          category: string | null
          color: string | null
          created_at: string
          currency: string | null
          id: string
          image_url: string | null
          in_stock: boolean
          is_rental: boolean
          is_resale: boolean
          last_synced: string | null
          metadata: Json | null
          name: string | null
          price: string | null
          product_id: string | null
          product_url: string | null
          affiliate_url: string | null
          region: string | null
          source: string | null
          tags: Json | null
          title: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_rental?: boolean
          is_resale?: boolean
          last_synced?: string | null
          metadata?: Json | null
          name?: string | null
          price?: string | null
          product_id?: string | null
          product_url?: string | null
          affiliate_url?: string | null
          region?: string | null
          source?: string | null
          tags?: Json | null
          title?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          color?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_rental?: boolean
          is_resale?: boolean
          last_synced?: string | null
          metadata?: Json | null
          name?: string | null
          price?: string | null
          product_id?: string | null
          product_url?: string | null
          affiliate_url?: string | null
          region?: string | null
          source?: string | null
          tags?: Json | null
          title?: string | null
        }
        Relationships: []
      }
      board_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          notes: string | null
          order_index: number | null
          pinned_by: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          order_index?: number | null
          pinned_by?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          order_index?: number | null
          pinned_by?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      destination_briefings: {
        Row: {
          briefing_updated_at: string | null
          climate_notes: string | null
          connectivity_sim: string | null
          connectivity_vpn: string | null
          continent: string | null
          country: string
          created_at: string
          cultural_bargaining: string | null
          cultural_calendar: string | null
          cultural_greetings: string | null
          cultural_taboos: string | null
          destination: string
          entry_customs: string | null
          entry_passport: string | null
          entry_visa: string | null
          health_altitude: string | null
          health_malaria: string | null
          health_uv: string | null
          health_vaccinations: string | null
          health_water: string | null
          id: string
          legal_dresscode_law: string | null
          legal_drugs: string | null
          legal_lgbt: string | null
          legal_photography: string | null
          money_atm_safety: string | null
          money_cash_culture: string | null
          money_tipping: string | null
          safety_areas_avoid: string | null
          safety_emergency_numbers: string | null
          safety_scams: string | null
        }
        Insert: {
          briefing_updated_at?: string | null
          climate_notes?: string | null
          connectivity_sim?: string | null
          connectivity_vpn?: string | null
          continent?: string | null
          country: string
          created_at?: string
          cultural_bargaining?: string | null
          cultural_calendar?: string | null
          cultural_greetings?: string | null
          cultural_taboos?: string | null
          destination: string
          entry_customs?: string | null
          entry_passport?: string | null
          entry_visa?: string | null
          health_altitude?: string | null
          health_malaria?: string | null
          health_uv?: string | null
          health_vaccinations?: string | null
          health_water?: string | null
          id?: string
          legal_dresscode_law?: string | null
          legal_drugs?: string | null
          legal_lgbt?: string | null
          legal_photography?: string | null
          money_atm_safety?: string | null
          money_cash_culture?: string | null
          money_tipping?: string | null
          safety_areas_avoid?: string | null
          safety_emergency_numbers?: string | null
          safety_scams?: string | null
        }
        Update: {
          briefing_updated_at?: string | null
          climate_notes?: string | null
          connectivity_sim?: string | null
          connectivity_vpn?: string | null
          continent?: string | null
          country?: string
          created_at?: string
          cultural_bargaining?: string | null
          cultural_calendar?: string | null
          cultural_greetings?: string | null
          cultural_taboos?: string | null
          destination?: string
          entry_customs?: string | null
          entry_passport?: string | null
          entry_visa?: string | null
          health_altitude?: string | null
          health_malaria?: string | null
          health_uv?: string | null
          health_vaccinations?: string | null
          health_water?: string | null
          id?: string
          legal_dresscode_law?: string | null
          legal_drugs?: string | null
          legal_lgbt?: string | null
          legal_photography?: string | null
          money_atm_safety?: string | null
          money_cash_culture?: string | null
          money_tipping?: string | null
          safety_areas_avoid?: string | null
          safety_emergency_numbers?: string | null
          safety_scams?: string | null
        }
        Relationships: []
      }
      dress_code_alerts: {
        Row: {
          alert_message: string
          created_at: string
          event_id: string | null
          id: string
          outfit_suggestion_id: string | null
          severity: string | null
          trip_id: string
        }
        Insert: {
          alert_message: string
          created_at?: string
          event_id?: string | null
          id?: string
          outfit_suggestion_id?: string | null
          severity?: string | null
          trip_id: string
        }
        Update: {
          alert_message?: string
          created_at?: string
          event_id?: string | null
          id?: string
          outfit_suggestion_id?: string | null
          severity?: string | null
          trip_id?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      event_looks: {
        Row: {
          created_at: string
          event_id: string
          id: string
          image_url: string | null
          outfit_suggestion_id: string | null
          trip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          image_url?: string | null
          outfit_suggestion_id?: string | null
          trip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          image_url?: string | null
          outfit_suggestion_id?: string | null
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      flights: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_city: string | null
          arrival_datetime: string | null
          booking_url: string | null
          confirmation_number: string | null
          created_at: string
          departure_airport: string | null
          departure_city: string | null
          departure_datetime: string | null
          document_url: string | null
          flight_number: string | null
          id: string
          is_shared: boolean
          notes: string | null
          order_index: number
          trip_id: string
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_city?: string | null
          arrival_datetime?: string | null
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_city?: string | null
          departure_datetime?: string | null
          document_url?: string | null
          flight_number?: string | null
          id?: string
          is_shared?: boolean
          notes?: string | null
          order_index?: number
          trip_id: string
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_city?: string | null
          arrival_datetime?: string | null
          booking_url?: string | null
          confirmation_number?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_city?: string | null
          departure_datetime?: string | null
          document_url?: string | null
          flight_number?: string | null
          id?: string
          is_shared?: boolean
          notes?: string | null
          order_index?: number
          trip_id?: string
        }
        Relationships: []
      }
      imported_bookings: {
        Row: {
          event_id: string | null
          id: string
          parsed_data: Json | null
          parsed_type: string | null
          raw_email: string | null
          received_at: string
          status: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          event_id?: string | null
          id?: string
          parsed_data?: Json | null
          parsed_type?: string | null
          raw_email?: string | null
          received_at?: string
          status?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          event_id?: string | null
          id?: string
          parsed_data?: Json | null
          parsed_type?: string | null
          raw_email?: string | null
          received_at?: string
          status?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          trip_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          trip_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          trip_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outfit_suggestions: {
        Row: {
          created_at: string
          description: string | null
          enriched_items: Json | null
          id: string
          image_url: string | null
          items: Json
          occasion: string | null
          outfit_event_id: string | null
          pinned: boolean
          price: string | null
          product_url: string | null
          source: string | null
          store: string | null
          title: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enriched_items?: Json | null
          id?: string
          image_url?: string | null
          items?: Json
          occasion?: string | null
          outfit_event_id?: string | null
          pinned?: boolean
          price?: string | null
          product_url?: string | null
          source?: string | null
          store?: string | null
          title: string
          trip_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enriched_items?: Json | null
          id?: string
          image_url?: string | null
          items?: Json
          occasion?: string | null
          outfit_event_id?: string | null
          pinned?: boolean
          price?: string | null
          product_url?: string | null
          source?: string | null
          store?: string | null
          title?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outfit_suggestions_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_packed: boolean | null
          name: string
          order_index: number | null
          quantity: number | null
          trip_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_packed?: boolean | null
          name: string
          order_index?: number | null
          quantity?: number | null
          trip_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_packed?: boolean | null
          name?: string
          order_index?: number | null
          quantity?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          option_text: string
          order_index: number
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_text: string
          order_index?: number
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          option_text?: string
          order_index?: number
          poll_id?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          handle: string | null
          handle_set: boolean
          home_city: string | null
          id: string
          import_token: string | null
          luggage_size: string | null
          name: string | null
          nationality: string | null
          onboarding_completed: boolean
          profile_completion_score: number
          style_profile: string[] | null
          style_vibe: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          handle?: string | null
          handle_set?: boolean
          home_city?: string | null
          id?: string
          import_token?: string | null
          luggage_size?: string | null
          name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean
          profile_completion_score?: number
          style_profile?: string[] | null
          style_vibe?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          handle?: string | null
          handle_set?: boolean
          home_city?: string | null
          id?: string
          import_token?: string | null
          luggage_size?: string | null
          name?: string | null
          nationality?: string | null
          onboarding_completed?: boolean
          profile_completion_score?: number
          style_profile?: string[] | null
          style_vibe?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles_handle_history: {
        Row: {
          changed_at: string
          id: string
          new_handle: string | null
          old_handle: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_handle?: string | null
          old_handle?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_handle?: string | null
          old_handle?: string | null
          user_id?: string
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          spotify_avatar_url: string | null
          spotify_display_name: string | null
          spotify_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          spotify_avatar_url?: string | null
          spotify_display_name?: string | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          spotify_avatar_url?: string | null
          spotify_display_name?: string | null
          spotify_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_collaborators: {
        Row: {
          created_at: string
          id: string
          invite_token: string | null
          invited_by: string | null
          invited_email: string | null
          role: string
          status: string
          trip_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          role?: string
          status?: string
          trip_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_by?: string | null
          invited_email?: string | null
          role?: string
          status?: string
          trip_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trip_events: {
        Row: {
          baggage_claim: string | null
          booking_reference: string | null
          booking_status: string | null
          booking_url: string | null
          category: string | null
          cost_per_person: number | null
          created_at: string
          currency: string | null
          dress_code: string | null
          event_date: string | null
          event_name: string
          event_time: string | null
          event_type: string | null
          flight_number: string | null
          flight_status: string | null
          flight_status_updated_at: string | null
          gate: string | null
          id: string
          is_pinned: boolean | null
          location: string | null
          notes: string | null
          share_token: string | null
          terminal: string | null
          trip_id: string
          venue_address: string | null
          venue_name: string | null
          venue_place_id: string | null
        }
        Insert: {
          baggage_claim?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          booking_url?: string | null
          category?: string | null
          cost_per_person?: number | null
          created_at?: string
          currency?: string | null
          dress_code?: string | null
          event_date?: string | null
          event_name: string
          event_time?: string | null
          event_type?: string | null
          flight_number?: string | null
          flight_status?: string | null
          flight_status_updated_at?: string | null
          gate?: string | null
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          notes?: string | null
          share_token?: string | null
          terminal?: string | null
          trip_id: string
          venue_address?: string | null
          venue_name?: string | null
          venue_place_id?: string | null
        }
        Update: {
          baggage_claim?: string | null
          booking_reference?: string | null
          booking_status?: string | null
          booking_url?: string | null
          category?: string | null
          cost_per_person?: number | null
          created_at?: string
          currency?: string | null
          dress_code?: string | null
          event_date?: string | null
          event_name?: string
          event_time?: string | null
          event_type?: string | null
          flight_number?: string | null
          flight_status?: string | null
          flight_status_updated_at?: string | null
          gate?: string | null
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          notes?: string | null
          share_token?: string | null
          terminal?: string | null
          trip_id?: string
          venue_address?: string | null
          venue_name?: string | null
          venue_place_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          paid_by: string
          receipt_url: string | null
          split_between: string[]
          trip_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string
          description: string
          expense_date: string
          id?: string
          notes?: string | null
          paid_by: string
          receipt_url?: string | null
          split_between?: string[]
          trip_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_by?: string
          receipt_url?: string | null
          split_between?: string[]
          trip_id?: string
        }
        Relationships: []
      }
      trip_messages: {
        Row: {
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          image_url: string | null
          pinned_outfit_id: string | null
          reactions: Json
          trip_id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          pinned_outfit_id?: string | null
          reactions?: Json
          trip_id: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          image_url?: string | null
          pinned_outfit_id?: string | null
          reactions?: Json
          trip_id?: string
          user_id?: string
        }
        Relationships: []
      }
      trip_photos: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          storage_path: string
          taken_at: string | null
          trip_id: string
          uploaded_by: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path: string
          taken_at?: string | null
          trip_id: string
          uploaded_by: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path?: string
          taken_at?: string | null
          trip_id?: string
          uploaded_by?: string
          width?: number | null
        }
        Relationships: []
      }
      trip_playlists: {
        Row: {
          created_at: string
          created_by: string
          embed_url: string | null
          id: string
          playlist_name: string | null
          spotify_playlist_id: string | null
          spotify_playlist_url: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          embed_url?: string | null
          id?: string
          playlist_name?: string | null
          spotify_playlist_id?: string | null
          spotify_playlist_url?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          embed_url?: string | null
          id?: string
          playlist_name?: string | null
          spotify_playlist_id?: string | null
          spotify_playlist_url?: string | null
          trip_id?: string
        }
        Relationships: []
      }
      trip_polls: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          id: string
          question: string
          trip_id: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          question: string
          trip_id: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          question?: string
          trip_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          accommodation: string | null
          country: string | null
          created_at: string
          destination: string
          end_date: string
          id: string
          image_url: string | null
          is_public: boolean
          latitude: number | null
          longitude: number | null
          origin_city: string | null
          origin_country: string | null
          origin_latitude: number | null
          origin_longitude: number | null
          share_token: string
          start_date: string
          status: string
          theme_colors: string[] | null
          trip_theme: string | null
          trip_type: string | null
          user_id: string
        }
        Insert: {
          accommodation?: string | null
          country?: string | null
          created_at?: string
          destination: string
          end_date: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          latitude?: number | null
          longitude?: number | null
          origin_city?: string | null
          origin_country?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          share_token?: string
          start_date: string
          status?: string
          theme_colors?: string[] | null
          trip_theme?: string | null
          trip_type?: string | null
          user_id: string
        }
        Update: {
          accommodation?: string | null
          country?: string | null
          created_at?: string
          destination?: string
          end_date?: string
          id?: string
          image_url?: string | null
          is_public?: boolean
          latitude?: number | null
          longitude?: number | null
          origin_city?: string | null
          origin_country?: string | null
          origin_latitude?: number | null
          origin_longitude?: number | null
          share_token?: string
          start_date?: string
          status?: string
          theme_colors?: string[] | null
          trip_theme?: string | null
          trip_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_free_trips: {
        Row: {
          created_at: string
          full_trips_used: number
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_trips_used?: number
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_trips_used?: number
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      wardrobe_items: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          order_index: number | null
          tags: string[] | null
          trip_id: string
        }
        Insert: {
          category: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          tags?: string[] | null
          trip_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          order_index?: number | null
          tags?: string[] | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wardrobe_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_data: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          rain_probability: number | null
          temperature_high: number | null
          temperature_low: number | null
          trip_id: string
          weather_code: number | null
          wind_speed: number | null
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          rain_probability?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          trip_id: string
          weather_code?: number | null
          wind_speed?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          rain_probability?: number | null
          temperature_high?: number | null
          temperature_low?: number | null
          trip_id?: string
          weather_code?: number | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_data_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_trip_owner: { Args: { _trip_id: string }; Returns: boolean }
      is_trip_member: { Args: { _trip_id: string }; Returns: boolean }
      is_trip_collaborator: { Args: { _trip_id: string }; Returns: boolean }
      update_trip_statuses: { Args: Record<PropertyKey, never>; Returns: void }
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
