export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          email: string;
          pseudonym: string;
          avatar_url: string | null;
          role: "user" | "seller" | "admin";
          stripe_customer_id: string | null;
          stripe_connect_id: string | null;
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          pseudonym: string;
          avatar_url?: string | null;
          role?: "user" | "seller" | "admin";
          stripe_customer_id?: string | null;
          stripe_connect_id?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          pseudonym?: string;
          avatar_url?: string | null;
          role?: "user" | "seller" | "admin";
          stripe_customer_id?: string | null;
          stripe_connect_id?: string | null;
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          seller_id: string;
          name: string;
          slug: string;
          description: string | null;
          cover_image_url: string | null;
          svg_template_url: string | null;
          trait_schema: Json | null;
          supply: number;
          minted: number;
          price_cents: number;
          currency: string;
          is_published: boolean;
          is_genesis: boolean;
          drop_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          name: string;
          slug: string;
          description?: string | null;
          cover_image_url?: string | null;
          svg_template_url?: string | null;
          trait_schema?: Json | null;
          supply: number;
          minted?: number;
          price_cents: number;
          currency?: string;
          is_published?: boolean;
          is_genesis?: boolean;
          drop_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          cover_image_url?: string | null;
          svg_template_url?: string | null;
          trait_schema?: Json | null;
          supply?: number;
          minted?: number;
          price_cents?: number;
          currency?: string;
          is_published?: boolean;
          is_genesis?: boolean;
          drop_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tokens: {
        Row: {
          id: string;
          collection_id: string;
          owner_id: string;
          token_number: number;
          svg_url: string;
          metadata: Json | null;
          traits: Json | null;
          rarity_score: number | null;
          is_listed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          owner_id: string;
          token_number: number;
          svg_url: string;
          metadata?: Json | null;
          traits?: Json | null;
          rarity_score?: number | null;
          is_listed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          owner_id?: string;
          token_number?: number;
          svg_url?: string;
          metadata?: Json | null;
          traits?: Json | null;
          rarity_score?: number | null;
          is_listed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          collection_id: string;
          token_id: string | null;
          stripe_payment_intent_id: string;
          stripe_checkout_session_id: string | null;
          amount_cents: number;
          currency: string;
          platform_fee_cents: number;
          seller_payout_cents: number;
          status: "pending" | "processing" | "completed" | "failed" | "refunded";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          collection_id: string;
          token_id?: string | null;
          stripe_payment_intent_id: string;
          stripe_checkout_session_id?: string | null;
          amount_cents: number;
          currency?: string;
          platform_fee_cents: number;
          seller_payout_cents: number;
          status?: "pending" | "processing" | "completed" | "failed" | "refunded";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          collection_id?: string;
          token_id?: string | null;
          stripe_payment_intent_id?: string;
          stripe_checkout_session_id?: string | null;
          amount_cents?: number;
          currency?: string;
          platform_fee_cents?: number;
          seller_payout_cents?: number;
          status?: "pending" | "processing" | "completed" | "failed" | "refunded";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          token_id: string;
          seller_id: string;
          price_cents: number;
          currency: string;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token_id: string;
          seller_id: string;
          price_cents: number;
          currency?: string;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token_id?: string;
          seller_id?: string;
          price_cents?: number;
          currency?: string;
          is_active?: boolean;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ownership_events: {
        Row: {
          id: string;
          token_id: string;
          from_account_id: string | null;
          to_account_id: string;
          event_type: "mint" | "purchase" | "transfer" | "burn";
          order_id: string | null;
          price_cents: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token_id: string;
          from_account_id?: string | null;
          to_account_id: string;
          event_type: "mint" | "purchase" | "transfer" | "burn";
          order_id?: string | null;
          price_cents?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token_id?: string;
          from_account_id?: string | null;
          to_account_id?: string;
          event_type?: "mint" | "purchase" | "transfer" | "burn";
          order_id?: string | null;
          price_cents?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          account_id: string;
          type: "referral" | "streak" | "collect" | "genesis" | "promo";
          points: number;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          type: "referral" | "streak" | "collect" | "genesis" | "promo";
          points: number;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          type?: "referral" | "streak" | "collect" | "genesis" | "promo";
          points?: number;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      whitelist: {
        Row: {
          id: string;
          collection_id: string;
          email: string;
          account_id: string | null;
          tier: "standard" | "priority" | "guaranteed";
          is_redeemed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          email: string;
          account_id?: string | null;
          tier?: "standard" | "priority" | "guaranteed";
          is_redeemed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          email?: string;
          account_id?: string | null;
          tier?: "standard" | "priority" | "guaranteed";
          is_redeemed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      seller_balances: {
        Row: {
          id: string;
          seller_id: string;
          available_cents: number;
          pending_cents: number;
          total_earned_cents: number;
          total_withdrawn_cents: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          seller_id: string;
          available_cents?: number;
          pending_cents?: number;
          total_earned_cents?: number;
          total_withdrawn_cents?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          available_cents?: number;
          pending_cents?: number;
          total_earned_cents?: number;
          total_withdrawn_cents?: number;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      genesis_access: {
        Row: {
          id: string;
          account_id: string;
          token_id: string;
          perks: Json;
          is_active: boolean;
          activated_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          token_id: string;
          perks?: Json;
          is_active?: boolean;
          activated_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string;
          token_id?: string;
          perks?: Json;
          is_active?: boolean;
          activated_at?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      access_links: {
        Row: {
          id: string;
          collection_id: string;
          code: string;
          max_uses: number;
          current_uses: number;
          expires_at: string | null;
          is_active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          code: string;
          max_uses?: number;
          current_uses?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          code?: string;
          max_uses?: number;
          current_uses?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          payload: Json;
          processed: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          payload: Json;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          stripe_event_id?: string;
          event_type?: string;
          payload?: Json;
          processed?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      account_role: "user" | "seller" | "admin";
      order_status: "pending" | "processing" | "completed" | "failed" | "refunded";
      ownership_event_type: "mint" | "purchase" | "transfer" | "burn";
      reward_type: "referral" | "streak" | "collect" | "genesis" | "promo";
      whitelist_tier: "standard" | "priority" | "guaranteed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/* ── Convenience type aliases ── */

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

/* ── Named row types ── */

export type Account = Tables<"accounts">;
export type Collection = Tables<"collections">;
export type Token = Tables<"tokens">;
export type Order = Tables<"orders">;
export type Listing = Tables<"listings">;
export type OwnershipEvent = Tables<"ownership_events">;
export type Reward = Tables<"rewards">;
export type Whitelist = Tables<"whitelist">;
export type SellerBalance = Tables<"seller_balances">;
export type GenesisAccess = Tables<"genesis_access">;
export type AccessLink = Tables<"access_links">;
export type StripeEvent = Tables<"stripe_events">;
