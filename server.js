"use strict";

/*
╔══════════════════════════════════════════════════════════════════════╗
║                         TÜRKAI SERVER                              ║
║                         CORE ENGINE                                ║
║                         VERSION 14.0                               ║
╚══════════════════════════════════════════════════════════════════════╝

PART 1
──────────────────────────────────────────────────────────────────────
• Express
• HTTP
• Socket.IO
• Security
• CORS
• Helmet
• JSON
• Database
• Users
• Sessions
• Plans
• Usage
• Chat
• AI Providers
• Local AI
• Provider fallback
• Health
• Status
• Server diagnostics

PART 2:
Memory / Knowledge / Research / Files / Projects / Admin / Security...

PART 3:
Socket runtime / Static frontend / SPA / Shutdown / Production...
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


// ═══════════════════════════════════════════════════════════════════
// APPLICATION INFORMATION
// ═══════════════════════════════════════════════════════════════════

const APP_NAME = "TürkAI";

const APP_VERSION = "14.0.0";

const APP_DESCRIPTION =
    "Türkçe yapay zekâ, araştırma, kodlama ve üretkenlik platformu";

const NODE_ENV =
    process.env.NODE_ENV || "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

const PORT =
    Number(process.env.PORT) || 10000;

const HOST =
    process.env.HOST || "0.0.0.0";

const START_TIME =
    Date.now();

const SERVER_ID =
    process.env.RENDER_INSTANCE_ID ||
    crypto.randomBytes(12).toString("hex");


// ═══════════════════════════════════════════════════════════════════
// EXPRESS / HTTP
// ═══════════════════════════════════════════════════════════════════

const app = express();

const httpServer =
    http.createServer(app);


// ═══════════════════════════════════════════════════════════════════
// SOCKET.IO
// ═══════════════════════════════════════════════════════════════════

const io = new Server(
    httpServer,
    {
        cors: {
            origin: "*",
            methods: [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE"
            ]
        },

        transports: [
            "websocket",
            "polling"
        ]
    }
);


// ═══════════════════════════════════════════════════════════════════
// DIRECTORIES
// ═══════════════════════════════════════════════════════════════════

const ROOT_DIR =
    __dirname;

const DATA_DIR =
    path.join(ROOT_DIR, "data");

const DATABASE_DIR =
    path.join(ROOT_DIR, "database");

const STORAGE_DIR =
    path.join(ROOT_DIR, "storage");

const USERS_DIR =
    path.join(STORAGE_DIR, "users");

const UPLOADS_DIR =
    path.join(STORAGE_DIR, "uploads");

const GENERATED_DIR =
    path.join(STORAGE_DIR, "generated");

const LOGS_DIR =
    path.join(STORAGE_DIR, "logs");

const CACHE_DIR =
    path.join(STORAGE_DIR, "cache");

const TEMP_DIR =
    path.join(STORAGE_DIR, "temp");

const PUBLIC_DIR =
    path.join(ROOT_DIR, "public");


const DIRECTORIES = [
    DATA_DIR,
    DATABASE_DIR,
    STORAGE_DIR,
    USERS_DIR,
    UPLOADS_DIR,
    GENERATED_DIR,
    LOGS_DIR,
    CACHE_DIR,
    TEMP_DIR,
    PUBLIC_DIR
];


for (const directory of DIRECTORIES) {

    try {

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

    } catch (error) {

        console.error(
            "[DIRECTORY ERROR]",
            directory,
            error.message
        );

    }

}


// ═══════════════════════════════════════════════════════════════════
// DATABASE FILES
// ═══════════════════════════════════════════════════════════════════

const DB_FILES = {

    users:
        path.join(
            DATABASE_DIR,
            "users.json"
        ),

    sessions:
        path.join(
            DATABASE_DIR,
            "sessions.json"
        ),

    chats:
        path.join(
            DATABASE_DIR,
            "chats.json"
        ),

    messages:
        path.join(
            DATABASE_DIR,
            "messages.json"
        ),

    memories:
        path.join(
            DATABASE_DIR,
            "memories.json"
        ),

    knowledge:
        path.join(
            DATABASE_DIR,
            "knowledge.json"
        ),

    usage:
        path.join(
            DATABASE_DIR,
            "usage.json"
        ),

    files:
        path.join(
            DATABASE_DIR,
            "files.json"
        ),

    projects:
        path.join(
            DATABASE_DIR,
            "projects.json"
        ),

    research:
        path.join(
            DATABASE_DIR,
            "research.json"
        ),

    payments:
        path.join(
            DATABASE_DIR,
            "payments.json"
        ),

    notifications:
        path.join(
            DATABASE_DIR,
            "notifications.json"
        ),

    audit:
        path.join(
            DATABASE_DIR,
            "audit.json"
        ),

    security:
        path.join(
            DATABASE_DIR,
            "security.json"
        ),

    settings:
        path.join(
            DATABASE_DIR,
            "settings.json"
        )

};


// ═══════════════════════════════════════════════════════════════════
// DEFAULT DATABASE CONTENT
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_DATABASE = {

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

        allowRegistration: true,

        maxUploadMB: 25,

        defaultModel: "fast",

        version: APP_VERSION,

        updatedAt: null

    }

};


// ═══════════════════════════════════════════════════════════════════
// DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

function ensureDatabase() {

    for (const [name, file] of Object.entries(DB_FILES)) {

        if (!fs.existsSync(file)) {

            const defaultValue =
                DEFAULT_DATABASE[name];

            writeJSON(
                file,
                defaultValue
            );

        }

    }

}


function readJSON(file, fallback = null) {

    try {

        if (!fs.existsSync(file)) {

            return fallback;

        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!raw.trim()) {

            return fallback;

        }

        return JSON.parse(raw);

    } catch (error) {

        logError(
            "JSON_READ_ERROR",
            {
                file,
                error: error.message
            }
        );

        return fallback;

    }

}


function writeJSON(file, data) {

    try {

        const temporaryFile =
            `${file}.tmp`;

        fs.writeFileSync(
            temporaryFile,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temporaryFile,
            file
        );

        return true;

    } catch (error) {

        console.error(
            "[JSON_WRITE_ERROR]",
            file,
            error.message
        );

        return false;

    }

}


ensureDatabase();


// ═══════════════════════════════════════════════════════════════════
// LOGGING ENGINE
// ═══════════════════════════════════════════════════════════════════

function nowISO() {

    return new Date().toISOString();

}


function createId(prefix = "id") {

    return (
        `${prefix}_` +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(6)
            .toString("hex")
    );

}


function createToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");

}


function cleanText(value, maxLength = 20000) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }

    return String(value)
        .replace(/\u0000/g, "")
        .trim()
        .slice(0, maxLength);

}


function normalizeText(value) {

    return cleanText(
        value,
        50000
    )
        .toLocaleLowerCase("tr-TR")
        .normalize("NFKC");

}


function logTo(fileName, data) {

    try {

        const file =
            path.join(
                LOGS_DIR,
                fileName
            );

        const line =
            JSON.stringify({
                timestamp: nowISO(),
                ...data
            }) + "\n";

        fs.appendFileSync(
            file,
            line,
            "utf8"
        );

    } catch (error) {

        console.error(
            "[LOG ERROR]",
            error.message
        );

    }

}


function logInfo(message, extra = {}) {

    console.log(
        `[${nowISO()}] INFO: ${message}`
    );

    logTo(
        "server.log",
        {
            level: "info",
            message,
            ...extra
        }
    );

}


function logError(message, extra = {}) {

    console.error(
        `[${nowISO()}] ERROR: ${message}`
    );

    logTo(
        "error.log",
        {
            level: "error",
            message,
            ...extra
        }
    );

}


function logSecurity(message, extra = {}) {

    console.warn(
        `[${nowISO()}] SECURITY: ${message}`
    );

    logTo(
        "security.log",
        {
            level: "security",
            message,
            ...extra
        }
    );

}


function logAI(message, extra = {}) {

    logTo(
        "ai.log",
        {
            level: "ai",
            message,
            ...extra
        }
    );

}


// ═══════════════════════════════════════════════════════════════════
// EXPRESS SECURITY
// ═══════════════════════════════════════════════════════════════════

app.disable("x-powered-by");


app.use(
    helmet(
        {
            contentSecurityPolicy: false,

            crossOriginEmbedderPolicy: false,

            crossOriginResourcePolicy: {
                policy: "cross-origin"
            }
        }
    )
);


app.use(
    cors(
        {
            origin: true,

            credentials: true,

            methods: [
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
            ],

            allowedHeaders: [
                "Content-Type",
                "Authorization",
                "X-User-ID",
                "X-Requested-With",
                "X-Request-ID"
            ]
        }
    )
);


app.use(
    express.json(
        {
            limit: "25mb"
        }
    )
);


app.use(
    express.urlencoded(
        {
            extended: true,
            limit: "25mb"
        }
    )
);


// ═══════════════════════════════════════════════════════════════════
// REQUEST LOGGER
// ═══════════════════════════════════════════════════════════════════

app.use(
    (req, res, next) => {

        const started =
            Date.now();

        res.on(
            "finish",
            () => {

                const duration =
                    Date.now() - started;

                logTo(
                    "access.log",
                    {
                        method: req.method,
                        path: req.originalUrl,
                        status: res.statusCode,
                        duration,
                        ip:
                            req.headers["x-forwarded-for"] ||
                            req.socket.remoteAddress
                    }
                );

            }
        );

        next();

    }
);


// ═══════════════════════════════════════════════════════════════════
// USER ENGINE
// ═══════════════════════════════════════════════════════════════════

function getUsers() {

    return readJSON(
        DB_FILES.users,
        []
    );

}


function saveUsers(users) {

    return writeJSON(
        DB_FILES.users,
        users
    );

}


function findUserById(id) {

    if (!id) {

        return null;

    }

    const users =
        getUsers();

    return (
        users.find(
            user =>
                user.id === id
        ) || null
    );

}


function findUserByEmail(email) {

    const normalized =
        normalizeText(email);

    if (!normalized) {

        return null;

    }

    const users =
        getUsers();

    return (
        users.find(
            user =>
                normalizeText(
                    user.email
                ) === normalized
        ) || null
    );

}


function createUser(options = {}) {

    const email =
        cleanText(
            options.email,
            320
        );

    const name =
        cleanText(
            options.name ||
            "TürkAI Kullanıcısı",
            100
        );

    const existing =
        email
            ? findUserByEmail(email)
            : null;

    if (existing) {

        return existing;

    }

    const user = {

        id:
            createId("user"),

        email,

        name,

        plan:
            options.plan ||
            "free",

        avatar:
            options.avatar ||
            null,

        active: true,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        lastSeenAt:
            nowISO()

    };

    const users =
        getUsers();

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

        active: true,

        guest: true

    };

}


// ═══════════════════════════════════════════════════════════════════
// SESSION ENGINE
// ═══════════════════════════════════════════════════════════════════

function getSessions() {

    return readJSON(
        DB_FILES.sessions,
        []
    );

}


function saveSessions(sessions) {

    return writeJSON(
        DB_FILES.sessions,
        sessions
    );

}


function createSession(userId) {

    const token =
        createToken();

    const session = {

        id:
            createId("session"),

        token,

        userId,

        createdAt:
            nowISO(),

        lastUsedAt:
            nowISO(),

        expiresAt:
            new Date(
                Date.now() +
                1000 * 60 * 60 * 24 * 30
            ).toISOString()

    };

    const sessions =
        getSessions();

    sessions.push(session);

    saveSessions(sessions);

    return session;

}


function getSessionByToken(token) {

    if (!token) {

        return null;

    }

    const sessions =
        getSessions();

    const session =
        sessions.find(
            item =>
                item.token === token
        );

    if (!session) {

        return null;

    }

    if (
        session.expiresAt &&
        Date.now() >
        new Date(
            session.expiresAt
        ).getTime()
    ) {

        return null;

    }

    return session;

}


function getRequestUser(req) {

    const authorization =
        req.headers.authorization || "";

    if (
        authorization
            .toLowerCase()
            .startsWith("bearer ")
    ) {

        const token =
            authorization
                .slice(7)
                .trim();

        const session =
            getSessionByToken(token);

        if (session) {

            const user =
                findUserById(
                    session.userId
                );

            if (user) {

                user.lastSeenAt =
                    nowISO();

                return user;

            }

        }

    }


    const userId =
        req.headers["x-user-id"];

    if (userId) {

        const user =
            findUserById(
                String(userId)
            );

        if (user) {

            return user;

        }

    }


    return getGuestUser();

}


// ═══════════════════════════════════════════════════════════════════
// PLAN ENGINE
// ═══════════════════════════════════════════════════════════════════

const PLANS = {

    free: {

        id: "free",

        name: "Free",

        price: 0,

        messages: 50,

        research: 5,

        images: 0,

        videos: 0,

        storageMB: 10

    },

    pro: {

        id: "pro",

        name: "Pro",

        price: 250,

        messages: 100,

        research: 25,

        images: 2,

        videos: 0,

        storageMB: 25

    },

    plus: {

        id: "plus",

        name: "Plus",

        price: 500,

        messages: 200,

        research: 75,

        images: 4,

        videos: 5,

        storageMB: 50

    },

    ultra: {

        id: "ultra",

        name: "Ultra",

        price: 1000,

        messages: 1000,

        research: 250,

        images: 10,

        videos: 15,

        storageMB: 100

    },

    developer: {

        id: "developer",

        name: "Developer",

        price: 0,

        messages: 400,

        research: 500,

        images: 50,

        videos: 50,

        storageMB: 200

    }

};


function getPlan(user) {

    if (
        user &&
        PLANS[user.plan]
    ) {

        return PLANS[user.plan];

    }

    return PLANS.free;

}


// ═══════════════════════════════════════════════════════════════════
// CHAT DATABASE
// ═══════════════════════════════════════════════════════════════════

function getChats() {

    return readJSON(
        DB_FILES.chats,
        []
    );

}


function saveChats(chats) {

    return writeJSON(
        DB_FILES.chats,
        chats
    );

}


function getMessages() {

    return readJSON(
        DB_FILES.messages,
        []
    );

}


function saveMessages(messages) {

    return writeJSON(
        DB_FILES.messages,
        messages
    );

}


function createChat(user, title = "Yeni sohbet") {

    const chat = {

        id:
            createId("chat"),

        userId:
            user.id,

        title:
            cleanText(
                title,
                200
            ) ||
            "Yeni sohbet",

        model:
            "fast",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        archived: false

    };

    const chats =
        getChats();

    chats.push(chat);

    saveChats(chats);

    return chat;

}


function findChatById(id) {

    if (!id) {

        return null;

    }

    const chats =
        getChats();

    return (
        chats.find(
            chat =>
                chat.id === id
        ) || null
    );

}


function addMessage(
    chatId,
    userId,
    role,
    content,
    metadata = {}
) {

    const message = {

        id:
            createId("msg"),

        chatId,

        userId,

        role,

        content:
            cleanText(
                content,
                50000
            ),

        metadata,

        createdAt:
            nowISO()

    };

    const messages =
        getMessages();

    messages.push(message);

    saveMessages(messages);

    return message;

}


function getChatMessages(
    chatId,
    limit = 40
) {

    const messages =
        getMessages();

    return messages
        .filter(
            message =>
                message.chatId === chatId
        )
        .slice(-Math.max(
            1,
            Math.min(
                Number(limit) || 40,
                100
            )
        ));

}


// ═══════════════════════════════════════════════════════════════════
// AI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const GROQ_API_KEY =
    process.env.GROQ_API_KEY ||
    "";

const CEREBRAS_API_KEY =
    process.env.CEREBRAS_API_KEY ||
    "";

const OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY ||
    "";

const GEMINI_API_KEY =
    process.env.GEMINI_API_KEY ||
    "";


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


// ═══════════════════════════════════════════════════════════════════
// TÜRKAI SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════

const TURKAI_SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe odaklı, modern, yardımcı ve güvenilir bir yapay zekâ
asistanısın.

Temel kurallar:

1. Kullanıcı Türkçe konuşuyorsa Türkçe cevap ver.
2. Kullanıcı başka bir dil kullanıyorsa gerektiğinde o dilde cevap ver.
3. Kod istenirse kodu doğrudan ve çalışabilir şekilde üret.
4. Kullanıcı "en baştan en sona" diyorsa eksik parça bırakma.
5. Bilmediğin bilgiyi kesin gerçek gibi söyleme.
6. Güncel bilgi gerekiyorsa araştırma sistemini kullanabilecek şekilde
   cevap oluştur.
7. Kullanıcı bir hata mesajı verirse hatanın nedenini açıkla ve
   düzeltilmiş kodu ver.
8. Gereksiz uzun girişler yapma.
9. Kullanıcı "knk" gibi samimi konuşuyorsa doğal ve samimi ol.
10. UI kodlarında mümkün olduğunca emoji yerine ikon yaklaşımını tercih et.
11. Güvenli olmayan veya zararlı kullanım taleplerinde güvenli alternatif
    sun.
12. Kullanıcı kod istediğinde kodun hangi dosyaya konacağını belirt.
13. Aynı soruya gereksiz şekilde tekrar tekrar cevap verme.

Özel cevap:

Kullanıcı tam olarak veya anlam olarak
"En hızlı kim?" diye sorarsa:

TürkAI ⚡🤖

cevabını ver.
`;


// ═══════════════════════════════════════════════════════════════════
// FETCH WITH TIMEOUT
// ═══════════════════════════════════════════════════════════════════

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

        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(timer);

    }

}


// ═══════════════════════════════════════════════════════════════════
// GROQ
// ═══════════════════════════════════════════════════════════════════

async function callGroq(messages) {

    if (!GROQ_API_KEY) {

        throw new Error(
            "GROQ_API_KEY bulunamadı."
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

                    "Authorization":
                        `Bearer ${GROQ_API_KEY}`
                },

                body:
                    JSON.stringify({
                        model:
                            GROQ_MODEL,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            30000
        );


    const data =
        await response.json()
            .catch(
                () => ({})
            );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            `Groq HTTP ${response.status}`
        );

    }


    const text =
        data?.choices?.[0]?.message?.content;

    if (!text) {

        throw new Error(
            "Groq boş cevap döndürdü."
        );

    }


    return {

        text,

        provider:
            "groq",

        model:
            GROQ_MODEL

    };

}


// ═══════════════════════════════════════════════════════════════════
// CEREBRAS
// ═══════════════════════════════════════════════════════════════════

async function callCerebras(messages) {

    if (!CEREBRAS_API_KEY) {

        throw new Error(
            "CEREBRAS_API_KEY bulunamadı."
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

                    "Authorization":
                        `Bearer ${CEREBRAS_API_KEY}`
                },

                body:
                    JSON.stringify({
                        model:
                            CEREBRAS_MODEL,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            30000
        );


    const data =
        await response.json()
            .catch(
                () => ({})
            );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            `Cerebras HTTP ${response.status}`
        );

    }


    const text =
        data?.choices?.[0]?.message?.content;

    if (!text) {

        throw new Error(
            "Cerebras boş cevap döndürdü."
        );

    }


    return {

        text,

        provider:
            "cerebras",

        model:
            CEREBRAS_MODEL

    };

}


// ═══════════════════════════════════════════════════════════════════
// OPENROUTER
// ═══════════════════════════════════════════════════════════════════

async function callOpenRouter(messages) {

    if (!OPENROUTER_API_KEY) {

        throw new Error(
            "OPENROUTER_API_KEY bulunamadı."
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

                    "Authorization":
                        `Bearer ${OPENROUTER_API_KEY}`,

                    "HTTP-Referer":
                        "https://turkai.app",

                    "X-Title":
                        "TürkAI"
                },

                body:
                    JSON.stringify({
                        model:
                            OPENROUTER_MODEL,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            30000
        );


    const data =
        await response.json()
            .catch(
                () => ({})
            );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            `OpenRouter HTTP ${response.status}`
        );

    }


    const text =
        data?.choices?.[0]?.message?.content;

    if (!text) {

        throw new Error(
            "OpenRouter boş cevap döndürdü."
        );

    }


    return {

        text,

        provider:
            "openrouter",

        model:
            OPENROUTER_MODEL

    };

}


// ═══════════════════════════════════════════════════════════════════
// GEMINI
// ═══════════════════════════════════════════════════════════════════

async function callGemini(messages) {

    if (!GEMINI_API_KEY) {

        throw new Error(
            "GEMINI_API_KEY bulunamadı."
        );

    }


    const systemParts =
        messages
            .filter(
                message =>
                    message.role === "system"
            )
            .map(
                message =>
                    message.content
            );


    const conversation =
        messages
            .filter(
                message =>
                    message.role !== "system"
            )
            .map(
                message => ({
                    role:
                        message.role === "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text:
                                message.content
                        }
                    ]
                })
            );


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;


    const response =
        await fetchWithTimeout(
            url,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        systemInstruction:
                            systemParts.length
                                ? {
                                    parts: [
                                        {
                                            text:
                                                systemParts.join(
                                                    "\n\n"
                                                )
                                        }
                                    ]
                                }
                                : undefined,

                        contents:
                            conversation,

                        generationConfig: {

                            temperature:
                                0.7,

                            maxOutputTokens:
                                4096

                        }

                    })
            },
            30000
        );


    const data =
        await response.json()
            .catch(
                () => ({})
            );


    if (!response.ok) {

        throw new Error(
            data?.error?.message ||
            `Gemini HTTP ${response.status}`
        );

    }


    const text =
        data
            ?.candidates?.[0]
            ?.content
            ?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            .join("")
            .trim();


    if (!text) {

        throw new Error(
            "Gemini boş cevap döndürdü."
        );

    }


    return {

        text,

        provider:
            "gemini",

        model:
            GEMINI_MODEL

    };

}


// ═══════════════════════════════════════════════════════════════════
// LOCAL RESPONSE ENGINE
// ═══════════════════════════════════════════════════════════════════

function solveSimpleMath(text) {

    const expression =
        cleanText(
            text,
            200
        )
            .replace(/,/g, ".")
            .trim();


    if (
        !/^[0-9+\-*/().%\s]+$/
            .test(expression)
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

        const safeExpression =
            expression
                .replace(
                    /(\d+(?:\.\d+)?)%/g,
                    "($1/100)"
                );


        const result =
            Function(
                `"use strict"; return (${safeExpression});`
            )();


        if (
            typeof result !== "number" ||
            !Number.isFinite(result)
        ) {

            return null;

        }


        return String(
            Math.round(
                result * 100000000
            ) / 100000000
        );

    } catch {

        return null;

    }

}


