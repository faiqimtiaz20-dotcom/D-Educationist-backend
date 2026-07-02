import { execSync } from 'node:child_process'
import { prisma } from './lib/prisma.js'
import { env } from './config/env.js'
import { ensureDefaultBranches } from './lib/defaultBranches.js'

function run(command: string) {
  execSync(command, { stdio: 'inherit', env: process.env })
}

export async function bootstrapDatabase() {
  if (env.NODE_ENV === 'test') return

  console.log('[bootstrap] Generating Prisma client...')
  run('npx prisma generate')

  console.log('[bootstrap] Running database migrations...')
  run('npx prisma migrate deploy')

  await ensureDefaultBranches()

  const tenantCount = await prisma.tenant.count()
  if (tenantCount === 0) {
    console.log('[bootstrap] Empty database — running one-time seed...')
    run('npx prisma db seed')
    console.log('[bootstrap] Seed complete.')
  } else {
    console.log('[bootstrap] Database already has data — skipping seed.')
  }
}
