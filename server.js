"use strict";

/*
============================================================
 TÜRKAI SERVER 12.0
 PART 1 / 3

 TEMEL:
 - Express
 - Socket.IO
 - Database
 - Kullanıcı
 - Session
 - Chat
 - AI
 - Health
 - Plans
 - Models
============================================================
*/

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");

// ============================================================
// APP
// ============================================================

const APP_NAME = "TürkAI";
const APP_VERSION = "12.0.0";
const APP_DESCRIPTION =
  "Türkçe yapay zekâ, araştırma, kodlama, dosya ve hafıza platformu.";

const NODE_ENV = process.env.NODE_ENV || "production";
const IS_PRODUCTION = NODE_ENV === "production";

const PORT = Number(process.env.PORT) || 10000;
const HOST = process.env.HOST || "0.0.0.0";

const START_TIME = new Date().toISOString();

const SERVER_ID =
  process.env.SERVER_ID ||
  crypto.randomBytes(8).toString("hex");

// ============================================================
// EXPRESS
// ============================================================

const app = express();

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  },
  transports: ["polling", "websocket"]
});

// ============================================================
// DIRECTORIES
// ============================================================

const ROOT_DIR = __dirname;

const DATA_DIR = path.join(ROOT_DIR, "data");
const STORAGE_DIR = path.join(ROOT_DIR, "storage");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const GENERATED_DIR = path.join(ROOT_DIR, "generated");
const LOG_DIR = path.join(ROOT_DIR, "logs");
const CACHE_DIR = path.join(ROOT_DIR, "cache");
const TEMP_DIR = path.join(ROOT_DIR, "temp");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const REQUIRED_DIRS = [
  DATA_DIR,
  STORAGE_DIR,
  UPLOAD_DIR,
  GENERATED_DIR,
  LOG_DIR,
  CACHE_DIR,
  TEMP_DIR,
  PUBLIC_DIR
];

for (const directory of REQUIRED_DIRS) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
}

// ============================================================
// DATABASE FILES
// ============================================================

const DB = {
  users: path.join(DATA_DIR, "users.json"),
  sessions: path.join(DATA_DIR, "sessions.json"),
  chats: path.join(DATA_DIR, "chats.json"),
  messages: path.join(DATA_DIR, "messages.json"),
  memories: path.join(DATA_DIR, "memories.json"),
  knowledge: path.join(DATA_DIR, "knowledge.json"),
  usage: path.join(DATA_DIR, "usage.json"),
  files: path.join(DATA_DIR, "files.json"),
  projects: path.join(DATA_DIR, "projects.json"),
  research: path.join(DATA_DIR, "research.json"),
  payments: path.join(DATA_DIR, "payments.json"),
  notifications: path.join(DATA_DIR, "notifications.json"),
  audit: path.join(DATA_DIR, "audit.json"),
  security: path.join(DATA_DIR, "security.json"),
  settings: path.join(DATA_DIR, "settings.json")
};

// ============================================================
// DEFAULT DATABASE
// ============================================================

const DEFAULTS = {
  users: [],
  sessions: [],
  chats: [],
  messages: [],
  memories: [],
  knowledge: [],
  usage: [],
  files: [],
  projects: [],
  research: [],
  payments: [],
  notifications: [],
  audit: [],
  security: [],
  settings: {
    maintenance: false,
    registration: true,
    research: true,
    memory: true,
    uploads: true,
    imageGeneration: true,
    videoGeneration: true
  }
};

// ============================================================
// DATABASE INIT
// ============================================================

function ensureDatabase() {
  for (const [name, file] of Object.entries(DB)) {
    if (!fs.existsSync(file)) {
      writeJSON(file, DEFAULTS[name]);
    }
  }
}

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) {
      writeJSON(file, fallback);
      return fallback;
    }

    const raw = fs.readFileSync(file, "utf8");

    if (!raw.trim()) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    logError("database-read", error);

    try {
      return JSON.parse(JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }
}

function writeJSON(file, data) {
  try {
    const tempFile = `${file}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    fs.renameSync(tempFile, file);

    return true;
  } catch (error) {
    console.error(
      "[TürkAI][DATABASE WRITE ERROR]",
      error.message
    );

    return false;
  }
}

ensureDatabase();

// ============================================================
// LOGGING
// ============================================================

function logFile(name, message) {
  try {
    const file = path.join(LOG_DIR, `${name}.log`);

    fs.appendFileSync(
      file,
      `[${new Date().toISOString()}] ${message}\n`,
      "utf8"
    );
  } catch {}
}

function logInfo(scope, data) {
  const message =
    typeof data === "string"
      ? data
      : JSON.stringify(data);

  console.log(`[TürkAI][${scope}] ${message}`);

  logFile("server", `[INFO][${scope}] ${message}`);
}

function logError(scope, error) {
  const message =
    error?.stack ||
    error?.message ||
    String(error);

  console.error(
    `[TürkAI][HATA][${scope}]`,
    message
  );

  logFile(
    "error",
    `[${scope}] ${message}`
  );
}

function logSecurity(event, data = {}) {
  const entry = {
    id: createId("sec"),
    event,
    data,
    timestamp: nowISO()
  };

  const security = readJSON(
    DB.security,
    []
  );

  security.push(entry);

  if (security.length > 5000) {
    security.splice(
      0,
      security.length - 5000
    );
  }

  writeJSON(DB.security, security);
}

function logAI(data = {}) {
  logFile(
    "ai",
    JSON.stringify({
      timestamp: nowISO(),
      ...data
    })
  );
}

// ============================================================
// HELPERS
// ============================================================

function nowISO() {
  return new Date().toISOString();
}

function createId(prefix = "id") {
  return (
    prefix +
    "_" +
    crypto.randomBytes(12).toString("hex")
  );
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function cleanText(value, maxLength = 10000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeText(value) {
  return cleanText(value, 10000)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

// ============================================================
// SERVER STATE
// ============================================================

const SERVER_STATE = {
  started: false,
  shuttingDown: false,
  startTime: START_TIME,
  port: PORT,
  host: HOST
};

// ============================================================
// PLANS
// ============================================================

const PLANS = {
  free: {
    name: "Free",
    price: 0,
    messages: 50,
    research: 5,
    images: 0,
    videos: 0,
    storageMB: 10
  },

  pro: {
    name: "Pro",
    price: 250,
    messages: 100,
    research: 25,
    images: 2,
    videos: 0,
    storageMB: 25
  },

  plus: {
    name: "Plus",
    price: 500,
    messages: 200,
    research: 75,
    images: 4,
    videos: 5,
    storageMB: 50
  },

  ultra: {
    name: "Ultra",
    price: 1000,
    messages: 1000,
    research: 250,
    images: 10,
    videos: 15,
    storageMB: 100
  },

  developer: {
    name: "Developer",
    price: 0,
    messages: 400,
    research: 500,
    images: 50,
    videos: 50,
    storageMB: 200
  }
};

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "25mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb"
  })
);

// ============================================================
// REQUEST LOGGER
// ============================================================

app.use((req, res, next) => {
  const started = Date.now();

  res.on("finish", () => {
    const duration =
      Date.now() - started;

    logFile(
      "access",
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
});

// ============================================================
// USERS
// ============================================================

function getUsers() {
  return readJSON(DB.users, []);
}

function saveUsers(users) {
  return writeJSON(DB.users, users);
}

function findUserById(id) {
  if (!id) return null;

  return getUsers().find(
    user => user.id === id
  ) || null;
}

function findUserByEmail(email) {
  if (!email) return null;

  const normalized =
    cleanText(email, 300).toLowerCase();

  return getUsers().find(
    user =>
      String(user.email || "")
        .toLowerCase() === normalized
  ) || null;
}

function createUser(data = {}) {
  const users = getUsers();

  const user = {
    id: createId("usr"),

    name:
      cleanText(data.name, 100) ||
      "TürkAI Kullanıcısı",

    email:
      cleanText(data.email, 300) ||
      null,

    plan:
      data.plan &&
      PLANS[data.plan]
        ? data.plan
        : "free",

    role:
      data.role || "user",

    createdAt: nowISO(),
    updatedAt: nowISO(),

    active: true
  };

  users.push(user);

  saveUsers(users);

  return user;
}

function getGuestUser() {
  return {
    id: "guest",
    name: "Misafir",
    email: null,
    plan: "free",
    role: "guest",
    active: true
  };
}

// ============================================================
// SESSIONS
// ============================================================

function getSessions() {
  return readJSON(DB.sessions, []);
}

function saveSessions(sessions) {
  return writeJSON(DB.sessions, sessions);
}

function createSession(userId) {
  const sessions = getSessions();

  const session = {
    id: createId("ses"),
    token: createToken(),
    userId,
    createdAt: nowISO(),
    lastUsedAt: nowISO()
  };

  sessions.push(session);

  saveSessions(sessions);

  return session;
}

function getSessionByToken(token) {
  if (!token) return null;

  const sessions = getSessions();

  return sessions.find(
    session =>
      session.token === token
  ) || null;
}

function getRequestUser(req) {
  const authorization =
    req.headers.authorization || "";

  let token = "";

  if (
    authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    token = authorization
      .slice(7)
      .trim();
  }

  if (!token) {
    token =
      req.headers["x-session-token"] ||
      req.headers["x-auth-token"] ||
      "";
  }

  if (!token) {
    return getGuestUser();
  }

  const session =
    getSessionByToken(token);

  if (!session) {
    return getGuestUser();
  }

  session.lastUsedAt = nowISO();

  const sessions = getSessions();

  const index = sessions.findIndex(
    item => item.id === session.id
  );

  if (index !== -1) {
    sessions[index] = session;
    saveSessions(sessions);
  }

  return (
    findUserById(session.userId) ||
    getGuestUser()
  );
}

// ============================================================
// PLAN HELPERS
// ============================================================

function getPlan(user) {
  const plan =
    user?.plan || "free";

  return (
    PLANS[plan] ||
    PLANS.free
  );
}

// ============================================================
// CHAT DATABASE
// ============================================================

function getChats() {
  return readJSON(DB.chats, []);
}

function saveChats(chats) {
  return writeJSON(DB.chats, chats);
}

function getMessages() {
  return readJSON(DB.messages, []);
}

function saveMessages(messages) {
  return writeJSON(DB.messages, messages);
}

function createChat(data = {}) {
  const chats = getChats();

  const chat = {
    id: createId("chat"),

    userId:
      data.userId ||
      "guest",

    title:
      cleanText(data.title, 100) ||
      "Yeni Sohbet",

    model:
      data.model ||
      "fast",

    createdAt: nowISO(),
    updatedAt: nowISO(),

    archived: false
  };

  chats.push(chat);

  saveChats(chats);

  return chat;
}

function findChatById(chatId) {
  if (!chatId) return null;

  return getChats().find(
    chat => chat.id === chatId
  ) || null;
}

function addMessage(chatId, data = {}) {
  const messages = getMessages();

  const message = {
    id: createId("msg"),

    chatId,

    role:
      data.role ||
      "user",

    content:
      cleanText(data.content, 50000),

    model:
      data.model ||
      null,

    source:
      data.source ||
      "local",

    createdAt: nowISO()
  };

  messages.push(message);

  if (messages.length > 50000) {
    messages.splice(
      0,
      messages.length - 50000
    );
  }

  saveMessages(messages);

  const chats = getChats();

  const chatIndex =
    chats.findIndex(
      chat => chat.id === chatId
    );

  if (chatIndex !== -1) {
    chats[chatIndex].updatedAt =
      nowISO();

    saveChats(chats);
  }

  return message;
}

function getChatMessages(chatId, limit = 30) {
  return getMessages()
    .filter(
      message =>
        message.chatId === chatId
    )
    .slice(-limit);
}

// ============================================================
// AI CONFIG
// ============================================================

const GROQ_API_KEY =
  process.env.GROQ_API_KEY || "";

const CEREBRAS_API_KEY =
  process.env.CEREBRAS_API_KEY || "";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || "";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";

const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  "openai/gpt-oss-20b";

const CEREBRAS_MODEL =
  process.env.CEREBRAS_MODEL ||
  "gpt-oss-120b";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-oss-20b";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-2.0-flash";

// ============================================================
// AI SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için geliştirilmiş
modern bir yapay zekâ asistanısın.

Kurallar:

- Türkçe sorulara doğal Türkçe cevap ver.
- Gereksiz uzunluk kullanma.
- Kod istendiğinde çalışan kod üret.
- Kullanıcı kod konusunda hata alıyorsa hatayı açıkla.
- Güncel bilgi gerekiyorsa araştırma sistemi kullanılabilir.
- Bilmediğin bilgiyi kesinmiş gibi uydurma.
- Matematik işlemlerini doğru yap.
- Kullanıcıya yardımcı ve anlaşılır ol.
- Sistem hakkında sorulursa kendini TürkAI olarak tanıt.
`;

// ============================================================
// FETCH
// ============================================================

async function fetchWithTimeout(
  url,
  options = {},
  timeout = 30000
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// GROQ
// ============================================================

async function callGroq(messages) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "Groq API key bulunamadı."
    );
  }

  const response =
    await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${GROQ_API_KEY}`
        },

        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4096
        })
      },
      30000
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Groq ${response.status}: ${text.slice(0, 500)}`
    );
  }

  const data =
    await response.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Groq boş cevap döndürdü."
    );
  }

  return content;
}

