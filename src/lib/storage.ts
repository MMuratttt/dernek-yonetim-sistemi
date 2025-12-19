import { promises as fs } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

type UploadResult = { url: string; key: string }

// Check if we should use Vercel Blob (production) or local storage (development)
const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN

async function ensureLocalUploadDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true })
  } catch {}
}

function getExtensionFromContentType(
  contentType: string,
  extHint?: string
): string {
  if (contentType?.includes('png')) return 'png'
  if (contentType?.includes('jpeg')) return 'jpg'
  if (contentType?.includes('jpg')) return 'jpg'
  if (contentType?.includes('webp')) return 'webp'
  if (contentType?.includes('gif')) return 'gif'
  if (contentType?.includes('pdf')) return 'pdf'
  return extHint || 'bin'
}

export async function uploadFile(
  buffer: Buffer,
  contentType: string,
  opts?: { prefix?: string; extHint?: string }
): Promise<UploadResult> {
  const ext = getExtensionFromContentType(contentType, opts?.extHint)
  const keyName = `${randomUUID()}.${ext}`

  // Use Vercel Blob in production
  if (useVercelBlob) {
    const { put } = await import('@vercel/blob')
    const blob = await put(keyName, buffer, {
      access: 'public',
      contentType,
    })
    return { url: blob.url, key: keyName }
  }

  // Local storage for development
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await ensureLocalUploadDir(uploadDir)
  const filePath = path.join(uploadDir, keyName)
  await fs.writeFile(filePath, buffer)
  const url = `/uploads/${path.basename(filePath)}`
  return { url, key: path.basename(filePath) }
}

export async function deleteFileByUrl(url: string): Promise<void> {
  if (!url) return

  // Handle Vercel Blob URLs
  if (
    url.includes('blob.vercel-storage.com') ||
    url.includes('public.blob.vercel-storage.com')
  ) {
    if (useVercelBlob) {
      try {
        const { del } = await import('@vercel/blob')
        await del(url)
      } catch (error) {
        console.error('Failed to delete blob:', error)
      }
    }
    return
  }

  // Handle local uploads
  const match = url.match(/\/uploads\/(.+)$/)
  if (match) {
    const filename = match[1]
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename)
    try {
      await fs.unlink(filePath)
    } catch {}
  }
}

/**
 * Save an uploaded file from a form to a specific directory
 */
export async function saveUploadedFile(
  file: File,
  subdir: string = ''
): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.slice(file.name.lastIndexOf('.'))
  const keyName = `${subdir ? subdir + '/' : ''}${randomUUID()}${ext}`.replace(
    /\/+/g,
    '/'
  )

  // Use Vercel Blob in production
  if (useVercelBlob) {
    const { put } = await import('@vercel/blob')
    const blob = await put(keyName, buffer, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    })
    return blob.url
  }

  // Local storage for development
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', subdir)
  await ensureLocalUploadDir(uploadDir)
  const filePath = path.join(uploadDir, `${randomUUID()}${ext}`)
  await fs.writeFile(filePath, buffer)

  // Return relative path from public
  return `uploads/${subdir}/${path.basename(filePath)}`.replace(/\/+/g, '/')
}
