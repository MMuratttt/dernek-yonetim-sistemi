import { SmsProvider, SendResult } from './base'

// Dummy provider for local/dev & free tier placeholder.
// Simulates latency and returns synthetic IDs.
export class DummySmsProvider implements SmsProvider {
  name = 'dummy'
  async sendSingle(to: string, message: string): Promise<SendResult> {
    await sleep(10)
    if (!to) return { success: false, provider: this.name, error: 'Missing to' }
    return {
      success: true,
      provider: this.name,
      providerMessageId: 'dum-' + Math.random().toString(36).slice(2, 10),
    }
  }
  async sendBulk(to: string[], message: string): Promise<SendResult[]> {
    const results: SendResult[] = []
    for (const phone of to) {
      results.push(await this.sendSingle(phone, message))
    }
    return results
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
