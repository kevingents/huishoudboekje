// Lokale dev-database zonder installatie: start een embedded PostgreSQL op
// localhost:5432 met dezelfde credentials als .env (user/password/huishoudboekje).
// Gebruik: `npm run dev:db` (laten draaien) en in een tweede terminal `npm run dev`.
// De data staat buiten de repo/OneDrive (LOCALAPPDATA) en blijft bewaard.
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const dataDir = join(process.env.LOCALAPPDATA || process.cwd(), 'fam-dev-postgres')
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'user',
  password: 'password',
  port: 5432,
  persistent: true,
  // UTF8 forceren — anders kiest initdb op Windows WIN1252 en falen migraties
  // met Unicode-tekens (productie/Neon is ook UTF8).
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
})

const fresh = !existsSync(join(dataDir, 'PG_VERSION'))
if (fresh) {
  console.log(`Database-map initialiseren in ${dataDir}…`)
  await pg.initialise()
}
await pg.start()
if (fresh) await pg.createDatabase('huishoudboekje')
console.log('PostgreSQL draait op localhost:5432 (db: huishoudboekje). Ctrl+C om te stoppen.')

const stop = async () => {
  await pg.stop()
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
