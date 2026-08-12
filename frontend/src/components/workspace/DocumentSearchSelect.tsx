import { useEffect, useRef, useState } from 'react'
import { guidelinesApi } from '../../api/guidelinesApi'
import type { GuidelineDocument } from '../../lib/types'

interface DocumentSearchSelectProps {
  selectedDocId: number | null
  onSelect: (doc: GuidelineDocument) => void
  onClear: () => void
}

export default function DocumentSearchSelect({
  selectedDocId,
  onSelect,
  onClear,
}: DocumentSearchSelectProps) {
  const [search, setSearch] = useState('')
  const [documents, setDocuments] = useState<GuidelineDocument[]>([])
  const [selected, setSelected] = useState<GuidelineDocument | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true)
      try {
        const res = await guidelinesApi.searchDocuments({ q: search, limit: 50 })
        setDocuments(res.data)
        if (selectedDocId) {
          const found = res.data.find((d) => d.doc_id === selectedDocId)
          if (found) setSelected(found)
        }
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
  }, [search, selectedDocId])

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = Number(event.target.value)
    const doc = documents.find((d) => d.doc_id === docId)
    if (doc) {
      setSelected(doc)
      onSelect(doc)
    }
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    onClear()
  }

  return (
    <div>
      <input
        type="text"
        className="form-input"
        placeholder="Tìm tài liệu..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {selected ? (
        <div className="selected-item" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge badge-default" style={{ flex: 1, textAlign: 'left' }}>
            {selected.title} {selected.version_label ? `(${selected.version_label})` : ''}
          </span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={handleClear}>
            Đổi
          </button>
        </div>
      ) : (
        <select className="form-select" value="" onChange={handleSelect}>
          <option value="">{loading ? 'Đang tải...' : 'Chọn tài liệu'}</option>
          {documents.map((doc) => (
            <option key={doc.doc_id} value={doc.doc_id}>
              {doc.title} {doc.version_label ? `(${doc.version_label})` : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