// ============================================================
// CEREBRAS
// ============================================================

async function callCerebras(messages) {
  if (!CEREBRAS_API_KEY) {
    throw new Error(
      "Cerebras API key bulunamadı."
    );
  }

  const response =
    await fetchWithTimeout(
      "https://api.cerebras.ai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${CEREBRAS_API_KEY}`
        },

        body: JSON.stringify({
          model: CEREBRAS_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4096
        })
      },
      30000
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Cerebras ${response.status}: ${text.slice(0, 500)}`
    );
  }

  const data =
    await response.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "Cerebras boş cevap döndürdü."
    );
  }

  return content;
}

// ============================================================
// OPENROUTER
// ============================================================

async function callOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OpenRouter API key bulunamadı."
    );
  }

  const response =
    await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            "https://turkai-6.onrender.com",

          "X-Title":
            "TürkAI"
        },

        body: JSON.stringify({
          model: OPENROUTER_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 4096
        })
      },
      30000
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `OpenRouter ${response.status}: ${text.slice(0, 500)}`
    );
  }

  const data =
    await response.json();

  const content =
    data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error(
      "OpenRouter boş cevap döndürdü."
    );
  }

  return content;
}

// ============================================================
// GEMINI
// ============================================================

async function callGemini(messages) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Gemini API key bulunamadı."
    );
  }

  const contents =
    messages
      .filter(
        message =>
          message.role !== "system"
      )
      .map(message => ({
        role:
          message.role === "assistant"
            ? "model"
            : "user",

        parts: [
          {
            text:
              cleanText(
                message.content,
                50000
              )
          }
        ]
      }));

  const systemMessage =
    messages.find(
      message =>
        message.role === "system"
    );

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(
      GEMINI_API_KEY
    )}`;

  const body = {
    contents
  };

  if (systemMessage) {
    body.systemInstruction = {
      parts: [
        {
          text: systemMessage.content
        }
      ]
    };
  }

  const response =
    await fetchWithTimeout(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify(body)
      },
      30000
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Gemini ${response.status}: ${text.slice(0, 500)}`
    );
  }

  const data =
    await response.json();

  const content =
    data?.candidates?.[0]
      ?.content
      ?.parts
      ?.map(part => part.text || "")
      .join("");

  if (!content) {
    throw new Error(
      "Gemini boş cevap döndürdü."
    );
  }

  return content;
}

// ============================================================
// SIMPLE MATH
// ============================================================

function solveSimpleMath(input) {
  const text =
    cleanText(input, 500);

  const expression =
    text
      .replace(/kaç eder/gi, "")
      .replace(/hesapla/gi, "")
      .replace(/sonucu nedir/gi, "")
      .replace(/=/g, "")
      .trim();

  if (
    !/^[0-9+\-*/().,%\s]+$/.test(
      expression
    )
  ) {
    return null;
  }

  if (
    !/[+\-*/%]/.test(
      expression
    )
  ) {
    return null;
  }

  try {
    const safe =
      expression.replace(
        /(\d+(?:\.\d+)?)%/g,
        "($1/100)"
      );

    const result =
      Function(
        `"use strict"; return (${safe})`
      )();

    if (
      typeof result !== "number" ||
      !Number.isFinite(result)
    ) {
      return null;
    }

    return String(result);
  } catch {
    return null;
  }
}

// ============================================================
// LOCAL AI
// ============================================================

function localResponse(message) {
  const normalized =
    normalizeText(message);

  if (!normalized) {
    return "Bir mesaj yaz, sana yardımcı olayım.";
  }

  if (
    normalized.includes(
      "en hizli kim"
    )
  ) {
    return "TürkAI ⚡🤖";
  }

  if (
    /^(merhaba|selam|sa|hey|hello)\b/.test(
      normalized
    )
  ) {
    return "Selam! Ben TürkAI. Sana nasıl yardımcı olabilirim?";
  }

  if (
    normalized.includes(
      "sen kimsin"
    ) ||
    normalized.includes(
      "adın ne"
    ) ||
    normalized.includes(
      "adin ne"
    )
  ) {
    return "Ben TürkAI'yım. Yapay zekâ, kodlama, araştırma ve daha birçok konuda yardımcı olabilirim.";
  }

  if (
    normalized.includes(
      "tesekkur"
    ) ||
    normalized.includes(
      "saol"
    ) ||
    normalized.includes(
      "sagol"
    )
  ) {
    return "Rica ederim! 🚀";
  }

  const math =
    solveSimpleMath(message);

  if (math !== null) {
    return `Sonuç: ${math}`;
  }

  return null;
}

// ============================================================
// AI PROVIDER
// ============================================================

async function callAI(messages) {
  const providers = [];

  if (GROQ_API_KEY) {
    providers.push({
      name: "groq",
      call: () =>
        callGroq(messages)
    });
  }

  if (CEREBRAS_API_KEY) {
    providers.push({
      name: "cerebras",
      call: () =>
        callCerebras(messages)
    });
  }

  if (OPENROUTER_API_KEY) {
    providers.push({
      name: "openrouter",
      call: () =>
        callOpenRouter(messages)
    });
  }

  if (GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      call: () =>
        callGemini(messages)
    });
  }

  for (const provider of providers) {
    try {
      const reply =
        await provider.call();

      logAI({
        provider: provider.name,
        success: true
      });

      return {
        reply,
        source: provider.name,
        model:
          provider.name === "groq"
            ? GROQ_MODEL
            : provider.name === "cerebras"
              ? CEREBRAS_MODEL
              : provider.name === "gemini"
                ? GEMINI_MODEL
                : OPENROUTER_MODEL
      };

    } catch (error) {

      logAI({
        provider: provider.name,
        success: false,
        error: error.message
      });

      console.error(
        `[TürkAI] ${provider.name} başarısız:`,
        error.message
      );
    }
  }

  return null;
}

// ============================================================
// BUILD AI MESSAGES
// ============================================================

function buildMessages(
  message,
  chatId = null
) {
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT
    }
  ];

  if (chatId) {
    const history =
      getChatMessages(
        chatId,
        20
      );

    for (const item of history) {

      if (
        item.role !== "user" &&
        item.role !== "assistant"
      ) {
        continue;
      }

      messages.push({
        role: item.role,
        content: item.content
      });
    }
  }

  messages.push({
    role: "user",
    content: cleanText(
      message,
      50000
    )
  });

  return messages;
}

// ============================================================
// GENERATE CHAT ANSWER
// ============================================================

async function generateChatAnswer({
  message,
  chatId = null,
  model = "fast"
}) {

  const local =
    localResponse(message);

  if (local) {
    return {
      reply: local,
      source: "local",
      model: "local"
    };
  }

  const messages =
    buildMessages(
      message,
      chatId
    );

  const ai =
    await callAI(messages);

  if (ai) {
    return ai;
  }

  return {
    reply:
      "Şu anda yapay zekâ servislerine ulaşılamıyor. Biraz sonra tekrar deneyebilirsin.",
    source: "fallback",
    model: "local-fallback"
  };
}

// ============================================================
// HEALTH
// ============================================================

app.get("/api/health", (req, res) => {

  res.json({
    success: true,

    status: "ok",

    app: APP_NAME,

    version: APP_VERSION,

    uptime:
      Math.floor(
        process.uptime()
      ),

    node:
      process.version,

    environment:
      NODE_ENV,

    serverId:
      SERVER_ID,

    timestamp:
      nowISO()
  });
});

// ============================================================
// STATUS
// ============================================================

app.get("/api/status", (req, res) => {

  const users =
    getUsers();

  const chats =
    getChats();

  const messages =
    getMessages();

  const knowledge =
    readJSON(
      DB.knowledge,
      []
    );

  const memories =
    readJSON(
      DB.memories,
      []
    );

  res.json({
    success: true,

    status:
      SERVER_STATE.shuttingDown
        ? "shutting_down"
        : SERVER_STATE.started
          ? "online"
          : "starting",

    app: APP_NAME,
    version: APP_VERSION,

    environment:
      NODE_ENV,

    node:
      process.version,

    port:
      PORT,

    users:
      users.length,

    chats:
      chats.length,

    messages:
      messages.length,

    knowledge:
      knowledge.length,

    memory:
      memories.length,

    socketClients:
      io.engine?.clientsCount || 0,

    uptime:
      Math.floor(
        process.uptime()
      ),

    timestamp:
      nowISO()
  });
});

// ============================================================
// PLANS
// ============================================================

app.get("/api/plans", (req, res) => {

  res.json({
    success: true,
    plans: PLANS
  });
});

// ============================================================
// ME
// ============================================================

app.get("/api/me", (req, res) => {

  const user =
    getRequestUser(req);

  res.json({
    success: true,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      active: user.active
    }
  });
});

// ============================================================
// AI STATUS
// ============================================================

app.get("/api/ai/status", (req, res) => {

  res.json({
    success: true,

    providers: {
      groq: Boolean(GROQ_API_KEY),
      cerebras: Boolean(CEREBRAS_API_KEY),
      openrouter: Boolean(
        OPENROUTER_API_KEY
      ),
      gemini: Boolean(
        GEMINI_API_KEY
      )
    },

    models: {
      groq: GROQ_MODEL,
      cerebras: CEREBRAS_MODEL,
      openrouter: OPENROUTER_MODEL,
      gemini: GEMINI_MODEL
    },

    fallback:
      true,

    localAI:
      true
  });
});

// ============================================================
// CHAT
// ============================================================

app.post("/api/chat", async (req, res) => {

  try {

    const user =
      getRequestUser(req);

    const message =
      cleanText(
        req.body?.message,
        50000
      );

    let chatId =
      cleanText(
        req.body?.chatId,
        200
      );

    const model =
      cleanText(
        req.body?.model ||
        "fast",
        100
      );

    if (!message) {

      return res.status(400).json({
        success: false,
        error: "Mesaj boş olamaz."
      });
    }

    let chat =
      chatId
        ? findChatById(chatId)
        : null;

    if (!chat) {

      chat =
        createChat({
          userId: user.id,
          title:
            message.slice(0, 60),
          model
        });

      chatId =
        chat.id;
    }

    addMessage(
      chatId,
      {
        role: "user",
        content: message,
        model,
        source: "chat"
      }
    );

    const answer =
      await generateChatAnswer({
        message,
        chatId,
        model
      });

    addMessage(
      chatId,
      {
        role: "assistant",
        content: answer.reply,
        model: answer.model,
        source: answer.source
      }
    );

    res.json({

      success: true,

      reply:
        answer.reply,

      response:
        answer.reply,

      message:
        answer.reply,

      text:
        answer.reply,

      chatId,

      source:
        answer.source,

      model:
        answer.model,

      timestamp:
        nowISO()
    });

  } catch (error) {

    logError(
      "chat",
      error
    );

    res.status(500).json({
      success: false,
      error:
        "Chat sistemi sırasında bir hata oluştu."
    });
  }
});

// ============================================================
// CHAT HISTORY
// ============================================================

app.get(
  "/api/chats/:id",
  (req, res) => {

    const chat =
      findChatById(
        req.params.id
      );

    if (!chat) {

      return res.status(404).json({
        success: false,
        error: "Sohbet bulunamadı."
      });
    }

    res.json({
      success: true,

      chat,

      messages:
        getChatMessages(
          chat.id,
          100
        )
    });
  }
);

// ============================================================
// MODELS
// ============================================================

app.get("/api/models", (req, res) => {

  res.json({
    success: true,

    models: [
      {
        id: "fast",
        name: "TürkAI Fast",
        provider: "automatic",
        description:
          "Hızlı otomatik model seçimi."
      },

      {
        id: "groq",
        name: "TürkAI Groq",
        provider: "groq",
        model: GROQ_MODEL,
        available:
          Boolean(GROQ_API_KEY)
      },

      {
        id: "cerebras",
        name: "TürkAI Cerebras",
        provider: "cerebras",
        model: CEREBRAS_MODEL,
        available:
          Boolean(CEREBRAS_API_KEY)
      },

      {
        id: "gemini",
        name: "TürkAI Gemini",
        provider: "gemini",
        model: GEMINI_MODEL,
        available:
          Boolean(GEMINI_API_KEY)
      }
    ]
  });
});

// ============================================================
// ROOT API
// ============================================================

app.get("/api", (req, res) => {

  res.json({
    success: true,

    name: APP_NAME,

    version: APP_VERSION,

    status:
      SERVER_STATE.started
        ? "online"
        : "starting",

    endpoints: {
      health:
        "GET /api/health",

      status:
        "GET /api/status",

      chat:
        "POST /api/chat",

      models:
        "GET /api/models",

      plans:
        "GET /api/plans",

      me:
        "GET /api/me",

      ai:
        "GET /api/ai/status"
    },

    timestamp:
      nowISO()
  });
});

// ============================================================
// PART 1 COMPLETE
// ============================================================

console.log(
  "[TürkAI] PART 1/3 yüklendi."
);
// ============================================================
// TÜRKAI SERVER 12.0
// PART 2 / 3
// USAGE + MEMORY + RESEARCH + FILE + PROJECT + ADMIN
// ============================================================

// ============================================================
// USAGE DATABASE
// ============================================================

function getUsage() {
  return readJSON(DB.usage, []);
}

function saveUsage(data) {
  return writeJSON(DB.usage, data);
}

function getTodayKey() {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getUserUsage(userId) {
  const usage = getUsage();
  const today = getTodayKey();

  let item = usage.find(
    x =>
      x.userId === userId &&
      x.date === today
  );

  if (!item) {
    item = {
      id: createId("usage"),
      userId,
      date: today,
      messages: 0,
      research: 0,
      images: 0,
      videos: 0,
      files: 0,
      updatedAt: nowISO()
    };

    usage.push(item);
    saveUsage(usage);
  }

  return item;
}

function updateUsage(userId, type, amount = 1) {
  const usage = getUsage();
  const today = getTodayKey();

  let item = usage.find(
    x =>
      x.userId === userId &&
      x.date === today
  );

  if (!item) {
    item = {
      id: createId("usage"),
      userId,
      date: today,
      messages: 0,
      research: 0,
      images: 0,
      videos: 0,
      files: 0,
      updatedAt: nowISO()
    };

    usage.push(item);
  }

  if (
    Object.prototype.hasOwnProperty.call(
      item,
      type
    )
  ) {
    item[type] += safeNumber(amount, 1);
  }

  item.updatedAt = nowISO();

  saveUsage(usage);

  return item;
}

function usageAvailable(user, type) {
  const plan = getPlan(user);
  const usage = getUserUsage(user.id);

  const current =
    safeNumber(usage[type], 0);

  const limit =
    safeNumber(plan[type], 0);

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(
      0,
      limit - current
    )
  };
}

// ============================================================
// USAGE API
// ============================================================

app.get("/api/usage", (req, res) => {
  const user = getRequestUser(req);
  const plan = getPlan(user);
  const usage = getUserUsage(user.id);

  res.json({
    success: true,

    date: getTodayKey(),

    plan: {
      id: user.plan,
      name: plan.name
    },

    usage,

    limits: {
      messages: plan.messages,
      research: plan.research,
      images: plan.images,
      videos: plan.videos,
      storageMB: plan.storageMB
    },

    remaining: {
      messages: Math.max(
        0,
        plan.messages - usage.messages
      ),

      research: Math.max(
        0,
        plan.research - usage.research
      ),

      images: Math.max(
        0,
        plan.images - usage.images
      ),

      videos: Math.max(
        0,
        plan.videos - usage.videos
      )
    }
  });
});

// ============================================================
// MEMORY DATABASE
// ============================================================

function getMemories() {
  return readJSON(DB.memories, []);
}

function saveMemories(data) {
  return writeJSON(DB.memories, data);
}

function addMemory(userId, content, type = "general") {
  const memories = getMemories();

  const text =
    cleanText(content, 2000);

  if (!text) {
    return null;
  }

  const existing =
    memories.find(
      memory =>
        memory.userId === userId &&
        normalizeText(memory.content) ===
          normalizeText(text)
    );

  if (existing) {
    existing.updatedAt = nowISO();
    saveMemories(memories);
    return existing;
  }

  const memory = {
    id: createId("mem"),
    userId,
    content: text,
    type,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  memories.push(memory);

  if (memories.length > 20000) {
    memories.splice(
      0,
      memories.length - 20000
    );
  }

  saveMemories(memories);

  return memory;
}

function searchMemories(userId, query) {
  const memories =
    getMemories().filter(
      memory =>
        memory.userId === userId
    );

  const normalized =
    normalizeText(query);

  if (!normalized) {
    return memories.slice(-20);
  }

  const words =
    normalized
      .split(/\s+/)
      .filter(Boolean);

  return memories
    .map(memory => {

      const content =
        normalizeText(
          memory.content
        );

      let score = 0;

      for (const word of words) {
        if (content.includes(word)) {
          score++;
        }
      }

      return {
        memory,
        score
      };
    })
    .filter(item => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 20)
    .map(item => item.memory);
}

// ============================================================
// MEMORY API
// ============================================================

app.get("/api/memory/search", (req, res) => {
  const user = getRequestUser(req);

  const query =
    cleanText(
      req.query.q ||
      req.query.query ||
      "",
      1000
    );

  res.json({
    success: true,

    memories:
      searchMemories(
        user.id,
        query
      )
  });
});

app.get("/api/memory", (req, res) => {
  const user = getRequestUser(req);

  const memories =
    getMemories().filter(
      memory =>
        memory.userId === user.id
    );

  res.json({
    success: true,
    memories
  });
});

app.post("/api/memory", (req, res) => {
  const user = getRequestUser(req);

  const content =
    cleanText(
      req.body?.content,
      2000
    );

  const type =
    cleanText(
      req.body?.type ||
      "general",
      100
    );

  if (!content) {
    return res.status(400).json({
      success: false,
      error: "Hafıza içeriği boş olamaz."
    });
  }

  const memory =
    addMemory(
      user.id,
      content,
      type
    );

  res.json({
    success: true,
    memory
  });
});

app.delete(
  "/api/memory/:id",
  (req, res) => {

    const user = getRequestUser(req);

    const memories = getMemories();

    const index =
      memories.findIndex(
        memory =>
          memory.id ===
            req.params.id &&
          memory.userId === user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Hafıza bulunamadı."
      });
    }

    const removed =
      memories.splice(
        index,
        1
      )[0];

    saveMemories(memories);

    res.json({
      success: true,
      memory: removed
    });
  }
);

// ============================================================
// KNOWLEDGE
// ============================================================

function getKnowledge() {
  return readJSON(
    DB.knowledge,
    []
  );
}

function saveKnowledge(data) {
  return writeJSON(
    DB.knowledge,
    data
  );
}

function findKnowledgeAnswer(query) {
  const knowledge =
    getKnowledge();

  const normalized =
    normalizeText(query);

  if (!normalized) {
    return null;
  }

  let best = null;
  let bestScore = 0;

  for (const item of knowledge) {

    const question =
      normalizeText(
        item.question || ""
      );

    const answer =
      cleanText(
        item.answer || "",
        10000
      );

    if (!question || !answer) {
      continue;
    }

    const words =
      normalized
        .split(/\s+/)
        .filter(Boolean);

    let score = 0;

    for (const word of words) {
      if (question.includes(word)) {
        score++;
      }
    }

    if (
      question === normalized
    ) {
      score += 100;
    }

    if (score > bestScore) {
      bestScore = score;

      best = {
        answer,
        score,
        id: item.id
      };
    }
  }

  if (
    best &&
    best.score >=
      Math.max(
        2,
        Math.floor(
          normalized.split(/\s+/).length /
            2
        )
      )
  ) {
    return best;
  }

  return null;
}

function saveKnowledgeAnswer(
  question,
  answer,
  source = "ai"
) {
  const knowledge =
    getKnowledge();

  const cleanQuestion =
    cleanText(
      question,
      2000
    );

  const cleanAnswer =
    cleanText(
      answer,
      10000
    );

  if (
    !cleanQuestion ||
    !cleanAnswer
  ) {
    return null;
  }

  const normalizedQuestion =
    normalizeText(
      cleanQuestion
    );

  const existing =
    knowledge.find(
      item =>
        normalizeText(
          item.question || ""
        ) === normalizedQuestion
    );

  if (existing) {
    existing.answer =
      cleanAnswer;

    existing.source =
      source;

    existing.updatedAt =
      nowISO();

    saveKnowledge(knowledge);

    return existing;
  }

  const item = {
    id: createId("know"),
    question: cleanQuestion,
    answer: cleanAnswer,
    source,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };

  knowledge.push(item);

  if (knowledge.length > 20000) {
    knowledge.splice(
      0,
      knowledge.length - 20000
    );
  }

  saveKnowledge(knowledge);

  return item;
}

// ============================================================
// RESEARCH DATABASE
// ============================================================

function getResearch() {
  return readJSON(
    DB.research,
    []
  );
}

function saveResearch(data) {
  return writeJSON(
    DB.research,
    data
  );
}

function saveResearchRecord(data = {}) {
  const research =
    getResearch();

  const record = {
    id: createId("research"),

    userId:
      data.userId ||
      "guest",

    query:
      cleanText(
        data.query,
        3000
      ),

    answer:
      cleanText(
        data.answer,
        20000
      ),

    source:
      data.source ||
      "web",

    createdAt:
      nowISO()
  };

  research.push(record);

  if (research.length > 10000) {
    research.splice(
      0,
      research.length - 10000
    );
  }

  saveResearch(research);

  return record;
}

// ============================================================
// RESEARCH ENGINE
// ============================================================

async function performResearch(
  query,
  user
) {
  const cleanQuery =
    cleanText(
      query,
      3000
    );

  if (!cleanQuery) {
    throw new Error(
      "Araştırma sorgusu boş."
    );
  }

  const usage =
    usageAvailable(
      user,
      "research"
    );

  if (!usage.allowed) {
    throw new Error(
      "Günlük araştırma limitine ulaştın."
    );
  }

  /*
   * Öncelik:
   * 1. Basit bilgi
   * 2. Knowledge
   * 3. AI
   *
   * Gerçek web araştırması için
   * sonraki katman kullanılabilir.
   */

  const known =
    findKnowledgeAnswer(
      cleanQuery
    );

  if (known) {

    updateUsage(
      user.id,
      "research",
      1
    );

    const record =
      saveResearchRecord({
        userId: user.id,
        query: cleanQuery,
        answer: known.answer,
        source: "knowledge"
      });

    return {
      answer: known.answer,
      source: "knowledge",
      recordId: record.id
    };
  }

  const messages = [
    {
      role: "system",
      content: `
