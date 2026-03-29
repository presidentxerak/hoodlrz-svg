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
          auth_id: string | null;
          email: string;
          pseudonym: string | null;
          rewards_balance: number;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id?: string | null;
          email: string;
          pseudonym?: string | null;
          rewards_balance?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string | null;
          email?: string;
          pseudonym?: string | null;
          rewards_balance?: number;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          hero_media_url: string | null;
          total_supply: number;
          minted_count: number;
          price_cents: number;
          whitelist_start_at: string | null;
          public_start_at: string | null;
          drop_status: "upcoming" | "whitelist" | "public" | "sold_out" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          hero_media_url?: string | null;
          total_supply?: number;
          minted_count?: number;
          price_cents?: number;
          whitelist_start_at?: string | null;
          public_start_at?: string | null;
          drop_status?: "upcoming" | "whitelist" | "public" | "sold_out" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          hero_media_url?: string | null;
          total_supply?: number;
          minted_count?: number;
          price_cents?: number;
          whitelist_start_at?: string | null;
          public_start_at?: string | null;
          drop_status?: "upcoming" | "whitelist" | "public" | "sold_out" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tokens: {
        Row: {
          id: string;
          collection_id: string;
          serial_number: number;
          seed: string;
          traits_json: Json;
          canonical_hash: string;
          owner_id: string | null;
          is_listed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          serial_number: number;
          seed: string;
          traits_json?: Json;
          canonical_hash: string;
          owner_id?: string | null;
          is_listed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          collection_id?: string;
          serial_number?: number;
          seed?: string;
          traits_json?: Json;
          canonical_hash?: string;
          owner_id?: string | null;
          is_listed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          account_id: string;
          token_id: string | null;
          collection_id: string;
          amount_cents: number;
          currency: string;
          stripe_session_id: string | null;
          stripe_payment_intent_id: string | null;
          status: "pending" | "completed" | "failed" | "refunded";
          order_type: "collect" | "marketplace" | "reward";
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          token_id?: string | null;
          collection_id: string;
          amount_cents: number;
          currency?: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          order_type?: "collect" | "marketplace" | "reward";
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          token_id?: string | null;
          collection_id?: string;
          amount_cents?: number;
          currency?: string;
          stripe_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          status?: "pending" | "completed" | "failed" | "refunded";
          order_type?: "collect" | "marketplace" | "reward";
          created_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          token_id: string;
          seller_id: string;
          price_cents: number;
          status: "active" | "sold" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          token_id: string;
          seller_id: string;
          price_cents: number;
          status?: "active" | "sold" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          token_id?: string;
          seller_id?: string;
          price_cents?: number;
          status?: "active" | "sold" | "cancelled";
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
          event_type: "collect" | "purchase" | "transfer" | "reward";
          created_at: string;
        };
        Insert: {
          id?: string;
          token_id: string;
          from_account_id?: string | null;
          to_account_id: string;
          event_type: "collect" | "purchase" | "transfer" | "reward";
          created_at?: string;
        };
        Update: {
          id?: string;
          token_id?: string;
          from_account_id?: string | null;
          to_account_id?: string;
          event_type?: "collect" | "purchase" | "transfer" | "reward";
          created_at?: string;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          id: string;
          account_id: string;
          amount: number;
          reason: "collect" | "marketplace_purchase" | "referral" | "bonus" | "spent";
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          amount: number;
          reason: "collect" | "marketplace_purchase" | "referral" | "bonus" | "spent";
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          amount?: number;
          reason?: "collect" | "marketplace_purchase" | "referral" | "bonus" | "spent";
          reference_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      whitelist: {
        Row: {
          id: string;
          email: string;
          collection_id: string;
          status: "pending" | "approved" | "used";
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          collection_id: string;
          status?: "pending" | "approved" | "used";
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          collection_id?: string;
          status?: "pending" | "approved" | "used";
          created_at?: string;
        };
        Relationships: [];
      };
      seller_balances: {
        Row: {
          id: string;
          account_id: string;
          available_cents: number;
          pending_cents: number;
          total_earned_cents: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          available_cents?: number;
          pending_cents?: number;
          total_earned_cents?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          available_cents?: number;
          pending_cents?: number;
          total_earned_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      genesis_access: {
        Row: {
          id: string;
          account_id: string;
          granted_at: string;
          reason: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          granted_at?: string;
          reason?: string | null;
        };
        Update: {
          id?: string;
          account_id?: string;
          granted_at?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      access_links: {
        Row: {
          id: string;
          code: string;
          collection_id: string | null;
          max_uses: number | null;
          use_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          collection_id?: string | null;
          max_uses?: number | null;
          use_count?: number;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          collection_id?: string | null;
          max_uses?: number | null;
          use_count?: number;
          expires_at?: string | null;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          payload?: Json;
          processed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          stripe_event_id?: string;
          event_type?: string;
          payload?: Json;
          processed?: boolean;
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
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/* -- Convenience type aliases -- */

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

/* -- Named row types -- */

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
