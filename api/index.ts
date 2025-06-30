import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import axios from 'axios'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBperuUWtP36lO_cRyGYSxuiTkhpy54F_Q",
  authDomain: "myvue3-e45b9.firebaseapp.com",
  projectId: "myvue3-e45b9",
  storageBucket: "myvue3-e45b9.firebasestorage.app",
  messagingSenderId: "439732498123",
  appId: "1:439732498123:web:46d43d1cb409e8678c754e",
  measurementId: "G-80R2D8D149",
}

// 初始化 Firebase
const firebaseApp = initializeApp(firebaseConfig)
const db = getFirestore(firebaseApp)

// YouTube API 金鑰
const youtubeApiKey = "AIzaSyAUD7ipwX-VAIIgbtw4V6sHKOTfyWoPdMo"

// 創建 Hono 應用程式
const app = new Hono()

// 首頁路由
app.get('/', (c) => {
  c.header('Content-Type', 'text/plain; charset=utf-8')
  return c.text('Hello Hono')
})

// API 路由群組
const api = new Hono()

// Hello API
api.get('/hello', (c) => {
  c.header('Content-Type', 'application/json; charset=utf-8')
  return c.json({
    message: "Hello World.",
    message2: "こんにちは、世界。",
    message3: "世界，你好!",
  })
})

// Firebase Firestore API
api.get('/firebasefood', async (c) => {
  c.header('Content-Type', 'application/json; charset=utf-8')
  try {
    const myvue3foodCollection = collection(db, "myvue3food")
    const snapshot = await getDocs(myvue3foodCollection)
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return c.json({ myvue3food: documents })
  } catch (error) {
    return c.json({
      error: "Failed to fetch data from Firestore",
      details: error.message,
    })
  }
})

// YouTube Channel API
api.get('/youtube/channel/:channelIds', async (c) => {
  const channelIdsParam = c.req.param('channelIds')
  if (!channelIdsParam) {
    return c.json({ error: "請提供 channelIds 參數（可用逗號分隔多個）" })
  }

  const channelIds = channelIdsParam.split(",").map((v) => v.trim()).filter((v) => v.length > 0)
  if (channelIds.length === 0 || channelIds.length > 50) {
    return c.json({ error: "頻道 ID 數量需介於 1 到 50 之間" })
  }

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
      params: {
        part: "snippet,statistics",
        id: channelIds.join(","),
        key: youtubeApiKey,
      },
    })

    const items = res.data?.items || []
    if (items.length === 0) {
      return c.json({ error: "找不到任何頻道資料" })
    }
    return c.json({ count: items.length, items })
  } catch (error) {
    return c.json({
      error: "無法取得頻道資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    })
  }
})

// YouTube Videos API
api.get('/youtube/videos/:videoIds', async (c) => {
  const videoIdsParam = c.req.param('videoIds')
  if (!videoIdsParam) {
    return c.json({ error: "請提供 videoIds 參數（可用逗號分隔多個）" })
  }

  const videoIds = videoIdsParam.split(",").map((v) => v.trim()).filter((v) => v.length > 0)
  if (videoIds.length === 0 || videoIds.length > 50) {
    return c.json({ error: "影片 ID 數量需介於 1 到 50 之間" })
  }

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,statistics",
        id: videoIds.join(","),
        key: youtubeApiKey,
      },
    })

    const items = res.data?.items || []
    if (items.length === 0) {
      return c.json({ error: "找不到任何影片資料" })
    }
    return c.json({ count: items.length, items })
  } catch (error) {
    return c.json({
      error: "無法取得影片資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    })
  }
})

// Countdown API
api.get('/countdown/:slug', (c) => {
  const slug = c.req.param('slug')
  if (!slug || slug.length < 12) {
    return c.json({ error: "Invalid slug. Format should be: YYYYMMDDHHMM" })
  }

  const slugISO = `${slug.slice(0, 4)}-${slug.slice(4, 6)}-${slug.slice(6, 8)}T${slug.slice(8, 10)}:${slug.slice(10, 12)}:00+08:00`
  const now = new Date()
  const next = new Date(slugISO)

  const diffMs = next.getTime() - now.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  let remaining = diffSec

  const diffday = Math.floor(remaining / 86400)
  remaining -= diffday * 86400
  const diffhour = Math.floor(remaining / 3600)
  remaining -= diffhour * 3600
  const diffminute = Math.floor(remaining / 60)
  const diffsecond = remaining % 60

  return c.json({
    slug,
    now: now.toISOString(),
    slugISO,
    next: next.toISOString(),
    diffMs,
    diffday,
    diffhour,
    diffminute,
    diffsecond,
  })
})

// Bilibili Video API
api.get('/bilibili/:bvid', async (c) => {
  c.header('Content-Type', 'application/json; charset=utf-8')
  const bvid = c.req.param('bvid')
  if (!bvid) {
    return c.json({ error: "請提供 bvid 參數" })
  }

  try {
    const res = await axios.get("https://api.bilibili.com/x/web-interface/view", {
      params: { bvid },
    })

    const { pic, title, owner, stat, pages } = res.data.data
    const raw = res.data.data
    const newdata = {}
    for (const key in raw) {
      if (typeof raw[key] !== "object") newdata[key] = raw[key]
    }

    return c.json({ pic, title, owner, stat, data: newdata, pages })
  } catch (error) {
    return c.json({
      error: "無法取得 Bilibili 資料",
      message: error.message,
      status: error.response?.status || null,
      response: error.response?.data || null,
    })
  }
})

// Bilibili Proxy Image API
api.get('/bilibili/proxyimg', async (c) => {
  const url = c.req.query('url')
  if (!url) {
    c.status(400)
    return c.json({ error: "請提供 url 參數" })
  }

  try {
    const response = await axios.get(url, {
      responseType: 'stream',
      headers: { Referer: "https://www.bilibili.com/" },
    })

    c.header("Content-Type", response.headers["content-type"] || "application/octet-stream")
    c.header("Cache-Control", "public, max-age=86400")

    return c.body(response.data)
  } catch (err) {
    c.status(500)
    return c.json({ error: "圖片代理失敗", message: err.message })
  }
})

// 將 API 路由掛載到主應用程式
app.route('/api', api)

// 啟動服務器
//const port = 3000
//console.log(`🔥 Hono is running at http://localhost:${port}`)

//serve({
  //fetch: app.fetch,
  //port,
//})
export default app