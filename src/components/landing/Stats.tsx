export default function Stats() {
  const items = [
    { label: 'Aktif Üye', value: '2.4K+' },
    { label: 'Toplantı', value: '320+' },
    { label: 'Şablon', value: '75+' },
    { label: 'Kasa İşlemi', value: '18K+' },
  ]
  return (
    <section className="rounded-2xl border bg-gradient-to-br from-background to-muted/30 shadow-sm">
      <div className="grid grid-cols-2 gap-8 p-8 md:grid-cols-4">
        {items.map((it, idx) => (
          <div key={it.label} className="text-center group cursor-default">
            <div className="text-4xl font-bold tracking-tight bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-110">
              {it.value}
            </div>
            <div className="text-sm text-muted-foreground mt-2 font-medium">
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
