export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      contracts: {
        Row: {
          id: string
          project_id: string | null
          title: string
          contract_number: string | null
          contract_type: Database["public"]["Enums"]["contract_type_enum"]
          governing_law: Database["public"]["Enums"]["governing_law_enum"]
          status: Database["public"]["Enums"]["contract_status_enum"]
          employer_name: string | null
          contractor_name: string | null
          contract_value: number | null
          currency: string | null
          effective_date: string | null
          expiry_date: string | null
          defects_liability_end: string | null
          file_url: string | null
          original_filename: string | null
          file_size_bytes: number | null
          ai_extracted: boolean | null
          ai_extracted_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          // Phase 0 additions
          analysis_version: number | null
          project_type_config: string | null
          risk_score: number | null
          checklist_completion: number | null
          // BOQ additions
          boq_data: Json | null
          ai_analysis_results: Json | null
          ai_analyzed_at: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          title: string
          contract_number?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type_enum"]
          governing_law?: Database["public"]["Enums"]["governing_law_enum"]
          status?: Database["public"]["Enums"]["contract_status_enum"]
          employer_name?: string | null
          contractor_name?: string | null
          contract_value?: number | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          defects_liability_end?: string | null
          file_url?: string | null
          original_filename?: string | null
          file_size_bytes?: number | null
          ai_extracted?: boolean | null
          ai_extracted_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          analysis_version?: number | null
          project_type_config?: string | null
          risk_score?: number | null
          checklist_completion?: number | null
          boq_data?: Json | null
          ai_analysis_results?: Json | null
          ai_analyzed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          title?: string
          contract_number?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type_enum"]
          governing_law?: Database["public"]["Enums"]["governing_law_enum"]
          status?: Database["public"]["Enums"]["contract_status_enum"]
          employer_name?: string | null
          contractor_name?: string | null
          contract_value?: number | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          defects_liability_end?: string | null
          file_url?: string | null
          original_filename?: string | null
          file_size_bytes?: number | null
          ai_extracted?: boolean | null
          ai_extracted_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          analysis_version?: number | null
          project_type_config?: string | null
          risk_score?: number | null
          checklist_completion?: number | null
          boq_data?: Json | null
          ai_analysis_results?: Json | null
          ai_analyzed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ongoing_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_clauses: {
        Row: {
          id: string
          contract_id: string
          clause_number: string | null
          clause_title: string | null
          clause_body: string
          clause_type: Database["public"]["Enums"]["clause_type_enum"]
          is_flagged: boolean
          flag_note: string | null
          source: string | null
          page_reference: string | null
          sort_order: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          clause_number?: string | null
          clause_title?: string | null
          clause_body: string
          clause_type?: Database["public"]["Enums"]["clause_type_enum"]
          is_flagged?: boolean
          flag_note?: string | null
          source?: string | null
          page_reference?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          clause_number?: string | null
          clause_title?: string | null
          clause_body?: string
          clause_type?: Database["public"]["Enums"]["clause_type_enum"]
          is_flagged?: boolean
          flag_note?: string | null
          source?: string | null
          page_reference?: string | null
          sort_order?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_clauses_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_amendments: {
        Row: {
          id: string
          contract_id: string
          amendment_number: number
          title: string
          description: string | null
          effective_date: string | null
          file_url: string | null
          original_filename: string | null
          affected_clauses: string[] | null
          value_change: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          amendment_number?: number
          title: string
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          original_filename?: string | null
          affected_clauses?: string[] | null
          value_change?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          amendment_number?: number
          title?: string
          description?: string | null
          effective_date?: string | null
          file_url?: string | null
          original_filename?: string | null
          affected_clauses?: string[] | null
          value_change?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_module_access: {
        Row: {
          id: string
          module_path: string
          module_label: string
          allowed_roles: string[]
          role: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          module_path: string
          module_label?: string
          allowed_roles?: string[]
          role?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          module_path?: string
          module_label?: string
          allowed_roles?: string[]
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contract_risk_items: {
        Row: {
          id: string
          contract_id: string
          item_number: number
          category: string
          risk_description: string
          current_wording: string | null
          required_wording: string | null
          severity: string
          responsibility: string | null
          status: string
          ai_generated: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          item_number: number
          category: string
          risk_description: string
          current_wording?: string | null
          required_wording?: string | null
          severity?: string
          responsibility?: string | null
          status?: string
          ai_generated?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          item_number?: number
          category?: string
          risk_description?: string
          current_wording?: string | null
          required_wording?: string | null
          severity?: string
          responsibility?: string | null
          status?: string
          ai_generated?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_risk_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_review_checklist: {
        Row: {
          id: string
          contract_id: string
          item_number: number
          checklist_item: string
          status: string
          notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          ai_assessment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          item_number: number
          checklist_item: string
          status?: string
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          ai_assessment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          item_number?: number
          checklist_item?: string
          status?: string
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          ai_assessment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_review_checklist_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_project_config: {
        Row: {
          id: string
          project_type: string
          display_name_ar: string
          display_name_en: string
          risk_weights: Json | null
          checklist_overrides: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_type: string
          display_name_ar: string
          display_name_en: string
          risk_weights?: Json | null
          checklist_overrides?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_type?: string
          display_name_ar?: string
          display_name_en?: string
          risk_weights?: Json | null
          checklist_overrides?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      ongoing_projects: {
        Row: {
          id: string
          project_code: string
          project_name: string
          name_ar: string | null
          project_type: string | null
          sector: string | null
          zone: string | null
          contract_value: number | null
          contract_type: string | null
          currency: string | null
          retention_pct: number | null
          advance_payment_pct: number | null
          project_status: string | null
          completion_pct: number | null
          start_date: string | null
          end_date: string | null
          actual_end_date: string | null
          duration_days: number | null
          project_manager: string | null
          phone: string | null
          notes: string | null
          tender_id: string | null
          budget_header_id: string | null
          client_id: string | null
          advanced_payment: number | null
          est_sent_date: string | null
          delay_days: number | null
          actual_sent_date: string | null
          progress_statement: string | null
          progress_date: string | null
          invoice_status: string | null
          approval_date: string | null
          progress_sheet: boolean | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_code: string
          project_name: string
          name_ar?: string | null
          project_type?: string | null
          sector?: string | null
          zone?: string | null
          contract_value?: number | null
          contract_type?: string | null
          currency?: string | null
          retention_pct?: number | null
          advance_payment_pct?: number | null
          project_status?: string | null
          completion_pct?: number | null
          start_date?: string | null
          end_date?: string | null
          actual_end_date?: string | null
          duration_days?: number | null
          project_manager?: string | null
          phone?: string | null
          notes?: string | null
          tender_id?: string | null
          budget_header_id?: string | null
          client_id?: string | null
          advanced_payment?: number | null
          est_sent_date?: string | null
          delay_days?: number | null
          actual_sent_date?: string | null
          progress_statement?: string | null
          progress_date?: string | null
          invoice_status?: string | null
          approval_date?: string | null
          progress_sheet?: boolean | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_code?: string
          project_name?: string
          name_ar?: string | null
          project_type?: string | null
          sector?: string | null
          zone?: string | null
          contract_value?: number | null
          contract_type?: string | null
          currency?: string | null
          retention_pct?: number | null
          advance_payment_pct?: number | null
          project_status?: string | null
          completion_pct?: number | null
          start_date?: string | null
          end_date?: string | null
          actual_end_date?: string | null
          duration_days?: number | null
          project_manager?: string | null
          phone?: string | null
          notes?: string | null
          tender_id?: string | null
          budget_header_id?: string | null
          client_id?: string | null
          advanced_payment?: number | null
          est_sent_date?: string | null
          delay_days?: number | null
          actual_sent_date?: string | null
          progress_statement?: string | null
          progress_date?: string | null
          invoice_status?: string | null
          approval_date?: string | null
          progress_sheet?: boolean | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ongoing_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          phone: string | null
          department: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          avatar_url?: string | null
          phone?: string | null
          department?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          type: string
          related_entity_type: string | null
          related_entity_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          type?: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string | null
          type?: string
          related_entity_type?: string | null
          related_entity_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenders: {
        Row: {
          id: string
          tender_number: string | null
          title: string
          client_id: string | null
          status: string | null
          submission_date: string | null
          estimated_value: number | null
          currency: string | null
          description: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tender_number?: string | null
          title: string
          client_id?: string | null
          status?: string | null
          submission_date?: string | null
          estimated_value?: number | null
          currency?: string | null
          description?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tender_number?: string | null
          title?: string
          client_id?: string | null
          status?: string | null
          submission_date?: string | null
          estimated_value?: number | null
          currency?: string | null
          description?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      budget_headers: {
        Row: {
          id: string
          project_id: string | null
          total_budget: number | null
          status: string | null
          approved_by: string | null
          approved_at: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          total_budget?: number | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          total_budget?: number | null
          status?: string | null
          approved_by?: string | null
          approved_at?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_headers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ongoing_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      budget_lines: {
        Row: {
          id: string
          budget_header_id: string
          line_number: number | null
          description: string
          quantity: number | null
          unit: string | null
          unit_cost: number | null
          total_cost: number | null
          category: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_header_id: string
          line_number?: number | null
          description: string
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_header_id?: string
          line_number?: number | null
          description?: string
          quantity?: number | null
          unit?: string | null
          unit_cost?: number | null
          total_cost?: number | null
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_header_id_fkey"
            columns: ["budget_header_id"]
            isOneToOne: false
            referencedRelation: "budget_headers"
            referencedColumns: ["id"]
          }
        ]
      }
      budget_line_costs: {
        Row: {
          id: string
          budget_line_id: string
          cost_type: string | null
          amount: number | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          budget_line_id: string
          cost_type?: string | null
          amount?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          budget_line_id?: string
          cost_type?: string | null
          amount?: number | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_costs_budget_line_id_fkey"
            columns: ["budget_line_id"]
            isOneToOne: false
            referencedRelation: "budget_lines"
            referencedColumns: ["id"]
          }
        ]
      }
      project_milestones: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          due_date: string | null
          status: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          due_date?: string | null
          status?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          status?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ongoing_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      project_team: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          role: string | null
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          role?: string | null
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          role?: string | null
          name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_team_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "ongoing_projects"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_ipcs: {
        Row: {
          id: string
          contract_id: string
          project_id: string | null
          ipc_number: number
          period_from: string | null
          period_to: string | null
          submission_date: string | null
          approval_date: string | null
          status: string
          previous_cumulative: number
          current_work_done: number
          cumulative_value: number
          retention_deduction: number
          advance_recovery: number
          other_deductions: number
          net_payable: number
          completion_pct: number
          notes: string | null
          submitted_by: string | null
          approved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          project_id?: string | null
          ipc_number: number
          period_from?: string | null
          period_to?: string | null
          submission_date?: string | null
          approval_date?: string | null
          status?: string
          previous_cumulative?: number
          current_work_done?: number
          cumulative_value?: number
          retention_deduction?: number
          advance_recovery?: number
          other_deductions?: number
          net_payable?: number
          completion_pct?: number
          notes?: string | null
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          project_id?: string | null
          ipc_number?: number
          period_from?: string | null
          period_to?: string | null
          submission_date?: string | null
          approval_date?: string | null
          status?: string
          previous_cumulative?: number
          current_work_done?: number
          cumulative_value?: number
          retention_deduction?: number
          advance_recovery?: number
          other_deductions?: number
          net_payable?: number
          completion_pct?: number
          notes?: string | null
          submitted_by?: string | null
          approved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_ipcs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_ipc_lines: {
        Row: {
          id: string
          ipc_id: string
          boq_item_ref: string | null
          description: string
          unit: string | null
          contract_qty: number | null
          contract_rate: number | null
          previous_qty: number
          current_qty: number
          cumulative_qty: number
          amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          ipc_id: string
          boq_item_ref?: string | null
          description: string
          unit?: string | null
          contract_qty?: number | null
          contract_rate?: number | null
          previous_qty?: number
          current_qty?: number
          cumulative_qty?: number
          amount?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          ipc_id?: string
          boq_item_ref?: string | null
          description?: string
          unit?: string | null
          contract_qty?: number | null
          contract_rate?: number | null
          previous_qty?: number
          current_qty?: number
          cumulative_qty?: number
          amount?: number
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_ipc_lines_ipc_id_fkey"
            columns: ["ipc_id"]
            isOneToOne: false
            referencedRelation: "contract_ipcs"
            referencedColumns: ["id"]
          }
        ]
      }
      schedule_baselines: {
        Row: {
          id: string
          contract_id: string
          version: number
          title: string
          approved_date: string | null
          approved_by: string | null
          is_current: boolean
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          version?: number
          title: string
          approved_date?: string | null
          approved_by?: string | null
          is_current?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          version?: number
          title?: string
          approved_date?: string | null
          approved_by?: string | null
          is_current?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_baselines_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      schedule_activities: {
        Row: {
          id: string
          baseline_id: string
          activity_id: string | null
          activity_name: string
          parent_id: string | null
          planned_start: string | null
          planned_finish: string | null
          actual_start: string | null
          actual_finish: string | null
          planned_duration: number | null
          actual_duration: number | null
          weight_pct: number
          planned_pct: number
          actual_pct: number
          status: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          baseline_id: string
          activity_id?: string | null
          activity_name: string
          parent_id?: string | null
          planned_start?: string | null
          planned_finish?: string | null
          actual_start?: string | null
          actual_finish?: string | null
          planned_duration?: number | null
          actual_duration?: number | null
          weight_pct?: number
          planned_pct?: number
          actual_pct?: number
          status?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          baseline_id?: string
          activity_id?: string | null
          activity_name?: string
          parent_id?: string | null
          planned_start?: string | null
          planned_finish?: string | null
          actual_start?: string | null
          actual_finish?: string | null
          planned_duration?: number | null
          actual_duration?: number | null
          weight_pct?: number
          planned_pct?: number
          actual_pct?: number
          status?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_activities_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "schedule_baselines"
            referencedColumns: ["id"]
          }
        ]
      }
      contract_alarms: {
        Row: {
          id: string
          contract_id: string
          alarm_type: string
          trigger_days_before: number
          message_template: string | null
          is_active: boolean
          last_triggered_at: string | null
          notify_roles: string[]
          created_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          alarm_type: string
          trigger_days_before?: number
          message_template?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          notify_roles?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          alarm_type?: string
          trigger_days_before?: number
          message_template?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          notify_roles?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_alarms_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
      project_notebooks: {
        Row: {
          id: string
          project_id: string | null
          contract_id: string | null
          notebook_id: string
          notebook_title: string | null
          source_type: string
          synced_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          contract_id?: string | null
          notebook_id: string
          notebook_title?: string | null
          source_type?: string
          synced_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string | null
          contract_id?: string | null
          notebook_id?: string
          notebook_title?: string | null
          source_type?: string
          synced_at?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notebooks_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "chairman"
        | "ceo"
        | "finance"
        | "project_manager"
        | "estimator"
        | "cost_control"
        | "procurement"
        | "inventory"
        | "site_engineer"
        | "admin"
        | "contract_admin"
        | "ipc_clerk"
        | "scheduler"
        | "board_member"
      contract_type_enum:
        | "FIDIC_RED"
        | "FIDIC_YELLOW"
        | "FIDIC_SILVER"
        | "FIDIC_GREEN"
        | "EGYPTIAN_LAW"
        | "CUSTOM"
      governing_law_enum: "egyptian" | "international" | "mixed"
      contract_status_enum:
        | "draft"
        | "active"
        | "under_amendment"
        | "suspended"
        | "completed"
        | "terminated"
        | "archived"
      clause_type_enum:
        | "general_conditions"
        | "employer_obligations"
        | "contractor_obligations"
        | "contract_price"
        | "payment_terms"
        | "advance_payment"
        | "retention"
        | "variations"
        | "claims"
        | "liquidated_damages"
        | "force_majeure"
        | "termination"
        | "defects_liability"
        | "insurance"
        | "dispute_resolution"
        | "subcontracting"
        | "commercial_registry"
        | "tax_compliance"
        | "performance_bond"
        | "arbitration_egypt"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