Sen TürkAI araştırma asistanısın.

Kullanıcının sorusuna mümkün olduğunca
doğru, açık ve kaynak ihtiyacını belirterek
cevap ver.

Güncel olmayan bilgiyi güncelmiş gibi sunma.

Türkçe cevap ver.
`
    },

    {
      role: "user",
      content:
        cleanQuery
    }
  ];

  const result =
    await callAI(messages);

  if (!result) {
    throw new Error(
      "Araştırma için AI servisi kullanılamıyor."
    );
  }

  updateUsage(
    user.id,
    "research",
    1
  );

  saveKnowledgeAnswer(
    cleanQuery,
    result.reply,
    result.source
  );

  const record =
    saveResearchRecord({
      userId: user.id,
      query: cleanQuery,
      answer: result.reply,
      source: result.source
    });

  return {
    answer: result.reply,
    source: result.source,
    recordId: record.id
  };
}

// ============================================================
// RESEARCH API
// ============================================================

app.post(
  "/api/research",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const query =
        cleanText(
          req.body?.query ||
          req.body?.message ||
          "",
          3000
        );

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Araştırma sorgusu boş."
        });
      }

      const result =
        await performResearch(
          query,
          user
        );

      res.json({
        success: true,

        query,

        answer:
          result.answer,

        source:
          result.source,

        recordId:
          result.recordId,

        timestamp:
          nowISO()
      });

    } catch (error) {

      logError(
        "research",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "Araştırma başarısız."
      });
    }
  }
);

// ============================================================
// FILE DATABASE
// ============================================================

function getFiles() {
  return readJSON(
    DB.files,
    []
  );
}

function saveFiles(data) {
  return writeJSON(
    DB.files,
    data
  );
}

// ============================================================
// FILE UPLOAD
// ============================================================

app.post(
  "/api/upload",
  (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const filename =
        cleanText(
          req.body?.filename ||
          "dosya.txt",
          255
        );

      const content =
        req.body?.content;

      if (
        content === undefined ||
        content === null
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Dosya içeriği bulunamadı."
        });
      }

      const plan =
        getPlan(user);

      const maxBytes =
        plan.storageMB *
        1024 *
        1024;

      const buffer =
        Buffer.from(
          String(content),
          "utf8"
        );

      if (
        buffer.length >
        maxBytes
      ) {
        return res.status(413).json({
          success: false,
          error:
            `Dosya plan limitini aşıyor. Limit: ${plan.storageMB} MB`
        });
      }

      const extension =
        path.extname(
          filename
        );

      const safeBase =
        path.basename(
          filename,
          extension
        )
          .replace(
            /[^a-zA-Z0-9_\-ğüşöçıİĞÜŞÖÇ ]/g,
            "_"
          )
          .slice(0, 100) ||
        "dosya";

      const safeExtension =
        extension
          .replace(
            /[^a-zA-Z0-9.]/g,
            ""
          )
          .slice(0, 15);

      const generatedName =
        `${Date.now()}_${crypto.randomBytes(5).toString("hex")}_${safeBase}${safeExtension}`;

      const filePath =
        path.join(
          UPLOAD_DIR,
          generatedName
        );

      fs.writeFileSync(
        filePath,
        buffer
      );

      const files =
        getFiles();

      const fileRecord = {
        id: createId("file"),

        userId:
          user.id,

        originalName:
          filename,

        storedName:
          generatedName,

        size:
          buffer.length,

        type:
          req.body?.type ||
          "text/plain",

        path:
          filePath,

        createdAt:
          nowISO()
      };

      files.push(fileRecord);

      saveFiles(files);

      updateUsage(
        user.id,
        "files",
        1
      );

      res.json({
        success: true,

        file: {
          id:
            fileRecord.id,

          name:
            fileRecord.originalName,

          size:
            fileRecord.size,

          type:
            fileRecord.type,

          createdAt:
            fileRecord.createdAt
        }
      });

    } catch (error) {

      logError(
        "upload",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Dosya yüklenirken hata oluştu."
      });
    }
  }
);

// ============================================================
// FILE LIST
// ============================================================

app.get(
  "/api/files",
  (req, res) => {

    const user =
      getRequestUser(req);

    const files =
      getFiles().filter(
        file =>
          file.userId === user.id
      );

    res.json({
      success: true,
      files
    });
  }
);

// ============================================================
// FILE DELETE
// ============================================================

app.delete(
  "/api/files/:id",
  (req, res) => {

    const user =
      getRequestUser(req);

    const files =
      getFiles();

    const index =
      files.findIndex(
        file =>
          file.id ===
            req.params.id &&
          file.userId ===
            user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Dosya bulunamadı."
      });
    }

    const file =
      files[index];

    try {
      if (
        file.path &&
        fs.existsSync(file.path)
      ) {
        fs.unlinkSync(
          file.path
        );
      }
    } catch (error) {
      logError(
        "file-delete",
        error
      );
    }

    files.splice(
      index,
      1
    );

    saveFiles(files);

    res.json({
      success: true
    });
  }
);

// ============================================================
// PROJECT DATABASE
// ============================================================

function getProjects() {
  return readJSON(
    DB.projects,
    []
  );
}

function saveProjects(data) {
  return writeJSON(
    DB.projects,
    data
  );
}

function createProject(data = {}) {

  const projects =
    getProjects();

  const project = {

    id:
      createId("proj"),

    userId:
      data.userId ||
      "guest",

    name:
      cleanText(
        data.name ||
        "Yeni Proje",
        200
      ),

    description:
      cleanText(
        data.description ||
        "",
        2000
      ),

    language:
      cleanText(
        data.language ||
        "javascript",
        100
      ),

    code:
      cleanText(
        data.code ||
        "",
        100000
      ),

    createdAt:
      nowISO(),

    updatedAt:
      nowISO()
  };

  projects.push(project);

  saveProjects(projects);

  return project;
}

function findProject(id) {

  return getProjects().find(
    project =>
      project.id === id
  ) || null;
}

// ============================================================
// PROJECT API
// ============================================================

app.get(
  "/api/projects",
  (req, res) => {

    const user =
      getRequestUser(req);

    const projects =
      getProjects().filter(
        project =>
          project.userId ===
          user.id
      );

    res.json({
      success: true,
      projects
    });
  }
);

app.post(
  "/api/projects",
  (req, res) => {

    const user =
      getRequestUser(req);

    const project =
      createProject({
        userId:
          user.id,

        name:
          req.body?.name,

        description:
          req.body?.description,

        language:
          req.body?.language,

        code:
          req.body?.code
      });

    res.json({
      success: true,
      project
    });
  }
);

app.get(
  "/api/projects/:id",
  (req, res) => {

    const user =
      getRequestUser(req);

    const project =
      findProject(
        req.params.id
      );

    if (
      !project ||
      project.userId !== user.id
    ) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    res.json({
      success: true,
      project
    });
  }
);

app.put(
  "/api/projects/:id",
  (req, res) => {

    const user =
      getRequestUser(req);

    const projects =
      getProjects();

    const index =
      projects.findIndex(
        project =>
          project.id ===
            req.params.id &&
          project.userId ===
            user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    const project =
      projects[index];

    if (
      req.body?.name !== undefined
    ) {
      project.name =
        cleanText(
          req.body.name,
          200
        );
    }

    if (
      req.body?.description !==
      undefined
    ) {
      project.description =
        cleanText(
          req.body.description,
          2000
        );
    }

    if (
      req.body?.language !==
      undefined
    ) {
      project.language =
        cleanText(
          req.body.language,
          100
        );
    }

    if (
      req.body?.code !==
      undefined
    ) {
      project.code =
        cleanText(
          req.body.code,
          100000
        );
    }

    project.updatedAt =
      nowISO();

    projects[index] =
      project;

    saveProjects(projects);

    res.json({
      success: true,
      project
    });
  }
);

app.delete(
  "/api/projects/:id",
  (req, res) => {

    const user =
      getRequestUser(req);

    const projects =
      getProjects();

    const index =
      projects.findIndex(
        project =>
          project.id ===
            req.params.id &&
          project.userId ===
            user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Proje bulunamadı."
      });
    }

    projects.splice(
      index,
      1
    );

    saveProjects(projects);

    res.json({
      success: true
    });
  }
);

// ============================================================
// CODE ANALYZER
// ============================================================

app.post(
  "/api/code/analyze",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const code =
        cleanText(
          req.body?.code,
          100000
        );

      const language =
        cleanText(
          req.body?.language ||
          "javascript",
          100
        );

      if (!code) {
        return res.status(400).json({
          success: false,
          error: "Kod boş olamaz."
        });
      }

      const prompt = `
