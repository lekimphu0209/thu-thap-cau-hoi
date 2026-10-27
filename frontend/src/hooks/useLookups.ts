import { useEffect, useState } from 'react'
import { taxonomyApi } from '../api/taxonomyApi'
import type { LookupOption } from '../lib/types'

interface UseLookupsResult {
  expectedBehaviors: LookupOption[]
  reviewStatuses: LookupOption[]
  specialties: string[]
  diseaseCatalog: Record<string, string[]>
  loading: boolean
}

export function useLookups(): UseLookupsResult {
  const [expectedBehaviors, setExpectedBehaviors] = useState<LookupOption[]>([])
  const [reviewStatuses, setReviewStatuses] = useState<LookupOption[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [diseaseCatalog, setDiseaseCatalog] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      taxonomyApi.listExpectedBehaviors(),
      taxonomyApi.listReviewStatuses(),
      taxonomyApi.listSpecialties(),
      taxonomyApi.listDiseaseCatalog(),
    ])
      .then(([behaviors, statuses, specialtyList, catalog]) => {
        setExpectedBehaviors(behaviors.data)
        setReviewStatuses(statuses.data)
        setSpecialties(specialtyList.data)
        setDiseaseCatalog(catalog.data)
      })
      .finally(() => setLoading(false))
  }, [])

  return { expectedBehaviors, reviewStatuses, specialties, diseaseCatalog, loading }
}
