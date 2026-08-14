import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface ComboboxItem {
  id: number
  label: string
  subLabel?: string
}

interface ComboboxProps {
  value: number | null
  items: ComboboxItem[]
  searchValue: string
  onSearchChange: (value: string) => void
  onSelect: (item: ComboboxItem) => void
  onClear: () => void
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  loading?: boolean
  emptyText?: string
  invalid?: boolean
  label?: string
}

export default function Combobox({
  value,
  items,
  searchValue,
  onSearchChange,
  onSelect,
  onClear,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  disabled = false,
  loading = false,
  emptyText = 'Không tìm thấy kết quả',
  invalid = false,
  label,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = items.find((item) => item.id === value) ?? null

  useEffect(() => {
    if (open) {
      setActiveIndex(0)
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const isPrintable =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    if (isPrintable && !open) {
      event.preventDefault()
      setOpen(true)
      onSearchChange(event.key)
      return
    }
    if ((event.key === 'Backspace' || event.key === 'Delete') && !open) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (event.key === ' ' && !open) {
      event.preventDefault()
      setOpen(true)
      onSearchChange(' ')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => (prev + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (open && items[activeIndex]) {
        onSelect(items[activeIndex])
        setOpen(false)
      } else {
        setOpen(true)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleSelect = (item: ComboboxItem) => {
    onSelect(item)
    setOpen(false)
  }

  return (
    <div className="combobox" ref={containerRef}>
      {label && <label className="form-label">{label}</label>}
      <button
        type="button"
        className={`searchable-trigger${invalid ? ' has-error' : ''}${open ? ' open' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {selected ? (
            <span className="combobox-selected-label" title={selected.label}>
              {selected.label}
            </span>
          ) : (
            <span className="placeholder">{disabled ? placeholder : searchPlaceholder}</span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {selected && (
            <span
              role="button"
              tabIndex={0}
              className="combobox-clear"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onClear()
                }
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={15} className={open ? 'combobox-chevron-open' : ''} />
        </span>
      </button>

      {open && !disabled && (
        <div className="searchable-panel">
          <div className="searchable-search">
            <Search size={14} />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              placeholder={searchPlaceholder}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {loading && <span className="combobox-loading">Đang tải...</span>}
          </div>
          <div className="searchable-list" role="listbox">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`searchable-option${item.id === value ? ' selected' : ''}${
                  index === activeIndex ? ' active' : ''
                }`}
                onClick={() => handleSelect(item)}
                role="option"
                aria-selected={item.id === value}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span className="combobox-item-label" title={item.label}>
                    {item.label}
                  </span>
                  {item.subLabel && (
                    <span className="combobox-item-sub" title={item.subLabel}>
                      {item.subLabel}
                    </span>
                  )}
                </span>
                {item.id === value && <Check size={14} />}
              </button>
            ))}
            {!loading && items.length === 0 && <div className="searchable-empty">{emptyText}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