Aşağıdaki ${language} kodunu analiz et.

Şunları belirt:

1. Sözdizimi sorunları
2. Mantık sorunları
3. Güvenlik sorunları
4. Performans sorunları
5. Düzeltilmiş örnek

Kod:

${code}
`;

      const result =
        await generateChatAnswer({
          message: prompt,
          model: "fast"
        });

      res.json({
        success: true,

        language,

        analysis:
          result.reply,

        source:
          result.source,

        model:
          result.model
      });

    } catch (error) {

      logError(
        "code-analyze",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Kod analizi başarısız."
      });
    }
  }
);

// ============================================================
// ADMIN HELPERS
// ============================================================

function isAdmin(user) {

  if (!user) {
    return false;
  }

  if (
    user.role ===
    "admin"
  ) {
    return true;
  }

  if (
    user.plan ===
    "developer"
  ) {
    return true;
  }

  const adminEmail =
    process.env.TURKAI_ADMIN_EMAIL;

  if (
    adminEmail &&
    user.email &&
    user.email.toLowerCase() ===
      adminEmail.toLowerCase()
  ) {
    return true;
  }

  return false;
}

function requireAdmin(req, res, next) {

  const user =
    getRequestUser(req);

  if (!isAdmin(user)) {
    return res.status(403).json({
      success: false,
      error:
        "Bu işlem için yönetici yetkisi gerekiyor."
    });
  }

  req.adminUser =
    user;

  next();
}

// ============================================================
// ADMIN STATUS
// ============================================================

app.get(
  "/api/admin/status",
  requireAdmin,
  (req, res) => {

    const users =
      getUsers();

    const chats =
      getChats();

    const messages =
      getMessages();

    const files =
      getFiles();

    const projects =
      getProjects();

    const research =
      getResearch();

    const memories =
      getMemories();

    res.json({
      success: true,

      admin: {
        id:
          req.adminUser.id,

        name:
          req.adminUser.name,

        email:
          req.adminUser.email,

        role:
          req.adminUser.role
      },

      statistics: {
        users:
          users.length,

        chats:
          chats.length,

        messages:
          messages.length,

        files:
          files.length,

        projects:
          projects.length,

        research:
          research.length,

        memories:
          memories.length
      },

      server: {
        version:
          APP_VERSION,

        node:
          process.version,

        uptime:
          Math.floor(
            process.uptime()
          ),

        socketClients:
          io.engine?.clientsCount ||
          0
      }
    });
  }
);

// ============================================================
// ADMIN USERS
// ============================================================

app.get(
  "/api/admin/users",
  requireAdmin,
  (req, res) => {

    const users =
      getUsers().map(
        user => ({
          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          plan:
            user.plan,

          role:
            user.role,

          active:
            user.active,

          createdAt:
            user.createdAt
        })
      );

    res.json({
      success: true,
      users
    });
  }
);

// ============================================================
// ADMIN USER UPDATE
// ============================================================

app.patch(
  "/api/admin/users/:id",
  requireAdmin,
  (req, res) => {

    const users =
      getUsers();

    const index =
      users.findIndex(
        user =>
          user.id ===
          req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Kullanıcı bulunamadı."
      });
    }

    const user =
      users[index];

    if (
      req.body?.plan &&
      PLANS[req.body.plan]
    ) {
      user.plan =
        req.body.plan;
    }

    if (
      req.body?.role
    ) {
      user.role =
        cleanText(
          req.body.role,
          50
        );
    }

    if (
      req.body?.active !==
      undefined
    ) {
      user.active =
        Boolean(
          req.body.active
        );
    }

    user.updatedAt =
      nowISO();

    users[index] =
      user;

    saveUsers(users);

    res.json({
      success: true,
      user
    });
  }
);

// ============================================================
// ADMIN USER DELETE
// ============================================================

app.delete(
  "/api/admin/users/:id",
  requireAdmin,
  (req, res) => {

    const users =
      getUsers();

    const index =
      users.findIndex(
        user =>
          user.id ===
          req.params.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Kullanıcı bulunamadı."
      });
    }

    if (
      users[index].id ===
      req.adminUser.id
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Kendi admin hesabını silemezsin."
      });
    }

    users.splice(
      index,
      1
    );

    saveUsers(users);

    res.json({
      success: true
    });
  }
);

// ============================================================
// PRO ACTIVATION
// ============================================================

const TURKAI_PRO_CODE =
  process.env.TURKAI_PRO_CODE ||
  "";

app.post(
  "/api/pro/activate",
  (req, res) => {

    const user =
      getRequestUser(req);

    const code =
      cleanText(
        req.body?.code,
        200
      );

    if (!code) {
      return res.status(400).json({
        success: false,
        error:
          "Pro kodu girilmedi."
      });
    }

    if (
      !TURKAI_PRO_CODE ||
      code !== TURKAI_PRO_CODE
    ) {
      logSecurity(
        "invalid-pro-code",
        {
          userId:
            user.id
        }
      );

      return res.status(403).json({
        success: false,
        error:
          "Geçersiz Pro kodu."
      });
    }

    if (
      user.id ===
      "guest"
    ) {
      return res.status(401).json({
        success: false,
        error:
          "Pro aktivasyonu için giriş yapmalısın."
      });
    }

    const users =
      getUsers();

    const index =
      users.findIndex(
        item =>
          item.id ===
          user.id
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error:
          "Kullanıcı bulunamadı."
      });
    }

    users[index].plan =
      "pro";

    users[index].updatedAt =
      nowISO();

    saveUsers(users);

    logSecurity(
      "pro-activated",
      {
        userId:
          user.id
      }
    );

    res.json({
      success: true,

      message:
        "TürkAI Pro başarıyla etkinleştirildi.",

      plan:
        "pro"
    });
  }
);

// ============================================================
// SETTINGS
// ============================================================

function getSettings() {
  return readJSON(
    DB.settings,
    DEFAULTS.settings
  );
}

function saveSettings(data) {
  return writeJSON(
    DB.settings,
    data
  );
}

app.get(
  "/api/settings",
  (req, res) => {

    res.json({
      success: true,
      settings:
        getSettings()
    });
  }
);

app.patch(
  "/api/settings",
  requireAdmin,
  (req, res) => {

    const current =
      getSettings();

    const allowed = [
      "maintenance",
      "registration",
      "research",
      "memory",
      "uploads",
      "imageGeneration",
      "videoGeneration"
    ];

    for (const key of allowed) {

      if (
        req.body?.[key] !==
        undefined
      ) {
        current[key] =
          Boolean(
            req.body[key]
          );
      }
    }

    saveSettings(current);

    res.json({
      success: true,
      settings:
        current
    });
  }
);

// ============================================================
// NOTIFICATIONS
// ============================================================

function getNotifications() {
  return readJSON(
    DB.notifications,
    []
  );
}

function saveNotifications(data) {
  return writeJSON(
    DB.notifications,
    data
  );
}

function createNotification(data = {}) {

  const notifications =
    getNotifications();

  const notification = {

    id:
      createId("notif"),

    userId:
      data.userId ||
      "all",

    title:
      cleanText(
        data.title ||
        "TürkAI",
        200
      ),

    message:
      cleanText(
        data.message ||
        "",
        3000
      ),

    type:
      data.type ||
      "info",

    read:
      false,

    createdAt:
      nowISO()
  };

  notifications.push(
    notification
  );

  saveNotifications(
    notifications
  );

  return notification;
}

app.get(
  "/api/notifications",
  (req, res) => {

    const user =
      getRequestUser(req);

    const notifications =
      getNotifications()
        .filter(
          item =>
            item.userId ===
              "all" ||
            item.userId ===
              user.id
        )
        .slice(-100)
        .reverse();

    res.json({
      success: true,
      notifications
    });
  }
);

app.post(
  "/api/notifications/:id/read",
  (req, res) => {

    const user =
      getRequestUser(req);

    const notifications =
      getNotifications();

    const index =
      notifications.findIndex(
        item =>
          item.id ===
            req.params.id &&
          (
            item.userId ===
              "all" ||
            item.userId ===
              user.id
          )
      );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error:
          "Bildirim bulunamadı."
      });
    }

    notifications[index].read =
      true;

    notifications[index].readAt =
      nowISO();

    saveNotifications(
      notifications
    );

    res.json({
      success: true
    });
  }
);

// ============================================================
// AUDIT LOG
// ============================================================

function getAuditLogs() {
  return readJSON(
    DB.audit,
    []
  );
}

function saveAuditLogs(data) {
  return writeJSON(
    DB.audit,
    data
  );
}

function addAuditLog(
  action,
  userId,
  data = {}
) {

  const logs =
    getAuditLogs();

  logs.push({
    id:
      createId("audit"),

    action,

    userId:
      userId ||
      "system",

    data,

    timestamp:
      nowISO()
  });

  if (logs.length > 10000) {
    logs.splice(
      0,
      logs.length - 10000
    );
  }

  saveAuditLogs(logs);
}

// ============================================================
// SECURITY STATUS
// ============================================================

function getSecurityEvents() {
  return readJSON(
    DB.security,
    []
  );
}

app.get(
  "/api/security/status",
  requireAdmin,
  (req, res) => {

    const events =
      getSecurityEvents();

    res.json({
      success: true,

      status:
        "active",

      events:
        events.length,

      recent:
        events.slice(-50).reverse()
    });
  }
);

// ============================================================
// IMAGE GENERATION QUEUE
// ============================================================

const IMAGE_JOBS = new Map();

app.post(
  "/api/generate/image",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const availability =
        usageAvailable(
          user,
          "images"
        );

      if (
        !availability.allowed
      ) {
        return res.status(429).json({
          success: false,
          error:
            "Günlük görsel üretim limitine ulaştın."
        });
      }

      const prompt =
        cleanText(
          req.body?.prompt,
          5000
        );

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error:
            "Görsel açıklaması boş olamaz."
        });
      }

      const job = {
        id:
          createId("img"),

        userId:
          user.id,

        prompt,

        status:
          "queued",

        createdAt:
          nowISO()
      };

      IMAGE_JOBS.set(
        job.id,
        job
      );

      updateUsage(
        user.id,
        "images",
        1
      );

      /*
       * Burada gerçek image provider
       * bağlanabilir.
       *
       * Şimdilik güvenli queue sistemi.
       */

      setTimeout(() => {

        const current =
          IMAGE_JOBS.get(
            job.id
          );

        if (!current) return;

        current.status =
          "completed";

        current.completedAt =
          nowISO();

        IMAGE_JOBS.set(
          job.id,
          current
        );

      }, 1000);

      res.json({
        success: true,

        job: {
          id:
            job.id,

          status:
            job.status,

          prompt:
            job.prompt
        }
      });

    } catch (error) {

      logError(
        "image-generation",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Görsel üretim isteği oluşturulamadı."
      });
    }
  }
);

// ============================================================
// VIDEO GENERATION QUEUE
// ============================================================

const VIDEO_JOBS = new Map();

app.post(
  "/api/generate/video",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const availability =
        usageAvailable(
          user,
          "videos"
        );

      if (
        !availability.allowed
      ) {
        return res.status(429).json({
          success: false,
          error:
            "Günlük video üretim limitine ulaştın."
        });
      }

      const prompt =
        cleanText(
          req.body?.prompt,
          5000
        );

      if (!prompt) {
        return res.status(400).json({
          success: false,
          error:
            "Video açıklaması boş olamaz."
        });
      }

      const job = {
        id:
          createId("video"),

        userId:
          user.id,

        prompt,

        status:
          "queued",

        createdAt:
          nowISO()
      };

      VIDEO_JOBS.set(
        job.id,
        job
      );

      updateUsage(
        user.id,
        "videos",
        1
      );

      setTimeout(() => {

        const current =
          VIDEO_JOBS.get(
            job.id
          );

        if (!current) return;

        current.status =
          "completed";

        current.completedAt =
          nowISO();

        VIDEO_JOBS.set(
          job.id,
          current
        );

      }, 1500);

      res.json({
        success: true,

        job: {
          id:
            job.id,

          status:
            job.status,

          prompt:
            job.prompt
        }
      });

    } catch (error) {

      logError(
        "video-generation",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Video üretim isteği oluşturulamadı."
      });
    }
  }
);

// ============================================================
// GENERATION JOBS
// ============================================================

app.get(
  "/api/generate/jobs",
  (req, res) => {

    const user =
      getRequestUser(req);

    const images =
      [...IMAGE_JOBS.values()]
        .filter(
          job =>
            job.userId ===
            user.id
        );

    const videos =
      [...VIDEO_JOBS.values()]
        .filter(
          job =>
            job.userId ===
            user.id
        );

    res.json({
      success: true,

      images,
      videos
    });
  }
);

// ============================================================
// API DOCS
// ============================================================

app.get(
  "/api/docs",
  (req, res) => {

    res.json({
      success: true,

      name:
        APP_NAME,

      version:
        APP_VERSION,

      authentication:
        "Bearer token veya x-session-token",

      endpoints: [
        "GET /api",
        "GET /api/health",
        "GET /api/status",
        "GET /api/me",
        "GET /api/plans",
        "GET /api/models",
        "GET /api/ai/status",
        "POST /api/chat",
        "GET /api/chats/:id",
        "GET /api/usage",
        "GET /api/memory",
        "GET /api/memory/search",
        "POST /api/memory",
        "DELETE /api/memory/:id",
        "POST /api/research",
        "POST /api/upload",
        "GET /api/files",
        "DELETE /api/files/:id",
        "GET /api/projects",
        "POST /api/projects",
        "GET /api/projects/:id",
        "PUT /api/projects/:id",
        "DELETE /api/projects/:id",
        "POST /api/code/analyze",
        "POST /api/pro/activate",
        "GET /api/settings",
        "PATCH /api/settings",
        "GET /api/notifications",
        "POST /api/notifications/:id/read",
        "GET /api/security/status",
        "GET /api/admin/status",
        "GET /api/admin/users",
        "PATCH /api/admin/users/:id",
        "DELETE /api/admin/users/:id",
        "POST /api/generate/image",
        "POST /api/generate/video",
        "GET /api/generate/jobs"
      ]
    });
  }
);

// ============================================================
// REQUEST ID
// ============================================================

app.use((req, res, next) => {

  req.requestId =
    createId("req");

  res.setHeader(
    "X-Request-ID",
    req.requestId
  );

  next();
});

// ============================================================
// CHAT MODEL ROUTE
// ============================================================

app.post(
  "/api/chat/model",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const message =
        cleanText(
          req.body?.message,
          50000
        );

      const model =
        cleanText(
          req.body?.model ||
          "fast",
          100
        );

      if (!message) {
        return res.status(400).json({
          success: false,
          error:
            "Mesaj boş olamaz."
        });
      }

      const result =
        await generateChatAnswer({
          message,
          model
        });

      updateUsage(
        user.id,
        "messages",
        1
      );

      res.json({
        success: true,

        reply:
          result.reply,

        response:
          result.reply,

        message:
          result.reply,

        text:
          result.reply,

        model:
          result.model,

        source:
          result.source
      });

    } catch (error) {

      logError(
        "chat-model",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Model yanıtı oluşturulamadı."
      });
    }
  }
);

// ============================================================
// SEARCH
// ============================================================

app.get(
  "/api/search",
  async (req, res) => {

    try {

      const user =
        getRequestUser(req);

      const query =
        cleanText(
          req.query.q ||
          req.query.query ||
          "",
          3000
        );

      if (!query) {
        return res.status(400).json({
          success: false,
          error:
            "Arama sorgusu boş."
        });
      }

      const knowledge =
        getKnowledge();

      const normalized =
        normalizeText(query);

      const results =
        knowledge
          .map(item => {

            const question =
              normalizeText(
                item.question || ""
              );

            const answer =
              cleanText(
                item.answer || "",
                5000
              );

            let score = 0;

            if (
              question.includes(
                normalized
              )
            ) {
              score += 10;
            }

            for (
              const word of normalized.split(/\s+/)
            ) {
              if (
                word &&
                question.includes(word)
              ) {
                score++;
              }
            }

            return {
              id:
                item.id,

              question:
                item.question,

              answer,

              score
            };
          })
          .filter(
            item =>
              item.score > 0
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
          )
          .slice(0, 20);

      res.json({
        success: true,

        query,

        results
      });

    } catch (error) {

      logError(
        "search",
        error
      );

      res.status(500).json({
        success: false,
        error:
          "Arama sırasında hata oluştu."
      });
    }
  }
);

// ============================================================
// AUTO MEMORY DETECTION
// ============================================================

function detectMemoryCandidate(
  message
) {

  const text =
    cleanText(
      message,
      3000
    );

  const normalized =
    normalizeText(text);

  const patterns = [
    "bunu hatirla",
    "bunu hatirlamani istiyorum",
    "hatirla ki",
    "aklinda tut",
    "bunu unutma"
  ];

  for (const pattern of patterns) {

    if (
      normalized.includes(pattern)
    ) {

      const index =
        normalized.indexOf(
          pattern
        );

      const originalIndex =
        Math.min(
          text.length,
          index +
            pattern.length
        );

      const content =
        text
          .slice(originalIndex)
          .replace(
            /^[\s:,-]+/,
            ""
          )
          .trim();

      if (content) {
        return content;
      }
    }
  }

  return null;
}

// ============================================================
// CHAT MEMORY HELPER
// ============================================================

function processMemoryCandidate(
  userId,
  message
) {

  if (
    userId === "guest"
  ) {
    return null;
  }

  const candidate =
    detectMemoryCandidate(
      message
    );

  if (!candidate) {
    return null;
  }

  return addMemory(
    userId,
    candidate,
    "user-request"
  );
}

// ============================================================
// PERIODIC BACKUP
// ============================================================

function backupDatabase() {

  try {

    const backupDir =
      path.join(
        DATA_DIR,
        "backups"
      );

    if (
      !fs.existsSync(
        backupDir
      )
    ) {
      fs.mkdirSync(
        backupDir,
        {
          recursive: true
        }
      );
    }

    const backupFile =
      path.join(
        backupDir,
        `backup_${Date.now()}.json`
      );

    const database = {};

    for (
      const [name, file]
      of Object.entries(DB)
    ) {
      database[name] =
        readJSON(
          file,
          DEFAULTS[name]
        );
    }

    writeJSON(
      backupFile,
      database
    );

    const files =
      fs.readdirSync(
        backupDir
      )
        .filter(
          file =>
            file.startsWith(
              "backup_"
            )
        )
        .sort();

    if (files.length > 10) {

      const remove =
        files.slice(
          0,
          files.length - 10
        );

      for (
        const file
        of remove
      ) {
        try {
          fs.unlinkSync(
            path.join(
              backupDir,
              file
            )
          );
        } catch {}
      }
    }

  } catch (error) {

    logError(
      "backup",
      error
    );
  }
}

// ============================================================
// TEMP CLEANUP
// ============================================================

function cleanupTemp() {

  try {

    const now =
      Date.now();

    const maxAge =
      24 * 60 * 60 * 1000;

    for (
      const directory
      of [TEMP_DIR, CACHE_DIR]
    ) {

      if (
        !fs.existsSync(
          directory
        )
      ) {
        continue;
      }

      const files =
        fs.readdirSync(
          directory
        );

      for (
        const file
        of files
      ) {

        const fullPath =
          path.join(
            directory,
            file
          );

        try {

          const stat =
            fs.statSync(
              fullPath
            );

          if (
            now -
              stat.mtimeMs >
            maxAge
          ) {

            if (
              stat.isDirectory()
            ) {
              fs.rmSync(
                fullPath,
                {
                  recursive: true,
                  force: true
                }
              );
            } else {
              fs.unlinkSync(
                fullPath
              );
            }
          }

        } catch {}
      }
    }

  } catch (error) {

    logError(
      "cleanup",
      error
    );
  }
}

// ============================================================
// SESSION CLEANUP
// ============================================================

function cleanupSessions() {

  try {

    const sessions =
      getSessions();

    const now =
      Date.now();

    const maxAge =
      30 *
      24 *
      60 *
      60 *
      1000;

    const filtered =
      sessions.filter(
        session => {

          const date =
            new Date(
              session.lastUsedAt ||
              session.createdAt
            ).getTime();

          return (
            Number.isFinite(date) &&
            now - date <
              maxAge
          );
        }
      );

    saveSessions(
      filtered
    );

  } catch (error) {

    logError(
      "session-cleanup",
      error
    );
  }
}

// ============================================================
// PERIODIC TASKS
// ============================================================

const BACKUP_INTERVAL =
  setInterval(
    backupDatabase,
    6 * 60 * 60 * 1000
  );

const CLEANUP_INTERVAL =
  setInterval(
    cleanupTemp,
    60 * 60 * 1000
  );

const SESSION_INTERVAL =
  setInterval(
    cleanupSessions,
    60 * 60 * 1000
  );

if (
  typeof BACKUP_INTERVAL.unref ===
  "function"
) {
  BACKUP_INTERVAL.unref();
}

if (
  typeof CLEANUP_INTERVAL.unref ===
  "function"
) {
  CLEANUP_INTERVAL.unref();
}

if (
  typeof SESSION_INTERVAL.unref ===
  "function"
) {
  SESSION_INTERVAL.unref();
}

// ============================================================
// PART 2 COMPLETE
// ============================================================

console.log(
  "[TürkAI] PART 2/3 yüklendi."
);
// ============================================================
// TÜRKAI SERVER 12.0
// PART 3 / 3
// SOCKET.IO + FINAL API + STATIC + STARTUP + SHUTDOWN
// ============================================================

// ============================================================
// SOCKET.IO REALTIME
// ============================================================

io.on("connection", (socket) => {

  logInfo(
    "socket",
    `Yeni Socket.IO bağlantısı: ${socket.id}`
  );

  socket.emit("turkai:ready", {
    success: true,

    app:
      APP_NAME,

    version:
      APP_VERSION,

    socketId:
      socket.id,

    timestamp:
      nowISO()
  });

  socket.on(
    "turkai:ping",
    (payload = {}) => {

      socket.emit(
        "turkai:pong",
        {
          success: true,

          received:
            payload,

          timestamp:
            nowISO()
        }
      );
    }
  );

  socket.on(
    "chat:join",
    (chatId) => {

      const id =
        cleanText(
          chatId,
          200
        );

      if (!id) {
        return;
      }

      socket.join(
        `chat:${id}`
      );

      socket.emit(
        "chat:joined",
        {
          chatId: id
        }
      );
    }
  );

  socket.on(
    "chat:leave",
    (chatId) => {

      const id =
        cleanText(
          chatId,
          200
        );

      if (!id) {
        return;
      }

      socket.leave(
        `chat:${id}`
      );

      socket.emit(
        "chat:left",
        {
          chatId: id
        }
      );
    }
  );

  socket.on(
    "chat:typing",
    (payload = {}) => {

      const chatId =
        cleanText(
          payload.chatId,
          200
        );

      if (!chatId) {
        return;
      }

      socket.to(
        `chat:${chatId}`
      ).emit(
        "chat:typing",
        {
          chatId,

          typing:
            Boolean(
              payload.typing
            ),

          socketId:
            socket.id
        }
      );
    }
  );

  socket.on(
    "disconnect",
    (reason) => {

      logInfo(
        "socket",
        `Socket ayrıldı: ${socket.id} (${reason})`
      );
    }
  );
});

// ============================================================
// SOCKET STATUS
// ============================================================

app.get(
  "/api/socket/status",
  (req, res) => {

    res.json({
      success: true,

      status:
        "online",

      connectedClients:
        io.engine?.clientsCount ||
        0,

      timestamp:
        nowISO()
    });
  }
);

// ============================================================
// SERVER INFO
// ============================================================

app.get(
  "/api/server/info",
  (req, res) => {

    const users =
      getUsers();

    const chats =
      getChats();

    const messages =
      getMessages();

    const files =
      getFiles();

    const projects =
      getProjects();

    const memories =
      getMemories();

    const research =
      getResearch();

    res.json({
      success: true,

      application: {
        name:
          APP_NAME,

        version:
          APP_VERSION,

        description:
          APP_DESCRIPTION
      },

      runtime: {
        node:
          process.version,

        platform:
          process.platform,

        architecture:
          process.arch,

        environment:
          NODE_ENV,

        pid:
          process.pid,

        uptime:
          Math.floor(
            process.uptime()
          )
      },

      statistics: {
        users:
          users.length,

        chats:
          chats.length,

        messages:
          messages.length,

        files:
          files.length,

        projects:
          projects.length,

        memories:
          memories.length,

        research:
          research.length
      },

      realtime: {
        socketIO:
          true,

        clients:
          io.engine?.clientsCount ||
          0
      },

      timestamp:
        nowISO()
    });
  }
);

// ============================================================
// ROOT API
// ============================================================

app.get(
  "/api",
  (req, res) => {

    res.json({
      success: true,

      name:
        APP_NAME,

      version:
        APP_VERSION,

      status:
        "online",

      message:
        "TürkAI backend çalışıyor.",

      endpoints: {
        health:
          "/api/health",

        status:
          "/api/status",

        chat:
          "/api/chat",

        research:
          "/api/research",

        upload:
          "/api/upload",

        memory:
          "/api/memory",

        projects:
          "/api/projects",

        models:
          "/api/models",

        usage:
          "/api/usage",

        docs:
          "/api/docs"
      },

      timestamp:
        nowISO()
    });
  }
);

// ============================================================
// OPTIONAL PUBLIC DIRECTORY
// ============================================================
//
// ÖNEMLİ:
// Burada yeni PUBLIC_DIR değişkeni oluşturmuyoruz.
// Part 1'de tanımlandıysa onu kullanıyoruz.
// Eğer yoksa process.cwd() üzerinden güvenli şekilde
// klasörü oluşturuyoruz.
//

const publicDirectory =
  typeof PUBLIC_DIR !== "undefined"
    ? PUBLIC_DIR
    : path.join(
        process.cwd(),
        "public"
      );

try {

  if (
    !fs.existsSync(
      publicDirectory
    )
  ) {
    fs.mkdirSync(
      publicDirectory,
      {
        recursive: true
      }
    );
  }

} catch (error) {

  logError(
    "public-directory",
    error
  );
}

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  express.static(
    publicDirectory,
    {
      index: false,

      maxAge:
        IS_PRODUCTION
          ? "1h"
          : 0
    }
  )
);

// ============================================================
// MAIN PAGE
// ============================================================

app.get(
  "/",
  (req, res) => {

    const indexPath =
      path.join(
        publicDirectory,
        "index.html"
      );

    if (
      fs.existsSync(indexPath)
    ) {

      return res.sendFile(
        indexPath
      );
    }

    res.status(200).send(`
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>TürkAI</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#090b10;
  color:#f5f7fb;
  font-family:Arial,Helvetica,sans-serif;
}

