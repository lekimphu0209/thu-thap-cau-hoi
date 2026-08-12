import { useEffect, useRef, useState } from 'react'
import { guidelinesApi } from '../../api/guidelinesApi'
import type { GuidelineSection } from '../../lib/types'

interface SectionSelectProps {
  docId: number | null
  selectedSectionId: number | null
  onSelect: (section: GuidelineSection) => void
  onClear: () => void
}

export default function SectionSelect({
  docId,
  selectedSectionId,
  onSelect,
  onClear,
}: SectionSelectProps) {
  const [search, setSearch] = useState('')
  const [sections, setSections] = useState<GuidelineSection[]>([])
  const [selected, setSelected] = useState<GuidelineSection | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setSelected(null)
    setSections([])
    setSearch('')
    if (!docId) return

    const fetchSections = async () => {
      setLoading(true)
      try {
        const res = await guidelinesApi.listSections(docId, { search })
        setSections(res.data)
        if (selectedSectionId) {
          const found = res.data.find((s) => s.section_id === selectedSectionId)
          if (found) setSelected(found)
        }
      } catch {
        setSections([])
      } finally {
        setLoading(false)
      }
    }

    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(fetchSections, 300)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [docId, search, selectedSectionId])

  const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const sectionId = Number(event.target.value)
    const section = sections.find((s) => s.section_id === sectionId)
    if (section) {
      setSelected(section)
      onSelect(section)
    }
  }

  const handleClear = () => {
    setSelected(null)
    setSearch('')
    onClear()
  }

  if (!docId) {
    return <div className="form-hint">Vui lòng chọn tài liệu trước.</div>
  }

  return (
    <div>
      <input
        type="text"
        className="form-input"
        placeholder="Tìm mục / section..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {selected ? (
        <div className="selected-item" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge badge-default" style={{ flex: 1, textAlign: 'left' }}>
            {selected.section_path || `Mục ${selected.section_id}`}
          </span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={handleClear}>
            Đổi
          </button>
        </div>
      ) : (
        <select className="form-select" value="" onChange={handleSelect}>
          <option value="">{loading ? 'Đang tải...' : 'Chọn mục'}</option>
          {sections.map((section) => (
            <option key={section.section_id} value={section.section_id}>
              {section.section_path || `Mục ${section.section_id}`}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
