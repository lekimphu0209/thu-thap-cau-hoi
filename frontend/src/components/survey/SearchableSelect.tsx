import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string
  placeholder: string
  onChange: (value: string) => void
  invalid?: boolean
}

export default function SearchableSelect({
  options,
  value,
  placeholder,
  onChange,
  invalid,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return options
    return options.filter((option) => option.label.toLowerCase().includes(needle))
  }, [options, query])

  const selected = options.find((option) => option.value === value)

  return (
    <div className="searchable-select" ref={containerRef}>
      <button
        type="button"
        className={`searchable-trigger${invalid ? ' has-error' : ''}${open ? ' open' : ''}`}
        onClick={() => {
          setOpen((prev) => !prev)
          setQuery('')
        }}
      >
        <span className={selected ? '' : 'placeholder'}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="searchable-panel">
          <div className="searchable-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              autoFocus
              placeholder="Tìm nhanh..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="searchable-list">
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`searchable-option${option.value === value ? ' selected' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={14} />}
              </button>
            ))}
            {filtered.length === 0 && <div className="searchable-empty">Không tìm thấy kết quả</div>}
          </div>
        </div>
      )}
    </div>
  )
}
