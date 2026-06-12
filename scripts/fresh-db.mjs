// Bootstrap voor een VERSE (lege) database. Nodig omdat de migratiemappen niet
// zero-padded zijn (0_init … 22_…): `prisma migrate deploy` past ze lexicografisch
// toe (19_ vóór 5_) en faalt dan op een lege database. Bestaande omgevingen
// (zoals productie) hebben hier geen last van — daar zijn de migraties destijds
// incrementeel toegepast; raak die mapnamen dus NIET aan.
//
// Dit script voert de migraties in NUMERIEKE volgorde uit en registreert elke
// migratie in _prisma_migrations (via `prisma migrate resolve`). Daarna werkt
// gewoon `npx prisma migrate deploy` voor alle volgende migraties.
//
// Gebruik: database starten (bijv. `npm run dev:db`) en dan `npm run db:fresh`.
import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const migrationsDir = join(process.cwd(), 'prisma', 'migrations')
const migrations = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(migrationsDir, d.name, 'migration.sql')))
  .map((d) => d.name)
  .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))

if (migrations.length === 0) {
  console.error('Geen migraties gevonden.')
  process.exit(1)
}

function run(args, input) {
  // Eén commandostring (geen args-array) — vermijdt de shell-escaping-warning;
  // alle argumenten zijn vaste mapnamen/paden uit de repo, geen gebruikersinvoer.
  const res = spawnSync(['npx', ...args].map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' '), {
    shell: true,
    input,
    encoding: 'utf8',
  })
  return res
}

// Veiligheidscheck: alleen doorgaan op een lege database (geen Household-tabel en
// geen al-geregistreerde migraties). Beschermt tegen per ongeluk draaien op prod.
const probe = run(['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'],
  `DO $$ BEGIN
     IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Household', '_prisma_migrations')) THEN
       RAISE EXCEPTION 'DATABASE_NIET_LEEG';
     END IF;
   END $$;`)
if (probe.status !== 0) {
  if ((probe.stderr || '').includes('DATABASE_NIET_LEEG')) {
    console.error('Deze database is niet leeg — gebruik `npx prisma migrate deploy` voor bestaande omgevingen.')
  } else {
    console.error('Kon de database niet bereiken:\n' + (probe.stderr || probe.stdout))
  }
  process.exit(1)
}

console.log(`Verse database: ${migrations.length} migraties toepassen in numerieke volgorde…`)
for (const name of migrations) {
  const file = join('prisma', 'migrations', name, 'migration.sql')
  const exec = run(['prisma', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', file])
  if (exec.status !== 0) {
    console.error(`Mislukt bij ${name}:\n` + (exec.stderr || exec.stdout))
    process.exit(1)
  }
  const resolve = run(['prisma', 'migrate', 'resolve', '--applied', name])
  if (resolve.status !== 0) {
    console.error(`Registreren van ${name} mislukt:\n` + (resolve.stderr || resolve.stdout))
    process.exit(1)
  }
  console.log(`  ✓ ${name}`)
}
console.log('Klaar — alle migraties toegepast en geregistreerd. `npx prisma migrate deploy` werkt nu normaal.')
