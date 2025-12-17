export interface SmsTemplate {
  id: string
  name: string
  content: string
  description?: string
}

export const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: 'aidat-hatirlatma',
    name: 'Aidat Ödeme Hatırlatma',
    description: 'Üyelere aidat borçlarını hatırlatmak için',
    content: `Sayın {{tam_ad}},

Derneğimize olan aidatınızın ödeme zamanı gelmiştir. Aidat borcunuzun [TUTAR] TL olduğunu hatırlatmak isteriz.

Ödeme için: [IBAN/HESAP NUMARASI]

Teşekkür ederiz.`,
  },
  {
    id: 'toplanti-daveti',
    name: 'Toplantı Daveti',
    description: 'Genel kurul veya toplantı davetleri için',
    content: `Sayın {{tam_ad}},

Derneğimizin [TARİH] tarihinde saat [SAAT]'te yapılacak olan Olağan Genel Kurul Toplantısı'na katılımınızı rica ederiz.

Yer: [ADRES]

Saygılarımızla.`,
  },
]

export function getSmsTemplate(id: string): SmsTemplate | undefined {
  return SMS_TEMPLATES.find((t) => t.id === id)
}
