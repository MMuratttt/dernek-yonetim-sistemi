import { TrendingUp, BarChart3, Wallet } from 'lucide-react'

export default function Showcase() {
  return (
    <section className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 shadow-sm overflow-hidden">
      <div className="grid gap-8 p-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium mb-4">
              <TrendingUp className="h-4 w-4" />
              <span>Güçlü Raporlama</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Muhasebe ve Üyelik Panosu
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Tahsilat durumu, gelir/gider dağılımı ve kasa bakiyesi gibi
              grafiklerle derneğinizin mali görünümünü tek ekranda izleyin.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border bg-background/50 p-4">
              <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">
                  Detaylı Grafikler
                </div>
                <div className="text-xs text-muted-foreground">
                  Görsel raporlarla anlık takip
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-background/50 p-4">
              <Wallet className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="font-semibold text-sm mb-1">Mali Yönetim</div>
                <div className="text-xs text-muted-foreground">
                  Gelir-gider takibi kolayca
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-muted/30 shadow-md transition-transform duration-300 hover:scale-[1.02]">
          {/* Non-interactive preview: use the reference screenshot */}
          <img
            src="/landing/webdernek-dashboard.svg"
            alt="Pano önizlemesi"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  )
}
