'use client'

import { useState } from 'react'
import { Sparkles, Send, Wand2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ModuleGate from '@/components/ModuleGate'
import { useAiChat } from '@/lib/hooks'
import { aiPrompts } from '@/lib/mockData'

export default function AiAssistentPage() {
  const { messages, isLoading, send } = useAiChat()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setDraft('')
    setBusy(true)
    try {
      await send(trimmed)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="AI Assistent"
        subtitle="Je persoonlijke gezinshulp"
        icon={Sparkles}
        iconClassName="bg-violet-100 text-violet-500"
      />

      <ModuleGate module="ai">
      {/* Conversation */}
      <div className="rounded-card border border-cardborder bg-ai/60 p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4">
          {isLoading && messages.length === 0 ? (
            <p className="text-sm text-slate-400">Laden…</p>
          ) : (
            messages.map((message) => (
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
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'bg-brand text-white shadow-sm shadow-brand/20'
                      : 'bg-white text-slate-700 shadow-sm',
                  ].join(' ')}
                >
                  {message.text}
                </p>
              </div>
            ))
          )}

          {busy && (
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500 text-white shadow-sm">
                <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </span>
              <p className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-400 shadow-sm">
                Aan het denken…
              </p>
            </div>
          )}
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
              onClick={() => submit(prompt)}
              disabled={busy}
              className="pill border border-violet-200 bg-white px-4 py-2 text-sm text-violet-700 hover:bg-violet-50 disabled:opacity-50"
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
          submit(draft)
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
          disabled={busy}
          aria-label="Verstuur bericht"
          className="pill h-12 w-12 bg-violet-500 text-white shadow-sm shadow-violet-500/30 hover:bg-violet-600 disabled:opacity-50"
        >
          <Send className="h-5 w-5" strokeWidth={2.2} />
        </button>
      </form>
      </ModuleGate>
    </>
  )
}
