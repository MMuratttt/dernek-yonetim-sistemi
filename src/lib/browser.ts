/**
 * Browser utility for PDF generation that works both locally and on Vercel serverless.
 * Uses @sparticuz/chromium in production (Vercel) and Playwright locally.
 */

/**
 * Generate PDF from HTML content
 * This function works both locally (using Playwright) and on Vercel (using puppeteer-core + @sparticuz/chromium)
 */
export async function generatePDFFromHTML(
  html: string,
  options?: {
    format?: 'A4' | 'A5' | 'Letter'
    margin?: { top?: string; right?: string; bottom?: string; left?: string }
    printBackground?: boolean
    landscape?: boolean
  }
): Promise<Buffer> {
  const isVercel = !!(
    process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  )

  if (isVercel) {
    // Use puppeteer-core + @sparticuz/chromium on Vercel
    const puppeteer = await import('puppeteer-core')
    const chromium = await import('@sparticuz/chromium')

    const browser = await puppeteer.default.launch({
      args: chromium.default.args,
      defaultViewport: null,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })

      const pdfBuffer = await page.pdf({
        format: options?.format ?? 'A4',
        margin: options?.margin ?? {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: options?.printBackground ?? true,
        landscape: options?.landscape ?? false,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  } else {
    // Use Playwright locally for better compatibility
    const { chromium } = await import('playwright')
    const browser = await chromium.launch({ headless: true })

    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle' })

      const pdfBuffer = await page.pdf({
        format: options?.format ?? 'A4',
        margin: options?.margin ?? {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
        printBackground: options?.printBackground ?? true,
        landscape: options?.landscape ?? false,
      })

      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}
