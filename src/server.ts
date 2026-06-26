import { createApp } from './app.js'
import { env } from './config/env.js'
import { bootstrapDatabase } from './bootstrap.js'

const app = createApp()

if (env.NODE_ENV !== 'test') {
  bootstrapDatabase()
    .then(() => {
      app.listen(env.PORT, () => {
        console.log(`API listening on http://localhost:${env.PORT}`)
      })
    })
    .catch((err) => {
      console.error('[bootstrap] Failed to start:', err)
      process.exit(1)
    })
}

export { app }
