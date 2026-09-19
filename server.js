"use strict";

/*
============================================================
 TÜRKAI — SERVER.JS
 PARÇA 1 / 3
 Core Engine + AI + Users + Chat + Memory + Research
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

let SocketIOServer = null;

try {
    SocketIOServer = require("socket.io").Server;
} catch (error) {
    console.warn("[TürkAI] Socket.IO bulunamadı. 3. parçada devre dışı kalabilir.");
}

/* =========================================================
   01 — APP CONFIG
========================================================= */

const APP_NAME = "TürkAI";
const APP_VERSION = "13.0.0";
const APP_DESCRIPTION =
    "Türkçe odaklı yapay zekâ, araştırma, hafıza, kodlama ve üretim platformu.";

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

const PORT = Number(process.env.PORT) || 10000;
const HOST = process.env.HOST || "0.0.0.0";

const START_TIME = Date.now();

const SERVER_ID =
    process.env.SERVER_ID ||
    `turkai-${crypto.randomBytes(5).toString("hex")}`;

/* =========================================================
   02 — PATHS
========================================================= */

const ROOT_DIR = __dirname;

const DATA_DIR = path.join(ROOT_DIR, "data");
const DATABASE_DIR = path.join(DATA_DIR, "database");
const STORAGE_DIR = path.join(DATA_DIR, "storage");

const USERS_DIR = path.join(STORAGE_DIR, "users");
const UPLOADS_DIR = path.join(STORAGE_DIR, "uploads");
const GENERATED_DIR = path.join(STORAGE_DIR, "generated");

const LOGS_DIR = path.join(DATA_DIR, "logs");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const TEMP_DIR = path.join(DATA_DIR, "temp");

const PUBLIC_DIR = path.join(ROOT_DIR, "public");

/* =========================================================
   03 — DATABASE FILES
========================================================= */

const DB = {
    users: path.join(DATABASE_DIR, "users.json"),
    sessions: path.join(DATABASE_DIR, "sessions.json"),
    chats: path.join(DATABASE_DIR, "chats.json"),
    messages: path.join(DATABASE_DIR, "messages.json"),
    memories: path.join(DATABASE_DIR, "memories.json"),
    knowledge: path.join(DATABASE_DIR, "knowledge.json"),
    usage: path.join(DATABASE_DIR, "usage.json"),
    files: path.join(DATABASE_DIR, "files.json"),
    projects: path.join(DATABASE_DIR, "projects.json"),
    research: path.join(DATABASE_DIR, "research.json"),
    payments: path.join(DATABASE_DIR, "payments.json"),
    notifications: path.join(DATABASE_DIR, "notifications.json"),
    audit: path.join(DATABASE_DIR, "audit.json"),
    security: path.join(DATABASE_DIR, "security.json"),
    settings: path.join(DATABASE_DIR, "settings.json")
};

/* =========================================================
   04 — DEFAULT DATABASES
========================================================= */

const DEFAULT_DATABASES = {
    users: [],
    sessions: [],
    chats: [],
    messages: [],
    memories: [],
    knowledge: [],
    usage: {},
    files: [],
    projects: [],
    research: [],
    payments: [],
    notifications: [],
    audit: [],
    security: [],
    settings: {
        maintenance: false,
        registrationEnabled: true,
        researchEnabled: true,
        aiEnabled: true
    }
};

/* =========================================================
   05 — DIRECTORY INITIALIZATION
========================================================= */

function ensureDir(directory) {
    try {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, {
                recursive: true
            });
        }
    } catch (error) {
        console.error(
            `[TürkAI] Klasör oluşturulamadı: ${directory}`,
            error.message
        );
    }
}

[
    DATA_DIR,
    DATABASE_DIR,
    STORAGE_DIR,
    USERS_DIR,
    UPLOADS_DIR,
    GENERATED_DIR,
    LOGS_DIR,
    CACHE_DIR,
    TEMP_DIR
].forEach(ensureDir);

/* =========================================================
   06 — DATABASE INITIALIZATION
========================================================= */

function ensureDatabase() {
    for (const [name, defaultValue] of Object.entries(DEFAULT_DATABASES)) {
        const file = DB[name];

        if (!fs.existsSync(file)) {
            try {
                fs.writeFileSync(
                    file,
                    JSON.stringify(defaultValue, null, 2),
                    "utf8"
                );
            } catch (error) {
                console.error(
                    `[TürkAI] ${name}.json oluşturulamadı:`,
                    error.message
                );
            }
        }
    }
}

ensureDatabase();

/* =========================================================
   07 — SAFE JSON
========================================================= */

function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return fallback;
        }

        const raw = fs.readFileSync(file, "utf8");

        if (!raw.trim()) {
            return fallback;
        }

        return JSON.parse(raw);
    } catch (error) {
        console.error(
            `[TürkAI] JSON okuma hatası: ${path.basename(file)}`,
            error.message
        );

        return fallback;
    }
}

function writeJSON(file, data) {
    try {
        const temporaryFile = `${file}.tmp`;

        fs.writeFileSync(
            temporaryFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        fs.renameSync(temporaryFile, file);

        return true;
    } catch (error) {
        console.error(
            `[TürkAI] JSON yazma hatası: ${path.basename(file)}`,
            error.message
        );

        return false;
    }
}

/* =========================================================
   08 — LOGGING
========================================================= */

function timestamp() {
    return new Date().toISOString();
}

function writeLog(filename, message) {
    try {
        const file = path.join(LOGS_DIR, filename);

        fs.appendFileSync(
            file,
            `[${timestamp()}] ${message}\n`,
            "utf8"
        );
    } catch (error) {
        console.error("[TürkAI] Log yazılamadı:", error.message);
    }
}

function logInfo(message) {
    console.log(`[TürkAI] ${message}`);
    writeLog("app.log", message);
}

function logError(message, error = null) {
    console.error(`[TürkAI] ${message}`);

    const details =
        error && error.stack
            ? error.stack
            : error
            ? String(error)
            : "";

    writeLog(
        "error.log",
        `${message}${details ? ` | ${details}` : ""}`
    );
}

function logSecurity(message) {
    console.warn(`[TürkAI][SECURITY] ${message}`);
    writeLog("security.log", message);
}

function logAI(message) {
    console.log(`[TürkAI][AI] ${message}`);
    writeLog("ai.log", message);
}

/* =========================================================
   09 — EXPRESS
========================================================= */

const app = express();

const httpServer = http.createServer(app);

let io = null;

if (SocketIOServer) {
    try {
        io = new SocketIOServer(httpServer, {
            cors: {
                origin: true,
                credentials: true
            },
            transports: ["websocket", "polling"]
        });
    } catch (error) {
        logError("Socket.IO başlatılamadı.", error);
    }
}

/* =========================================================
   10 — EXPRESS MIDDLEWARE
========================================================= */

app.disable("x-powered-by");

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
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

/* =========================================================
   11 — REQUEST LOGGER
========================================================= */

app.use((req, res, next) => {
    const started = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - started;

        const line =
            `${req.method} ${req.originalUrl} ` +
            `${res.statusCode} ${duration}ms`;

        console.log(`[HTTP] ${line}`);

        if (res.statusCode >= 400) {
            writeLog("http-errors.log", line);
        }
    });

    next();
});

/* =========================================================
   12 — BASIC HELPERS
========================================================= */

function cleanText(value, maxLength = 12000) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength);
}

function normalizeText(value) {
    return cleanText(value, 20000)
        .toLocaleLowerCase("tr-TR")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ı/g, "i")
        .replace(/ğ/g, "g")
        .replace(/ü/g, "u")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
}

function nowISO() {
    return new Date().toISOString();
}

function createId(prefix = "id") {
    return (
        `${prefix}_${Date.now()}_` +
        crypto.randomBytes(6).toString("hex")
    );
}

function createToken() {
    return crypto.randomBytes(32).toString("hex");
}

function safeEmail(email) {
    return cleanText(email, 320)
        .toLowerCase()
        .replace(/\s+/g, "");
}

/* =========================================================
   13 — PLAN SYSTEM
========================================================= */

const PLANS = {
    free: {
        id: "free",
        name: "Free",
        price: 0,
        currency: "TRY",
        dailyMessages: 50,
        dailyResearch: 5,
        dailyImages: 0,
        dailyVideos: 0,
        storageMB: 10,
        memory: true,
        research: true,
        coding: true
    },

    pro: {
        id: "pro",
        name: "Pro",
        price: 250,
        currency: "TRY",
        dailyMessages: 100,
        dailyResearch: 25,
        dailyImages: 2,
        dailyVideos: 0,
        storageMB: 25,
        memory: true,
        research: true,
        coding: true
    },

    plus: {
        id: "plus",
        name: "Plus",
        price: 500,
        currency: "TRY",
        dailyMessages: 200,
        dailyResearch: 75,
        dailyImages: 4,
        dailyVideos: 5,
        storageMB: 50,
        memory: true,
        research: true,
        coding: true
    },

    ultra: {
        id: "ultra",
        name: "Ultra",
        price: 1000,
        currency: "TRY",
        dailyMessages: 1000,
        dailyResearch: 250,
        dailyImages: 10,
        dailyVideos: 15,
        storageMB: 100,
        memory: true,
        research: true,
        coding: true
    },

    developer: {
        id: "developer",
        name: "Developer",
        price: 0,
        currency: "TRY",
        dailyMessages: 400,
        dailyResearch: 500,
        dailyImages: 50,
        dailyVideos: 50,
        storageMB: 200,
        memory: true,
        research: true,
        coding: true
    }
};

/* =========================================================
   14 — USER DATABASE
========================================================= */

function getUsers() {
    return readJSON(DB.users, []);
}

function saveUsers(users) {
    return writeJSON(DB.users, users);
}

function findUserById(id) {
    const users = getUsers();

    return users.find(
        user => user.id === id
    ) || null;
}

function findUserByEmail(email) {
    const target = safeEmail(email);

    if (!target) {
        return null;
    }

    const users = getUsers();

    return users.find(
        user => safeEmail(user.email) === target
    ) || null;
}

function createUser(data = {}) {
    const users = getUsers();

    const email = safeEmail(data.email);

    if (email) {
        const existing = findUserByEmail(email);

        if (existing) {
            return existing;
        }
    }

    const user = {
        id: createId("usr"),
        email,
        name: cleanText(data.name || "TürkAI Kullanıcısı", 120),
        avatar: cleanText(data.avatar || "", 1000),
        plan: "free",
        role: "user",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        lastSeenAt: nowISO(),
        active: true
    };

    users.push(user);

    saveUsers(users);

    return user;
}

function getGuestUser() {
    return {
        id: "guest",
        email: "",
        name: "Misafir",
        plan: "free",
        role: "guest",
        active: true
    };
}

/* =========================================================
   15 — SESSION SYSTEM
========================================================= */

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
    if (!token) {
        return null;
    }

    const sessions = getSessions();

    return (
        sessions.find(
            session => session.token === token
        ) || null
    );
}

/* =========================================================
   16 — REQUEST USER
========================================================= */

function getRequestUser(req) {
    const authHeader = req.headers.authorization || "";

    if (
        authHeader.startsWith("Bearer ")
    ) {
        const token = authHeader.slice(7).trim();

        const session = getSessionByToken(token);

        if (session) {
            const user = findUserById(session.userId);

            if (user) {
                user.lastSeenAt = nowISO();

                const users = getUsers();

                const index = users.findIndex(
                    item => item.id === user.id
                );

                if (index !== -1) {
                    users[index] = user;
                    saveUsers(users);
                }

                session.lastUsedAt = nowISO();

                const sessions = getSessions();

                const sessionIndex =
                    sessions.findIndex(
                        item => item.id === session.id
                    );

                if (sessionIndex !== -1) {
                    sessions[sessionIndex] = session;
                    saveSessions(sessions);
                }

                return user;
            }
        }
    }

    const headerUser =
        req.headers["x-user-id"];

    if (headerUser) {
        const user = findUserById(
            cleanText(headerUser, 200)
        );

        if (user) {
            return user;
        }
    }

    return getGuestUser();
}

/* =========================================================
   17 — CHAT DATABASE
========================================================= */

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

function createChat(userId, title = "Yeni sohbet") {
    const chats = getChats();

    const chat = {
        id: createId("chat"),
        userId,
        title: cleanText(title, 150) || "Yeni sohbet",
        createdAt: nowISO(),
        updatedAt: nowISO(),
        archived: false,
        messageCount: 0
    };

    chats.push(chat);

    saveChats(chats);

    return chat;
}

function findChatById(chatId) {
    if (!chatId) {
        return null;
    }

    const chats = getChats();

    return (
        chats.find(
            chat => chat.id === chatId
        ) || null
    );
}

function addMessage(data = {}) {
    const messages = getMessages();

    const message = {
        id: createId("msg"),
        chatId: cleanText(data.chatId, 200),
        userId: cleanText(data.userId, 200),
        role: data.role === "assistant"
            ? "assistant"
            : "user",
        content: cleanText(data.content, 30000),
        model: cleanText(data.model || "", 100),
        source: cleanText(data.source || "", 100),
        createdAt: nowISO()
    };

    messages.push(message);

    saveMessages(messages);

    const chats = getChats();

    const index = chats.findIndex(
        chat => chat.id === message.chatId
    );

    if (index !== -1) {
        chats[index].messageCount =
            Number(chats[index].messageCount || 0) + 1;

        chats[index].updatedAt = nowISO();

        saveChats(chats);
    }

    return message;
}

function getChatMessages(chatId, limit = 40) {
    const messages = getMessages();

    return messages
        .filter(
            message => message.chatId === chatId
        )
        .slice(-Math.max(1, Math.min(limit, 100)));
}

/* =========================================================
   18 — AI CONFIG
========================================================= */

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