function localResponse(message) {

    const text =
        normalizeText(message);


    if (!text) {

        return {

            text:
                "Buradayım. Ne yapmak istediğini yazabilirsin.",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    if (
        text === "en hızlı kim?" ||
        text === "en hizli kim?" ||
        text.includes("en hızlı kim")
    ) {

        return {

            text:
                "TürkAI ⚡🤖",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    const math =
        solveSimpleMath(
            message
        );


    if (math !== null) {

        return {

            text:
                `Sonuç: ${math}`,

            provider:
                "local",

            model:
                "turkai-math"

        };

    }


    if (
        /^(merhaba|selam|sa|selamlar|hey|hello|hi)\b/
            .test(text)
    ) {

        return {

            text:
                "Selam knk! 👋 TürkAI burada. Ne yapıyoruz?",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    if (
        text.includes("sen kimsin") ||
        text.includes("nesin sen") ||
        text.includes("türkai nedir")
    ) {

        return {

            text:
                "Ben TürkAI'yım. Türkçe odaklı yapay zekâ, kodlama, araştırma ve üretkenlik özellikleri için tasarlanmış bir asistanım.",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    if (
        text.includes("teşekkür") ||
        text.includes("sağ ol") ||
        text.includes("eyvallah")
    ) {

        return {

            text:
                "Rica ederim knk. 😎",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    return null;

}


// ═══════════════════════════════════════════════════════════════════
// AI MESSAGE BUILDER
// ═══════════════════════════════════════════════════════════════════

function buildMessages(
    userMessage,
    history = []
) {

    const messages = [

        {
            role:
                "system",

            content:
                TURKAI_SYSTEM_PROMPT
        }

    ];


    for (
        const item of history.slice(-20)
    ) {

        if (
            item.role !== "user" &&
            item.role !== "assistant"
        ) {

            continue;

        }


        const content =
            cleanText(
                item.content,
                12000
            );


        if (!content) {

            continue;

        }


        messages.push({

            role:
                item.role,

            content

        });

    }


    messages.push({

        role:
            "user",

        content:
            cleanText(
                userMessage,
                20000
            )

    });


    return messages;

}


// ═══════════════════════════════════════════════════════════════════
// AI FALLBACK ENGINE
// ═══════════════════════════════════════════════════════════════════

async function callAI(
    userMessage,
    history = []
) {

    const local =
        localResponse(
            userMessage
        );


    if (local) {

        logAI(
            "Local response",
            {
                provider:
                    local.provider
            }
        );

        return local;

    }


    const messages =
        buildMessages(
            userMessage,
            history
        );


    const providers = [

        {
            name:
                "groq",

            enabled:
                Boolean(
                    GROQ_API_KEY
                ),

            call:
                () =>
                    callGroq(
                        messages
                    )
        },

        {
            name:
                "cerebras",

            enabled:
                Boolean(
                    CEREBRAS_API_KEY
                ),

            call:
                () =>
                    callCerebras(
                        messages
                    )
        },

        {
            name:
                "openrouter",

            enabled:
                Boolean(
                    OPENROUTER_API_KEY
                ),

            call:
                () =>
                    callOpenRouter(
                        messages
                    )
        },

        {
            name:
                "gemini",

            enabled:
                Boolean(
                    GEMINI_API_KEY
                ),

            call:
                () =>
                    callGemini(
                        messages
                    )
        }

    ];


    const failures = [];


    for (
        const provider of providers
    ) {

        if (!provider.enabled) {

            continue;

        }


        try {

            const result =
                await provider.call();


            if (
                result &&
                result.text
            ) {

                logAI(
                    "AI provider success",
                    {
                        provider:
                            result.provider,

                        model:
                            result.model
                    }
                );


                return result;

            }

        } catch (error) {

            failures.push({

                provider:
                    provider.name,

                error:
                    error.message

            });


            logError(
                `AI provider failed: ${provider.name}`,
                {
                    error:
                        error.message
                }
            );

        }

    }


    return {

        text:
            "Şu anda yapay zekâ servislerine bağlanamadım. Biraz sonra tekrar deneyebiliriz.",

        provider:
            "fallback",

        model:
            "turkai-fallback",

        failures

    };

}


// ═══════════════════════════════════════════════════════════════════
// CHAT ANSWER
// ═══════════════════════════════════════════════════════════════════

async function generateChatAnswer(
    userMessage,
    history = []
) {

    return callAI(
        userMessage,
        history
    );

}


// ═══════════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success:
                true,

            status:
                "ok",

            app:
                APP_NAME,

            version:
                APP_VERSION,

            environment:
                NODE_ENV,

            serverId:
                SERVER_ID,

            uptime:
                process.uptime(),

            timestamp:
                nowISO()

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// STATUS
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            success:
                true,

            app: {

                name:
                    APP_NAME,

                version:
                    APP_VERSION,

                description:
                    APP_DESCRIPTION

            },

            server: {

                id:
                    SERVER_ID,

                environment:
                    NODE_ENV,

                port:
                    PORT,

                host:
                    HOST,

                uptime:
                    process.uptime(),

                memory:
                    process.memoryUsage(),

                node:
                    process.version

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
                    ),

                local:
                    true

            },

            timestamp:
                nowISO()

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// PLANS API
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/plans",
    (req, res) => {

        res.json({

            success:
                true,

            plans:
                PLANS

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// CURRENT USER
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/me",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );

        const plan =
            getPlan(
                user
            );


        res.json({

            success:
                true,

            user,

            plan

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// AI STATUS
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/ai/status",
    (req, res) => {

        res.json({

            success:
                true,

            providers: {

                local: {

                    available:
                        true,

                    model:
                        "turkai-local"

                },

                groq: {

                    available:
                        Boolean(
                            GROQ_API_KEY
                        ),

                    model:
                        GROQ_MODEL

                },

                cerebras: {

                    available:
                        Boolean(
                            CEREBRAS_API_KEY
                        ),

                    model:
                        CEREBRAS_MODEL

                },

                openrouter: {

                    available:
                        Boolean(
                            OPENROUTER_API_KEY
                        ),

                    model:
                        OPENROUTER_MODEL

                },

                gemini: {

                    available:
                        Boolean(
                            GEMINI_API_KEY
                        ),

                    model:
                        GEMINI_MODEL

                }

            },

            fallbackOrder: [

                "local",

                "groq",

                "cerebras",

                "openrouter",

                "gemini",

                "fallback"

            ]

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// MAIN CHAT API
// ═══════════════════════════════════════════════════════════════════

app.post(
    "/api/chat",
    async (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const message =
                cleanText(
                    req.body?.message ||
                    req.body?.prompt ||
                    req.body?.text ||
                    "",
                    20000
                );


            if (!message) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Mesaj boş olamaz."

                });

            }


            let chat =
                findChatById(
                    req.body?.chatId
                );


            if (
                !chat ||
                chat.userId !== user.id
            ) {

                chat =
                    createChat(
                        user,
                        message.slice(
                            0,
                            80
                        )
                    );

            }


            const history =
                getChatMessages(
                    chat.id,
                    30
                );


            const userMessage =
                addMessage(
                    chat.id,
                    user.id,
                    "user",
                    message
                );


            const answer =
                await generateChatAnswer(
                    message,
                    history
                );


            const assistantMessage =
                addMessage(
                    chat.id,
                    user.id,
                    "assistant",
                    answer.text,
                    {
                        provider:
                            answer.provider,

                        model:
                            answer.model
                    }
                );


            const chats =
                getChats();

            const chatIndex =
                chats.findIndex(
                    item =>
                        item.id === chat.id
                );


            if (
                chatIndex !== -1
            ) {

                chats[
                    chatIndex
                ].updatedAt =
                    nowISO();


                if (
                    chats[
                        chatIndex
                    ].title === "Yeni sohbet"
                ) {

                    chats[
                        chatIndex
                    ].title =
                        message.slice(
                            0,
                            80
                        );

                }


                saveChats(
                    chats
                );

            }


            io.to(
                `chat:${chat.id}`
            ).emit(
                "chat:message",
                {

                    chatId:
                        chat.id,

                    message:
                        assistantMessage

                }
            );


            return res.json({

                success:
                    true,

                reply:
                    answer.text,

                response:
                    answer.text,

                message:
                    answer.text,

                text:
                    answer.text,

                chatId:
                    chat.id,

                provider:
                    answer.provider,

                model:
                    answer.model,

                userMessageId:
                    userMessage.id,

                assistantMessageId:
                    assistantMessage.id

            });

        } catch (error) {

            logError(
                "CHAT_API_ERROR",
                {
                    error:
                        error.message,

                    stack:
                        error.stack
                }
            );


            return res.status(500).json({

                success:
                    false,

                error:
                    "TürkAI mesajı işlerken bir hata oluştu.",

                details:
                    IS_PRODUCTION
                        ? undefined
                        : error.message

            });

        }

    }
);


// ═══════════════════════════════════════════════════════════════════
// LOGIN / REGISTER HELPERS
// ═══════════════════════════════════════════════════════════════════

app.post(
    "/api/auth/register",
    (req, res) => {

        try {

            const settings =
                readJSON(
                    DB_FILES.settings,
                    DEFAULT_DATABASE.settings
                );


            if (
                settings.allowRegistration === false
            ) {

                return res.status(403).json({

                    success:
                        false,

                    error:
                        "Yeni kullanıcı kayıtları şu anda kapalı."

                });

            }


            const email =
                cleanText(
                    req.body?.email,
                    320
                );


            const name =
                cleanText(
                    req.body?.name ||
                    "TürkAI Kullanıcısı",
                    100
                );


            if (!email) {

                return res.status(400).json({

                    success:
                        false,

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
                        name
                    });

            }


            const session =
                createSession(
                    user.id
                );


            return res.json({

                success:
                    true,

                user,

                token:
                    session.token,

                expiresAt:
                    session.expiresAt

            });

        } catch (error) {

            logError(
                "REGISTER_ERROR",
                {
                    error:
                        error.message
                }
            );


            return res.status(500).json({

                success:
                    false,

                error:
                    "Kayıt işlemi başarısız."

            });

        }

    }
);


// ═══════════════════════════════════════════════════════════════════
// SESSION CHECK
// ═══════════════════════════════════════════════════════════════════

app.get(
    "/api/auth/session",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        res.json({

            success:
                true,

            authenticated:
                !user.guest,

            user,

            plan:
                getPlan(user)

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════

app.post(
    "/api/auth/logout",
    (req, res) => {

        const authorization =
            req.headers.authorization || "";


        if (
            authorization
                .toLowerCase()
                .startsWith("bearer ")
        ) {

            const token =
                authorization
                    .slice(7)
                    .trim();


            const sessions =
                getSessions();


            const filtered =
                sessions.filter(
                    session =>
                        session.token !== token
                );


            saveSessions(
                filtered
            );

        }


        res.json({

            success:
                true,

            message:
                "Oturum kapatıldı."

        });

    }
);


// ═══════════════════════════════════════════════════════════════════
// CORE EXPORT MARKER
// ═══════════════════════════════════════════════════════════════════
//
// PART 2 BU DOSYANIN DEVAMINA GELECEK.
//
// PART 3'TE:
// startServer()
// shutdown()
// static frontend
// socket runtime
// 404
// error handler
// module.exports
// require.main
//
// BURADA SERVER BAŞLATILMIYOR.
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// TÜRKAI SERVER — PART 2
// PLATFORM / DATA / SECURITY / AI SERVICES ENGINE
// ═══════════════════════════════════════════════════════════════════


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 1. USAGE / LIMIT ENGINE                                         ║
// ╚══════════════════════════════════════════════════════════════════╝

function getTodayKey() {

    const date = new Date();

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function getUsage() {

    return readJSON(
        DB_FILES.usage,
        {}
    );

}


function saveUsage(usage) {

    return writeJSON(
        DB_FILES.usage,
        usage
    );

}


function getUserUsage(userId) {

    const usage =
        getUsage();

    const today =
        getTodayKey();

    if (!usage[userId]) {

        usage[userId] = {};

    }

    if (!usage[userId][today]) {

        usage[userId][today] = {

            messages: 0,

            research: 0,

            images: 0,

            videos: 0,

            bytesUploaded: 0,

            updatedAt:
                nowISO()

        };

    }

    return usage[userId][today];

}


function updateUsage(
    userId,
    type,
    amount = 1
) {

    const usage =
        getUsage();

    const today =
        getTodayKey();


    if (!usage[userId]) {

        usage[userId] = {};

    }


    if (!usage[userId][today]) {

        usage[userId][today] = {

            messages: 0,

            research: 0,

            images: 0,

            videos: 0,

            bytesUploaded: 0,

            updatedAt:
                nowISO()

        };

    }


    if (
        typeof usage[userId][today][type] !==
        "number"
    ) {

        usage[userId][today][type] = 0;

    }


    usage[userId][today][type] +=
        Number(amount) || 0;


    usage[userId][today].updatedAt =
        nowISO();


    saveUsage(
        usage
    );


    return usage[userId][today];

}


function getPlanForUser(user) {

    return getPlan(
        user
    );

}


function usageAvailable(
    user,
    type,
    amount = 1
) {

    const plan =
        getPlanForUser(
            user
        );

    const usage =
        getUserUsage(
            user.id
        );


    const current =
        Number(
            usage[type] || 0
        );


    const limit =
        Number(
            plan[type] || 0
        );


    return {

        allowed:
            current + amount <= limit,

        current,

        limit,

        remaining:
            Math.max(
                0,
                limit - current
            )

    };

}


app.get(
    "/api/usage",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );

        const usage =
            getUserUsage(
                user.id
            );

        const plan =
            getPlan(
                user
            );


        res.json({

            success:
                true,

            date:
                getTodayKey(),

            usage,

            limits: {

                messages:
                    plan.messages,

                research:
                    plan.research,

                images:
                    plan.images,

                videos:
                    plan.videos,

                storageMB:
                    plan.storageMB

            }

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 2. MEMORY ENGINE                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

function getMemories() {

    return readJSON(
        DB_FILES.memories,
        []
    );

}


function saveMemories(memories) {

    return writeJSON(
        DB_FILES.memories,
        memories
    );

}


function addMemory(
    userId,
    text,
    metadata = {}
) {

    const clean =
        cleanText(
            text,
            5000
        );


    if (!clean) {

        return null;

    }


    const memories =
        getMemories();


    const memory = {

        id:
            createId("memory"),

        userId,

        text:
            clean,

        type:
            metadata.type ||
            "general",

        source:
            metadata.source ||
            "user",

        importance:
            Number(
                metadata.importance || 1
            ),

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()

    };


    memories.push(
        memory
    );


    saveMemories(
        memories
    );


    return memory;

}


function searchMemories(
    userId,
    query,
    limit = 10
) {

    const memories =
        getMemories();


    const normalizedQuery =
        normalizeText(
            query
        );


    if (!normalizedQuery) {

        return [];

    }


    const words =
        normalizedQuery
            .split(/\s+/)
            .filter(Boolean);


    const results =
        memories
            .filter(
                memory =>
                    memory.userId === userId
            )
            .map(
                memory => {

                    const text =
                        normalizeText(
                            memory.text
                        );


                    let score = 0;


                    for (
                        const word of words
                    ) {

                        if (
                            text.includes(
                                word
                            )
                        ) {

                            score += 1;

                        }

                    }


                    if (
                        text.includes(
                            normalizedQuery
                        )
                    ) {

                        score += 5;

                    }


                    score +=
                        Number(
                            memory.importance ||
                            0
                        ) * 0.1;


                    return {

                        ...memory,

                        score

                    };

                }
            )
            .filter(
                item =>
                    item.score > 0
            )
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(
                0,
                Math.max(
                    1,
                    Math.min(
                        Number(limit) || 10,
                        50
                    )
                )
            );


    return results;

}


app.get(
    "/api/memory",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const memories =
            getMemories()
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
                );


        res.json({

            success:
                true,

            memories

        });

    }
);


app.get(
    "/api/memory/search",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const query =
            cleanText(
                req.query.q ||
                req.query.query ||
                "",
                1000
            );


        if (!query) {

            return res.json({

                success:
                    true,

                results: []

            });

        }


        res.json({

            success:
                true,

            results:
                searchMemories(
                    user.id,
                    query,
                    20
                )

        });

    }
);


app.post(
    "/api/memory",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const text =
            cleanText(
                req.body?.text ||
                req.body?.memory ||
                "",
                5000
            );


        if (!text) {

            return res.status(400).json({

                success:
                    false,

                error:
                    "Memory metni boş olamaz."

            });

        }


        const memory =
            addMemory(
                user.id,
                text,
                {
                    type:
                        req.body?.type,

                    source:
                        req.body?.source ||
                        "manual",

                    importance:
                        req.body?.importance
                }
            );


        res.json({

            success:
                true,

            memory

        });

    }
);


app.delete(
    "/api/memory/:id",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const memories =
            getMemories();


        const before =
            memories.length;


        const filtered =
            memories.filter(
                memory =>
                    !(
                        memory.id ===
                        req.params.id &&
                        memory.userId ===
                        user.id
                    )
            );


        saveMemories(
            filtered
        );


        res.json({

            success:
                true,

            deleted:
                before !==
                filtered.length

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 3. KNOWLEDGE ENGINE                                             ║
// ╚══════════════════════════════════════════════════════════════════╝

function getKnowledge() {

    return readJSON(
        DB_FILES.knowledge,
        []
    );

}


function saveKnowledge(
    knowledge
) {

    return writeJSON(
        DB_FILES.knowledge,
        knowledge
    );

}


function findKnowledgeAnswer(
    query
) {

    const knowledge =
        getKnowledge();


    const normalized =
        normalizeText(
            query
        );


    if (!normalized) {

        return null;

    }


    let best = null;

    let bestScore = 0;


    for (
        const item of knowledge
    ) {

        const question =
            normalizeText(
                item.question ||
                ""
            );

        const answer =
            cleanText(
                item.answer ||
                "",
                20000
            );


        if (!question || !answer) {

            continue;

        }


        let score = 0;


        if (
            normalized ===
            question
        ) {

            score += 100;

        }


        if (
            normalized.includes(
                question
            )
        ) {

            score += 40;

        }


        const words =
            question
                .split(/\s+/)
                .filter(
                    word =>
                        word.length > 2
                );


        for (
            const word of words
        ) {

            if (
                normalized.includes(
                    word
                )
            ) {

                score += 2;

            }

        }


        if (
            score > bestScore
        ) {

            bestScore =
                score;

            best = {

                ...item,

                score

            };

        }

    }


    return best;

}


function saveKnowledgeAnswer(
    question,
    answer,
    metadata = {}
) {

    const cleanQuestion =
        cleanText(
            question,
            2000
        );

    const cleanAnswer =
        cleanText(
            answer,
            20000
        );


    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {

        return null;

    }


    const knowledge =
        getKnowledge();


    const existingIndex =
        knowledge.findIndex(
            item =>
                normalizeText(
                    item.question
                ) ===
                normalizeText(
                    cleanQuestion
                )
        );


    const item = {

        id:
            existingIndex >= 0
                ? knowledge[
                    existingIndex
                ].id
                : createId(
                    "knowledge"
                ),

        question:
            cleanQuestion,

        answer:
            cleanAnswer,

        source:
            metadata.source ||
            "turkai",

        confidence:
            metadata.confidence ||
            0.7,

        createdAt:
            existingIndex >= 0
                ? knowledge[
                    existingIndex
                ].createdAt
                : nowISO(),

        updatedAt:
            nowISO()

    };


    if (
        existingIndex >= 0
    ) {

        knowledge[
            existingIndex
        ] = item;

    } else {

        knowledge.push(
            item
        );

    }


    saveKnowledge(
        knowledge
    );


    return item;

}


app.get(
    "/api/knowledge",
    (req, res) => {

        const knowledge =
            getKnowledge();


        res.json({

            success:
                true,

            count:
                knowledge.length,

            knowledge

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 4. RESEARCH ENGINE                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

function getResearch() {

    return readJSON(
        DB_FILES.research,
        []
    );

}


function saveResearch(
    research
) {

    return writeJSON(
        DB_FILES.research,
        research
    );

}


function saveResearchRecord(
    userId,
    query,
    result,
    metadata = {}
) {

    const research =
        getResearch();


    const record = {

        id:
            createId("research"),

        userId,

        query:
            cleanText(
                query,
                5000
            ),

        result:
            cleanText(
                result,
                30000
            ),

        provider:
            metadata.provider ||
            "turkai",

        source:
            metadata.source ||
            "ai",

        createdAt:
            nowISO()

    };


    research.push(
        record
    );


    if (
        research.length > 5000
    ) {

        research.splice(
            0,
            research.length - 5000
        );

    }


    saveResearch(
        research
    );


    return record;

}


async function performResearch(
    user,
    query
) {

    const cleanQuery =
        cleanText(
            query,
            5000
        );


    if (!cleanQuery) {

        return {

            text:
                "Araştırılacak konu boş.",

            provider:
                "local",

            model:
                "turkai-local"

        };

    }


    const available =
        usageAvailable(
            user,
            "research",
            1
        );


    if (!available.allowed) {

        return {

            text:
                `Araştırma limitin doldu. Planındaki günlük araştırma limiti: ${available.limit}.`,

            provider:
                "limit",

            model:
                "turkai-limit"

        };

    }


    updateUsage(
        user.id,
        "research",
        1
    );


    const knowledge =
        findKnowledgeAnswer(
            cleanQuery
        );


    if (knowledge) {

        const record =
            saveResearchRecord(
                user.id,
                cleanQuery,
                knowledge.answer,
                {
                    provider:
                        "knowledge",

                    source:
                        "knowledge.json"
                }
            );


        return {

            text:
                knowledge.answer,

            provider:
                "knowledge",

            model:
                "turkai-knowledge",

            researchId:
                record.id

        };

    }


    const result =
        await callAI(
            `Araştırma isteği:\n\n${cleanQuery}\n\nKonu hakkında mümkün olduğunca doğru, açık ve yapılandırılmış bir açıklama hazırla.`,
            []
        );


    const record =
        saveResearchRecord(
            user.id,
            cleanQuery,
            result.text,
            {
                provider:
                    result.provider,

                source:
                    "ai"
            }
        );


    saveKnowledgeAnswer(
        cleanQuery,
        result.text,
        {
            source:
                result.provider,

            confidence:
                0.55
        }
    );


    return {

        ...result,

        researchId:
            record.id

    };

}


app.post(
    "/api/research",
    async (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const query =
                cleanText(
                    req.body?.query ||
                    req.body?.q ||
                    req.body?.message ||
                    "",
                    5000
                );


            if (!query) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Araştırma sorgusu boş."

                });

            }


            const result =
                await performResearch(
                    user,
                    query
                );


            res.json({

                success:
                    true,

                query,

                ...result

            });

        } catch (error) {

            logError(
                "RESEARCH_ERROR",
                {
                    error:
                        error.message
                }
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Araştırma sırasında hata oluştu."

            });

        }

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 5. FILE ENGINE                                                   ║
// ╚══════════════════════════════════════════════════════════════════╝

function getFiles() {

    return readJSON(
        DB_FILES.files,
        []
    );

}


function saveFiles(
    files
) {

    return writeJSON(
        DB_FILES.files,
        files
    );

}


function safeFilename(
    filename
) {

    return cleanText(
        filename,
        180
    )
        .replace(
            /[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ._ -]/g,
            "_"
        )
        .replace(
            /\s+/g,
            "_"
        );

}


app.post(
    "/api/upload",
    (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const filename =
                safeFilename(
                    req.body?.filename ||
                    req.body?.name ||
                    "dosya.txt"
                );


            const content =
                req.body?.content;


            if (
                typeof content !==
                "string"
            ) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Base64 content gerekli."

                });

            }


            const buffer =
                Buffer.from(
                    content,
                    "base64"
                );


            const plan =
                getPlan(
                    user
                );


            const maxBytes =
                plan.storageMB *
                1024 *
                1024;


            if (
                buffer.length >
                maxBytes
            ) {

                return res.status(413).json({

                    success:
                        false,

                    error:
                        `Dosya boyutu plan limitini aşıyor. Limit: ${plan.storageMB} MB.`

                });

            }


            const uniqueName =
                `${Date.now()}_${crypto.randomBytes(5).toString("hex")}_${filename}`;


            const filePath =
                path.join(
                    UPLOADS_DIR,
                    uniqueName
                );


            fs.writeFileSync(
                filePath,
                buffer
            );


            const files =
                getFiles();


            const fileRecord = {

                id:
                    createId("file"),

                userId:
                    user.id,

                originalName:
                    filename,

                storedName:
                    uniqueName,

                path:
                    filePath,

                size:
                    buffer.length,

                mimeType:
                    req.body?.mimeType ||
                    "application/octet-stream",

                createdAt:
                    nowISO()

            };


            files.push(
                fileRecord
            );


            saveFiles(
                files
            );


            updateUsage(
                user.id,
                "bytesUploaded",
                buffer.length
            );


            res.json({

                success:
                    true,

                file: {

                    id:
                        fileRecord.id,

                    name:
                        filename,

                    size:
                        buffer.length,

                    mimeType:
                        fileRecord.mimeType,

                    createdAt:
                        fileRecord.createdAt

                }

            });

        } catch (error) {

            logError(
                "UPLOAD_ERROR",
                {
                    error:
                        error.message
                }
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Dosya yüklenemedi."

            });

        }

    }
);


app.get(
    "/api/files",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


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
                            file.originalName,

                        size:
                            file.size,

                        mimeType:
                            file.mimeType,

                        createdAt:
                            file.createdAt

                    })
                );


        res.json({

            success:
                true,

            files

        });

    }
);


app.delete(
    "/api/files/:id",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const files =
            getFiles();


        const target =
            files.find(
                file =>
                    file.id ===
                    req.params.id &&
                    file.userId ===
                    user.id
            );


        if (!target) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Dosya bulunamadı."

            });

        }


        try {

            if (
                target.path &&
                fs.existsSync(
                    target.path
                )
            ) {

                fs.unlinkSync(
                    target.path
                );

            }

        } catch (error) {

            logError(
                "FILE_DELETE_ERROR",
                {
                    error:
                        error.message
                }
            );

        }


        const filtered =
            files.filter(
                file =>
                    file.id !==
                    target.id
            );


        saveFiles(
            filtered
        );


        res.json({

            success:
                true,

            deleted:
                true

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 6. PROJECT ENGINE                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

function getProjects() {

    return readJSON(
        DB_FILES.projects,
        []
    );

}


function saveProjects(
    projects
) {

    return writeJSON(
        DB_FILES.projects,
        projects
    );

}


function createProject(
    user,
    data = {}
) {

    const project = {

        id:
            createId("project"),

        userId:
            user.id,

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
                5000
            ),

        language:
            cleanText(
                data.language ||
                "javascript",
                50
            ),

        code:
            cleanText(
                data.code ||
                "",
                100000
            ),

        files:
            Array.isArray(
                data.files
            )
                ? data.files
                : [],

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()

    };


    const projects =
        getProjects();


    projects.push(
        project
    );


    saveProjects(
        projects
    );


    return project;

}


function findProject(
    id,
    userId
) {

    return (
        getProjects().find(
            project =>
                project.id === id &&
                project.userId === userId
        ) || null
    );

}


app.get(
    "/api/projects",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


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

            success:
                true,

            projects

        });

    }
);


app.post(
    "/api/projects",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const project =
            createProject(
                user,
                req.body || {}
            );


        res.json({

            success:
                true,

            project

        });

    }
);


app.put(
    "/api/projects/:id",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


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


        if (
            index === -1
        ) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Proje bulunamadı."

            });

        }


        const old =
            projects[index];


        projects[index] = {

            ...old,

            name:
                req.body?.name !== undefined
                    ? cleanText(
                        req.body.name,
                        200
                    )
                    : old.name,

            description:
                req.body?.description !== undefined
                    ? cleanText(
                        req.body.description,
                        5000
                    )
                    : old.description,

            language:
                req.body?.language !== undefined
                    ? cleanText(
                        req.body.language,
                        50
                    )
                    : old.language,

            code:
                req.body?.code !== undefined
                    ? cleanText(
                        req.body.code,
                        100000
                    )
                    : old.code,

            files:
                Array.isArray(
                    req.body?.files
                )
                    ? req.body.files
                    : old.files,

            updatedAt:
                nowISO()

        };


        saveProjects(
            projects
        );


        res.json({

            success:
                true,

            project:
                projects[index]

        });

    }
);


app.delete(
    "/api/projects/:id",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const projects =
            getProjects();


        const filtered =
            projects.filter(
                project =>
                    !(
                        project.id ===
                        req.params.id &&
                        project.userId ===
                        user.id
                    )
            );


        const deleted =
            filtered.length !==
            projects.length;


        saveProjects(
            filtered
        );


        res.json({

            success:
                true,

            deleted

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 7. CODE ANALYZER                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝

app.post(
    "/api/code/analyze",
    async (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const code =
                cleanText(
                    req.body?.code ||
                    "",
                    50000
                );


            const language =
                cleanText(
                    req.body?.language ||
                    "javascript",
                    50
                );


            if (!code) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Analiz edilecek kod boş."

                });

            }


            const prompt = `
Aşağıdaki ${language} kodunu analiz et.

Kod:

${code}

Şunları açıkla:

1. Kod ne yapıyor?
2. Hatalar var mı?
3. Güvenlik sorunları var mı?
4. Performans sorunları var mı?
5. Nasıl geliştirilebilir?
6. Gerekirse düzeltilmiş kodu ver.

Cevabı Türkçe ver.
`;


            const result =
                await callAI(
                    prompt,
                    []
                );


            res.json({

                success:
                    true,

                language,

                result:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model

            });

        } catch (error) {

            logError(
                "CODE_ANALYZE_ERROR",
                {
                    error:
                        error.message
                }
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Kod analizi başarısız."

            });

        }

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 8. SEARCH ENGINE                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/search",
    async (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const query =
                cleanText(
                    req.query.q ||
                    req.query.query ||
                    "",
                    3000
                );


            if (!query) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Arama sorgusu boş."

                });

            }


            const knowledge =
                findKnowledgeAnswer(
                    query
                );


            if (knowledge) {

                return res.json({

                    success:
                        true,

                    query,

                    result:
                        knowledge.answer,

                    source:
                        "knowledge",

                    provider:
                        "knowledge"

                });

            }


            const result =
                await performResearch(
                    user,
                    query
                );


            res.json({

                success:
                    true,

                query,

                result:
                    result.text,

                source:
                    result.provider,

                provider:
                    result.provider,

                model:
                    result.model

            });

        } catch (error) {

            logError(
                "SEARCH_ERROR",
                {
                    error:
                        error.message
                }
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Arama başarısız."

            });

        }

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 9. ADMIN ENGINE                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const ADMIN_EMAIL =
    normalizeText(
        process.env.ADMIN_EMAIL ||
        ""
    );


