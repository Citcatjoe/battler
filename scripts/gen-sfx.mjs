/**
 * Génère des bruitages avec ElevenLabs (modèle de bruitages `eleven_text_to_sound_v2`), pour `docs/SONS.md` § 7.
 *
 * Usage : npm run sfx -- --out logs/sons/<son> --text "<description en anglais>" [--duration 2] [--influence 0.5] [--count 3]
 *
 * Écrit `<out>/<son>-1.mp3`, `-2.mp3`… : des propositions à écouter, hors du jeu (`logs/` n'est pas suivi par git).
 * Le fichier retenu passe ensuite par `scripts/process-sounds.py`, comme tout son du jeu.
 * La clé est lue dans `.env.local` (`ELEVENLABS_API_KEY`, posée par `npx @elevenlabs/cli onboard`) par Node seul :
 * elle ne doit jamais atteindre le code du navigateur.
 */
import { createWriteStream, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { parseArgs } from 'node:util'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

const { values } = parseArgs({
  options: {
    out: { type: 'string' },
    text: { type: 'string' },
    duration: { type: 'string' },
    influence: { type: 'string', default: '0.5' },
    count: { type: 'string', default: '1' },
  },
})
if (!values.out || !values.text) {
  console.error('Usage : npm run sfx -- --out logs/sons/<son> --text "<description>" [--duration 2] [--influence 0.5] [--count 3]')
  process.exit(1)
}

const client = new ElevenLabsClient()
const name = basename(values.out)
mkdirSync(values.out, { recursive: true })
const count = Number(values.count)
for (let i = 1; i <= count; i++) {
  const audio = await client.textToSoundEffects.convert({
    text: values.text,
    modelId: 'eleven_text_to_sound_v2',
    ...(values.duration && { durationSeconds: Number(values.duration) }),
    promptInfluence: Number(values.influence),
    outputFormat: 'mp3_44100_128',
  })
  const file = join(values.out, `${name}-${i}.mp3`)
  await pipeline(typeof audio.pipe === 'function' ? audio : Readable.fromWeb(audio), createWriteStream(file))
  console.log(file)
}
