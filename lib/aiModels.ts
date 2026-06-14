/**
 * Modelkeuze per taaksoort — bewust om de AI-kosten laag te houden zonder
 * kwaliteit te verliezen waar het telt:
 *
 * - fast  → Haiku 4.5 ($1/$5 per M): extractie/classificatie (bon scannen,
 *   transacties indelen, koelkastfoto, inkomende mail sorteren). Gestructureerd,
 *   weinig creativiteit nodig — Haiku is hier ruim voldoende en ~5× goedkoper.
 * - chat  → Sonnet 4.6 ($3/$15 per M): de gezins-assistent en creatieve generatie
 *   (recepten, uitjes, wapenschild). Sterker, nog steeds ~1,7× goedkoper dan Opus.
 *
 * Per taak te overrulen met een env-var; anders de verstandige default hieronder.
 * (We gebruiken bewust GEEN globale ANTHROPIC_MODEL meer, zodat één env-var niet
 * stilletjes alles terugzet op het duurste model.)
 */

const FAST_DEFAULT = 'claude-haiku-4-5'
const CHAT_DEFAULT = 'claude-sonnet-4-6'

/** Goedkoop model voor extractie/classificatie (bon-, koelkast-, mail-, indeel-AI). */
export function fastModel(): string {
  return process.env.ANTHROPIC_MODEL_FAST || FAST_DEFAULT
}

/** Sterker model voor chat en creatieve generatie (assistent, recepten, uitjes). */
export function chatModel(): string {
  return process.env.ANTHROPIC_MODEL_CHAT || CHAT_DEFAULT
}