/* =========================================================
   19 — AI SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için geliştirilmiş
modern bir yapay zekâ asistanısın.

Görevlerin:

- Soruları doğru ve anlaşılır cevaplamak.
- Kod yazmak.
- Kod hatalarını açıklamak.
- HTML, CSS ve JavaScript konusunda yardımcı olmak.
- Python, Java, C#, C++, SQL gibi dillerde yardımcı olmak.
- Kullanıcının verdiği metinleri analiz etmek.
- Gerektiğinde araştırma özelliğini kullanmak.
- Hafıza bağlamını dikkate almak.
- Bilmediğin güncel bilgileri uydurmamak.
- Emin olmadığın bilgileri kesin gerçek gibi sunmamak.
- Kullanıcı Türkçe konuşuyorsa Türkçe cevap vermek.
- Kod isterse kodu eksiksiz vermek.
- Gereksiz yere uzun açıklama yapmamak.
- Güvenli ve yasal çözümler önermek.

Özel cevap:

Kullanıcı "En hızlı kim?" diye sorarsa:
TürkAI ⚡🤖

Sen TürkAI'sın.
`;

/* =========================================================
   20 — FETCH TIMEOUT
========================================================= */

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 20000
) {
    const controller =
        new AbortController();

    const timer = setTimeout(
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

/* =========================================================
   21 — GROQ
========================================================= */

async function callGroq(messages) {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY yok.");
    }

    const response = await fetchWithTimeout(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
        const text = await response.text();

        throw new Error(
            `Groq ${response.status}: ${text.slice(0, 500)}`
        );
    }

    const data = await response.json();

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "Groq boş cevap döndürdü."
        );
    }

    return {
        text: content,
        provider: "groq",
        model: GROQ_MODEL
    };
}

/* =========================================================
   22 — CEREBRAS
========================================================= */

async function callCerebras(messages) {
    if (!CEREBRAS_API_KEY) {
        throw new Error(
            "CEREBRAS_API_KEY yok."
        );
    }

    const response = await fetchWithTimeout(
        "https://api.cerebras.ai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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
        const text = await response.text();

        throw new Error(
            `Cerebras ${response.status}: ${text.slice(0, 500)}`
        );
    }

    const data = await response.json();

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "Cerebras boş cevap döndürdü."
        );
    }

    return {
        text: content,
        provider: "cerebras",
        model: CEREBRAS_MODEL
    };
}

/* =========================================================
   23 — OPENROUTER
========================================================= */

async function callOpenRouter(messages) {
    if (!OPENROUTER_API_KEY) {
        throw new Error(
            "OPENROUTER_API_KEY yok."
        );
    }

    const response = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization:
                    `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer":
                    "https://turkai-6.onrender.com",
                "X-Title": "TürkAI"
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
        const text = await response.text();

        throw new Error(
            `OpenRouter ${response.status}: ${text.slice(0, 500)}`
        );
    }

    const data = await response.json();

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "OpenRouter boş cevap döndürdü."
        );
    }

    return {
        text: content,
        provider: "openrouter",
        model: OPENROUTER_MODEL
    };
}

/* =========================================================
   24 — GEMINI
========================================================= */

async function callGemini(messages) {
    if (!GEMINI_API_KEY) {
        throw new Error(
            "GEMINI_API_KEY yok."
        );
    }

    const contents = [];

    for (const message of messages) {
        contents.push({
            role:
                message.role === "assistant"
                    ? "model"
                    : "user",
            parts: [
                {
                    text: String(
                        message.content || ""
                    )
                }
            ]
        });
    }

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=` +
        `${encodeURIComponent(GEMINI_API_KEY)}`;

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text:
                                    SYSTEM_PROMPT
                            }
                        ]
                    },
                    contents,
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 4096
                    }
                })
            },
            30000
        );

    if (!response.ok) {
        const text = await response.text();

        throw new Error(
            `Gemini ${response.status}: ${text.slice(0, 500)}`
        );
    }

    const data = await response.json();

    const text =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("") || "";

    if (!text.trim()) {
        throw new Error(
            "Gemini boş cevap döndürdü."
        );
    }

    return {
        text,
        provider: "gemini",
        model: GEMINI_MODEL
    };
}

/* =========================================================
   25 — LOCAL MATH
========================================================= */

function solveSimpleMath(input) {
    const text = cleanText(input, 500);

    if (!text) {
        return null;
    }

    const normalized =
        normalizeText(text)
            .replace(/kaç eder/g, "")
            .replace(/hesapla/g, "")
            .replace(/nedir/g, "")
            .trim();

    const allowed =
        /^[0-9+\-*/().,%\s]+$/;

    if (!allowed.test(normalized)) {
        return null;
    }

    try {
        let expression =
            normalized.replace(/,/g, ".");

        if (
            expression.includes("%")
        ) {
            expression =
                expression.replace(
                    /(\d+(?:\.\d+)?)%/g,
                    "($1/100)"
                );
        }

        if (
            !/^[0-9+\-*/().\s]+$/.test(
                expression
            )
        ) {
            return null;
        }

        const result =
            Function(
                `"use strict"; return (${expression})`
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

/* =========================================================
   26 — LOCAL RESPONSE
========================================================= */

function localResponse(message) {
    const text = cleanText(message);

    if (!text) {
        return {
            text: "Bir mesaj yaz, hemen yardımcı olayım.",
            provider: "local",
            model: "turkai-local"
        };
    }

    const normalized =
        normalizeText(text);

    if (
        normalized === "en hizli kim" ||
        normalized.includes(
            "en hizli kim"
        )
    ) {
        return {
            text: "TürkAI ⚡🤖",
            provider: "local",
            model: "turkai-local"
        };
    }

    const math =
        solveSimpleMath(text);

    if (math !== null) {
        return {
            text:
                `Sonuç: ${math}`,
            provider: "local",
            model: "turkai-math"
        };
    }

    const greetings = [
        "merhaba",
        "selam",
        "selaam",
        "hey",
        "sa",
        "selamun aleykum"
    ];

    if (
        greetings.some(
            item =>
                normalized === item ||
                normalized.startsWith(
                    `${item} `
                )
        )
    ) {
        return {
            text:
                "Selam! Ben TürkAI. Sana nasıl yardımcı olabilirim?",
            provider: "local",
            model: "turkai-local"
        };
    }

    if (
        normalized.includes(
            "sen kimsin"
        ) ||
        normalized.includes(
            "adın ne"
        ) ||
        normalized.includes(
            "adini ne"
        )
    ) {
        return {
            text:
                "Ben TürkAI; kodlama, araştırma, yazılım, eğitim ve günlük sorularda yardımcı olan yapay zekâ asistanıyım.",
            provider: "local",
            model: "turkai-local"
        };
    }

    if (
        normalized.includes(
            "tesekkur"
        ) ||
        normalized.includes(
            "sagol"
        )
    ) {
        return {
            text:
                "Rica ederim! Her zaman yardımcı olabilirim.",
            provider: "local",
            model: "turkai-local"
        };
    }

    return null;
}

/* =========================================================
   27 — AI PROVIDER FALLBACK
========================================================= */

async function callAI(messages) {
    const localLast =
        messages?.[messages.length - 1]
            ?.content || "";

    const local =
        localResponse(localLast);

    if (local) {
        return local;
    }

    const providers = [];

    if (GROQ_API_KEY) {
        providers.push({
            name: "groq",
            fn: () =>
                callGroq(messages)
        });
    }

    if (CEREBRAS_API_KEY) {
        providers.push({
            name: "cerebras",
            fn: () =>
                callCerebras(messages)
        });
    }

    if (OPENROUTER_API_KEY) {
        providers.push({
            name: "openrouter",
            fn: () =>
                callOpenRouter(messages)
        });
    }

    if (GEMINI_API_KEY) {
        providers.push({
            name: "gemini",
            fn: () =>
                callGemini(messages)
        });
    }

    const errors = [];

    for (const provider of providers) {
        try {
            logAI(
                `${provider.name} deneniyor...`
            );

            const result =
                await provider.fn();

            logAI(
                `${provider.name} başarılı.`
            );

            return result;
        } catch (error) {
            errors.push(
                `${provider.name}: ${error.message}`
            );

            logError(
                `${provider.name} başarısız.`,
                error
            );
        }
    }

    return {
        text:
            "Şu anda çevrim içi AI sağlayıcılarına erişemiyorum. İstersen sorunu yerel TürkAI sistemiyle çözmeyi deneyebilirim.",
        provider: "fallback",
        model: "turkai-fallback",
        errors
    };
}

/* =========================================================
   28 — MEMORY DATABASE
========================================================= */

function getMemories() {
    return readJSON(DB.memories, []);
}

function saveMemories(memories) {
    return writeJSON(DB.memories, memories);
}

function getUserMemories(userId) {
    if (!userId) {
        return [];
    }

    return getMemories()
        .filter(
            memory =>
                memory.userId === userId
        )
        .slice(-100);
}

function createMemory(
    userId,
    content,
    type = "note"
) {
    const memories =
        getMemories();

    const memory = {
        id: createId("mem"),
        userId,
        content:
            cleanText(content, 2000),
        type:
            cleanText(type, 100) ||
            "note",
        createdAt: nowISO(),
        updatedAt: nowISO()
    };

    memories.push(memory);

    saveMemories(memories);

    return memory;
}

function deleteMemory(
    userId,
    memoryId
) {
    const memories =
        getMemories();

    const filtered =
        memories.filter(
            memory =>
                !(
                    memory.id === memoryId &&
                    memory.userId === userId
                )
        );

    saveMemories(filtered);

    return (
        filtered.length !==
        memories.length
    );
}

function clearUserMemories(userId) {
    const memories =
        getMemories();

    const filtered =
        memories.filter(
            memory =>
                memory.userId !== userId
        );

    saveMemories(filtered);

    return true;
}

function buildMemoryContext(userId) {
    const memories =
        getUserMemories(userId);

    if (!memories.length) {
        return "";
    }

    return memories
        .slice(-20)
        .map(
            memory =>
                `- ${memory.content}`
        )
        .join("\n");
}

/* =========================================================
   29 — KNOWLEDGE DATABASE
========================================================= */

function getKnowledge() {
    return readJSON(DB.knowledge, []);
}

function saveKnowledge(items) {
    return writeJSON(
        DB.knowledge,
        items
    );
}

function addKnowledge(
    question,
    answer,
    source = "local"
) {
    const items =
        getKnowledge();

    const normalizedQuestion =
        normalizeText(question);

    const existingIndex =
        items.findIndex(
            item =>
                normalizeText(
                    item.question
                ) === normalizedQuestion
        );

    const record = {
        id: createId("know"),
        question:
            cleanText(question, 2000),
        answer:
            cleanText(answer, 12000),
        source:
            cleanText(source, 200),
        createdAt: nowISO(),
        updatedAt: nowISO()
    };

    if (existingIndex !== -1) {
        items[existingIndex] = {
            ...items[existingIndex],
            ...record,
            id: items[existingIndex].id
        };
    } else {
        items.push(record);
    }

    saveKnowledge(items);

    return record;
}

function findKnowledgeAnswer(
    question
) {
    const normalized =
        normalizeText(question);

    if (!normalized) {
        return null;
    }

    const items =
        getKnowledge();

    let best = null;
    let bestScore = 0;

    for (const item of items) {
        const candidate =
            normalizeText(
                item.question
            );

        if (
            candidate === normalized
        ) {
            return item;
        }

        const words =
            normalized
                .split(/\s+/)
                .filter(Boolean);

        let score = 0;

        for (const word of words) {
            if (
                word.length > 2 &&
                candidate.includes(word)
            ) {
                score++;
            }
        }

        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }

    if (
        best &&
        bestScore >= 2
    ) {
        return best;
    }

    return null;
}

/* =========================================================
   30 — BUILD AI MESSAGES
========================================================= */

function buildMessages(
    userId,
    chatId,
    userMessage
) {
    const memory =
        buildMemoryContext(
            userId
        );

    const history =
        chatId
            ? getChatMessages(
                  chatId,
                  30
              )
            : [];

    const messages = [];

    let system =
        SYSTEM_PROMPT;

    if (memory) {
        system +=
            `\n\nKullanıcının hafıza notları:\n${memory}`;
    }

    messages.push({
        role: "system",
        content: system
    });

    for (const item of history) {
        messages.push({
            role:
                item.role === "assistant"
                    ? "assistant"
                    : "user",
            content:
                item.content
        });
    }

    messages.push({
        role: "user",
        content:
            cleanText(
                userMessage,
                20000
            )
    });

    return messages;
}

/* =========================================================
   31 — CHAT ANSWER ENGINE
========================================================= */

async function generateChatAnswer(
    userId,
    chatId,
    userMessage
) {
    const knowledge =
        findKnowledgeAnswer(
            userMessage
        );

    if (knowledge) {
        return {
            text:
                knowledge.answer,
            provider:
                "knowledge",
            model:
                "turkai-knowledge",
            source:
                knowledge.source
        };
    }

    const messages =
        buildMessages(
            userId,
            chatId,
            userMessage
        );

    const result =
        await callAI(messages);

    return {
        ...result,
        source:
            result.source ||
            result.provider
    };
}

/* =========================================================
   32 — CHAT ROUTE
========================================================= */

app.post(
    "/api/chat",
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const message =
                cleanText(
                    req.body?.message,
                    20000
                );

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Mesaj boş olamaz."
                });
            }

            let chatId =
                cleanText(
                    req.body?.chatId,
                    200
                );

            let chat =
                findChatById(chatId);

            if (
                !chat ||
                (
                    user.id !== "guest" &&
                    chat.userId !== user.id
                )
            ) {
                chat =
                    createChat(
                        user.id,
                        message.slice(
                            0,
                            60
                        )
                    );

                chatId =
                    chat.id;
            }

            addMessage({
                chatId,
                userId: user.id,
                role: "user",
                content: message,
                model:
                    cleanText(
                        req.body?.model ||
                        "fast",
                        100
                    ),
                source: "user"
            });

            const answer =
                await generateChatAnswer(
                    user.id,
                    chatId,
                    message
                );

            addMessage({
                chatId,
                userId: user.id,
                role: "assistant",
                content:
                    answer.text,
                model:
                    answer.model,
                source:
                    answer.source
            });

            if (
                io &&
                chatId
            ) {
                io.to(
                    `chat:${chatId}`
                ).emit(
                    "chat:message",
                    {
                        chatId,
                        message: {
                            role:
                                "assistant",
                            content:
                                answer.text,
                            model:
                                answer.model,
                            source:
                                answer.source,
                            createdAt:
                                nowISO()
                        }
                    }
                );
            }

            return res.json({
                success: true,
                reply:
                    answer.text,
                response:
                    answer.text,
                message:
                    answer.text,
                text:
                    answer.text,
                chatId,
                source:
                    answer.source ||
                    answer.provider,
                provider:
                    answer.provider,
                model:
                    answer.model
            });
        } catch (error) {
            logError(
                "/api/chat hatası",
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    "TürkAI cevap oluştururken bir hata oluştu.",
                detail:
                    IS_PRODUCTION
                        ? undefined
                        : error.message
            });
        }
    }
);