.card{
  width:min(680px,92%);
  padding:40px;
  border:1px solid rgba(255,255,255,.1);
  border-radius:24px;
  background:rgba(255,255,255,.04);
  box-shadow:0 20px 80px rgba(0,0,0,.35);
}

h1{
  margin:0 0 12px;
  font-size:42px;
}

p{
  color:#aeb5c3;
  line-height:1.6;
}

.status{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 13px;
  border-radius:999px;
  background:rgba(40,200,150,.1);
  color:#53dfad;
  font-size:14px;
}

.dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#53dfad;
}

.links{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:24px;
}

a{
  text-decoration:none;
  color:#fff;
  padding:11px 15px;
  border-radius:12px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.08);
}

a:hover{
  background:rgba(255,255,255,.12);
}
</style>
</head>

<body>

<div class="card">

  <div class="status">
    <span class="dot"></span>
    TürkAI Backend Online
  </div>

  <h1>TürkAI</h1>

  <p>
    Yapay zekâ, araştırma, hafıza,
    dosya, proje ve gerçek zamanlı
    Socket.IO altyapısı hazır.
  </p>

  <div class="links">
    <a href="/api">API</a>
    <a href="/api/health">Health</a>
    <a href="/api/status">Status</a>
    <a href="/api/docs">API Docs</a>
  </div>

