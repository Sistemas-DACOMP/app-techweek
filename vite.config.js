import crypto from 'node:crypto'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BOgJT40xkre0x9-zEttJCnDsJrLVhsPNV2F6KCkoxcfp_ayNGY8DqrUISh79LfQ0JTYEk9mq9BEjx9FIoiSmJXw'
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'x6UTyIq1BzsIPyeUOQLtevH5NanW25_i_mpvrtpawtg'
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:techweek@facom.ufu.br'

function base64UrlDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from((str + pad).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function base64UrlEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function hkdfExtractAndExpand(salt, ikm, info, length) {
  const actualSalt = salt.length > 0 ? salt : Buffer.alloc(32, 0)
  const prk = crypto.createHmac('sha256', actualSalt).update(ikm).digest()
  const infoAndCounter = Buffer.concat([info, Buffer.from([1])])
  return crypto.createHmac('sha256', prk).update(infoAndCounter).digest().subarray(0, length)
}

function createVapidAuthHeader(endpoint) {
  const parsed = new URL(endpoint)
  const audience = `${parsed.protocol}//${parsed.host}`
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60
  const pubRaw = base64UrlDecode(VAPID_PUBLIC_KEY)
  const x = base64UrlEncode(pubRaw.subarray(1, 33))
  const y = base64UrlEncode(pubRaw.subarray(33, 65))
  const privateKey = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x, y, d: VAPID_PRIVATE_KEY },
    format: 'jwk',
  })
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const claimsB64 = base64UrlEncode(
    Buffer.from(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT }))
  )
  const unsigned = `${headerB64}.${claimsB64}`
  const sig = crypto.sign('sha256', Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  })
  return `vapid t=${unsigned}.${base64UrlEncode(sig)}, k=${VAPID_PUBLIC_KEY}`
}

function encryptAes128Gcm(plaintext, p256dhB64, authB64) {
  const uaPublic = base64UrlDecode(p256dhB64)
  const authSecret = base64UrlDecode(authB64)
  const ecdh = crypto.createECDH('prime256v1')
  const asPublic = ecdh.generateKeys()
  const ecdhSecret = ecdh.computeSecret(uaPublic)
  const salt = crypto.randomBytes(16)
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), uaPublic, asPublic])
  const ikm = hkdfExtractAndExpand(authSecret, ecdhSecret, keyInfo, 32)
  const cek = hkdfExtractAndExpand(
    salt,
    ikm,
    Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'),
    16
  )
  const nonce = hkdfExtractAndExpand(salt, ikm, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12)
  const padded = Buffer.concat([plaintext, Buffer.from([2])])
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final(), cipher.getAuthTag()])
  const rs = Buffer.alloc(4)
  rs.writeUInt32BE(4096, 0)
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, encrypted])
}

function webPushRelayPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/__webpush_broadcast', (req, res, next) => {
      if (req.method !== 'POST') return next()
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
      })
      req.on('end', async () => {
        try {
          const { subscriptions = [], payload = {} } = JSON.parse(raw || '{}')
          const plaintext = Buffer.from(JSON.stringify(payload), 'utf8')
          const results = await Promise.all(
            subscriptions.map(async (sub) => {
              try {
                if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
                  return { ok: false, status: 400 }
                }
                const body = encryptAes128Gcm(plaintext, sub.keys.p256dh, sub.keys.auth)
                const authorization = createVapidAuthHeader(sub.endpoint)
                const response = await fetch(sub.endpoint, {
                  method: 'POST',
                  headers: {
                    Authorization: authorization,
                    'Content-Encoding': 'aes128gcm',
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': String(body.length),
                    TTL: '86400',
                    Urgency: 'high',
                  },
                  body,
                })
                return { ok: response.status >= 200 && response.status < 300, status: response.status }
              } catch {
                return { ok: false, status: 0 }
              }
            })
          )
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ok: true,
              sent: results.filter((r) => r.ok).length,
              total: results.length,
            })
          )
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false }))
        }
      })
    })
  }
  return {
    name: 'techweek-webpush-relay',
    configureServer(server) {
      attachMiddleware(server.middlewares)
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), webPushRelayPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001/facom-techweek-layerx/us-east1/api',
        changeOrigin: true
      }
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.{js,jsx}', 'scripts/**/*.test.{js,mjs}'],
  },
})

