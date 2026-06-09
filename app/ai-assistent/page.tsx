'use client'

import { useState } from 'react'
import { Sparkles, Send, Wand2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { aiMessages, aiPrompts } from '@/lib/mockData'
import type { ChatMessage } from '@/lib/types'

/** Canned reply so the demo feels alive without a real backend. */
const cannedReply =
  'Goed idee! Ik heb dit voor je genoteerd en zet de benodigde producten alvast op je boodschappenlijstje.'

export default function AiAssistentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(aiMessages)
  const [draft, setDraft] = useState('')

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => {
      const nextId = Math.max(0, ...prev.map((m) => m.id))
      return [
        ...prev,
        { id: nextId + 1, role: 'user', text: trimmed },
        { id: nextId + 2, role: 'assistant', text: cannedReply },
      ]
    })
    setDraft('')
  }

  return (
    <>
      <PageHeader
        title="AI Assistent"
        subtitle="Je persoonlijke gezinshulp"
        icon={Sparkles}
        iconClassName="bg-violet-100 text-violet-500"
      />

      {/* Conversation */}
      <div className="rounded-card border border-cardborder bg-ai/60 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'flex justify-end' : 'flex items-start gap-3'}
            >
              {message.role === 'assistant' && (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-white shadow-sm">
                  <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </span>
              )}
              <p
                className={[
                  'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  message.role === 'user'
                    ? 'bg-brand text-white shadow-sm shadow-brand/20'
                    : 'bg-white text-slate-700 shadow-sm',
                ].join(' ')}
              >
                {message.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick prompts */}
      <div className="mt-5">
        <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
          <Wand2 className="h-4 w-4 text-violet-500" />
          Snelle suggesties
        </p>
        <div className="flex flex-wrap gap-2.5">
          {aiPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="pill border border-violet-200 bg-white px-4 py-2 text-sm text-violet-700 hover:bg-violet-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Composer */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
        className="mt-5 flex gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Stel een vraag aan je assistent…"
          className="flex-1 rounded-full border border-cardborder bg-white px-5 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-200"
        />
        <button
          type="submit"
          aria-label="Verstuur bericht"
          className="pill h-12 w-12 bg-violet-500 text-white shadow-sm shadow-violet-500/30 hover:bg-violet-600"
        >
          <Send className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </form>
    </>
  )
}