</div>

</body>
</html>
`);
  }
);

// ============================================================
// API 404
// ============================================================

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      success: false,

      error:
        "API endpoint bulunamadı.",

      method:
        req.method,

      path:
        req.originalUrl,

      requestId:
        req.requestId ||
        null,

      timestamp:
        nowISO()
    });
  }
);

// ============================================================
// GLOBAL 404
// ============================================================

app.use(
  (req, res) => {

    if (
      req.accepts("html")
    ) {

      return res.status(404).send(`
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 - TürkAI</title>

<style>
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:#090b10;
  color:#fff;
  font-family:Arial,sans-serif;
}

.box{
  text-align:center;
  padding:35px;
}

.code{
  font-size:82px;
  font-weight:800;
  letter-spacing:-4px;
}

p{
  color:#9ea6b5;
}

a{
  display:inline-block;
  margin-top:15px;
  padding:11px 17px;
  color:#fff;
  background:#171b24;
  border:1px solid #292f3b;
  border-radius:12px;
  text-decoration:none;
}
</style>

</head>

<body>

<div class="box">

  <div class="code">404</div>

  <h2>Sayfa bulunamadı</h2>

  <p>
    İstediğin TürkAI adresi mevcut değil.
  </p>

  <a href="/">
    Ana Sayfa
  </a>

