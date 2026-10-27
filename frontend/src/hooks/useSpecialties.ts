import { useEffect, useState } from 'react'
import { taxonomyApi } from '../api/taxonomyApi'

export function useSpecialties(): string[] {
  const [specialties, setSpecialties] = useState<string[]>([])

  useEffect(() => {
    taxonomyApi
      .listSpecialties()
      .then((response) => setSpecialties(response.data))
      .catch(() => setSpecialties([]))
  }, [])

  return specialties
}
