export interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  description?: string
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'aidat-hatirlatma',
    name: 'Aidat Ödeme Hatırlatma',
    description: 'Üyelere aidat borçlarını hatırlatmak için',
    subject: 'Aidat Ödeme Hatırlatması',
    content: `Sayın {tam_ad},

Derneğimize olan aidatınızın ödeme zamanı gelmiştir. 

Lütfen aidat borcunuzu en kısa sürede ödemek için dernek hesabımıza ödeme yapınız.

Ödeme bilgileri için dernek başkanlığı ile iletişime geçebilirsiniz.

Gösterdiğiniz ilgi ve desteğiniz için teşekkür ederiz.

Saygılarımızla,
Dernek Yönetimi`,
  },
  {
    id: 'toplanti-daveti',
    name: 'Toplantı Daveti',
    description: 'Genel kurul veya toplantı davetleri için',
    subject: 'Toplantı Daveti',
    content: `Sayın {tam_ad},

Derneğimizin [TARİH] tarihinde saat [SAAT]'te yapılacak olan toplantısına katılımınızı rica ederiz.

Toplantı Konusu: [KONU]
Yer: [ADRES]
Tarih: [TARİH]
Saat: [SAAT]

Katılımınız bizim için önemlidir.

Saygılarımızla,
Dernek Yönetimi`,
  },
  {
    id: 'genel-duyuru',
    name: 'Genel Duyuru',
    description: 'Genel bilgilendirme ve duyurular için',
    subject: 'Dernek Duyurusu',
    content: `Sayın {tam_ad},

Derneğimiz üyelerine önemli bir duyuru:

[DUYURU METNİ]

Detaylı bilgi için dernek başkanlığı ile iletişime geçebilirsiniz.

Saygılarımızla,
Dernek Yönetimi`,
  },
  {
    id: 'etkinlik-daveti',
    name: 'Etkinlik Daveti',
    description: 'Dernek etkinliklerine davet için',
    subject: 'Etkinlik Daveti - [ETKİNLİK ADI]',
    content: `Sayın {tam_ad},

Derneğimizin düzenlediği [ETKİNLİK ADI] etkinliğine sizi davet etmekten mutluluk duyarız.

Etkinlik Detayları:
• Tarih: [TARİH]
• Saat: [SAAT]
• Yer: [ADRES]
• Program: [PROGRAM DETAYI]

Katılımınızı teyit etmek için lütfen [TARİH]'e kadar bize bilgi veriniz.

Saygılarımızla,
Dernek Yönetimi`,
  },
  {
    id: 'hosgeldin',
    name: 'Hoş Geldiniz Mesajı',
    description: 'Yeni üyelere hoş geldin mesajı için',
    subject: 'Derneğimize Hoş Geldiniz!',
    content: `Sayın {tam_ad},

Derneğimize katıldığınız için sizi tebrik eder, aramıza hoş geldiniz deriz!

Derneğimizin amaçları ve hedefleri doğrultusunda birlikte çalışmaktan mutluluk duyacağız. Üyelik bilgileriniz ve dernek faaliyetlerimiz hakkında detaylı bilgi için web sitemizi ziyaret edebilir veya bize ulaşabilirsiniz.

Aidat ödeme bilgileriniz:
• Üyelik Numaranız: {nationalId}
• Aylık Aidat: [TUTAR] TL

Herhangi bir sorunuz olursa lütfen bizimle iletişime geçmekten çekinmeyin.

Saygılarımızla,
Dernek Yönetimi`,
  },
  {
    id: 'tesekur',
    name: 'Teşekkür Mesajı',
    description: 'Bağış veya katkılar için teşekkür mesajı',
    subject: 'Teşekkür Ederiz',
    content: `Sayın {tam_ad},

Derneğimize yapmış olduğunuz katkı ve destekleriniz için size içtenlikle teşekkür ederiz.

Sizin gibi değerli üyelerimizin desteği ile derneğimiz faaliyetlerini başarıyla sürdürmektedir.

Gösterdiğiniz ilgi ve alakanız için tekrar teşekkür eder, saygılarımızı sunarız.

Dernek Yönetimi`,
  },
]

export function getEmailTemplate(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id)
}
