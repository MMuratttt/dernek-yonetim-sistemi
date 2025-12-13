/**
 * Meeting type constants and utilities
 */

export const MEETING_TYPES = {
  OLAGAN_GENEL_KURUL: 'OLAGAN_GENEL_KURUL',
  OLAGANÜSTÜ_GENEL_KURUL: 'OLAGANÜSTÜ_GENEL_KURUL',
  GENERAL_ASSEMBLY: 'GENERAL_ASSEMBLY',
  BOARD: 'BOARD',
  COMMISSION: 'COMMISSION',
  OTHER: 'OTHER',
} as const

export const MEETING_TYPE_LABELS = {
  OLAGAN_GENEL_KURUL: 'Olağan Genel Kurul Toplantısı',
  OLAGANÜSTÜ_GENEL_KURUL: 'Olağanüstü Genel Kurul Toplantısı',
  GENERAL_ASSEMBLY: 'Genel Kurul',
  BOARD: 'Yönetim Kurulu',
  COMMISSION: 'Komisyon',
  OTHER: 'Diğer',
} as const

export const MEETING_STATUS_LABELS = {
  DRAFT: 'Taslak',
  PLANNED: 'Planlandı',
  ONGOING: 'Devam Ediyor',
  COMPLETED: 'Tamamlandı',
  CANCELED: 'İptal Edildi',
} as const

export const DEFAULT_INTERVAL_YEARS = 3
export const ALLOWED_INTERVAL_YEARS = [2, 3] as const

// File upload constraints
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
] as const

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Check if a meeting type requires interval configuration
 */
export function requiresInterval(meetingType: string): boolean {
  return meetingType === MEETING_TYPES.OLAGAN_GENEL_KURUL
}

/**
 * Validate if an interval year value is allowed
 */
export function isValidInterval(years: number): boolean {
  return ALLOWED_INTERVAL_YEARS.includes(years as any)
}

/**
 * Get the label for a meeting type
 */
export function getMeetingTypeLabel(type: string): string {
  return MEETING_TYPE_LABELS[type as keyof typeof MEETING_TYPE_LABELS] || type
}

/**
 * Get the label for a meeting status
 */
export function getMeetingStatusLabel(status: string): string {
  return (
    MEETING_STATUS_LABELS[status as keyof typeof MEETING_STATUS_LABELS] ||
    status
  )
}

/**
 * Check if a file type is allowed for meeting documents
 */
export function isAllowedDocumentType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_TYPES.includes(mimeType as any)
}

/**
 * Check if a file extension is allowed
 */
export function isAllowedDocumentExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return ALLOWED_DOCUMENT_EXTENSIONS.includes(ext as any)
}

/**
 * Validate document size
 */
export function isValidDocumentSize(size: number): boolean {
  return size > 0 && size <= MAX_DOCUMENT_SIZE
}
