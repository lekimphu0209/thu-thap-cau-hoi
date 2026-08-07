import { api } from '../lib/api'
import type {
  SurveyAnswers,
  SurveyDefinition,
  SurveyOverview,
  SurveyResponse,
  SurveyState,
} from '../lib/types'

export type SurveyExportFormat = 'csv' | 'json' | 'xlsx'

export const surveyApi = {
  getDefinition: () => api.get<SurveyDefinition>('/survey/definition'),
  getMine: () => api.get<SurveyState>('/survey/me'),
  saveDraft: (answers: SurveyAnswers) => api.put<SurveyState>('/survey/me', { answers }),
  submit: (answers: SurveyAnswers) => api.post<SurveyState>('/survey/me/submit', { answers }),
  listResponses: () => api.get<SurveyOverview>('/admin/surveys'),
  getResponse: (doctorId: number) => api.get<SurveyResponse>(`/admin/surveys/${doctorId}`),
  deleteResponse: (doctorId: number) => api.delete(`/admin/surveys/${doctorId}`),
  download: async (format: SurveyExportFormat): Promise<void> => {
    const response = await api.get('/admin/surveys/export', {
      params: { format },
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.download = `doctor_survey_responses.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },
}
