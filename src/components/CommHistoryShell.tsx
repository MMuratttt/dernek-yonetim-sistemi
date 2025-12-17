'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CommHistoryList } from '@/components/CommHistoryList'
import { Button } from '@/components/ui/button'

type Channel = 'SMS' | 'EMAIL'

export default function CommHistoryShell({ org }: { org: string }) {
  const searchParams = useSearchParams()
  const urlChannel = searchParams?.get('channel') as Channel | null
  const urlCampaignId = searchParams?.get('campaignId')

  const [channel, setChannel] = useState<Channel>(urlChannel || 'SMS')

  // Update channel when URL changes
  useEffect(() => {
    if (urlChannel && (urlChannel === 'SMS' || urlChannel === 'EMAIL')) {
      setChannel(urlChannel)
    }
  }, [urlChannel])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            aria-pressed={channel === 'SMS'}
            onClick={() => setChannel('SMS')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm transition-colors ${channel === 'SMS' ? 'bg-sky-600 text-white' : 'bg-white border'} `}
          >
            <svg
              className={`w-5 h-5 ${channel === 'SMS' ? 'text-white' : 'text-sky-600'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            SMS
          </button>

          <button
            aria-pressed={channel === 'EMAIL'}
            onClick={() => setChannel('EMAIL')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium shadow-sm transition-colors ${channel === 'EMAIL' ? 'bg-slate-800 text-white' : 'bg-white border'}`}
          >
            <svg
              className={`w-5 h-5 ${channel === 'EMAIL' ? 'text-white' : 'text-slate-800'}`}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8.5C3 7.67157 3.67157 7 4.5 7H19.5C20.3284 7 21 7.67157 21 8.5V15.5C21 16.3284 20.3284 17 19.5 17H4.5C3.67157 17 3 16.3284 3 15.5V8.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 8.5L12 13.5L3 8.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            E-posta
          </button>
        </div>
      </div>

      <CommHistoryList
        org={org}
        channel={channel}
        onChannelChange={setChannel}
        initialCampaignId={urlCampaignId || undefined}
      />
    </div>
  )
}