/* =========================================================
   33 — CHAT LIST
========================================================= */

app.get(
    "/api/chats",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const chats =
                getChats()
                    .filter(
                        chat =>
                            chat.userId ===
                            user.id
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.updatedAt
                            ) -
                            new Date(
                                a.updatedAt
                            )
                    );

            res.json({
                success: true,
                chats
            });
        } catch (error) {
            logError(
                "/api/chats",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Sohbetler alınamadı."
            });
        }
    }
);

/* =========================================================
   34 — SINGLE CHAT
========================================================= */

app.get(
    "/api/chats/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const chat =
                findChatById(
                    req.params.id
                );

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Sohbet bulunamadı."
                });
            }

            if (
                chat.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu sohbete erişim iznin yok."
                });
            }

            const messages =
                getChatMessages(
                    chat.id,
                    100
                );

            res.json({
                success: true,
                chat,
                messages
            });
        } catch (error) {
            logError(
                "/api/chats/:id",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Sohbet alınamadı."
            });
        }
    }
);

/* =========================================================
   35 — DELETE CHAT
========================================================= */

app.delete(
    "/api/chats/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const chats =
                getChats();

            const chat =
                chats.find(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Sohbet bulunamadı."
                });
            }

            if (
                chat.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Yetkin yok."
                });
            }

            const filtered =
                chats.filter(
                    item =>
                        item.id !==
                        chat.id
                );

            saveChats(filtered);

            const messages =
                getMessages().filter(
                    message =>
                        message.chatId !==
                        chat.id
                );

            saveMessages(messages);

            res.json({
                success: true,
                message:
                    "Sohbet silindi."
            });
        } catch (error) {
            logError(
                "Sohbet silme hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Sohbet silinemedi."
            });
        }
    }
);

/* =========================================================
   36 — MEMORY GET
========================================================= */

app.get(
    "/api/memory",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            res.json({
                success: true,
                memories:
                    getUserMemories(
                        user.id
                    )
            });
        } catch (error) {
            logError(
                "Memory GET hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Hafıza alınamadı."
            });
        }
    }
);

/* =========================================================
   37 — MEMORY CREATE
========================================================= */

app.post(
    "/api/memory",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const content =
                cleanText(
                    req.body?.content,
                    2000
                );

            const type =
                cleanText(
                    req.body?.type ||
                        "note",
                    100
                );

            if (!content) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Hafıza içeriği boş."
                });
            }

            const memory =
                createMemory(
                    user.id,
                    content,
                    type
                );

            res.json({
                success: true,
                memory
            });
        } catch (error) {
            logError(
                "Memory POST hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Hafıza kaydedilemedi."
            });
        }
    }
);

/* =========================================================
   38 — MEMORY DELETE
========================================================= */

app.delete(
    "/api/memory/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const deleted =
                deleteMemory(
                    user.id,
                    req.params.id
                );

            res.json({
                success: deleted,
                deleted
            });
        } catch (error) {
            logError(
                "Memory DELETE hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Hafıza silinemedi."
            });
        }
    }
);

/* =========================================================
   39 — CLEAR MEMORY
========================================================= */

app.delete(
    "/api/memory",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            clearUserMemories(
                user.id
            );

            res.json({
                success: true,
                message:
                    "Hafıza temizlendi."
            });
        } catch (error) {
            logError(
                "Memory clear hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Hafıza temizlenemedi."
            });
        }
    }
);

/* =========================================================
   40 — KNOWLEDGE SEARCH
========================================================= */

app.get(
    "/api/knowledge/search",
    (req, res) => {
        try {
            const q =
                cleanText(
                    req.query.q,
                    2000
                );

            if (!q) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Arama metni gerekli."
                });
            }

            const result =
                findKnowledgeAnswer(q);

            res.json({
                success: true,
                found:
                    Boolean(result),
                result:
                    result || null
            });
        } catch (error) {
            logError(
                "Knowledge search hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Bilgi aranamadı."
            });
        }
    }
);

/* =========================================================
   41 — KNOWLEDGE ADD
========================================================= */

app.post(
    "/api/knowledge",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            if (
                user.role !== "admin" &&
                user.plan !== "developer"
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bilgi eklemek için yetki gerekli."
                });
            }

            const question =
                cleanText(
                    req.body?.question,
                    2000
                );

            const answer =
                cleanText(
                    req.body?.answer,
                    12000
                );

            const source =
                cleanText(
                    req.body?.source ||
                        "manual",
                    200
                );

            if (
                !question ||
                !answer
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Soru ve cevap gerekli."
                });
            }

            const record =
                addKnowledge(
                    question,
                    answer,
                    source
                );

            res.json({
                success: true,
                knowledge:
                    record
            });
        } catch (error) {
            logError(
                "Knowledge POST hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Bilgi kaydedilemedi."
            });
        }
    }
);

/* =========================================================
   42 — RESEARCH HELPERS
========================================================= */

const RESEARCH_TIMEOUT =
    15000;

function isValidURL(value) {
    try {
        const url =
            new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

async function fetchResearchURL(
    targetURL
) {
    if (!isValidURL(targetURL)) {
        throw new Error(
            "Geçersiz URL."
        );
    }

    const response =
        await fetchWithTimeout(
            targetURL,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 TürkAI Research"
                }
            },
            RESEARCH_TIMEOUT
        );

    if (!response.ok) {
        throw new Error(
            `Sayfa ${response.status} döndürdü.`
        );
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    const body =
        await response.text();

    let text =
        body
            .replace(
                /<script[\s\S]*?<\/script>/gi,
                " "
            )
            .replace(
                /<style[\s\S]*?<\/style>/gi,
                " "
            )
            .replace(
                /<noscript[\s\S]*?<\/noscript>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /&nbsp;/gi,
                " "
            )
            .replace(
                /&amp;/gi,
                "&"
            )
            .replace(
                /&quot;/gi,
                '"'
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    text = text.slice(0, 30000);

    return {
        url: targetURL,
        contentType,
        text
    };
}

function saveResearchRecord(
    userId,
    data
) {
    const records =
        readJSON(
            DB.research,
            []
        );

    const record = {
        id: createId("research"),
        userId,
        ...data,
        createdAt: nowISO()
    };

    records.push(record);

    if (records.length > 1000) {
        records.splice(
            0,
            records.length - 1000
        );
    }

    writeJSON(
        DB.research,
        records
    );

    return record;
}

/* =========================================================
   43 — RESEARCH ROUTE
========================================================= */

app.post(
    "/api/research",
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const targetURL =
                cleanText(
                    req.body?.url,
                    2000
                );

            const query =
                cleanText(
                    req.body?.query,
                    1000
                );

            if (
                !targetURL &&
                !query
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "URL veya arama sorgusu gerekli."
                });
            }

            let result;

            if (targetURL) {
                result =
                    await fetchResearchURL(
                        targetURL
                    );
            } else {
                const searchURL =
                    "https://www.google.com/search?q=" +
                    encodeURIComponent(
                        query
                    );

                result =
                    await fetchResearchURL(
                        searchURL
                    );

                result.query =
                    query;
            }

            const saved =
                saveResearchRecord(
                    user.id,
                    result
                );

            res.json({
                success: true,
                research:
                    saved
            });
        } catch (error) {
            logError(
                "Research hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırma sırasında hata oluştu.",
                detail:
                    IS_PRODUCTION
                        ? undefined
                        : error.message
            });
        }
    }
);

/* =========================================================
   44 — RESEARCH HISTORY
========================================================= */

app.get(
    "/api/research/history",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const records =
                readJSON(
                    DB.research,
                    []
                )
                    .filter(
                        item =>
                            item.userId ===
                            user.id
                    )
                    .slice(-100)
                    .reverse();

            res.json({
                success: true,
                research:
                    records
            });
        } catch (error) {
            logError(
                "Research history hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırma geçmişi alınamadı."
            });
        }
    }
);

/* =========================================================
   45 — FILE HELPERS
========================================================= */

function getFiles() {
    return readJSON(
        DB.files,
        []
    );
}

function saveFiles(files) {
    return writeJSON(
        DB.files,
        files
    );
}

function sanitizeFileName(
    filename
) {
    return cleanText(
        filename,
        200
    )
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            "_"
        )
        .replace(
            /\.\./g,
            "_"
        );
}

function registerFile(
    userId,
    filename,
    mimeType,
    size,
    content
) {
    const files =
        getFiles();

    const safeName =
        sanitizeFileName(
            filename
        );

    const fileId =
        createId("file");

    const userDirectory =
        path.join(
            USERS_DIR,
            userId
        );

    ensureDir(
        userDirectory
    );

    const storedPath =
        path.join(
            userDirectory,
            `${fileId}_${safeName}`
        );

    fs.writeFileSync(
        storedPath,
        content,
        "utf8"
    );

    const record = {
        id: fileId,
        userId,
        name: safeName,
        mimeType:
            cleanText(
                mimeType ||
                    "text/plain",
                200
            ),
        size:
            Number(size) || 0,
        path: storedPath,
        createdAt: nowISO()
    };

    files.push(record);

    saveFiles(files);

    return record;
}

/* =========================================================
   46 — JSON FILE UPLOAD
========================================================= */

app.post(
    "/api/upload",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const filename =
                cleanText(
                    req.body?.name ||
                        req.body?.fileName,
                    200
                );

            const content =
                typeof req.body?.content ===
                "string"
                    ? req.body.content
                    : "";

            const mimeType =
                cleanText(
                    req.body?.mimeType ||
                        "text/plain",
                    200
                );

            if (!filename) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Dosya adı gerekli."
                });
            }

            if (!content) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Dosya içeriği boş."
                });
            }

            const buffer =
                Buffer.from(
                    content,
                    "utf8"
                );

            const record =
                registerFile(
                    user.id,
                    filename,
                    mimeType,
                    buffer.length,
                    content
                );

            res.json({
                success: true,
                file: {
                    id: record.id,
                    name: record.name,
                    mimeType:
                        record.mimeType,
                    size:
                        record.size,
                    createdAt:
                        record.createdAt
                }
            });
        } catch (error) {
            logError(
                "Upload hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya yüklenemedi."
            });
        }
    }
);

/* =========================================================
   47 — FILE LIST
========================================================= */

app.get(
    "/api/files",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const files =
                getFiles()
                    .filter(
                        file =>
                            file.userId ===
                            user.id
                    )
                    .map(
                        file => ({
                            id:
                                file.id,
                            name:
                                file.name,
                            mimeType:
                                file.mimeType,
                            size:
                                file.size,
                            createdAt:
                                file.createdAt
                        })
                    );

            res.json({
                success: true,
                files
            });
        } catch (error) {
            logError(
                "File list hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosyalar alınamadı."
            });
        }
    }
);

/* =========================================================
   48 — FILE DELETE
========================================================= */

app.delete(
    "/api/files/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const files =
                getFiles();

            const file =
                files.find(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (!file) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya bulunamadı."
                });
            }

            if (
                file.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu dosyaya erişim iznin yok."
                });
            }

            try {
                if (
                    fs.existsSync(
                        file.path
                    )
                ) {
                    fs.unlinkSync(
                        file.path
                    );
                }
            } catch (error) {
                logError(
                    "Dosya fiziksel olarak silinemedi.",
                    error
                );
            }

            saveFiles(
                files.filter(
                    item =>
                        item.id !==
                        file.id
                )
            );

            res.json({
                success: true,
                message:
                    "Dosya silindi."
            });
        } catch (error) {
            logError(
                "File delete hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya silinemedi."
            });
        }
    }
);

/* =========================================================
   49 — USER REGISTER
========================================================= */

app.post(
    "/api/auth/register",
    (req, res) => {
        try {
            const email =
                safeEmail(
                    req.body?.email
                );

            const name =
                cleanText(
                    req.body?.name ||
                        "TürkAI Kullanıcısı",
                    120
                );

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error:
                        "E-posta gerekli."
                });
            }

            let user =
                findUserByEmail(
                    email
                );

            if (!user) {
                user =
                    createUser({
                        email,
                        name,
                        avatar:
                            req.body?.avatar
                    });
            }

            const session =
                createSession(
                    user.id
                );

            res.json({
                success: true,
                user,
                token:
                    session.token
            });
        } catch (error) {
            logError(
                "Register hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kayıt işlemi başarısız."
            });
        }
    }
);

/* =========================================================
   50 — USER LOGIN
========================================================= */

app.post(
    "/api/auth/login",
    (req, res) => {
        try {
            const email =
                safeEmail(
                    req.body?.email
                );

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error:
                        "E-posta gerekli."
                });
            }

            let user =
                findUserByEmail(
                    email
                );

            if (!user) {
                user =
                    createUser({
                        email,
                        name:
                            req.body?.name
                    });
            }

            const session =
                createSession(
                    user.id
                );

            res.json({
                success: true,
                user,
                token:
                    session.token
            });
        } catch (error) {
            logError(
                "Login hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Giriş başarısız."
            });
        }
    }
);

/* =========================================================
   51 — LOGOUT
========================================================= */

app.post(
    "/api/auth/logout",
    (req, res) => {
        try {
            const authHeader =
                req.headers.authorization ||
                "";

            if (
                authHeader.startsWith(
                    "Bearer "
                )
            ) {
                const token =
                    authHeader
                        .slice(7)
                        .trim();

                const sessions =
                    getSessions();

                saveSessions(
                    sessions.filter(
                        session =>
                            session.token !==
                            token
                    )
                );
            }

            res.json({
                success: true,
                message:
                    "Çıkış yapıldı."
            });
        } catch (error) {
            logError(
                "Logout hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Çıkış yapılamadı."
            });
        }
    }
);

