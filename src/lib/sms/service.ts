import { prisma } from '../prisma'
import { getActiveSmsProvider } from './providers/base'

// Simple per-org per-minute rate limit using SmsMessage timestamps
async function ensureRateLimit(organizationId: string, toSend: number) {
  const perMin = parseInt(process.env.ORG_SMS_PER_MIN || '60', 10)
  if (perMin <= 0) return
  const oneMinAgo = new Date(Date.now() - 60 * 1000)
  const sentLastMin = await (prisma as any).smsMessage.count({
    where: {
      organizationId,
      createdAt: { gte: oneMinAgo },
      status: { in: ['PENDING', 'SENT'] as any },
    },
  })
  if (sentLastMin + toSend > perMin)
    throw new Error(
      `Dakikalık SMS limiti aşıyor: limit=${perMin}, mevcut=${sentLastMin}, ek=${toSend}`
    )
}

interface BulkOptions {
  organizationId: string
  memberIds?: string[]
  phones?: string[]
  message: string
  campaignName?: string
  channel?: 'SMS' | 'WHATSAPP'
  dryRun?: boolean
  max?: number // safety cap
  personalize?: boolean // enable template variables
}

export async function sendBulkSms(opts: BulkOptions) {
  const {
    organizationId,
    memberIds = [],
    phones = [],
    message,
    campaignName,
    channel = 'SMS',
    dryRun,
    max = 1000,
    personalize = true,
  } = opts
  if (!message || message.trim().length === 0)
    throw new Error('Mesaj boş olamaz')

  // Collect phone list from members if requested
  let targets: {
    memberId?: string
    phone: string
    firstName?: string
    lastName?: string
  }[] = []
  if (memberIds.length) {
    const rows = await prisma.member.findMany({
      where: { id: { in: memberIds }, organizationId, phone: { not: null } },
      select: { id: true, phone: true, firstName: true, lastName: true },
    })
    targets = rows
      .filter((r) => !!r.phone)
      .map((r) => ({
        memberId: r.id,
        phone: r.phone!,
        firstName: r.firstName,
        lastName: r.lastName,
      }))
  }
  for (const p of phones) if (p) targets.push({ phone: p })

  // Dedup by phone
  const seen = new Set<string>()
  targets = targets.filter((t) => {
    if (seen.has(t.phone)) return false
    seen.add(t.phone)
    return true
  })

  if (targets.length === 0)
    return { dryRun: !!dryRun, total: 0, sent: 0, failed: 0 }
  if (targets.length > max)
    throw new Error(`Çok fazla alıcı (${targets.length}). Limit: ${max}`)

  // Rate limit check before creating campaign to avoid orphan campaigns
  await ensureRateLimit(organizationId, targets.length)

  // Create campaign
  const campaign = await prisma.smsCampaign.create({
    data: {
      organizationId,
      name: campaignName || `Kampanya-${new Date().toISOString()}`,
      message,
      channel: channel as any,
      status: dryRun ? 'COMPLETED' : 'SENDING',
      totalRecipients: targets.length,
    },
  })

  if (dryRun) {
    return {
      dryRun: true,
      campaignId: campaign.id,
      total: targets.length,
      sent: 0,
      failed: 0,
    }
  }

  const provider = getActiveSmsProvider()
  const CHUNK = 50
  let sentCount = 0
  let failedCount = 0
  const retryLimit = parseInt(process.env.SMS_RETRY_LIMIT || '2', 10)

  function render(msg: string, t: { firstName?: string; lastName?: string }) {
    if (!personalize) return msg
    const fn = t.firstName || ''
    const ln = t.lastName || ''
    return msg
      .replace(/{{\s*firstName\s*}}/gi, fn)
      .replace(/{{\s*lastName\s*}}/gi, ln)
      .replace(/{{\s*fullName\s*}}/gi, (fn + ' ' + ln).trim())
  }

  for (let i = 0; i < targets.length; i += CHUNK) {
    const slice = targets.slice(i, i + CHUNK)
    // Personalization may differ per recipient, so send individually when personalize enabled
    if (personalize) {
      for (const target of slice) {
        let attempt = 0
        let last: any
        const personalized = render(message, target)
        while (attempt <= retryLimit) {
          last = await provider.sendSingle(target.phone, personalized)
          if (last.success) break
          attempt++
        }
        const status = last.success ? 'SENT' : 'FAILED'
        await (prisma as any).smsMessage.create({
          data: {
            organizationId,
            campaignId: campaign.id,
            memberId: target.memberId,
            phone: target.phone,
            content: personalized,
            channel: channel as any,
            status: status as any,
            provider: last.provider,
            providerMsgId: last.providerMessageId,
            error: last.error,
            sentAt: last.success ? new Date() : null,
          },
        })
        if (last.success) sentCount++
        else failedCount++
      }
    } else {
      const results = await provider.sendBulk(
        slice.map((s) => s.phone),
        message
      )
      for (let j = 0; j < slice.length; j++) {
        const target = slice[j]
        let r = results[j]
        let attempt = 0
        while (!r.success && attempt < retryLimit) {
          r = await provider.sendSingle(target.phone, message)
          attempt++
        }
        const status = r.success ? 'SENT' : 'FAILED'
        await (prisma as any).smsMessage.create({
          data: {
            organizationId,
            campaignId: campaign.id,
            memberId: target.memberId,
            phone: target.phone,
            content: message,
            channel: channel as any,
            status: status as any,
            provider: r.provider,
            providerMsgId: r.providerMessageId,
            error: r.error,
            sentAt: r.success ? new Date() : null,
          },
        })
        if (r.success) sentCount++
        else failedCount++
      }
    }
  }

  await prisma.smsCampaign.update({
    where: { id: campaign.id },
    data: {
      status:
        failedCount === 0
          ? 'COMPLETED'
          : sentCount > 0
            ? 'COMPLETED'
            : 'FAILED',
      sentCount,
      failedCount,
      completedAt: new Date(),
    },
  })

  return {
    dryRun: false,
    campaignId: campaign.id,
    total: targets.length,
    sent: sentCount,
    failed: failedCount,
  }
}
