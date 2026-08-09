export interface UserResponse {
  user_id: number
  email: string
  full_name: string
  role: 'admin' | 'doctor'
  specialty: string | null
  is_active: boolean
  survey_completed: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: UserResponse
}

export interface DoctorListResponse {
  items: UserResponse[]
  total: number
}

export interface CreateDoctorRequest {
  email: string
  full_name: string
  specialty: string
  password: string
}

export interface UpdateDoctorRequest {
  full_name?: string
  specialty?: string
  is_active?: boolean
  password?: string
}

export interface SubgroupExample {
  role: string
  query: string
}

export interface Subgroup {
  subgroup_id: number
  code: string
  name: string
  purpose: string
  typical_role: string | null
  expected_retrieval: string | null
  order_index: number
  target_count: number
  examples: SubgroupExample[]
  done_count: number
}

export interface QuestionGroup {
  group_id: number
  code: string
  name: string
  annotate_guidance: string | null
  order_index: number
  subgroups: Subgroup[]
}

export interface LookupOption {
  value: string
  label: string
}

export interface UpdateSubgroupRequest {
  name?: string
  purpose?: string
  typical_role?: string
  expected_retrieval?: string
  target_count?: number
}

export type CitationType = 'REQUIRED' | 'SUPPORTING'

export interface CitationInput {
  citation_type: CitationType
  chunk_id: number | null
  manual_doc_name: string | null
  manual_location: string | null
}

export type CitationDraft = CitationInput

export interface CitationOutput {
  citation_id: number
  citation_type: CitationType
  chunk_id: number | null
  chunk: GuidelineChunk | null
  manual_doc_name: string | null
  manual_location: string | null
}

export interface RequiredAnswerPointInput {
  content: string
}

export interface RequiredAnswerPointOutput {
  answer_point_id: number
  content: string
  order_index: number
}

export interface QaEntryUpsertRequest {
  subgroup_id: number
  role: string
  disease_or_topic: string
  query: string
  expected_behavior: string
  evidence: string
  finding: string
  impression: string
  conclusion: string
  required_answer_points: RequiredAnswerPointInput[]
  safety_notes: string | null
  annotator_name: string
  review_status: string
  note_for_expert: string | null
  citations: CitationInput[]
}

export interface QaEntry {
  entry_id: string
  doctor_id: number
  subgroup_id: number
  slot_index: number
  is_extra: boolean
  role: string
  disease_or_topic: string
  query: string
  expected_behavior: string
  evidence: string
  finding: string
  impression: string
  conclusion: string
  required_answer_points: RequiredAnswerPointOutput[]
  safety_notes: string | null
  annotator_name: string
  review_status: string
  note_for_expert: string | null
  created_at: string
  updated_at: string
  citations: CitationOutput[]
}

export interface GuidelineDocument {
  doc_id: number
  title: string
  ten_benh: string | null
  chuyen_khoa: string | null
  publisher: string | null
  version_label: string | null
  status: string | null
  release_date: string | null
}

export interface GuidelineChunk {
  chunk_id: number
  doc_id: number
  doc_title: string
  section_heading: string | null
  text: string
  text_abstract: string | null
}

export interface QaEntryCreateResult {
  entry: QaEntry
  duplicate_warning: boolean
}

export interface SubgroupMinimapItem {
  subgroup_id: number
  code: string
  done_count: number
  target_count: number
}

export interface DoctorProgress {
  user_id: number
  full_name: string
  email: string
  specialty: string | null
  is_active: boolean
  total_entries: number
  target_total: number
  types_done: number
  types_total: number
  status: 'done' | 'in_progress' | 'new'
  minimap: SubgroupMinimapItem[]
}

export type SurveyControl =
  | 'radio'
  | 'select'
  | 'search_select'
  | 'checkbox'
  | 'scale'
  | 'consent'
  | 'signature'
  | 'text'

export type SurveyAnswerValue = string | string[] | number | boolean | null

export type SurveyAnswers = Record<string, SurveyAnswerValue>

export interface SurveyQuestion {
  code: string
  label: string
  control: SurveyControl
  options: string[]
  required: boolean
  allow_other: boolean
  help_text: string | null
  placeholder: string | null
  scale_labels: string[]
}

export interface SurveyConsentBlock {
  heading: string
  paragraphs: string[]
}

export interface SurveySection {
  code: string
  title: string
  description: string
  consent_blocks: SurveyConsentBlock[]
  questions: SurveyQuestion[]
}

export interface SurveyDefinition {
  version: string
  other_value: string
  other_suffix: string
  sections: SurveySection[]
}

export interface SurveyState {
  status: 'in_progress' | 'completed'
  version: string
  answers: SurveyAnswers
  consent_signature: string | null
  consent_agreed: boolean
  completed_at: string | null
  updated_at: string
}

export interface SurveyResponse {
  doctor_id: number
  full_name: string
  email: string
  specialty: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  version: string | null
  answers: SurveyAnswers
  consent_signature: string | null
  consent_agreed: boolean
  completed_at: string | null
  updated_at: string | null
}

export interface SurveyOverview {
  doctors_total: number
  completed_total: number
  in_progress_total: number
  not_started_total: number
  responses: SurveyResponse[]
}

export interface AdminOverview {
  doctors_total: number
  entries_total: number
  entries_target: number
  completion_pct: number
  doctors_done: number
  doctors: DoctorProgress[]
}