/* =========================================================
   52 — ME
========================================================= */

app.get(
    "/api/me",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const plan =
                PLANS[
                    user.plan
                ] ||
                PLANS.free;

            res.json({
                success: true,
                user: {
                    id:
                        user.id,
                    name:
                        user.name,
                    email:
                        user.email,
                    avatar:
                        user.avatar ||
                        "",
                    role:
                        user.role,
                    plan:
                        user.plan,
                    planName:
                        plan.name
                }
            });
        } catch (error) {
            logError(
                "/api/me hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kullanıcı bilgisi alınamadı."
            });
        }
    }
);

/* =========================================================
   53 — HEALTH
========================================================= */

app.get(
    "/api/health",
    (req, res) => {
        const uptime =
            process.uptime();

        res.json({
            success: true,
            status: "ok",
            app: APP_NAME,
            version:
                APP_VERSION,
            environment:
                NODE_ENV,
            serverId:
                SERVER_ID,
            uptime,
            uptimeMs:
                Date.now() -
                START_TIME,
            timestamp:
                nowISO(),
            node:
                process.version
        });
    }
);

/* =========================================================
   54 — STATUS
========================================================= */

app.get(
    "/api/status",
    (req, res) => {
        const memory =
            process.memoryUsage();

        res.json({
            success: true,
            app:
                APP_NAME,
            version:
                APP_VERSION,
            online: true,
            environment:
                NODE_ENV,
            uptime:
                process.uptime(),
            memory: {
                rss:
                    memory.rss,
                heapUsed:
                    memory.heapUsed,
                heapTotal:
                    memory.heapTotal,
                external:
                    memory.external
            },
            ai: {
                groq:
                    Boolean(
                        GROQ_API_KEY
                    ),
                cerebras:
                    Boolean(
                        CEREBRAS_API_KEY
                    ),
                openrouter:
                    Boolean(
                        OPENROUTER_API_KEY
                    ),
                gemini:
                    Boolean(
                        GEMINI_API_KEY
                    )
            },
            timestamp:
                nowISO()
        });
    }
);

/* =========================================================
   55 — PLANS
========================================================= */

app.get(
    "/api/plans",
    (req, res) => {
        res.json({
            success: true,
            plans: PLANS
        });
    }
);

/* =========================================================
   56 — AI STATUS
========================================================= */

app.get(
    "/api/ai/status",
    (req, res) => {
        res.json({
            success: true,
            providers: {
                groq: {
                    enabled:
                        Boolean(
                            GROQ_API_KEY
                        ),
                    model:
                        GROQ_MODEL
                },
                cerebras: {
                    enabled:
                        Boolean(
                            CEREBRAS_API_KEY
                        ),
                    model:
                        CEREBRAS_MODEL
                },
                openrouter: {
                    enabled:
                        Boolean(
                            OPENROUTER_API_KEY
                        ),
                    model:
                        OPENROUTER_MODEL
                },
                gemini: {
                    enabled:
                        Boolean(
                            GEMINI_API_KEY
                        ),
                    model:
                        GEMINI_MODEL
                },
                local: {
                    enabled: true,
                    model:
                        "turkai-local"
                }
            }
        });
    }
);

/* =========================================================
   57 — SERVER METADATA
========================================================= */

app.get(
    "/api/server/info",
    (req, res) => {
        res.json({
            success: true,
            app:
                APP_NAME,
            version:
                APP_VERSION,
            description:
                APP_DESCRIPTION,
            serverId:
                SERVER_ID,
            node:
                process.version,
            platform:
                process.platform,
            arch:
                process.arch,
            environment:
                NODE_ENV,
            startedAt:
                new Date(
                    START_TIME
                ).toISOString()
        });
    }
);

/* =========================================================
   58 — EXPORTS FOR PART 2/3
========================================================= */

/*
   DİKKAT:

   Burada server başlatılmıyor.

   startServer()
   shutdown()
   SERVER_INSTANCE
   shuttingDown

   3. PARÇADA TEK KEZ tanımlanacak.

   Böylece eski dosyadaki:
   Identifier 'shuttingDown' has already been declared
   ve
   Cannot access 'SERVER_INSTANCE' before initialization
   hataları tekrar oluşmayacak.
*/

logInfo(
    "TürkAI server çekirdeği 1/3 yüklendi."
);
/* =========================================================
   TÜRKAI SERVER — PARÇA 2 / 3
   Usage + Plans + Projects + Payments + Admin + Security
========================================================= */

/* =========================================================
   59 — USAGE DATABASE
========================================================= */

function getUsage() {
    return readJSON(DB.usage, {});
}

function saveUsage(usage) {
    return writeJSON(DB.usage, usage);
}

function getTodayKey() {
    const now = new Date();

    return [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, "0"),
        String(now.getUTCDate()).padStart(2, "0")
    ].join("-");
}

function getUserUsage(userId) {
    const usage = getUsage();
    const today = getTodayKey();

    if (!usage[userId]) {
        usage[userId] = {};
    }

    if (!usage[userId][today]) {
        usage[userId][today] = {
            messages: 0,
            research: 0,
            images: 0,
            videos: 0,
            uploads: 0,
            bytesUploaded: 0,
            updatedAt: nowISO()
        };

        saveUsage(usage);
    }

    return usage[userId][today];
}

function updateUsage(
    userId,
    type,
    amount = 1
) {
    const usage = getUsage();
    const today = getTodayKey();

    if (!usage[userId]) {
        usage[userId] = {};
    }

    if (!usage[userId][today]) {
        usage[userId][today] = {
            messages: 0,
            research: 0,
            images: 0,
            videos: 0,
            uploads: 0,
            bytesUploaded: 0,
            updatedAt: nowISO()
        };
    }

    const current =
        Number(
            usage[userId][today][type]
        ) || 0;

    usage[userId][today][type] =
        current + Number(amount || 0);

    usage[userId][today].updatedAt =
        nowISO();

    saveUsage(usage);

    return usage[userId][today];
}

function getPlanForUser(user) {
    if (!user) {
        return PLANS.free;
    }

    return (
        PLANS[user.plan] ||
        PLANS.free
    );
}

function usageAvailable(
    user,
    type,
    amount = 1
) {
    const plan =
        getPlanForUser(user);

    const usage =
        getUserUsage(user.id);

    const limitName =
        `daily${type
            .charAt(0)
            .toUpperCase()}${type.slice(1)}`;

    const limit =
        Number(
            plan[limitName]
        );

    if (!Number.isFinite(limit)) {
        return true;
    }

    const used =
        Number(
            usage[type]
        ) || 0;

    return (
        used + amount <=
        limit
    );
}

/* =========================================================
   60 — USAGE API
========================================================= */

app.get(
    "/api/usage",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const plan =
                getPlanForUser(user);

            const usage =
                getUserUsage(user.id);

            res.json({
                success: true,
                date:
                    getTodayKey(),
                plan: {
                    id:
                        plan.id,
                    name:
                        plan.name
                },
                usage,
                limits: {
                    messages:
                        plan.dailyMessages,
                    research:
                        plan.dailyResearch,
                    images:
                        plan.dailyImages,
                    videos:
                        plan.dailyVideos
                }
            });
        } catch (error) {
            logError(
                "Usage API hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kullanım bilgisi alınamadı."
            });
        }
    }
);

/* =========================================================
   61 — CHAT USAGE MIDDLEWARE
========================================================= */

function chatUsageMiddleware(
    req,
    res,
    next
) {
    try {
        const user =
            getRequestUser(req);

        if (user.id === "guest") {
            return next();
        }

        if (
            !usageAvailable(
                user,
                "messages",
                1
            )
        ) {
            const plan =
                getPlanForUser(user);

            return res.status(429).json({
                success: false,
                code:
                    "DAILY_MESSAGE_LIMIT",
                error:
                    `Günlük ${plan.name} mesaj limitine ulaştın.`,
                limit:
                    plan.dailyMessages
            });
        }

        updateUsage(
            user.id,
            "messages",
            1
        );

        next();
    } catch (error) {
        logError(
            "Chat usage middleware hatası",
            error
        );

        next();
    }
}

/* =========================================================
   62 — RESEARCH USAGE
========================================================= */

function researchUsageMiddleware(
    req,
    res,
    next
) {
    try {
        const user =
            getRequestUser(req);

        if (
            user.id === "guest"
        ) {
            return next();
        }

        if (
            !usageAvailable(
                user,
                "research",
                1
            )
        ) {
            const plan =
                getPlanForUser(user);

            return res.status(429).json({
                success: false,
                code:
                    "DAILY_RESEARCH_LIMIT",
                error:
                    `Günlük ${plan.name} araştırma limitine ulaştın.`,
                limit:
                    plan.dailyResearch
            });
        }

        updateUsage(
            user.id,
            "research",
            1
        );

        next();
    } catch (error) {
        logError(
            "Research usage middleware hatası",
            error
        );

        next();
    }
}

/* =========================================================
   63 — IMAGE USAGE
========================================================= */

function imageUsageMiddleware(
    req,
    res,
    next
) {
    try {
        const user =
            getRequestUser(req);

        if (
            user.id === "guest"
        ) {
            return res.status(403).json({
                success: false,
                code:
                    "IMAGE_LOGIN_REQUIRED",
                error:
                    "Görsel üretmek için giriş yapmalısın."
            });
        }

        if (
            !usageAvailable(
                user,
                "images",
                1
            )
        ) {
            const plan =
                getPlanForUser(user);

            return res.status(429).json({
                success: false,
                code:
                    "DAILY_IMAGE_LIMIT",
                error:
                    `Günlük ${plan.name} görsel limitine ulaştın.`,
                limit:
                    plan.dailyImages
            });
        }

        updateUsage(
            user.id,
            "images",
            1
        );

        next();
    } catch (error) {
        logError(
            "Image usage middleware hatası",
            error
        );

        next();
    }
}

/* =========================================================
   64 — VIDEO USAGE
========================================================= */

function videoUsageMiddleware(
    req,
    res,
    next
) {
    try {
        const user =
            getRequestUser(req);

        if (
            user.id === "guest"
        ) {
            return res.status(403).json({
                success: false,
                code:
                    "VIDEO_LOGIN_REQUIRED",
                error:
                    "Video üretmek için giriş yapmalısın."
            });
        }

        if (
            !usageAvailable(
                user,
                "videos",
                1
            )
        ) {
            const plan =
                getPlanForUser(user);

            return res.status(429).json({
                success: false,
                code:
                    "DAILY_VIDEO_LIMIT",
                error:
                    `Günlük ${plan.name} video limitine ulaştın.`,
                limit:
                    plan.dailyVideos
            });
        }

        updateUsage(
            user.id,
            "videos",
            1
        );

        next();
    } catch (error) {
        logError(
            "Video usage middleware hatası",
            error
        );

        next();
    }
}

/* =========================================================
   65 — PROJECT DATABASE
========================================================= */

function getProjects() {
    return readJSON(
        DB.projects,
        []
    );
}

function saveProjects(projects) {
    return writeJSON(
        DB.projects,
        projects
    );
}

function createProject(
    userId,
    data = {}
) {
    const projects =
        getProjects();

    const project = {
        id:
            createId("project"),

        userId,

        name:
            cleanText(
                data.name ||
                    "Yeni Proje",
                150
            ),

        description:
            cleanText(
                data.description ||
                    "",
                3000
            ),

        language:
            cleanText(
                data.language ||
                    "javascript",
                100
            ),

        code:
            typeof data.code ===
            "string"
                ? data.code.slice(
                      0,
                      100000
                  )
                : "",

        files:
            Array.isArray(
                data.files
            )
                ? data.files.slice(
                      0,
                      100
                  )
                : [],

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        status:
            "active"
    };

    projects.push(project);

    saveProjects(projects);

    return project;
}

function findProject(
    projectId
) {
    return getProjects().find(
        project =>
            project.id ===
            projectId
    ) || null;
}

/* =========================================================
   66 — PROJECT LIST
========================================================= */

app.get(
    "/api/projects",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const projects =
                getProjects()
                    .filter(
                        project =>
                            project.userId ===
                            user.id
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.updatedAt
                            ) -
                            new Date(
                                a.updatedAt
                            )
                    );

            res.json({
                success: true,
                projects
            });
        } catch (error) {
            logError(
                "Project list hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Projeler alınamadı."
            });
        }
    }
);

/* =========================================================
   67 — PROJECT CREATE
========================================================= */

app.post(
    "/api/projects",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            if (
                user.id === "guest"
            ) {
                return res.status(401).json({
                    success: false,
                    error:
                        "Proje oluşturmak için giriş yapmalısın."
                });
            }

            const project =
                createProject(
                    user.id,
                    req.body || {}
                );

            res.json({
                success: true,
                project
            });
        } catch (error) {
            logError(
                "Project create hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Proje oluşturulamadı."
            });
        }
    }
);

/* =========================================================
   68 — PROJECT GET
========================================================= */

app.get(
    "/api/projects/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const project =
                findProject(
                    req.params.id
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Proje bulunamadı."
                });
            }

            if (
                project.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu projeye erişim iznin yok."
                });
            }

            res.json({
                success: true,
                project
            });
        } catch (error) {
            logError(
                "Project GET hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Proje alınamadı."
            });
        }
    }
);

/* =========================================================
   69 — PROJECT UPDATE
========================================================= */

app.put(
    "/api/projects/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const projects =
                getProjects();

            const index =
                projects.findIndex(
                    project =>
                        project.id ===
                        req.params.id
                );

            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Proje bulunamadı."
                });
            }

            if (
                projects[index]
                    .userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu projeyi değiştiremezsin."
                });
            }

            const body =
                req.body || {};

            if (
                body.name !==
                undefined
            ) {
                projects[index].name =
                    cleanText(
                        body.name,
                        150
                    );
            }

            if (
                body.description !==
                undefined
            ) {
                projects[index]
                    .description =
                    cleanText(
                        body.description,
                        3000
                    );
            }

            if (
                body.language !==
                undefined
            ) {
                projects[index]
                    .language =
                    cleanText(
                        body.language,
                        100
                    );
            }

            if (
                body.code !==
                undefined
            ) {
                projects[index].code =
                    String(
                        body.code
                    ).slice(
                        0,
                        100000
                    );
            }

            if (
                Array.isArray(
                    body.files
                )
            ) {
                projects[index].files =
                    body.files.slice(
                        0,
                        100
                    );
            }

            projects[index]
                .updatedAt =
                nowISO();

            saveProjects(
                projects
            );

            res.json({
                success: true,
                project:
                    projects[index]
            });
        } catch (error) {
            logError(
                "Project update hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Proje güncellenemedi."
            });
        }
    }
);

