export function foldText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
}

export function cleanLabel(text: string): string {
  return text.split(/\s+/).filter(Boolean).join(' ')
}
