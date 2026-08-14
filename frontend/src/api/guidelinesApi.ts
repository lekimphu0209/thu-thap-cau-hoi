import { api } from '../lib/api'
import type { GuidelineDocument, GuidelineSection } from '../lib/types'

export const guidelinesApi = {
  listDocuments: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get<GuidelineDocument[]>('/guidelines/documents', { params }),

  searchDocuments: (params?: { q?: string; limit?: number }) =>
    api.get<GuidelineDocument[]>('/guidelines/documents/search', { params }),

  listSections: (docId: number, params?: { search?: string }) =>
    api.get<GuidelineSection[]>(`/guidelines/documents/${docId}/sections`, { params }),
}
