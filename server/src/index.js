import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

const app = express()
const port = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'tarteel-api', timestamp: new Date().toISOString() })
})

app.get('/api/surahs', (_req, res) => {
  res.json({
    data: [
      { number: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', ayahs: 7 },
      { number: 2, name: 'Al-Baqarah', arabicName: 'البقرة', ayahs: 286 },
      { number: 3, name: 'Aal-E-Imran', arabicName: 'آل عمران', ayahs: 200 }
    ]
  })
})

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

app.listen(port, () => {
  console.log(`Tarteel API listening on http://localhost:${port}`)
})
