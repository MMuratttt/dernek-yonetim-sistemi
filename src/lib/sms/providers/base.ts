export interface SendResult {
  success: boolean
  provider: string
  providerMessageId?: string
  error?: string
}

export interface SmsProvider {
  name: string
  sendSingle(to: string, message: string): Promise<SendResult>
  sendBulk(to: string[], message: string): Promise<SendResult[]> // Should best-effort send all and return per-recipient results
}

// TODO: Extend interface for WhatsApp (rich media, templates) in future.
export type ProviderFactory = () => SmsProvider

export function getActiveSmsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER?.toLowerCase() || 'twilio'
  switch (name) {
    case 'twilio':
      return new (require('./twilio').TwilioSmsProvider)()
    case 'dummy':
    default:
      return new (require('./dummy').DummySmsProvider)()
  }
}