/* =========================================================
   70 — PROJECT DELETE
========================================================= */

app.delete(
    "/api/projects/:id",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const projects =
                getProjects();

            const project =
                projects.find(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (!project) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Proje bulunamadı."
                });
            }

            if (
                project.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu projeyi silemezsin."
                });
            }

            saveProjects(
                projects.filter(
                    item =>
                        item.id !==
                        project.id
                )
            );

            res.json({
                success: true,
                message:
                    "Proje silindi."
            });
        } catch (error) {
            logError(
                "Project delete hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Proje silinemedi."
            });
        }
    }
);

/* =========================================================
   71 — PAYMENT DATABASE
========================================================= */

function getPayments() {
    return readJSON(
        DB.payments,
        []
    );
}

function savePayments(payments) {
    return writeJSON(
        DB.payments,
        payments
    );
}

function createPayment(
    userId,
    plan,
    amount,
    provider = "manual"
) {
    const payments =
        getPayments();

    const payment = {
        id:
            createId("pay"),

        userId,

        plan,

        amount:
            Number(amount) || 0,

        currency:
            "TRY",

        provider,

        status:
            "pending",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()
    };

    payments.push(payment);

    savePayments(payments);

    return payment;
}

/* =========================================================
   72 — TEST PAYMENT
========================================================= */

app.post(
    "/api/test-payment",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            if (
                user.id === "guest"
            ) {
                return res.status(401).json({
                    success: false,
                    error:
                        "Ödeme için giriş yapmalısın."
                });
            }

            const planId =
                cleanText(
                    req.body?.plan ||
                        req.body?.planId,
                    50
                ).toLowerCase();

            const plan =
                PLANS[planId];

            if (
                !plan ||
                planId === "free"
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Geçersiz ücretli plan."
                });
            }

            const payment =
                createPayment(
                    user.id,
                    planId,
                    plan.price,
                    "test"
                );

            payment.status =
                "paid";

            payment.updatedAt =
                nowISO();

            const payments =
                getPayments();

            const index =
                payments.findIndex(
                    item =>
                        item.id ===
                        payment.id
                );

            if (index !== -1) {
                payments[index] =
                    payment;

                savePayments(
                    payments
                );
            }

            const users =
                getUsers();

            const userIndex =
                users.findIndex(
                    item =>
                        item.id ===
                        user.id
                );

            if (
                userIndex !== -1
            ) {
                users[userIndex]
                    .plan =
                    planId;

                users[userIndex]
                    .updatedAt =
                    nowISO();

                saveUsers(users);
            }

            res.json({
                success: true,
                payment,
                plan:
                    PLANS[planId],
                user:
                    findUserById(
                        user.id
                    )
            });
        } catch (error) {
            logError(
                "Test payment hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Test ödeme işlemi başarısız."
            });
        }
    }
);

/* =========================================================
   73 — PRO CODE
========================================================= */

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";

app.post(
    "/api/pro/activate",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const code =
                cleanText(
                    req.body?.code,
                    200
                );

            const requestedPlan =
                cleanText(
                    req.body?.plan ||
                        "pro",
                    50
                ).toLowerCase();

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Kod gerekli."
                });
            }

            if (
                !TURKAI_PRO_CODE ||
                code !==
                    TURKAI_PRO_CODE
            ) {
                logSecurity(
                    `Geçersiz Pro kodu denemesi: ${user.id}`
                );

                return res.status(403).json({
                    success: false,
                    error:
                        "Geçersiz aktivasyon kodu."
                });
            }

            const plan =
                PLANS[
                    requestedPlan
                ] ||
                PLANS.pro;

            if (
                user.id === "guest"
            ) {
                return res.status(401).json({
                    success: false,
                    error:
                        "Aktivasyon için giriş yapmalısın."
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
                plan.id;

            users[index]
                .updatedAt =
                nowISO();

            saveUsers(users);

            res.json({
                success: true,
                activated: true,
                plan
            });
        } catch (error) {
            logError(
                "Pro activate hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Plan aktifleştirilemedi."
            });
        }
    }
);

/* =========================================================
   74 — NOTIFICATION DATABASE
========================================================= */

function getNotifications() {
    return readJSON(
        DB.notifications,
        []
    );
}

function saveNotifications(
    notifications
) {
    return writeJSON(
        DB.notifications,
        notifications
    );
}

function createNotification(
    userId,
    title,
    message,
    type = "info"
) {
    const notifications =
        getNotifications();

    const notification = {
        id:
            createId("notif"),

        userId,

        title:
            cleanText(
                title,
                200
            ),

        message:
            cleanText(
                message,
                3000
            ),

        type:
            cleanText(
                type,
                50
            ),

        read: false,

        createdAt:
            nowISO()
    };

    notifications.push(
        notification
    );

    if (
        notifications.length >
        5000
    ) {
        notifications.splice(
            0,
            notifications.length -
                5000
        );
    }

    saveNotifications(
        notifications
    );

    return notification;
}

/* =========================================================
   75 — NOTIFICATION GET
========================================================= */

app.get(
    "/api/notifications",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const notifications =
                getNotifications()
                    .filter(
                        item =>
                            item.userId ===
                            user.id
                    )
                    .sort(
                        (a, b) =>
                            new Date(
                                b.createdAt
                            ) -
                            new Date(
                                a.createdAt
                            )
                    )
                    .slice(0, 100);

            res.json({
                success: true,
                notifications
            });
        } catch (error) {
            logError(
                "Notifications GET hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Bildirimler alınamadı."
            });
        }
    }
);

/* =========================================================
   76 — NOTIFICATION CREATE
========================================================= */

app.post(
    "/api/notifications",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            if (
                user.role !== "admin" &&
                user.plan !== "developer"
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bildirim oluşturma yetkisi yok."
                });
            }

            const targetUserId =
                cleanText(
                    req.body?.userId,
                    200
                );

            const title =
                cleanText(
                    req.body?.title,
                    200
                );

            const message =
                cleanText(
                    req.body?.message,
                    3000
                );

            if (
                !targetUserId ||
                !title ||
                !message
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "userId, title ve message gerekli."
                });
            }

            const notification =
                createNotification(
                    targetUserId,
                    title,
                    message,
                    req.body?.type ||
                        "info"
                );

            res.json({
                success: true,
                notification
            });
        } catch (error) {
            logError(
                "Notification create hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Bildirim oluşturulamadı."
            });
        }
    }
);

/* =========================================================
   77 — NOTIFICATION READ
========================================================= */

app.post(
    "/api/notifications/:id/read",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const notifications =
                getNotifications();

            const index =
                notifications.findIndex(
                    item =>
                        item.id ===
                            req.params.id &&
                        item.userId ===
                            user.id
                );

            if (index === -1) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Bildirim bulunamadı."
                });
            }

            notifications[index]
                .read = true;

            saveNotifications(
                notifications
            );

            res.json({
                success: true,
                notification:
                    notifications[index]
            });
        } catch (error) {
            logError(
                "Notification read hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Bildirim güncellenemedi."
            });
        }
    }
);

/* =========================================================
   78 — AUDIT LOG
========================================================= */

function getAuditLogs() {
    return readJSON(
        DB.audit,
        []
    );
}

function saveAuditLogs(
    logs
) {
    return writeJSON(
        DB.audit,
        logs
    );
}

function addAuditLog(
    action,
    userId,
    metadata = {}
) {
    const logs =
        getAuditLogs();

    logs.push({
        id:
            createId("audit"),

        action:
            cleanText(
                action,
                200
            ),

        userId:
            cleanText(
                userId,
                200
            ),

        metadata,

        createdAt:
            nowISO()
    });

    if (
        logs.length >
        10000
    ) {
        logs.splice(
            0,
            logs.length -
                10000
        );
    }

    saveAuditLogs(logs);
}

/* =========================================================
   79 — ADMIN CHECK
========================================================= */

function isAdmin(user) {
    if (!user) {
        return false;
    }

    return (
        user.role === "admin" ||
        user.plan ===
            "developer"
    );
}

function requireAdmin(
    req,
    res,
    next
) {
    const user =
        getRequestUser(req);

    if (!isAdmin(user)) {
        return res.status(403).json({
            success: false,
            error:
                "Yönetici yetkisi gerekli."
        });
    }

    req.adminUser =
        user;

    next();
}

/* =========================================================
   80 — ADMIN STATUS
========================================================= */

app.get(
    "/api/admin/status",
    requireAdmin,
    (req, res) => {
        try {
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

            res.json({
                success: true,
                admin:
                    req.adminUser.id,
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
                        projects.length
                },
                server: {
                    uptime:
                        process.uptime(),
                    memory:
                        process.memoryUsage(),
                    node:
                        process.version
                }
            });
        } catch (error) {
            logError(
                "Admin status hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Admin durumu alınamadı."
            });
        }
    }
);

/* =========================================================
   81 — ADMIN USERS
========================================================= */

app.get(
    "/api/admin/users",
    requireAdmin,
    (req, res) => {
        try {
            const users =
                getUsers().map(
                    user => ({
                        id:
                            user.id,
                        name:
                            user.name,
                        email:
                            user.email,
                        role:
                            user.role,
                        plan:
                            user.plan,
                        active:
                            user.active,
                        createdAt:
                            user.createdAt,
                        updatedAt:
                            user.updatedAt,
                        lastSeenAt:
                            user.lastSeenAt
                    })
                );

            res.json({
                success: true,
                users
            });
        } catch (error) {
            logError(
                "Admin users hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kullanıcılar alınamadı."
            });
        }
    }
);

/* =========================================================
   82 — ADMIN USER UPDATE
========================================================= */

app.patch(
    "/api/admin/users/:id",
    requireAdmin,
    (req, res) => {
        try {
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
                    error:
                        "Kullanıcı bulunamadı."
                });
            }

            const body =
                req.body || {};

            if (
                body.plan &&
                PLANS[body.plan]
            ) {
                users[index].plan =
                    body.plan;
            }

            if (
                body.role
            ) {
                users[index].role =
                    cleanText(
                        body.role,
                        50
                    );
            }

            if (
                body.active !==
                undefined
            ) {
                users[index]
                    .active =
                    Boolean(
                        body.active
                    );
            }

            users[index]
                .updatedAt =
                nowISO();

            saveUsers(users);

            addAuditLog(
                "admin.user.update",
                req.adminUser.id,
                {
                    target:
                        req.params.id
                }
            );

            res.json({
                success: true,
                user:
                    users[index]
            });
        } catch (error) {
            logError(
                "Admin user update hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kullanıcı güncellenemedi."
            });
        }
    }
);

/* =========================================================
   83 — ADMIN USER DELETE
========================================================= */

app.delete(
    "/api/admin/users/:id",
    requireAdmin,
    (req, res) => {
        try {
            const targetId =
                cleanText(
                    req.params.id,
                    200
                );

            if (
                targetId ===
                req.adminUser.id
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Kendi admin hesabını buradan silemezsin."
                });
            }

            const users =
                getUsers();

            const exists =
                users.some(
                    user =>
                        user.id ===
                        targetId
                );

            if (!exists) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Kullanıcı bulunamadı."
                });
            }

            saveUsers(
                users.filter(
                    user =>
                        user.id !==
                        targetId
                )
            );

            saveSessions(
                getSessions().filter(
                    session =>
                        session.userId !==
                        targetId
                )
            );

            addAuditLog(
                "admin.user.delete",
                req.adminUser.id,
                {
                    target:
                        targetId
                }
            );

            res.json({
                success: true,
                message:
                    "Kullanıcı silindi."
            });
        } catch (error) {
            logError(
                "Admin user delete hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kullanıcı silinemedi."
            });
        }
    }
);

/* =========================================================
   84 — SECURITY DATABASE
========================================================= */

function getSecurityEvents() {
    return readJSON(
        DB.security,
        []
    );
}

function saveSecurityEvents(
    events
) {
    return writeJSON(
        DB.security,
        events
    );
}

function addSecurityEvent(
    type,
    message,
    metadata = {}
) {
    const events =
        getSecurityEvents();

    events.push({
        id:
            createId("sec"),
        type:
            cleanText(
                type,
                100
            ),
        message:
            cleanText(
                message,
                2000
            ),
        metadata,
        createdAt:
            nowISO()
    });

    if (
        events.length >
        5000
    ) {
        events.splice(
            0,
            events.length -
                5000
        );
    }

    saveSecurityEvents(
        events
    );
}

/* =========================================================
   85 — SECURITY STATUS
========================================================= */

app.get(
    "/api/security/status",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const events =
                isAdmin(user)
                    ? getSecurityEvents()
                        .slice(-100)
                        .reverse()
                    : [];

            res.json({
                success: true,
                security: {
                    helmet:
                        true,
                    cors:
                        true,
                    requestLogging:
                        true,
                    jsonLimit:
                        "25mb",
                    user:
                        user.id,
                    events
                }
            });
        } catch (error) {
            logError(
                "Security status hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Güvenlik durumu alınamadı."
            });
        }
    }
);

/* =========================================================
   86 — SERVER SETTINGS
========================================================= */

function getSettings() {
    return readJSON(
        DB.settings,
        DEFAULT_DATABASES.settings
    );
}

function saveSettings(
    settings
) {
    return writeJSON(
        DB.settings,
        settings
    );
}

app.get(
    "/api/settings",
    (req, res) => {
        try {
            const settings =
                getSettings();

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            logError(
                "Settings GET hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Ayarlar alınamadı."
            });
        }
    }
);

/* =========================================================
   87 — ADMIN SETTINGS UPDATE
========================================================= */

