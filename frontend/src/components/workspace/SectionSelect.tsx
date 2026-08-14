import { useEffect, useRef, useState } from 'react'
import { guidelinesApi } from '../../api/guidelinesApi'
import type { GuidelineSection } from '../../lib/types'
import Combobox from './Combobox.tsx'

interface SectionSelectProps {
  docId: number | null
  selectedSectionId: number | null
  onSelect: (section: GuidelineSection) => void
  onClear: () => void
  invalid?: boolean
}

export default function SectionSelect({
  docId,
  selectedSectionId,
  onSelect,
  onClear,
  invalid = false,
}: SectionSelectProps) {
  const [search, setSearch] = useState('')
  const [sections, setSections] = useState<GuidelineSection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setSections([])
    setSearch('')
    setError(null)
  }, [docId])

  useEffect(() => {
    if (!docId) return

    const fetchSections = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await guidelinesApi.listSections(docId, { search })
        setSections(res.data)
      } catch {
        setSections([])
        setError('Không tải được danh sách section. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(fetchSections, 300)

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [docId, search])

  const handleSelect = (item: { id: number }) => {
    const section = sections.find((s) => s.section_id === item.id)
    if (section) onSelect(section)
  }

  const handleClear = () => {
    setSearch('')
    onClear()
  }

  const formatPath = (path: string) =>
    path
      .split(/[/>]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' › ')

  const previewFrom = (text: string) =>
    text.length > 140 ? `${text.slice(0, 140)}…` : text

  const items = sections.map((section) => {
    const heading = section.heading?.trim()
    const path = section.section_path?.trim()
    const label = heading || (path ? formatPath(path) : `Mục ${section.section_id}`)
    const abstract = section.text_abstract?.trim()
    const subPath = heading && path && path !== heading ? formatPath(path) : undefined
    const subLabel = abstract
      ? previewFrom(abstract)
      : subPath
    return {
      id: section.section_id,
      label,
      subLabel,
    }
  })

  return (
    <div style={{ width: '100%' }}>
      <Combobox
        value={selectedSectionId}
        items={items}
        searchValue={search}
        onSearchChange={setSearch}
        onSelect={handleSelect}
        onClear={handleClear}
        placeholder="Chọn tài liệu trước"
        searchPlaceholder="Vị trí (Chương/Mục/Trang)"
        disabled={!docId}
        loading={loading}
        emptyText="Không tìm thấy section phù hợp"
        invalid={invalid}
      />
      {error && <div className="field-error-text" style={{ marginTop: 6 }}>{error}</div>}
    </div>
  )
}