</div>

</body>
</html>
`);
    }

    res.status(404).json({
      success: false,
      error:
        "Sayfa bulunamadı.",
      path:
        req.originalUrl,
      requestId:
        req.requestId ||
        null
    });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {

    logError(
      "express",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    const status =
      Number(
        error.status ||
        error.statusCode ||
        500
      );

    res.status(
      status >= 400 &&
      status < 600
        ? status
        : 500
    ).json({
      success: false,

      error:
        IS_PRODUCTION
          ? "Sunucu hatası."
          : (
              error.message ||
              "Sunucu hatası."
            ),

      requestId:
        req.requestId ||
        null,

      timestamp:
        nowISO()
    });
  }
);

// ============================================================
// FINAL SERVER STATE
// ============================================================

SERVER_STATE.ready =
  false;

SERVER_STATE.starting =
  false;

SERVER_STATE.stopping =
  false;

SERVER_STATE.startedAt =
  null;

SERVER_STATE.server =
  null;

// ============================================================
// SERVER INSTANCE
// ============================================================
//
// DİKKAT:
// Bu dosyada SERVER_INSTANCE sadece burada
// tanımlanıyor.
//

let SERVER_INSTANCE = null;

// ============================================================
// SHUTDOWN STATE
// ============================================================
//
// DİKKAT:
// Bu dosyada shuttingDown sadece burada
// tanımlanıyor.
//

let shuttingDown = false;

// ============================================================
// START SERVER
// ============================================================

function startServer() {

  if (
    SERVER_INSTANCE
  ) {
    return SERVER_INSTANCE;
  }

  if (
    SERVER_STATE.starting
  ) {
    return null;
  }

  SERVER_STATE.starting =
    true;

  SERVER_STATE.stopping =
    false;

  try {

    SERVER_INSTANCE =
      httpServer.listen(
        PORT,
        HOST,
        () => {

          SERVER_STATE.starting =
            false;

          SERVER_STATE.ready =
            true;

          SERVER_STATE.startedAt =
            nowISO();

          SERVER_STATE.server =
            SERVER_INSTANCE;

          console.log("");
          console.log(
            "===================================================="
          );
          console.log(
            "              TÜRKAI ULTRA SERVER"
          );
          console.log(
            "===================================================="
          );

          console.log(
            `Durum        : ONLINE`
          );

          console.log(
            `Uygulama     : ${APP_NAME}`
          );

          console.log(
            `Sürüm        : ${APP_VERSION}`
          );

          console.log(
            `Node         : ${process.version}`
          );

          console.log(
            `Platform     : ${process.platform}`
          );

          console.log(
            `Ortam        : ${NODE_ENV}`
          );

          console.log(
            `Host         : ${HOST}`
          );

          console.log(
            `Port         : ${PORT}`
          );

          console.log(
            `Kullanıcı    : ${getUsers().length}`
          );

          console.log(
            `Sohbet       : ${getChats().length}`
          );

          console.log(
            `Mesaj        : ${getMessages().length}`
          );

          console.log(
            `Knowledge    : ${getKnowledge().length}`
          );

          console.log(
            `Memory       : ${getMemories().length}`
          );

          console.log(
            `Dosya        : ${getFiles().length}`
          );

          console.log(
            `Proje        : ${getProjects().length}`
          );

          console.log(
            `Araştırma    : ${getResearch().length}`
          );

          console.log(
            `Socket       : ${io.engine?.clientsCount || 0}`
          );

          console.log(
            "===================================================="
          );

          console.log(
            "🔥🔥🔥 TÜRKAI SERVER BAŞLATILDI 🔥🔥🔥"
          );

          console.log(
            `🌐 Local: http://localhost:${PORT}`
          );

          console.log(
            `🌐 Host : ${HOST}:${PORT}`
          );

          console.log(
            "⚡ Chat sistemi hazır."
          );

          console.log(
            "⚡ Research sistemi hazır."
          );

          console.log(
            "⚡ Memory sistemi hazır."
          );

          console.log(
            "⚡ File sistemi hazır."
          );

          console.log(
            "⚡ Coding sistemi hazır."
          );

          console.log(
            "⚡ Admin sistemi hazır."
          );

          console.log(
            "⚡ Socket.IO hazır."
          );

          console.log(
            "⚡ Security sistemi hazır."
          );

          console.log(
            "===================================================="
          );

        }
      );

    SERVER_INSTANCE.on(
      "error",
      (error) => {

        SERVER_STATE.starting =
          false;

        SERVER_STATE.ready =
          false;

        logError(
          "http-server",
          error
        );

        if (
          error.code ===
          "EADDRINUSE"
        ) {
          console.error(
            `[TürkAI] Port ${PORT} zaten kullanımda.`
          );
        }
      }
    );

    return SERVER_INSTANCE;

  } catch (error) {

    SERVER_STATE.starting =
      false;

    SERVER_STATE.ready =
      false;

    SERVER_INSTANCE =
      null;

    logError(
      "start-server",
      error
    );

    throw error;
  }
}

