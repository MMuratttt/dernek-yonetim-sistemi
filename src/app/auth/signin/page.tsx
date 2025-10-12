'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <main className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Giriş Yap</h1>
      <p className="mt-1 text-sm text-muted-foreground">Süper yönetici olarak giriş yapın ve dernek oluşturun.</p>
      <div className="mt-6 space-y-3 rounded-lg border bg-card p-4">
        <div>
          <label className="block text-sm font-medium">E‑posta</label>
          <Input
            className="mt-1"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Şifre</label>
          <Input
            className="mt-1"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          className="w-full"
          disabled={loading || !email || !password}
          onClick={async () => {
            setLoading(true)
            try {
              // Use redirect:false so we can accurately detect success
              const res = await signIn('credentials', {
                email,
                password,
                redirect: false,
                callbackUrl: '/org',
              })
              if (res?.ok) router.push(res.url || '/org')
              else alert('Giriş başarısız')
            } finally {
              setLoading(false)
            }
          }}
        >
          {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Button>
      </div>
    </main>
  )
}