app.patch(
    "/api/settings",
    requireAdmin,
    (req, res) => {
        try {
            const settings =
                getSettings();

            const body =
                req.body || {};

            if (
                body.maintenance !==
                undefined
            ) {
                settings.maintenance =
                    Boolean(
                        body.maintenance
                    );
            }

            if (
                body.registrationEnabled !==
                undefined
            ) {
                settings
                    .registrationEnabled =
                    Boolean(
                        body.registrationEnabled
                    );
            }

            if (
                body.researchEnabled !==
                undefined
            ) {
                settings
                    .researchEnabled =
                    Boolean(
                        body.researchEnabled
                    );
            }

            if (
                body.aiEnabled !==
                undefined
            ) {
                settings.aiEnabled =
                    Boolean(
                        body.aiEnabled
                    );
            }

            saveSettings(
                settings
            );

            addAuditLog(
                "settings.update",
                req.adminUser.id,
                {
                    settings
                }
            );

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            logError(
                "Settings PATCH hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Ayarlar güncellenemedi."
            });
        }
    }
);

/* =========================================================
   88 — SYSTEM MAINTENANCE GUARD
========================================================= */

app.use(
    "/api",
    (req, res, next) => {
        const settings =
            getSettings();

        const publicRoutes = [
            "/health",
            "/status",
            "/plans",
            "/server/info"
        ];

        if (
            settings.maintenance &&
            !publicRoutes.includes(
                req.path
            )
        ) {
            const user =
                getRequestUser(req);

            if (
                !isAdmin(user)
            ) {
                return res.status(503).json({
                    success: false,
                    code:
                        "MAINTENANCE",
                    error:
                        "TürkAI şu anda bakım modunda."
                });
            }
        }

        next();
    }
);

/* =========================================================
   89 — RESEARCH ENABLE GUARD
========================================================= */

app.use(
    "/api/research",
    (req, res, next) => {
        const settings =
            getSettings();

        if (
            settings.researchEnabled ===
            false
        ) {
            const user =
                getRequestUser(req);

            if (
                !isAdmin(user)
            ) {
                return res.status(503).json({
                    success: false,
                    code:
                        "RESEARCH_DISABLED",
                    error:
                        "Araştırma özelliği geçici olarak kapalı."
                });
            }
        }

        next();
    }
);

/* =========================================================
   90 — AI ENABLE GUARD
========================================================= */

app.use(
    "/api/chat",
    (req, res, next) => {
        const settings =
            getSettings();

        if (
            settings.aiEnabled ===
            false
        ) {
            const user =
                getRequestUser(req);

            if (
                !isAdmin(user)
            ) {
                return res.status(503).json({
                    success: false,
                    code:
                        "AI_DISABLED",
                    error:
                        "AI özelliği geçici olarak kapalı."
                });
            }
        }

        next();
    }
);

/* =========================================================
   91 — ADMIN AUDIT
========================================================= */

app.get(
    "/api/admin/audit",
    requireAdmin,
    (req, res) => {
        try {
            const logs =
                getAuditLogs()
                    .slice(-200)
                    .reverse();

            res.json({
                success: true,
                logs
            });
        } catch (error) {
            logError(
                "Admin audit hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Audit kayıtları alınamadı."
            });
        }
    }
);

/* =========================================================
   92 — ADMIN PAYMENTS
========================================================= */

app.get(
    "/api/admin/payments",
    requireAdmin,
    (req, res) => {
        try {
            const payments =
                getPayments()
                    .slice(-500)
                    .reverse();

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            logError(
                "Admin payments hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Ödemeler alınamadı."
            });
        }
    }
);

/* =========================================================
   93 — ADMIN RESEARCH
========================================================= */

app.get(
    "/api/admin/research",
    requireAdmin,
    (req, res) => {
        try {
            const records =
                readJSON(
                    DB.research,
                    []
                )
                    .slice(-500)
                    .reverse();

            res.json({
                success: true,
                research:
                    records
            });
        } catch (error) {
            logError(
                "Admin research hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırma kayıtları alınamadı."
            });
        }
    }
);

/* =========================================================
   94 — ADMIN FILES
========================================================= */

app.get(
    "/api/admin/files",
    requireAdmin,
    (req, res) => {
        try {
            const files =
                getFiles()
                    .map(
                        file => ({
                            id:
                                file.id,
                            userId:
                                file.userId,
                            name:
                                file.name,
                            mimeType:
                                file.mimeType,
                            size:
                                file.size,
                            createdAt:
                                file.createdAt
                        })
                    )
                    .slice(-500)
                    .reverse();

            res.json({
                success: true,
                files
            });
        } catch (error) {
            logError(
                "Admin files hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosyalar alınamadı."
            });
        }
    }
);

/* =========================================================
   95 — PLAN CHECK
========================================================= */

function requirePlan(
    allowedPlans = []
) {
    return (
        req,
        res,
        next
    ) => {
        const user =
            getRequestUser(req);

        if (
            isAdmin(user)
        ) {
            req.planUser =
                user;

            return next();
        }

        if (
            !allowedPlans.includes(
                user.plan
            )
        ) {
            return res.status(403).json({
                success: false,
                code:
                    "PLAN_REQUIRED",
                error:
                    "Bu özellik mevcut planında kullanılamıyor.",
                currentPlan:
                    user.plan,
                allowedPlans
            });
        }

        req.planUser =
            user;

        next();
    };
}

/* =========================================================
   96 — IMAGE GENERATION ENDPOINT
========================================================= */

app.post(
    "/api/generate/image",
    imageUsageMiddleware,
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const prompt =
                cleanText(
                    req.body?.prompt,
                    4000
                );

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Görsel promptu gerekli."
                });
            }

            /*
              Burada gerçek image provider
              daha sonra bağlanabilir.

              Şimdilik backend,
              üretim isteğini kayıt altına
              alır ve frontend'e iş kimliği verir.
            */

            const job = {
                id:
                    createId("imgjob"),

                userId:
                    user.id,

                prompt,

                status:
                    "queued",

                createdAt:
                    nowISO()
            };

            const file =
                path.join(
                    GENERATED_DIR,
                    "image-jobs.json"
                );

            const jobs =
                readJSON(
                    file,
                    []
                );

            jobs.push(job);

            writeJSON(
                file,
                jobs.slice(-1000)
            );

            res.json({
                success: true,
                job
            });
        } catch (error) {
            logError(
                "Image generation hatası",
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

/* =========================================================
   97 — VIDEO GENERATION ENDPOINT
========================================================= */

app.post(
    "/api/generate/video",
    videoUsageMiddleware,
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const prompt =
                cleanText(
                    req.body?.prompt,
                    4000
                );

            if (!prompt) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Video promptu gerekli."
                });
            }

            const job = {
                id:
                    createId("vidjob"),

                userId:
                    user.id,

                prompt,

                status:
                    "queued",

                createdAt:
                    nowISO()
            };

            const file =
                path.join(
                    GENERATED_DIR,
                    "video-jobs.json"
                );

            const jobs =
                readJSON(
                    file,
                    []
                );

            jobs.push(job);

            writeJSON(
                file,
                jobs.slice(-1000)
            );

            res.json({
                success: true,
                job
            });
        } catch (error) {
            logError(
                "Video generation hatası",
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

/* =========================================================
   98 — GENERATION JOBS
========================================================= */

app.get(
    "/api/generate/jobs",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const imageJobs =
                readJSON(
                    path.join(
                        GENERATED_DIR,
                        "image-jobs.json"
                    ),
                    []
                );

            const videoJobs =
                readJSON(
                    path.join(
                        GENERATED_DIR,
                        "video-jobs.json"
                    ),
                    []
                );

            const jobs = [
                ...imageJobs
                    .filter(
                        job =>
                            job.userId ===
                            user.id
                    ),
                ...videoJobs
                    .filter(
                        job =>
                            job.userId ===
                            user.id
                    )
            ]
                .sort(
                    (a, b) =>
                        new Date(
                            b.createdAt
                        ) -
                        new Date(
                            a.createdAt
                        )
                )
                .slice(0, 100);

            res.json({
                success: true,
                jobs
            });
        } catch (error) {
            logError(
                "Generation jobs hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Üretim işleri alınamadı."
            });
        }
    }
);

/* =========================================================
   99 — CODE EXECUTION REQUEST
========================================================= */

app.post(
    "/api/code/analyze",
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const language =
                cleanText(
                    req.body?.language ||
                        "javascript",
                    100
                );

            const code =
                cleanText(
                    req.body?.code,
                    50000
                );

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Kod gerekli."
                });
            }

            const dangerousPatterns = [
                /rm\s+-rf/i,
                /format\s+[a-z]:/i,
                /del\s+\/f/i,
                /shutdown\s+/i,
                /mkfs/i,
                /:\(\)\s*\{/i
            ];

            const warnings = [];

            for (
                const pattern of
                dangerousPatterns
            ) {
                if (
                    pattern.test(code)
                ) {
                    warnings.push(
                        "Kod tehlikeli bir sistem komutu içeriyor."
                    );
                }
            }

            let localAnalysis =
                "Kod alınarak analiz için hazırlandı.";

            if (
                language ===
                "javascript"
            ) {
                if (
                    !code.includes(
                        "console.log"
                    ) &&
                    code.includes(
                        "console"
                    )
                ) {
                    warnings.push(
                        "console kullanımı kontrol edilmeli."
                    );
                }
            }

            if (
                code.includes(
                    "TODO"
                )
            ) {
                warnings.push(
                    "Kod içinde TODO bulundu."
                );
            }

            res.json({
                success: true,
                analysis: {
                    language,
                    lines:
                        code.split(
                            "\n"
                        ).length,
                    characters:
                        code.length,
                    warnings,
                    message:
                        localAnalysis
                },
                safeToRun:
                    warnings.length ===
                    0
            });
        } catch (error) {
            logError(
                "Code analyze hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Kod analiz edilemedi."
            });
        }
    }
);

/* =========================================================
   100 — API DOCUMENTATION
========================================================= */

app.get(
    "/api/docs",
    (req, res) => {
        res.json({
            success: true,
            name:
                APP_NAME,
            version:
                APP_VERSION,

            endpoints: {
                system: [
                    "GET /api",
                    "GET /api/health",
                    "GET /api/status",
                    "GET /api/server/info",
                    "GET /api/plans",
                    "GET /api/ai/status"
                ],

                auth: [
                    "POST /api/auth/register",
                    "POST /api/auth/login",
                    "POST /api/auth/logout",
                    "GET /api/me"
                ],

                chat: [
                    "POST /api/chat",
                    "GET /api/chats",
                    "GET /api/chats/:id",
                    "DELETE /api/chats/:id"
                ],

                memory: [
                    "GET /api/memory",
                    "POST /api/memory",
                    "DELETE /api/memory/:id",
                    "DELETE /api/memory"
                ],

                research: [
                    "POST /api/research",
                    "GET /api/research/history"
                ],

                files: [
                    "POST /api/upload",
                    "GET /api/files",
                    "DELETE /api/files/:id"
                ],

                projects: [
                    "GET /api/projects",
                    "POST /api/projects",
                    "GET /api/projects/:id",
                    "PUT /api/projects/:id",
                    "DELETE /api/projects/:id"
                ],

                plans: [
                    "GET /api/usage",
                    "POST /api/pro/activate",
                    "POST /api/test-payment"
                ],

                generation: [
                    "POST /api/generate/image",
                    "POST /api/generate/video",
                    "GET /api/generate/jobs"
                ],

                admin: [
                    "GET /api/admin/status",
                    "GET /api/admin/users",
                    "PATCH /api/admin/users/:id",
                    "DELETE /api/admin/users/:id",
                    "GET /api/admin/audit",
                    "GET /api/admin/payments",
                    "GET /api/admin/research",
                    "GET /api/admin/files"
                ]
            }
        });
    }
);

/* =========================================================
   101 — REQUEST ID
========================================================= */

app.use(
    (req, res, next) => {
        const requestId =
            crypto.randomBytes(
                8
            ).toString("hex");

        req.requestId =
            requestId;

        res.setHeader(
            "X-TürkAI-Request-ID",
            requestId
        );

        next();
    }
);

/* =========================================================
   102 — BASIC RATE LIMIT
========================================================= */

const RATE_LIMIT_WINDOW =
    60 * 1000;

const RATE_LIMIT_MAX =
    120;

const requestBuckets =
    new Map();

function cleanupRateLimits() {
    const now =
        Date.now();

    for (
        const [
            key,
            bucket
        ] of requestBuckets
    ) {
        if (
            now -
                bucket.startedAt >
            RATE_LIMIT_WINDOW
        ) {
            requestBuckets.delete(
                key
            );
        }
    }
}

setInterval(
    cleanupRateLimits,
    60 * 1000
).unref();

app.use(
    (req, res, next) => {
        const ip =
            req.ip ||
            req.socket?.remoteAddress ||
            "unknown";

        const now =
            Date.now();

        let bucket =
            requestBuckets.get(
                ip
            );

        if (
            !bucket ||
            now -
                bucket.startedAt >
                RATE_LIMIT_WINDOW
        ) {
            bucket = {
                startedAt:
                    now,
                count: 0
            };

            requestBuckets.set(
                ip,
                bucket
            );
        }

        bucket.count++;

        if (
            bucket.count >
            RATE_LIMIT_MAX
        ) {
            addSecurityEvent(
                "rate_limit",
                "Rate limit aşıldı.",
                {
                    ip,
                    path:
                        req.originalUrl
                }
            );

            return res.status(429).json({
                success: false,
                code:
                    "RATE_LIMIT",
                error:
                    "Çok fazla istek gönderildi. Biraz bekleyip tekrar dene."
            });
        }

        next();
    }
);

/* =========================================================
   103 — AUTH ACTIVITY LOG
========================================================= */

app.use(
    "/api/auth",
    (req, res, next) => {
        res.on(
            "finish",
            () => {
                if (
                    res.statusCode <
                    500
                ) {
                    const user =
                        getRequestUser(
                            req
                        );

                    addAuditLog(
                        `auth.${req.method.toLowerCase()}`,
                        user.id,
                        {
                            path:
                                req.path,
                            status:
                                res.statusCode
                        }
                    );
                }
            }
        );

        next();
    }
);

/* =========================================================
   104 — CHAT ACTIVITY LOG
========================================================= */

