import { useEffect, useRef, useState } from 'react'
import { guidelinesApi } from '../../api/guidelinesApi'
import type { GuidelineDocument } from '../../lib/types'
import Combobox from './Combobox.tsx'

interface DocumentSearchSelectProps {
  selectedDocId: number | null
  onSelect: (doc: GuidelineDocument) => void
  onClear: () => void
  invalid?: boolean
}

export default function DocumentSearchSelect({
  selectedDocId,
  onSelect,
  onClear,
  invalid = false,
}: DocumentSearchSelectProps) {
  const [search, setSearch] = useState('')
  const [documents, setDocuments] = useState<GuidelineDocument[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true)
      try {
        const res = await guidelinesApi.searchDocuments({ q: search, limit: 50 })
        setDocuments(res.data)
      } catch {
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }

    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(fetchDocuments, 300)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [search])

  useEffect(() => {
    if (!selectedDocId) return
    const fetchOne = async () => {
      try {
        const res = await guidelinesApi.searchDocuments({ q: '', limit: 200 })
        const found = res.data.find((d) => d.doc_id === selectedDocId)
        if (found) {
          setDocuments((prev) => (prev.some((d) => d.doc_id === found.doc_id) ? prev : [...prev, found]))
        }
      } catch {
        // ignore
      }
    }
    fetchOne()
  }, [selectedDocId])

  const handleSelect = (item: { id: number }) => {
    const doc = documents.find((d) => d.doc_id === item.id)
    if (doc) onSelect(doc)
  }

  const handleClear = () => {
    setSearch('')
    onClear()
  }

  const items = documents.map((doc) => ({
    id: doc.doc_id,
    label: doc.title,
    subLabel: [doc.publisher, doc.version_label].filter(Boolean).join(' · '),
  }))

  return (
    <Combobox
      value={selectedDocId}
      items={items}
      searchValue={search}
      onSearchChange={setSearch}
      onSelect={handleSelect}
      onClear={handleClear}
      placeholder="Chọn tài liệu"
      searchPlaceholder="Tìm tài liệu guideline..."
      loading={loading}
      emptyText="Không tìm thấy tài liệu phù hợp"
      invalid={invalid}
    />
  )
}
