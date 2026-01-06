export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OrderStatus = 'New' | 'Ordered' | 'Dispatched' | 'Delivering' | 'Delivered' | 'Confirmed' | 'Cancelled'
export type UserRole = 'owner' | 'staff'
export type ContactMethod = 'SMS' | 'Kakao' | 'Telegram' | 'Discord'
export type DetailPageStatus = 'Draft' | 'Completed'
export type Platform = 'Naver' | 'Coupang' | 'Gmarket' | '11st' | 'Other'
export type ProductStatus = 'SALE' | 'SUSPENSION' | 'WAIT' | 'UNADMISSION' | 'REJECTION' | 'PROHIBITION' | 'DELETE'
export type SyncType = 'orders' | 'products' | 'both'
export type SyncLogStatus = 'success' | 'failed' | 'running'
export type SettlementStatus = 'pending' | 'confirmed' | 'paid'
export type SyncHistoryType = 'orders' | 'products' | 'stock' | 'settlement' | 'detail_page'
export type AnalysisLogStatus = 'pending' | 'completed' | 'failed'
export type AiUsageType = 'benchmarking_structure' | 'benchmarking_style' | 'benchmarking_image' | 'ai_generate' | 'ai_analyze'
export type SyncDirection = 'pull' | 'push'
export type SyncHistoryStatus = 'started' | 'completed' | 'failed'
export type StockSyncSource = 'local' | 'naver' | 'manual'
export type DeliveryTrackingStatus = 'IN_PROGRESS' | 'DELIVERED'
export type BenchmarkSessionStatus = 'active' | 'archived'
export type BenchmarkAssetType = 'image' | 'screenshot' | 'text'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: UserRole
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: UserRole
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          created_at?: string
        }
        Relationships: []
      }
      stores: {
        Row: {
          id: string
          user_id: string
          platform: Platform
          store_name: string
          api_config: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: Platform
          store_name: string
          api_config?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: Platform
          store_name?: string
          api_config?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stores_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      suppliers: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_number: string | null
          contact_method: ContactMethod
          webhook_url: string | null
          message_template: string | null
          send_schedule_time: string | null
          send_schedule_enabled: boolean
          auto_send_enabled: boolean
          courier_id: string | null
          default_courier_account: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_number?: string | null
          contact_method?: ContactMethod
          webhook_url?: string | null
          message_template?: string | null
          send_schedule_time?: string | null
          send_schedule_enabled?: boolean
          auto_send_enabled?: boolean
          courier_id?: string | null
          default_courier_account?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          contact_number?: string | null
          contact_method?: ContactMethod
          webhook_url?: string | null
          message_template?: string | null
          send_schedule_time?: string | null
          send_schedule_enabled?: boolean
          auto_send_enabled?: boolean
          courier_id?: string | null
          default_courier_account?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'suppliers_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'suppliers_courier_id_fkey'
            columns: ['courier_id']
            referencedRelation: 'couriers'
            referencedColumns: ['id']
          }
        ]
      }
      products: {
        Row: {
          id: string
          store_id: string
          name: string
          price: number
          stock_quantity: number
          sku: string | null
          supplier_id: string | null
          status: string | null
          platform_product_id: string | null
          image_url: string | null
          category: string | null
          brand: string | null
          detail_content: string | null
          detail_attributes: Json
          naver_channel_product_no: number | null
          naver_origin_product_no: number | null
          last_detail_sync_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          price: number
          stock_quantity?: number
          sku?: string | null
          supplier_id?: string | null
          status?: string | null
          platform_product_id?: string | null
          image_url?: string | null
          category?: string | null
          brand?: string | null
          detail_content?: string | null
          detail_attributes?: Json
          naver_channel_product_no?: number | null
          naver_origin_product_no?: number | null
          last_detail_sync_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          price?: number
          stock_quantity?: number
          sku?: string | null
          supplier_id?: string | null
          status?: string | null
          platform_product_id?: string | null
          image_url?: string | null
          category?: string | null
          brand?: string | null
          detail_content?: string | null
          detail_attributes?: Json
          naver_channel_product_no?: number | null
          naver_origin_product_no?: number | null
          last_detail_sync_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'products_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          id: string
          store_id: string
          platform_order_id: string | null
          product_id: string | null
          quantity: number
          customer_name: string | null
          customer_address: string | null
          status: OrderStatus
          tracking_number: string | null
          courier_code: string | null
          order_date: string
          naver_product_order_id: string | null
          unit_price: number | null
          total_payment_amount: number | null
          naver_order_status: string | null
          orderer_tel: string | null
          product_name: string | null
          product_option: string | null
          receiver_name: string | null
          receiver_tel: string | null
          zip_code: string | null
          naver_order_id: string | null
          delivery_memo: string | null
          supplier_id: string | null
          supplier_sent_at: string | null
          supplier_order_status: string | null
        }
        Insert: {
          id?: string
          store_id: string
          platform_order_id?: string | null
          product_id?: string | null
          quantity?: number
          customer_name?: string | null
          customer_address?: string | null
          status?: OrderStatus
          tracking_number?: string | null
          courier_code?: string | null
          order_date?: string
          naver_product_order_id?: string | null
          unit_price?: number | null
          total_payment_amount?: number | null
          naver_order_status?: string | null
          orderer_tel?: string | null
          product_name?: string | null
          product_option?: string | null
          receiver_name?: string | null
          receiver_tel?: string | null
          zip_code?: string | null
          naver_order_id?: string | null
          delivery_memo?: string | null
          supplier_id?: string | null
          supplier_sent_at?: string | null
          supplier_order_status?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          platform_order_id?: string | null
          product_id?: string | null
          quantity?: number
          customer_name?: string | null
          customer_address?: string | null
          status?: OrderStatus
          tracking_number?: string | null
          courier_code?: string | null
          order_date?: string
          naver_product_order_id?: string | null
          unit_price?: number | null
          total_payment_amount?: number | null
          naver_order_status?: string | null
          orderer_tel?: string | null
          product_name?: string | null
          product_option?: string | null
          receiver_name?: string | null
          receiver_tel?: string | null
          zip_code?: string | null
          naver_order_id?: string | null
          delivery_memo?: string | null
          supplier_id?: string | null
          supplier_sent_at?: string | null
          supplier_order_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          }
        ]
      }
      couriers: {
        Row: {
          id: string
          user_id: string
          name: string
          code: string
          api_type: string | null
          api_config: Json
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          code: string
          api_type?: string | null
          api_config?: Json
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          code?: string
          api_type?: string | null
          api_config?: Json
          is_default?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'couriers_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      supplier_order_logs: {
        Row: {
          id: string
          supplier_id: string
          order_ids: string[]
          message_content: string | null
          send_method: string
          status: string
          error_message: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          supplier_id: string
          order_ids: string[]
          message_content?: string | null
          send_method: string
          status?: string
          error_message?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          supplier_id?: string
          order_ids?: string[]
          message_content?: string | null
          send_method?: string
          status?: string
          error_message?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'supplier_order_logs_supplier_id_fkey'
            columns: ['supplier_id']
            referencedRelation: 'suppliers'
            referencedColumns: ['id']
          }
        ]
      }
      detail_pages: {
        Row: {
          id: string
          user_id: string
          title: string
          content_html: string | null
          user_inputs: Json
          status: DetailPageStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content_html?: string | null
          user_inputs?: Json
          status?: DetailPageStatus
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content_html?: string | null
          user_inputs?: Json
          status?: DetailPageStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'detail_pages_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      sync_schedules: {
        Row: {
          id: string
          user_id: string
          store_id: string
          sync_type: SyncType
          interval_minutes: number
          is_enabled: boolean
          last_sync_at: string | null
          next_sync_at: string | null
          sync_at_minute: number | null
          sync_time: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          store_id: string
          sync_type: SyncType
          interval_minutes?: number
          is_enabled?: boolean
          last_sync_at?: string | null
          next_sync_at?: string | null
          sync_at_minute?: number | null
          sync_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          store_id?: string
          sync_type?: SyncType
          interval_minutes?: number
          is_enabled?: boolean
          last_sync_at?: string | null
          next_sync_at?: string | null
          sync_at_minute?: number | null
          sync_time?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sync_schedules_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sync_schedules_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      sync_logs: {
        Row: {
          id: string
          schedule_id: string
          sync_type: string
          status: SyncLogStatus
          items_synced: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          schedule_id: string
          sync_type: string
          status?: SyncLogStatus
          items_synced?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          schedule_id?: string
          sync_type?: string
          status?: SyncLogStatus
          items_synced?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sync_logs_schedule_id_fkey'
            columns: ['schedule_id']
            referencedRelation: 'sync_schedules'
            referencedColumns: ['id']
          }
        ]
      }
      settlements: {
        Row: {
          id: string
          store_id: string
          settlement_date: string
          order_count: number
          sales_amount: number
          commission_amount: number
          delivery_fee_amount: number
          discount_amount: number
          settlement_amount: number
          status: SettlementStatus
          naver_settlement_no: string | null
          raw_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          settlement_date: string
          order_count?: number
          sales_amount?: number
          commission_amount?: number
          delivery_fee_amount?: number
          discount_amount?: number
          settlement_amount?: number
          status?: SettlementStatus
          naver_settlement_no?: string | null
          raw_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          settlement_date?: string
          order_count?: number
          sales_amount?: number
          commission_amount?: number
          delivery_fee_amount?: number
          discount_amount?: number
          settlement_amount?: number
          status?: SettlementStatus
          naver_settlement_no?: string | null
          raw_data?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'settlements_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      sync_history: {
        Row: {
          id: string
          store_id: string
          sync_type: SyncHistoryType
          direction: SyncDirection
          status: SyncHistoryStatus
          items_processed: number
          items_failed: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          sync_type: SyncHistoryType
          direction: SyncDirection
          status?: SyncHistoryStatus
          items_processed?: number
          items_failed?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          sync_type?: SyncHistoryType
          direction?: SyncDirection
          status?: SyncHistoryStatus
          items_processed?: number
          items_failed?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'sync_history_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      stock_sync_logs: {
        Row: {
          id: string
          product_id: string
          previous_quantity: number
          new_quantity: number
          source: StockSyncSource
          sync_direction: SyncDirection
          synced_at: string
        }
        Insert: {
          id?: string
          product_id: string
          previous_quantity: number
          new_quantity: number
          source: StockSyncSource
          sync_direction: SyncDirection
          synced_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          previous_quantity?: number
          new_quantity?: number
          source?: StockSyncSource
          sync_direction?: SyncDirection
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'stock_sync_logs_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          }
        ]
      }
      analysis_logs: {
        Row: {
          id: string
          user_id: string
          target_url: string
          target_platform: string
          analysis_result: Json
          status: AnalysisLogStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_url: string
          target_platform?: string
          analysis_result?: Json
          status?: AnalysisLogStatus
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_url?: string
          target_platform?: string
          analysis_result?: Json
          status?: AnalysisLogStatus
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analysis_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      saved_assets: {
        Row: {
          id: string
          log_id: string
          asset_type: string
          asset_url: string | null
          content: string | null
        }
        Insert: {
          id?: string
          log_id: string
          asset_type: string
          asset_url?: string | null
          content?: string | null
        }
        Update: {
          id?: string
          log_id?: string
          asset_type?: string
          asset_url?: string | null
          content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'saved_assets_log_id_fkey'
            columns: ['log_id']
            referencedRelation: 'analysis_logs'
            referencedColumns: ['id']
          }
        ]
      }
      ai_usage_logs: {
        Row: {
          id: string
          user_id: string
          usage_type: AiUsageType
          model: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          estimated_cost_usd: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          usage_type: AiUsageType
          model: string
          prompt_tokens: number
          completion_tokens: number
          total_tokens: number
          estimated_cost_usd: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          usage_type?: AiUsageType
          model?: string
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          estimated_cost_usd?: number
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ai_usage_logs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      delivery_trackings: {
        Row: {
          id: string
          store_id: string
          carrier_id: string
          carrier_name: string
          tracking_number: string
          status: DeliveryTrackingStatus
          latest_event_status: string | null
          latest_event_time: string | null
          latest_event_description: string | null
          sender_name: string | null
          sender_address: string | null
          recipient_name: string | null
          recipient_address: string | null
          product_name: string | null
          memo: string | null
          events: Json
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          store_id: string
          carrier_id: string
          carrier_name: string
          tracking_number: string
          status?: DeliveryTrackingStatus
          latest_event_status?: string | null
          latest_event_time?: string | null
          latest_event_description?: string | null
          sender_name?: string | null
          sender_address?: string | null
          recipient_name?: string | null
          recipient_address?: string | null
          product_name?: string | null
          memo?: string | null
          events?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          store_id?: string
          carrier_id?: string
          carrier_name?: string
          tracking_number?: string
          status?: DeliveryTrackingStatus
          latest_event_status?: string | null
          latest_event_time?: string | null
          latest_event_description?: string | null
          sender_name?: string | null
          sender_address?: string | null
          recipient_name?: string | null
          recipient_address?: string | null
          product_name?: string | null
          memo?: string | null
          events?: Json
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'delivery_trackings_store_id_fkey'
            columns: ['store_id']
            referencedRelation: 'stores'
            referencedColumns: ['id']
          }
        ]
      }
      benchmark_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          my_product_id: string | null
          my_page_url: string | null
          status: BenchmarkSessionStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          my_product_id?: string | null
          my_page_url?: string | null
          status?: BenchmarkSessionStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          my_product_id?: string | null
          my_page_url?: string | null
          status?: BenchmarkSessionStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'benchmark_sessions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      benchmark_pages: {
        Row: {
          id: string
          session_id: string
          url: string
          title: string | null
          platform: string
          thumbnail_url: string | null
          scroll_position: number
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          url: string
          title?: string | null
          platform?: string
          thumbnail_url?: string | null
          scroll_position?: number
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          url?: string
          title?: string | null
          platform?: string
          thumbnail_url?: string | null
          scroll_position?: number
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'benchmark_pages_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'benchmark_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      benchmark_memos: {
        Row: {
          id: string
          session_id: string
          page_id: string | null
          is_my_page: boolean
          content: string
          scroll_position: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          page_id?: string | null
          is_my_page?: boolean
          content: string
          scroll_position?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          page_id?: string | null
          is_my_page?: boolean
          content?: string
          scroll_position?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'benchmark_memos_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'benchmark_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      benchmark_checklists: {
        Row: {
          id: string
          session_id: string
          content: string
          is_completed: boolean
          reference_image_url: string | null
          priority: number
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          content: string
          is_completed?: boolean
          reference_image_url?: string | null
          priority?: number
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          content?: string
          is_completed?: boolean
          reference_image_url?: string | null
          priority?: number
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'benchmark_checklists_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'benchmark_sessions'
            referencedColumns: ['id']
          }
        ]
      }
      benchmark_assets: {
        Row: {
          id: string
          session_id: string
          page_id: string | null
          asset_type: BenchmarkAssetType
          url: string | null
          content: string | null
          filename: string | null
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          page_id?: string | null
          asset_type: BenchmarkAssetType
          url?: string | null
          content?: string | null
          filename?: string | null
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          page_id?: string | null
          asset_type?: BenchmarkAssetType
          url?: string | null
          content?: string | null
          filename?: string | null
          memo?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'benchmark_assets_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'benchmark_sessions'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status: OrderStatus
      user_role: UserRole
      contact_method: ContactMethod
      detail_page_status: DetailPageStatus
      platform: Platform
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type User = Tables<'users'>
export type Store = Tables<'stores'>
export type Supplier = Tables<'suppliers'>
export type Product = Tables<'products'>
export type Order = Tables<'orders'>
export type DetailPage = Tables<'detail_pages'>
export type SyncSchedule = Tables<'sync_schedules'>
export type SyncLog = Tables<'sync_logs'>
export type Settlement = Tables<'settlements'>
export type SyncHistory = Tables<'sync_history'>
export type StockSyncLog = Tables<'stock_sync_logs'>
export type Courier = Tables<'couriers'>
export type SupplierOrderLog = Tables<'supplier_order_logs'>
export type AnalysisLog = Tables<'analysis_logs'>
export type SavedAsset = Tables<'saved_assets'>
export type AiUsageLog = Tables<'ai_usage_logs'>
export type DeliveryTracking = Tables<'delivery_trackings'>

export interface BenchmarkSession {
  id: string
  user_id: string
  title: string
  description: string | null
  my_product_id: string | null
  my_page_url: string | null
  status: BenchmarkSessionStatus
  created_at: string
  updated_at: string
}

export interface BenchmarkPage {
  id: string
  session_id: string
  url: string
  title: string | null
  platform: string
  thumbnail_url: string | null
  scroll_position: number
  display_order: number
  created_at: string
}

export interface BenchmarkMemo {
  id: string
  session_id: string
  page_id: string | null
  is_my_page: boolean
  content: string
  scroll_position: number
  color: string
  created_at: string
  updated_at: string
}

export interface BenchmarkChecklist {
  id: string
  session_id: string
  content: string
  is_completed: boolean
  reference_image_url: string | null
  priority: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface BenchmarkAsset {
  id: string
  session_id: string
  page_id: string | null
  asset_type: BenchmarkAssetType
  url: string | null
  content: string | null
  filename: string | null
  memo: string | null
  created_at: string
}