app.use(
    "/api/chat",
    (req, res, next) => {
        res.on(
            "finish",
            () => {
                const user =
                    getRequestUser(
                        req
                    );

                addAuditLog(
                    "chat.request",
                    user.id,
                    {
                        status:
                            res.statusCode
                    }
                );
            }
        );

        next();
    }
);

/* =========================================================
   105 — PROJECT ACTIVITY LOG
========================================================= */

app.use(
    "/api/projects",
    (req, res, next) => {
        res.on(
            "finish",
            () => {
                const user =
                    getRequestUser(
                        req
                    );

                addAuditLog(
                    "project.request",
                    user.id,
                    {
                        method:
                            req.method,
                        path:
                            req.path,
                        status:
                            res.statusCode
                    }
                );
            }
        );

        next();
    }
);

/* =========================================================
   106 — CLEAN OLD SESSIONS
========================================================= */

function cleanupSessions() {
    try {
        const sessions =
            getSessions();

        const cutoff =
            Date.now() -
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
                        Number.isFinite(
                            date
                        ) &&
                        date >=
                            cutoff
                    );
                }
            );

        if (
            filtered.length !==
            sessions.length
        ) {
            saveSessions(
                filtered
            );

            logInfo(
                `Eski session temizlendi: ${sessions.length - filtered.length}`
            );
        }
    } catch (error) {
        logError(
            "Session cleanup hatası",
            error
        );
    }
}

cleanupSessions();

/* =========================================================
   107 — DATABASE BACKUP
========================================================= */

function backupDatabase() {
    try {
        const backupDir =
            path.join(
                DATA_DIR,
                "backups"
            );

        ensureDir(
            backupDir
        );

        const backupName =
            `backup-${Date.now()}.json`;

        const backupPath =
            path.join(
                backupDir,
                backupName
            );

        const snapshot = {};

        for (
            const [
                key,
                file
            ] of Object.entries(DB)
        ) {
            snapshot[key] =
                readJSON(
                    file,
                    null
                );
        }

        writeJSON(
            backupPath,
            snapshot
        );

        const backups =
            fs.readdirSync(
                backupDir
            )
                .filter(
                    file =>
                        file.startsWith(
                            "backup-"
                        )
                )
                .sort()
                .reverse();

        for (
            const oldFile of
            backups.slice(10)
        ) {
            try {
                fs.unlinkSync(
                    path.join(
                        backupDir,
                        oldFile
                    )
                );
            } catch {}
        }

        logInfo(
            "Database backup oluşturuldu."
        );
    } catch (error) {
        logError(
            "Database backup hatası",
            error
        );
    }
}

/* =========================================================
   108 — PERIODIC BACKUP
========================================================= */

const backupTimer =
    setInterval(
        backupDatabase,
        6 * 60 * 60 * 1000
    );

backupTimer.unref();

/* =========================================================
   109 — TEMP CLEANUP
========================================================= */

function cleanupTempDirectory() {
    try {
        if (
            !fs.existsSync(
                TEMP_DIR
            )
        ) {
            return;
        }

        const files =
            fs.readdirSync(
                TEMP_DIR
            );

        const cutoff =
            Date.now() -
            24 *
                60 *
                60 *
                1000;

        for (
            const filename of
            files
        ) {
            const filePath =
                path.join(
                    TEMP_DIR,
                    filename
                );

            try {
                const stat =
                    fs.statSync(
                        filePath
                    );

                if (
                    stat.mtimeMs <
                    cutoff
                ) {
                    fs.rmSync(
                        filePath,
                        {
                            recursive:
                                true,
                            force:
                                true
                        }
                    );
                }
            } catch {}
        }
    } catch (error) {
        logError(
            "Temp cleanup hatası",
            error
        );
    }
}

cleanupTempDirectory();

/* =========================================================
   110 — CACHE CLEANUP
========================================================= */

function cleanupCacheDirectory() {
    try {
        if (
            !fs.existsSync(
                CACHE_DIR
            )
        ) {
            return;
        }

        const files =
            fs.readdirSync(
                CACHE_DIR
            );

        const cutoff =
            Date.now() -
            7 *
                24 *
                60 *
                60 *
                1000;

        for (
            const filename of
            files
        ) {
            const filePath =
                path.join(
                    CACHE_DIR,
                    filename
                );

            try {
                const stat =
                    fs.statSync(
                        filePath
                    );

                if (
                    stat.mtimeMs <
                    cutoff
                ) {
                    fs.rmSync(
                        filePath,
                        {
                            recursive:
                                true,
                            force:
                                true
                        }
                    );
                }
            } catch {}
        }
    } catch (error) {
        logError(
            "Cache cleanup hatası",
            error
        );
    }
}

cleanupCacheDirectory();

/* =========================================================
   111 — MEMORY AUTO SAVE
========================================================= */

function detectMemoryCandidate(
    userMessage
) {
    const text =
        cleanText(
            userMessage,
            2000
        );

    const normalized =
        normalizeText(text);

    const patterns = [
        "benim adim ",
        "adim ",
        "ben ",
        "favori ",
        "seviyorum ",
        "sevmiyorum ",
        "unutma ",
        "hatirla "
    ];

    for (
        const pattern of
        patterns
    ) {
        if (
            normalized.startsWith(
                pattern
            )
        ) {
            return text;
        }
    }

    return null;
}

function autoSaveMemory(
    userId,
    userMessage
) {
    if (
        userId === "guest"
    ) {
        return null;
    }

    const candidate =
        detectMemoryCandidate(
            userMessage
        );

    if (!candidate) {
        return null;
    }

    const existing =
        getUserMemories(
            userId
        ).find(
            memory =>
                normalizeText(
                    memory.content
                ) ===
                normalizeText(
                    candidate
                )
        );

    if (existing) {
        return existing;
    }

    return createMemory(
        userId,
        candidate,
        "auto"
    );
}

/* =========================================================
   112 — AUTO MEMORY ROUTE HOOK
========================================================= */

app.use(
    "/api/chat",
    (req, res, next) => {
        const originalJson =
            res.json.bind(res);

        res.json =
            function patchedJSON(
                payload
            ) {
                try {
                    if (
                        req.body?.message
                    ) {
                        const user =
                            getRequestUser(
                                req
                            );

                        autoSaveMemory(
                            user.id,
                            req.body.message
                        );
                    }
                } catch (error) {
                    logError(
                        "Auto memory hatası",
                        error
                    );
                }

                return originalJson(
                    payload
                );
            };

        next();
    }
);

/* =========================================================
   113 — MODEL SELECTION
========================================================= */

function normalizeModel(
    requested
) {
    const value =
        cleanText(
            requested,
            100
        ).toLowerCase();

    const aliases = {
        fast: "fast",
        hızlı: "fast",
        hizli: "fast",

        smart: "smart",
        akilli: "smart",
        akıllı: "smart",

        code: "code",
        kod: "code",

        research: "research",
        arastirma: "research",
        araştırma: "research",

        local: "local",
        yerel: "local"
    };

    return (
        aliases[value] ||
        "fast"
    );
}

function modelInstruction(
    model
) {
    switch (
        normalizeModel(model)
    ) {
        case "code":
            return `
Kod modundasın.
Kod örneklerini eksiksiz,
çalışabilir ve düzenli ver.
Gerekirse dosya yapısını belirt.
`;

        case "research":
            return `
Araştırma modundasın.
Güncel olmayan bilgileri kesin
gerçek gibi sunma.
Kaynaklardan gelen bilgiyi ayır.
`;

        case "smart":
            return `
Detaylı düşün ve cevabı mümkün
olduğunca doğru, anlaşılır ve
düzenli oluştur.
`;

        case "local":
            return `
Yerel cevap modundasın.
Kısa, net ve pratik cevap ver.
`;

        default:
            return `
Hızlı ve doğrudan cevap ver.
`;
    }
}

/* =========================================================
   114 — MODEL ROUTER
========================================================= */

async function generateModelAnswer(
    userId,
    chatId,
    message,
    requestedModel
) {
    const model =
        normalizeModel(
            requestedModel
        );

    if (
        model ===
        "local"
    ) {
        const local =
            localResponse(
                message
            );

        if (local) {
            return local;
        }

        return {
            text:
                "Bu soru için yerel cevap motorunda hazır bir yanıt bulunamadı.",
            provider:
                "local",
            model:
                "turkai-local",
            source:
                "local"
        };
    }

    const messages =
        buildMessages(
            userId,
            chatId,
            message
        );

    messages[0].content +=
        "\n\n" +
        modelInstruction(
            model
        );

    return callAI(
        messages
    );
}

/* =========================================================
   115 — MODEL INFO
========================================================= */

app.get(
    "/api/models",
    (req, res) => {
        res.json({
            success: true,
            models: [
                {
                    id:
                        "fast",
                    name:
                        "TürkAI Fast",
                    description:
                        "Hızlı günlük cevaplar."
                },
                {
                    id:
                        "smart",
                    name:
                        "TürkAI Smart",
                    description:
                        "Daha ayrıntılı cevaplar."
                },
                {
                    id:
                        "code",
                    name:
                        "TürkAI Code",
                    description:
                        "Yazılım ve kodlama."
                },
                {
                    id:
                        "research",
                    name:
                        "TürkAI Research",
                    description:
                        "Araştırma odaklı."
                },
                {
                    id:
                        "local",
                    name:
                        "TürkAI Local",
                    description:
                        "Yerel cevap motoru."
                }
            ]
        });
    }
);

/* =========================================================
   116 — MODEL CHAT ENDPOINT
========================================================= */

app.post(
    "/api/chat/model",
    chatUsageMiddleware,
    async (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const message =
                cleanText(
                    req.body?.message,
                    20000
                );

            const requestedModel =
                req.body?.model;

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Mesaj boş olamaz."
                });
            }

            let chatId =
                cleanText(
                    req.body?.chatId,
                    200
                );

            let chat =
                findChatById(
                    chatId
                );

            if (
                !chat ||
                chat.userId !==
                    user.id
            ) {
                chat =
                    createChat(
                        user.id,
                        message.slice(
                            0,
                            60
                        )
                    );

                chatId =
                    chat.id;
            }

            addMessage({
                chatId,
                userId:
                    user.id,
                role:
                    "user",
                content:
                    message,
                model:
                    normalizeModel(
                        requestedModel
                    ),
                source:
                    "user"
            });

            const answer =
                await generateModelAnswer(
                    user.id,
                    chatId,
                    message,
                    requestedModel
                );

            addMessage({
                chatId,
                userId:
                    user.id,
                role:
                    "assistant",
                content:
                    answer.text,
                model:
                    answer.model,
                source:
                    answer.source ||
                    answer.provider
            });

            res.json({
                success: true,
                reply:
                    answer.text,
                response:
                    answer.text,
                chatId,
                model:
                    answer.model,
                provider:
                    answer.provider,
                source:
                    answer.source ||
                    answer.provider
            });
        } catch (error) {
            logError(
                "Model chat hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Model cevabı oluşturulamadı."
            });
        }
    }
);

/* =========================================================
   117 — SEARCH MEMORY
========================================================= */

app.get(
    "/api/memory/search",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const q =
                normalizeText(
                    req.query.q
                );

            if (!q) {
                return res.json({
                    success: true,
                    memories: []
                });
            }

            const memories =
                getUserMemories(
                    user.id
                ).filter(
                    memory =>
                        normalizeText(
                            memory.content
                        ).includes(q)
                );

            res.json({
                success: true,
                memories
            });
        } catch (error) {
            logError(
                "Memory search hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Hafıza aranamadı."
            });
        }
    }
);

/* =========================================================
   118 — CHAT EXPORT
========================================================= */

app.get(
    "/api/chats/:id/export",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const chat =
                findChatById(
                    req.params.id
                );

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Sohbet bulunamadı."
                });
            }

            if (
                chat.userId !==
                user.id
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Yetkin yok."
                });
            }

            const messages =
                getChatMessages(
                    chat.id,
                    500
                );

            res.json({
                success: true,
                export: {
                    app:
                        APP_NAME,
                    version:
                        APP_VERSION,
                    chat,
                    messages,
                    exportedAt:
                        nowISO()
                }
            });
        } catch (error) {
            logError(
                "Chat export hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Sohbet dışa aktarılamadı."
            });
        }
    }
);

/* =========================================================
   119 — GLOBAL SEARCH
========================================================= */

app.get(
    "/api/search",
    (req, res) => {
        try {
            const user =
                getRequestUser(req);

            const query =
                normalizeText(
                    req.query.q
                );

            if (!query) {
                return res.json({
                    success: true,
                    results: []
                });
            }

            const results = [];

            for (
                const chat of
                getChats()
            ) {
                if (
                    chat.userId !==
                    user.id
                ) {
                    continue;
                }

                const messages =
                    getChatMessages(
                        chat.id,
                        100
                    );

                for (
                    const message of
                    messages
                ) {
                    if (
                        normalizeText(
                            message.content
                        ).includes(
                            query
                        )
                    ) {
                        results.push({
                            type:
                                "message",
                            chatId:
                                chat.id,
                            messageId:
                                message.id,
                            role:
                                message.role,
                            content:
                                message.content,
                            createdAt:
                                message.createdAt
                        });
                    }
                }
            }

            for (
                const project of
                getProjects()
            ) {
                if (
                    project.userId !==
                    user.id
                ) {
                    continue;
                }

                if (
                    normalizeText(
                        project.name
                    ).includes(
                        query
                    ) ||
                    normalizeText(
                        project.description
                    ).includes(
                        query
                    ) ||
                    normalizeText(
                        project.code
                    ).includes(
                        query
                    )
                ) {
                    results.push({
                        type:
                            "project",
                        projectId:
                            project.id,
                        name:
                            project.name,
                        description:
                            project.description
                    });
                }
            }

            res.json({
                success: true,
                results:
                    results.slice(
                        0,
                        100
                    )
            });
        } catch (error) {
            logError(
                "Global search hatası",
                error
            );

            res.status(500).json({
                success: false,
                error:
                    "Arama başarısız."
            });
        }
    }
);

/* =========================================================
   120 — PART 2 END
========================================================= */

logInfo(
    "TürkAI server modülleri 2/3 yüklendi."
);