function isAdmin(
    user
) {

    if (!user) {

        return false;

    }


    if (
        user.plan ===
        "developer"
    ) {

        return true;

    }


    if (
        ADMIN_EMAIL &&
        normalizeText(
            user.email
        ) ===
        ADMIN_EMAIL
    ) {

        return true;

    }


    return false;

}


function requireAdmin(
    req,
    res,
    next
) {

    const user =
        getRequestUser(
            req
        );


    if (
        !isAdmin(user)
    ) {

        return res.status(403).json({

            success:
                false,

            error:
                "Yönetici yetkisi gerekli."

        });

    }


    req.adminUser =
        user;


    next();

}


app.get(
    "/api/admin/status",
    requireAdmin,
    (req, res) => {

        res.json({

            success:
                true,

            admin:
                true,

            user:
                req.adminUser

        });

    }
);


app.get(
    "/api/admin/users",
    requireAdmin,
    (req, res) => {

        const users =
            getUsers()
                .map(
                    user => ({

                        id:
                            user.id,

                        email:
                            user.email,

                        name:
                            user.name,

                        plan:
                            user.plan,

                        active:
                            user.active,

                        createdAt:
                            user.createdAt,

                        lastSeenAt:
                            user.lastSeenAt

                    })
                );


        res.json({

            success:
                true,

            count:
                users.length,

            users

        });

    }
);


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


        if (
            index === -1
        ) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Kullanıcı bulunamadı."

            });

        }


        const allowedPlans =
            Object.keys(
                PLANS
            );


        const requestedPlan =
            cleanText(
                req.body?.plan ||
                "",
                30
            );


        if (
            requestedPlan &&
            allowedPlans.includes(
                requestedPlan
            )
        ) {

            users[index].plan =
                requestedPlan;

        }


        if (
            typeof req.body?.active ===
            "boolean"
        ) {

            users[index].active =
                req.body.active;

        }


        users[index].updatedAt =
            nowISO();


        saveUsers(
            users
        );


        res.json({

            success:
                true,

            user:
                users[index]

        });

    }
);


