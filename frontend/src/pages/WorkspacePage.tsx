import { Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { entriesApi } from '../api/entriesApi'
import { exportApi, type ExportFormat } from '../api/exportApi'
import EntryForm, { type EntryFormHandle } from '../components/workspace/EntryForm'
import GuideBox from '../components/workspace/GuideBox'
import SlotList from '../components/workspace/SlotList'
import SubgroupSidebar from '../components/workspace/SubgroupSidebar'
import WorkspaceRail from '../components/workspace/WorkspaceRail'
import Toast from '../components/Toast'
import TopBar from '../components/TopBar'
import { useEntries } from '../hooks/useEntries'
import { useLookups } from '../hooks/useLookups'
import { useTaxonomy } from '../hooks/useTaxonomy'
import { useToast } from '../hooks/useToast'
import { extractErrorMessage } from '../lib/api'
import type { QaEntry, QaEntryUpsertRequest, Subgroup } from '../lib/types'
import { useAuth } from '../store/auth'

const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export default function WorkspacePage() {
  const { user } = useAuth()
  const { groups, loading: taxonomyLoading, refresh: refreshTaxonomy } = useTaxonomy()
  const { expectedBehaviors, reviewStatuses } = useLookups()
  const { toastMessage, showToast } = useToast()

  const [selectedSubgroup, setSelectedSubgroup] = useState<Subgroup | null>(null)
  const [editingEntry, setEditingEntry] = useState<QaEntry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formRef = useRef<EntryFormHandle>(null)

  const { entries, refresh: refreshEntries } = useEntries(selectedSubgroup?.subgroup_id ?? null)

  useEffect(() => {
    const now = Date.now()
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('qa-draft:')) continue
      try {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const parsed = JSON.parse(raw)
        if (typeof parsed.savedAt === 'number' && now - parsed.savedAt > DRAFT_MAX_AGE_MS) {
          localStorage.removeItem(key)
        }
      } catch {
        // ignore malformed entries
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedSubgroup && groups.length > 0) {
      setSelectedSubgroup(groups[0].subgroups[0])
    }
  }, [groups, selectedSubgroup])

  const liveSubgroup =
    groups.flatMap((group) => group.subgroups).find((sg) => sg.subgroup_id === selectedSubgroup?.subgroup_id) ??
    selectedSubgroup
  const currentGroup = groups.find((group) => group.subgroups.some((sg) => sg.subgroup_id === liveSubgroup?.subgroup_id)) ?? null

  function handleSelectSubgroup(subgroup: Subgroup) {
    setSelectedSubgroup(subgroup)
    setEditingEntry(null)
    setFormError(null)
  }

  function handleUseExample(query: string) {
    formRef.current?.fillQuery(query)
  }

  async function handleSubmit(payload: QaEntryUpsertRequest) {
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingEntry) {
        await entriesApi.update(editingEntry.entry_id, payload)
        showToast('✓ Đã cập nhật câu hỏi')
        setEditingEntry(null)
      } else {
        const response = await entriesApi.create(payload)
        showToast(response.data.duplicate_warning ? '✓ Đã lưu — lưu ý câu hỏi có thể trùng với câu đã có' : '✓ Đã lưu câu hỏi')
        formRef.current?.reset()
      }
      await Promise.all([refreshEntries(), refreshTaxonomy()])
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Không thể lưu câu hỏi.'))
      throw error
    } finally {
      setSubmitting(false)
    }
  }

  function handleEdit(entry: QaEntry) {
    setEditingEntry(entry)
    setFormError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDelete(entry: QaEntry) {
    if (!window.confirm('Xoá câu hỏi này?')) return
    await entriesApi.remove(entry.entry_id)
    if (editingEntry?.entry_id === entry.entry_id) setEditingEntry(null)
    showToast('Đã xoá câu hỏi')
    await Promise.all([refreshEntries(), refreshTaxonomy()])
  }

  async function handleExport(format: ExportFormat) {
    try {
      await exportApi.download({ format, doctorId: user?.user_id })
      showToast(`✓ Đã tải file ${format.toUpperCase()}`)
    } catch (error) {
      showToast(extractErrorMessage(error, `Không thể xuất file ${format.toUpperCase()}.`))
    }
  }

  const overallTotal = groups
    .flatMap((group) => group.subgroups)
    .reduce((sum, subgroup) => sum + Math.min(subgroup.done_count, subgroup.target_count), 0)
  const overallTarget = groups.flatMap((group) => group.subgroups).reduce((sum, subgroup) => sum + subgroup.target_count, 0)
  const overallPct = overallTarget > 0 ? Math.round((overallTotal / overallTarget) * 100) : 0

  return (
    <div className="flex-col" style={{ minHeight: '100%' }}>
      <TopBar title="Dataset Builder" subtitle="Nền tảng thu thập bộ câu hỏi & đáp án chuẩn cho chatbot y tế.">
        <div className="overall-progress">
          <div className="bar">
            <div className="fill" style={{ width: `${overallPct}%` }} />
          </div>
          <small className="tnum">
            <b>{overallTotal}</b>/{overallTarget || 0} câu
          </small>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 12 }} onClick={() => handleExport('json')}>
          <Download size={13} /> JSON
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleExport('csv')}>
          <Download size={13} /> CSV
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleExport('xlsx')}>
          <Download size={13} /> XLSX
        </button>
      </TopBar>

      {taxonomyLoading || !liveSubgroup ? (
        <div className="loading-center">
          <span className="loading-spinner" />
          Đang tải dữ liệu...
        </div>
      ) : (
        <div className="workspace-layout">
          <SubgroupSidebar groups={groups} selectedSubgroupId={liveSubgroup.subgroup_id} onSelect={handleSelectSubgroup} />

          <main className="workspace-main">
            <div className="workspace-main-inner">
              <div className="entry-form-header" style={{ marginBottom: 4, alignItems: 'flex-start' }}>
                <div>
                  {currentGroup && (
                    <div className="content-eyebrow">
                      {currentGroup.code} · {currentGroup.name}
                    </div>
                  )}
                  <h1 className="content-title">{liveSubgroup.name}</h1>
                </div>
                <span className={`slot-pill${liveSubgroup.done_count >= liveSubgroup.target_count ? ' done' : ''}`}>
                  {liveSubgroup.done_count}/{liveSubgroup.target_count}
                </span>
              </div>

              <div className="mt-4" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, marginBottom: 14 }}>Các câu đã nhập cho loại này</h3>
                <SlotList
                  entries={entries}
                  targetCount={liveSubgroup.target_count}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>

              <GuideBox subgroup={liveSubgroup} onUseExample={handleUseExample} />

              <EntryForm
                ref={formRef}
                subgroup={liveSubgroup}
                annotatorName={user?.full_name ?? ''}
                expectedBehaviors={expectedBehaviors}
                reviewStatuses={reviewStatuses}
                editingEntry={editingEntry}
                onCancelEdit={() => setEditingEntry(null)}
                onSubmit={handleSubmit}
                submitting={submitting}
                errorMessage={formError}
              />
            </div>
          </main>

          <WorkspaceRail
            groups={groups}
            selectedSubgroupId={liveSubgroup.subgroup_id}
            onJump={handleSelectSubgroup}
          />
        </div>
      )}

      <Toast message={toastMessage} />
    </div>
  )
}
