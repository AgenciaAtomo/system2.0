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
      alert_resolutions: {
        Row: {
          alert_key: string
          id: string
          organization_id: string
          resolved_at: string
        }
        Insert: {
          alert_key: string
          id?: string
          organization_id: string
          resolved_at?: string
        }
        Update: {
          alert_key?: string
          id?: string
          organization_id?: string
          resolved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_saldo: {
        Row: {
          conta_id: string
          criado_em: string | null
          empresa_id: string
          id: string
          lido: boolean | null
          lido_em: string | null
          saldo_no_momento: number | null
          tipo: string
          transacao_id: string | null
        }
        Insert: {
          conta_id: string
          criado_em?: string | null
          empresa_id: string
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          saldo_no_momento?: number | null
          tipo: string
          transacao_id?: string | null
        }
        Update: {
          conta_id?: string
          criado_em?: string | null
          empresa_id?: string
          id?: string
          lido?: boolean | null
          lido_em?: string | null
          saldo_no_momento?: number | null
          tipo?: string
          transacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_saldo_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_saldo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_saldo_transacao_id_fkey"
            columns: ["transacao_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          bucket_id: string
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          mime_type: string
          object_path: string
          organization_id: string
          original_name: string
          size_bytes: number
          state: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          mime_type: string
          object_path: string
          organization_id: string
          original_name: string
          size_bytes: number
          state?: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          mime_type?: string
          object_path?: string
          organization_id?: string
          original_name?: string
          size_bytes?: number
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          domain: string
          entity: string
          entity_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          domain: string
          entity: string
          entity_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          domain?: string
          entity?: string
          entity_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      business_goals: {
        Row: {
          active: boolean
          ends: string
          id: string
          metric: string
          organization_id: string
          starts: string
          target: number
        }
        Insert: {
          active?: boolean
          ends: string
          id?: string
          metric: string
          organization_id: string
          starts: string
          target: number
        }
        Update: {
          active?: boolean
          ends?: string
          id?: string
          metric?: string
          organization_id?: string
          starts?: string
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          atualizada_em: string
          cor_hex: string | null
          criada_em: string | null
          deletada_em: string | null
          empresa_id: string
          icone: string | null
          id: string
          nome: string
          padrao: boolean | null
          parent_id: string | null
          tipo: string
        }
        Insert: {
          atualizada_em?: string
          cor_hex?: string | null
          criada_em?: string | null
          deletada_em?: string | null
          empresa_id: string
          icone?: string | null
          id?: string
          nome: string
          padrao?: boolean | null
          parent_id?: string | null
          tipo: string
        }
        Update: {
          atualizada_em?: string
          cor_hex?: string | null
          criada_em?: string | null
          deletada_em?: string | null
          empresa_id?: string
          icone?: string | null
          id?: string
          nome?: string
          padrao?: boolean | null
          parent_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorias_parent_org_fk"
            columns: ["parent_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          ativa: boolean | null
          atualizada_em: string | null
          banco: string | null
          criada_em: string | null
          deletada_em: string | null
          empresa_id: string
          id: string
          moeda: string | null
          nome: string
          numero_conta: string
          saldo_atual: number | null
          saldo_inicial: number | null
          tipo: string
        }
        Insert: {
          ativa?: boolean | null
          atualizada_em?: string | null
          banco?: string | null
          criada_em?: string | null
          deletada_em?: string | null
          empresa_id: string
          id?: string
          moeda?: string | null
          nome: string
          numero_conta: string
          saldo_atual?: number | null
          saldo_inicial?: number | null
          tipo: string
        }
        Update: {
          ativa?: boolean | null
          atualizada_em?: string | null
          banco?: string | null
          criada_em?: string | null
          deletada_em?: string | null
          empresa_id?: string
          id?: string
          moeda?: string | null
          nome?: string
          numero_conta?: string
          saldo_atual?: number | null
          saldo_inicial?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_bancarias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean | null
          atualizada_em: string | null
          cnpj: string
          criada_em: string | null
          deletada_em: string | null
          email_admin: string
          id: string
          nome: string
          saldo_minimo_alerta: number | null
          timezone: string | null
        }
        Insert: {
          ativa?: boolean | null
          atualizada_em?: string | null
          cnpj: string
          criada_em?: string | null
          deletada_em?: string | null
          email_admin: string
          id?: string
          nome: string
          saldo_minimo_alerta?: number | null
          timezone?: string | null
        }
        Update: {
          ativa?: boolean | null
          atualizada_em?: string | null
          cnpj?: string
          criada_em?: string | null
          deletada_em?: string | null
          email_admin?: string
          id?: string
          nome?: string
          saldo_minimo_alerta?: number | null
          timezone?: string | null
        }
        Relationships: []
      }
      financial_installment_plans: {
        Row: {
          competence_date: string
          created_at: string
          created_by: string
          description: string
          first_due_date: string
          id: string
          installment_count: number
          organization_id: string
          total_amount: number
        }
        Insert: {
          competence_date: string
          created_at?: string
          created_by: string
          description: string
          first_due_date: string
          id?: string
          installment_count: number
          organization_id: string
          total_amount: number
        }
        Update: {
          competence_date?: string
          created_at?: string
          created_by?: string
          description?: string
          first_due_date?: string
          id?: string
          installment_count?: number
          organization_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_installment_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          created_by: string
          entry_id: string
          id: string
          notes: string | null
          organization_id: string
          origin: string
          paid_date: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          created_by: string
          entry_id: string
          id?: string
          notes?: string | null
          organization_id: string
          origin: string
          paid_date: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          created_by?: string
          entry_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          origin?: string
          paid_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_payments_entry_id_organization_id_account_id_fkey"
            columns: ["entry_id", "organization_id", "account_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id", "empresa_id", "conta_id"]
          },
          {
            foreignKeyName: "financial_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      finished_stock: {
        Row: {
          id: string
          last_date: string | null
          organization_id: string
          quantity: number
          value: number
          variant_id: string
        }
        Insert: {
          id?: string
          last_date?: string | null
          organization_id: string
          quantity?: number
          value?: number
          variant_id: string
        }
        Update: {
          id?: string
          last_date?: string | null
          organization_id?: string
          quantity?: number
          value?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "finished_stock_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finished_stock_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      input_cost_history: {
        Row: {
          created_at: string
          date: string
          id: string
          input_id: string
          organization_id: string
          purchase_id: string
          quantity: number
          total_value: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          input_id: string
          organization_id: string
          purchase_id: string
          quantity: number
          total_value: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          input_id?: string
          organization_id?: string
          purchase_id?: string
          quantity?: number
          total_value?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "input_cost_history_input_id_organization_id_fkey"
            columns: ["input_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inputs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "input_cost_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "input_cost_history_purchase_id_organization_id_fkey"
            columns: ["purchase_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "input_purchases"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      input_purchases: {
        Row: {
          converted_quantity: number
          created_at: string
          created_by: string
          final_cost: number
          freight: number
          id: string
          input_id: string
          organization_id: string
          other_costs: number
          purchase_date: string
          purchase_unit: string
          quantity: number
          supplier: string
          taxes: number
          total_price: number
          unit_cost: number
        }
        Insert: {
          converted_quantity: number
          created_at?: string
          created_by: string
          final_cost: number
          freight: number
          id?: string
          input_id: string
          organization_id: string
          other_costs: number
          purchase_date: string
          purchase_unit: string
          quantity: number
          supplier: string
          taxes: number
          total_price: number
          unit_cost: number
        }
        Update: {
          converted_quantity?: number
          created_at?: string
          created_by?: string
          final_cost?: number
          freight?: number
          id?: string
          input_id?: string
          organization_id?: string
          other_costs?: number
          purchase_date?: string
          purchase_unit?: string
          quantity?: number
          supplier?: string
          taxes?: number
          total_price?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "input_purchases_input_id_organization_id_fkey"
            columns: ["input_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inputs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "input_purchases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inputs: {
        Row: {
          active: boolean
          average_cost: number | null
          base_unit: string
          category: string
          created_at: string
          created_by: string
          default_supplier: string
          id: string
          last_cost: number | null
          last_movement_date: string | null
          minimum_stock: number
          name: string
          organization_id: string
          sku: string
          stock_quantity: number
          stock_value: number
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          average_cost?: number | null
          base_unit: string
          category?: string
          created_at?: string
          created_by: string
          default_supplier?: string
          id?: string
          last_cost?: number | null
          last_movement_date?: string | null
          minimum_stock?: number
          name: string
          organization_id: string
          sku: string
          stock_quantity?: number
          stock_value?: number
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          average_cost?: number | null
          base_unit?: string
          category?: string
          created_at?: string
          created_by?: string
          default_supplier?: string
          id?: string
          last_cost?: number | null
          last_movement_date?: string | null
          minimum_stock?: number
          name?: string
          organization_id?: string
          sku?: string
          stock_quantity?: number
          stock_value?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "inputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          average_cost_after: number | null
          created_at: string
          created_by: string
          id: string
          input_id: string
          movement_date: string
          organization_id: string
          quantity: number
          reason: string
          source_id: string
          source_type: string
          stock_after: number
          type: string
          value_change: number
        }
        Insert: {
          average_cost_after?: number | null
          created_at?: string
          created_by: string
          id?: string
          input_id: string
          movement_date: string
          organization_id: string
          quantity: number
          reason: string
          source_id: string
          source_type: string
          stock_after: number
          type: string
          value_change: number
        }
        Update: {
          average_cost_after?: number | null
          created_at?: string
          created_by?: string
          id?: string
          input_id?: string
          movement_date?: string
          organization_id?: string
          quantity?: number
          reason?: string
          source_id?: string
          source_type?: string
          stock_after?: number
          type?: string
          value_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_input_id_organization_id_fkey"
            columns: ["input_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inputs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      product_components: {
        Row: {
          id: string
          input_id: string
          organization_id: string
          product_variant_id: string
          quantity: number
          unit: string
          waste_percentage: number
        }
        Insert: {
          id?: string
          input_id: string
          organization_id: string
          product_variant_id: string
          quantity: number
          unit: string
          waste_percentage: number
        }
        Update: {
          id?: string
          input_id?: string
          organization_id?: string
          product_variant_id?: string
          quantity?: number
          unit?: string
          waste_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_components_input_id_organization_id_fkey"
            columns: ["input_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inputs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "product_components_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_components_product_variant_id_organization_id_fkey"
            columns: ["product_variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      product_revisions: {
        Row: {
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          organization_id: string
          payload: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          organization_id: string
          payload: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_revisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock_movements: {
        Row: {
          created_at: string
          date: string
          id: string
          organization_id: string
          quantity: number
          reason: string
          source_id: string
          source_type: string
          value_change: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          organization_id: string
          quantity: number
          reason: string
          source_id: string
          source_type: string
          value_change: number
          variant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          organization_id?: string
          quantity?: number
          reason?: string
          source_id?: string
          source_type?: string
          value_change?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_movements_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          attributes: Json
          created_at: string
          id: string
          name: string
          organization_id: string
          other_direct_costs: number
          overhead_percentage: number
          price: number
          product_id: string
          production: Json
          sku: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          attributes?: Json
          created_at?: string
          id?: string
          name: string
          organization_id: string
          other_direct_costs?: number
          overhead_percentage?: number
          price: number
          product_id: string
          production?: Json
          sku: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          attributes?: Json
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          other_direct_costs?: number
          overhead_percentage?: number
          price?: number
          product_id?: string
          production?: Json
          sku?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      production_runs: {
        Row: {
          created_at: string
          date: string
          id: string
          kind: string
          organization_id: string
          quantity: number
          reason: string
          snapshot: Json
          status: string
          unit_cost: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          kind: string
          organization_id: string
          quantity: number
          reason: string
          snapshot: Json
          status?: string
          unit_cost: number
          variant_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          kind?: string
          organization_id?: string
          quantity?: number
          reason?: string
          snapshot?: Json
          status?: string
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_runs_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          created_by: string
          default_sale_price: number
          description: string
          id: string
          internal_sku: string
          minimum_margin: number
          name: string
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          created_by: string
          default_sale_price?: number
          description?: string
          id?: string
          internal_sku: string
          minimum_margin?: number
          name: string
          organization_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          created_by?: string
          default_sale_price?: number
          description?: string
          id?: string
          internal_sku?: string
          minimum_margin?: number
          name?: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchase_financial_links: {
        Row: {
          entry_id: string
          id: string
          organization_id: string
          purchase_id: string
        }
        Insert: {
          entry_id: string
          id?: string
          organization_id: string
          purchase_id: string
        }
        Update: {
          entry_id?: string
          id?: string
          organization_id?: string
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_financial_links_entry_id_organization_id_fkey"
            columns: ["entry_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "purchase_financial_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_financial_links_purchase_id_organization_id_fkey"
            columns: ["purchase_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "input_purchases"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      sale_receipts: {
        Row: {
          amount: number
          created_at: string
          date: string
          entry_id: string
          id: string
          order_id: string
          organization_id: string
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          entry_id: string
          id?: string
          order_id: string
          organization_id: string
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          entry_id?: string
          id?: string
          order_id?: string
          organization_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_receipts_entry_id_organization_id_fkey"
            columns: ["entry_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "transacoes"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "sale_receipts_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sale_receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          active: boolean
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_channels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_fee_rules: {
        Row: {
          active: boolean
          channel_id: string
          ends: string | null
          fixed: number
          id: string
          maximum: number | null
          minimum: number
          name: string
          organization_id: string
          percentage: number
          starts: string
        }
        Insert: {
          active?: boolean
          channel_id: string
          ends?: string | null
          fixed: number
          id?: string
          maximum?: number | null
          minimum?: number
          name: string
          organization_id: string
          percentage: number
          starts: string
        }
        Update: {
          active?: boolean
          channel_id?: string
          ends?: string | null
          fixed?: number
          id?: string
          maximum?: number | null
          minimum?: number
          name?: string
          organization_id?: string
          percentage?: number
          starts?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_fee_rules_channel_id_organization_id_fkey"
            columns: ["channel_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_fee_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_items: {
        Row: {
          id: string
          order_id: string
          organization_id: string
          price: number
          quantity: number
          snapshot: Json
          unit_cost: number
          variant_id: string
        }
        Insert: {
          id?: string
          order_id: string
          organization_id: string
          price: number
          quantity: number
          snapshot: Json
          unit_cost: number
          variant_id: string
        }
        Update: {
          id?: string
          order_id?: string
          organization_id?: string
          price?: number
          quantity?: number
          snapshot?: Json
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_items_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_items_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          channel_id: string
          closed: boolean
          cost: number
          created_at: string
          date: string
          discount: number
          due_date: string
          expected: number
          external_id: string
          fee_snapshot: Json
          fees: number
          gross: number
          id: string
          net: number
          notes: string
          organization_id: string
          other: number
          profit: number
          received: number
          shipping: number
          shipping_income: number
          status: string
          stock_mode: string
          taxes: number
        }
        Insert: {
          channel_id: string
          closed?: boolean
          cost: number
          created_at?: string
          date: string
          discount: number
          due_date: string
          expected: number
          external_id: string
          fee_snapshot?: Json
          fees: number
          gross: number
          id?: string
          net: number
          notes?: string
          organization_id: string
          other: number
          profit: number
          received?: number
          shipping: number
          shipping_income: number
          status?: string
          stock_mode: string
          taxes: number
        }
        Update: {
          channel_id?: string
          closed?: boolean
          cost?: number
          created_at?: string
          date?: string
          discount?: number
          due_date?: string
          expected?: number
          external_id?: string
          fee_snapshot?: Json
          fees?: number
          gross?: number
          id?: string
          net?: number
          notes?: string
          organization_id?: string
          other?: number
          profit?: number
          received?: number
          shipping?: number
          shipping_income?: number
          status?: string
          stock_mode?: string
          taxes?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_channel_id_organization_id_fkey"
            columns: ["channel_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "sales_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes: {
        Row: {
          atualizada_em: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          categoria_id: string | null
          competence_date: string | null
          conta_id: string
          cost_center_id: string | null
          created_by: string | null
          criada_em: string | null
          data_lancamento: string
          deletada_em: string | null
          deleted_by: string | null
          descricao: string
          due_date: string | null
          empresa_id: string
          hora_lancamento: string | null
          id: string
          idempotency_key: string | null
          installment_count: number | null
          installment_group: string | null
          installment_number: number | null
          motivo_delecao: string | null
          observacoes: string | null
          paid_amount: number
          paid_date: string | null
          saldo_corrente_apos: number | null
          sequence_number: number
          source_id: string | null
          source_type: string
          status: string
          tipo: string
          usuario_criador_id: string | null
          usuario_deleidor_id: string | null
          valor: number
          version: number
        }
        Insert: {
          atualizada_em?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          categoria_id?: string | null
          competence_date?: string | null
          conta_id: string
          cost_center_id?: string | null
          created_by?: string | null
          criada_em?: string | null
          data_lancamento: string
          deletada_em?: string | null
          deleted_by?: string | null
          descricao: string
          due_date?: string | null
          empresa_id: string
          hora_lancamento?: string | null
          id?: string
          idempotency_key?: string | null
          installment_count?: number | null
          installment_group?: string | null
          installment_number?: number | null
          motivo_delecao?: string | null
          observacoes?: string | null
          paid_amount?: number
          paid_date?: string | null
          saldo_corrente_apos?: number | null
          sequence_number?: number
          source_id?: string | null
          source_type?: string
          status?: string
          tipo: string
          usuario_criador_id?: string | null
          usuario_deleidor_id?: string | null
          valor: number
          version?: number
        }
        Update: {
          atualizada_em?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          categoria_id?: string | null
          competence_date?: string | null
          conta_id?: string
          cost_center_id?: string | null
          created_by?: string | null
          criada_em?: string | null
          data_lancamento?: string
          deletada_em?: string | null
          deleted_by?: string | null
          descricao?: string
          due_date?: string | null
          empresa_id?: string
          hora_lancamento?: string | null
          id?: string
          idempotency_key?: string | null
          installment_count?: number | null
          installment_group?: string | null
          installment_number?: number | null
          motivo_delecao?: string | null
          observacoes?: string | null
          paid_amount?: number
          paid_date?: string | null
          saldo_corrente_apos?: number | null
          sequence_number?: number
          source_id?: string | null
          source_type?: string
          status?: string
          tipo?: string
          usuario_criador_id?: string | null
          usuario_deleidor_id?: string | null
          valor?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_account_org_fk"
            columns: ["conta_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "transacoes_category_org_fk"
            columns: ["categoria_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "transacoes_center_org_fk"
            columns: ["cost_center_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "transacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_plan_org_fk"
            columns: ["installment_group", "empresa_id"]
            isOneToOne: false
            referencedRelation: "financial_installment_plans"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "transacoes_usuario_criador_id_fkey"
            columns: ["usuario_criador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacoes_usuario_deleidor_id_fkey"
            columns: ["usuario_deleidor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_user_id_fkey"
            columns: ["organization_id", "user_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          criado_em: string | null
          deletado_em: string | null
          email: string
          empresa_id: string
          id: string
          nome_completo: string
          role: string
          senha_hash: string
          ultimo_login: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          deletado_em?: string | null
          email: string
          empresa_id: string
          id?: string
          nome_completo: string
          role?: string
          senha_hash: string
          ultimo_login?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          criado_em?: string | null
          deletado_em?: string | null
          email?: string
          empresa_id?: string
          id?: string
          nome_completo?: string
          role?: string
          senha_hash?: string
          ultimo_login?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_attachment: {
        Args: { attachment_id: string }
        Returns: undefined
      }
      get_calculator_materials: { Args: { org: string }; Returns: Json }
      get_financial_catalog: {
        Args: { kind: string; org: string; page?: number; search?: string }
        Returns: Json
      }
      get_financial_entries: {
        Args: { filters?: Json; org: string; page?: number }
        Returns: Json
      }
      get_financial_payments: {
        Args: { entry: string; org: string; page?: number }
        Returns: Json
      }
      get_financial_summary: {
        Args: { org: string; page?: number }
        Returns: Json
      }
      get_input_history: {
        Args: { input: string; org: string; page?: number }
        Returns: Json
      }
      get_inputs: {
        Args: { org: string; page?: number; search?: string }
        Returns: Json
      }
      get_product_variants: {
        Args: { org: string; product: string }
        Returns: Json
      }
      get_products: {
        Args: { org: string; page?: number; search?: string; selected?: string }
        Returns: Json
      }
      import_row: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: Json
      }
      operate: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: Json
      }
      operation_data: {
        Args: { filters?: Json; org: string; section: string }
        Returns: Json
      }
      purchase_input: {
        Args: { finance?: Json; org: string; payload: Json; request_id: string }
        Returns: string
      }
      revise_financial_entry: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: string
      }
      save_calculator: {
        Args: {
          org: string
          product_payload: Json
          request_id: string
          variant_payload: Json
        }
        Returns: Json
      }
      save_financial_catalog: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: string
      }
      save_financial_entry: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: string
      }
      save_input: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: string
      }
      save_product: {
        Args: { org: string; payload: Json; request_id: string }
        Returns: string
      }
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
    Enums: {},
  },
} as const