app.delete(
    "/api/admin/users/:id",
    requireAdmin,
    (req, res) => {

        const users =
            getUsers();


        const filtered =
            users.filter(
                user =>
                    user.id !==
                    req.params.id
            );


        saveUsers(
            filtered
        );


        res.json({

            success:
                true,

            deleted:
                filtered.length !==
                users.length

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 10. PRO CODE SYSTEM                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";


app.post(
    "/api/pro/activate",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        if (
            user.guest
        ) {

            return res.status(401).json({

                success:
                    false,

                error:
                    "Önce kullanıcı hesabı gerekli."

            });

        }


        const code =
            cleanText(
                req.body?.code ||
                "",
                200
            );


        if (
            !TURKAI_PRO_CODE ||
            code !==
            TURKAI_PRO_CODE
        ) {

            return res.status(403).json({

                success:
                    false,

                error:
                    "Geçersiz aktivasyon kodu."

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


        if (
            index === -1
        ) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Kullanıcı bulunamadı."

            });

        }


        users[index].plan =
            "pro";


        users[index].updatedAt =
            nowISO();


        saveUsers(
            users
        );


        res.json({

            success:
                true,

            message:
                "TürkAI Pro aktif edildi.",

            plan:
                PLANS.pro

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 11. SETTINGS ENGINE                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

function getSettings() {

    return readJSON(
        DB_FILES.settings,
        DEFAULT_DATABASE.settings
    );

}


function saveSettings(
    settings
) {

    return writeJSON(
        DB_FILES.settings,
        settings
    );

}


app.get(
    "/api/settings",
    (req, res) => {

        const settings =
            getSettings();


        const publicSettings = {

            maintenance:
                Boolean(
                    settings.maintenance
                ),

            allowRegistration:
                Boolean(
                    settings.allowRegistration
                ),

            maxUploadMB:
                Number(
                    settings.maxUploadMB ||
                    25
                ),

            defaultModel:
                settings.defaultModel ||
                "fast",

            version:
                settings.version ||
                APP_VERSION

        };


        res.json({

            success:
                true,

            settings:
                publicSettings

        });

    }
);


app.patch(
    "/api/settings",
    requireAdmin,
    (req, res) => {

        const settings =
            getSettings();


        if (
            typeof req.body?.maintenance ===
            "boolean"
        ) {

            settings.maintenance =
                req.body.maintenance;

        }


        if (
            typeof req.body?.allowRegistration ===
            "boolean"
        ) {

            settings.allowRegistration =
                req.body.allowRegistration;

        }


        if (
            Number.isFinite(
                Number(
                    req.body?.maxUploadMB
                )
            )
        ) {

            settings.maxUploadMB =
                Math.max(
                    1,
                    Math.min(
                        1000,
                        Number(
                            req.body.maxUploadMB
                        )
                    )
                );

        }


        if (
            typeof req.body?.defaultModel ===
            "string"
        ) {

            settings.defaultModel =
                cleanText(
                    req.body.defaultModel,
                    100
                );

        }


        settings.updatedAt =
            nowISO();


        saveSettings(
            settings
        );


        res.json({

            success:
                true,

            settings

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 12. NOTIFICATION ENGINE                                          ║
// ╚══════════════════════════════════════════════════════════════════╝

function getNotifications() {

    return readJSON(
        DB_FILES.notifications,
        []
    );

}


function saveNotifications(
    notifications
) {

    return writeJSON(
        DB_FILES.notifications,
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
            createId("notification"),

        userId,

        title:
            cleanText(
                title,
                200
            ),

        message:
            cleanText(
                message,
                5000
            ),

        type:
            cleanText(
                type,
                50
            ),

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
            getRequestUser(
                req
            );


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
                );


        res.json({

            success:
                true,

            notifications

        });

    }
);


app.post(
    "/api/notifications/:id/read",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const notifications =
            getNotifications();


        const item =
            notifications.find(
                notification =>
                    notification.id ===
                    req.params.id &&
                    notification.userId ===
                    user.id
            );


        if (!item) {

            return res.status(404).json({

                success:
                    false,

                error:
                    "Bildirim bulunamadı."

            });

        }


        item.read =
            true;


        item.readAt =
            nowISO();


        saveNotifications(
            notifications
        );


        res.json({

            success:
                true,

            notification:
                item

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 13. AUDIT LOG                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

function getAuditLogs() {

    return readJSON(
        DB_FILES.audit,
        []
    );

}


function saveAuditLogs(
    logs
) {

    return writeJSON(
        DB_FILES.audit,
        logs
    );

}


function addAuditLog(
    userId,
    action,
    metadata = {}
) {

    const logs =
        getAuditLogs();


    const item = {

        id:
            createId("audit"),

        userId,

        action:
            cleanText(
                action,
                200
            ),

        metadata,

        createdAt:
            nowISO()

    };


    logs.push(
        item
    );


    if (
        logs.length >
        10000
    ) {

        logs.splice(
            0,
            logs.length - 10000
        );

    }


    saveAuditLogs(
        logs
    );


    return item;

}


app.get(
    "/api/admin/audit",
    requireAdmin,
    (req, res) => {

        const logs =
            getAuditLogs()
                .slice(-500)
                .reverse();


        res.json({

            success:
                true,

            logs

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 14. SECURITY ENGINE                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

function getSecurityEvents() {

    return readJSON(
        DB_FILES.security,
        []
    );

}


function saveSecurityEvents(
    events
) {

    return writeJSON(
        DB_FILES.security,
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


    const event = {

        id:
            createId("security"),

        type:
            cleanText(
                type,
                100
            ),

        message:
            cleanText(
                message,
                5000
            ),

        metadata,

        createdAt:
            nowISO()

    };


    events.push(
        event
    );


    if (
        events.length >
        10000
    ) {

        events.splice(
            0,
            events.length - 10000
        );

    }


    saveSecurityEvents(
        events
    );


    logSecurity(
        message,
        metadata
    );


    return event;

}


app.get(
    "/api/security/status",
    requireAdmin,
    (req, res) => {

        const events =
            getSecurityEvents();


        res.json({

            success:
                true,

            security: {

                events:
                    events.length,

                lastEvent:
                    events.length
                        ? events[
                            events.length - 1
                        ]
                        : null

            }

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 15. IMAGE GENERATION JOB ENGINE                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const IMAGE_JOBS =
    new Map();


function createImageJob(
    user,
    prompt
) {

    const job = {

        id:
            createId("imagejob"),

        userId:
            user.id,

        prompt:
            cleanText(
                prompt,
                5000
            ),

        status:
            "queued",

        progress:
            0,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        result:
            null,

        error:
            null

    };


    IMAGE_JOBS.set(
        job.id,
        job
    );


    return job;

}


app.post(
    "/api/generate/image",
    async (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const prompt =
            cleanText(
                req.body?.prompt ||
                "",
                5000
            );


        if (!prompt) {

            return res.status(400).json({

                success:
                    false,

                error:
                    "Görsel promptu boş."

            });

        }


        const availability =
            usageAvailable(
                user,
                "images",
                1
            );


        if (
            !availability.allowed
        ) {

            return res.status(403).json({

                success:
                    false,

                error:
                    "Günlük görsel limitin doldu.",

                usage:
                    availability

            });

        }


        updateUsage(
            user.id,
            "images",
            1
        );


        const job =
            createImageJob(
                user,
                prompt
            );


        /*
         * Burada gerçek image provider
         * daha sonra bağlanabilir.
         *
         * Şimdilik güvenli job altyapısı
         * oluşturuluyor.
         */

        setTimeout(
            () => {

                const current =
                    IMAGE_JOBS.get(
                        job.id
                    );


                if (!current) {

                    return;

                }


                current.status =
                    "ready";

                current.progress =
                    100;

                current.updatedAt =
                    nowISO();

                current.result = {

                    type:
                        "image",

                    message:
                        "Görsel üretim sağlayıcısı bağlanmaya hazır."

                };

            },
            100
        );


        res.json({

            success:
                true,

            job

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 16. VIDEO GENERATION JOB ENGINE                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const VIDEO_JOBS =
    new Map();


function createVideoJob(
    user,
    prompt
) {

    const job = {

        id:
            createId("videojob"),

        userId:
            user.id,

        prompt:
            cleanText(
                prompt,
                5000
            ),

        status:
            "queued",

        progress:
            0,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        result:
            null,

        error:
            null

    };


    VIDEO_JOBS.set(
        job.id,
        job
    );


    return job;

}


app.post(
    "/api/generate/video",
    async (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const prompt =
            cleanText(
                req.body?.prompt ||
                "",
                5000
            );


        if (!prompt) {

            return res.status(400).json({

                success:
                    false,

                error:
                    "Video promptu boş."

            });

        }


        const availability =
            usageAvailable(
                user,
                "videos",
                1
            );


        if (
            !availability.allowed
        ) {

            return res.status(403).json({

                success:
                    false,

                error:
                    "Günlük video limitin doldu.",

                usage:
                    availability

            });

        }


        updateUsage(
            user.id,
            "videos",
            1
        );


        const job =
            createVideoJob(
                user,
                prompt
            );


        setTimeout(
            () => {

                const current =
                    VIDEO_JOBS.get(
                        job.id
                    );


                if (!current) {

                    return;

                }


                current.status =
                    "ready";

                current.progress =
                    100;

                current.updatedAt =
                    nowISO();

                current.result = {

                    type:
                        "video",

                    message:
                        "Video üretim sağlayıcısı bağlanmaya hazır."

                };

            },
            100
        );


        res.json({

            success:
                true,

            job

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 17. GENERATION JOB STATUS                                        ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/generate/jobs",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const images =
            Array.from(
                IMAGE_JOBS.values()
            )
                .filter(
                    job =>
                        job.userId ===
                        user.id
                );


        const videos =
            Array.from(
                VIDEO_JOBS.values()
            )
                .filter(
                    job =>
                        job.userId ===
                        user.id
                );


        res.json({

            success:
                true,

            images,

            videos

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 18. API DOCUMENTATION                                            ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/docs",
    (req, res) => {

        res.json({

            success:
                true,

            name:
                APP_NAME,

            version:
                APP_VERSION,

            endpoints: {

                health:
                    "GET /api/health",

                status:
                    "GET /api/status",

                me:
                    "GET /api/me",

                plans:
                    "GET /api/plans",

                ai:
                    "GET /api/ai/status",

                chat:
                    "POST /api/chat",

                research:
                    "POST /api/research",

                search:
                    "GET /api/search",

                memory:
                    "GET /api/memory",

                memorySearch:
                    "GET /api/memory/search",

                memoryCreate:
                    "POST /api/memory",

                files:
                    "GET /api/files",

                upload:
                    "POST /api/upload",

                projects:
                    "GET /api/projects",

                projectCreate:
                    "POST /api/projects",

                codeAnalyze:
                    "POST /api/code/analyze",

                image:
                    "POST /api/generate/image",

                video:
                    "POST /api/generate/video",

                jobs:
                    "GET /api/generate/jobs"

            }

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 19. AUTOMATIC MEMORY DETECTION                                   ║
// ╚══════════════════════════════════════════════════════════════════╝

function detectMemoryCandidate(
    message
) {

    const text =
        cleanText(
            message,
            3000
        );


    if (!text) {

        return null;

    }


    const patterns = [

        /benim adım\s+(.+)/i,

        /bana\s+(.+)\s+diye hitap et/i,

        /hatırla\s*:\s*(.+)/i,

        /unutma\s*:\s*(.+)/i,

        /şunu hatırla\s*:\s*(.+)/i,

        /sevdiğim\s+(.+)/i,

        /ben\s+(.+)\s+seviyorum/i

    ];


    for (
        const pattern of patterns
    ) {

        const match =
            text.match(
                pattern
            );


        if (
            match &&
            match[1]
        ) {

            return cleanText(
                match[1],
                1000
            );

        }

    }


    return null;

}


function processMemoryCandidate(
    user,
    message
) {

    const candidate =
        detectMemoryCandidate(
            message
        );


    if (!candidate) {

        return null;

    }


    return addMemory(
        user.id,
        candidate,
        {
            type:
                "automatic",

            source:
                "chat",

            importance:
                1

        }
    );

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 20. CHAT MEMORY HOOK                                             ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// Önceden tanımlanan /api/chat rotasının
// üzerine yeni bir middleware eklemiyoruz.
// Bunun yerine bağımsız yardımcı endpoint
// sağlıyoruz.
//
// Frontend isterse doğrudan kullanabilir.
//

app.post(
    "/api/memory/detect",
    (req, res) => {

        const user =
            getRequestUser(
                req
            );


        const message =
            cleanText(
                req.body?.message ||
                "",
                3000
            );


        if (!message) {

            return res.json({

                success:
                    true,

                detected:
                    false,

                memory:
                    null

            });

        }


        const memory =
            processMemoryCandidate(
                user,
                message
            );


        res.json({

            success:
                true,

            detected:
                Boolean(memory),

            memory

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 21. DATABASE BACKUP ENGINE                                       ║
// ╚══════════════════════════════════════════════════════════════════╝

function backupDatabase() {

    try {

        const backupDirectory =
            path.join(
                STORAGE_DIR,
                "backups"
            );


        fs.mkdirSync(
            backupDirectory,
            {
                recursive:
                    true
            }
        );


        const timestamp =
            new Date()
                .toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );


        const backupPath =
            path.join(
                backupDirectory,
                `database_${timestamp}`
            );


        fs.mkdirSync(
            backupPath,
            {
                recursive:
                    true
            }
        );


        for (
            const [
                name,
                file
            ] of Object.entries(
                DB_FILES
            )
        ) {

            if (
                fs.existsSync(
                    file
                )
            ) {

                fs.copyFileSync(
                    file,
                    path.join(
                        backupPath,
                        `${name}.json`
                    )
                );

            }

        }


        return backupPath;

    } catch (error) {

        logError(
            "BACKUP_ERROR",
            {
                error:
                    error.message
            }
        );


        return null;

    }

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 22. TEMP CLEANUP                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝

function cleanupTemp(
    maxAgeHours = 24
) {

    try {

        if (
            !fs.existsSync(
                TEMP_DIR
            )
        ) {

            return 0;

        }


        const cutoff =
            Date.now() -
            (
                maxAgeHours *
                60 *
                60 *
                1000
            );


        const entries =
            fs.readdirSync(
                TEMP_DIR,
                {
                    withFileTypes:
                        true
                }
            );


        let deleted = 0;


        for (
            const entry of entries
        ) {

            const target =
                path.join(
                    TEMP_DIR,
                    entry.name
                );


            try {

                const stats =
                    fs.statSync(
                        target
                    );


                if (
                    stats.mtimeMs <
                    cutoff
                ) {

                    if (
                        entry.isDirectory()
                    ) {

                        fs.rmSync(
                            target,
                            {
                                recursive:
                                    true,
                                force:
                                    true
                            }
                        );

                    } else {

                        fs.unlinkSync(
                            target
                        );

                    }


                    deleted++;

                }

            } catch {}

        }


        return deleted;

    } catch (error) {

        logError(
            "TEMP_CLEANUP_ERROR",
            {
                error:
                    error.message
            }
        );


        return 0;

    }

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 23. SESSION CLEANUP                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

function cleanupSessions() {

    const sessions =
        getSessions();


    const now =
        Date.now();


    const valid =
        sessions.filter(
            session => {

                if (
                    !session.expiresAt
                ) {

                    return true;

                }


                return (
                    new Date(
                        session.expiresAt
                    ).getTime() >
                    now
                );

            }
        );


    if (
        valid.length !==
        sessions.length
    ) {

        saveSessions(
            valid
        );

    }


    return (
        sessions.length -
        valid.length
    );

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 24. USAGE CLEANUP                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

function cleanupOldUsage(
    days = 45
) {

    const usage =
        getUsage();


    const cutoff =
        Date.now() -
        days *
        24 *
        60 *
        60 *
        1000;


    for (
        const userId of Object.keys(
            usage
        )
    ) {

        const daysObject =
            usage[userId];


        for (
            const dateKey of Object.keys(
                daysObject
            )
        ) {

            const timestamp =
                new Date(
                    `${dateKey}T23:59:59`
                ).getTime();


            if (
                timestamp <
                cutoff
            ) {

                delete daysObject[
                    dateKey
                ];

            }

        }

    }


    saveUsage(
        usage
    );

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 25. PERIODIC MAINTENANCE                                        ║
// ╚══════════════════════════════════════════════════════════════════╝

const MAINTENANCE_INTERVAL =
    setInterval(
        () => {

            try {

                cleanupTemp();

                cleanupSessions();

                cleanupOldUsage();

            } catch (error) {

                logError(
                    "MAINTENANCE_ERROR",
                    {
                        error:
                            error.message
                    }
                );

            }

        },
        30 *
        60 *
        1000
    );


if (
    MAINTENANCE_INTERVAL &&
    typeof MAINTENANCE_INTERVAL.unref ===
    "function"
) {

    MAINTENANCE_INTERVAL.unref();

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 26. BACKUP INTERVAL                                              ║
// ╚══════════════════════════════════════════════════════════════════╝

const BACKUP_INTERVAL =
    setInterval(
        () => {

            try {

                backupDatabase();

            } catch (error) {

                logError(
                    "PERIODIC_BACKUP_ERROR",
                    {
                        error:
                            error.message
                    }
                );

            }

        },
        6 *
        60 *
        60 *
        1000
    );


if (
    BACKUP_INTERVAL &&
    typeof BACKUP_INTERVAL.unref ===
    "function"
) {

    BACKUP_INTERVAL.unref();

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 27. MODEL REQUEST ENDPOINT                                       ║
// ╚══════════════════════════════════════════════════════════════════╝

app.post(
    "/api/chat/model",
    async (req, res) => {

        try {

            const user =
                getRequestUser(
                    req
                );


            const message =
                cleanText(
                    req.body?.message ||
                    req.body?.prompt ||
                    "",
                    20000
                );


            const requestedModel =
                cleanText(
                    req.body?.model ||
                    "fast",
                    100
                );


            if (!message) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Mesaj boş."

                });

            }


            const availability =
                usageAvailable(
                    user,
                    "messages",
                    1
                );


            if (
                !availability.allowed
            ) {

                return res.status(429).json({

                    success:
                        false,

                    error:
                        "Günlük mesaj limitin doldu.",

                    usage:
                        availability

                });

            }


            updateUsage(
                user.id,
                "messages",
                1
            );


            const result =
                await callAI(
                    message,
                    []
                );


            res.json({

                success:
                    true,

                reply:
                    result.text,

                response:
                    result.text,

                text:
                    result.text,

                requestedModel,

                provider:
                    result.provider,

                model:
                    result.model

            });

        } catch (error) {

            logError(
                "MODEL_CHAT_ERROR",
                {
                    error:
                        error.message
                }
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Model isteği başarısız."

            });

        }

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 28. SERVER DIAGNOSTICS                                          ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/diagnostics",
    requireAdmin,
    (req, res) => {

        const memory =
            process.memoryUsage();


        const users =
            getUsers();


        const chats =
            getChats();


        const messages =
            getMessages();


        const projects =
            getProjects();


        const files =
            getFiles();


        const research =
            getResearch();


        res.json({

            success:
                true,

            application: {

                name:
                    APP_NAME,

                version:
                    APP_VERSION,

                environment:
                    NODE_ENV,

                production:
                    IS_PRODUCTION

            },

            runtime: {

                node:
                    process.version,

                platform:
                    process.platform,

                architecture:
                    process.arch,

                pid:
                    process.pid,

                uptime:
                    process.uptime(),

                memory

            },

            database: {

                users:
                    users.length,

                chats:
                    chats.length,

                messages:
                    messages.length,

                projects:
                    projects.length,

                files:
                    files.length,

                research:
                    research.length

            },

            directories: {

                root:
                    ROOT_DIR,

                database:
                    DATABASE_DIR,

                storage:
                    STORAGE_DIR,

                public:
                    PUBLIC_DIR

            },

            timestamp:
                nowISO()

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 29. REQUEST ID                                                   ║
// ╚══════════════════════════════════════════════════════════════════╝

app.use(
    (req, res, next) => {

        const requestId =
            createId(
                "request"
            );


        req.requestId =
            requestId;


        res.setHeader(
            "X-Request-ID",
            requestId
        );


        next();

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 30. PART 2 SONU                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// PART 3 BU DOSYANIN HEMEN ALTINA GELECEK.
//
// PART 3:
// • Socket.IO runtime
// • online users
// • typing
// • chat rooms
// • server info
// • static frontend
// • SPA fallback
// • API 404
// • global error handler
// • graceful shutdown
// • Render uyumluluğu
// • server start
// • exports
//
// ÖNEMLİ:
// Burada server.listen() YOK.
// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// TÜRKAI SERVER — PART 3
// RUNTIME / SOCKET / STATIC / PRODUCTION ENGINE
// ═══════════════════════════════════════════════════════════════════


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 1. RUNTIME STATE                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝

const connectedUsers =
    new Map();

const connectedSockets =
    new Map();

const activeChatRooms =
    new Map();

let SERVER_INSTANCE =
    null;

let shuttingDown =
    false;

let serverStartedAt =
    null;


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 2. SOCKET USER IDENTIFICATION                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

function getSocketUser(socket) {

    try {

        const token =
            socket.handshake?.auth?.token ||
            socket.handshake?.headers?.authorization?.replace(
                /^Bearer\s+/i,
                ""
            );

        if (token) {

            const session =
                getSessionByToken(
                    token
                );

            if (session) {

                const user =
                    findUserById(
                        session.userId
                    );

                if (user) {

                    return user;

                }

            }

        }


        const userId =
            socket.handshake?.auth?.userId ||
            socket.handshake?.query?.userId;


        if (userId) {

            const user =
                findUserById(
                    String(userId)
                );

            if (user) {

                return user;

            }

        }


    } catch (error) {

        logError(
            "SOCKET_USER_ERROR",
            {
                error:
                    error.message
            }
        );

    }


    return getGuestUser();

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 3. SOCKET CONNECTION ENGINE                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

io.on(
    "connection",
    socket => {

        const user =
            getSocketUser(
                socket
            );


        const socketId =
            socket.id;


        connectedSockets.set(
            socketId,
            {
                id:
                    socketId,

                userId:
                    user.id,

                connectedAt:
                    nowISO(),

                lastActivity:
                    nowISO()
            }
        );


        if (
            !connectedUsers.has(
                user.id
            )
        ) {

            connectedUsers.set(
                user.id,
                new Set()
            );

        }


        connectedUsers
            .get(user.id)
            .add(socketId);


        socket.data.user =
            user;


        socket.data.connectedAt =
            nowISO();


        logInfo(
            "Socket connected",
            {
                socketId,
                userId:
                    user.id
            }
        );


        socket.emit(
            "turkai:ready",
            {

                success:
                    true,

                socketId,

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    plan:
                        user.plan

                },

                server: {

                    name:
                        APP_NAME,

                    version:
                        APP_VERSION,

                    serverId:
                        SERVER_ID

                },

                timestamp:
                    nowISO()

            }
        );


        socket.on(
            "turkai:ping",
            payload => {

                const info =
                    connectedSockets.get(
                        socketId
                    );


                if (info) {

                    info.lastActivity =
                        nowISO();

                }


                socket.emit(
                    "turkai:pong",
                    {

                        timestamp:
                            nowISO(),

                        received:
                            payload || null

                    }
                );

            }
        );


        socket.on(
            "chat:join",
            chatId => {

                const cleanChatId =
                    cleanText(
                        chatId,
                        200
                    );


                if (!cleanChatId) {

                    return;

                }


                const chat =
                    findChatById(
                        cleanChatId
                    );


                if (
                    chat &&
                    chat.userId !==
                    user.id &&
                    !isAdmin(user)
                ) {

                    socket.emit(
                        "chat:error",
                        {

                            error:
                                "Bu sohbet odasına erişim iznin yok."

                        }
                    );

                    return;

                }


                const room =
                    `chat:${cleanChatId}`;


                socket.join(
                    room
                );


                if (
                    !activeChatRooms.has(
                        cleanChatId
                    )
                ) {

                    activeChatRooms.set(
                        cleanChatId,
                        new Set()
                    );

                }


                activeChatRooms
                    .get(cleanChatId)
                    .add(socketId);


                socket.data.chatId =
                    cleanChatId;


                socket.emit(
                    "chat:joined",
                    {

                        chatId:
                            cleanChatId,

                        room,

                        timestamp:
                            nowISO()

                    }
                );


                logInfo(
                    "Chat room joined",
                    {
                        socketId,
                        userId:
                            user.id,
                        chatId:
                            cleanChatId
                    }
                );

            }
        );


        socket.on(
            "chat:leave",
            chatId => {

                const cleanChatId =
                    cleanText(
                        chatId ||
                        socket.data.chatId ||
                        "",
                        200
                    );


                if (!cleanChatId) {

                    return;

                }


                const room =
                    `chat:${cleanChatId}`;


                socket.leave(
                    room
                );


                const members =
                    activeChatRooms.get(
                        cleanChatId
                    );


                if (members) {

                    members.delete(
                        socketId
                    );


                    if (
                        members.size === 0
                    ) {

                        activeChatRooms.delete(
                            cleanChatId
                        );

                    }

                }


                if (
                    socket.data.chatId ===
                    cleanChatId
                ) {

                    socket.data.chatId =
                        null;

                }


                socket.emit(
                    "chat:left",
                    {

                        chatId:
                            cleanChatId,

                        timestamp:
                            nowISO()

                    }
                );

            }
        );


        socket.on(
            "chat:typing",
            payload => {

                const chatId =
                    cleanText(
                        payload?.chatId ||
                        socket.data.chatId ||
                        "",
                        200
                    );


                if (!chatId) {

                    return;

                }


                const room =
                    `chat:${chatId}`;


                socket.to(
                    room
                ).emit(
                    "chat:typing",
                    {

                        chatId,

                        userId:
                            user.id,

                        name:
                            user.name,

                        typing:
                            Boolean(
                                payload?.typing
                            ),

                        timestamp:
                            nowISO()

                    }
                );


                const info =
                    connectedSockets.get(
                        socketId
                    );


                if (info) {

                    info.lastActivity =
                        nowISO();

                }

            }
        );


        socket.on(
            "chat:presence",
            payload => {

                const chatId =
                    cleanText(
                        payload?.chatId ||
                        socket.data.chatId ||
                        "",
                        200
                    );


                if (!chatId) {

                    return;

                }


                socket.to(
                    `chat:${chatId}`
                ).emit(
                    "chat:presence",
                    {

                        chatId,

                        userId:
                            user.id,

                        name:
                            user.name,

                        online:
                            true,

                        timestamp:
                            nowISO()

                    }
                );

            }
        );


        socket.on(
            "disconnect",
            reason => {

                connectedSockets.delete(
                    socketId
                );


                const userSockets =
                    connectedUsers.get(
                        user.id
                    );


                if (userSockets) {

                    userSockets.delete(
                        socketId
                    );


                    if (
                        userSockets.size === 0
                    ) {

                        connectedUsers.delete(
                            user.id
                        );

                    }

                }


                for (
                    const [
                        chatId,
                        members
                    ]
                    of activeChatRooms
                ) {

                    members.delete(
                        socketId
                    );


                    if (
                        members.size === 0
                    ) {

                        activeChatRooms.delete(
                            chatId
                        );

                    }

                }


                logInfo(
                    "Socket disconnected",
                    {
                        socketId,
                        userId:
                            user.id,
                        reason
                    }
                );

            }
        );

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 4. SOCKET STATUS API                                             ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/socket/status",
    (req, res) => {

        res.json({

            success:
                true,

            sockets:
                connectedSockets.size,

            users:
                connectedUsers.size,

            rooms:
                activeChatRooms.size,

            timestamp:
                nowISO()

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 5. SERVER INFORMATION                                            ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api/server/info",
    (req, res) => {

        const memory =
            process.memoryUsage();


        res.json({

            success:
                true,

            app: {

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

                pid:
                    process.pid,

                uptime:
                    process.uptime(),

                memory

            },

            server: {

                id:
                    SERVER_ID,

                host:
                    HOST,

                port:
                    PORT,

                environment:
                    NODE_ENV,

                startedAt:
                    serverStartedAt

            },

            realtime: {

                sockets:
                    connectedSockets.size,

                users:
                    connectedUsers.size,

                rooms:
                    activeChatRooms.size

            },

            timestamp:
                nowISO()

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 6. ROOT API                                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/api",
    (req, res) => {

        res.json({

            success:
                true,

            name:
                APP_NAME,

            version:
                APP_VERSION,

            message:
                "TürkAI API aktif.",

            endpoints: {

                health:
                    "/api/health",

                status:
                    "/api/status",

                server:
                    "/api/server/info",

                socket:
                    "/api/socket/status",

                plans:
                    "/api/plans",

                me:
                    "/api/me",

                chat:
                    "/api/chat",

                research:
                    "/api/research",

                search:
                    "/api/search",

                memory:
                    "/api/memory",

                files:
                    "/api/files",

                projects:
                    "/api/projects",

                docs:
                    "/api/docs"

            },

            timestamp:
                nowISO()

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 7. STATIC FRONTEND                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

const publicDirectory =
    PUBLIC_DIR;


if (
    fs.existsSync(
        publicDirectory
    )
) {

    app.use(
        express.static(
            publicDirectory,
            {

                index:
                    false,

                maxAge:
                    IS_PRODUCTION
                        ? "1h"
                        : 0,

                etag:
                    true,

                lastModified:
                    true

            }
        )
    );

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 8. ROOT FRONTEND                                                 ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get(
    "/",
    (req, res) => {

        const indexPath =
            path.join(
                publicDirectory,
                "index.html"
            );


        if (
            fs.existsSync(
                indexPath
            )
        ) {

            return res.sendFile(
                indexPath
            );

        }


        res
            .status(200)
            .type("html")
            .send(
                `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME}</title>
<style>
*{box-sizing:border-box}
body{
margin:0;
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
background:#090b10;
color:#fff;
}
.card{
width:min(680px,calc(100% - 32px));
padding:32px;
border:1px solid rgba(255,255,255,.12);
border-radius:24px;
background:rgba(255,255,255,.05);
backdrop-filter:blur(20px);
text-align:center;
}
h1{margin:0 0 10px;font-size:32px}
p{color:#a9afbd;line-height:1.6}
.status{
display:inline-flex;
align-items:center;
gap:8px;
padding:10px 14px;
border-radius:999px;
background:rgba(32,199,214,.12);
color:#20c7d6;
}
</style>
</head>
<body>
<div class="card">
<div class="status">● TürkAI API aktif</div>
<h1>TürkAI ${APP_VERSION}</h1>
<p>
Sunucu çalışıyor fakat <b>public/index.html</b>
dosyası bulunamadı.
</p>
</div>
</body>
</html>`
            );

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 9. SPA FALLBACK — EXPRESS 5 UYUMLU                               ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// Express 5 / path-to-regexp sürümlerinde
// eski app.get("*") kullanımı sorun çıkarabilir.
// Bu yüzden wildcard yerine middleware
// kullanıyoruz.
//

app.use(
    (req, res, next) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return next();

        }


        if (
            req.method !== "GET"
        ) {

            return next();

        }


        const indexPath =
            path.join(
                publicDirectory,
                "index.html"
            );


        if (
            fs.existsSync(
                indexPath
            )
        ) {

            return res.sendFile(
                indexPath
            );

        }


        next();

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 10. API 404                                                      ║
// ╚══════════════════════════════════════════════════════════════════╝

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success:
                false,

            error:
                "API endpoint bulunamadı.",

            path:
                req.originalUrl,

            method:
                req.method,

            requestId:
                req.requestId ||
                null,

            timestamp:
                nowISO()

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 11. GLOBAL 404                                                    ║
// ╚══════════════════════════════════════════════════════════════════╝

app.use(
    (req, res) => {

        if (
            req.accepts("html")
        ) {

            return res
                .status(404)
                .type("html")
                .send(
                    `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — TürkAI</title>
<style>
*{box-sizing:border-box}
body{
margin:0;
min-height:100vh;
display:flex;
align-items:center;
justify-content:center;
background:#090b10;
color:#fff;
font-family:system-ui,sans-serif;
}
main{
text-align:center;
padding:30px;
}
.code{
font-size:80px;
font-weight:800;
letter-spacing:-4px;
}
p{
color:#9da5b5;
}
a{
display:inline-block;
margin-top:12px;
padding:12px 18px;
border-radius:12px;
background:#7c5cff;
color:white;
text-decoration:none;
}
</style>
</head>
<body>
<main>
<div class="code">404</div>
<h1>Sayfa bulunamadı</h1>
<p>TürkAI istediğin sayfayı bulamadı.</p>
<a href="/">Ana sayfaya dön</a>
</main>
</body>
</html>`
                );

        }


        res.status(404).json({

            success:
                false,

            error:
                "Not found",

            path:
                req.originalUrl

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 12. GLOBAL ERROR HANDLER                                         ║
// ╚══════════════════════════════════════════════════════════════════╝

app.use(
    (error, req, res, next) => {

        logError(
            "GLOBAL_SERVER_ERROR",
            {

                error:
                    error?.message ||
                    String(error),

                stack:
                    error?.stack,

                method:
                    req?.method,

                path:
                    req?.originalUrl,

                requestId:
                    req?.requestId

            }
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        const status =
            Number(
                error?.status ||
                error?.statusCode ||
                500
            );


        res.status(
            status >= 400 &&
            status < 600
                ? status
                : 500
        ).json({

            success:
                false,

            error:
                IS_PRODUCTION
                    ? "Sunucu tarafında bir hata oluştu."
                    : (
                        error?.message ||
                        "Sunucu hatası."
                    ),

            requestId:
                req?.requestId ||
                null

        });

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 13. STARTUP BANNER                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

function printStartupBanner() {

    console.log("");

    console.log(
        "════════════════════════════════════════════════════════"
    );

    console.log(
        "                 TÜRKAI SERVER"
    );

    console.log(
        "════════════════════════════════════════════════════════"
    );

    console.log(
        ` App        : ${APP_NAME}`
    );

    console.log(
        ` Version    : ${APP_VERSION}`
    );

    console.log(
        ` Environment: ${NODE_ENV}`
    );

    console.log(
        ` Host       : ${HOST}`
    );

    console.log(
        ` Port       : ${PORT}`
    );

    console.log(
        ` Server ID  : ${SERVER_ID}`
    );

    console.log(
        ` Node       : ${process.version}`
    );

    console.log(
        ` Platform   : ${process.platform}`
    );

    console.log(
        "────────────────────────────────────────────────────────"
    );

    console.log(
        ` Local AI   : ${true ? "READY" : "OFF"}`
    );

    console.log(
        ` Groq       : ${GROQ_API_KEY ? "READY" : "OFF"}`
    );

    console.log(
        ` Cerebras   : ${CEREBRAS_API_KEY ? "READY" : "OFF"}`
    );

    console.log(
        ` OpenRouter : ${OPENROUTER_API_KEY ? "READY" : "OFF"}`
    );

    console.log(
        ` Gemini     : ${GEMINI_API_KEY ? "READY" : "OFF"}`
    );

    console.log(
        "────────────────────────────────────────────────────────"
    );

    console.log(
        " Health     : /api/health"
    );

    console.log(
        " Status     : /api/status"
    );

    console.log(
        " API        : /api"
    );

    console.log(
        " Docs       : /api/docs"
    );

    console.log(
        "════════════════════════════════════════════════════════"
    );

    console.log("");

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 14. SERVER START                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝

function startServer() {

    if (
        SERVER_INSTANCE
    ) {

        logInfo(
            "Server zaten çalışıyor."
        );

        return SERVER_INSTANCE;

    }


    if (
        shuttingDown
    ) {

        throw new Error(
            "Server kapanma sürecinde."
        );

    }


    serverStartedAt =
        nowISO();


    SERVER_INSTANCE =
        httpServer.listen(
            PORT,
            HOST,
            () => {

                printStartupBanner();


                logInfo(
                    "TürkAI server started",
                    {

                        app:
                            APP_NAME,

                        version:
                            APP_VERSION,

                        host:
                            HOST,

                        port:
                            PORT,

                        serverId:
                            SERVER_ID

                    }
                );

            }
        );


    SERVER_INSTANCE.on(
        "error",
        error => {

            logError(
                "HTTP_SERVER_ERROR",
                {

                    message:
                        error.message,

                    code:
                        error.code,

                    stack:
                        error.stack

                }
            );


            if (
                error.code ===
                "EADDRINUSE"
            ) {

                console.error(
                    `Port ${PORT} zaten kullanılıyor.`
                );

            }

        }
    );


    SERVER_INSTANCE.on(
        "listening",
        () => {

            const address =
                SERVER_INSTANCE.address();


            logInfo(
                "HTTP server listening",
                {
                    address
                }
            );

        }
    );


    SERVER_INSTANCE.on(
        "close",
        () => {

            logInfo(
                "HTTP server closed."
            );

        }
    );


    return SERVER_INSTANCE;

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 15. GRACEFUL SHUTDOWN                                             ║
// ╚══════════════════════════════════════════════════════════════════╝

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


    console.log("");

    console.log(
        `TürkAI shutdown başlatılıyor: ${signal}`
    );


    logInfo(
        "Shutdown started",
        {
            signal
        }
    );


    try {

        clearInterval(
            MAINTENANCE_INTERVAL
        );

    } catch {}


    try {

        clearInterval(
            BACKUP_INTERVAL
        );

    } catch {}


    try {

        backupDatabase();

    } catch (error) {

        logError(
            "SHUTDOWN_BACKUP_ERROR",
            {
                error:
                    error.message
            }
        );

    }


    for (
        const [
            socketId,
            socket
        ]
        of io.sockets.sockets
    ) {

        try {

            socket.emit(
                "turkai:shutdown",
                {

                    message:
                        "TürkAI sunucusu kapanıyor.",

                    timestamp:
                        nowISO()

                }
            );


            socket.disconnect(
                true
            );

        } catch {}

    }


    if (
        SERVER_INSTANCE
    ) {

        await new Promise(
            resolve => {

                let finished =
                    false;


                const finish =
                    () => {

                        if (
                            finished
                        ) {

                            return;

                        }


                        finished =
                            true;

                        resolve();

                    };


                try {

                    SERVER_INSTANCE.close(
                        finish
                    );

                } catch {

                    finish();

                }


                setTimeout(
                    finish,
                    8000
                );

            }
        );

    }


    SERVER_INSTANCE =
        null;


    logInfo(
        "Shutdown completed",
        {
            signal
        }
    );


    console.log(
        "TürkAI server kapandı."
    );

}


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 16. PROCESS SIGNALS                                               ║
// ╚══════════════════════════════════════════════════════════════════╝

process.on(
    "SIGINT",
    () => {

        shutdown(
            "SIGINT"
        ).finally(
            () => {
                process.exit(
                    0
                );
            }
        );

    }
);


process.on(
    "SIGTERM",
    () => {

        shutdown(
            "SIGTERM"
        ).finally(
            () => {
                process.exit(
                    0
                );
            }
        );

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 17. UNCAUGHT EXCEPTION                                            ║
// ╚══════════════════════════════════════════════════════════════════╝

process.on(
    "uncaughtException",
    error => {

        logError(
            "UNCAUGHT_EXCEPTION",
            {

                message:
                    error.message,

                stack:
                    error.stack

            }
        );


        shutdown(
            "uncaughtException"
        ).finally(
            () => {

                process.exit(
                    1
                );

            }
        );

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 18. UNHANDLED REJECTION                                           ║
// ╚══════════════════════════════════════════════════════════════════╝

process.on(
    "unhandledRejection",
    reason => {

        logError(
            "UNHANDLED_REJECTION",
            {

                reason:
                    reason instanceof Error
                        ? reason.message
                        : String(reason),

                stack:
                    reason instanceof Error
                        ? reason.stack
                        : undefined

            }
        );

    }
);


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 19. SERVER EXPORTS                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

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

    performResearch,

    getProjects,

    getFiles,

    getResearch,

    createUser,

    createSession,

    findUserById,

    findUserByEmail,

    getChatMessages,

    addMessage,

    createChat,

    getPlanForUser,

    usageAvailable,

    updateUsage,

    backupDatabase,

    cleanupTemp,

    cleanupSessions,

    getSecurityEvents,

    addSecurityEvent

};


// ╔══════════════════════════════════════════════════════════════════╗
// ║ 20. FINAL START GUARD                                             ║
// ╚══════════════════════════════════════════════════════════════════╝

if (
    require.main === module
) {

    startServer();

}


// ═══════════════════════════════════════════════════════════════════
// END OF TÜRKAI SERVER
// ═══════════════════════════════════════════════════════════════════
