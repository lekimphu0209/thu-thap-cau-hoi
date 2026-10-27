interface TagListProps {
  items: string[]
}

export default function TagList({ items }: TagListProps) {
  if (items.length === 0) return <span className="tag-list-empty">—</span>

  return (
    <div className="tag-list">
      {items.map((item) => (
        <span key={item} className="tag-chip readonly">
          {item}
        </span>
      ))}
    </div>
  )
}
