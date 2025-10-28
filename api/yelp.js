import https from 'https'
import { Buffer } from 'node:buffer'
import process from 'process'
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search'
const MAX_RESULTS = 20

const hasNativeFetch = typeof fetch === 'function'

function buildNodeLikeResponse(res, bodyBuffer) {
  const textCache = bodyBuffer.toString('utf8')
  return {
    ok: res.statusCode >= 200 && res.statusCode < 300,
    status: res.statusCode,
    statusText: res.statusMessage ?? '',
    headers: res.headers,
    async json() {
      if (!textCache) return null
      try {
        return JSON.parse(textCache)
      } catch {
        return null
      }
    },
    async text() {
      return textCache
    },
  }
}

async function safeFetch(url, options = {}) {
  if (hasNativeFetch) {
    return fetch(url, options)
  }

  const { method = 'GET', headers = {}, body } = options
  const target = new URL(url)

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method,
        hostname: target.hostname,
        port: target.port || 443,
        path: `${target.pathname}${target.search}`,
        headers,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('end', () => {
          const buffer = Buffer.concat(chunks)
          resolve(buildNodeLikeResponse(res, buffer))
        })
      }
    )

    request.on('error', (error) => {
      reject(error)
    })

    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        request.write(body)
      } else {
        request.write(JSON.stringify(body))
      }
    }

    request.end()
  })
}

export default async function handler(req, res) {
  if (!process.env.YELP_API_KEY) {
    return res.status(500).json({ error: 'Missing Yelp API key' })
  }

  try {
    const { term = '', location = '', lat, lon, limit = 8 } = req.query ?? {}
    const trimmedTerm = term.trim()
    const trimmedLocation = location.trim()
    const size = Math.min(MAX_RESULTS, Math.max(1, Number(limit) || 8))

    if (!trimmedTerm) {
      return res.status(400).json({ error: 'Search term is required' })
    }

    const params = new URLSearchParams({ term: trimmedTerm, limit: String(size) })

    if (lat && lon) {
      const latitude = Number(lat)
      const longitude = Number(lon)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'Latitude/longitude must be numbers' })
      }
      params.set('latitude', latitude.toString())
      params.set('longitude', longitude.toString())
    } else if (trimmedLocation) {
      params.set('location', trimmedLocation)
    } else {
      return res.status(400).json({ error: 'Provide a location or enable geolocation' })
    }

    const upstream = await safeFetch(`${YELP_API_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${process.env.YELP_API_KEY}`,
      },
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      return res.status(upstream.status).json({ error: text || 'Yelp error' })
    }

    const payload = await upstream.json()
    const results = (payload.businesses ?? []).map((business) => ({
      id: business.id,
      name: business.name,
      rating: business.rating,
      price: business.price,
      categories: (business.categories ?? [])
        .map((category) => category?.title)
        .filter(Boolean),
      image_url: business.image_url,
      url: business.url,
      address: (business.location?.display_address ?? []).join(', '),
    }))

    return res.status(200).json({ results })
  } catch (error) {
    console.error('Yelp proxy error', error)
    const status = error?.name === 'FetchError' ? 502 : 500
    return res.status(status).json({ error: error?.message ?? 'Server error' })
  }
}
