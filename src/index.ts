import 'dotenv/config'
import app from './app.js'
import { loadConfig } from './config/index.js'
import { pool } from './db/pool.js'
import { AnalyticsService } from './services/analytics/service.js'
import { AnalyticsRefreshWorker, getAnalyticsRefreshIntervalMs } from './jobs/analyticsRefreshWorker.js'
import { OutboxPublisher } from './db/outbox/index.js'
import { WebhookEventPublisher } from './db/outbox/webhookPublisher.js'
import { createWebhookService } from './services/webhooks/service.js'
import { WebhookStore } from './services/webhooks/types.js'

export { app }
export default app

try {
  const config = loadConfig()

  app.listen(config.port, () => {
    console.log(`Credence API listening on port ${config.port}`)
  })

  // Start outbox publisher if enabled
  if (config.outbox.enabled && process.env.DATABASE_URL) {
    console.log('[Outbox] Starting event publisher...')
    
    // TODO: Replace with actual webhook store implementation
    // For now, using a stub that returns no webhooks
    const stubWebhookStore: WebhookStore = {
      getByEvent: async () => [],
      getById: async () => null,
      create: async () => ({ id: '', url: '', events: [], active: true, secret: null, createdAt: new Date() }),
      update: async () => {},
      delete: async () => {},
      list: async () => [],
    }
    
    const webhookService = createWebhookService(stubWebhookStore)
    const outboxPublisher = new OutboxPublisher(
      new WebhookEventPublisher(webhookService),
      {
        pollIntervalMs: config.outbox.pollIntervalMs,
        batchSize: config.outbox.batchSize,
        cleanup: {
          publishedRetentionDays: config.outbox.publishedRetentionDays,
          failedRetentionDays: config.outbox.failedRetentionDays,
        },
        cleanupIntervalMs: config.outbox.cleanupIntervalMs,
      }
    )
    
    outboxPublisher.start().catch(err => {
      console.error('[Outbox] Failed to start publisher:', err)
    })
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[Outbox] Stopping publisher...')
      await outboxPublisher.stop()
      await pool.end()
      process.exit(0)
    })
  }

  if (process.env.DATABASE_URL) {
    const thresholdSeconds = Number(process.env.ANALYTICS_STALENESS_SECONDS ?? '300')
    const analyticsService = new AnalyticsService(pool, thresholdSeconds)
    const refreshWorker = new AnalyticsRefreshWorker(analyticsService, console.log)
    const intervalMs = getAnalyticsRefreshIntervalMs()
    let running = false

    const tick = async (): Promise<void> => {
      if (running) {
        console.log('Analytics refresh is already running, skipping interval')
        return
      }
      running = true
      try {
        await refreshWorker.run()
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown refresh error'
        console.error(`Analytics refresh failed: ${message}`)
      } finally {
        running = false
      }
    }

    // Run once on startup, then periodically.
    void tick()
    setInterval(() => {
      void tick()
    }, intervalMs)
  }
} catch (error) {
  console.error("Failed to start Credence API:", error)
  process.exit(1)
}
