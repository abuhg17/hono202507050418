import { Hono } from "hono";
import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBperuUWtP36lO_cRyGYSxuiTkhpy54F_Q",
  authDomain: "myvue3-e45b9.firebaseapp.com",
  projectId: "myvue3-e45b9",
  storageBucket: "myvue3-e45b9.firebasestorage.app",
  messagingSenderId: "439732498123",
  appId: "1:439732498123:web:46d43d1cb409e8678c754e",
  measurementId: "G-80R2D8D149",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const youtubeApiKey = "AIzaSyAUD7ipwX-VAIIgbtw4V6sHKOTfyWoPdMo";

const app = new Hono();

// 首頁路由
app.get("/", (ctx) => {
  return ctx.text("Hello Hono", 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

// /api 群組路由
const api = new Hono();

api.get("/hello", (ctx) => {
  return ctx.json(
    {
      message: "Hello World.",
      message2: "こんにちは、世界。",
      message3: "世界，你好!",
    },
    200,
    {
      "Content-Type": "application/json; charset=utf-8",
    }
  );
});

api.get("/firebasefood", async (ctx) => {
  try {
    const myvue3foodCollection = collection(db, "myvue3food");
    const snapshot = await getDocs(myvue3foodCollection);
    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return ctx.json({ myvue3food: documents });
  } catch (error: any) {
    return ctx.json(
      {
        error: "Failed to fetch data from Firestore",
        details: error.message,
      },
      500
    );
  }
});

api.get("/youtube/channel/:channelIds", async (ctx) => {
  const channelIdsParam = ctx.req.param("channelIds");
  if (!channelIdsParam)
    return ctx.json({ error: "請提供 channelIds 參數（可用逗號分隔多個）" }, 400);

  const channelIds = channelIdsParam
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (channelIds.length === 0 || channelIds.length > 50)
    return ctx.json({ error: "頻道 ID 數量需介於 1 到 50 之間" }, 400);

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/channels", {
      params: {
        part: "snippet,statistics",
        id: channelIds.join(","),
        key: youtubeApiKey,
      },
    });

    const items = res.data?.items || [];
    if (items.length === 0) return ctx.json({ error: "找不到任何頻道資料" }, 404);

    return ctx.json({ count: items.length, items });
  } catch (error: any) {
    return ctx.json(
      {
        error: "無法取得頻道資料",
        message: error.message,
        status: error.response?.status || null,
        response: error.response?.data || null,
      },
      500
    );
  }
});

api.get("/youtube/videos/:videoIds", async (ctx) => {
  const videoIdsParam = ctx.req.param("videoIds");
  if (!videoIdsParam)
    return ctx.json({ error: "請提供 videoIds 參數（可用逗號分隔多個）" }, 400);

  const videoIds = videoIdsParam
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  if (videoIds.length === 0 || videoIds.length > 50)
    return ctx.json({ error: "影片 ID 數量需介於 1 到 50 之間" }, 400);

  try {
    const res = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
      params: {
        part: "snippet,statistics",
        id: videoIds.join(","),
        key: youtubeApiKey,
      },
    });

    const items = res.data?.items || [];
    if (items.length === 0) return ctx.json({ error: "找不到任何影片資料" }, 404);

    return ctx.json({ count: items.length, items });
  } catch (error: any) {
    return ctx.json(
      {
        error: "無法取得影片資料",
        message: error.message,
        status: error.response?.status || null,
        response: error.response?.data || null,
      },
      500
    );
  }
});

api.get("/countdown/:slug", (ctx) => {
  const slug = ctx.req.param("slug");
  if (!slug || slug.length < 12)
    return ctx.json({ error: "Invalid slug. Format should be: YYYYMMDDHHMM" }, 400);

  const slugISO = `${slug.slice(0, 4)}-${slug.slice(4, 6)}-${slug.slice(6, 8)}T${slug.slice(
    8,
    10
  )}:${slug.slice(10, 12)}:00+08:00`;
  const now = new Date();
  const next = new Date(slugISO);

  const diffMs = next.getTime() - now.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  let remaining = diffSec;

  const diffday = Math.floor(remaining / 86400);
  remaining -= diffday * 86400;
  const diffhour = Math.floor(remaining / 3600);
  remaining -= diffhour * 3600;
  const diffminute = Math.floor(remaining / 60);
  const diffsecond = remaining % 60;

  return ctx.json({
    slug,
    now: now.toISOString(),
    slugISO,
    next: next.toISOString(),
    diffMs,
    diffday,
    diffhour,
    diffminute,
    diffsecond,
  });
});

api.get("/bilibili/:bvid", async (ctx) => {
  const bvid = ctx.req.param("bvid");
  if (!bvid) return ctx.json({ error: "請提供 bvid 參數" }, 400);

  try {
    const res = await axios.get("https://api.bilibili.com/x/web-interface/view", {
      params: { bvid },
    });

    const { pic, title, owner, stat, pages } = res.data.data;
    const raw = res.data.data;
    const newdata: Record<string, any> = {};
    for (const key in raw) {
      if (typeof raw[key] !== "object") newdata[key] = raw[key];
    }

    return ctx.json({ pic, title, owner, stat, data: newdata, pages });
  } catch (error: any) {
    return ctx.json(
      {
        error: "無法取得 Bilibili 資料",
        message: error.message,
        status: error.response?.status || null,
        response: error.response?.data || null,
      },
      500
    );
  }
});

api.get("/bilibili/proxyimg", async (ctx) => {
  const url = ctx.req.query("url");
  if (!url) {
    return ctx.json({ error: "請提供 url 參數" }, 400);
  }

  try {
    const response = await axios.get(url, {
      responseType: "stream",
      headers: { Referer: "https://www.bilibili.com/" },
    });

    const headers = {
      "Content-Type": response.headers["content-type"] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    };

    return ctx.body(response.data, 200, headers);
  } catch (err: any) {
    return ctx.json({ error: "圖片代理失敗", message: err.message }, 500);
  }
});

// 掛載 /api 路由群組
app.route("/api", api);

// Bun 啟動
Bun.serve({
  port: 3000,
  fetch: app.fetch,
});

console.log("🦊 Hono server running at http://localhost:3000");
