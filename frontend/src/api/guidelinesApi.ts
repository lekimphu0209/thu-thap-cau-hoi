import { api } from '../lib/api'
import type { GuidelineDocument, GuidelineChunk } from '../lib/types'

export const guidelinesApi = {
  listDocuments: (params?: { search?: string; limit?: number; offset?: number }) =>
    api.get<GuidelineDocument[]>('/guidelines/documents', { params }),

  listChunks: (docId: number, params?: { search?: string }) =>
    api.get<GuidelineChunk[]>(`/guidelines/documents/${docId}/chunks`, { params }),
}
