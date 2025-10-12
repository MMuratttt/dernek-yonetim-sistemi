import { SmsProvider, SendResult } from './base'

// Lazy import to avoid bundling in edge
function loadTwilio() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('twilio')
}

export class TwilioSmsProvider implements SmsProvider {
  name = 'twilio'
  private client: any
  private from: string
  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from = process.env.TWILIO_FROM
    if (!sid || !token || !from) {
      throw new Error(
        'Twilio env eksik: TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM'
      )
    }
    this.client = loadTwilio()(sid, token)
    this.from = from
  }
  async sendSingle(to: string, message: string): Promise<SendResult> {
    try {
      const res = await this.client.messages.create({
        to,
        from: this.from,
        body: message,
      })
      return { success: true, provider: this.name, providerMessageId: res.sid }
    } catch (e: any) {
      return { success: false, provider: this.name, error: e?.message }
    }
  }
  async sendBulk(to: string[], message: string): Promise<SendResult[]> {
    const out: SendResult[] = []
    for (const p of to) out.push(await this.sendSingle(p, message))
    return out
  }
}
