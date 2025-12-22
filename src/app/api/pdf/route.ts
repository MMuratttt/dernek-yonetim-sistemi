import { NextResponse } from 'next/server'
import { getSession } from '../../../lib/auth'
import { generatePDFFromHTML } from '../../../lib/browser'

export const runtime = 'nodejs'

type Payload = {
  html?: string
  url?: string
  filename?: string
  pdf?: {
    format?: 'A4' | 'A5' | 'Letter' | 'Legal'
    landscape?: boolean
    margin?: { top?: string; right?: string; bottom?: string; left?: string }
    printBackground?: boolean
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload: Payload
  try {
    payload = (await req.json()) as Payload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!payload?.html && !payload?.url) {
    return NextResponse.json(
      { error: 'Provide either html or url' },
      { status: 400 }
    )
  }

  // URL-based PDF generation is not fully supported in serverless environment
  // For security and compatibility, we only support HTML-based generation
  if (payload.url && !payload.html) {
    return NextResponse.json(
      {
        error:
          'URL-based PDF generation is not supported. Please provide HTML content.',
      },
      { status: 400 }
    )
  }

  try {
    const pdf = await generatePDFFromHTML(payload.html!, {
      format: (payload.pdf?.format as 'A4' | 'A5' | 'Letter') ?? 'A4',
      landscape: payload.pdf?.landscape ?? false,
      printBackground: payload.pdf?.printBackground ?? true,
      margin: payload.pdf?.margin ?? {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    })

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${payload.filename ?? `document-${new Date().toISOString().slice(0, 10)}`}.pdf"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('PDF generation error:', message)
    return NextResponse.json(
      { error: 'Failed to generate PDF', detail: message },
      { status: 500 }
    )
  }
}
