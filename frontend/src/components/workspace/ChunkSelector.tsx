import { useEffect, useState } from 'react'
import { guidelinesApi } from '../../api/guidelinesApi'
import { extractErrorMessage } from '../../lib/api'
import type { CitationInput, GuidelineChunk } from '../../lib/types'

interface ChunkSelectorProps {
  selectedDocId: number | null
  selectedChunks: CitationInput[]
  onChange: (chunks: CitationInput[]) => void
}

export default function ChunkSelector({
  selectedDocId,
  selectedChunks,
  onChange,
}: ChunkSelectorProps) {
  const [chunks, setChunks] = useState<GuidelineChunk[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDocId) {
      setChunks([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    guidelinesApi
      .listChunks(selectedDocId, { search })
      .then((res) => {
        if (!cancelled) setChunks(res.data)
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Không tải được danh sách chunk'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDocId, search])

  const selectedIds = new Set(selectedChunks.map((c) => c.chunk_id))

  function toggleChunk(chunk: GuidelineChunk) {
    if (selectedIds.has(chunk.chunk_id)) {
      onChange(selectedChunks.filter((c) => c.chunk_id !== chunk.chunk_id))
    } else {
      onChange([
        ...selectedChunks,
        {
          citation_type: 'REQUIRED',
          chunk_id: chunk.chunk_id,
          manual_doc_name: null,
          manual_location: null,
        },
      ])
    }
  }

  function setType(chunkId: number, citationType: 'REQUIRED' | 'SUPPORTING') {
    onChange(
      selectedChunks.map((c) =>
        c.chunk_id === chunkId ? { ...c, citation_type: citationType } : c,
      ),
    )
  }

  if (!selectedDocId) {
    return <div className="field-hint">Chọn tài liệu guideline trước để xem danh sách chunk.</div>
  }

  return (
    <div>
      <input
        type="text"
        className="form-input"
        placeholder="Tìm theo tiêu đề mục hoặc nội dung"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ marginBottom: 10 }}
      />
      {loading && <div className="field-hint">Đang tải chunk...</div>}
      {error && <div className="field-error-text">{error}</div>}
      <div>
        {chunks.map((chunk) => {
          const selected = selectedChunks.find((c) => c.chunk_id === chunk.chunk_id)
          return (
            <div key={chunk.chunk_id} className="card" style={{ marginBottom: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!selected}
                  onChange={() => toggleChunk(chunk)}
                />
                <span style={{ fontWeight: 500, flex: 1 }}>
                  {chunk.section_heading || '—'}
                </span>
                {selected && (
                  <select
                    className="form-select"
                    style={{ width: 140 }}
                    value={selected.citation_type}
                    onChange={(event) =>
                      setType(chunk.chunk_id, event.target.value as 'REQUIRED' | 'SUPPORTING')
                    }
                  >
                    <option value="REQUIRED">Bắt buộc</option>
                    <option value="SUPPORTING">Bổ trợ</option>
                  </select>
                )}
              </div>
              <div
                className="field-value-block"
                style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}
              >
                {selected
                  ? chunk.text_abstract || chunk.text
                  : (chunk.text_abstract || chunk.text).slice(0, 120) +
                    ((chunk.text_abstract || chunk.text).length > 120 ? '…' : '')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