/*
============================================================
 PARÇA 3'TE GELECEK:

 - Socket.IO
 - chat rooms
 - typing events
 - server info
 - /api ana endpoint
 - static frontend
 - public/index.html
 - 404 sistemi
 - error handler
 - shutdown
 - SERVER_INSTANCE
 - SIGINT / SIGTERM
 - uncaughtException
 - unhandledRejection
 - tek startServer()
 - Render uyumluluğu
============================================================
*/
// ============================================================
// TÜRKAI SERVER 12.0.0
// PART 3/3 — SOCKET.IO + STATIC + ERROR + STARTUP + SHUTDOWN
// ============================================================

console.log("[TürkAI] 3/3 modülleri yükleniyor...");

// ------------------------------------------------------------
// SOCKET.IO
// ------------------------------------------------------------

io.on("connection", (socket) => {
  const connectedAt = nowISO();

  console.log(`[Socket] bağlandı: ${socket.id}`);

  socket.emit("turkai:ready", {
    success: true,
    app: APP_NAME,
    version: APP_VERSION,
    socketId: socket.id,
    connectedAt
  });

  socket.on("turkai:ping", (payload = {}) => {
    socket.emit("turkai:pong", {
      success: true,
      timestamp: nowISO(),
      received: payload
    });
  });

  socket.on("chat:join", (chatId) => {
    if (!chatId) return;

    const room = String(chatId).trim();

    socket.join(`chat:${room}`);

    socket.emit("chat:joined", {
      success: true,
      chatId: room
    });
  });

  socket.on("chat:leave", (chatId) => {
    if (!chatId) return;

    const room = String(chatId).trim();

    socket.leave(`chat:${room}`);

    socket.emit("chat:left", {
      success: true,
      chatId: room
    });
  });

  socket.on("chat:typing", (data = {}) => {
    const chatId = cleanText(data.chatId || "", 200);

    if (!chatId) return;

    socket.to(`chat:${chatId}`).emit("chat:typing", {
      chatId,
      userId: data.userId || "guest",
      typing: Boolean(data.typing),
      timestamp: nowISO()
    });
  });

  socket.on("chat:message", async (data = {}) => {
    try {
      const chatId = cleanText(data.chatId || "", 100);
      const message = cleanText(data.message || "", 10000);

      if (!message) {
        socket.emit("chat:error", {
          success: false,
          error: "Mesaj boş olamaz."
        });
        return;
      }

      let chat = chatId ? findChatById(chatId) : null;

      if (!chat) {
        chat = createChat({
          userId: data.userId || "guest",
          title: message.slice(0, 60)
        });
      }

      addMessage(chat.id, {
        role: "user",
        content: message,
        model: data.model || "fast",
        source: "socket"
      });

      socket.emit("chat:status", {
        chatId: chat.id,
        status: "thinking"
      });

      const answer = await generateChatAnswer({
        message,
        model: data.model || "fast",
        user: {
          id: data.userId || "guest",
          plan: data.plan || "free"
        },
        chatId: chat.id
      });

      addMessage(chat.id, {
        role: "assistant",
        content: answer.reply,
        model: answer.model,
        source: answer.source
      });

      io.to(`chat:${chat.id}`).emit("chat:response", {
        success: true,
        chatId: chat.id,
        reply: answer.reply,
        response: answer.reply,
        message: answer.reply,
        text: answer.reply,
        source: answer.source,
        model: answer.model,
        timestamp: nowISO()
      });

      socket.emit("chat:status", {
        chatId: chat.id,
        status: "complete"
      });

    } catch (error) {
      logError("socket-chat", error);

      socket.emit("chat:error", {
        success: false,
        error: "AI yanıtı oluşturulurken bir hata oluştu."
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `[Socket] ayrıldı: ${socket.id} | ${reason}`
    );
  });
});

// ------------------------------------------------------------
// SOCKET STATUS
// ------------------------------------------------------------

app.get("/api/socket/status", (req, res) => {
  res.json({
    success: true,
    socket: {
      enabled: true,
      connected: io.engine?.clientsCount || 0
    },
    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// SERVER INFO
// ------------------------------------------------------------

app.get("/api/server/info", (req, res) => {
  const memory = process.memoryUsage();

  res.json({
    success: true,

    app: {
      name: APP_NAME,
      version: APP_VERSION,
      description: APP_DESCRIPTION,
      environment: NODE_ENV,
      production: IS_PRODUCTION
    },

    server: {
      id: SERVER_ID,
      startedAt: START_TIME,
      uptimeSeconds: Math.floor(process.uptime()),
      node: process.version,
      platform: process.platform,
      architecture: process.arch
    },

    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external
    },

    database: {
      directory: DATA_DIR,
      ready: true
    },

    socket: {
      enabled: true,
      clients: io.engine?.clientsCount || 0
    },

    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// MAIN API INFORMATION
// ------------------------------------------------------------

app.get("/api", (req, res) => {
  res.json({
    success: true,

    name: APP_NAME,
    version: APP_VERSION,

    message: "TürkAI API aktif.",

    endpoints: {
      health: "GET /api/health",
      status: "GET /api/status",
      serverInfo: "GET /api/server/info",
      socket: "GET /api/socket/status",

      chat: "POST /api/chat",

      plans: "GET /api/plans",
      me: "GET /api/me",
      models: "GET /api/models",

      projects: "GET /api/projects",
      memory: "GET /api/memory/search",
      research: "POST /api/research",

      upload: "POST /api/upload",

      image: "POST /api/generate/image",
      video: "POST /api/generate/video",

      settings: "GET /api/settings",
      notifications: "GET /api/notifications"
    },

    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// STATIC FILES
// ------------------------------------------------------------

const PUBLIC_DIR = path.join(ROOT_DIR, "public");

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(
    express.static(PUBLIC_DIR, {
      extensions: ["html"],
      maxAge: IS_PRODUCTION ? "1h" : 0
    })
  );

  console.log(
    `[TürkAI] public klasörü aktif: ${PUBLIC_DIR}`
  );
}

// ------------------------------------------------------------
// ROOT PAGE
// ------------------------------------------------------------

app.get("/", (req, res) => {
  const indexFile = path.join(PUBLIC_DIR, "index.html");

  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  res.status(200).send(`
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
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
  color:#fff;
  font-family:Arial,Helvetica,sans-serif;
}

.container{
  width:min(700px,92%);
  padding:32px;
  border:1px solid rgba(255,255,255,.08);
  border-radius:24px;
  background:rgba(255,255,255,.035);
  text-align:center;
  box-shadow:0 20px 80px rgba(0,0,0,.35);
}

h1{
  margin:0 0 10px;
  font-size:42px;
}

p{
  color:#9da5b4;
  line-height:1.6;
}

.status{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:9px 14px;
  border-radius:999px;
  background:rgba(50,220,150,.1);
  color:#5de6a7;
  border:1px solid rgba(50,220,150,.2);
}

.dot{
  width:8px;
  height:8px;
  border-radius:50%;
  background:#5de6a7;
}

a{
  display:inline-block;
  margin-top:20px;
  padding:12px 18px;
  border-radius:12px;
  background:#7c5cff;
  color:#fff;
  text-decoration:none;
}
</style>
</head>

<body>

<div class="container">

  <div class="status">
    <span class="dot"></span>
    TürkAI API aktif
  </div>

  <h1>TürkAI</h1>

  <p>
    Yapay zekâ sunucusu başarıyla çalışıyor.
  </p>

  <p>
    API: <strong>/api</strong><br>
    Health: <strong>/api/health</strong>
  </p>

  <a href="/api/health">
    Sunucu Durumunu Gör
  </a>

</div>

</body>
</html>
  `);
});

// ------------------------------------------------------------
// API 404
// ------------------------------------------------------------

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint bulunamadı.",
    path: req.originalUrl,
    method: req.method,
    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// GLOBAL 404
// ------------------------------------------------------------

app.use((req, res) => {
  if (
    req.method === "GET" &&
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
  display:flex;
  align-items:center;
  justify-content:center;
  background:#090b10;
  color:white;
  font-family:Arial,sans-serif;
}

.box{
  text-align:center;
  padding:35px;
}

.code{
  font-size:80px;
  font-weight:800;
  margin-bottom:10px;
}

p{
  color:#9299a8;
}

a{
  display:inline-block;
  margin-top:15px;
  padding:12px 18px;
  background:#7c5cff;
  color:white;
  border-radius:12px;
  text-decoration:none;
}
</style>
</head>
<body>
<div class="box">
<div class="code">404</div>
<h1>Sayfa bulunamadı</h1>
<p>Aradığın TürkAI sayfası mevcut değil.</p>
<a href="/">Ana Sayfaya Dön</a>
</div>
</body>
</html>
    `);
  }

  res.status(404).json({
    success: false,
    error: "Sayfa bulunamadı.",
    path: req.originalUrl,
    method: req.method,
    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// GLOBAL ERROR HANDLER
// ------------------------------------------------------------

app.use((error, req, res, next) => {
  logError("express", error);

  if (res.headersSent) {
    return next(error);
  }

  const statusCode =
    Number(error.statusCode) ||
    Number(error.status) ||
    500;

  res.status(statusCode).json({
    success: false,
    error:
      IS_PRODUCTION
        ? "Sunucu tarafında bir hata oluştu."
        : error.message || "Bilinmeyen sunucu hatası.",

    requestId:
      req.requestId ||
      null,

    timestamp: nowISO()
  });
});

// ------------------------------------------------------------
// SERVER INSTANCE
// ------------------------------------------------------------

// !!! BU DOSYADA SERVER_INSTANCE SADECE BİR KEZ TANIMLI OLMALI !!!
let SERVER_INSTANCE = null;

// !!! BU DOSYADA shuttingDown SADECE BİR KEZ TANIMLI OLMALI !!!
let shuttingDown = false;

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

function startServer() {

  if (SERVER_INSTANCE) {
    console.log("[TürkAI] Sunucu zaten çalışıyor.");
    return SERVER_INSTANCE;
  }

  SERVER_INSTANCE = httpServer.listen(
    PORT,
    HOST,
    () => {

      SERVER_STATE.started = true;
      SERVER_STATE.startTime = nowISO();
      SERVER_STATE.port = PORT;
      SERVER_STATE.host = HOST;

      console.log("");
      console.log("==========================================");
      console.log("             TÜRKAI SERVER");
      console.log("==========================================");
      console.log(`APP       : ${APP_NAME}`);
      console.log(`VERSION   : ${APP_VERSION}`);
      console.log(`ENV       : ${NODE_ENV}`);
      console.log(`HOST      : ${HOST}`);
      console.log(`PORT      : ${PORT}`);
      console.log(`NODE      : ${process.version}`);
      console.log(`SERVER ID : ${SERVER_ID}`);
      console.log("------------------------------------------");
      console.log(`API       : http://${HOST}:${PORT}/api`);
      console.log(`HEALTH    : http://${HOST}:${PORT}/api/health`);
      console.log(`STATUS    : http://${HOST}:${PORT}/api/status`);
      console.log("------------------------------------------");
      console.log("Socket.IO : AKTİF");
      console.log("AI        : AKTİF");
      console.log("DATABASE  : AKTİF");
      console.log("==========================================");
      console.log("");

      logInfo("server", {
        event: "started",
        host: HOST,
        port: PORT,
        version: APP_VERSION,
        serverId: SERVER_ID
      });
    }
  );

  SERVER_INSTANCE.on("error", (error) => {

    logError("server", error);

    if (error.code === "EADDRINUSE") {

      console.error(
        `[TürkAI] ${PORT} portu zaten kullanımda.`
      );

      process.exitCode = 1;
    }
  });

  return SERVER_INSTANCE;
}

// ------------------------------------------------------------
// GRACEFUL SHUTDOWN
// ------------------------------------------------------------

async function shutdown(signal = "UNKNOWN") {

  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(
    `[TürkAI] ${signal} alındı. Sunucu kapatılıyor...`
  );

  logInfo("server", {
    event: "shutdown",
    signal
  });

  SERVER_STATE.shuttingDown = true;

  try {

    for (const socket of io.sockets.sockets.values()) {
      socket.disconnect(true);
    }

    console.log("[TürkAI] Socket bağlantıları kapatıldı.");

  } catch (error) {

    logError("socket-shutdown", error);
  }

  try {

    if (SERVER_INSTANCE) {

      await new Promise((resolve) => {

        SERVER_INSTANCE.close(() => {
          resolve();
        });

      });

      SERVER_INSTANCE = null;
    }

    console.log("[TürkAI] HTTP sunucusu kapatıldı.");

  } catch (error) {

    logError("http-shutdown", error);
  }

  try {

    saveUsers(getUsers());
    saveSessions(getSessions());
    saveChats(getChats());

    console.log("[TürkAI] Veriler kaydedildi.");

  } catch (error) {

    logError("database-shutdown", error);
  }

  SERVER_STATE.started = false;

  console.log("[TürkAI] Güvenli kapanış tamamlandı.");

  process.exit(0);
}

// ------------------------------------------------------------
// PROCESS EVENTS
// ------------------------------------------------------------

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {

  logError("uncaughtException", error);

  console.error(
    "[TürkAI] Yakalanmamış kritik hata:",
    error
  );

  /*
   * Sunucuyu anında kapatmak yerine
   * Render/Node ortamının loglamasına izin veriyoruz.
   */
});

process.on("unhandledRejection", (reason) => {

  logError("unhandledRejection", reason);

  console.error(
    "[TürkAI] Yakalanmamış Promise hatası:",
    reason
  );
});

// ------------------------------------------------------------
// MODULE EXPORTS
// ------------------------------------------------------------

module.exports = {
  app,
  httpServer,
  io,
  startServer,
  shutdown,

  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,

  SERVER_ID,
  START_TIME,

  PORT,
  HOST,

  DATA_DIR,
  DB,

  PLANS,

  SERVER_STATE
};

// ------------------------------------------------------------
// DIRECT START
// ------------------------------------------------------------

if (require.main === module) {
  startServer();
}

// ------------------------------------------------------------
// FINAL LOAD MESSAGE
// ------------------------------------------------------------

console.log(
  "[TürkAI] 3/3 yüklendi."
);

console.log(
  "[TürkAI] Server hazır."
);