// ============================================================
// SHUTDOWN
// ============================================================

async function shutdown(
  signal = "UNKNOWN"
) {

  if (
    shuttingDown
  ) {
    return;
  }

  shuttingDown =
    true;

  SERVER_STATE.stopping =
    true;

  SERVER_STATE.ready =
    false;

  console.log(
    `[TürkAI] ${signal} alındı. Sunucu kapatılıyor...`
  );

  try {

    if (
      SERVER_INSTANCE
    ) {

      await new Promise(
        (resolve) => {

          const timeout =
            setTimeout(
              resolve,
              10000
            );

          SERVER_INSTANCE.close(
            () => {

              clearTimeout(
                timeout
              );

              resolve();
            }
          );
        }
      );
    }

  } catch (error) {

    logError(
      "shutdown",
      error
    );

  } finally {

    SERVER_INSTANCE =
      null;

    SERVER_STATE.server =
      null;

    SERVER_STATE.stopping =
      false;

    SERVER_STATE.starting =
      false;

    console.log(
      "[TürkAI] Sunucu kapatıldı."
    );
  }
}

// ============================================================
// PROCESS SIGNALS
// ============================================================

process.once(
  "SIGINT",
  () => {
    shutdown("SIGINT")
      .finally(() => {
        process.exit(0);
      });
  }
);

process.once(
  "SIGTERM",
  () => {
    shutdown("SIGTERM")
      .finally(() => {
        process.exit(0);
      });
  }
);

// ============================================================
// UNCAUGHT EXCEPTION
// ============================================================

process.on(
  "uncaughtException",
  (error) => {

    logError(
      "uncaughtException",
      error
    );

    console.error(
      "[TürkAI][HATA] Yakalanmamış exception."
    );

    console.error(
      error
    );

    /*
     * Render/production ortamında
     * bozuk state ile devam etmek yerine
     * kontrollü kapanış.
     */

    if (
      !shuttingDown
    ) {

      shutdown(
        "uncaughtException"
      ).finally(() => {

        process.exit(1);

      });
    }
  }
);

// ============================================================
// UNHANDLED REJECTION
// ============================================================

process.on(
  "unhandledRejection",
  (reason) => {

    logError(
      "unhandledRejection",
      reason
    );

    console.error(
      "[TürkAI][HATA] Yakalanmamış Promise rejection."
    );

    console.error(
      reason
    );
  }
);

// ============================================================
// FINAL READY LOG
// ============================================================

console.log(
  "[TürkAI] PART 3/3 yüklendi."
);

console.log(
  "[TürkAI] Ultra backend feature set hazır."
);

console.log(
  "[TürkAI] Security layer aktif."
);

console.log(
  "[TürkAI] Socket.IO realtime layer aktif."
);

console.log(
  "[TürkAI] Database compatibility layer aktif."
);

console.log(
  "[TürkAI] API layer aktif."
);

console.log(
  "[TürkAI] Admin control center aktif."
);

console.log(
  "[TürkAI] Research layer aktif."
);

console.log(
  "[TürkAI] File/project layer aktif."
);

console.log(
  "[TürkAI] Authentication layer aktif."
);

console.log(
  "[TürkAI] Memory layer aktif."
);

console.log(
  "[TürkAI] Sistem başlatılmaya hazır."
);

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  app,
  httpServer,
  io,
  startServer,
  shutdown,

  getRequestUser,
  getPlan,
  getUserUsage,

  addMemory,
  searchMemories,

  findKnowledgeAnswer,
  saveKnowledgeAnswer,

  getProjects,
  getFiles,
  getResearch
};

// ============================================================
// ONLY SERVER START POINT
// ============================================================

if (
  require.main === module
) {
  startServer();
}
