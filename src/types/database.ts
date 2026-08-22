export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Tier = "pit" | "undercard" | "main_event";
export type BillingMode = "one_day" | "daily_renew";
export type CompanyStatus =
  "draft" | "pending_review" | "approved" | "rejected" | "suspended";
export type PlacementStatus = "pending" | "active" | "expired" | "canceled";
export type BattleStatus = "open" | "resolved" | "expired";
export type AppRole = "owner" | "admin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: AppRole;
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: AppRole;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: AppRole;
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          pitch: string;
          website_url: string;
          logo_path: string | null;
          tier: Tier;
          preferred_billing_mode: BillingMode;
          status: CompanyStatus;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          pitch: string;
          website_url: string;
          logo_path?: string | null;
          tier?: Tier;
          preferred_billing_mode?: BillingMode;
          status?: CompanyStatus;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          pitch?: string;
          website_url?: string;
          logo_path?: string | null;
          tier?: Tier;
          preferred_billing_mode?: BillingMode;
          status?: CompanyStatus;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      placements: {
        Row: {
          id: string;
          company_id: string;
          tier: Tier;
          billing_mode: BillingMode;
          status: PlacementStatus;
          starts_at: string | null;
          ends_at: string | null;
          stripe_checkout_session_id: string | null;
          stripe_subscription_id: string | null;
          stripe_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          tier: Tier;
          billing_mode: BillingMode;
          status?: PlacementStatus;
          starts_at?: string | null;
          ends_at?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["placements"]["Insert"]>;
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          season_key: string;
          starts_at: string;
          ends_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_key: string;
          starts_at: string;
          ends_at: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["seasons"]["Insert"]>;
        Relationships: [];
      };
      company_ratings: {
        Row: {
          id: string;
          season_id: string;
          company_id: string;
          tier: Tier;
          elo: number;
          wins: number;
          losses: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          company_id: string;
          tier: Tier;
          elo?: number;
          wins?: number;
          losses?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["company_ratings"]["Insert"]
        >;
        Relationships: [];
      };
      cards: {
        Row: {
          id: string;
          season_id: string;
          hour_key: string;
          starts_at: string;
          ends_at: string;
          grace_ends_at: string;
          status: "open" | "resolved";
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          hour_key: string;
          starts_at: string;
          ends_at: string;
          grace_ends_at: string;
          status?: "open" | "resolved";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      battles: {
        Row: {
          id: string;
          season_id: string;
          card_id: string | null;
          card_slot: number | null;
          tier: Tier;
          company_a_id: string;
          company_b_id: string;
          status: BattleStatus;
          visitor_id: string | null;
          expires_at: string;
          created_at: string;
          votes_a: number;
          votes_b: number;
          winner_id: string | null;
          loser_id: string | null;
          winner_elo_before: number | null;
          loser_elo_before: number | null;
          winner_elo_after: number | null;
          loser_elo_after: number | null;
        };
        Insert: {
          id?: string;
          season_id: string;
          card_id?: string | null;
          card_slot?: number | null;
          tier: Tier;
          company_a_id: string;
          company_b_id: string;
          status?: BattleStatus;
          visitor_id?: string | null;
          expires_at: string;
          created_at?: string;
          votes_a?: number;
          votes_b?: number;
          winner_id?: string | null;
          loser_id?: string | null;
          winner_elo_before?: number | null;
          loser_elo_before?: number | null;
          winner_elo_after?: number | null;
          loser_elo_after?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["battles"]["Insert"]>;
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          battle_id: string;
          season_id: string;
          winner_id: string;
          loser_id: string;
          visitor_id: string;
          ip_hash: string | null;
          winner_elo_before: number | null;
          loser_elo_before: number | null;
          winner_elo_after: number | null;
          loser_elo_after: number | null;
          created_at: string;
          points_a: number;
          points_b: number;
        };
        Insert: {
          id?: string;
          battle_id: string;
          season_id: string;
          winner_id: string;
          loser_id: string;
          visitor_id: string;
          ip_hash?: string | null;
          winner_elo_before?: number | null;
          loser_elo_before?: number | null;
          winner_elo_after?: number | null;
          loser_elo_after?: number | null;
          created_at?: string;
          points_a?: number;
          points_b?: number;
        };
        Update: Partial<Database["public"]["Tables"]["votes"]["Insert"]>;
        Relationships: [];
      };
      visitor_card_opens: {
        Row: {
          visitor_id: string;
          card_id: string;
          opened_at: string;
        };
        Insert: {
          visitor_id: string;
          card_id: string;
          opened_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["visitor_card_opens"]["Insert"]
        >;
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
          payload: Json | null;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
          payload?: Json | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["stripe_events"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      allocate_vote: {
        Args: {
          p_battle_id: string;
          p_points_a: number;
          p_points_b: number;
          p_visitor_id: string;
          p_ip_hash?: string | null;
        };
        Returns: Json;
      };
      resolve_card: {
        Args: {
          p_card_id: string;
          p_k?: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      tier: Tier;
      company_status: CompanyStatus;
      billing_mode: BillingMode;
      placement_status: PlacementStatus;
      battle_status: BattleStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
