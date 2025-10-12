import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as providerBase from '../lib/sms/providers/base'
import { sendBulkSms } from '../lib/sms/service'

// Mock prisma with in-memory collectors
vi.mock('../lib/prisma', () => {
  const campaigns: any[] = []
  const messages: any[] = []
  return {
    prisma: {
      smsCampaign: {
        create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
          const row = { ...data, id: 'camp1' }
          campaigns.push(row)
          return row
        }),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string }
            data: Record<string, any>
          }) => {
            const idx = campaigns.findIndex((c) => c.id === where.id)
            campaigns[idx] = { ...campaigns[idx], ...data }
            return campaigns[idx]
          }
        ),
      },
      smsMessage: {
        create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
          messages.push({ ...data, id: 'msg' + (messages.length + 1) })
          return messages[messages.length - 1]
        }),
        count: vi.fn(async () => 0),
      },
      member: {
        findMany: vi.fn(async () => []),
      },
    },
  }
})

describe('sendBulkSms', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  it('sends bulk messages via provider', async () => {
    const sendBulk = vi.fn(async (to: string[], msg: string) => {
      return to.map((t) => ({
        success: true,
        provider: 'dummy',
        providerMessageId: 'id-' + t,
      }))
    })
    vi.spyOn(providerBase, 'getActiveSmsProvider').mockReturnValue({
      name: 'dummy',
      sendSingle: vi.fn(),
      sendBulk,
    }) as any

    const res = await sendBulkSms({
      organizationId: 'org1',
      phones: ['+905303636151', '+905427113606'],
      message: 'Test',
    })

    expect(res.total).toBe(2)
    expect(res.sent).toBe(2)
    expect(sendBulk).toHaveBeenCalledTimes(1)
  })

  it('applies personalization placeholders', async () => {
    const sendSingle = vi.fn(async (to: string, msg: string) => ({
      success: true,
      provider: 'dummy',
      providerMessageId: 'x',
    }))
    vi.spyOn(providerBase, 'getActiveSmsProvider').mockReturnValue({
      name: 'dummy',
      sendSingle,
      sendBulk: vi.fn(),
    }) as any

    // Mock member fetch
    const { prisma }: any = await import('../lib/prisma')
    prisma.member.findMany.mockResolvedValueOnce([
      { id: 'm1', phone: '+905301112233', firstName: 'Ali', lastName: 'Veli' },
    ])

    await sendBulkSms({
      organizationId: 'org1',
      memberIds: ['m1'],
      message: 'Merhaba {{firstName}} {{lastName}} - {{fullName}}',
      personalize: true,
    })

    expect(sendSingle).toHaveBeenCalledWith(
      '+905301112233',
      'Merhaba Ali Veli - Ali Veli'
    )
  })

  it('blocks when rate limit exceeded', async () => {
    const { prisma }: any = await import('../lib/prisma')
    prisma.member.findMany.mockResolvedValueOnce([
      { id: 'm1', phone: '+905301112233', firstName: 'Ali', lastName: 'Veli' },
    ])
    prisma.smsMessage.count.mockResolvedValueOnce(100) // already at limit
    process.env.ORG_SMS_PER_MIN = '100'
    await expect(
      sendBulkSms({
        organizationId: 'org1',
        memberIds: ['m1'],
        message: 'Test',
      })
    ).rejects.toThrow(/Dakikalık SMS limiti/)
  })
})
