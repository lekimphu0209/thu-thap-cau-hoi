import { api } from '../lib/api'
import type { LookupOption, QuestionGroup, Subgroup, UpdateSubgroupRequest } from '../lib/types'

export const taxonomyApi = {
  listGroups: () => api.get<QuestionGroup[]>('/taxonomy/groups'),
  listExpectedBehaviors: () => api.get<LookupOption[]>('/taxonomy/expected-behaviors'),
  listReviewStatuses: () => api.get<LookupOption[]>('/taxonomy/review-statuses'),
  listSpecialties: () => api.get<string[]>('/taxonomy/specialties'),
  listDiseaseCatalog: () => api.get<Record<string, string[]>>('/taxonomy/disease-catalog'),
  updateSubgroup: (subgroupId: number, payload: UpdateSubgroupRequest) =>
    api.patch<Subgroup>(`/admin/subgroups/${subgroupId}`, payload),
}
