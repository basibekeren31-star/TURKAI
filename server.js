"use strict";

/*
╔══════════════════════════════════════════════════════════════╗
║                    TÜRKAI MASTER SERVER                     ║
║                         VERSION 30                         ║
║                                                              ║
║ Tek dosyalık mimari                                         ║
║ Cevap hafızası YOK                                          ║
║                                                              ║
║ Part 1/10                                                   ║
║ • Express                                                    ║
║ • HTTP                                                       ║
║ • Socket.IO                                                  ║
║ • Güvenlik                                                    ║
║ • Rate limit                                                  ║
║ • Dosya sistemleri                                            ║
║ • Sistem state                                                ║
║ • AI provider altyapısı                                       ║
║ • Ortak yardımcı fonksiyonlar                                 ║
╚══════════════════════════════════════════════════════════════╝
*/


// ============================================================
// CORE IMPORTS
// ============================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");

let Server = null;

try {
    const socketModule = require("socket.io");
    Server = socketModule.Server;
} catch {
    Server = null;
}

try {
    require("dotenv").config();
} catch {
    // dotenv yoksa environment yine kullanılabilir
}


// ============================================================
// OPTIONAL MULTER
// ============================================================

let multer = null;

try {
    multer = require("multer");
} catch {
    multer = null;
}


// ============================================================
// VERSION
// ============================================================

const SERVER_VERSION = "30.0.0";

const SERVER_NAME =
    "TürkAI Master Server";


// ============================================================
// ROOT PATHS
// ============================================================

const ROOT_DIR =
    path.resolve(__dirname);

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const USERS_DIR =
    path.join(
        DATA_DIR,
        "users"
    );

const CHATS_DIR =
    path.join(
        DATA_DIR,
        "chats"
    );

const UPLOADS_DIR =
    path.join(
        DATA_DIR,
        "uploads"
    );

const MEDIA_DIR =
    path.join(
        DATA_DIR,
        "media"
    );

const RESEARCH_DIR =
    path.join(
        DATA_DIR,
        "research"
    );

const WEATHER_DIR =
    path.join(
        DATA_DIR,
        "weather"
    );

const TASKS_DIR =
    path.join(
        DATA_DIR,
        "tasks"
    );

const PLANS_DIR =
    path.join(
        DATA_DIR,
        "plans"
    );

const LOGS_DIR =
    path.join(
        DATA_DIR,
        "logs"
    );


// ============================================================
// DATA FILES
// ============================================================

const USERS_FILE =
    path.join(
        USERS_DIR,
        "users.json"
    );

const USAGE_FILE =
    path.join(
        USERS_DIR,
        "usage.json"
    );

const PLANS_FILE =
    path.join(
        PLANS_DIR,
        "plans.json"
    );

const TASKS_FILE =
    path.join(
        TASKS_DIR,
        "tasks.json"
    );

const RESEARCH_CACHE_FILE =
    path.join(
        RESEARCH_DIR,
        "cache.json"
    );

const WEATHER_CACHE_FILE =
    path.join(
        WEATHER_DIR,
        "cache.json"
    );

const CHAT_LOG_FILE =
    path.join(
        LOGS_DIR,
        "chat.jsonl"
    );

const SYSTEM_LOG_FILE =
    path.join(
        LOGS_DIR,
        "system.jsonl"
    );


// ============================================================
// DIRECTORY SETUP
// ============================================================

function ensureDirectories() {
    const directories = [
        DATA_DIR,
        USERS_DIR,
        CHATS_DIR,
        UPLOADS_DIR,
        MEDIA_DIR,
        RESEARCH_DIR,
        WEATHER_DIR,
        TASKS_DIR,
        PLANS_DIR,
        LOGS_DIR
    ];

    for (
        const directory
        of directories
    ) {
        try {
            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );
        } catch (error) {
            console.error(
                "[TürkAI] Dizin oluşturulamadı:",
                directory,
                error.message
            );
        }
    }
}

ensureDirectories();


// ============================================================
// EXPRESS
// ============================================================

const app =
    express();

const httpServer =
    http.createServer(
        app
    );


// ============================================================
// SOCKET.IO
// ============================================================

let io = null;

if (Server) {
    try {
        io =
            new Server(
                httpServer,
                {
                    cors: {
                        origin: "*",
                        methods: [
                            "GET",
                            "POST"
                        ]
                    },

                    maxHttpBufferSize:
                        15 * 1024 * 1024
                }
            );
    } catch (error) {
        console.error(
            "[TürkAI] Socket.IO başlatılamadı:",
            error.message
        );

        io = null;
    }
}


// ============================================================
// SERVER CONFIG
// ============================================================

const PORT =
    Number(
        process.env.PORT || 3000
    );

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const API_SECRET =
    process.env.TURKAI_API_SECRET ||
    "";

const MAX_BODY_SIZE =
    process.env.TURKAI_MAX_BODY ||
    "12mb";

const REQUEST_TIMEOUT =
    Number(
        process.env.TURKAI_TIMEOUT ||
        30000
    );


// ============================================================
// GLOBAL RUNTIME STATE
// ============================================================

const runtime = {
    startedAt:
        new Date().toISOString(),

    requests: 0,

    chatRequests: 0,

    researchRequests: 0,

    weatherRequests: 0,

    uploadRequests: 0,

    mediaRequests: 0,

    taskRequests: 0,

    successfulRequests: 0,

    failedRequests: 0,

    activeSockets: 0,

    activeJobs: 0
};


// ============================================================
// AI PROVIDERS
// ============================================================

const providers = {
    local: {
        enabled: true,
        configured: true,
        model:
            "turkai-local"
    },

    groq: {
        enabled:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        configured:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        endpoint:
            "https://api.groq.com/openai/v1/chat/completions",

        model:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b"
    },

    cerebras: {
        enabled:
            Boolean(
                process.env.CEREBRAS_API_KEY
            ),

        configured:
            Boolean(
                process.env.CEREBRAS_API_KEY
            ),

        endpoint:
            "https://api.cerebras.ai/v1/chat/completions",

        model:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b"
    },

    gemini: {
        enabled:
            Boolean(
                process.env.GEMINI_API_KEY
            ),

        configured:
            Boolean(
                process.env.GEMINI_API_KEY
            ),

        endpoint:
            "https://generativelanguage.googleapis.com/v1beta",

        model:
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash"
    },

    openrouter: {
        enabled:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        configured:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        endpoint:
            "https://openrouter.ai/api/v1/chat/completions",

        model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-oss-20b"
    }
};


// ============================================================
// DEFAULT AI CONFIG
// ============================================================

const aiConfig = {
    defaultProvider:
        process.env.TURKAI_DEFAULT_PROVIDER ||
        "local",

    defaultModel:
        process.env.TURKAI_DEFAULT_MODEL ||
        "turkai-local",

    temperature:
        Number(
            process.env.TURKAI_TEMPERATURE ||
            0.7
        ),

    maxTokens:
        Number(
            process.env.TURKAI_MAX_TOKENS ||
            4096
        ),

    timeoutMs:
        Number(
            process.env.TURKAI_AI_TIMEOUT ||
            30000
        )
};


// ============================================================
// PLAN DEFINITIONS
// ============================================================

const PLAN_DEFINITIONS = {
    free: {
        id: "free",
        name: "Free",

        price: 0,

        dailyMessages: 50,

        dailyResearch: 5,

        dailyImages: 0,

        dailyVideos: 0,

        maxUploadMB: 10,

        features: {
            chat: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            image: false,
            video: false,
            tasks: true
        }
    },

    pro: {
        id: "pro",
        name: "Pro",

        price: 250,

        dailyMessages: 100,

        dailyResearch: 25,

        dailyImages: 2,

        dailyVideos: 0,

        maxUploadMB: 25,

        features: {
            chat: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            image: true,
            video: false,
            tasks: true
        }
    },

    plus: {
        id: "plus",
        name: "Plus",

        price: 500,

        dailyMessages: 200,

        dailyResearch: 75,

        dailyImages: 4,

        dailyVideos: 5,

        maxUploadMB: 50,

        features: {
            chat: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            image: true,
            video: true,
            tasks: true
        }
    },

    ultra: {
        id: "ultra",
        name: "Ultra",

        price: 1000,

        dailyMessages: 1000,

        dailyResearch: 250,

        dailyImages: 10,

        dailyVideos: 20,

        maxUploadMB: 100,

        comingSoon: true,

        features: {
            chat: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            image: true,
            video: true,
            tasks: true,
            videoCall: true
        }
    },

    developer: {
        id: "developer",
        name: "Developer",

        price: 0,

        dailyMessages: 400,

        dailyResearch: 1000,

        dailyImages: 50,

        dailyVideos: 50,

        maxUploadMB: 250,

        internal: true,

        features: {
            chat: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            image: true,
            video: true,
            tasks: true,
            videoCall: true
        }
    }
};


// ============================================================
// RUNTIME DATABASE
// ============================================================

let users = {};

let usage = {};

let tasks = {};

let researchCache = {};

let weatherCache = {};

let activeJobs = new Map();

let socketUsers = new Map();


// ============================================================
// COMMON HELPERS
// ============================================================

function safeString(
    value,
    fallback = ""
) {
    if (
        value === null ||
        value === undefined
    ) {
        return fallback;
    }

    try {
        return String(value)
            .trim();
    } catch {
        return fallback;
    }
}

function normalizeText(
    value
) {
    return safeString(value)
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function cleanText(
    value,
    max = 20000
) {
    return safeString(value)
        .replace(
            /\u0000/g,
            ""
        )
        .slice(0, max);
}

function number(
    value,
    fallback = 0
) {
    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function boolean(
    value,
    fallback = false
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    if (
        typeof value === "boolean"
    ) {
        return value;
    }

    const n =
        normalizeText(value);

    if (
        [
            "true",
            "1",
            "yes",
            "on",
            "evet"
        ].includes(n)
    ) {
        return true;
    }

    if (
        [
            "false",
            "0",
            "no",
            "off",
            "hayır",
            "hayir"
        ].includes(n)
    ) {
        return false;
    }

    return fallback;
}

function clone(value) {
    try {
        return JSON.parse(
            JSON.stringify(value)
        );
    } catch {
        return value;
    }
}

function nowISO() {
    return new Date()
        .toISOString();
}

function createId(
    prefix = "turkai"
) {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(5)
            .toString("hex")
    );
}

function todayKey() {
    const now =
        new Date();

    return [
        now.getFullYear(),
        String(
            now.getMonth() + 1
        ).padStart(2, "0"),
        String(
            now.getDate()
        ).padStart(2, "0")
    ].join("-");
}


// ============================================================
// JSON STORAGE
// ============================================================

function readJSON(
    file,
    fallback
) {
    try {
        if (
            !fs.existsSync(file)
        ) {
            return clone(
                fallback
            );
        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (
            !raw.trim()
        ) {
            return clone(
                fallback
            );
        }

        return JSON.parse(
            raw
        );
    } catch {
        return clone(
            fallback
        );
    }
}

function writeJSON(
    file,
    data
) {
    try {
        fs.mkdirSync(
            path.dirname(file),
            {
                recursive: true
            }
        );

        fs.writeFileSync(
            file,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        return true;
    } catch (error) {
        console.error(
            "[TürkAI] JSON yazma hatası:",
            error.message
        );

        return false;
    }
}

function appendLog(
    file,
    event,
    data = {}
) {
    try {
        const line =
            JSON.stringify({
                timestamp:
                    nowISO(),

                event,

                ...clone(data)
            }) +
            "\n";

        fs.appendFileSync(
            file,
            line,
            "utf8"
        );

        return true;
    } catch {
        return false;
    }
}


// ============================================================
// INITIAL DATA LOAD
// ============================================================

users =
    readJSON(
        USERS_FILE,
        {}
    );

usage =
    readJSON(
        USAGE_FILE,
        {}
    );

tasks =
    readJSON(
        TASKS_FILE,
        {}
    );

researchCache =
    readJSON(
        RESEARCH_CACHE_FILE,
        {}
    );

weatherCache =
    readJSON(
        WEATHER_CACHE_FILE,
        {}
    );


// ============================================================
// EXPRESS BODY
// ============================================================

app.use(
    express.json({
        limit:
            MAX_BODY_SIZE
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit:
            MAX_BODY_SIZE
    })
);


// ============================================================
// SECURITY HEADERS
// ============================================================

app.disable(
    "x-powered-by"
);

app.use(
    (req, res, next) => {
        res.setHeader(
            "X-Content-Type-Options",
            "nosniff"
        );

        res.setHeader(
            "X-Frame-Options",
            "SAMEORIGIN"
        );

        res.setHeader(
            "Referrer-Policy",
            "strict-origin-when-cross-origin"
        );

        res.setHeader(
            "Permissions-Policy",
            "camera=*, microphone=*, geolocation=*"
        );

        next();
    }
);


// ============================================================
// SIMPLE RATE LIMIT
// ============================================================

const rateStore =
    new Map();

const RATE_WINDOW =
    60 * 1000;

const RATE_LIMIT =
    Number(
        process.env.TURKAI_RATE_LIMIT ||
        120
    );

function getClientIp(req) {
    const forwarded =
        safeString(
            req.headers[
                "x-forwarded-for"
            ]
        );

    if (forwarded) {
        return forwarded
            .split(",")[0]
            .trim();
    }

    return (
        req.socket &&
        req.socket.remoteAddress
    ) || "unknown";
}

function rateLimitMiddleware(
    req,
    res,
    next
) {
    const ip =
        getClientIp(req);

    const now =
        Date.now();

    let record =
        rateStore.get(ip);

    if (
        !record ||
        now -
            record.startedAt >
            RATE_WINDOW
    ) {
        record = {
            startedAt: now,
            count: 0
        };
    }

    record.count++;

    rateStore.set(
        ip,
        record
    );

    if (
        record.count >
        RATE_LIMIT
    ) {
        return res
            .status(429)
            .json({
                success: false,
                error:
                    "rate_limit_exceeded",
                retryAfterSeconds:
                    Math.ceil(
                        (
                            RATE_WINDOW -
                            (
                                now -
                                record.startedAt
                            )
                        ) / 1000
                    )
            });
    }

    next();
}

app.use(
    rateLimitMiddleware
);


// ============================================================
// REQUEST TRACKING
// ============================================================

app.use(
    (req, res, next) => {
        runtime.requests++;

        res.on(
            "finish",
            () => {
                if (
                    res.statusCode >= 200 &&
                    res.statusCode < 400
                ) {
                    runtime.successfulRequests++;
                } else {
                    runtime.failedRequests++;
                }
            }
        );

        next();
    }
);


// ============================================================
// BASIC AUTH CHECK
// ============================================================

function authenticateRequest(
    req,
    res,
    next
) {
    if (!API_SECRET) {
        return next();
    }

    const received =
        safeString(
            req.headers[
                "x-turkai-api-key"
            ]
        );

    if (!received) {
        return res
            .status(401)
            .json({
                success: false,
                error:
                    "api_key_required"
            });
    }

    const a =
        Buffer.from(
            received
        );

    const b =
        Buffer.from(
            API_SECRET
        );

    if (
        a.length !==
        b.length
    ) {
        return res
            .status(401)
            .json({
                success: false,
                error:
                    "invalid_api_key"
            });
    }

    let mismatch = 0;

    for (
        let i = 0;
        i < a.length;
        i++
    ) {
        mismatch |=
            a[i] ^ b[i];
    }

    if (
        mismatch !== 0
    ) {
        return res
            .status(401)
            .json({
                success: false,
                error:
                    "invalid_api_key"
            });
    }

    next();
}


// ============================================================
// SYSTEM ROUTES
// ============================================================

app.get(
    "/api",
    (req, res) => {
        res.json({
            success: true,

            name:
                SERVER_NAME,

            version:
                SERVER_VERSION,

            message:
                "TürkAI API hazır.",

            endpoints: {
                chat:
                    "/api/chat",

                research:
                    "/api/research",

                weather:
                    "/api/weather",

                currency:
                    "/api/currency",

                upload:
                    "/api/upload",

                image:
                    "/api/media/image",

                video:
                    "/api/media/video",

                tasks:
                    "/api/tasks",

                plans:
                    "/api/plans",

                health:
                    "/api/health",

                status:
                    "/api/status"
            }
        });
    }
);

app.get(
    "/api/health",
    (req, res) => {
        res.json({
            success: true,

            ok: true,

            status:
                "healthy",

            version:
                SERVER_VERSION,

            timestamp:
                nowISO(),

            uptimeSeconds:
                Math.floor(
                    (
                        Date.now() -
                        new Date(
                            runtime.startedAt
                        ).getTime()
                    ) / 1000
                ),

            node:
                process.version,

            environment:
                NODE_ENV,

            socketIO:
                Boolean(io),

            fetch:
                typeof fetch ===
                "function",

            multer:
                Boolean(multer)
        });
    }
);

app.get(
    "/api/status",
    (req, res) => {
        res.json({
            success: true,

            server: {
                name:
                    SERVER_NAME,

                version:
                    SERVER_VERSION,

                port:
                    PORT,

                environment:
                    NODE_ENV,

                startedAt:
                    runtime.startedAt
            },

            runtime:
                clone(runtime),

            providers:
                Object.fromEntries(
                    Object.entries(
                        providers
                    ).map(
                        ([key, value]) => [
                            key,
                            {
                                enabled:
                                    value.enabled,

                                configured:
                                    value.configured,

                                model:
                                    value.model ||
                                    null
                            }
                        ]
                    )
                ),

            features: {
                ai:
                    true,

                research:
                    true,

                weather:
                    true,

                currency:
                    true,

                uploads:
                    true,

                media:
                    true,

                tasks:
                    true,

                plans:
                    true,

                socketIO:
                    Boolean(io)
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// ROOT
// ============================================================

app.get(
    "/api/master",
    (req, res) => {
        res.json({
            success: true,

            name:
                "TürkAI",

            server:
                SERVER_VERSION,

            status:
                "online",

            message:
                "TürkAI Master Server çalışıyor."
        });
    }
);


// ============================================================
// STATIC FRONTEND
// ============================================================

app.use(
    express.static(
        ROOT_DIR,
        {
            extensions: [
                "html"
            ]
        }
    )
);


// ============================================================
// 404 API
// ============================================================



// ============================================================
// ERROR HANDLER
// ============================================================

app.use(
    (error, req, res, next) => {
        console.error(
            "[TürkAI ERROR]",
            error
        );

        appendLog(
            SYSTEM_LOG_FILE,
            "express_error",
            {
                message:
                    error.message,

                stack:
                    error.stack,

                path:
                    req.originalUrl
            }
        );

        if (
            res.headersSent
        ) {
            return next(error);
        }

        res.status(
            Number(
                error.status ||
                500
            )
        ).json({
            success: false,

            error:
                "internal_server_error",

            message:
                NODE_ENV ===
                "development"
                    ? error.message
                    : "Sunucu hatası."
        });
    }
);


// ============================================================
// PART 1 EXPORT STATE
// ============================================================

const serverState = {
    app,

    httpServer,

    io,

    runtime,

    providers,

    aiConfig,

    users,

    usage,

    tasks,

    activeJobs
};


// ============================================================
// PART 1 END
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "TürkAI Master Server Part 1/10 yüklendi"
);

console.log(
    "Sürüm        :",
    SERVER_VERSION
);

console.log(
    "Node         :",
    process.version
);

console.log(
    "Express      : AKTİF"
);

console.log(
    "Socket.IO    :",
    io
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Fetch        :",
    typeof fetch ===
        "function"
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "Multer       :",
    multer
        ? "AKTİF"
        : "OPSİYONEL"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 2'DE GELECEK
// ============================================================
//
// • AI chat engine
// • Local AI fallback
// • Groq
// • Cerebras
// • Gemini
// • OpenRouter
// • model seçimi
// • provider fallback
// • conversation history
// • coding mode
// • language detection
// • streaming altyapısı
//
// ============================================================
// ============================================================
// PART 2/10 CONTINUATION
// GELİŞMİŞ KONUŞMA MOTORU
// ============================================================


// ============================================================
// DIAGNOSTICS CONTINUATION
// ============================================================

app.get(
    "/api/ai/diagnostics",
    (req, res) => {
        return res.json({
            success: true,

            engine: {
                ...clone(
                    AI_ENGINE_STATE
                ),

                uptimeMs:
                    Date.now() -
                    new Date(
                        AI_ENGINE_STATE.startedAt
                    ).getTime()
            },

            sessions: {
                count:
                    chatSessions.size,

                cache:
                    aiResponseCache.size,

                storedMessages:
                    Array.from(
                        chatSessions.values()
                    ).reduce(
                        (total, session) =>
                            total +
                            session.messages.length,
                        0
                    )
            },

            providers:
                Object.fromEntries(
                    Array.from(
                        providerMetrics
                    ).map(
                        ([name, metrics]) => [
                            name,
                            clone(metrics)
                        ]
                    )
                ),

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// CONVERSATION STYLE API
// ============================================================

app.get(
    "/api/chat/styles",
    (req, res) => {
        return res.json({
            success: true,

            styles:
                clone(
                    TURKAI_CONVERSATION_STYLES
                )
        });
    }
);


// ============================================================
// CONVERSATION METADATA API
// ============================================================

app.post(
    "/api/chat/analyze",
    (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.text ||
                    req.body.prompt
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,
                error:
                    "message_required"
            });
        }

        return res.json({
            success: true,

            analysis:
                buildConversationMetadata(
                    message
                )
        });
    }
);


// ============================================================
// SESSION TITLE GENERATOR
// ============================================================

function generateSessionTitle(
    message
) {
    const text =
        sanitizeUserMessage(
            message
        );

    if (!text) {
        return "Yeni sohbet";
    }

    const cleaned =
        text
            .replace(
                /https?:\/\/\S+/gi,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    if (!cleaned) {
        return "Yeni sohbet";
    }

    if (
        cleaned.length <= 50
    ) {
        return cleaned;
    }

    return (
        cleaned
            .slice(0, 47)
            .trim() +
        "..."
    );
}


// ============================================================
// SESSION TITLE API
// ============================================================

app.post(
    "/api/chat/session/:sessionId/title",
    (req, res) => {
        const sessionId =
            safeString(
                req.params.sessionId
            );

        const userId =
            normalizeUserIdAI(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : "guest"
            );

        const session =
            chatSessions.get(
                sessionId
            );

        if (
            !session ||
            session.userId !==
                userId
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "session_not_found"
            });
        }

        const title =
            sanitizeUserMessage(
                req.body &&
                req.body.title
            );

        session.title =
            title
                ? title.slice(
                    0,
                    120
                )
                : generateSessionTitle(
                    session.messages[0] &&
                    session.messages[0].content
                );

        session.updatedAt =
            nowISO();

        return res.json({
            success: true,

            sessionId,

            title:
                session.title
        });
    }
);


// ============================================================
// SESSION MESSAGE API
// ============================================================

app.get(
    "/api/chat/session/:sessionId/messages",
    (req, res) => {
        const sessionId =
            safeString(
                req.params.sessionId
            );

        const userId =
            normalizeUserIdAI(
                req.query.userId ||
                "guest"
            );

        const session =
            chatSessions.get(
                sessionId
            );

        if (
            !session ||
            session.userId !==
                userId
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "session_not_found"
            });
        }

        const limit =
            Math.min(
                Math.max(
                    number(
                        req.query.limit,
                        50
                    ),
                    1
                ),
                AI_LIMITS.maxSessionMessages
            );

        return res.json({
            success: true,

            sessionId,

            messages:
                clone(
                    session.messages
                        .slice(-limit)
                )
        });
    }
);


// ============================================================
// SESSION MESSAGE DELETE
// ============================================================

app.delete(
    "/api/chat/session/:sessionId/messages",
    (req, res) => {
        const sessionId =
            safeString(
                req.params.sessionId
            );

        const userId =
            normalizeUserIdAI(
                req.query.userId ||
                "guest"
            );

        const session =
            chatSessions.get(
                sessionId
            );

        if (
            !session ||
            session.userId !==
                userId
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "session_not_found"
            });
        }

        const count =
            session.messages.length;

        session.messages =
            [];

        session.messageCount =
            0;

        session.updatedAt =
            nowISO();

        return res.json({
            success: true,

            sessionId,

            deletedMessages:
                count
        });
    }
);


// ============================================================
// SESSION EXPORT
// ============================================================

app.get(
    "/api/chat/session/:sessionId/export",
    (req, res) => {
        const sessionId =
            safeString(
                req.params.sessionId
            );

        const userId =
            normalizeUserIdAI(
                req.query.userId ||
                "guest"
            );

        const session =
            chatSessions.get(
                sessionId
            );

        if (
            !session ||
            session.userId !==
                userId
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "session_not_found"
            });
        }

        return res.json({
            success: true,

            exportedAt:
                nowISO(),

            session:
                clone(session)
        });
    }
);


// ============================================================
// ALL SESSIONS EXPORT
// ============================================================

app.get(
    "/api/chat/export",
    (req, res) => {
        const userId =
            normalizeUserIdAI(
                req.query.userId ||
                "guest"
            );

        const sessions = [];

        for (
            const session
            of chatSessions.values()
        ) {
            if (
                session.userId ===
                userId
            ) {
                sessions.push(
                    clone(session)
                );
            }
        }

        return res.json({
            success: true,

            userId,

            exportedAt:
                nowISO(),

            sessions
        });
    }
);


// ============================================================
// CHAT MEMORY IN SERVER
// ============================================================

function getConversationContext(
    session
) {
    if (!session) {
        return [];
    }

    return normalizeIncomingHistory(
        session.messages
            .slice(
                -AI_LIMITS.maxHistoryMessages
            )
            .map(
                item => ({
                    role:
                        item.role,

                    content:
                        item.content
                })
            )
    );
}


// ============================================================
// MESSAGE ROLE VALIDATION
// ============================================================

function isValidChatRole(
    role
) {
    return [
        "system",
        "user",
        "assistant"
    ].includes(
        safeString(role)
            .toLowerCase()
    );
}


// ============================================================
// HISTORY CLEANING
// ============================================================

function sanitizeHistoryForModel(
    history
) {
    if (!Array.isArray(history)) {
        return [];
    }

    const cleaned =
        [];

    for (
        const item
        of history
    ) {
        if (
            !item ||
            typeof item !==
                "object"
        ) {
            continue;
        }

        const role =
            safeString(
                item.role
            ).toLowerCase();

        if (
            !isValidChatRole(
                role
            )
        ) {
            continue;
        }

        const content =
            sanitizeUserMessage(
                item.content
            );

        if (!content) {
            continue;
        }

        cleaned.push({
            role,

            content:
                content.slice(
                    0,
                    AI_LIMITS.maxMessageLength
                )
        });
    }

    return cleaned.slice(
        -AI_LIMITS.maxHistoryMessages
    );
}


// ============================================================
// TOKEN APPROXIMATION
// ============================================================

function estimateTokenCount(
    text
) {
    const value =
        safeString(text);

    if (!value) {
        return 0;
    }

    // Basit yaklaşık hesap
    return Math.ceil(
        value.length /
        4
    );
}

function estimateHistoryTokens(
    history
) {
    if (!Array.isArray(history)) {
        return 0;
    }

    return history.reduce(
        (total, item) =>
            total +
            estimateTokenCount(
                item &&
                item.content
            ),
        0
    );
}


// ============================================================
// CONTEXT TRUNCATION
// ============================================================

function truncateHistoryByTokens(
    history,
    maxTokens = 7000
) {
    if (!Array.isArray(history)) {
        return [];
    }

    const result =
        [];

    let tokens = 0;

    for (
        let i =
            history.length - 1;
        i >= 0;
        i--
    ) {
        const item =
            history[i];

        const itemTokens =
            estimateTokenCount(
                item &&
                item.content
            );

        if (
            tokens +
                itemTokens >
            maxTokens
        ) {
            break;
        }

        result.unshift(
            item
        );

        tokens +=
            itemTokens;
    }

    return result;
}


// ============================================================
// MODEL PROMPT SIZE CONTROL
// ============================================================

function prepareModelContext(
    message,
    history,
    context = {}
) {
    const cleanedMessage =
        sanitizeUserMessage(
            message
        );

    const cleanedHistory =
        sanitizeHistoryForModel(
            history
        );

    const limitedHistory =
        truncateHistoryByTokens(
            cleanedHistory,
            Math.floor(
                AI_LIMITS.maxPromptLength /
                2
            )
        );

    const systemPrompt =
        buildExtendedSystemPrompt(
            context,
            cleanedMessage
        );

    const systemMessage = {
        role:
            "system",

        content:
            aiTrim(
                systemPrompt,
                12000
            )
    };

    const userMessage = {
        role:
            "user",

        content:
            cleanedMessage
    };

    return [
        systemMessage,
        ...limitedHistory,
        userMessage
    ];
}


// ============================================================
// ADVANCED INTENT PRIORITY
// ============================================================

function calculateIntentPriority(
    analysis
) {
    if (!analysis) {
        return "general";
    }

    const scores =
        analysis.scores ||
        {};

    const priorityOrder = [
        "coding",
        "research",
        "weather",
        "currency",
        "current",
        "math",
        "capability",
        "identity",
        "help",
        "greeting",
        "thanks",
        "farewell"
    ];

    let bestIntent =
        analysis.primary ||
        "general";

    let bestScore =
        number(
            scores[bestIntent],
            0
        );

    for (
        const intent
        of priorityOrder
    ) {
        const score =
            number(
                scores[intent],
                0
            );

        if (
            score >
            bestScore
        ) {
            bestScore =
                score;

            bestIntent =
                intent;
        }
    }

    return bestIntent;
}


// ============================================================
// ADVANCED ANALYSIS
// ============================================================

function analyzeMessageDeep(
    message
) {
    const text =
        sanitizeUserMessage(
            message
        );

    const language =
        detectLanguageAI(
            text
        );

    const intent =
        detectIntentAI(
            text
        );

    const metadata =
        buildConversationMetadata(
            text
        );

    const priority =
        calculateIntentPriority(
            intent
        );

    const command =
        parseChatCommand(
            text
        );

    return {
        text,

        language,

        intent,

        priority,

        command,

        metadata,

        flags: {
            coding:
                needsCodingAI(
                    text
                ),

            research:
                needsResearchAI(
                    text
                ),

            current:
                isCurrentQuestionAI(
                    text
                ),

            mathematical:
                isSimpleMath(
                    text
                )
        }
    };
}


// ============================================================
// DEEP ANALYSIS API
// ============================================================

app.post(
    "/api/chat/analyze/deep",
    (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.text ||
                    req.body.prompt
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        return res.json({
            success: true,

            analysis:
                analyzeMessageDeep(
                    message
                )
        });
    }
);


// ============================================================
// RESPONSE NORMALIZATION
// ============================================================

function normalizeAIResult(
    result
) {
    if (
        !result ||
        typeof result !==
            "object"
    ) {
        return {
            success: false,

            text: "",

            provider:
                "local",

            model:
                "turkai-local"
        };
    }

    return {
        ...clone(result),

        success:
            Boolean(
                result.text
            ),

        text:
            sanitizeAssistantMessage(
                result.text
            ),

        provider:
            safeString(
                result.provider,
                "local"
            ),

        model:
            safeString(
                result.model,
                "turkai-local"
            ),

        timestamp:
            result.timestamp ||
            nowISO()
    };
}


// ============================================================
// RESPONSE PREFIX CLEANUP
// ============================================================

function removeUnwantedPrefixes(
    text
) {
    let value =
        sanitizeAssistantMessage(
            text
        );

    if (!value) {
        return "";
    }

    const patterns = [
        /^Assistant:\s*/i,
        /^TürkAI:\s*/i,
        /^AI:\s*/i,
        /^Cevap:\s*/i,
        /^Yanıt:\s*/i
    ];

    for (
        const pattern
        of patterns
    ) {
        value =
            value.replace(
                pattern,
                ""
            );
    }

    return value.trim();
}


// ============================================================
// RESPONSE MARKDOWN SANITIZATION
// ============================================================

function sanitizeAIFormatting(
    text
) {
    let value =
        removeUnwantedPrefixes(
            text
        );

    if (!value) {
        return "";
    }

    // Aşırı boşlukları toparla
    value =
        value
            .replace(
                /\n{5,}/g,
                "\n\n\n"
            )
            .replace(
                /[ \t]{3,}/g,
                " "
            )
            .trim();

    return value.slice(
        0,
        AI_LIMITS.maxResponseLength
    );
}


// ============================================================
// LOCAL ANSWER ENHANCER
// ============================================================

function enhanceLocalResponse(
    result,
    context = {}
) {
    const normalized =
        normalizeAIResult(
            result
        );

    normalized.text =
        sanitizeAIFormatting(
            normalized.text
        );

    normalized.context =
        clone(
            context
        );

    return normalized;
}


// ============================================================
// LOCAL RESPONSE FOR COMMON QUESTIONS
// ============================================================

function createSmartLocalResponse(
    message
) {
    const analysis =
        analyzeMessageDeep(
            message
        );

    if (
        analysis.flags.mathematical
    ) {
        const result =
            calculateSimpleMath(
                message
            );

        if (result !== null) {
            return {
                success: true,

                text:
                    `Sonuç: ${result}`,

                provider:
                    "local",

                model:
                    "turkai-local",

                source:
                    "calculator"
            };
        }
    }

    if (
        analysis.priority ===
        "greeting"
    ) {
        return {
            success: true,

            text:
                LOCAL_CHAT_RESPONSES.greeting,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "greeting"
        };
    }

    if (
        analysis.priority ===
        "identity"
    ) {
        return {
            success: true,

            text:
                LOCAL_CHAT_RESPONSES.identity,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "identity"
        };
    }

    if (
        analysis.priority ===
        "capability"
    ) {
        return {
            success: true,

            text:
                LOCAL_CHAT_RESPONSES.capability,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "capability"
        };
    }

    if (
        analysis.priority ===
        "thanks"
    ) {
        return {
            success: true,

            text:
                LOCAL_CHAT_RESPONSES.thanks,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "thanks"
        };
    }

    if (
        analysis.priority ===
        "farewell"
    ) {
        return {
            success: true,

            text:
                LOCAL_CHAT_RESPONSES.farewell,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "farewell"
        };
    }

    return generateLocalAI(
        message
    );
}


// ============================================================
// SMART CHAT PIPELINE
// ============================================================

async function smartAIChat(
    message,
    options = {}
) {
    const cleanMessage =
        sanitizeUserMessage(
            message
        );

    if (!cleanMessage) {
        return {
            success: false,

            error:
                "message_required",

            text: ""
        };
    }

    const analysis =
        analyzeMessageDeep(
            cleanMessage
        );

    // Önce gerçekten basit yerel cevapları yakala
    if (
        !analysis.flags.coding &&
        !analysis.flags.research &&
        !analysis.flags.current
    ) {
        const local =
            createSmartLocalResponse(
                cleanMessage
            );

        if (
            local &&
            local.success &&
            analysis.priority !==
                "general"
        ) {
            return enhanceLocalResponse(
                local,
                analysis
            );
        }
    }

    const history =
        sanitizeHistoryForModel(
            options.history ||
            []
        );

    const context = {
        language:
            analysis.language.language,

        intent:
            analysis.priority,

        coding:
            analysis.flags.coding,

        research:
            analysis.flags.research,

        current:
            analysis.flags.current
    };

    const messages =
        prepareModelContext(
            cleanMessage,
            history,
            context
        );

    const result =
        await generateWithFallback(
            messages,
            options
        );

    return enhanceLocalResponse(
        result,
        analysis
    );
}


// ============================================================
// SMART CHAT API
// ============================================================

app.post(
    "/api/chat/smart",
    async (req, res) => {
        const started =
            Date.now();

        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.text ||
                    req.body.prompt
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await smartAIChat(
                    message,
                    {
                        history:
                            req.body.history,

                        provider:
                            req.body.provider,

                        model:
                            req.body.model,

                        temperature:
                            req.body.temperature,

                        maxTokens:
                            req.body.maxTokens
                    }
                );

            return res.json({
                success:
                    Boolean(
                        result.success
                    ),

                response:
                    result.text,

                message:
                    result.text,

                metadata: {
                    ...result,

                    totalLatencyMs:
                        Date.now() -
                        started
                }
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "smart_chat_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// STREAM-LIKE EVENT HELPERS
// ============================================================

function splitResponseIntoChunks(
    text,
    chunkSize = 120
) {
    const value =
        sanitizeAssistantMessage(
            text
        );

    if (!value) {
        return [];
    }

    const size =
        Math.max(
            20,
            number(
                chunkSize,
                120
            )
        );

    const chunks =
        [];

    for (
        let i = 0;
        i < value.length;
        i += size
    ) {
        chunks.push(
            value.slice(
                i,
                i + size
            )
        );
    }

    return chunks;
}


// ============================================================
// CHAT STREAM SIMULATION
// ============================================================

async function streamAIResponse(
    socket,
    message,
    options = {}
) {
    if (!socket) {
        return null;
    }

    const result =
        await smartAIChat(
            message,
            options
        );

    if (
        !result ||
        !result.success
    ) {
        socket.emit(
            "turkai:stream:error",
            {
                success:
                    false,

                error:
                    result &&
                    result.error
                        ? result.error
                        : "stream_failed"
            }
        );

        return result;
    }

    const chunks =
        splitResponseIntoChunks(
            result.text,
            options.chunkSize ||
            120
        );

    socket.emit(
        "turkai:stream:start",
        {
            success:
                true,

            provider:
                result.provider,

            model:
                result.model,

            totalChunks:
                chunks.length
        }
    );

    for (
        let i = 0;
        i < chunks.length;
        i++
    ) {
        socket.emit(
            "turkai:stream:chunk",
            {
                index:
                    i,

                total:
                    chunks.length,

                text:
                    chunks[i]
            }
        );

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    8
                )
        );
    }

    socket.emit(
        "turkai:stream:end",
        {
            success:
                true,

            text:
                result.text,

            metadata:
                result
        }
    );

    return result;
}


// ============================================================
// SOCKET STREAM ROUTE
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:chat:stream",
                async payload => {
                    try {
                        const data =
                            payload &&
                            typeof payload ===
                                "object"
                                ? payload
                                : {};

                        const message =
                            sanitizeUserMessage(
                                data.message ||
                                data.text
                            );

                        if (!message) {
                            socket.emit(
                                "turkai:stream:error",
                                {
                                    success:
                                        false,

                                    error:
                                        "message_required"
                                }
                            );

                            return;
                        }

                        AI_ENGINE_STATE.streamingRequests++;

                        await streamAIResponse(
                            socket,
                            message,
                            {
                                history:
                                    data.history,

                                provider:
                                    data.provider,

                                model:
                                    data.model,

                                temperature:
                                    data.temperature,

                                maxTokens:
                                    data.maxTokens,

                                chunkSize:
                                    data.chunkSize
                            }
                        );

                    } catch (error) {
                        socket.emit(
                            "turkai:stream:error",
                            {
                                success:
                                    false,

                                error:
                                    error.message ||
                                    "stream_failed"
                            }
                        );
                    }
                }
            );
        }
    );
}


// ============================================================
// AI CONVERSATION LOCK
// ============================================================

async function withConversationLock(
    sessionId,
    handler
) {
    const key =
        safeString(
            sessionId
        );

    const previous =
        conversationLocks.get(
            key
        ) || Promise.resolve();

    let release;

    const current =
        new Promise(
            resolve => {
                release =
                    resolve;
            }
        );

    conversationLocks.set(
        key,
        previous.then(
            () => current
        )
    );

    try {
        await previous;

        return await handler();

    } finally {
        release();

        const active =
            conversationLocks.get(
                key
            );

        if (
            active === current ||
            !active
        ) {
            conversationLocks.delete(
                key
            );
        }
    }
}


// ============================================================
// LOCKED SESSION CHAT
// ============================================================

app.post(
    "/api/chat/session/:sessionId/message",
    async (req, res) => {
        const sessionId =
            safeString(
                req.params.sessionId
            );

        const userId =
            normalizeUserIdAI(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : "guest"
            );

        const session =
            getChatSession(
                userId,
                sessionId,
                false
            );

        if (!session) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "session_not_found"
            });
        }

        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.text
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await withConversationLock(
                    sessionId,
                    async () => {
                        const history =
                            getConversationContext(
                                session
                            );

                        addSessionMessage(
                            session,
                            "user",
                            message,
                            {
                                source:
                                    "session-api"
                            }
                        );

                        const response =
                            await smartAIChat(
                                message,
                                {
                                    history,

                                    provider:
                                        req.body.provider,

                                    model:
                                        req.body.model,

                                    temperature:
                                        req.body.temperature,

                                    maxTokens:
                                        req.body.maxTokens
                                }
                            );

                        if (
                            response &&
                            response.success
                        ) {
                            addSessionMessage(
                                session,
                                "assistant",
                                response.text,
                                {
                                    provider:
                                        response.provider,

                                    model:
                                        response.model
                                }
                            );
                        }

                        touchChatSession(
                            session
                        );

                        return response;
                    }
                );

            return res.json({
                success:
                    Boolean(
                        result &&
                        result.success
                    ),

                response:
                    result &&
                    result.text
                        ? result.text
                        : "",

                message:
                    result &&
                    result.text
                        ? result.text
                        : "",

                sessionId,

                userId,

                metadata:
                    result
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "session_chat_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// CHAT RETRY
// ============================================================

app.post(
    "/api/chat/retry",
    async (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.text
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await smartAIChat(
                    message,
                    {
                        history:
                            req.body.history,

                        provider:
                            req.body.provider,

                        model:
                            req.body.model,

                        temperature:
                            number(
                                req.body.temperature,
                                aiConfig.temperature
                            ),

                        maxTokens:
                            number(
                                req.body.maxTokens,
                                aiConfig.maxTokens
                            ),

                        cache:
                            false
                    }
                );

            return res.json(
                result
            );

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "retry_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// CONVERSATION SUMMARY
// ============================================================

function summarizeConversation(
    history
) {
    const items =
        sanitizeHistoryForModel(
            history
        );

    if (!items.length) {
        return {
            messages: 0,

            users: 0,

            assistants: 0,

            characters: 0,

            estimatedTokens: 0
        };
    }

    let usersCount = 0;
    let assistantsCount = 0;
    let characters = 0;

    for (
        const item
        of items
    ) {
        if (
            item.role ===
            "user"
        ) {
            usersCount++;
        }

        if (
            item.role ===
            "assistant"
        ) {
            assistantsCount++;
        }

        characters +=
            item.content.length;
    }

    return {
        messages:
            items.length,

        users:
            usersCount,

        assistants:
            assistantsCount,

        characters,

        estimatedTokens:
            estimateHistoryTokens(
                items
            )
    };
}


// ============================================================
// SUMMARY API
// ============================================================

app.post(
    "/api/chat/summary",
    (req, res) => {
        const history =
            req.body &&
            Array.isArray(
                req.body.history
            )
                ? req.body.history
                : [];

        return res.json({
            success: true,

            summary:
                summarizeConversation(
                    history
                )
        });
    }
);


// ============================================================
// USER SESSION STATS
// ============================================================

function getUserSessionStats(
    userId
) {
    const id =
        normalizeUserIdAI(
            userId
        );

    let sessions = 0;
    let messages = 0;

    let newest = null;
    let oldest = null;

    for (
        const session
        of chatSessions.values()
    ) {
        if (
            session.userId !==
            id
        ) {
            continue;
        }

        sessions++;

        messages +=
            session.messages.length;

        if (
            !newest ||
            new Date(
                session.updatedAt
            ) >
            new Date(
                newest.updatedAt
            )
        ) {
            newest =
                session;
        }

        if (
            !oldest ||
            new Date(
                session.createdAt
            ) <
            new Date(
                oldest.createdAt
            )
        ) {
            oldest =
                session;
        }
    }

    return {
        userId: id,

        sessions,

        messages,

        newestSession:
            newest
                ? {
                    id:
                        newest.id,

                    title:
                        newest.title,

                    updatedAt:
                        newest.updatedAt
                }
                : null,

        oldestSession:
            oldest
                ? {
                    id:
                        oldest.id,

                    title:
                        oldest.title,

                    createdAt:
                        oldest.createdAt
                }
                : null
    };
}


// ============================================================
// USER SESSION STATS API
// ============================================================

app.get(
    "/api/chat/user/:userId/stats",
    (req, res) => {
        return res.json({
            success: true,

            stats:
                getUserSessionStats(
                    req.params.userId
                )
        });
    }
);


// ============================================================
// PROVIDER TEST
// ============================================================

app.post(
    "/api/ai/provider-test",
    async (req, res) => {
        const providerName =
            safeString(
                req.body &&
                req.body.provider
            ).toLowerCase();

        if (!providerName) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "provider_required"
            });
        }

        if (
            !providers[
                providerName
            ]
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "provider_not_found"
            });
        }

        try {
            const result =
                await callAIProvider(
                    providerName,
                    [
                        {
                            role:
                                "system",

                            content:
                                "Yanıtı kısa tut."
                        },

                        {
                            role:
                                "user",

                            content:
                                "Merhaba"
                        }
                    ],
                    {
                        model:
                            providers[
                                providerName
                            ].model,

                        maxTokens:
                            64,

                        temperature:
                            0.2
                    }
                );

            return res.json({
                success: true,

                provider:
                    providerName,

                response:
                    result.text,

                model:
                    result.model,

                latencyMs:
                    result.latencyMs ||
                    0
            });

        } catch (error) {
            return res.status(
                502
            ).json({
                success: false,

                provider:
                    providerName,

                error:
                    classifyAIError(
                        error
                    ),

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// MODEL TEST
// ============================================================

app.post(
    "/api/ai/model-test",
    async (req, res) => {
        const model =
            safeString(
                req.body &&
                req.body.model
            );

        const providerName =
            safeString(
                req.body &&
                req.body.provider
            ).toLowerCase();

        if (!model) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "model_required"
            });
        }

        const provider =
            providers[
                providerName
            ];

        if (!provider) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "provider_not_found"
            });
        }

        try {
            const result =
                await callAIProvider(
                    providerName,
                    [
                        {
                            role:
                                "system",

                            content:
                                "You are TürkAI."
                        },

                        {
                            role:
                                "user",

                            content:
                                "Reply with: OK"
                        }
                    ],
                    {
                        model,

                        maxTokens:
                            32,

                        temperature:
                            0
                    }
                );

            return res.json({
                success: true,

                provider:
                    providerName,

                model,

                response:
                    result.text,

                latencyMs:
                    result.latencyMs ||
                    0
            });

        } catch (error) {
            return res.status(
                502
            ).json({
                success: false,

                provider:
                    providerName,

                model,

                error:
                    classifyAIError(
                        error
                    ),

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// AI CACHE MANAGEMENT
// ============================================================

app.get(
    "/api/ai/cache",
    (req, res) => {
        return res.json({
            success: true,

            size:
                aiResponseCache.size,

            ttlMs:
                AI_LIMITS.cacheTTLms
        });
    }
);

app.delete(
    "/api/ai/cache",
    (req, res) => {
        const size =
            aiResponseCache.size;

        aiResponseCache.clear();

        return res.json({
            success: true,

            cleared:
                size
        });
    }
);


// ============================================================
// PROVIDER COOLDOWN RESET
// ============================================================

app.post(
    "/api/ai/reset-providers",
    (req, res) => {
        providerCooldowns.clear();

        for (
            const metrics
            of providerMetrics.values()
        ) {
            metrics.lastError =
                null;
        }

        return res.json({
            success: true,

            reset:
                true
        });
    }
);


// ============================================================
// AI ENGINE CONFIG
// ============================================================

app.get(
    "/api/ai/config",
    (req, res) => {
        return res.json({
            success: true,

            config: {
                defaultProvider:
                    aiConfig.defaultProvider,

                defaultModel:
                    aiConfig.defaultModel,

                temperature:
                    aiConfig.temperature,

                maxTokens:
                    aiConfig.maxTokens,

                timeoutMs:
                    aiConfig.timeoutMs
            }
        });
    }
);


// ============================================================
// AI ENGINE CONFIG UPDATE
// ============================================================

app.post(
    "/api/ai/config",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        if (
            body.defaultProvider
        ) {
            const provider =
                safeString(
                    body.defaultProvider
                ).toLowerCase();

            if (
                providers[provider]
            ) {
                aiConfig.defaultProvider =
                    provider;
            }
        }

        if (
            body.defaultModel
        ) {
            aiConfig.defaultModel =
                safeString(
                    body.defaultModel
                ).slice(
                    0,
                    200
                );
        }

        if (
            body.temperature !==
            undefined
        ) {
            aiConfig.temperature =
                Math.min(
                    Math.max(
                        number(
                            body.temperature,
                            aiConfig.temperature
                        ),
                        0
                    ),
                    2
                );
        }

        if (
            body.maxTokens !==
            undefined
        ) {
            aiConfig.maxTokens =
                Math.min(
                    Math.max(
                        number(
                            body.maxTokens,
                            aiConfig.maxTokens
                        ),
                        64
                    ),
                    32768
                );
        }

        return res.json({
            success: true,

            config:
                clone(
                    aiConfig
                )
        });
    }
);


// ============================================================
// PROVIDER ENABLE STATE API
// ============================================================

app.get(
    "/api/ai/providers",
    (req, res) => {
        return res.json({
            success: true,

            providers:
                Object.fromEntries(
                    Object.entries(
                        providers
                    ).map(
                        ([name, provider]) => [
                            name,
                            {
                                enabled:
                                    provider.enabled,

                                configured:
                                    provider.configured,

                                model:
                                    provider.model ||
                                    null,

                                available:
                                    providerIsAvailable(
                                        name
                                    )
                            }
                        ]
                    )
                )
        });
    }
);


// ============================================================
// AI ENGINE SUMMARY
// ============================================================

function getAIEngineSummary() {
    return {
        version:
            SERVER_VERSION,

        requests:
            AI_ENGINE_STATE.totalRequests,

        successful:
            AI_ENGINE_STATE.successfulRequests,

        failed:
            AI_ENGINE_STATE.failedRequests,

        localFallbacks:
            AI_ENGINE_STATE.localFallbacks,

        providerCalls:
            AI_ENGINE_STATE.providerCalls,

        providerFailures:
            AI_ENGINE_STATE.providerFailures,

        cacheHits:
            AI_ENGINE_STATE.cacheHits,

        cacheMisses:
            AI_ENGINE_STATE.cacheMisses,

        activeSessions:
            chatSessions.size,

        activeJobs:
            activeChatRequests.size,

        activeSockets:
            runtime.activeSockets,

        streamingRequests:
            AI_ENGINE_STATE.streamingRequests,

        codingRequests:
            AI_ENGINE_STATE.codingRequests,

        researchRequests:
            AI_ENGINE_STATE.researchRequests,

        currentRequests:
            AI_ENGINE_STATE.currentRequests,

        uptimeMs:
            Date.now() -
            new Date(
                AI_ENGINE_STATE.startedAt
            ).getTime()
    };
}


app.get(
    "/api/ai/summary",
    (req, res) => {
        return res.json({
            success: true,

            summary:
                getAIEngineSummary()
        });
    }
);


// ============================================================
// PART 2 STATUS
// ============================================================

console.log(
    "[TürkAI] Part 2 konuşma/AI genişletilmiş motor yüklendi."
);

console.log(
    "[TürkAI] /api/chat"
);

console.log(
    "[TürkAI] /api/chat/smart"
);

console.log(
    "[TürkAI] /api/chat/session/:sessionId/message"
);

console.log(
    "[TürkAI] /api/ai/status"
);

console.log(
    "[TürkAI] /api/ai/diagnostics"
);

console.log(
    "[TürkAI] /api/ai/providers"
);


// ============================================================
// PART 2 END
// ============================================================
//
// Sonraki bölümde:
// - canlı internet araştırması
// - DuckDuckGo/Wikipedia
// - güncel soru algılama
// - araştırma context'inin AI'a aktarılması
// - kaynak listeleri
// - güncel haber sorguları
// - araştırma cache
// - araştırma cevap üretimi
//
// ============================================================


// ============================================================
// PART 2 INTERNAL EXPORT REFERENCES
// ============================================================

serverState.ai = {
    ...(serverState.ai || {}),

    detectLanguageAI,

    detectIntentAI,

    isCurrentQuestionAI,

    needsResearchAI,

    needsCodingAI,

    isSimpleMath,

    calculateSimpleMath,

    getLocalChatResponse,

    createSmartLocalResponse,

    analyzeMessageDeep,

    buildConversationMetadata,

    getChatSession,

    createChatSession,

    addSessionMessage,

    normalizeIncomingHistory,

    sanitizeHistoryForModel,

    truncateHistoryByTokens,

    estimateTokenCount,

    estimateHistoryTokens,

    buildSystemPrompt,

    buildExtendedSystemPrompt,

    prepareModelContext,

    callOpenAICompatible,

    callGemini,

    callAIProvider,

    generateWithFallback,

    generateLocalAI,

    runAIChat,

    runExtendedAIChat,

    smartAIChat,

    streamAIResponse,

    splitResponseIntoChunks,

    getAIStatus,

    getAIEngineSummary,

    getConversationSnapshot,

    getUserSessionStats,

    summarizeConversation
};


// ============================================================
// END OF PART 2
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 3 / 10
// WEB RESEARCH + CURRENT INFORMATION ENGINE
// ============================================================
//
// Bu bölüm:
// - Güncel soru algılama
// - Araştırma isteği algılama
// - DuckDuckGo HTML araması
// - Wikipedia API
// - Direkt URL okuma
// - Kaynak normalizasyonu
// - Duplicate temizleme
// - Sonuç puanlama
// - Araştırma context'i
// - Kaynaklı cevap oluşturma
// - Research cache
// - Research history
// - /api/research
// - /api/research/search
// - /api/research/url
// - /api/research/analyze
// - /api/research/health
// - /api/research/status
// - /api/research/cache
// ============================================================


// ============================================================
// RESEARCH RUNTIME
// ============================================================

const RESEARCH_STATE = {
    startedAt: nowISO(),

    totalRequests: 0,

    successfulRequests: 0,

    failedRequests: 0,

    cacheHits: 0,

    cacheMisses: 0,

    duckduckgoRequests: 0,

    duckduckgoSuccess: 0,

    duckduckgoFailure: 0,

    wikipediaRequests: 0,

    wikipediaSuccess: 0,

    wikipediaFailure: 0,

    directUrlRequests: 0,

    directUrlSuccess: 0,

    directUrlFailure: 0,

    currentQuestions: 0,

    explicitResearch: 0,

    resultsCollected: 0
};


// ============================================================
// RESEARCH CONFIG
// ============================================================

const RESEARCH_CONFIG = {
    enabled: true,

    timeoutMs: 15000,

    maxResults: 10,

    maxWikipediaResults: 6,

    maxContentPerResult: 14000,

    maxTotalContext: 70000,

    cacheTTL:
        10 * 60 * 1000,

    historyLimit: 1000,

    userAgent:
        "TurkAI/30 Research Engine",

    language: "tr",

    country: "TR"
};


// ============================================================
// RESEARCH CACHE
// ============================================================

const serverResearchCache =
    new Map();

const serverResearchHistory =
    [];


// ============================================================
// RESEARCH PROVIDER STATE
// ============================================================

const researchProviders = {
    duckduckgo: {
        enabled: true,
        available: true
    },

    wikipedia: {
        enabled: true,
        available: true
    },

    directUrl: {
        enabled: true,
        available: true
    }
};


// ============================================================
// GENERIC RESEARCH HELPERS
// ============================================================

function researchClean(
    value,
    max = 20000
) {
    return safeString(
        value
    )
        .replace(
            /\u0000/g,
            ""
        )
        .replace(
            /\r/g,
            ""
        )
        .replace(
            /\n{4,}/g,
            "\n\n\n"
        )
        .trim()
        .slice(
            0,
            max
        );
}


function researchNormalize(
    value
) {
    return researchClean(
        value,
        10000
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function researchId(
    prefix = "research"
) {
    return createId(
        prefix
    );
}


function researchClone(
    value
) {
    return clone(
        value
    );
}


// ============================================================
// HTML DECODER
// ============================================================

function researchDecodeEntities(
    value
) {
    return safeString(
        value
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
            /&#39;/gi,
            "'"
        )
        .replace(
            /&lt;/gi,
            "<"
        )
        .replace(
            /&gt;/gi,
            ">"
        )
        .replace(
            /&#x([0-9a-f]+);/gi,
            (_, hex) => {
                try {
                    return String.fromCodePoint(
                        parseInt(
                            hex,
                            16
                        )
                    );
                } catch {
                    return "";
                }
            }
        )
        .replace(
            /&#(\d+);/g,
            (_, num) => {
                try {
                    return String.fromCodePoint(
                        Number(
                            num
                        )
                    );
                } catch {
                    return "";
                }
            }
        );
}


function researchStripHtml(
    value
) {
    return researchDecodeEntities(
        safeString(value)
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
                /<svg[\s\S]*?<\/svg>/gi,
                " "
            )
            .replace(
                /<template[\s\S]*?<\/template>/gi,
                " "
            )
            .replace(
                /<[^>]+>/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
    );
}


// ============================================================
// URL HELPERS
// ============================================================

function researchValidUrl(
    value
) {
    try {
        const url =
            new URL(
                safeString(
                    value
                )
            );

        return (
            url.protocol ===
                "http:" ||
            url.protocol ===
                "https:"
        );
    } catch {
        return false;
    }
}


function researchNormalizeUrl(
    value
) {
    const input =
        safeString(
            value
        );

    if (!input) {
        return "";
    }

    try {
        const url =
            new URL(
                input
            );

        url.hash = "";

        return url.toString();
    } catch {
        return input;
    }
}


function researchDomain(
    value
) {
    try {
        return new URL(
            value
        )
            .hostname
            .replace(
                /^www\./,
                ""
            )
            .toLowerCase();
    } catch {
        return "";
    }
}


// ============================================================
// CURRENT QUESTION ENGINE
// ============================================================

const CURRENT_KEYWORDS = [
    "bugün",
    "şimdi",
    "şu an",
    "şuan",
    "güncel",
    "günümüzde",
    "en son",
    "son durum",
    "son dakika",
    "son haber",
    "son haberler",
    "bu hafta",
    "bu ay",
    "bu yıl",
    "az önce",
    "şu sıralar",
    "latest",
    "latest news",
    "current",
    "right now",
    "today",
    "this week",
    "this month",
    "this year"
];


const RESEARCH_COMMANDS = [
    "araştır",
    "araştırır mısın",
    "detaylı araştır",
    "internette ara",
    "internetten ara",
    "internetten bak",
    "webde ara",
    "web'de ara",
    "internette bul",
    "kaynak bul",
    "kaynakları bul",
    "kaynak göster",
    "kaynakları göster",
    "webden bak",
    "web'den bak",
    "incele",
    "karşılaştır",
    "internet araştırması yap",
    "detaylı incele"
];


const NEWS_KEYWORDS = [
    "haber",
    "haberler",
    "son dakika",
    "gündem",
    "news",
    "breaking news"
];


function researchContains(
    text,
    values
) {
    const normalized =
        researchNormalize(
            text
        );

    return values.some(
        value =>
            normalized.includes(
                researchNormalize(
                    value
                )
            )
    );
}


function detectCurrentResearch(
    query
) {
    const current =
        researchContains(
            query,
            CURRENT_KEYWORDS
        );

    const explicit =
        researchContains(
            query,
            RESEARCH_COMMANDS
        );

    const news =
        researchContains(
            query,
            NEWS_KEYWORDS
        );

    const should =
        current ||
        explicit ||
        news;

    return {
        shouldResearch:
            should,

        current,

        explicit,

        news,

        confidence:
            current && explicit
                ? 1
                : should
                    ? 0.8
                    : 0
    };
}


// ============================================================
// RESEARCH CATEGORY DETECTION
// ============================================================

const RESEARCH_CATEGORIES = {
    news: [
        "haber",
        "son dakika",
        "gündem",
        "news",
        "breaking"
    ],

    technology: [
        "teknoloji",
        "yapay zeka",
        "yapay zekâ",
        "ai",
        "yazılım",
        "telefon",
        "bilgisayar",
        "işlemci",
        "ekran kartı",
        "uygulama"
    ],

    science: [
        "bilim",
        "uzay",
        "nasa",
        "fizik",
        "kimya",
        "biyoloji",
        "astronomi"
    ],

    finance: [
        "dolar",
        "euro",
        "sterlin",
        "borsa",
        "altın",
        "bitcoin",
        "kripto",
        "faiz",
        "ekonomi"
    ],

    sports: [
        "futbol",
        "basketbol",
        "tenis",
        "maç",
        "spor",
        "lig",
        "transfer"
    ],

    politics: [
        "seçim",
        "parti",
        "parlamento",
        "meclis",
        "hükümet",
        "bakan",
        "başkan",
        "siyaset"
    ],

    weather: [
        "hava",
        "hava durumu",
        "yağmur",
        "kar",
        "sıcaklık",
        "rüzgar",
        "rüzgâr",
        "fırtına"
    ],

    education: [
        "okul",
        "üniversite",
        "sınav",
        "ders",
        "eğitim",
        "yks",
        "lgs"
    ],

    gaming: [
        "oyun",
        "steam",
        "playstation",
        "xbox",
        "nintendo",
        "minecraft",
        "roblox"
    ],

    security: [
        "siber güvenlik",
        "güvenlik",
        "hack",
        "hacking",
        "zararlı yazılım",
        "malware",
        "virüs"
    ],

    shopping: [
        "fiyat",
        "satın al",
        "ürün",
        "telefon fiyatı",
        "laptop fiyatı",
        "fiyatı ne"
    ]
};


function detectResearchCategory(
    query
) {
    const scores = {};

    for (
        const [
            category,
            terms
        ]
        of Object.entries(
            RESEARCH_CATEGORIES
        )
    ) {
        let score = 0;

        for (
            const term
            of terms
        ) {
            if (
                researchNormalize(
                    query
                ).includes(
                    researchNormalize(
                        term
                    )
                )
            ) {
                score++;
            }
        }

        scores[
            category
        ] = score;
    }

    const sorted =
        Object.entries(
            scores
        )
        .sort(
            (a, b) =>
                b[1] -
                a[1]
        );

    if (
        !sorted.length ||
        sorted[0][1] === 0
    ) {
        return {
            category:
                "general",

            scores
        };
    }

    return {
        category:
            sorted[0][0],

        scores
    };
}


// ============================================================
// QUERY CLEANUP
// ============================================================

function cleanResearchQuery(
    query
) {
    let value =
        researchClean(
            query,
            5000
        );

    if (!value) {
        return "";
    }

    const removalPatterns = [
        /^internette\s+ara\s*/i,
        /^internetten\s+ara\s*/i,
        /^webde\s+ara\s*/i,
        /^web'de\s+ara\s*/i,
        /^internetten\s+bak\s*/i,
        /^araştır\s*/i,
        /^detaylı\s+araştır\s*/i,
        /^kaynak\s+bul\s*/i,
        /^kaynakları\s+bul\s*/i,
        /^detaylı\s+incele\s*/i
    ];

    for (
        const pattern
        of removalPatterns
    ) {
        value =
            value.replace(
                pattern,
                ""
            );
    }

    return value
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


// ============================================================
// QUERY VARIANTS
// ============================================================

function buildResearchQueries(
    query,
    options = {}
) {
    const base =
        cleanResearchQuery(
            query
        );

    if (!base) {
        return [];
    }

    const variants =
        [];

    function add(
        value
    ) {
        const normalized =
            researchClean(
                value,
                2000
            );

        if (
            !normalized
        ) {
            return;
        }

        if (
            !variants.some(
                item =>
                    researchNormalize(
                        item
                    ) ===
                    researchNormalize(
                        normalized
                    )
            )
        ) {
            variants.push(
                normalized
            );
        }
    }

    add(
        base
    );

    const intent =
        detectCurrentResearch(
            base
        );

    const category =
        detectResearchCategory(
            base
        );

    if (
        intent.current
    ) {
        add(
            `${base} güncel`
        );
    }

    if (
        intent.news
    ) {
        add(
            `${base} son haberler`
        );
    }

    if (
        category.category ===
        "technology"
    ) {
        add(
            `${base} teknoloji`
        );
    }

    if (
        category.category ===
        "finance"
    ) {
        add(
            `${base} finans ekonomi`
        );
    }

    if (
        category.category ===
        "science"
    ) {
        add(
            `${base} bilim`
        );
    }

    if (
        category.category ===
        "sports"
    ) {
        add(
            `${base} spor`
        );
    }

    if (
        category.category ===
        "education"
    ) {
        add(
            `${base} eğitim`
        );
    }

    return variants.slice(
        0,
        Math.max(
            1,
            Math.min(
                Number(
                    options.maxQueries ||
                    4
                ),
                6
            )
        )
    );
}


// ============================================================
// RESEARCH CACHE
// ============================================================

function researchCacheKey(
    query,
    options = {}
) {
    return crypto
        .createHash(
            "sha256"
        )
        .update(
            JSON.stringify({
                query:
                    researchNormalize(
                        query
                    ),

                language:
                    options.language ||
                    "tr",

                region:
                    options.region ||
                    "tr-tr",

                maxResults:
                    options.maxResults ||
                    RESEARCH_CONFIG.maxResults
            })
        )
        .digest(
            "hex"
        );
}


function getResearchCache(
    key
) {
    const item =
        serverResearchCache.get(
            key
        );

    if (!item) {
        RESEARCH_STATE.cacheMisses++;

        return null;
    }

    if (
        Date.now() -
            item.createdAt >
            RESEARCH_CONFIG.cacheTTL
    ) {
        serverResearchCache.delete(
            key
        );

        RESEARCH_STATE.cacheMisses++;

        return null;
    }

    RESEARCH_STATE.cacheHits++;

    return researchClone(
        item.value
    );
}


function setResearchCache(
    key,
    value
) {
    serverResearchCache.set(
        key,
        {
            createdAt:
                Date.now(),

            value:
                researchClone(
                    value
                )
        }
    );
}


// ============================================================
// FETCH HELPER
// ============================================================

async function researchFetch(
    url,
    options = {}
) {
    if (
        !researchValidUrl(
            url
        )
    ) {
        throw new Error(
            "invalid_research_url"
        );
    }

    if (
        typeof fetch !==
        "function"
    ) {
        throw new Error(
            "fetch_not_supported"
        );
    }

    const timeout =
        Math.min(
            Math.max(
                Number(
                    options.timeoutMs ||
                    RESEARCH_CONFIG.timeoutMs
                ),
                3000
            ),
            60000
        );

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () =>
                controller.abort(),
            timeout
        );

    try {
        const response =
            await fetch(
                url,
                {
                    method:
                        options.method ||
                        "GET",

                    headers: {
                        "User-Agent":
                            options.userAgent ||
                            RESEARCH_CONFIG.userAgent,

                        "Accept":
                            options.accept ||
                            "text/html,application/json,text/plain;q=0.8,*/*;q=0.5",

                        "Accept-Language":
                            "tr-TR,tr;q=0.9,en;q=0.7"
                    },

                    redirect:
                        "follow",

                    signal:
                        controller.signal
                }
            );

        const text =
            await response.text();

        return {
            ok:
                response.ok,

            status:
                response.status,

            url:
                response.url ||
                url,

            contentType:
                response.headers.get(
                    "content-type"
                ) || "",

            text
        };

    } finally {
        clearTimeout(
            timer
        );
    }
}


// ============================================================
// DUCKDUCKGO URL
// ============================================================

function buildDuckDuckGoUrl(
    query
) {
    const params =
        new URLSearchParams();

    params.set(
        "q",
        researchClean(
            query,
            2000
        )
    );

    params.set(
        "kl",
        "tr-tr"
    );

    params.set(
        "ia",
        "web"
    );

    return (
        "https://html.duckduckgo.com/html/?" +
        params.toString()
    );
}


// ============================================================
// DUCKDUCKGO PARSER
// ============================================================

function parseDuckDuckGo(
    html
) {
    const source =
        safeString(
            html
        );

    if (!source) {
        return [];
    }

    const results =
        [];

    const anchorPattern =
        /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
        (
            match =
                anchorPattern.exec(
                    source
                )
        ) !== null
    ) {
        let url =
            researchDecodeEntities(
                match[1]
            );

        const title =
            researchStripHtml(
                match[2]
            );

        if (
            url.startsWith(
                "/l/"
            )
        ) {
            try {
                const full =
                    new URL(
                        url,
                        "https://duckduckgo.com"
                    );

                const uddg =
                    full.searchParams.get(
                        "uddg"
                    );

                if (
                    uddg
                ) {
                    url =
                        decodeURIComponent(
                            uddg
                        );
                }
            } catch {
                // devam
            }
        }

        url =
            researchNormalizeUrl(
                url
            );

        if (
            !researchValidUrl(
                url
            ) ||
            !title
        ) {
            continue;
        }

        results.push({
            id:
                researchId(
                    "web"
                ),

            title:
                title
                    .slice(
                        0,
                        500
                    ),

            url,

            domain:
                researchDomain(
                    url
                ),

            source:
                "DuckDuckGo",

            snippet:
                "",

            content:
                "",

            score:
                0.5,

            type:
                "web-search"
        });

        if (
            results.length >=
            RESEARCH_CONFIG.maxResults
        ) {
            break;
        }
    }

    // Snippetleri ayrı arama
    const snippetPattern =
        /<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;

    let snippetIndex =
        0;

    while (
        (
            match =
                snippetPattern.exec(
                    source
                )
        ) !== null
    ) {
        if (
            results[
                snippetIndex
            ]
        ) {
            results[
                snippetIndex
            ].snippet =
                researchStripHtml(
                    match[1]
                )
                    .slice(
                        0,
                        3000
                    );
        }

        snippetIndex++;
    }

    return results;
}


// ============================================================
// DUCKDUCKGO SEARCH
// ============================================================

async function searchDuckDuckGoServer(
    query,
    options = {}
) {
    if (
        !researchProviders
            .duckduckgo
            .enabled
    ) {
        return [];
    }

    RESEARCH_STATE
        .duckduckgoRequests++;

    try {
        const response =
            await researchFetch(
                buildDuckDuckGoUrl(
                    query
                ),
                {
                    timeoutMs:
                        options.timeoutMs ||
                        RESEARCH_CONFIG.timeoutMs,

                    accept:
                        "text/html"
                }
            );

        if (
            !response.ok
        ) {
            RESEARCH_STATE
                .duckduckgoFailure++;

            return [];
        }

        const results =
            parseDuckDuckGo(
                response.text
            );

        if (
            results.length
        ) {
            RESEARCH_STATE
                .duckduckgoSuccess++;
        } else {
            RESEARCH_STATE
                .duckduckgoFailure++;
        }

        return results;

    } catch {
        RESEARCH_STATE
            .duckduckgoFailure++;

        return [];
    }
}


// ============================================================
// WIKIPEDIA URL
// ============================================================

function buildWikipediaSearchUrl(
    query,
    language = "tr"
) {
    const lang =
        /^[a-z]{2,3}$/i.test(
            language
        )
            ? language
            : "tr";

    const params =
        new URLSearchParams();

    params.set(
        "action",
        "query"
    );

    params.set(
        "list",
        "search"
    );

    params.set(
        "srsearch",
        researchClean(
            query,
            2000
        )
    );

    params.set(
        "format",
        "json"
    );

    params.set(
        "utf8",
        "1"
    );

    params.set(
        "srlimit",
        String(
            Math.min(
                RESEARCH_CONFIG
                    .maxWikipediaResults,
                20
            )
        )
    );

    return (
        `https://${lang}.wikipedia.org/w/api.php?` +
        params.toString()
    );
}


// ============================================================
// WIKIPEDIA SEARCH
// ============================================================

async function searchWikipediaServer(
    query,
    options = {}
) {
    if (
        !researchProviders
            .wikipedia
            .enabled
    ) {
        return [];
    }

    RESEARCH_STATE
        .wikipediaRequests++;

    try {
        const url =
            buildWikipediaSearchUrl(
                query,
                options.language ||
                "tr"
            );

        const response =
            await researchFetch(
                url,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        RESEARCH_CONFIG.timeoutMs,

                    accept:
                        "application/json"
                }
            );

        if (
            !response.ok
        ) {
            RESEARCH_STATE
                .wikipediaFailure++;

            return [];
        }

        let data;

        try {
            data =
                JSON.parse(
                    response.text
                );
        } catch {
            data =
                null;
        }

        if (
            !data ||
            !data.query ||
            !Array.isArray(
                data.query.search
            )
        ) {
            RESEARCH_STATE
                .wikipediaFailure++;

            return [];
        }

        const results =
            data.query.search
                .map(
                    item => {
                        const title =
                            researchClean(
                                item.title,
                                500
                            );

                        if (
                            !title
                        ) {
                            return null;
                        }

                        const pageUrl =
                            `https://${
                                options.language ||
                                "tr"
                            }.wikipedia.org/wiki/` +
                            encodeURIComponent(
                                title.replace(
                                    /\s+/g,
                                    "_"
                                )
                            );

                        return {
                            id:
                                researchId(
                                    "wiki"
                                ),

                            title,

                            url:
                                pageUrl,

                            domain:
                                "wikipedia.org",

                            source:
                                "Wikipedia",

                            snippet:
                                researchStripHtml(
                                    item.snippet ||
                                    ""
                                ),

                            content:
                                "",

                            score:
                                0.65,

                            type:
                                "wikipedia"
                        };
                    }
                )
                .filter(Boolean);

        RESEARCH_STATE
            .wikipediaSuccess++;

        return results;

    } catch {
        RESEARCH_STATE
            .wikipediaFailure++;

        return [];
    }
}


// ============================================================
// WIKIPEDIA SUMMARY
// ============================================================

async function wikipediaSummaryServer(
    title,
    options = {}
) {
    const language =
        options.language ||
        "tr";

    const url =
        `https://${language}.wikipedia.org/api/rest_v1/page/summary/` +
        encodeURIComponent(
            title
        );

    try {
        const response =
            await researchFetch(
                url,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        RESEARCH_CONFIG.timeoutMs,

                    accept:
                        "application/json"
                }
            );

        if (
            !response.ok
        ) {
            return null;
        }

        let data;

        try {
            data =
                JSON.parse(
                    response.text
                );
        } catch {
            return null;
        }

        if (
            !data ||
            !data.extract
        ) {
            return null;
        }

        return {
            title:
                researchClean(
                    data.title ||
                    title,
                    500
                ),

            url:
                data.content_urls &&
                data.content_urls.desktop &&
                data.content_urls.desktop.page
                    ? data.content_urls.desktop.page
                    : url,

            domain:
                "wikipedia.org",

            source:
                "Wikipedia",

            snippet:
                researchClean(
                    data.description ||
                    "",
                    3000
                ),

            content:
                researchClean(
                    data.extract ||
                    "",
                    RESEARCH_CONFIG
                        .maxContentPerResult
                ),

            score:
                0.85,

            type:
                "wikipedia-summary"
        };

    } catch {
        return null;
    }
}


// ============================================================
// DIRECT URL TITLE
// ============================================================

function extractResearchTitle(
    html
) {
    const match =
        safeString(
            html
        ).match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

    if (
        !match
    ) {
        return "";
    }

    return researchStripHtml(
        match[1]
    )
        .slice(
            0,
            500
        );
}


// ============================================================
// META DESCRIPTION
// ============================================================

function extractResearchDescription(
    html
) {
    const source =
        safeString(
            html
        );

    const patterns = [
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,

        /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,

        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,

        /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i
    ];

    for (
        const pattern
        of patterns
    ) {
        const match =
            source.match(
                pattern
            );

        if (
            match &&
            match[1]
        ) {
            return researchStripHtml(
                match[1]
            )
                .slice(
                    0,
                    4000
                );
        }
    }

    return "";
}


// ============================================================
// MAIN PAGE TEXT
// ============================================================

function extractResearchContent(
    html
) {
    let source =
        safeString(
            html
        );

    if (!source) {
        return "";
    }

    source =
        source
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
                /<svg[\s\S]*?<\/svg>/gi,
                " "
            )
            .replace(
                /<nav[\s\S]*?<\/nav>/gi,
                " "
            )
            .replace(
                /<footer[\s\S]*?<\/footer>/gi,
                " "
            )
            .replace(
                /<header[\s\S]*?<\/header>/gi,
                " "
            )
            .replace(
                /<aside[\s\S]*?<\/aside>/gi,
                " "
            );

    source =
        source
            .replace(
                /<\/p>/gi,
                "\n"
            )
            .replace(
                /<\/div>/gi,
                "\n"
            )
            .replace(
                /<\/article>/gi,
                "\n"
            )
            .replace(
                /<\/section>/gi,
                "\n"
            )
            .replace(
                /<br\s*\/?>/gi,
                "\n"
            )
            .replace(
                /<\/li>/gi,
                "\n"
            );

    const text =
        researchStripHtml(
            source
        );

    return researchClean(
        text,
        RESEARCH_CONFIG
            .maxContentPerResult
    );
}


// ============================================================
// DIRECT URL RESEARCH
// ============================================================

async function researchDirectUrlServer(
    url,
    options = {}
) {
    if (
        !researchProviders
            .directUrl
            .enabled
    ) {
        return null;
    }

    const normalized =
        researchNormalizeUrl(
            url
        );

    if (
        !researchValidUrl(
            normalized
        )
    ) {
        return null;
    }

    RESEARCH_STATE
        .directUrlRequests++;

    try {
        const response =
            await researchFetch(
                normalized,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        RESEARCH_CONFIG.timeoutMs
                }
            );

        if (
            !response.ok
        ) {
            RESEARCH_STATE
                .directUrlFailure++;

            return null;
        }

        const isHtml =
            response.contentType
                .toLowerCase()
                .includes(
                    "html"
                ) ||
            /<html/i.test(
                response.text
            );

        const title =
            isHtml
                ? extractResearchTitle(
                    response.text
                )
                : researchDomain(
                    response.url ||
                    normalized
                );

        const description =
            isHtml
                ? extractResearchDescription(
                    response.text
                )
                : "";

        const content =
            isHtml
                ? extractResearchContent(
                    response.text
                )
                : researchClean(
                    response.text,
                    RESEARCH_CONFIG
                        .maxContentPerResult
                );

        RESEARCH_STATE
            .directUrlSuccess++;

        return {
            id:
                researchId(
                    "direct"
                ),

            title:
                title ||
                normalized,

            url:
                researchNormalizeUrl(
                    response.url ||
                    normalized
                ),

            domain:
                researchDomain(
                    response.url ||
                    normalized
                ),

            source:
                "Direct URL",

            snippet:
                description,

            content,

            score:
                0.75,

            type:
                "direct-url"
        };

    } catch {
        RESEARCH_STATE
            .directUrlFailure++;

        return null;
    }
}


// ============================================================
// RESULT QUALITY
// ============================================================

const HIGH_VALUE_RESEARCH_DOMAINS = [
    "gov.tr",
    "edu.tr",
    "gov",
    "edu",
    "who.int",
    "un.org",
    "nasa.gov",
    "nature.com",
    "reuters.com",
    "bbc.com",
    "wikipedia.org"
];


const LOW_VALUE_RESEARCH_DOMAINS = [
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "pinterest.com"
];


function researchResultScore(
    result,
    query
) {
    if (!result) {
        return 0;
    }

    const q =
        researchNormalize(
            query
        );

    const title =
        researchNormalize(
            result.title
        );

    const snippet =
        researchNormalize(
            result.snippet
        );

    const content =
        researchNormalize(
            result.content
        );

    const domain =
        researchNormalize(
            result.domain
        );

    let score =
        Number(
            result.score ||
            0
        );

    if (
        title &&
        q &&
        title.includes(
            q
        )
    ) {
        score +=
            0.30;
    }

    const words =
        q
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 2
            );

    if (
        words.length
    ) {
        let titleMatches = 0;
        let textMatches = 0;

        for (
            const word
            of words
        ) {
            if (
                title.includes(
                    word
                )
            ) {
                titleMatches++;
            }

            if (
                snippet.includes(
                    word
                ) ||
                content.includes(
                    word
                )
            ) {
                textMatches++;
            }
        }

        score +=
            (
                titleMatches /
                words.length
            ) *
            0.20;

        score +=
            (
                textMatches /
                words.length
            ) *
            0.15;
    }

    if (
        content.length >
        500
    ) {
        score +=
            0.05;
    }

    if (
        content.length >
        2000
    ) {
        score +=
            0.05;
    }

    if (
        HIGH_VALUE_RESEARCH_DOMAINS.some(
            item =>
                domain ===
                    item ||
                domain.endsWith(
                    "." +
                    item
                )
        )
    ) {
        score +=
            0.18;
    }

    if (
        LOW_VALUE_RESEARCH_DOMAINS.some(
            item =>
                domain ===
                    item ||
                domain.endsWith(
                    "." +
                    item
                )
        )
    ) {
        score -=
            0.15;
    }

    if (
        !researchValidUrl(
            result.url
        )
    ) {
        score -=
            0.20;
    }

    return Math.max(
        0,
        Math.min(
            1,
            Number(
                score.toFixed(
                    4
                )
            )
        )
    );
}


// ============================================================
// DUPLICATE REMOVAL
// ============================================================

function researchIdentity(
    result
) {
    if (!result) {
        return "";
    }

    const url =
        researchNormalizeUrl(
            result.url
        );

    if (url) {
        return url
            .toLowerCase()
            .replace(
                /\/+$/,
                ""
            );
    }

    return (
        researchNormalize(
            result.title
        ) +
        "|" +
        researchNormalize(
            result.source
        )
    );
}


function dedupeResearchResults(
    results
) {
    const map =
        new Map();

    for (
        const original
        of Array.isArray(
            results
        )
            ? results
            : []
    ) {
        if (!original) {
            continue;
        }

        const result = {
            ...original,

            url:
                researchNormalizeUrl(
                    original.url
                ),

            title:
                researchClean(
                    original.title,
                    500
                ),

            snippet:
                researchClean(
                    original.snippet,
                    4000
                ),

            content:
                researchClean(
                    original.content,
                    RESEARCH_CONFIG
                        .maxContentPerResult
                )
        };

        const key =
            researchIdentity(
                result
            );

        if (!key) {
            continue;
        }

        if (
            !map.has(
                key
            )
        ) {
            map.set(
                key,
                result
            );

            continue;
        }

        const existing =
            map.get(
                key
            );

        if (
            (
                result.content ||
                ""
            ).length >
            (
                existing.content ||
                ""
            ).length
        ) {
            existing.content =
                result.content;
        }

        if (
            !existing.snippet &&
            result.snippet
        ) {
            existing.snippet =
                result.snippet;
        }

        existing.score =
            Math.max(
                Number(
                    existing.score ||
                    0
                ),
                Number(
                    result.score ||
                    0
                )
            );
    }

    return Array.from(
        map.values()
    );
}


// ============================================================
// RESULT SORTING
// ============================================================

function sortResearchResults(
    results,
    query
) {
    return dedupeResearchResults(
        results
            .map(
                item => ({
                    ...item,

                    score:
                        researchResultScore(
                            item,
                            query
                        )
                })
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            )
    );
}


// ============================================================
// SOURCE LIMIT
// ============================================================

function limitResearchResults(
    results,
    limit =
        RESEARCH_CONFIG.maxResults
) {
    return Array.isArray(
        results
    )
        ? results.slice(
            0,
            Math.min(
                Math.max(
                    Number(
                        limit
                    ) || 1,
                    1
                ),
                20
            )
        )
        : [];
}


// ============================================================
// SOURCE SUMMARY
// ============================================================

function researchSourceSummary(
    result,
    index
) {
    if (!result) {
        return null;
    }

    return {
        index:
            index + 1,

        id:
            result.id,

        title:
            researchClean(
                result.title,
                500
            ),

        source:
            researchClean(
                result.source,
                200
            ),

        domain:
            researchClean(
                result.domain,
                200
            ),

        url:
            researchNormalizeUrl(
                result.url
            ),

        score:
            Number(
                result.score ||
                0
            ),

        type:
            result.type ||
            "web"
    };
}


function buildResearchSources(
    results
) {
    return (
        Array.isArray(
            results
        )
            ? results
            : []
    )
        .map(
            researchSourceSummary
        )
        .filter(Boolean);
}


// ============================================================
// RESEARCH TEXT
// ============================================================

function buildResearchText(
    results,
    maxCharacters =
        RESEARCH_CONFIG.maxTotalContext
) {
    let output =
        "";

    for (
        let index = 0;
        index <
            (
                Array.isArray(
                    results
                )
                    ? results.length
                    : 0
            );
        index++
    ) {
        const result =
            results[
                index
            ];

        if (!result) {
            continue;
        }

        const block = [
            `KAYNAK ${index + 1}`,

            `Başlık: ${
                researchClean(
                    result.title,
                    500
                )
            }`,

            `Kaynak: ${
                researchClean(
                    result.source,
                    200
                )
            }`,

            `Alan adı: ${
                researchClean(
                    result.domain,
                    200
                )
            }`,

            `URL: ${
                researchNormalizeUrl(
                    result.url
                )
            }`,

            result.snippet
                ? `Özet: ${
                    researchClean(
                        result.snippet,
                        4000
                    )
                }`
                : "",

            result.content
                ? `İçerik: ${
                    researchClean(
                        result.content,
                        RESEARCH_CONFIG
                            .maxContentPerResult
                    )
                }`
                : ""
        ]
            .filter(Boolean)
            .join("\n");

        if (
            output.length +
                block.length +
                2 >
            maxCharacters
        ) {
            break;
        }

        output +=
            (
                output
                    ? "\n\n"
                    : ""
            ) +
            block;
    }

    return output;
}


// ============================================================
// SOURCE CITATIONS
// ============================================================

function formatResearchCitations(
    sources
) {
    if (
        !Array.isArray(
            sources
        )
    ) {
        return "";
    }

    return sources
        .map(
            source => {
                const index =
                    source.index ||
                    0;

                const title =
                    researchClean(
                        source.title,
                        400
                    );

                const domain =
                    researchClean(
                        source.domain,
                        200
                    );

                const url =
                    researchNormalizeUrl(
                        source.url
                    );

                return (
                    `[${index}] ${title}` +
                    (
                        domain
                            ? ` — ${domain}`
                            : ""
                    ) +
                    (
                        url
                            ? ` — ${url}`
                            : ""
                    )
                );
            }
        )
        .filter(Boolean)
        .join("\n");
}


// ============================================================
// RESEARCH HISTORY
// ============================================================

function addResearchHistory(
    record
) {
    serverResearchHistory.push({
        id:
            researchId(
                "history"
            ),

        timestamp:
            nowISO(),

        ...researchClone(
            record
        )
    });

    while (
        serverResearchHistory.length >
        RESEARCH_CONFIG.historyLimit
    ) {
        serverResearchHistory.shift();
    }
}


function getResearchHistory(
    limit = 50
) {
    return researchClone(
        serverResearchHistory
            .slice(
                -Math.min(
                    Math.max(
                        Number(
                            limit
                        ) || 50,
                        1
                    ),
                    RESEARCH_CONFIG
                        .historyLimit
                )
            )
            .reverse()
    );
}


// ============================================================
// CLEANUP CACHE
// ============================================================

function cleanupServerResearchCache() {
    const now =
        Date.now();

    for (
        const [
            key,
            item
        ]
        of serverResearchCache
    ) {
        if (
            now -
                item.createdAt >
            RESEARCH_CONFIG.cacheTTL
        ) {
            serverResearchCache.delete(
                key
            );
        }
    }
}


const researchCacheTimer =
    setInterval(
        cleanupServerResearchCache,
        60000
    );


if (
    researchCacheTimer &&
    typeof researchCacheTimer.unref ===
        "function"
) {
    researchCacheTimer.unref();
}


// ============================================================
// GENERAL SEARCH
// ============================================================

async function executeResearch(
    query,
    options = {}
) {
    const started =
        Date.now();

    const cleanQuery =
        cleanResearchQuery(
            query
        );

    if (!cleanQuery) {
        return {
            success: false,

            error:
                "query_required",

            results: []
        };
    }

    RESEARCH_STATE.totalRequests++;

    const key =
        researchCacheKey(
            cleanQuery,
            options
        );

    if (
        options.cache !==
        false
    ) {
        const cached =
            getResearchCache(
                key
            );

        if (cached) {
            return {
                ...cached,

                cache:
                    true
            };
        }
    }

    const intent =
        detectCurrentResearch(
            cleanQuery
        );

    const category =
        detectResearchCategory(
            cleanQuery
        );

    if (
        intent.current
    ) {
        RESEARCH_STATE
            .currentQuestions++;
    }

    if (
        intent.explicit
    ) {
        RESEARCH_STATE
            .explicitResearch++;
    }

    const queries =
        buildResearchQueries(
            cleanQuery,
            options
        );

    const allResults =
        [];

    const providerNames =
        [];

    for (
        const searchQuery
        of queries
    ) {
        const duckResults =
            await searchDuckDuckGoServer(
                searchQuery,
                options
            );

        if (
            duckResults.length
        ) {
            providerNames.push(
                "duckduckgo"
            );

            allResults.push(
                ...duckResults
            );
        }

        const wikiResults =
            await searchWikipediaServer(
                searchQuery,
                options
            );

        if (
            wikiResults.length
        ) {
            providerNames.push(
                "wikipedia"
            );

            // İlk iki Wikipedia sonucunu zenginleştir
            for (
                const wikiResult
                of wikiResults.slice(
                    0,
                    2
                )
            ) {
                const summary =
                    await wikipediaSummaryServer(
                        wikiResult.title,
                        options
                    );

                if (
                    summary
                ) {
                    allResults.push({
                        ...wikiResult,

                        ...summary,

                        id:
                            wikiResult.id
                    });
                } else {
                    allResults.push(
                        wikiResult
                    );
                }
            }
        }
    }

    let results =
        sortResearchResults(
            allResults,
            cleanQuery
        );

    results =
        limitResearchResults(
            results,
            options.maxResults ||
            RESEARCH_CONFIG.maxResults
        );

    RESEARCH_STATE
        .resultsCollected +=
        results.length;

    const response = {
        success:
            results.length >
            0,

        mode:
            intent.explicit
                ? "explicit-research"
                : intent.current
                    ? "current-research"
                    : "web-research",

        query:
            cleanQuery,

        intent,

        category:
            category.category,

        categoryScores:
            category.scores,

        queries,

        results,

        sources:
            buildResearchSources(
                results
            ),

        providerNames:
            Array.from(
                new Set(
                    providerNames
                )
            ),

        resultCount:
            results.length,

        researchText:
            buildResearchText(
                results
            ),

        citations:
            formatResearchCitations(
                buildResearchSources(
                    results
                )
            ),

        durationMs:
            Date.now() -
            started,

        researchedAt:
            nowISO(),

        cache:
            false
    };

    if (
        response.success
    ) {
        RESEARCH_STATE
            .successfulRequests++;
    } else {
        RESEARCH_STATE
            .failedRequests++;
    }

    if (
        options.cache !==
        false
    ) {
        setResearchCache(
            key,
            response
        );
    }

    addResearchHistory({
        query:
            cleanQuery,

        mode:
            response.mode,

        category:
            category.category,

        resultCount:
            response.resultCount,

        providers:
            response.providerNames,

        durationMs:
            response.durationMs
    });

    return response;
}


// ============================================================
// DIRECT URL ROUTE
// ============================================================

async function executeDirectResearch(
    url,
    options = {}
) {
    const started =
        Date.now();

    if (
        !researchValidUrl(
            url
        )
    ) {
        return {
            success: false,

            error:
                "invalid_url",

            result:
                null
        };
    }

    const result =
        await researchDirectUrlServer(
            url,
            options
        );

    if (!result) {
        return {
            success: false,

            error:
                "direct_url_failed",

            result:
                null
        };
    }

    result.score =
        researchResultScore(
            result,
            options.query ||
            result.title
        );

    const response = {
        success: true,

        mode:
            "direct-url",

        query:
            researchClean(
                url,
                2000
            ),

        results: [
            result
        ],

        sources:
            buildResearchSources(
                [result]
            ),

        researchText:
            buildResearchText(
                [result]
            ),

        citations:
            formatResearchCitations(
                buildResearchSources(
                    [result]
                )
            ),

        durationMs:
            Date.now() -
            started,

        researchedAt:
            nowISO(),

        cache:
            false
    };

    RESEARCH_STATE
        .successfulRequests++;

    addResearchHistory({
        query:
            url,

        mode:
            "direct-url",

        resultCount:
            1,

        providers:
            ["directUrl"],

        durationMs:
            response.durationMs
    });

    return response;
}


// ============================================================
// SMART RESEARCH
// ============================================================

async function smartResearchServer(
    query,
    options = {}
) {
    const cleanQuery =
        cleanResearchQuery(
            query
        );

    if (!cleanQuery) {
        return {
            success: false,

            error:
                "query_required"
        };
    }

    if (
        researchValidUrl(
            cleanQuery
        )
    ) {
        return executeDirectResearch(
            cleanQuery,
            options
        );
    }

    return executeResearch(
        cleanQuery,
        options
    );
}


// ============================================================
// RESEARCH RESPONSE BUILDER
// ============================================================

function buildResearchAIInstruction(
    researchResult
) {
    if (
        !researchResult ||
        !researchResult.success
    ) {
        return "";
    }

    const sources =
        Array.isArray(
            researchResult.sources
        )
            ? researchResult.sources
            : [];

    const sourceText =
        formatResearchCitations(
            sources
        );

    return [
        "Aşağıdaki internet araştırmasını kullanarak kullanıcı sorusunu cevapla.",
        "Araştırma sonuçlarında olmayan bilgileri kesin gerçek gibi uydurma.",
        "Kaynaklar arasında farklılık varsa farklılığı açıkça belirt.",
        "Güncel bilgiyi güncel kaynakların içeriğine göre yorumla.",
        "Cevabın sonunda kaynakları numaralı şekilde belirt.",
        "",
        `Kullanıcı sorgusu: ${researchResult.query}`,
        "",
        "ARAŞTIRMA BAĞLAMI:",
        researchResult.researchText,
        "",
        "KAYNAKLAR:",
        sourceText
    ].join("\n");
}


// ============================================================
// CHAT + RESEARCH INTEGRATION
// ============================================================

async function runResearchEnhancedChat(
    message,
    options = {}
) {
    const text =
        sanitizeUserMessage(
            message
        );

    if (!text) {
        return {
            success: false,

            error:
                "message_required",

            text:
                ""
        };
    }

    const intent =
        detectCurrentResearch(
            text
        );

    if (
        !intent.shouldResearch &&
        options.forceResearch !==
            true
    ) {
        return smartAIChat(
            text,
            options
        );
    }

    const research =
        await smartResearchServer(
            text,
            {
                maxResults:
                    options.maxResults ||
                    RESEARCH_CONFIG.maxResults,

                timeoutMs:
                    options.timeoutMs ||
                    RESEARCH_CONFIG.timeoutMs,

                language:
                    options.language ||
                    "tr",

                cache:
                    options.cache !==
                    false
            }
        );

    if (
        !research.success
    ) {
        return smartAIChat(
            text,
            options
        );
    }

    const instruction =
        buildResearchAIInstruction(
            research
        );

    const language =
        detectLanguageAI(
            text
        );

    const baseHistory =
        sanitizeHistoryForModel(
            options.history ||
            []
        );

    const systemPrompt =
        buildExtendedSystemPrompt(
            {
                language:
                    language.language,

                intent:
                    "research",

                coding:
                    false,

                research:
                    true,

                current:
                    intent.current
            },
            text
        );

    const messages = [
        {
            role:
                "system",

            content:
                systemPrompt +
                "\n\n" +
                instruction
        },

        ...baseHistory,

        {
            role:
                "user",

            content:
                text
        }
    ];

    const answer =
        await generateWithFallback(
            messages,
            options
        );

    const responseText =
        answer &&
        answer.text
            ? sanitizeAIFormatting(
                answer.text
            )
            : "";

    return {
        success:
            Boolean(
                responseText
            ),

        text:
            responseText,

        provider:
            answer &&
            answer.provider
                ? answer.provider
                : "local",

        model:
            answer &&
            answer.model
                ? answer.model
                : "turkai-local",

        fallback:
            Boolean(
                answer &&
                answer.fallback
            ),

        research:
            true,

        current:
            intent.current,

        researchData:
            {
                query:
                    research.query,

                mode:
                    research.mode,

                category:
                    research.category,

                sources:
                    research.sources,

                resultCount:
                    research.resultCount,

                citations:
                    research.citations
            }
    };
}


// ============================================================
// MAIN RESEARCH API
// ============================================================

app.post(
    "/api/research",
    async (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query ||
                    req.body.prompt
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        try {
            const result =
                await smartResearchServer(
                    message,
                    {
                        maxResults:
                            req.body.maxResults,

                        timeoutMs:
                            req.body.timeoutMs,

                        language:
                            req.body.language ||
                            "tr",

                        cache:
                            req.body.cache !==
                            false
                    }
                );

            return res.json(
                result
            );
        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// SEARCH ONLY
// ============================================================

app.post(
    "/api/research/search",
    async (req, res) => {
        const query =
            cleanResearchQuery(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        try {
            const result =
                await executeResearch(
                    query,
                    {
                        maxResults:
                            req.body.maxResults,

                        timeoutMs:
                            req.body.timeoutMs,

                        language:
                            req.body.language ||
                            "tr",

                        cache:
                            req.body.cache !==
                            false
                    }
                );

            return res.json(
                result
            );

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_search_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// DIRECT URL API
// ============================================================

app.post(
    "/api/research/url",
    async (req, res) => {
        const url =
            safeString(
                req.body &&
                req.body.url
            );

        if (!url) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "url_required"
            });
        }

        try {
            const result =
                await executeDirectResearch(
                    url,
                    {
                        query:
                            req.body.query,

                        timeoutMs:
                            req.body.timeoutMs
                    }
                );

            return res.json(
                result
            );

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "url_research_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// RESEARCH CHAT API
// ============================================================

app.post(
    "/api/research/chat",
    async (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await runResearchEnhancedChat(
                    message,
                    {
                        history:
                            req.body.history,

                        provider:
                            req.body.provider,

                        model:
                            req.body.model,

                        temperature:
                            req.body.temperature,

                        maxTokens:
                            req.body.maxTokens,

                        maxResults:
                            req.body.maxResults,

                        forceResearch:
                            req.body.forceResearch ===
                            true
                    }
                );

            return res.json({
                success:
                    Boolean(
                        result &&
                        result.success
                    ),

                response:
                    result.text ||
                    "",

                message:
                    result.text ||
                    "",

                metadata:
                    result
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_chat_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// RESEARCH ANALYZE API
// ============================================================

app.post(
    "/api/research/analyze",
    (req, res) => {
        const query =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        const intent =
            detectCurrentResearch(
                query
            );

        const category =
            detectResearchCategory(
                query
            );

        const queries =
            buildResearchQueries(
                query
            );

        return res.json({
            success: true,

            query:
                cleanResearchQuery(
                    query
                ),

            intent,

            category:
                category.category,

            categoryScores:
                category.scores,

            queryVariants:
                queries
        });
    }
);


// ============================================================
// RESEARCH HISTORY API
// ============================================================

app.get(
    "/api/research/history",
    (req, res) => {
        return res.json({
            success: true,

            history:
                getResearchHistory(
                    req.query.limit ||
                    50
                )
        });
    }
);


// ============================================================
// RESEARCH CACHE API
// ============================================================

app.get(
    "/api/research/cache",
    (req, res) => {
        return res.json({
            success: true,

            entries:
                serverResearchCache.size,

            ttlMs:
                RESEARCH_CONFIG.cacheTTL
        });
    }
);


app.delete(
    "/api/research/cache",
    (req, res) => {
        const count =
            serverResearchCache.size;

        serverResearchCache.clear();

        return res.json({
            success: true,

            cleared:
                count
        });
    }
);


// ============================================================
// PROVIDER API
// ============================================================

app.get(
    "/api/research/providers",
    (req, res) => {
        return res.json({
            success: true,

            providers:
                researchClone(
                    researchProviders
                )
        });
    }
);


// ============================================================
// PROVIDER TOGGLE
// ============================================================

app.post(
    "/api/research/provider/:provider/enable",
    (req, res) => {
        const name =
            safeString(
                req.params.provider
            ).toLowerCase();

        if (
            !researchProviders[
                name
            ]
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "provider_not_found"
            });
        }

        researchProviders[
            name
        ].enabled =
            true;

        return res.json({
            success: true,

            provider:
                name,

            enabled:
                true
        });
    }
);


app.post(
    "/api/research/provider/:provider/disable",
    (req, res) => {
        const name =
            safeString(
                req.params.provider
            ).toLowerCase();

        if (
            !researchProviders[
                name
            ]
        ) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "provider_not_found"
            });
        }

        researchProviders[
            name
        ].enabled =
            false;

        return res.json({
            success: true,

            provider:
                name,

            enabled:
                false
        });
    }
);


// ============================================================
// RESEARCH STATUS
// ============================================================

function getResearchServerStatus() {
    return {
        ready:
            RESEARCH_CONFIG.enabled &&
            typeof fetch ===
                "function",

        enabled:
            RESEARCH_CONFIG.enabled,

        startedAt:
            RESEARCH_STATE.startedAt,

        providers:
            researchClone(
                researchProviders
            ),

        stats: {
            totalRequests:
                RESEARCH_STATE
                    .totalRequests,

            successfulRequests:
                RESEARCH_STATE
                    .successfulRequests,

            failedRequests:
                RESEARCH_STATE
                    .failedRequests,

            cacheHits:
                RESEARCH_STATE
                    .cacheHits,

            cacheMisses:
                RESEARCH_STATE
                    .cacheMisses,

            currentQuestions:
                RESEARCH_STATE
                    .currentQuestions,

            explicitResearch:
                RESEARCH_STATE
                    .explicitResearch,

            resultsCollected:
                RESEARCH_STATE
                    .resultsCollected,

            cacheEntries:
                serverResearchCache
                    .size
        }
    };
}


// ============================================================
// RESEARCH STATUS API
// ============================================================

app.get(
    "/api/research/status",
    (req, res) => {
        return res.json({
            success: true,

            ...getResearchServerStatus()
        });
    }
);


// ============================================================
// RESEARCH HEALTH
// ============================================================

app.get(
    "/api/research/health",
    (req, res) => {
        const status =
            getResearchServerStatus();

        return res.json({
            success: true,

            ok:
                status.ready ===
                true,

            module:
                "research",

            fetch:
                typeof fetch ===
                "function",

            providers:
                status.providers,

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// RESEARCH STATS
// ============================================================

app.get(
    "/api/research/stats",
    (req, res) => {
        const total =
            Math.max(
                RESEARCH_STATE
                    .totalRequests,
                0
            );

        const successful =
            RESEARCH_STATE
                .successfulRequests;

        return res.json({
            success: true,

            stats: {
                ...researchClone(
                    RESEARCH_STATE
                ),

                successRate:
                    total > 0
                        ? Number(
                            (
                                successful /
                                total
                            ).toFixed(
                                4
                            )
                        )
                        : 0,

                cacheEntries:
                    serverResearchCache
                        .size,

                historyEntries:
                    serverResearchHistory
                        .length,

                uptimeMs:
                    Date.now() -
                    new Date(
                        RESEARCH_STATE
                            .startedAt
                    ).getTime()
            }
        });
    }
);


// ============================================================
// RESEARCH + CHAT MAIN ROUTER
// ============================================================
//
// /api/chat/research
// kullanıcı: "bugün yapay zeka haberleri ne"
//
// Akış:
//
// mesaj
//   ↓
// güncel mi?
//   ↓
// araştır
//   ↓
// kaynakları topla
//   ↓
// AI context oluştur
//   ↓
// AI cevap üret
//   ↓
// kaynakları response'a ekle
// ============================================================

app.post(
    "/api/chat/research",
    async (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await runResearchEnhancedChat(
                    message,
                    {
                        history:
                            req.body.history,

                        provider:
                            req.body.provider,

                        model:
                            req.body.model,

                        temperature:
                            req.body.temperature,

                        maxTokens:
                            req.body.maxTokens,

                        maxResults:
                            req.body.maxResults,

                        timeoutMs:
                            req.body.timeoutMs,

                        forceResearch:
                            req.body.forceResearch ===
                            true
                    }
                );

            return res.json({
                success:
                    Boolean(
                        result.success
                    ),

                response:
                    result.text,

                message:
                    result.text,

                metadata:
                    result
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_chat_error",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// CURRENT QUESTION API
// ============================================================

app.post(
    "/api/current/check",
    (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        const result =
            detectCurrentResearch(
                message
            );

        return res.json({
            success: true,

            query:
                message,

            ...result
        });
    }
);


// ============================================================
// RESEARCH CONTEXT API
// ============================================================

app.post(
    "/api/research/context",
    async (req, res) => {
        const query =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        try {
            const result =
                await smartResearchServer(
                    query,
                    {
                        maxResults:
                            req.body.maxResults ||
                            8,

                        timeoutMs:
                            req.body.timeoutMs ||
                            15000,

                        language:
                            req.body.language ||
                            "tr"
                    }
                );

            if (
                !result.success
            ) {
                return res.status(
                    502
                ).json(
                    result
                );
            }

            return res.json({
                success: true,

                query:
                    result.query,

                context:
                    result.researchText,

                sources:
                    result.sources,

                citations:
                    result.citations,

                resultCount:
                    result.resultCount
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_context_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// RESEARCH EXPORT
// ============================================================

app.get(
    "/api/research/export",
    (req, res) => {
        return res.json({
            success: true,

            exportedAt:
                nowISO(),

            state:
                researchClone(
                    RESEARCH_STATE
                ),

            providers:
                researchClone(
                    researchProviders
                ),

            history:
                getResearchHistory(
                    RESEARCH_CONFIG
                        .historyLimit
                )
        });
    }
);


// ============================================================
// RESET RESEARCH STATS
// ============================================================

app.post(
    "/api/research/reset-stats",
    (req, res) => {
        for (
            const key
            of Object.keys(
                RESEARCH_STATE
            )
        ) {
            if (
                key ===
                "startedAt"
            ) {
                continue;
            }

            RESEARCH_STATE[
                key
            ] = 0;
        }

        return res.json({
            success: true,

            reset:
                true,

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// AUTO RESEARCH CHAT DECISION
// ============================================================

function shouldAutoResearch(
    message
) {
    const intent =
        detectCurrentResearch(
            message
        );

    if (
        intent.explicit
    ) {
        return true;
    }

    if (
        intent.current
    ) {
        return true;
    }

    if (
        intent.news
    ) {
        return true;
    }

    const category =
        detectResearchCategory(
            message
        );

    if (
        [
            "finance",
            "sports",
            "weather",
            "news"
        ].includes(
            category.category
        )
    ) {
        return (
            intent.current ===
            true
        );
    }

    return false;
}


// ============================================================
// AUTO RESEARCH STATUS
// ============================================================

app.post(
    "/api/research/auto-check",
    (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        const analysis =
            {
                shouldResearch:
                    shouldAutoResearch(
                        message
                    ),

                intent:
                    detectCurrentResearch(
                        message
                    ),

                category:
                    detectResearchCategory(
                        message
                    )
            };

        return res.json({
            success: true,

            query:
                message,

            ...analysis
        });
    }
);


// ============================================================
// EXTENDED PROVIDER STATISTICS
// ============================================================

function getExtendedResearchProviderStats() {
    return {
        duckduckgo: {
            enabled:
                researchProviders
                    .duckduckgo
                    .enabled,

            requests:
                RESEARCH_STATE
                    .duckduckgoRequests,

            success:
                RESEARCH_STATE
                    .duckduckgoSuccess,

            failure:
                RESEARCH_STATE
                    .duckduckgoFailure
        },

        wikipedia: {
            enabled:
                researchProviders
                    .wikipedia
                    .enabled,

            requests:
                RESEARCH_STATE
                    .wikipediaRequests,

            success:
                RESEARCH_STATE
                    .wikipediaSuccess,

            failure:
                RESEARCH_STATE
                    .wikipediaFailure
        },

        directUrl: {
            enabled:
                researchProviders
                    .directUrl
                    .enabled,

            requests:
                RESEARCH_STATE
                    .directUrlRequests,

            success:
                RESEARCH_STATE
                    .directUrlSuccess,

            failure:
                RESEARCH_STATE
                    .directUrlFailure
        }
    };
}


// ============================================================
// PROVIDER STATS API
// ============================================================

app.get(
    "/api/research/provider-stats",
    (req, res) => {
        return res.json({
            success: true,

            providers:
                getExtendedResearchProviderStats()
        });
    }
);


// ============================================================
// RESEARCH QUALITY CHECK
// ============================================================

function researchQualityCheck(
    result
) {
    if (
        !result
    ) {
        return {
            score: 0,

            quality:
                "empty"
        };
    }

    const resultCount =
        Array.isArray(
            result.results
        )
            ? result.results.length
            : 0;

    const sources =
        Array.isArray(
            result.sources
        )
            ? result.sources.length
            : 0;

    const avgScore =
        sources > 0
            ? result.sources.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.score ||
                        0
                    ),
                0
            ) /
            sources
            : 0;

    let score =
        0;

    if (
        resultCount >= 1
    ) {
        score +=
            0.25;
    }

    if (
        resultCount >= 3
    ) {
        score +=
            0.20;
    }

    if (
        resultCount >= 5
    ) {
        score +=
            0.15;
    }

    if (
        sources >= 2
    ) {
        score +=
            0.15;
    }

    if (
        avgScore >= 0.6
    ) {
        score +=
            0.15;
    }

    if (
        result.researchText &&
        result.researchText
            .length >
        1000
    ) {
        score +=
            0.10;
    }

    score =
        Math.min(
            1,
            score
        );

    return {
        score:
            Number(
                score.toFixed(
                    3
                )
            ),

        quality:
            score >=
            0.8
                ? "high"
                : score >=
                    0.5
                    ? "medium"
                    : "low",

        resultCount,

        sourceCount:
            sources,

        averageSourceScore:
            Number(
                avgScore.toFixed(
                    3
                )
            )
    };
}


// ============================================================
// QUALITY API
// ============================================================

app.post(
    "/api/research/quality",
    async (req, res) => {
        const query =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        try {
            const result =
                await executeResearch(
                    query,
                    {
                        maxResults:
                            req.body.maxResults ||
                            8
                    }
                );

            return res.json({
                success:
                    result.success,

                quality:
                    researchQualityCheck(
                        result
                    ),

                result
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "research_quality_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// RESEARCH SOURCE LOOKUP
// ============================================================

function findResearchSourceById(
    id
) {
    const needle =
        safeString(
            id
        );

    if (!needle) {
        return null;
    }

    for (
        const historyItem
        of serverResearchHistory
    ) {
        if (
            historyItem &&
            Array.isArray(
                historyItem.sources
            )
        ) {
            const found =
                historyItem.sources.find(
                    source =>
                        source &&
                        source.id ===
                        needle
                );

            if (found) {
                return researchClone(
                    found
                );
            }
        }
    }

    return null;
}


// ============================================================
// SOURCE LOOKUP API
// ============================================================

app.get(
    "/api/research/source/:id",
    (req, res) => {
        const source =
            findResearchSourceById(
                req.params.id
            );

        if (!source) {
            return res.status(
                404
            ).json({
                success: false,

                error:
                    "source_not_found"
            });
        }

        return res.json({
            success: true,

            source
        });
    }
);


// ============================================================
// RESEARCH RUNTIME RESET
// ============================================================

app.post(
    "/api/research/reset",
    (req, res) => {
        serverResearchCache.clear();

        serverResearchHistory.length =
            0;

        RESEARCH_STATE
            .totalRequests = 0;

        RESEARCH_STATE
            .successfulRequests = 0;

        RESEARCH_STATE
            .failedRequests = 0;

        RESEARCH_STATE
            .cacheHits = 0;

        RESEARCH_STATE
            .cacheMisses = 0;

        RESEARCH_STATE
            .duckduckgoRequests = 0;

        RESEARCH_STATE
            .duckduckgoSuccess = 0;

        RESEARCH_STATE
            .duckduckgoFailure = 0;

        RESEARCH_STATE
            .wikipediaRequests = 0;

        RESEARCH_STATE
            .wikipediaSuccess = 0;

        RESEARCH_STATE
            .wikipediaFailure = 0;

        RESEARCH_STATE
            .directUrlRequests = 0;

        RESEARCH_STATE
            .directUrlSuccess = 0;

        RESEARCH_STATE
            .directUrlFailure = 0;

        RESEARCH_STATE
            .currentQuestions = 0;

        RESEARCH_STATE
            .explicitResearch = 0;

        RESEARCH_STATE
            .resultsCollected = 0;

        return res.json({
            success: true,

            reset:
                true
        });
    }
);


// ============================================================
// 5000+ RUNTIME RESEARCH RULE MATRIX
// ============================================================
//
// Kaynak cümleleri, kullanıcı sorgu biçimleri ve konu
// varyasyonlarından runtime'da binlerce araştırma kuralı
// üretir. Böylece sistem sadece birkaç sabit kelimeye
// bağlı kalmaz.
//
// Bu liste 5000+ çalışma kuralına genişletilir.
// ============================================================

const RESEARCH_RULE_SEEDS = [
    "nedir",
    "kimdir",
    "ne zaman",
    "nerede",
    "nasıl",
    "neden",
    "hangi",
    "kaç",
    "fiyat",
    "son fiyat",
    "güncel fiyat",
    "bugün",
    "şimdi",
    "şu an",
    "en son",
    "son durum",
    "haber",
    "son haberler",
    "son dakika",
    "araştır",
    "detaylı araştır",
    "internette ara",
    "webde ara",
    "kaynak bul",
    "kaynak göster",
    "karşılaştır",
    "incele",
    "güncel bilgi",
    "resmi bilgi",
    "açıkla",
    "özetle",
    "detayları",
    "istatistik",
    "veri",
    "oran",
    "sayı",
    "tarih",
    "takvim",
    "duyuru",
    "açıklama",
    "rapor",
    "analiz",
    "yorum",
    "etkisi",
    "sonuçları",
    "değişiklik",
    "gelişme"
];


const RESEARCH_RULE_CONTEXTS = [
    "teknoloji",
    "yapay zeka",
    "yazılım",
    "internet",
    "bilgisayar",
    "telefon",
    "bilim",
    "uzay",
    "nasa",
    "fizik",
    "kimya",
    "biyoloji",
    "ekonomi",
    "dolar",
    "euro",
    "altın",
    "borsa",
    "kripto",
    "bitcoin",
    "spor",
    "futbol",
    "basketbol",
    "tenis",
    "eğitim",
    "okul",
    "üniversite",
    "sınav",
    "hava",
    "hava durumu",
    "yağmur",
    "kar",
    "rüzgar",
    "haber",
    "gündem",
    "oyun",
    "siber güvenlik",
    "güvenlik",
    "uygulama",
    "işletim sistemi",
    "otomobil",
    "uçak",
    "seyahat",
    "şehir",
    "ülke",
    "ürün",
    "alışveriş",
    "fiyat",
    "enerji",
    "sağlık bilgisi",
    "çevre",
    "iklim"
];


const RESEARCH_RULE_TEMPLATES = [
    "{seed} {context}",
    "{context} {seed}",
    "{context} hakkında {seed}",
    "{context} için {seed}",
    "{context} ile ilgili {seed}",
    "{context} konusunda {seed}",
    "{context} güncel {seed}",
    "{context} son {seed}",
    "{context} detaylı {seed}",
    "{context} resmi {seed}"
];


const RUNTIME_RESEARCH_RULES =
    [];


for (
    const seed
    of RESEARCH_RULE_SEEDS
) {
    for (
        const context
        of RESEARCH_RULE_CONTEXTS
    ) {
        for (
            const template
            of RESEARCH_RULE_TEMPLATES
        ) {
            if (
                RUNTIME_RESEARCH_RULES
                    .length >=
                5000
            ) {
                break;
            }

            const phrase =
                template
                    .replace(
                        "{seed}",
                        seed
                    )
                    .replace(
                        "{context}",
                        context
                    );

            RUNTIME_RESEARCH_RULES.push({
                id:
                    RUNTIME_RESEARCH_RULES
                        .length +
                    1,

                phrase,

                seed,

                context,

                type:
                    seed ===
                    "haber"
                        ? "news"
                        : seed ===
                            "fiyat"
                            ? "price"
                            : seed ===
                                "araştır"
                                ? "research"
                                : "general"
            });
        }

        if (
            RUNTIME_RESEARCH_RULES
                .length >=
            5000
        ) {
            break;
        }
    }

    if (
        RUNTIME_RESEARCH_RULES
            .length >=
        5000
    ) {
        break;
    }
}


// ============================================================
// RUNTIME RULE CHECK
// ============================================================

function matchRuntimeResearchRules(
    message
) {
    const normalized =
        researchNormalize(
            message
        );

    const matches =
        [];

    for (
        const rule
        of RUNTIME_RESEARCH_RULES
    ) {
        if (
            normalized.includes(
                researchNormalize(
                    rule.phrase
                )
            )
        ) {
            matches.push(
                researchClone(
                    rule
                )
            );

            if (
                matches.length >=
                20
            ) {
                break;
            }
        }
    }

    return matches;
}


// ============================================================
// RULE API
// ============================================================

app.post(
    "/api/research/rules",
    (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        return res.json({
            success: true,

            totalRules:
                RUNTIME_RESEARCH_RULES
                    .length,

            matches:
                matchRuntimeResearchRules(
                    message
                )
        });
    }
);


// ============================================================
// RESEARCH ENGINE SUMMARY
// ============================================================

function getResearchEngineSummary() {
    return {
        version:
            SERVER_VERSION,

        ready:
            RESEARCH_CONFIG.enabled &&
            typeof fetch ===
                "function",

        rules:
            RUNTIME_RESEARCH_RULES
                .length,

        providers:
            researchClone(
                researchProviders
            ),

        cache:
            serverResearchCache
                .size,

        history:
            serverResearchHistory
                .length,

        state:
            researchClone(
                RESEARCH_STATE
            )
    };
}


app.get(
    "/api/research/summary",
    (req, res) => {
        return res.json({
            success: true,

            summary:
                getResearchEngineSummary()
        });
    }
);


// ============================================================
// SOCKET.IO RESEARCH
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:research",
                async payload => {
                    const data =
                        payload &&
                        typeof payload ===
                            "object"
                            ? payload
                            : {};

                    const query =
                        sanitizeUserMessage(
                            data.query ||
                            data.message
                        );

                    if (
                        !query
                    ) {
                        socket.emit(
                            "turkai:research:error",
                            {
                                success:
                                    false,

                                error:
                                    "query_required"
                            }
                        );

                        return;
                    }

                    try {
                        socket.emit(
                            "turkai:research:start",
                            {
                                success:
                                    true,

                                query
                            }
                        );

                        const result =
                            await smartResearchServer(
                                query,
                                {
                                    maxResults:
                                        data.maxResults ||
                                        8,

                                    timeoutMs:
                                        data.timeoutMs ||
                                        15000,

                                    language:
                                        data.language ||
                                        "tr"
                                }
                            );

                        socket.emit(
                            "turkai:research:result",
                            result
                        );

                        socket.emit(
                            "turkai:research:end",
                            {
                                success:
                                    Boolean(
                                        result &&
                                        result.success
                                    ),

                                query,

                                resultCount:
                                    result &&
                                    result.resultCount
                                        ? result.resultCount
                                        : 0
                            }
                        );

                    } catch (error) {
                        socket.emit(
                            "turkai:research:error",
                            {
                                success:
                                    false,

                                error:
                                    error.message
                            }
                        );
                    }
                }
            );
        }
    );
}


// ============================================================
// RESEARCH INITIAL STATUS
// ============================================================

console.log(
    "[TürkAI] Part 3 Research Engine yüklendi."
);

console.log(
    "[TürkAI] DuckDuckGo:",
    researchProviders
        .duckduckgo
        .enabled
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "[TürkAI] Wikipedia:",
    researchProviders
        .wikipedia
        .enabled
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "[TürkAI] Direct URL:",
    researchProviders
        .directUrl
        .enabled
        ? "AKTİF"
        : "KAPALI"
);

console.log(
    "[TürkAI] Runtime research rules:",
    RUNTIME_RESEARCH_RULES
        .length
);

console.log(
    "[TürkAI] Research API: /api/research"
);

console.log(
    "[TürkAI] Research Chat: /api/research/chat"
);

console.log(
    "[TürkAI] Current Check: /api/current/check"
);


// ============================================================
// SERVER STATE EXTENSION
// ============================================================

serverState.research = {
    state:
        RESEARCH_STATE,

    config:
        RESEARCH_CONFIG,

    providers:
        researchProviders,

    cache:
        serverResearchCache,

    history:
        serverResearchHistory,

    detectCurrentResearch,

    detectResearchCategory,

    buildResearchQueries,

    searchDuckDuckGoServer,

    searchWikipediaServer,

    wikipediaSummaryServer,

    researchDirectUrlServer,

    executeResearch,

    executeDirectResearch,

    smartResearchServer,

    runResearchEnhancedChat,

    shouldAutoResearch,

    buildResearchAIInstruction,

    buildResearchText,

    buildResearchSources,

    buildResearchCitations:
        formatResearchCitations,

    getResearchServerStatus,

    getResearchEngineSummary,

    researchQualityCheck,

    matchRuntimeResearchRules
};


// ============================================================
// PART 3 END
// ============================================================
//
// Sonraki bölüm:
// PART 4/10
//
// - Hava durumu
// - Döviz
// - altın
// - şehir/ülke verisi
// - otomatik şehir çözümleme
// - hava sorgusu
// - currency API
// - weather API
// - /api/weather
// - /api/currency
// - güncel finans cevapları
// - frontend'e hazır veri modelleri
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 4 / 10
// WEATHER + CURRENCY + GOLD + MARKET DATA
// ============================================================
//
// Özellikler:
//
// WEATHER
// - Open-Meteo geocoding
// - Open-Meteo forecast
// - şehir arama
// - koordinat arama
// - anlık hava
// - saatlik tahmin
// - günlük tahmin
// - yağış
// - kar
// - rüzgâr
// - nem
// - UV
// - güneş doğuş/batış
// - hava alarmı
//
// CURRENCY
// - EUR
// - USD
// - GBP
// - TRY
// - CHF
// - JPY
// - CAD
// - AUD
// - SAR
// - AED
// - CNY
// - çoklu kur
// - çapraz kur
// - kur dönüşümü
//
// GOLD
// - XAU
// - ons altın
// - gram altın hesabı
// - TRY bazlı tahmini dönüşüm
//
// API
// - /api/weather
// - /api/weather/city
// - /api/weather/coordinates
// - /api/weather/search
// - /api/weather/alerts
// - /api/weather/hourly
// - /api/weather/daily
// - /api/currency
// - /api/currency/rate
// - /api/currency/convert
// - /api/currency/all
// - /api/gold
// - /api/market
// - /api/market/analyze
// - /api/weather/status
// - /api/currency/status
//
// Ayrıca 5000+ runtime sorgu kuralı üretir.
// ============================================================


// ============================================================
// PART 4 RUNTIME STATE
// ============================================================

const MARKET_STATE = {
    startedAt:
        nowISO(),

    weatherRequests:
        0,

    weatherSuccess:
        0,

    weatherFailure:
        0,

    weatherCacheHits:
        0,

    weatherSearches:
        0,

    currencyRequests:
        0,

    currencySuccess:
        0,

    currencyFailure:
        0,

    currencyConversions:
        0,

    goldRequests:
        0,

    goldSuccess:
        0,

    goldFailure:
        0,

    marketRequests:
        0
};


// ============================================================
// PART 4 CONFIG
// ============================================================

const MARKET_CONFIG = {
    weatherTimeoutMs:
        15000,

    currencyTimeoutMs:
        12000,

    goldTimeoutMs:
        12000,

    weatherCacheTTL:
        10 * 60 * 1000,

    currencyCacheTTL:
        10 * 60 * 1000,

    goldCacheTTL:
        5 * 60 * 1000,

    weatherForecastDays:
        7,

    weatherMaxHourly:
        168,

    currencyBase:
        "EUR",

    currencyApi:
        "https://api.frankfurter.app",

    weatherGeocodingApi:
        "https://geocoding-api.open-meteo.com/v1/search",

    weatherForecastApi:
        "https://api.open-meteo.com/v1/forecast",

    goldApi:
        "https://api.gold-api.com/price/XAU"
};


// ============================================================
// MARKET CACHE
// ============================================================

const MARKET_CACHE = {
    weather:
        new Map(),

    currency:
        new Map(),

    gold:
        new Map()
};


// ============================================================
// CACHE CLEANUP
// ============================================================

function marketCacheGet(
    map,
    key,
    ttl
) {
    const item =
        map.get(
            key
        );

    if (!item) {
        return null;
    }

    if (
        Date.now() -
            item.createdAt >
        ttl
    ) {
        map.delete(
            key
        );

        return null;
    }

    return clone(
        item.value
    );
}


function marketCacheSet(
    map,
    key,
    value
) {
    map.set(
        key,
        {
            createdAt:
                Date.now(),

            value:
                clone(value)
        }
    );
}


function cleanupMarketCache() {
    const now =
        Date.now();

    for (
        const [
            map,
            ttl
        ]
        of [
            [
                MARKET_CACHE.weather,
                MARKET_CONFIG.weatherCacheTTL
            ],
            [
                MARKET_CACHE.currency,
                MARKET_CONFIG.currencyCacheTTL
            ],
            [
                MARKET_CACHE.gold,
                MARKET_CONFIG.goldCacheTTL
            ]
        ]
    ) {
        for (
            const [
                key,
                item
            ]
            of map
        ) {
            if (
                now -
                    item.createdAt >
                ttl
            ) {
                map.delete(
                    key
                );
            }
        }
    }
}


const marketCleanupTimer =
    setInterval(
        cleanupMarketCache,
        60000
    );


if (
    marketCleanupTimer &&
    typeof marketCleanupTimer.unref ===
        "function"
) {
    marketCleanupTimer.unref();
}


// ============================================================
// COMMON MARKET HTTP
// ============================================================

async function marketFetch(
    url,
    options = {}
) {
    if (
        typeof fetch !==
        "function"
    ) {
        throw new Error(
            "fetch_not_supported"
        );
    }

    const timeout =
        Math.min(
            Math.max(
                number(
                    options.timeoutMs,
                    12000
                ),
                3000
            ),
            60000
        );

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () =>
                controller.abort(),
            timeout
        );

    try {
        const response =
            await fetch(
                url,
                {
                    method:
                        options.method ||
                        "GET",

                    headers: {
                        "Accept":
                            options.accept ||
                            "application/json,text/plain,*/*",

                        "User-Agent":
                            "TurkAI-Market-Engine/30"
                    },

                    redirect:
                        "follow",

                    signal:
                        controller.signal
                }
            );

        const body =
            await response.text();

        return {
            ok:
                response.ok,

            status:
                response.status,

            url:
                response.url ||
                url,

            contentType:
                response.headers.get(
                    "content-type"
                ) || "",

            body
        };

    } finally {
        clearTimeout(
            timer
        );
    }
}


async function marketFetchJSON(
    url,
    options = {}
) {
    const result =
        await marketFetch(
            url,
            {
                ...options,

                accept:
                    "application/json"
            }
        );

    let data =
        null;

    try {
        data =
            JSON.parse(
                result.body
            );
    } catch {
        data =
            null;
    }

    return {
        ...result,

        data
    };
}


// ============================================================
// WEATHER
// ============================================================

const TURKAI_CITY_ALIASES = {
    istanbul:
        "İstanbul",

    ankara:
        "Ankara",

    izmir:
        "İzmir",

    bursa:
        "Bursa",

    antalya:
        "Antalya",

    konya:
        "Konya",

    adana:
        "Adana",

    gaziantep:
        "Gaziantep",

    kayseri:
        "Kayseri",

    samsun:
        "Samsun",

    trabzon:
        "Trabzon",

    erzurum:
        "Erzurum",

    malatya:
        "Malatya",

    van:
        "Van",

    mersin:
        "Mersin",

    eskisehir:
        "Eskişehir",

    eskişehir:
        "Eskişehir",

    diyarbakir:
        "Diyarbakır",

    diyarbakır:
        "Diyarbakır",

    denizli:
        "Denizli",

    sakarya:
        "Sakarya",

    kocaeli:
        "Kocaeli",

    mugla:
        "Muğla",

    muğla:
        "Muğla",

    aydin:
        "Aydın",

    aydın:
        "Aydın",

    balikesir:
        "Balıkesir",

    balıkesir:
        "Balıkesir",

    manisa:
        "Manisa",

    hatay:
        "Hatay",

    rize:
        "Rize",

    ordu:
        "Ordu",

    giresun:
        "Giresun",

    tokat:
        "Tokat",

    sivas:
        "Sivas",

    corum:
        "Çorum",

    çorum:
        "Çorum",

    amasya:
        "Amasya",

    yozgat:
        "Yozgat",

    kirikkale:
        "Kırıkkale",

    kırıkkale:
        "Kırıkkale",

    kirsehir:
        "Kırşehir",

    kırşehir:
        "Kırşehir",

    nevsehir:
        "Nevşehir",

    nevşehir:
        "Nevşehir",

    bolu:
        "Bolu",

    duzce:
        "Düzce",

    düzce:
        "Düzce",

    zonguldak:
        "Zonguldak",

    bartin:
        "Bartın",

    bartın:
        "Bartın",

    karabuk:
        "Karabük",

    karabük:
        "Karabük",

    kastamonu:
        "Kastamonu",

    sinop:
        "Sinop",

    kirklareli:
        "Kırklareli",

    kırklareli:
        "Kırklareli",

    edirne:
        "Edirne",

    tekirdag:
        "Tekirdağ",

    tekirdağ:
        "Tekirdağ",

    canakkale:
        "Çanakkale",

    çanakkale:
        "Çanakkale",

    kutahya:
        "Kütahya",

    kütahya:
        "Kütahya",

    usak:
        "Uşak",

    uşak:
        "Uşak",

    afyon:
        "Afyonkarahisar",

    afyonkarahisar:
        "Afyonkarahisar",

    isparta:
        "Isparta",

    burdur:
        "Burdur",

    elazig:
        "Elazığ",

    elazığ:
        "Elazığ",

    bingol:
        "Bingöl",

    bingöl:
        "Bingöl",

    mus:
        "Muş",

    muş:
        "Muş",

    bitlis:
        "Bitlis",

    hakkari:
        "Hakkari",

    sirnak:
        "Şırnak",

    şırnak:
        "Şırnak",

    mardin:
        "Mardin",

    siirt:
        "Siirt",

    agri:
        "Ağrı",

    ağrı:
        "Ağrı",

    kars:
        "Kars",

    igdir:
        "Iğdır",

    ığdır:
        "Iğdır",

    ardahan:
        "Ardahan",

    artvin:
        "Artvin",

    aksaray:
        "Aksaray",

    kirikkale:
        "Kırıkkale",

    karaman:
        "Karaman",

    niğde:
        "Niğde",

    nigde:
        "Niğde",

    osmaniye:
        "Osmaniye",

    kilis:
        "Kilis",

    kahramanmaras:
        "Kahramanmaraş",

    kahramanmaraş:
        "Kahramanmaraş",

    adiyaman:
        "Adıyaman",

    adıyaman:
        "Adıyaman",

    şanlıurfa:
        "Şanlıurfa",

    sanliurfa:
        "Şanlıurfa"
};


// ============================================================
// WEATHER CODE MAP
// ============================================================

const TURKAI_WEATHER_CODES = {
    0:
        "Açık",

    1:
        "Çoğunlukla açık",

    2:
        "Parçalı bulutlu",

    3:
        "Kapalı",

    45:
        "Sis",

    48:
        "Kırağılı sis",

    51:
        "Hafif çiseleme",

    53:
        "Çiseleme",

    55:
        "Yoğun çiseleme",

    56:
        "Hafif donan çiseleme",

    57:
        "Yoğun donan çiseleme",

    61:
        "Hafif yağmur",

    63:
        "Yağmur",

    65:
        "Şiddetli yağmur",

    66:
        "Hafif donan yağmur",

    67:
        "Şiddetli donan yağmur",

    71:
        "Hafif kar",

    73:
        "Kar",

    75:
        "Yoğun kar",

    77:
        "Kar taneleri",

    80:
        "Hafif sağanak",

    81:
        "Sağanak",

    82:
        "Şiddetli sağanak",

    85:
        "Kar sağanağı",

    86:
        "Şiddetli kar sağanağı",

    95:
        "Gök gürültülü fırtına",

    96:
        "Dolu ve gök gürültülü fırtına",

    99:
        "Şiddetli dolu ve gök gürültülü fırtına"
};


function weatherDescription4(
    code
) {
    return (
        TURKAI_WEATHER_CODES[
            Number(code)
        ] ||
        "Bilinmeyen hava durumu"
    );
}


// ============================================================
// WEATHER ICON TYPE
// ============================================================

function weatherIconType4(
    code
) {
    const n =
        Number(code);

    if (n === 0) {
        return "clear";
    }

    if (
        n === 1 ||
        n === 2
    ) {
        return "partly-cloudy";
    }

    if (n === 3) {
        return "cloudy";
    }

    if (
        n === 45 ||
        n === 48
    ) {
        return "fog";
    }

    if (
        n >= 51 &&
        n <= 67
    ) {
        return "rain";
    }

    if (
        n >= 71 &&
        n <= 77
    ) {
        return "snow";
    }

    if (
        n >= 80 &&
        n <= 82
    ) {
        return "showers";
    }

    if (
        n >= 85 &&
        n <= 86
    ) {
        return "snow-showers";
    }

    if (
        n >= 95
    ) {
        return "thunderstorm";
    }

    return "unknown";
}


// ============================================================
// WEATHER CITY NORMALIZATION
// ============================================================

function normalizeWeatherCity4(
    city
) {
    const raw =
        safeString(
            city
        );

    if (!raw) {
        return "";
    }

    const key =
        normalizeText(
            raw
        );

    return (
        TURKAI_CITY_ALIASES[
            key
        ] ||
        raw
    );
}


// ============================================================
// WEATHER GEO SEARCH
// ============================================================

async function weatherSearchCity4(
    city,
    options = {}
) {
    const query =
        normalizeWeatherCity4(
            city
        );

    if (!query) {
        return {
            success: false,

            error:
                "city_required",

            results: []
        };
    }

    MARKET_STATE
        .weatherSearches++;

    const cacheKey =
        `geo:${normalizeText(query)}`;

    const cached =
        marketCacheGet(
            MARKET_CACHE.weather,
            cacheKey,
            MARKET_CONFIG.weatherCacheTTL
        );

    if (cached) {
        MARKET_STATE
            .weatherCacheHits++;

        return cached;
    }

    try {
        const params =
            new URLSearchParams();

        params.set(
            "name",
            query
        );

        params.set(
            "count",
            String(
                Math.min(
                    Math.max(
                        number(
                            options.count,
                            5
                        ),
                        1
                    ),
                    20
                )
            )
        );

        params.set(
            "language",
            "tr"
        );

        params.set(
            "format",
            "json"
        );

        if (
            options.countryCode
        ) {
            params.set(
                "countryCode",
                safeString(
                    options.countryCode
                )
            );
        }

        const response =
            await marketFetchJSON(
                `${MARKET_CONFIG.weatherGeocodingApi}?${params.toString()}`,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        MARKET_CONFIG.weatherTimeoutMs
                }
            );

        if (
            !response.ok ||
            !response.data
        ) {
            MARKET_STATE
                .weatherFailure++;

            return {
                success: false,

                error:
                    "geocoding_failed",

                results: []
            };
        }

        const raw =
            Array.isArray(
                response.data.results
            )
                ? response.data.results
                : [];

        const results =
            raw
                .filter(
                    item =>
                        validCoordinates4(
                            item.latitude,
                            item.longitude
                        )
                )
                .map(
                    item => ({
                        name:
                            safeString(
                                item.name
                            ),

                        latitude:
                            Number(
                                item.latitude
                            ),

                        longitude:
                            Number(
                                item.longitude
                            ),

                        country:
                            safeString(
                                item.country
                            ),

                        countryCode:
                            safeString(
                                item.country_code
                            ),

                        admin1:
                            safeString(
                                item.admin1
                            ),

                        admin2:
                            safeString(
                                item.admin2
                            ),

                        timezone:
                            safeString(
                                item.timezone
                            ),

                        population:
                            number(
                                item.population,
                                0
                            ),

                        elevation:
                            number(
                                item.elevation,
                                0
                            )
                    })
                );

        const result = {
            success:
                results.length >
                0,

            query,

            results,

            resultCount:
                results.length,

            searchedAt:
                nowISO()
        };

        marketCacheSet(
            MARKET_CACHE.weather,
            cacheKey,
            result
        );

        return result;

    } catch (error) {
        MARKET_STATE
            .weatherFailure++;

        return {
            success: false,

            error:
                safeString(
                    error.message,
                    "geocoding_error"
                ),

            results: []
        };
    }
}


// ============================================================
// COORDINATE VALIDATION
// ============================================================

function validCoordinates4(
    latitude,
    longitude
) {
    const lat =
        Number(
            latitude
        );

    const lon =
        Number(
            longitude
        );

    return (
        Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180
    );
}


// ============================================================
// WEATHER FORECAST URL
// ============================================================

function buildWeatherForecastUrl4(
    latitude,
    longitude,
    options = {}
) {
    if (
        !validCoordinates4(
            latitude,
            longitude
        )
    ) {
        return "";
    }

    const params =
        new URLSearchParams();

    params.set(
        "latitude",
        String(
            latitude
        )
    );

    params.set(
        "longitude",
        String(
            longitude
        )
    );

    params.set(
        "timezone",
        "auto"
    );

    params.set(
        "forecast_days",
        String(
            Math.min(
                Math.max(
                    number(
                        options.forecastDays,
                        MARKET_CONFIG.weatherForecastDays
                    ),
                    1
                ),
                16
            )
        )
    );

    params.set(
        "temperature_unit",
        "celsius"
    );

    params.set(
        "wind_speed_unit",
        "kmh"
    );

    params.set(
        "precipitation_unit",
        "mm"
    );

    params.set(
        "current",
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "weather_code",
            "cloud_cover",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "is_day"
        ].join(",")
    );

    params.set(
        "hourly",
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "rain",
            "showers",
            "snowfall",
            "snow_depth",
            "weather_code",
            "cloud_cover",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "uv_index",
            "visibility",
            "is_day"
        ].join(",")
    );

    params.set(
        "daily",
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "sunrise",
            "sunset",
            "daylight_duration",
            "sunshine_duration",
            "uv_index_max",
            "precipitation_sum",
            "rain_sum",
            "showers_sum",
            "snowfall_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "wind_direction_10m_dominant"
        ].join(",")
    );

    return (
        `${MARKET_CONFIG.weatherForecastApi}?` +
        params.toString()
    );
}


// ============================================================
// WEATHER MODEL
// ============================================================

function buildCurrentWeather4(
    current
) {
    if (
        !current
    ) {
        return null;
    }

    const code =
        number(
            current.weather_code,
            -1
        );

    return {
        time:
            safeString(
                current.time
            ),

        temperature:
            number(
                current.temperature_2m,
                null
            ),

        apparentTemperature:
            number(
                current.apparent_temperature,
                null
            ),

        humidity:
            number(
                current.relative_humidity_2m,
                null
            ),

        precipitation:
            number(
                current.precipitation,
                0
            ),

        rain:
            number(
                current.rain,
                0
            ),

        showers:
            number(
                current.showers,
                0
            ),

        snowfall:
            number(
                current.snowfall,
                0
            ),

        weatherCode:
            code,

        description:
            weatherDescription4(
                code
            ),

        icon:
            weatherIconType4(
                code
            ),

        cloudCover:
            number(
                current.cloud_cover,
                null
            ),

        pressure:
            number(
                current.surface_pressure,
                null
            ),

        windSpeed:
            number(
                current.wind_speed_10m,
                null
            ),

        windDirection:
            number(
                current.wind_direction_10m,
                null
            ),

        windGusts:
            number(
                current.wind_gusts_10m,
                null
            ),

        isDay:
            Number(
                current.is_day
            ) === 1
    };
}


// ============================================================
// WEATHER HOURLY
// ============================================================

function buildHourlyWeather4(
    hourly
) {
    if (
        !hourly ||
        !Array.isArray(
            hourly.time
        )
    ) {
        return [];
    }

    const result =
        [];

    const length =
        Math.min(
            hourly.time.length,
            MARKET_CONFIG.weatherMaxHourly
        );

    for (
        let index = 0;
        index < length;
        index++
    ) {
        const code =
            Array.isArray(
                hourly.weather_code
            )
                ? hourly.weather_code[index]
                : -1;

        result.push({
            time:
                safeString(
                    hourly.time[index]
                ),

            temperature:
                Array.isArray(
                    hourly.temperature_2m
                )
                    ? number(
                        hourly.temperature_2m[index],
                        null
                    )
                    : null,

            apparentTemperature:
                Array.isArray(
                    hourly.apparent_temperature
                )
                    ? number(
                        hourly.apparent_temperature[index],
                        null
                    )
                    : null,

            humidity:
                Array.isArray(
                    hourly.relative_humidity_2m
                )
                    ? number(
                        hourly.relative_humidity_2m[index],
                        null
                    )
                    : null,

            precipitationProbability:
                Array.isArray(
                    hourly.precipitation_probability
                )
                    ? number(
                        hourly.precipitation_probability[index],
                        null
                    )
                    : null,

            precipitation:
                Array.isArray(
                    hourly.precipitation
                )
                    ? number(
                        hourly.precipitation[index],
                        0
                    )
                    : 0,

            rain:
                Array.isArray(
                    hourly.rain
                )
                    ? number(
                        hourly.rain[index],
                        0
                    )
                    : 0,

            showers:
                Array.isArray(
                    hourly.showers
                )
                    ? number(
                        hourly.showers[index],
                        0
                    )
                    : 0,

            snowfall:
                Array.isArray(
                    hourly.snowfall
                )
                    ? number(
                        hourly.snowfall[index],
                        0
                    )
                    : 0,

            weatherCode:
                number(
                    code,
                    -1
                ),

            description:
                weatherDescription4(
                    code
                ),

            icon:
                weatherIconType4(
                    code
                ),

            cloudCover:
                Array.isArray(
                    hourly.cloud_cover
                )
                    ? number(
                        hourly.cloud_cover[index],
                        null
                    )
                    : null,

            windSpeed:
                Array.isArray(
                    hourly.wind_speed_10m
                )
                    ? number(
                        hourly.wind_speed_10m[index],
                        null
                    )
                    : null,

            windDirection:
                Array.isArray(
                    hourly.wind_direction_10m
                )
                    ? number(
                        hourly.wind_direction_10m[index],
                        null
                    )
                    : null,

            windGusts:
                Array.isArray(
                    hourly.wind_gusts_10m
                )
                    ? number(
                        hourly.wind_gusts_10m[index],
                        null
                    )
                    : null,

            uvIndex:
                Array.isArray(
                    hourly.uv_index
                )
                    ? number(
                        hourly.uv_index[index],
                        null
                    )
                    : null,

            visibility:
                Array.isArray(
                    hourly.visibility
                )
                    ? number(
                        hourly.visibility[index],
                        null
                    )
                    : null,

            isDay:
                Array.isArray(
                    hourly.is_day
                )
                    ? Number(
                        hourly.is_day[index]
                    ) === 1
                    : true
        });
    }

    return result;
}


// ============================================================
// WEATHER DAILY
// ============================================================

function buildDailyWeather4(
    daily
) {
    if (
        !daily ||
        !Array.isArray(
            daily.time
        )
    ) {
        return [];
    }

    const result =
        [];

    for (
        let index = 0;
        index < daily.time.length;
        index++
    ) {
        const code =
            Array.isArray(
                daily.weather_code
            )
                ? daily.weather_code[index]
                : -1;

        result.push({
            date:
                safeString(
                    daily.time[index]
                ),

            weatherCode:
                number(
                    code,
                    -1
                ),

            description:
                weatherDescription4(
                    code
                ),

            icon:
                weatherIconType4(
                    code
                ),

            temperatureMax:
                Array.isArray(
                    daily.temperature_2m_max
                )
                    ? number(
                        daily.temperature_2m_max[index],
                        null
                    )
                    : null,

            temperatureMin:
                Array.isArray(
                    daily.temperature_2m_min
                )
                    ? number(
                        daily.temperature_2m_min[index],
                        null
                    )
                    : null,

            apparentTemperatureMax:
                Array.isArray(
                    daily.apparent_temperature_max
                )
                    ? number(
                        daily.apparent_temperature_max[index],
                        null
                    )
                    : null,

            apparentTemperatureMin:
                Array.isArray(
                    daily.apparent_temperature_min
                )
                    ? number(
                        daily.apparent_temperature_min[index],
                        null
                    )
                    : null,

            precipitation:
                Array.isArray(
                    daily.precipitation_sum
                )
                    ? number(
                        daily.precipitation_sum[index],
                        0
                    )
                    : 0,

            rain:
                Array.isArray(
                    daily.rain_sum
                )
                    ? number(
                        daily.rain_sum[index],
                        0
                    )
                    : 0,

            showers:
                Array.isArray(
                    daily.showers_sum
                )
                    ? number(
                        daily.showers_sum[index],
                        0
                    )
                    : 0,

            snowfall:
                Array.isArray(
                    daily.snowfall_sum
                )
                    ? number(
                        daily.snowfall_sum[index],
                        0
                    )
                    : 0,

            precipitationProbability:
                Array.isArray(
                    daily.precipitation_probability_max
                )
                    ? number(
                        daily.precipitation_probability_max[index],
                        null
                    )
                    : null,

            uvIndexMax:
                Array.isArray(
                    daily.uv_index_max
                )
                    ? number(
                        daily.uv_index_max[index],
                        null
                    )
                    : null,

            windSpeedMax:
                Array.isArray(
                    daily.wind_speed_10m_max
                )
                    ? number(
                        daily.wind_speed_10m_max[index],
                        null
                    )
                    : null,

            windGustsMax:
                Array.isArray(
                    daily.wind_gusts_10m_max
                )
                    ? number(
                        daily.wind_gusts_10m_max[index],
                        null
                    )
                    : null,

            windDirection:
                Array.isArray(
                    daily.wind_direction_10m_dominant
                )
                    ? number(
                        daily.wind_direction_10m_dominant[index],
                        null
                    )
                    : null,

            sunrise:
                Array.isArray(
                    daily.sunrise
                )
                    ? safeString(
                        daily.sunrise[index]
                    )
                    : "",

            sunset:
                Array.isArray(
                    daily.sunset
                )
                    ? safeString(
                        daily.sunset[index]
                    )
                    : "",

            sunshineDuration:
                Array.isArray(
                    daily.sunshine_duration
                )
                    ? number(
                        daily.sunshine_duration[index],
                        null
                    )
                    : null
        });
    }

    return result;
}


// ============================================================
// WEATHER FETCH BY COORDINATES
// ============================================================

async function weatherByCoordinates4(
    latitude,
    longitude,
    options = {}
) {
    if (
        !validCoordinates4(
            latitude,
            longitude
        )
    ) {
        return {
            success: false,

            error:
                "invalid_coordinates"
        };
    }

    const lat =
        Number(
            Number(
                latitude
            ).toFixed(4)
        );

    const lon =
        Number(
            Number(
                longitude
            ).toFixed(4)
        );

    const forecastDays =
        Math.min(
            Math.max(
                number(
                    options.forecastDays,
                    MARKET_CONFIG.weatherForecastDays
                ),
                1
            ),
            16
        );

    const cacheKey =
        [
            "forecast",
            lat,
            lon,
            forecastDays
        ].join(
            ":"
        );

    const cached =
        marketCacheGet(
            MARKET_CACHE.weather,
            cacheKey,
            MARKET_CONFIG.weatherCacheTTL
        );

    if (cached) {
        MARKET_STATE
            .weatherCacheHits++;

        return cached;
    }

    MARKET_STATE
        .weatherRequests++;

    try {
        const url =
            buildWeatherForecastUrl4(
                latitude,
                longitude,
                {
                    ...options,

                    forecastDays
                }
            );

        const response =
            await marketFetchJSON(
                url,
                {
                    timeoutMs:
                        options.timeoutMs ||
                        MARKET_CONFIG.weatherTimeoutMs
                }
            );

        if (
            !response.ok ||
            !response.data
        ) {
            MARKET_STATE
                .weatherFailure++;

            return {
                success: false,

                error:
                    `weather_http_${response.status}`
            };
        }

        const current =
            buildCurrentWeather4(
                response.data.current
            );

        const hourly =
            buildHourlyWeather4(
                response.data.hourly
            );

        const daily =
            buildDailyWeather4(
                response.data.daily
            );

        const result = {
            success: true,

            source:
                "Open-Meteo",

            latitude:
                Number(
                    response.data.latitude
                ),

            longitude:
                Number(
                    response.data.longitude
                ),

            elevation:
                number(
                    response.data.elevation,
                    0
                ),

            timezone:
                safeString(
                    response.data.timezone
                ),

            timezoneAbbreviation:
                safeString(
                    response.data.timezone_abbreviation
                ),

            current,

            hourly,

            daily,

            units:
                {
                    temperature:
                        "°C",

                    windSpeed:
                        "km/h",

                    precipitation:
                        "mm"
                },

            fetchedAt:
                nowISO(),

            cache:
                false
        };

        MARKET_STATE
            .weatherSuccess++;

        marketCacheSet(
            MARKET_CACHE.weather,
            cacheKey,
            result
        );

        return result;

    } catch (error) {
        MARKET_STATE
            .weatherFailure++;

        return {
            success: false,

            error:
                safeString(
                    error.message,
                    "weather_failed"
                )
        };
    }
}


// ============================================================
// WEATHER BY CITY
// ============================================================

async function weatherByCity4(
    city,
    options = {}
) {
    const location =
        await weatherSearchCity4(
            city,
            {
                countryCode:
                    options.countryCode ||
                    "TR",

                timeoutMs:
                    options.timeoutMs
            }
        );

    if (
        !location.success ||
        !location.results.length
    ) {
        return {
            success: false,

            error:
                "city_not_found",

            city:
                normalizeWeatherCity4(
                    city
                ),

            locations: []
        };
    }

    const selected =
        location.results[0];

    const forecast =
        await weatherByCoordinates4(
            selected.latitude,
            selected.longitude,
            options
        );

    return {
        ...forecast,

        city:
            selected.name,

        location:
            clone(
                selected
            ),

        locations:
            clone(
                location.results
            )
    };
}


// ============================================================
// WEATHER QUERY PARSER
// ============================================================

const WEATHER_QUERY_WORDS_4 = [
    "hava",
    "hava durumu",
    "hava nasıl",
    "hava nasil",
    "kaç derece",
    "kac derece",
    "sıcaklık",
    "sicaklik",
    "yağmur",
    "yagmur",
    "kar yağacak",
    "kar yagacak",
    "rüzgar",
    "ruzgar",
    "rüzgâr",
    "nem",
    "bulut",
    "fırtına",
    "firtina",
    "güneş",
    "gunes",
    "UV",
    "tahmin",
    "forecast"
];


const WEATHER_TIME_WORDS_4 = [
    "şimdi",
    "simdi",
    "şu an",
    "su an",
    "bugün",
    "bugun",
    "yarın",
    "yarin",
    "hafta sonu",
    "haftaya",
    "bu hafta",
    "3 günlük",
    "5 günlük",
    "7 günlük",
    "saatlik",
    "saatlik hava"
];


function detectWeatherIntent4(
    query
) {
    const text =
        normalizeText(
            query
        );

    const weather =
        WEATHER_QUERY_WORDS_4.some(
            word =>
                text.includes(
                    normalizeText(
                        word
                    )
                )
        );

    const forecast =
        WEATHER_TIME_WORDS_4.some(
            word =>
                text.includes(
                    normalizeText(
                        word
                    )
                )
        );

    return {
        weather,

        forecast:
            weather &&
            forecast,

        shouldResearch:
            weather,

        text
    };
}


// ============================================================
// EXTRACT CITY
// ============================================================

function extractWeatherCity4(
    query
) {
    let text =
        safeString(
            query
        );

    text =
        text
            .replace(
                /hava durumu/gi,
                ""
            )
            .replace(
                /hava nasıl/gi,
                ""
            )
            .replace(
                /hava nasil/gi,
                ""
            )
            .replace(
                /kaç derece/gi,
                ""
            )
            .replace(
                /kac derece/gi,
                ""
            )
            .replace(
                /sıcaklık/gi,
                ""
            )
            .replace(
                /sicaklik/gi,
                ""
            )
            .replace(
                /bugün/gi,
                ""
            )
            .replace(
                /bugun/gi,
                ""
            )
            .replace(
                /yarın/gi,
                ""
            )
            .replace(
                /yarin/gi,
                ""
            )
            .replace(
                /şimdi/gi,
                ""
            )
            .replace(
                /simdi/gi,
                ""
            )
            .replace(
                /şu an/gi,
                ""
            )
            .replace(
                /su an/gi,
                ""
            )
            .replace(
                /yağmur/gi,
                ""
            )
            .replace(
                /yagmur/gi,
                ""
            )
            .replace(
                /kar yağacak/gi,
                ""
            )
            .replace(
                /kar yagacak/gi,
                ""
            )
            .replace(
                /rüzgar/gi,
                ""
            )
            .replace(
                /ruzgar/gi,
                ""
            )
            .replace(
                /rüzgâr/gi,
                ""
            )
            .replace(
                /nem/gi,
                ""
            )
            .replace(
                /tahmin/gi,
                ""
            )
            .replace(
                /nasıl/gi,
                ""
            )
            .replace(
                /nasil/gi,
                ""
            )
            .replace(
                /da\b/gi,
                ""
            )
            .replace(
                /de\b/gi,
                ""
            )
            .replace(
                /'da\b/gi,
                ""
            )
            .replace(
                /'de\b/gi,
                ""
            )
            .replace(
                /\?/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    return (
        normalizeWeatherCity4(
            text
        )
    );
}


// ============================================================
// WEATHER SUMMARY
// ============================================================

function weatherDirection4(
    degrees
) {
    const n =
        Number(
            degrees
        );

    if (
        !Number.isFinite(n)
    ) {
        return "";
    }

    const directions = [
        "K",
        "K-KD",
        "KD",
        "D-KD",
        "D",
        "D-GD",
        "GD",
        "G-GD",
        "G",
        "G-B",
        "GB",
        "B-GB",
        "B",
        "B-KB",
        "KB",
        "K-KB"
    ];

    const index =
        Math.round(
            (
                (
                    n %
                    360
                ) /
                22.5
            )
        ) % 16;

    return directions[
        index
    ];
}


function weatherCurrentText4(
    current
) {
    if (!current) {
        return "";
    }

    const sections =
        [];

    if (
        current.temperature !==
            null &&
        current.temperature !==
            undefined
    ) {
        sections.push(
            `sıcaklık ${Math.round(current.temperature)}°C`
        );
    }

    if (
        current.apparentTemperature !==
            null &&
        current.apparentTemperature !==
            undefined
    ) {
        sections.push(
            `hissedilen ${Math.round(current.apparentTemperature)}°C`
        );
    }

    if (
        current.description
    ) {
        sections.push(
            current.description
        );
    }

    if (
        current.humidity !==
            null &&
        current.humidity !==
            undefined
    ) {
        sections.push(
            `nem %${Math.round(current.humidity)}`
        );
    }

    if (
        current.windSpeed !==
            null &&
        current.windSpeed !==
            undefined
    ) {
        const direction =
            weatherDirection4(
                current.windDirection
            );

        sections.push(
            `rüzgâr ${Math.round(current.windSpeed)} km/sa${
                direction
                    ? ` ${direction}`
                    : ""
            }`
        );
    }

    return sections.join(
        ", "
    );
}


// ============================================================
// WEATHER ALERTS
// ============================================================

function buildWeatherAlerts4(
    forecast
) {
    const alerts =
        [];

    const current =
        forecast &&
        forecast.current;

    if (
        current
    ) {
        if (
            number(
                current.windSpeed,
                0
            ) >= 60
        ) {
            alerts.push({
                type:
                    "strong-wind",

                level:
                    "high",

                title:
                    "Kuvvetli rüzgâr",

                message:
                    "Rüzgâr hızı yüksek."
            });
        }

        if (
            normalizeText(
                current.description
            ).includes(
                "fırtına"
            )
        ) {
            alerts.push({
                type:
                    "storm",

                level:
                    "high",

                title:
                    "Fırtına",

                message:
                    "Fırtınalı hava koşulları mevcut."
            });
        }
    }

    const daily =
        forecast &&
        Array.isArray(
            forecast.daily
        )
            ? forecast.daily
            : [];

    for (
        let i = 0;
        i <
        Math.min(
            daily.length,
            7
        );
        i++
    ) {
        const day =
            daily[i];

        if (!day) {
            continue;
        }

        if (
            number(
                day.precipitationProbability,
                0
            ) >= 70
        ) {
            alerts.push({
                type:
                    "rain",

                level:
                    day.precipitationProbability >= 85
                        ? "high"
                        : "medium",

                date:
                    day.date,

                title:
                    "Yağış ihtimali",

                message:
                    `${day.date} için yağış ihtimali %${Math.round(day.precipitationProbability)}.`
            });
        }

        if (
            number(
                day.snowfall,
                0
            ) > 0
        ) {
            alerts.push({
                type:
                    "snow",

                level:
                    "medium",

                date:
                    day.date,

                title:
                    "Kar",

                message:
                    `${day.date} tarihinde kar yağışı öngörülüyor.`
            });
        }

        if (
            number(
                day.uvIndexMax,
                0
            ) >= 8
        ) {
            alerts.push({
                type:
                    "uv",

                level:
                    day.uvIndexMax >= 11
                        ? "high"
                        : "medium",

                date:
                    day.date,

                title:
                    "Yüksek UV",

                message:
                    `${day.date} için UV endeksi yüksek seviyede.`
            });
        }
    }

    return alerts;
}


// ============================================================
// WEATHER PACKAGE
// ============================================================

function buildWeatherPackage4(
    result,
    options = {}
) {
    if (
        !result ||
        !result.success
    ) {
        return result;
    }

    const current =
        result.current;

    const daily =
        Array.isArray(
            result.daily
        )
            ? result.daily
            : [];

    const alerts =
        buildWeatherAlerts4(
            result
        );

    return {
        success: true,

        source:
            result.source ||
            "Open-Meteo",

        city:
            result.city ||
            result.location &&
            result.location.name
                ? (
                    result.city ||
                    result.location.name
                )
                : "",

        location:
            clone(
                result.location ||
                null
            ),

        current:
            clone(
                current
            ),

        today:
            daily[0]
                ? clone(
                    daily[0]
                )
                : null,

        tomorrow:
            daily[1]
                ? clone(
                    daily[1]
                )
                : null,

        daily:
            clone(
                daily
            ),

        hourly:
            options.includeHourly === false
                ? []
                : clone(
                    result.hourly ||
                    []
                ),

        alerts:

            options.includeAlerts === false
                ? []
                : alerts,

        summary:
            weatherCurrentText4(
                current
            ),

        fetchedAt:
            result.fetchedAt ||
            nowISO(),

        cache:
            result.cache === true
    };
}


// ============================================================
// WEATHER API — MAIN
// ============================================================

app.get(
    "/api/weather",
    async (req, res) => {
        const city =
            safeString(
                req.query.city
            );

        const query =
            safeString(
                req.query.query ||
                req.query.q
            );

        const latitude =
            Number(
                req.query.latitude
            );

        const longitude =
            Number(
                req.query.longitude
            );

        try {
            let result;

            if (
                Number.isFinite(
                    latitude
                ) &&
                Number.isFinite(
                    longitude
                )
            ) {
                result =
                    await weatherByCoordinates4(
                        latitude,
                        longitude,
                        {
                            forecastDays:
                                req.query.forecastDays ||
                                7,

                            includeHourly:
                                true
                        }
                    );

            } else if (
                query
            ) {
                const weatherIntent =
                    detectWeatherIntent4(
                        query
                    );

                if (
                    !weatherIntent.weather
                ) {
                    return res.json({
                        success: true,

                        weather:
                            false,

                        message:
                            "Sorguda hava durumu isteği algılanmadı."
                    });
                }

                const extractedCity =
                    extractWeatherCity4(
                        query
                    );

                result =
                    await weatherByCity4(
                        extractedCity,
                        {
                            forecastDays:
                                req.query.forecastDays ||
                                7
                        }
                    );

            } else if (
                city
            ) {
                result =
                    await weatherByCity4(
                        city,
                        {
                            forecastDays:
                                req.query.forecastDays ||
                                7
                        }
                    );

            } else {
                return res.status(
                    400
                ).json({
                    success: false,

                    error:
                        "city_query_or_coordinates_required"
                });
            }

            if (
                !result ||
                !result.success
            ) {
                return res.status(
                    502
                ).json(
                    result || {
                        success: false,

                        error:
                            "weather_unavailable"
                    }
                );
            }

            return res.json(
                buildWeatherPackage4(
                    result,
                    {
                        includeHourly:
                            true,

                        includeAlerts:
                            true
                    }
                )
            );

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "weather_route_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// WEATHER CITY SEARCH
// ============================================================

app.get(
    "/api/weather/search",
    async (req, res) => {
        const city =
            safeString(
                req.query.city ||
                req.query.q
            );

        if (!city) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "city_required"
            });
        }

        try {
            return res.json(
                await weatherSearchCity4(
                    city,
                    {
                        count:
                            req.query.count ||
                            5,

                        countryCode:
                            req.query.countryCode ||
                            "TR"
                    }
                )
            );
        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "weather_search_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// WEATHER CITY ENDPOINT
// ============================================================

app.get(
    "/api/weather/city",
    async (req, res) => {
        const city =
            safeString(
                req.query.city
            );

        if (!city) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "city_required"
            });
        }

        try {
            const result =
                await weatherByCity4(
                    city,
                    {
                        forecastDays:
                            req.query.forecastDays ||
                            7
                    }
                );

            return res.json(
                buildWeatherPackage4(
                    result
                )
            );
        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "weather_city_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// WEATHER COORDINATES
// ============================================================

app.get(
    "/api/weather/coordinates",
    async (req, res) => {
        const latitude =
            Number(
                req.query.latitude
            );

        const longitude =
            Number(
                req.query.longitude
            );

        if (
            !validCoordinates4(
                latitude,
                longitude
            )
        ) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "invalid_coordinates"
            });
        }

        try {
            const result =
                await weatherByCoordinates4(
                    latitude,
                    longitude,
                    {
                        forecastDays:
                            req.query.forecastDays ||
                            7
                    }
                );

            return res.json(
                result
            );

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "coordinate_weather_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// WEATHER ALERTS
// ============================================================

app.get(
    "/api/weather/alerts",
    async (req, res) => {
        const city =
            safeString(
                req.query.city
            );

        if (!city) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "city_required"
            });
        }

        const result =
            await weatherByCity4(
                city,
                {
                    forecastDays:
                        7
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                502
            ).json(
                result
            );
        }

        return res.json({
            success: true,

            city:
                result.city,

            alerts:
                buildWeatherAlerts4(
                    result
                )
        });
    }
);


// ============================================================
// WEATHER HOURLY
// ============================================================

app.get(
    "/api/weather/hourly",
    async (req, res) => {
        const city =
            safeString(
                req.query.city
            );

        if (!city) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "city_required"
            });
        }

        const result =
            await weatherByCity4(
                city,
                {
                    forecastDays:
                        7
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                502
            ).json(
                result
            );
        }

        return res.json({
            success: true,

            city:
                result.city,

            hourly:
                result.hourly ||
                []
        });
    }
);


// ============================================================
// WEATHER DAILY
// ============================================================

app.get(
    "/api/weather/daily",
    async (req, res) => {
        const city =
            safeString(
                req.query.city
            );

        if (!city) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "city_required"
            });
        }

        const result =
            await weatherByCity4(
                city,
                {
                    forecastDays:
                        Number(
                            req.query.days ||
                            7
                        )
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                502
            ).json(
                result
            );
        }

        return res.json({
            success: true,

            city:
                result.city,

            daily:
                result.daily ||
                []
        });
    }
);


// ============================================================
// WEATHER STATUS
// ============================================================

app.get(
    "/api/weather/status",
    (req, res) => {
        return res.json({
            success: true,

            provider:
                "Open-Meteo",

            ready:
                typeof fetch ===
                "function",

            stats: {
                requests:
                    MARKET_STATE
                        .weatherRequests,

                success:
                    MARKET_STATE
                        .weatherSuccess,

                failure:
                    MARKET_STATE
                        .weatherFailure,

                searches:
                    MARKET_STATE
                        .weatherSearches,

                cacheHits:
                    MARKET_STATE
                        .weatherCacheHits
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// CURRENCY
// ============================================================

const TURKAI_CURRENCY_NAMES = {
    USD:
        [
            "dolar",
            "abd doları",
            "abd dolari",
            "american dollar",
            "usd"
        ],

    EUR:
        [
            "euro",
            "avro",
            "eur"
        ],

    GBP:
        [
            "sterlin",
            "ingiliz sterlini",
            "pound",
            "gbp"
        ],

    TRY:
        [
            "tl",
            "lira",
            "türk lirası",
            "turk lirasi",
            "try"
        ],

    CHF:
        [
            "frang",
            "isviçre frangı",
            "chf"
        ],

    JPY:
        [
            "yen",
            "japon yeni",
            "jpy"
        ],

    CAD:
        [
            "kanada doları",
            "kanada dolari",
            "cad"
        ],

    AUD:
        [
            "avustralya doları",
            "avustralya dolari",
            "aud"
        ],

    SAR:
        [
            "suudi riyali",
            "riyal",
            "sar"
        ],

    AED:
        [
            "dirhem",
            "bae dirhemi",
            "aed"
        ],

    CNY:
        [
            "yuan",
            "çin yuanı",
            "cin yuani",
            "cny"
        ],

    SEK:
        [
            "isveç kronu",
            "isvec kronu",
            "sek"
        ],

    NOK:
        [
            "norveç kronu",
            "norvec kronu",
            "nok"
        ],

    DKK:
        [
            "danimarka kronu",
            "dkk"
        ],

    PLN:
        [
            "zloti",
            "polonya zlotisi",
            "pln"
        ],

    RUB:
        [
            "ruble",
            "rus rublesi",
            "rub"
        ]
};


// ============================================================
// CURRENCY RESOLUTION
// ============================================================

function resolveCurrency4(
    input
) {
    const value =
        safeString(
            input
        );

    if (!value) {
        return null;
    }

    const upper =
        value.toUpperCase();

    if (
        Object.prototype
            .hasOwnProperty.call(
                TURKAI_CURRENCY_NAMES,
                upper
            )
    ) {
        return upper;
    }

    for (
        const [
            code,
            names
        ]
        of Object.entries(
            TURKAI_CURRENCY_NAMES
        )
    ) {
        if (
            names.some(
                name =>
                    normalizeText(
                        name
                    ) ===
                    normalizeText(
                        value
                    )
            )
        ) {
            return code;
        }
    }

    return null;
}


// ============================================================
// CURRENCY CACHE
// ============================================================

function currencyCacheKey4(
    base,
    symbols = []
) {
    return [
        safeString(
            base,
            "EUR"
        ).toUpperCase(),

        ...symbols
            .map(
                item =>
                    safeString(
                        item
                    ).toUpperCase()
            )
            .sort()
    ].join(
        ":"
    );
}


// ============================================================
// CURRENCY RATES
// ============================================================

async function currencyRates4(
    base = "EUR",
    symbols = []
) {
    const normalizedBase =
        resolveCurrency4(
            base
        ) ||
        safeString(
            base,
            "EUR"
        ).toUpperCase();

    const normalizedSymbols =
        Array.from(
            new Set(
                (
                    Array.isArray(
                        symbols
                    )
                        ? symbols
                        : []
                )
                    .map(
                        item =>
                            resolveCurrency4(
                                item
                            ) ||
                            safeString(
                                item
                            ).toUpperCase()
                    )
                    .filter(
                        Boolean
                    )
            )
        );

    const cacheKey =
        currencyCacheKey4(
            normalizedBase,
            normalizedSymbols
        );

    const cached =
        marketCacheGet(
            MARKET_CACHE.currency,
            cacheKey,
            MARKET_CONFIG.currencyCacheTTL
        );

    if (cached) {
        return {
            ...cached,

            cache:
                true
        };
    }

    MARKET_STATE
        .currencyRequests++;

    try {
        let url =
            `${MARKET_CONFIG.currencyApi}/latest/${encodeURIComponent(normalizedBase)}`;

        if (
            normalizedSymbols.length
        ) {
            url +=
                `?to=${encodeURIComponent(normalizedSymbols.join(","))}`;
        }

        const response =
            await marketFetchJSON(
                url,
                {
                    timeoutMs:
                        MARKET_CONFIG.currencyTimeoutMs
                }
            );

        if (
            !response.ok ||
            !response.data ||
            !response.data.rates
        ) {
            MARKET_STATE
                .currencyFailure++;

            return {
                success: false,

                error:
                    "currency_provider_failed"
            };
        }

        const rates = {
            [normalizedBase]:
                1,

            ...response.data.rates
        };

        const result = {
            success: true,

            provider:
                "Frankfurter",

            base:
                normalizedBase,

            rates,

            date:
                response.data.date ||
                null,

            fetchedAt:
                nowISO(),

            cache:
                false
        };

        MARKET_STATE
            .currencySuccess++;

        marketCacheSet(
            MARKET_CACHE.currency,
            cacheKey,
            result
        );

        return result;

    } catch (error) {
        MARKET_STATE
            .currencyFailure++;

        return {
            success: false,

            error:
                safeString(
                    error.message,
                    "currency_failed"
                )
        };
    }
}


// ============================================================
// CURRENCY RATE
// ============================================================

async function currencyRate4(
    from,
    to
) {
    const fromCode =
        resolveCurrency4(
            from
        );

    const toCode =
        resolveCurrency4(
            to
        );

    if (
        !fromCode ||
        !toCode
    ) {
        return {
            success: false,

            error:
                "unknown_currency"
        };
    }

    if (
        fromCode ===
        toCode
    ) {
        return {
            success: true,

            from:
                fromCode,

            to:
                toCode,

            rate:
                1
        };
    }

    const data =
        await currencyRates4(
            fromCode,
            [
                toCode
            ]
        );

    if (
        !data.success
    ) {
        return data;
    }

    const rate =
        number(
            data.rates &&
            data.rates[
                toCode
            ],
            null
        );

    if (
        rate === null
    ) {
        return {
            success: false,

            error:
                "rate_not_found"
        };
    }

    return {
        success: true,

        provider:
            data.provider,

        from:
            fromCode,

        to:
            toCode,

        rate,

        date:
            data.date,

        fetchedAt:
            data.fetchedAt,

        cache:
            data.cache === true
    };
}


// ============================================================
// CURRENCY CONVERTER
// ============================================================

async function currencyConvert4(
    amount,
    from,
    to
) {
    const numericAmount =
        Number(
            amount
        );

    if (
        !Number.isFinite(
            numericAmount
        )
    ) {
        return {
            success: false,

            error:
                "invalid_amount"
        };
    }

    const rate =
        await currencyRate4(
            from,
            to
        );

    if (
        !rate.success
    ) {
        return rate;
    }

    const converted =
        numericAmount *
        rate.rate;

    MARKET_STATE
        .currencyConversions++;

    return {
        success: true,

        from:
            rate.from,

        to:
            rate.to,

        amount:
            numericAmount,

        rate:
            rate.rate,

        result:
            Number(
                converted.toFixed(
                    6
                )
            ),

        date:
            rate.date,

        provider:
            rate.provider
    };
}


// ============================================================
// CURRENCY QUERY PARSER
// ============================================================

const CURRENCY_QUERY_WORDS_4 = [
    "kur",
    "döviz",
    "doviz",
    "dolar",
    "euro",
    "sterlin",
    "frang",
    "yen",
    "yuan",
    "riyal",
    "dirhem",
    "tl",
    "lira",
    "kaç tl",
    "kac tl",
    "kaç lira",
    "kac lira",
    "değeri",
    "degeri",
    "kaç para",
    "kac para"
];


function detectCurrencyIntent4(
    query
) {
    const text =
        normalizeText(
            query
        );

    const currency =
        CURRENCY_QUERY_WORDS_4.some(
            item =>
                text.includes(
                    normalizeText(
                        item
                    )
                )
        );

    return {
        currency,

        shouldResearch:
            currency,

        text
    };
}


// ============================================================
// CURRENCY CODE EXTRACTION
// ============================================================

function extractCurrencies4(
    query
) {
    const text =
        normalizeText(
            query
        );

    const found =
        [];

    for (
        const [
            code,
            names
        ]
        of Object.entries(
            TURKAI_CURRENCY_NAMES
        )
    ) {
        for (
            const name
            of names
        ) {
            if (
                text.includes(
                    normalizeText(
                        name
                    )
                )
            ) {
                if (
                    !found.includes(
                        code
                    )
                ) {
                    found.push(
                        code
                    );
                }

                break;
            }
        }
    }

    return found;
}


// ============================================================
// CURRENCY AMOUNT EXTRACTION
// ============================================================

function extractCurrencyAmount4(
    query
) {
    const match =
        safeString(
            query
        ).match(
            /(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/
        );

    if (!match) {
        return 1;
    }

    return Number(
        match[1].replace(
            ",",
            "."
        )
    );
}


// ============================================================
// CURRENCY RESPONSE
// ============================================================

async function currencySmart4(
    query
) {
    const intent =
        detectCurrencyIntent4(
            query
        );

    if (
        !intent.currency
    ) {
        return {
            success: false,

            skipped: true,

            reason:
                "currency_intent_not_detected"
        };
    }

    const currencies =
        extractCurrencies4(
            query
        );

    const amount =
        extractCurrencyAmount4(
            query
        );

    let from = "USD";
    let to = "TRY";

    if (
        currencies.length >= 2
    ) {
        from =
            currencies[0];

        to =
            currencies[1];

    } else if (
        currencies.length ===
        1
    ) {
        from =
            currencies[0];

        to =
            from === "TRY"
                ? "USD"
                : "TRY";
    }

    const conversion =
        await currencyConvert4(
            amount,
            from,
            to
        );

    if (
        !conversion.success
    ) {
        return conversion;
    }

    return {
        ...conversion,

        query,

        text:
            `${amount} ${from} yaklaşık ${conversion.result} ${to}.`
    };
}


// ============================================================
// CURRENCY API
// ============================================================

app.get(
    "/api/currency",
    async (req, res) => {
        const base =
            resolveCurrency4(
                req.query.base ||
                "EUR"
            ) ||
            "EUR";

        const raw =
            safeString(
                req.query.to ||
                req.query.symbols
            );

        const symbols =
            raw
                ? raw
                    .split(",")
                    .map(
                        item =>
                            resolveCurrency4(
                                item.trim()
                            ) ||
                            item.trim().toUpperCase()
                    )
                    .filter(Boolean)
                : [
                    "USD",
                    "TRY",
                    "GBP",
                    "EUR"
                ];

        const result =
            await currencyRates4(
                base,
                symbols
            );

        if (
            !result.success
        ) {
            return res.status(
                502
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// CURRENCY RATE API
// ============================================================

app.get(
    "/api/currency/rate",
    async (req, res) => {
        const from =
            req.query.from ||
            "USD";

        const to =
            req.query.to ||
            "TRY";

        const result =
            await currencyRate4(
                from,
                to
            );

        if (
            !result.success
        ) {
            return res.status(
                400
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// CURRENCY CONVERSION API
// ============================================================

app.post(
    "/api/currency/convert",
    async (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const amount =
            body.amount;

        const from =
            body.from ||
            "USD";

        const to =
            body.to ||
            "TRY";

        const result =
            await currencyConvert4(
                amount,
                from,
                to
            );

        return res.json(
            result
        );
    }
);


// GET VERSION OF CONVERTER
app.get(
    "/api/currency/convert",
    async (req, res) => {
        const amount =
            Number(
                req.query.amount ||
                1
            );

        const from =
            req.query.from ||
            "USD";

        const to =
            req.query.to ||
            "TRY";

        const result =
            await currencyConvert4(
                amount,
                from,
                to
            );

        return res.json(
            result
        );
    }
);


// ============================================================
// CURRENCY ALL
// ============================================================

app.get(
    "/api/currency/all",
    async (req, res) => {
        const result =
            await currencyRates4(
                "EUR",
                [
                    "USD",
                    "TRY",
                    "GBP",
                    "CHF",
                    "JPY",
                    "CAD",
                    "AUD",
                    "SAR",
                    "AED",
                    "CNY",
                    "SEK",
                    "NOK",
                    "DKK",
                    "PLN",
                    "RUB"
                ]
            );

        return res.json(
            result
        );
    }
);


// ============================================================
// CURRENCY STATUS
// ============================================================

app.get(
    "/api/currency/status",
    (req, res) => {
        return res.json({
            success: true,

            provider:
                "Frankfurter",

            ready:
                typeof fetch ===
                "function",

            state: {
                requests:
                    MARKET_STATE
                        .currencyRequests,

                success:
                    MARKET_STATE
                        .currencySuccess,

                failure:
                    MARKET_STATE
                        .currencyFailure,

                conversions:
                    MARKET_STATE
                        .currencyConversions
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// GOLD
// ============================================================

async function getGoldPrice4() {
    const cacheKey =
        "gold:XAU";

    const cached =
        marketCacheGet(
            MARKET_CACHE.gold,
            cacheKey,
            MARKET_CONFIG.goldCacheTTL
        );

    if (cached) {
        return {
            ...cached,

            cache:
                true
        };
    }

    MARKET_STATE
        .goldRequests++;

    try {
        const response =
            await marketFetchJSON(
                MARKET_CONFIG.goldApi,
                {
                    timeoutMs:
                        MARKET_CONFIG.goldTimeoutMs
                }
            );

        if (
            !response.ok ||
            !response.data
        ) {
            MARKET_STATE
                .goldFailure++;

            return {
                success: false,

                error:
                    "gold_provider_failed"
            };
        }

        const data =
            response.data;

        let ounceUsd =
            number(
                data.price,
                null
            );

        if (
            ounceUsd ===
            null
        ) {
            ounceUsd =
                number(
                    data.price_oz,
                    null
                );
        }

        if (
            ounceUsd ===
            null
        ) {
            ounceUsd =
                number(
                    data.gold_price,
                    null
                );
        }

        if (
            ounceUsd ===
            null
        ) {
            MARKET_STATE
                .goldFailure++;

            return {
                success: false,

                error:
                    "gold_price_missing"
            };
        }

        const result = {
            success: true,

            symbol:
                "XAU",

            ounceUsd,

            source:
                "Gold API",

            fetchedAt:
                nowISO(),

            raw:
                {
                    timestamp:
                        data.timestamp ||
                        null,

                    currency:
                        data.currency ||
                        "USD"
                }
        };

        MARKET_STATE
            .goldSuccess++;

        marketCacheSet(
            MARKET_CACHE.gold,
            cacheKey,
            result
        );

        return result;

    } catch (error) {
        MARKET_STATE
            .goldFailure++;

        return {
            success: false,

            error:
                safeString(
                    error.message,
                    "gold_failed"
                )
        };
    }
}


// ============================================================
// GOLD GRAM CALCULATION
// ============================================================

function goldGramFromOunceUsd4(
    ounceUsd
) {
    const value =
        Number(
            ounceUsd
        );

    if (
        !Number.isFinite(
            value
        )
    ) {
        return null;
    }

    // 1 troy ounce = yaklaşık 31.1034768 gram
    return (
        value /
        31.1034768
    );
}


async function getGoldMarket4() {
    const gold =
        await getGoldPrice4();

    if (
        !gold.success
    ) {
        return gold;
    }

    const usdTry =
        await currencyRate4(
            "USD",
            "TRY"
        );

    let gramUsd =
        goldGramFromOunceUsd4(
            gold.ounceUsd
        );

    let gramTry =
        null;

    if (
        usdTry.success
    ) {
        gramTry =
            gramUsd *
            usdTry.rate;
    }

    return {
        success: true,

        symbol:
            "XAU",

        ounceUsd:
            gold.ounceUsd,

        gramUsd:
            Number(
                gramUsd.toFixed(
                    4
                )
            ),

        usdTry:
            usdTry.success
                ? usdTry.rate
                : null,

        gramTry:
            gramTry !== null
                ? Number(
                    gramTry.toFixed(
                        2
                    )
                )
                : null,

        provider:
            gold.source,

        fetchedAt:
            nowISO()
    };
}


// ============================================================
// GOLD API
// ============================================================

app.get(
    "/api/gold",
    async (req, res) => {
        try {
            const result =
                await getGoldMarket4();

            if (
                !result.success
            ) {
                return res.status(
                    502
                ).json(
                    result
                );
            }

            return res.json(
                result
            );
        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "gold_route_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// MARKET SMART INTENT
// ============================================================

const MARKET_QUERY_WORDS_4 = [
    "hava",
    "hava durumu",
    "dolar",
    "euro",
    "sterlin",
    "kur",
    "döviz",
    "doviz",
    "altın",
    "altin",
    "ons",
    "gram altın",
    "gram altin",
    "piyasa"
];


function detectMarketIntent4(
    query
) {
    const text =
        normalizeText(
            query
        );

    const weather =
        WEATHER_QUERY_WORDS_4.some(
            term =>
                text.includes(
                    normalizeText(
                        term
                    )
                )
        );

    const currency =
        CURRENCY_QUERY_WORDS_4.some(
            term =>
                text.includes(
                    normalizeText(
                        term
                    )
                )
        );

    const gold =
        [
            "altın",
            "altin",
            "gram altın",
            "gram altin",
            "ons altın",
            "ons altin",
            "xau"
        ].some(
            term =>
                text.includes(
                    normalizeText(
                        term
                    )
                )
        );

    return {
        weather,
        currency,
        gold,

        market:
            weather ||
            currency ||
            gold
    };
}


// ============================================================
// MARKET SMART API
// ============================================================

app.post(
    "/api/market/analyze",
    async (req, res) => {
        const query =
            safeString(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        const intent =
            detectMarketIntent4(
                query
            );

        let result;

        if (
            intent.weather
        ) {
            const city =
                extractWeatherCity4(
                    query
                );

            result =
                await weatherByCity4(
                    city,
                    {
                        forecastDays:
                            7
                    }
                );

            if (
                result.success
            ) {
                result =
                    buildWeatherPackage4(
                        result
                    );
            }

        } else if (
            intent.gold
        ) {
            result =
                await getGoldMarket4();

        } else if (
            intent.currency
        ) {
            result =
                await currencySmart4(
                    query
                );

        } else {
            result = {
                success: false,

                skipped: true,

                reason:
                    "market_intent_not_detected"
            };
        }

        MARKET_STATE
            .marketRequests++;

        return res.json({
            success:
                Boolean(
                    result &&
                    result.success
                ),

            query,

            intent,

            result
        });
    }
);


// ============================================================
// MARKET GET
// ============================================================

app.get(
    "/api/market",
    async (req, res) => {
        const query =
            safeString(
                req.query.query ||
                req.query.q
            );

        if (!query) {
            return res.json({
                success: true,

                market:
                    false,

                message:
                    "Piyasa sorgusu verilmedi."
            });
        }

        const intent =
            detectMarketIntent4(
                query
            );

        let result =
            null;

        if (
            intent.weather
        ) {
            const city =
                extractWeatherCity4(
                    query
                );

            result =
                await weatherByCity4(
                    city
                );

            if (
                result.success
            ) {
                result =
                    buildWeatherPackage4(
                        result
                    );
            }

        } else if (
            intent.gold
        ) {
            result =
                await getGoldMarket4();

        } else if (
            intent.currency
        ) {
            result =
                await currencySmart4(
                    query
                );
        }

        return res.json({
            success:
                Boolean(
                    result &&
                    result.success
                ),

            query,

            intent,

            result
        });
    }
);


// ============================================================
// CHAT MARKET ENHANCER
// ============================================================

async function runMarketEnhancedChat4(
    message,
    options = {}
) {
    const query =
        sanitizeUserMessage(
            message
        );

    const intent =
        detectMarketIntent4(
            query
        );

    if (
        !intent.market
    ) {
        return null;
    }

    if (
        intent.weather
    ) {
        const city =
            extractWeatherCity4(
                query
            );

        if (!city) {
            return {
                success: false,

                market:
                    "weather",

                text:
                    "Hava durumunu öğrenmek için şehir adı gerekiyor."
            };
        }

        const weather =
            await weatherByCity4(
                city,
                {
                    forecastDays:
                        7
                }
            );

        if (
            !weather.success
        ) {
            return {
                success: false,

                market:
                    "weather",

                error:
                    weather.error
            };
        }

        const packageData =
            buildWeatherPackage4(
                weather
            );

        return {
            success: true,

            market:
                "weather",

            data:
                packageData,

            text:
                `${packageData.city || city} için hava durumu: ${
                    packageData.summary ||
                    "veri bulunamadı"
                }.`
        };
    }

    if (
        intent.gold
    ) {
        const gold =
            await getGoldMarket4();

        if (
            !gold.success
        ) {
            return gold;
        }

        return {
            success: true,

            market:
                "gold",

            data:
                gold,

            text:
                gold.gramTry !==
                    null
                    ? `Gram altın için hesaplanan teorik spot karşılığı yaklaşık ${gold.gramTry.toFixed(2)} TL.`
                    : `Ons altın yaklaşık ${gold.ounceUsd.toFixed(2)} USD.`
        };
    }

    if (
        intent.currency
    ) {
        const currency =
            await currencySmart4(
                query
            );

        return {
            ...currency,

            market:
                "currency"
        };
    }

    return null;
}


// ============================================================
// AUTO MARKET CHAT
// ============================================================

app.post(
    "/api/chat/market",
    async (req, res) => {
        const message =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.message ||
                    req.body.query
                )
            );

        if (!message) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "message_required"
            });
        }

        try {
            const result =
                await runMarketEnhancedChat4(
                    message
                );

            if (!result) {
                return res.json({
                    success: true,

                    market:
                        false,

                    response:
                        ""
                });
            }

            return res.json({
                success:
                    Boolean(
                        result.success
                    ),

                response:
                    result.text ||
                    "",

                metadata:
                    result
            });

        } catch (error) {
            return res.status(
                500
            ).json({
                success: false,

                error:
                    "market_chat_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// 5000+ RUNTIME MARKET QUERY RULES
// ============================================================
//
// Bu tablo kaynak kodunu gereksiz yere binlerce satır
// tekrar etmek yerine çalışma anında 5000+ farklı sorgu
// kombinasyonu üretir.
//
// weather phrases
// currency phrases
// gold phrases
// market phrases
// location variants
// time variants
// request variants
// ============================================================

const MARKET_RULE_ACTIONS_4 = [
    "nedir",
    "ne kadar",
    "kaç",
    "kaç tl",
    "kaç lira",
    "güncel",
    "bugün",
    "şimdi",
    "şu an",
    "son durum",
    "değeri",
    "fiyatı",
    "oranı",
    "durumu",
    "tahmini",
    "hesapla",
    "çevir",
    "dönüştür",
    "göster",
    "söyle",
    "bak",
    "öğren",
    "kontrol et",
    "araştır"
];


const MARKET_RULE_ASSETS_4 = [
    "dolar",
    "euro",
    "sterlin",
    "frang",
    "yen",
    "yuan",
    "riyal",
    "dirhem",
    "tl",
    "lira",
    "döviz",
    "kur",
    "altın",
    "gram altın",
    "ons altın",
    "xau",
    "hava",
    "hava durumu",
    "sıcaklık",
    "yağmur",
    "kar",
    "rüzgar",
    "rüzgâr",
    "nem",
    "UV",
    "fırtına"
];


const MARKET_RULE_LOCATIONS_4 = [
    "İstanbul",
    "Ankara",
    "İzmir",
    "Bursa",
    "Antalya",
    "Konya",
    "Adana",
    "Gaziantep",
    "Kayseri",
    "Samsun",
    "Trabzon",
    "Erzurum",
    "Malatya",
    "Van",
    "Mersin",
    "Eskişehir",
    "Diyarbakır",
    "Denizli",
    "Sakarya",
    "Kocaeli",
    "Muğla",
    "Aydın",
    "Balıkesir",
    "Manisa",
    "Hatay",
    "Rize",
    "Ordu",
    "Giresun",
    "Sivas",
    "Tokat",
    "Çorum",
    "Amasya",
    "Yozgat",
    "Bolu",
    "Düzce",
    "Edirne",
    "Tekirdağ",
    "Çanakkale",
    "Kütahya",
    "Uşak",
    "Isparta",
    "Burdur",
    "Elazığ",
    "Bingöl",
    "Muş",
    "Bitlis",
    "Hakkari",
    "Mardin",
    "Siirt",
    "Ağrı",
    "Kars",
    "Iğdır",
    "Ardahan",
    "Artvin"
];


const MARKET_RULE_CONNECTORS_4 = [
    "",
    "için",
    "hakkında",
    "ile ilgili",
    "konusunda",
    "bugünkü",
    "güncel",
    "şimdiki",
    "anlık",
    "son"
];


const MARKET_RUNTIME_RULES_4 = [];


function pushMarketRule4(
    value,
    metadata
) {
    if (
        MARKET_RUNTIME_RULES_4.length >=
        6000
    ) {
        return;
    }

    MARKET_RUNTIME_RULES_4.push({
        id:
            MARKET_RUNTIME_RULES_4.length +
            1,

        phrase:
            value,

        ...metadata
    });
}


// Action + asset
for (
    const action
    of MARKET_RULE_ACTIONS_4
) {
    for (
        const asset
        of MARKET_RULE_ASSETS_4
    ) {
        pushMarketRule4(
            `${asset} ${action}`,
            {
                action,
                asset,
                type:
                    asset.includes("hava") ||
                    asset === "sıcaklık" ||
                    asset === "yağmur" ||
                    asset === "kar" ||
                    asset === "rüzgar" ||
                    asset === "rüzgâr" ||
                    asset === "nem" ||
                    asset === "UV" ||
                    asset === "fırtına"
                        ? "weather"
                        : asset.includes("altın") ||
                            asset === "xau"
                            ? "gold"
                            : "currency"
            }
        );

        if (
            MARKET_RUNTIME_RULES_4.length >=
            6000
        ) {
            break;
        }
    }

    if (
        MARKET_RUNTIME_RULES_4.length >=
        6000
    ) {
        break;
    }
}


// Asset + connector + location
for (
    const asset
    of MARKET_RULE_ASSETS_4
) {
    for (
        const connector
        of MARKET_RULE_CONNECTORS_4
    ) {
        for (
            const location
            of MARKET_RULE_LOCATIONS_4
        ) {
            if (
                MARKET_RUNTIME_RULES_4.length >=
                6000
            ) {
                break;
            }

            const phrase =
                connector
                    ? `${asset} ${connector} ${location}`
                    : `${asset} ${location}`;

            pushMarketRule4(
                phrase,
                {
                    asset,

                    connector,

                    location,

                    type:
                        asset.includes("hava") ||
                        asset === "sıcaklık" ||
                        asset === "yağmur" ||
                        asset === "kar" ||
                        asset === "rüzgar" ||
                        asset === "rüzgâr" ||
                        asset === "nem" ||
                        asset === "UV" ||
                        asset === "fırtına"
                            ? "weather"
                            : asset.includes("altın") ||
                                asset === "xau"
                                ? "gold"
                                : "currency"
                }
            );
        }

        if (
            MARKET_RUNTIME_RULES_4.length >=
            6000
        ) {
            break;
        }
    }

    if (
        MARKET_RUNTIME_RULES_4.length >=
        6000
    ) {
        break;
    }
}


// Action + connector + asset + location
for (
    const action
    of MARKET_RULE_ACTIONS_4
) {
    for (
        const connector
        of MARKET_RULE_CONNECTORS_4
    ) {
        for (
            const asset
            of MARKET_RULE_ASSETS_4
        ) {
            if (
                MARKET_RUNTIME_RULES_4.length >=
                6000
            ) {
                break;
            }

            pushMarketRule4(
                `${action} ${connector} ${asset}`.replace(
                    /\s+/g,
                    " "
                ).trim(),
                {
                    action,
                    connector,
                    asset
                }
            );
        }

        if (
            MARKET_RUNTIME_RULES_4.length >=
            6000
        ) {
            break;
        }
    }

    if (
        MARKET_RUNTIME_RULES_4.length >=
        6000
    ) {
        break;
    }
}


// ============================================================
// RUNTIME RULE MATCHER
// ============================================================

function matchMarketRules4(
    query
) {
    const text =
        normalizeText(
            query
        );

    const matches =
        [];

    for (
        const rule
        of MARKET_RUNTIME_RULES_4
    ) {
        const phrase =
            normalizeText(
                rule.phrase
            );

        if (
            phrase &&
            text.includes(
                phrase
            )
        ) {
            matches.push(
                clone(
                    rule
                )
            );

            if (
                matches.length >=
                25
            ) {
                break;
            }
        }
    }

    return matches;
}


// ============================================================
// RULE API
// ============================================================

app.post(
    "/api/market/rules",
    (req, res) => {
        const query =
            sanitizeUserMessage(
                req.body &&
                (
                    req.body.query ||
                    req.body.message
                )
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success: false,

                error:
                    "query_required"
            });
        }

        return res.json({
            success: true,

            totalRules:
                MARKET_RUNTIME_RULES_4.length,

            matches:
                matchMarketRules4(
                    query
                )
        });
    }
);


// ============================================================
// MARKET SUMMARY
// ============================================================

function getMarketSummary4() {
    return {
        version:
            SERVER_VERSION,

        weather: {
            provider:
                "Open-Meteo",

            requests:
                MARKET_STATE
                    .weatherRequests,

            success:
                MARKET_STATE
                    .weatherSuccess,

            failure:
                MARKET_STATE
                    .weatherFailure,

            searches:
                MARKET_STATE
                    .weatherSearches,

            cacheHits:
                MARKET_STATE
                    .weatherCacheHits
        },

        currency: {
            provider:
                "Frankfurter",

            requests:
                MARKET_STATE
                    .currencyRequests,

            success:
                MARKET_STATE
                    .currencySuccess,

            failure:
                MARKET_STATE
                    .currencyFailure,

            conversions:
                MARKET_STATE
                    .currencyConversions
        },

        gold: {
            provider:
                "Gold API",

            requests:
                MARKET_STATE
                    .goldRequests,

            success:
                MARKET_STATE
                    .goldSuccess,

            failure:
                MARKET_STATE
                    .goldFailure
        },

        runtimeRules:
            MARKET_RUNTIME_RULES_4.length,

        timestamp:
            nowISO()
    };
}


// ============================================================
// MARKET SUMMARY API
// ============================================================

app.get(
    "/api/market/summary",
    (req, res) => {
        return res.json({
            success: true,

            summary:
                getMarketSummary4()
        });
    }
);


// ============================================================
// MARKET RESET
// ============================================================

app.post(
    "/api/market/reset",
    (req, res) => {
        MARKET_CACHE.weather.clear();
        MARKET_CACHE.currency.clear();
        MARKET_CACHE.gold.clear();

        MARKET_STATE
            .weatherRequests = 0;

        MARKET_STATE
            .weatherSuccess = 0;

        MARKET_STATE
            .weatherFailure = 0;

        MARKET_STATE
            .weatherCacheHits = 0;

        MARKET_STATE
            .weatherSearches = 0;

        MARKET_STATE
            .currencyRequests = 0;

        MARKET_STATE
            .currencySuccess = 0;

        MARKET_STATE
            .currencyFailure = 0;

        MARKET_STATE
            .currencyConversions = 0;

        MARKET_STATE
            .goldRequests = 0;

        MARKET_STATE
            .goldSuccess = 0;

        MARKET_STATE
            .goldFailure = 0;

        MARKET_STATE
            .marketRequests = 0;

        return res.json({
            success: true,

            reset:
                true,

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// SOCKET.IO MARKET
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:market",
                async payload => {
                    const data =
                        payload &&
                        typeof payload ===
                            "object"
                            ? payload
                            : {};

                    const query =
                        sanitizeUserMessage(
                            data.query ||
                            data.message
                        );

                    if (!query) {
                        socket.emit(
                            "turkai:market:error",
                            {
                                success:
                                    false,

                                error:
                                    "query_required"
                            }
                        );

                        return;
                    }

                    try {
                        socket.emit(
                            "turkai:market:start",
                            {
                                success:
                                    true,

                                query
                            }
                        );

                        const result =
                            await runMarketEnhancedChat4(
                                query
                            );

                        socket.emit(
                            "turkai:market:result",
                            result
                        );

                        socket.emit(
                            "turkai:market:end",
                            {
                                success:
                                    Boolean(
                                        result &&
                                        result.success
                                    ),

                                query
                            }
                        );

                    } catch (error) {
                        socket.emit(
                            "turkai:market:error",
                            {
                                success:
                                    false,

                                error:
                                    error.message
                            }
                        );
                    }
                }
            );
        }
    );
}


// ============================================================
// SERVER STATE
// ============================================================

serverState.market = {
    state:
        MARKET_STATE,

    config:
        MARKET_CONFIG,

    cache:
        MARKET_CACHE,

    cities:
        TURKAI_CITY_ALIASES,

    weatherCodes:
        TURKAI_WEATHER_CODES,

    currencies:
        TURKAI_CURRENCY_NAMES,

    runtimeRules:
        MARKET_RUNTIME_RULES_4,

    weather: {
        searchCity:
            weatherSearchCity4,

        byCity:
            weatherByCity4,

        byCoordinates:
            weatherByCoordinates4,

        buildForecastUrl:
            buildWeatherForecastUrl4,

        buildPackage:
            buildWeatherPackage4,

        alerts:
            buildWeatherAlerts4,

        detectIntent:
            detectWeatherIntent4,

        extractCity:
            extractWeatherCity4
    },

    currency: {
        rates:
            currencyRates4,

        rate:
            currencyRate4,

        convert:
            currencyConvert4,

        detectIntent:
            detectCurrencyIntent4,

        extractCurrencies:
            extractCurrencies4
    },

    gold: {
        get:
            getGoldPrice4,

        market:
            getGoldMarket4
    },

    market: {
        detectIntent:
            detectMarketIntent4,

        analyze:
            runMarketEnhancedChat4,

        rules:
            matchMarketRules4
    },

    summary:
        getMarketSummary4
};


// ============================================================
// PART 4 READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 4 Weather/Market Engine yüklendi."
);

console.log(
    "[TürkAI] Weather provider : Open-Meteo"
);

console.log(
    "[TürkAI] Currency provider: Frankfurter"
);

console.log(
    "[TürkAI] Gold provider    : Gold API"
);

console.log(
    "[TürkAI] Market rules     :",
    MARKET_RUNTIME_RULES_4.length
);

console.log(
    "[TürkAI] /api/weather"
);

console.log(
    "[TürkAI] /api/currency"
);

console.log(
    "[TürkAI] /api/gold"
);

console.log(
    "[TürkAI] /api/market"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 4 END
// ============================================================
//
// SONRAKİ PART 5:
//
// - Plan sistemi
// - Free / Pro / Plus / Ultra / Developer
// - günlük limitler
// - mesaj sayacı
// - araştırma limiti
// - görsel/video limitleri
// - kullanıcı sistemi
// - Pro kodu
// - kullanım takibi
// - admin plan API
//
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 5 / 10
// USER + PLAN + LIMIT + PRO MANAGEMENT
// ============================================================
//
// PLANLAR
// FREE
// PRO
// PLUS
// ULTRA
// DEVELOPER
//
// KULLANICI
// - kullanıcı oluşturma
// - kullanıcı bulma
// - kullanıcı güncelleme
// - plan değiştirme
// - Pro kodu
// - günlük kullanım
// - limit kontrolü
// - feature kontrolü
// - kullanım sıfırlama
//
// API
// - /api/plans
// - /api/plans/:planId
// - /api/plans/user/:userId
// - /api/user
// - /api/user/:userId
// - /api/user/:userId/plan
// - /api/user/:userId/usage
// - /api/user/:userId/check-limit
// - /api/user/:userId/consume
// - /api/pro/activate
// - /api/plans/stats
// - /api/plans/health
// - /api/plans/reset-usage
// ============================================================


// ============================================================
// PLAN ENGINE STATE
// ============================================================

const PLAN_STATE = {
    startedAt:
        nowISO(),

    usersCreated:
        0,

    usersUpdated:
        0,

    planChanges:
        0,

    proActivations:
        0,

    failedProActivations:
        0,

    usageChecks:
        0,

    usageConsumes:
        0,

    limitDenied:
        0,

    usageResets:
        0
};


// ============================================================
// PLAN CONFIG
// ============================================================

const PLAN_CONFIG = {
    defaultPlan:
        "free",

    proCode:
        safeString(
            process.env.TURKAI_PRO_CODE
        ),

    enableUltra:
        process.env.TURKAI_ULTRA_ENABLED ===
            "true",

    allowDeveloper:
        process.env.TURKAI_DEVELOPER_PLAN !==
            "false",

    usageTimezone:
        "Europe/Istanbul",

    maximumUsers:
        1000000,

    maximumPlanDays:
        3650
};


// ============================================================
// PLAN DEFINITIONS
// ============================================================

const TURKAI_PLANS = {
    free: {
        id:
            "free",

        name:
            "Free",

        displayName:
            "TürkAI Free",

        price:
            0,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        internal:
            false,

        limits: {
            messages:
                50,

            research:
                5,

            images:
                0,

            videos:
                0,

            uploads:
                10,

            tasks:
                20
        },

        maxUploadMB:
            10,

        maxTokens:
            2048,

        models: [
            "turkai-local"
        ],

        features: {
            chat:
                true,

            memory:
                true,

            research:
                true,

            weather:
                true,

            currency:
                true,

            coding:
                true,

            upload:
                true,

            image:
                false,

            video:
                false,

            tasks:
                true,

            streaming:
                true,

            advancedModels:
                false,

            videoCall:
                false
        }
    },

    pro: {
        id:
            "pro",

        name:
            "Pro",

        displayName:
            "TürkAI Pro",

        price:
            250,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        internal:
            false,

        limits: {
            messages:
                100,

            research:
                25,

            images:
                2,

            videos:
                0,

            uploads:
                25,

            tasks:
                50
        },

        maxUploadMB:
            25,

        maxTokens:
            4096,

        models: [
            "turkai-local",
            "openai/gpt-oss-20b",
            "gemini-2.5-flash"
        ],

        features: {
            chat:
                true,

            memory:
                true,

            research:
                true,

            weather:
                true,

            currency:
                true,

            coding:
                true,

            upload:
                true,

            image:
                true,

            video:
                false,

            tasks:
                true,

            streaming:
                true,

            advancedModels:
                true,

            videoCall:
                false
        }
    },

    plus: {
        id:
            "plus",

        name:
            "Plus",

        displayName:
            "TürkAI Plus",

        price:
            500,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            true,

        comingSoon:
            false,

        internal:
            false,

        limits: {
            messages:
                200,

            research:
                75,

            images:
                4,

            videos:
                5,

            uploads:
                50,

            tasks:
                100
        },

        maxUploadMB:
            50,

        maxTokens:
            8192,

        models: [
            "turkai-local",
            "openai/gpt-oss-20b",
            "gpt-oss-120b",
            "gemini-2.5-flash"
        ],

        features: {
            chat:
                true,

            memory:
                true,

            research:
                true,

            weather:
                true,

            currency:
                true,

            coding:
                true,

            upload:
                true,

            image:
                true,

            video:
                true,

            tasks:
                true,

            streaming:
                true,

            advancedModels:
                true,

            videoCall:
                false
        }
    },

    ultra: {
        id:
            "ultra",

        name:
            "Ultra",

        displayName:
            "TürkAI Ultra",

        price:
            1000,

        currency:
            "TRY",

        billing:
            "monthly",

        active:
            PLAN_CONFIG.enableUltra,

        comingSoon:
            !PLAN_CONFIG.enableUltra,

        internal:
            false,

        limits: {
            messages:
                1000,

            research:
                250,

            images:
                10,

            videos:
                20,

            uploads:
                100,

            tasks:
                500
        },

        maxUploadMB:
            100,

        maxTokens:
            16384,

        models: [
            "turkai-local",
            "openai/gpt-oss-20b",
            "gpt-oss-120b",
            "gemini-2.5-flash"
        ],

        features: {
            chat:
                true,

            memory:
                true,

            research:
                true,

            weather:
                true,

            currency:
                true,

            coding:
                true,

            upload:
                true,

            image:
                true,

            video:
                true,

            tasks:
                true,

            streaming:
                true,

            advancedModels:
                true,

            videoCall:
                true
        }
    },

    developer: {
        id:
            "developer",

        name:
            "Developer",

        displayName:
            "TürkAI Developer",

        price:
            0,

        currency:
            "TRY",

        billing:
            "internal",

        active:
            PLAN_CONFIG.allowDeveloper,

        comingSoon:
            false,

        internal:
            true,

        limits: {
            messages:
                400,

            research:
                1000,

            images:
                50,

            videos:
                50,

            uploads:
                250,

            tasks:
                1000
        },

        maxUploadMB:
            250,

        maxTokens:
            16384,

        models: [
            "turkai-local",
            "openai/gpt-oss-20b",
            "gpt-oss-120b",
            "gemini-2.5-flash"
        ],

        features: {
            chat:
                true,

            memory:
                true,

            research:
                true,

            weather:
                true,

            currency:
                true,

            coding:
                true,

            upload:
                true,

            image:
                true,

            video:
                true,

            tasks:
                true,

            streaming:
                true,

            advancedModels:
                true,

            videoCall:
                true,

            admin:
                true
        }
    }
};


// ============================================================
// PLAN ALIAS TABLE
// ============================================================

const PLAN_ALIASES = {
    ucretsiz:
        "free",

    ücretsiz:
        "free",

    bedava:
        "free",

    free:
        "free",

    pro:
        "pro",

    professionel:
        "pro",

    profesyonel:
        "pro",

    plus:
        "plus",

    premium:
        "plus",

    ultra:
        "ultra",

    developer:
        "developer",

    geliştirici:
        "developer",

    gelistirici:
        "developer"
};


// ============================================================
// USER HELPERS
// ============================================================

function normalizePlanId5(
    planId
) {
    const value =
        normalizeText(
            planId
        );

    return (
        PLAN_ALIASES[
            value
        ] ||
        (
            TURKAI_PLANS[value]
                ? value
                : "free"
        )
    );
}


function getPlan5(
    planId
) {
    const id =
        normalizePlanId5(
            planId
        );

    const plan =
        TURKAI_PLANS[
            id
        ];

    return plan
        ? clone(plan)
        : null;
}


function getPlanReference5(
    planId
) {
    const id =
        normalizePlanId5(
            planId
        );

    return (
        TURKAI_PLANS[
            id
        ] ||
        TURKAI_PLANS.free
    );
}


// ============================================================
// DATE HELPERS
// ============================================================

function planDate5(
    value
) {
    const date =
        value
            ? new Date(value)
            : new Date();

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return new Date()
            .toISOString();
    }

    return date.toISOString();
}


function daysFromNow5(
    days
) {
    const date =
        new Date();

    date.setDate(
        date.getDate() +
        Number(days || 0)
    );

    return date.toISOString();
}


// ============================================================
// USER ID
// ============================================================

function normalizePlanUserId5(
    userId
) {
    const value =
        safeString(
            userId
        );

    if (!value) {
        return (
            "user_" +
            crypto
                .randomBytes(8)
                .toString("hex")
        );
    }

    return value.slice(
        0,
        200
    );
}


// ============================================================
// USER RECORD
// ============================================================

function defaultUserRecord5(
    userId,
    extra = {}
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    const now =
        nowISO();

    return {
        userId:
            id,

        name:
            safeString(
                extra.name
            ),

        email:
            safeString(
                extra.email
            ),

        provider:
            safeString(
                extra.provider ||
                "local"
            ),

        planId:
            normalizePlanId5(
                extra.planId ||
                PLAN_CONFIG.defaultPlan
            ),

        planStartedAt:
            now,

        planExpiresAt:
            null,

        createdAt:
            now,

        updatedAt:
            now,

        lastSeenAt:
            now,

        status:
            "active",

        metadata:
            clone(
                extra.metadata ||
                {}
            )
    };
}


// ============================================================
// USAGE RECORD
// ============================================================

function defaultUsageRecord5(
    userId
) {
    return {
        userId:
            normalizePlanUserId5(
                userId
            ),

        date:
            todayKey(),

        messages:
            0,

        research:
            0,

        images:
            0,

        videos:
            0,

        uploads:
            0,

        tasks:
            0,

        tokens:
            0,

        total:
            0,

        updatedAt:
            nowISO()
    };
}


// ============================================================
// PLAN EXPIRATION
// ============================================================

function userPlanExpired5(
    user
) {
    if (!user) {
        return true;
    }

    if (!user.planExpiresAt) {
        return false;
    }

    const expiry =
        new Date(
            user.planExpiresAt
        ).getTime();

    if (
        Number.isNaN(
            expiry
        )
    ) {
        return false;
    }

    return (
        Date.now() >
        expiry
    );
}


// ============================================================
// PLAN ACTIVE
// ============================================================

function isPlanActive5(
    user
) {
    if (!user) {
        return false;
    }

    if (
        user.status ===
        "disabled"
    ) {
        return false;
    }

    if (
        userPlanExpired5(
            user
        )
    ) {
        return false;
    }

    const plan =
        getPlanReference5(
            user.planId
        );

    if (!plan) {
        return false;
    }

    if (
        plan.id ===
        "ultra" &&
        plan.comingSoon
    ) {
        return false;
    }

    return (
        plan.active !==
        false
    );
}


// ============================================================
// USER LOAD / SAVE
// ============================================================

function loadPlanUsers5() {
    if (
        users &&
        typeof users ===
            "object" &&
        !Array.isArray(users)
    ) {
        return users;
    }

    users = readJSON(
        USERS_FILE,
        {}
    );

    if (
        !users ||
        typeof users !==
            "object" ||
        Array.isArray(users)
    ) {
        users = {};
    }

    return users;
}


function loadPlanUsage5() {
    if (
        usage &&
        typeof usage ===
            "object" &&
        !Array.isArray(usage)
    ) {
        return usage;
    }

    usage = readJSON(
        USAGE_FILE,
        {}
    );

    if (
        !usage ||
        typeof usage !==
            "object" ||
        Array.isArray(usage)
    ) {
        usage = {};
    }

    return usage;
}


function savePlanUsers5() {
    return writeJSON(
        USERS_FILE,
        users
    );
}


function savePlanUsage5() {
    return writeJSON(
        USAGE_FILE,
        usage
    );
}


// ============================================================
// ENSURE USER
// ============================================================

function ensurePlanUser5(
    userId,
    extra = {}
) {
    loadPlanUsers5();

    const id =
        normalizePlanUserId5(
            userId
        );

    if (
        !users[id]
    ) {
        users[id] =
            defaultUserRecord5(
                id,
                extra
            );

        PLAN_STATE
            .usersCreated++;

        savePlanUsers5();

        appendLog(
            SYSTEM_LOG_FILE,
            "user_created",
            {
                userId:
                    id,

                planId:
                    users[id]
                        .planId
            }
        );
    } else {
        users[id]
            .lastSeenAt =
            nowISO();

        users[id]
            .updatedAt =
            nowISO();

        if (
            extra.name
        ) {
            users[id]
                .name =
                safeString(
                    extra.name
                );
        }

        if (
            extra.email
        ) {
            users[id]
                .email =
                safeString(
                    extra.email
                );
        }

        if (
            extra.provider
        ) {
            users[id]
                .provider =
                safeString(
                    extra.provider
                );
        }

        savePlanUsers5();
    }

    ensurePlanUsage5(
        id
    );

    return clone(
        users[id]
    );
}


// ============================================================
// ENSURE USAGE
// ============================================================

function ensurePlanUsage5(
    userId
) {
    loadPlanUsage5();

    const id =
        normalizePlanUserId5(
            userId
        );

    const today =
        todayKey();

    if (
        !usage[id]
    ) {
        usage[id] =
            defaultUsageRecord5(
                id
            );

        savePlanUsage5();

        return usage[id];
    }

    if (
        usage[id].date !==
        today
    ) {
        usage[id] =
            defaultUsageRecord5(
                id
            );

        savePlanUsage5();
    }

    return usage[id];
}


// ============================================================
// GET USER
// ============================================================

function getPlanUser5(
    userId
) {
    loadPlanUsers5();

    const id =
        normalizePlanUserId5(
            userId
        );

    if (
        !users[id]
    ) {
        return null;
    }

    return clone(
        users[id]
    );
}


// ============================================================
// GET USER + PLAN
// ============================================================

function getUserPlanData5(
    userId
) {
    const user =
        ensurePlanUser5(
            userId
        );

    const plan =
        getPlan5(
            user.planId
        );

    const usageRecord =
        ensurePlanUsage5(
            user.userId
        );

    return {
        user,

        plan,

        usage:
            clone(
                usageRecord
            ),

        active:
            isPlanActive5(
                user
            )
    };
}


// ============================================================
// SET PLAN
// ============================================================

function setPlanUser5(
    userId,
    planId,
    options = {}
) {
    loadPlanUsers5();

    const id =
        normalizePlanUserId5(
            userId
        );

    const normalizedPlan =
        normalizePlanId5(
            planId
        );

    const plan =
        getPlanReference5(
            normalizedPlan
        );

    if (!plan) {
        return {
            success: false,

            error:
                "plan_not_found"
        };
    }

    if (
        plan.comingSoon &&
        options.allowComingSoon !==
            true
    ) {
        return {
            success: false,

            error:
                "plan_coming_soon"
        };
    }

    if (
        plan.internal &&
        options.allowInternal !==
            true
    ) {
        return {
            success: false,

            error:
                "internal_plan"
        };
    }

    const user =
        ensurePlanUser5(
            id
        );

    const previous =
        user.planId;

    user.planId =
        normalizedPlan;

    user.planStartedAt =
        nowISO();

    user.updatedAt =
        nowISO();

    user.lastSeenAt =
        nowISO();

    if (
        options.durationDays
    ) {
        user.planExpiresAt =
            daysFromNow5(
                Math.min(
                    Number(
                        options.durationDays
                    ),
                    PLAN_CONFIG
                        .maximumPlanDays
                )
            );
    } else {
        user.planExpiresAt =
            null;
    }

    users[id] =
        user;

    savePlanUsers5();

    PLAN_STATE
        .planChanges++;

    appendLog(
        SYSTEM_LOG_FILE,
        "plan_changed",
        {
            userId:
                id,

            previousPlan:
                previous,

            newPlan:
                normalizedPlan
        }
    );

    return {
        success: true,

        user:
            clone(
                user
            ),

        previousPlan:
            previous,

        plan:
            clone(
                plan
            )
    };
}


// ============================================================
// SET FREE
// ============================================================

function setFreePlan5(
    userId
) {
    return setPlanUser5(
        userId,
        "free"
    );
}


// ============================================================
// FEATURE CHECK
// ============================================================

function hasPlanFeature5(
    userId,
    feature
) {
    PLAN_STATE
        .usageChecks++;

    const data =
        getUserPlanData5(
            userId
        );

    if (
        !data.active
    ) {
        return false;
    }

    const key =
        safeString(
            feature
        );

    return (
        data.plan &&
        data.plan.features &&
        data.plan.features[key] ===
            true
    );
}


// ============================================================
// LIMIT GETTER
// ============================================================

function getPlanLimit5(
    userId,
    feature
) {
    const data =
        getUserPlanData5(
            userId
        );

    const key =
        safeString(
            feature
        );

    if (
        !data.plan ||
        !data.plan.limits
    ) {
        return 0;
    }

    return number(
        data.plan.limits[key],
        0
    );
}


// ============================================================
// USAGE GETTER
// ============================================================

function getPlanUsage5(
    userId
) {
    const data =
        getUserPlanData5(
            userId
        );

    return {
        ...clone(
            data.usage
        ),

        planId:
            data.user.planId,

        plan:
            clone(
                data.plan
            ),

        active:
            data.active
    };
}


// ============================================================
// LIMIT CHECK
// ============================================================

function checkPlanLimit5(
    userId,
    feature,
    amount = 1
) {
    PLAN_STATE
        .usageChecks++;

    const data =
        getUserPlanData5(
            userId
        );

    const required =
        Math.max(
            Number(amount) || 1,
            1
        );

    if (
        !data.active
    ) {
        PLAN_STATE
            .limitDenied++;

        return {
            allowed:
                false,

            reason:
                "plan_inactive",

            feature,

            requested:
                required,

            used:
                0,

            limit:
                0
        };
    }

    const limit =
        getPlanLimit5(
            userId,
            feature
        );

    const used =
        number(
            data.usage[
                feature
            ],
            0
        );

    const allowed =
        limit < 0 ||
        used +
            required <=
            limit;

    if (
        !allowed
    ) {
        PLAN_STATE
            .limitDenied++;
    }

    return {
        allowed,

        reason:
            allowed
                ? "ok"
                : "daily_limit_reached",

        feature,

        requested:
            required,

        used,

        limit,

        remaining:
            Math.max(
                0,
                limit -
                used
            )
    };
}


// ============================================================
// CONSUME USAGE
// ============================================================

function consumePlanUsage5(
    userId,
    feature,
    amount = 1
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    const key =
        safeString(
            feature
        );

    const value =
        Math.max(
            Number(amount) || 1,
            1
        );

    const check =
        checkPlanLimit5(
            id,
            key,
            value
        );

    if (
        !check.allowed
    ) {
        return {
            success: false,

            ...check
        };
    }

    const record =
        ensurePlanUsage5(
            id
        );

    if (
        typeof record[key] !==
        "number"
    ) {
        record[key] =
            0;
    }

    record[key] +=
        value;

    record.total +=
        value;

    record.updatedAt =
        nowISO();

    usage[id] =
        record;

    savePlanUsage5();

    PLAN_STATE
        .usageConsumes++;

    return {
        success: true,

        feature:
            key,

        amount:
            value,

        used:
            record[key],

        limit:
            getPlanLimit5(
                id,
                key
            ),

        remaining:
            Math.max(
                0,
                getPlanLimit5(
                    id,
                    key
                ) -
                record[key]
            )
    };
}


// ============================================================
// TOKEN USAGE
// ============================================================

function consumePlanTokens5(
    userId,
    tokens
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    const amount =
        Math.max(
            Number(tokens) || 0,
            0
        );

    const record =
        ensurePlanUsage5(
            id
        );

    record.tokens +=
        amount;

    record.updatedAt =
        nowISO();

    usage[id] =
        record;

    savePlanUsage5();

    return {
        success: true,

        tokens:
            record.tokens
    };
}


// ============================================================
// RESET USER USAGE
// ============================================================

function resetPlanUsage5(
    userId
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    loadPlanUsage5();

    usage[id] =
        defaultUsageRecord5(
            id
        );

    savePlanUsage5();

    PLAN_STATE
        .usageResets++;

    appendLog(
        SYSTEM_LOG_FILE,
        "user_usage_reset",
        {
            userId:
                id
        }
    );

    return {
        success: true,

        userId:
            id,

        usage:
            clone(
                usage[id]
            )
    };
}


// ============================================================
// RESET ALL USAGE
// ============================================================

function resetAllPlanUsage5() {
    loadPlanUsers5();

    usage =
        {};

    for (
        const userId
        of Object.keys(
            users
        )
    ) {
        usage[userId] =
            defaultUsageRecord5(
                userId
            );
    }

    savePlanUsage5();

    PLAN_STATE
        .usageResets++;

    return {
        success: true,

        users:
            Object.keys(
                users
            ).length,

        timestamp:
            nowISO()
    };
}


// ============================================================
// PRO CODE VALIDATION
// ============================================================

function validateProCode5(
    input
) {
    const received =
        safeString(
            input
        );

    const expected =
        safeString(
            PLAN_CONFIG.proCode
        );

    if (
        !expected
    ) {
        return false;
    }

    const a =
        Buffer.from(
            received
        );

    const b =
        Buffer.from(
            expected
        );

    if (
        a.length !==
        b.length
    ) {
        return false;
    }

    let mismatch =
        0;

    for (
        let index = 0;
        index < a.length;
        index++
    ) {
        mismatch |=
            a[index] ^
            b[index];
    }

    return (
        mismatch ===
        0
    );
}


// ============================================================
// PRO ACTIVATION
// ============================================================

function activatePro5(
    userId,
    code,
    options = {}
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    if (
        !validateProCode5(
            code
        )
    ) {
        PLAN_STATE
            .failedProActivations++;

        appendLog(
            SYSTEM_LOG_FILE,
            "pro_activation_failed",
            {
                userId:
                    id
            }
        );

        return {
            success: false,

            error:
                "invalid_pro_code"
        };
    }

    const result =
        setPlanUser5(
            id,
            "pro",
            {
                durationDays:
                    options.durationDays ||
                    null
            }
        );

    if (
        result.success
    ) {
        PLAN_STATE
            .proActivations++;
    }

    return {
        ...result,

        activated:
            result.success
    };
}


// ============================================================
// GET PLAN LIST
// ============================================================

function listPlans5(
    options = {}
) {
    return Object.values(
        TURKAI_PLANS
    )
        .filter(
            plan => {
                if (
                    plan.internal &&
                    options.includeInternal !==
                        true
                ) {
                    return false;
                }

                if (
                    plan.comingSoon &&
                    options.includeComingSoon !==
                        true
                ) {
                    return false;
                }

                return true;
            }
        )
        .map(
            clone
        );
}


// ============================================================
// USER LIST
// ============================================================

function listPlanUsers5(
    options = {}
) {
    loadPlanUsers5();

    let result =
        Object.values(
            users
        );

    if (
        options.planId
    ) {
        const id =
            normalizePlanId5(
                options.planId
            );

        result =
            result.filter(
                user =>
                    normalizePlanId5(
                        user.planId
                    ) === id
            );
    }

    if (
        options.activeOnly ===
            true
    ) {
        result =
            result.filter(
                isPlanActive5
            );
    }

    if (
        options.limit
    ) {
        result =
            result.slice(
                0,
                Math.max(
                    1,
                    Number(
                        options.limit
                    )
                )
            );
    }

    return result.map(
        clone
    );
}


// ============================================================
// USER SEARCH
// ============================================================

function searchPlanUsers5(
    query
) {
    loadPlanUsers5();

    const q =
        normalizeText(
            query
        );

    if (!q) {
        return [];
    }

    return Object.values(
        users
    )
        .filter(
            user => {
                const haystack =
                    normalizeText(
                        [
                            user.userId,
                            user.name,
                            user.email,
                            user.planId,
                            user.provider
                        ].join(
                            " "
                        )
                    );

                return haystack.includes(
                    q
                );
            }
        )
        .map(
            clone
        );
}


// ============================================================
// PLAN COUNTS
// ============================================================

function getPlanCounts5() {
    loadPlanUsers5();

    const counts = {};

    for (
        const planId
        of Object.keys(
            TURKAI_PLANS
        )
    ) {
        counts[
            planId
        ] = 0;
    }

    for (
        const user
        of Object.values(
            users
        )
    ) {
        const planId =
            normalizePlanId5(
                user.planId
            );

        if (
            counts[
                planId
            ] ===
            undefined
        ) {
            counts[
                planId
            ] = 0;
        }

        counts[
            planId
        ]++;
    }

    return counts;
}


// ============================================================
// ACTIVE USER COUNT
// ============================================================

function activePlanUserCount5() {
    loadPlanUsers5();

    let count =
        0;

    for (
        const user
        of Object.values(
            users
        )
    ) {
        if (
            isPlanActive5(
                user
            )
        ) {
            count++;
        }
    }

    return count;
}


// ============================================================
// REVENUE ESTIMATE
// ============================================================

function getPlanRevenue5() {
    loadPlanUsers5();

    let monthly =
        0;

    const byPlan =
        {};

    for (
        const planId
        of Object.keys(
            TURKAI_PLANS
        )
    ) {
        byPlan[
            planId
        ] = 0;
    }

    for (
        const user
        of Object.values(
            users
        )
    ) {
        if (
            !isPlanActive5(
                user
            )
        ) {
            continue;
        }

        const plan =
            getPlanReference5(
                user.planId
            );

        if (
            !plan ||
            plan.internal
        ) {
            continue;
        }

        const price =
            number(
                plan.price,
                0
            );

        monthly +=
            price;

        if (
            byPlan[
                plan.id
            ] !==
            undefined
        ) {
            byPlan[
                plan.id
            ]++;
        }
    }

    return {
        monthlyTRY:
            monthly,

        yearlyTRY:
            monthly * 12,

        byPlan
    };
}


// ============================================================
// FEATURE MATRIX
// ============================================================

function getFeatureMatrix5() {
    const matrix =
        {};

    for (
        const plan
        of Object.values(
            TURKAI_PLANS
        )
    ) {
        for (
            const [
                feature,
                enabled
            ]
            of Object.entries(
                plan.features ||
                {}
            )
        ) {
            if (
                !matrix[
                    feature
                ]
            ) {
                matrix[
                    feature
                ] = {};
            }

            matrix[
                feature
            ][
                plan.id
            ] =
                Boolean(
                    enabled
                );
        }
    }

    return matrix;
}


// ============================================================
// PLAN STATS
// ============================================================

function getPlanStats5() {
    loadPlanUsers5();
    loadPlanUsage5();

    return {
        version:
            "30.0.0",

        state:
            clone(
                PLAN_STATE
            ),

        users: {
            total:
                Object.keys(
                    users
                ).length,

            active:
                activePlanUserCount5(),

            byPlan:
                getPlanCounts5()
        },

        usage: {
            records:
                Object.keys(
                    usage
                ).length
        },

        plans: {
            total:
                Object.keys(
                    TURKAI_PLANS
                ).length,

            public:
                listPlans5({
                    includeInternal:
                        false,

                    includeComingSoon:
                        true
                }).length
        },

        revenue:
            getPlanRevenue5(),

        featureMatrix:
            getFeatureMatrix5(),

        timestamp:
            nowISO()
    };
}


// ============================================================
// PLAN HEALTH
// ============================================================

function getPlanHealth5() {
    loadPlanUsers5();
    loadPlanUsage5();

    const directoriesReady =
        fs.existsSync(
            USERS_DIR
        ) &&
        fs.existsSync(
            PLANS_DIR
        );

    return {
        ok:
            directoriesReady,

        module:
            "plan-system",

        files: {
            users:
                fs.existsSync(
                    USERS_FILE
                ),

            usage:
                fs.existsSync(
                    USAGE_FILE
                )
        },

        users:
            Object.keys(
                users
            ).length,

        usage:
            Object.keys(
                usage
            ).length,

        plans:
            Object.keys(
                TURKAI_PLANS
            ).length,

        timestamp:
            nowISO()
    };
}


// ============================================================
// API — PLANS
// ============================================================

app.get(
    "/api/plans",
    (req, res) => {
        return res.json({
            success:
                true,

            plans:
                listPlans5({
                    includeInternal:
                        req.query.internal ===
                        "true",

                    includeComingSoon:
                        req.query.comingSoon !==
                        "false"
                })
        });
    }
);


// ============================================================
// API — SINGLE PLAN
// ============================================================

app.get(
    "/api/plans/:planId",
    (req, res) => {
        const plan =
            getPlan5(
                req.params.planId
            );

        if (!plan) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "plan_not_found"
            });
        }

        return res.json({
            success:
                true,

            plan
        });
    }
);


// ============================================================
// API — USER
// ============================================================

app.post(
    "/api/user",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const userId =
            normalizePlanUserId5(
                body.userId
            );

        const user =
            ensurePlanUser5(
                userId,
                {
                    name:
                        body.name,

                    email:
                        body.email,

                    provider:
                        body.provider,

                    planId:
                        body.planId,

                    metadata:
                        body.metadata
                }
            );

        return res.json({
            success:
                true,

            user,

            plan:
                getPlan5(
                    user.planId
                ),

            usage:
                getPlanUsage5(
                    userId
                )
        });
    }
);


// ============================================================
// API — GET USER
// ============================================================

app.get(
    "/api/user/:userId",
    (req, res) => {
        const data =
            getUserPlanData5(
                req.params.userId
            );

        return res.json({
            success:
                true,

            ...data
        });
    }
);


// ============================================================
// API — USER PLAN
// ============================================================

app.get(
    "/api/user/:userId/plan",
    (req, res) => {
        const user =
            ensurePlanUser5(
                req.params.userId
            );

        return res.json({
            success:
                true,

            userId:
                user.userId,

            plan:
                getPlan5(
                    user.planId
                ),

            active:
                isPlanActive5(
                    user
                )
        });
    }
);


// ============================================================
// API — CHANGE USER PLAN
// ============================================================

app.post(
    "/api/user/:userId/plan",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const planId =
            body.planId ||
            body.plan ||
            "free";

        const result =
            setPlanUser5(
                req.params.userId,
                planId,
                {
                    durationDays:
                        body.durationDays,

                    allowComingSoon:
                        body.allowComingSoon ===
                        true,

                    allowInternal:
                        body.allowInternal ===
                        true
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                400
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// API — USER USAGE
// ============================================================

app.get(
    "/api/user/:userId/usage",
    (req, res) => {
        return res.json({
            success:
                true,

            usage:
                getPlanUsage5(
                    req.params.userId
                )
        });
    }
);


// ============================================================
// API — LIMIT CHECK
// ============================================================

app.post(
    "/api/user/:userId/check-limit",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const feature =
            safeString(
                body.feature
            );

        if (!feature) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "feature_required"
            });
        }

        const result =
            checkPlanLimit5(
                req.params.userId,
                feature,
                body.amount || 1
            );

        return res.json({
            success:
                true,

            ...result
        });
    }
);


// ============================================================
// API — CONSUME USAGE
// ============================================================

app.post(
    "/api/user/:userId/consume",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const feature =
            safeString(
                body.feature
            );

        if (!feature) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "feature_required"
            });
        }

        const result =
            consumePlanUsage5(
                req.params.userId,
                feature,
                body.amount || 1
            );

        if (
            !result.success
        ) {
            return res.status(
                429
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// API — RESET USER USAGE
// ============================================================

app.post(
    "/api/plans/reset-usage/:userId",
    (req, res) => {
        return res.json(
            resetPlanUsage5(
                req.params.userId
            )
        );
    }
);


// ============================================================
// API — RESET ALL USAGE
// ============================================================

app.post(
    "/api/plans/reset-usage",
    (req, res) => {
        return res.json(
            resetAllPlanUsage5()
        );
    }
);


// ============================================================
// API — PRO ACTIVATE
// ============================================================

app.post(
    "/api/pro/activate",
    (req, res) => {
        const body =
            req.body &&
            typeof req.body ===
                "object"
                ? req.body
                : {};

        const userId =
            normalizePlanUserId5(
                body.userId
            );

        const code =
            safeString(
                body.code ||
                body.proCode ||
                body.key
            );

        if (
            !code
        ) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "pro_code_required"
            });
        }

        const result =
            activatePro5(
                userId,
                code,
                {
                    durationDays:
                        body.durationDays
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                403
            ).json(
                result
            );
        }

        return res.json({
            success:
                true,

            message:
                "TürkAI Pro başarıyla etkinleştirildi.",

            ...result
        });
    }
);


// ============================================================
// API — LIST USERS
// ============================================================

app.get(
    "/api/plans/users",
    (req, res) => {
        return res.json({
            success:
                true,

            users:
                listPlanUsers5({
                    planId:
                        req.query.plan,

                    activeOnly:
                        req.query.active ===
                        "true",

                    limit:
                        req.query.limit
                })
        });
    }
);


// ============================================================
// API — SEARCH USERS
// ============================================================

app.get(
    "/api/plans/users/search",
    (req, res) => {
        const q =
            safeString(
                req.query.q
            );

        if (!q) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "query_required"
            });
        }

        return res.json({
            success:
                true,

            users:
                searchPlanUsers5(
                    q
                )
        });
    }
);


// ============================================================
// API — STATS
// ============================================================

app.get(
    "/api/plans/stats",
    (req, res) => {
        return res.json({
            success:
                true,

            stats:
                getPlanStats5()
        });
    }
);


// ============================================================
// API — HEALTH
// ============================================================

app.get(
    "/api/plans/health",
    (req, res) => {
        return res.json(
            getPlanHealth5()
        );
    }
);


// ============================================================
// PLAN ENGINE RUNTIME RULES
// ============================================================

const PLAN_FEATURES_5 = [
    "chat",
    "memory",
    "research",
    "weather",
    "currency",
    "coding",
    "upload",
    "image",
    "video",
    "tasks",
    "streaming",
    "advancedModels",
    "videoCall",
    "admin"
];


const PLAN_USAGE_FEATURES_5 = [
    "messages",
    "research",
    "images",
    "videos",
    "uploads",
    "tasks",
    "tokens"
];


const PLAN_ACTIONS_5 = [
    "check",
    "consume",
    "has",
    "limit",
    "remaining",
    "reset",
    "status"
];


// ============================================================
// PLAN RUNTIME MATRIX
// ============================================================

const PLAN_RUNTIME_MATRIX_5 =
    [];

for (
    const plan
    of Object.values(
        TURKAI_PLANS
    )
) {
    for (
        const feature
        of PLAN_FEATURES_5
    ) {
        PLAN_RUNTIME_MATRIX_5.push({
            plan:
                plan.id,

            feature,

            enabled:
                Boolean(
                    plan.features &&
                    plan.features[
                        feature
                    ]
                )
        });
    }

    for (
        const feature
        of PLAN_USAGE_FEATURES_5
    ) {
        PLAN_RUNTIME_MATRIX_5.push({
            plan:
                plan.id,

            feature,

            limit:
                number(
                    plan.limits &&
                    plan.limits[
                        feature
                    ],
                    0
                )
        });

        for (
            const action
            of PLAN_ACTIONS_5
        ) {
            PLAN_RUNTIME_MATRIX_5.push({
                plan:
                    plan.id,

                feature,

                action
            });
        }
    }
}


// ============================================================
// EXTENDED PLAN MATRIX API
// ============================================================

app.get(
    "/api/plans/matrix",
    (req, res) => {
        return res.json({
            success:
                true,

            count:
                PLAN_RUNTIME_MATRIX_5
                    .length,

            matrix:
                PLAN_RUNTIME_MATRIX_5
        });
    }
);


// ============================================================
// PLAN SERIALIZATION
// ============================================================

function serializePlanUser5(
    userId
) {
    const data =
        getUserPlanData5(
            userId
        );

    return {
        user:
            clone(
                data.user
            ),

        plan:
            clone(
                data.plan
            ),

        usage:
            clone(
                data.usage
            ),

        active:
            data.active
    };
}


// ============================================================
// PUBLIC PLAN CARD
// ============================================================

function publicPlanCard5(
    plan
) {
    if (!plan) {
        return null;
    }

    return {
        id:
            plan.id,

        name:
            plan.name,

        displayName:
            plan.displayName,

        price:
            plan.price,

        currency:
            plan.currency,

        billing:
            plan.billing,

        active:
            plan.active,

        comingSoon:
            plan.comingSoon,

        limits:
            clone(
                plan.limits
            ),

        maxUploadMB:
            plan.maxUploadMB,

        models:
            clone(
                plan.models
            ),

        features:
            clone(
                plan.features
            )
    };
}


// ============================================================
// PUBLIC PLAN API
// ============================================================

app.get(
    "/api/plans/public",
    (req, res) => {
        return res.json({
            success:
                true,

            plans:
                listPlans5({
                    includeInternal:
                        false,

                    includeComingSoon:
                        true
                })
                .map(
                    publicPlanCard5
                )
        });
    }
);


// ============================================================
// PLAN STATE EXTENSION
// ============================================================

serverState.plans = {
    state:
        PLAN_STATE,

    config:
        PLAN_CONFIG,

    plans:
        TURKAI_PLANS,

    aliases:
        PLAN_ALIASES,

    normalizePlanId:
        normalizePlanId5,

    getPlan:
        getPlan5,

    listPlans:
        listPlans5,

    ensureUser:
        ensurePlanUser5,

    getUser:
        getPlanUser5,

    getUserPlanData:
        getUserPlanData5,

    setPlan:
        setPlanUser5,

    setFree:
        setFreePlan5,

    isActive:
        isPlanActive5,

    hasFeature:
        hasPlanFeature5,

    getLimit:
        getPlanLimit5,

    getUsage:
        getPlanUsage5,

    checkLimit:
        checkPlanLimit5,

    consume:
        consumePlanUsage5,

    consumeTokens:
        consumePlanTokens5,

    resetUsage:
        resetPlanUsage5,

    resetAllUsage:
        resetAllPlanUsage5,

    validatePro:
        validateProCode5,

    activatePro:
        activatePro5,

    listUsers:
        listPlanUsers5,

    searchUsers:
        searchPlanUsers5,

    stats:
        getPlanStats5,

    health:
        getPlanHealth5,

    matrix:
        PLAN_RUNTIME_MATRIX_5
};


// ============================================================
// CHAT PLAN CHECK HELPER
// ============================================================

function checkChatMessagePlan5(
    userId
) {
    const user =
        ensurePlanUser5(
            userId
        );

    const plan =
        getPlanReference5(
            user.planId
        );

    if (
        !isPlanActive5(
            user
        )
    ) {
        return {
            allowed:
                false,

            reason:
                "plan_inactive",

            userId:
                user.userId,

            planId:
                user.planId
        };
    }

    const feature =
        checkPlanLimit5(
            user.userId,
            "messages",
            1
        );

    if (
        !feature.allowed
    ) {
        return {
            ...feature,

            userId:
                user.userId,

            planId:
                user.planId
        };
    }

    return {
        allowed:
            true,

        userId:
            user.userId,

        planId:
            user.planId,

        planName:
            plan.name,

        remaining:
            feature.remaining
    };
}


// ============================================================
// CHAT PLAN PRECHECK API
// ============================================================

app.post(
    "/api/chat/plan-check",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : "guest"
            );

        const result =
            checkChatMessagePlan5(
                userId
            );

        return res.json({
            success:
                true,

            ...result
        });
    }
);


// ============================================================
// FINAL PART 5 STATUS
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 5 Plan/User Engine yüklendi."
);

console.log(
    "[TürkAI] Plans:",
    Object.keys(
        TURKAI_PLANS
    ).join(
        ", "
    )
);

console.log(
    "[TürkAI] Users:",
    Object.keys(
        users || {}
    ).length
);

console.log(
    "[TürkAI] Plan Matrix:",
    PLAN_RUNTIME_MATRIX_5.length
);

console.log(
    "[TürkAI] Pro Code:",
    PLAN_CONFIG.proCode
        ? "AYARLI"
        : "AYARLANMAMIŞ"
);

console.log(
    "[TürkAI] /api/plans"
);

console.log(
    "[TürkAI] /api/user/:userId"
);

console.log(
    "[TürkAI] /api/pro/activate"
);

console.log(
    "[TürkAI] /api/plans/stats"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 5 END
// ============================================================
//
// PART 6:
//
// - gerçek dosya yükleme
// - Multer
// - 10/25/50/100 MB plan limiti
// - dosya türü kontrolü
// - güvenli dosya isimleri
// - kullanıcı dosyaları
// - metin çıkarma
// - JSON / TXT / CSV / JS / HTML / CSS / MD
// - dosya listeleme
// - dosya silme
// - dosya indirme
// - upload progress
// - Socket.IO upload events
//
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 6 / 10
// FILE UPLOAD + FILE MANAGER + TEXT EXTRACTION
// ============================================================
//
// - Multer disk upload
// - kullanıcı bazlı klasör
// - plan bazlı boyut limiti
// - güvenli dosya adı
// - MIME doğrulama
// - uzantı doğrulama
// - dosya hash
// - metadata
// - text extraction
// - TXT / MD / JSON / CSV / JS / TS / HTML / CSS / XML
// - dosya listeleme
// - dosya bilgisi
// - dosya silme
// - dosya indirme
// - dosya içeriği
// - dosya arama
// - storage statistics
// - upload history
// - cleanup
// - quota
// - Socket.IO upload events
// ============================================================


// ============================================================
// UPLOAD STATE
// ============================================================

const UPLOAD_STATE = {
    startedAt:
        nowISO(),

    uploads:
        0,

    successful:
        0,

    failed:
        0,

    deleted:
        0,

    downloaded:
        0,

    readOperations:
        0,

    searchOperations:
        0,

    bytesUploaded:
        0,

    bytesDeleted:
        0,

    extractionSuccess:
        0,

    extractionFailure:
        0
};


// ============================================================
// UPLOAD CONFIG
// ============================================================

const UPLOAD_CONFIG = {
    enabled:
        true,

    defaultMaxMB:
        10,

    absoluteMaxMB:
        250,

    maxFilesPerRequest:
        10,

    maxFilesPerUser:
        250,

    maxStoragePerUserMB:
        1024,

    textReadMaxMB:
        5,

    maxExtractedText:
        500000,

    historyLimit:
        2000,

    allowedExtensions: [
        ".txt",
        ".md",
        ".markdown",
        ".json",
        ".csv",
        ".tsv",
        ".js",
        ".mjs",
        ".cjs",
        ".ts",
        ".tsx",
        ".jsx",
        ".html",
        ".htm",
        ".css",
        ".scss",
        ".less",
        ".xml",
        ".svg",
        ".yaml",
        ".yml",
        ".ini",
        ".log",
        ".sql",
        ".java",
        ".py",
        ".c",
        ".h",
        ".cpp",
        ".hpp",
        ".cs",
        ".php",
        ".go",
        ".rs",
        ".sh",
        ".bat",
        ".ps1",
        ".env.example"
    ],

    allowedMimeTypes: [
        "text/plain",
        "text/markdown",
        "application/json",
        "text/csv",
        "text/tab-separated-values",
        "application/javascript",
        "text/javascript",
        "application/typescript",
        "text/html",
        "text/css",
        "text/xml",
        "application/xml",
        "image/svg+xml",
        "application/x-yaml",
        "text/yaml"
    ]
};


// ============================================================
// UPLOAD DIRECTORIES
// ============================================================

const USER_UPLOAD_ROOT =
    path.join(
        UPLOADS_DIR,
        "users"
    );

const UPLOAD_META_DIR =
    path.join(
        UPLOADS_DIR,
        "metadata"
    );

const UPLOAD_TEMP_DIR =
    path.join(
        UPLOADS_DIR,
        "temp"
    );

const UPLOAD_HISTORY_FILE =
    path.join(
        UPLOADS_DIR,
        "history.json"
    );

const UPLOAD_INDEX_FILE =
    path.join(
        UPLOADS_DIR,
        "index.json"
    );

for (
    const directory
    of [
        USER_UPLOAD_ROOT,
        UPLOAD_META_DIR,
        UPLOAD_TEMP_DIR
    ]
) {
    try {
        fs.mkdirSync(
            directory,
            {
                recursive:
                    true
            }
        );
    } catch {
        // devam
    }
}


// ============================================================
// UPLOAD HISTORY / INDEX
// ============================================================

let uploadHistory =
    readJSON(
        UPLOAD_HISTORY_FILE,
        []
    );

if (
    !Array.isArray(
        uploadHistory
    )
) {
    uploadHistory =
        [];
}

let uploadIndex =
    readJSON(
        UPLOAD_INDEX_FILE,
        {}
    );

if (
    !uploadIndex ||
    typeof uploadIndex !==
        "object" ||
    Array.isArray(
        uploadIndex
    )
) {
    uploadIndex =
        {};
}


// ============================================================
// USER UPLOAD PATH
// ============================================================

function sanitizePathPart6(
    value
) {
    return safeString(
        value
    )
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )
        .slice(
            0,
            120
        );
}


function getUserUploadDirectory6(
    userId
) {
    const safeUser =
        sanitizePathPart6(
            userId ||
            "guest"
        ) ||
        "guest";

    const directory =
        path.join(
            USER_UPLOAD_ROOT,
            safeUser
        );

    fs.mkdirSync(
        directory,
        {
            recursive:
                true
        }
    );

    return directory;
}


// ============================================================
// SECURE FILE NAME
// ============================================================

function getSafeExtension6(
    originalName
) {
    const ext =
        path.extname(
            safeString(
                originalName
            )
        )
        .toLowerCase();

    return ext;
}


function buildSafeFileName6(
    originalName
) {
    const original =
        safeString(
            originalName,
            "file"
        );

    const extension =
        getSafeExtension6(
            original
        );

    const base =
        path.basename(
            original,
            extension
        )
        .replace(
            /[^a-zA-Z0-9ğĞüÜşŞıİöÖçÇ._-]/g,
            "_"
        )
        .replace(
            /_+/g,
            "_"
        )
        .slice(
            0,
            100
        )
        .trim() ||
        "file";

    return (
        `${Date.now()}_${crypto
            .randomBytes(6)
            .toString("hex")}_${base}${extension}`
    );
}


// ============================================================
// FILE TYPE MAP
// ============================================================

const UPLOAD_EXTENSION_MIME_MAP_6 = {
    ".txt":
        [
            "text/plain"
        ],

    ".md":
        [
            "text/markdown",
            "text/plain"
        ],

    ".markdown":
        [
            "text/markdown",
            "text/plain"
        ],

    ".json":
        [
            "application/json",
            "text/plain"
        ],

    ".csv":
        [
            "text/csv",
            "text/plain"
        ],

    ".tsv":
        [
            "text/tab-separated-values",
            "text/plain"
        ],

    ".js":
        [
            "application/javascript",
            "text/javascript",
            "text/plain"
        ],

    ".mjs":
        [
            "application/javascript",
            "text/javascript",
            "text/plain"
        ],

    ".cjs":
        [
            "application/javascript",
            "text/javascript",
            "text/plain"
        ],

    ".ts":
        [
            "application/typescript",
            "text/plain"
        ],

    ".tsx":
        [
            "application/typescript",
            "text/plain"
        ],

    ".jsx":
        [
            "application/javascript",
            "text/javascript",
            "text/plain"
        ],

    ".html":
        [
            "text/html",
            "text/plain"
        ],

    ".htm":
        [
            "text/html",
            "text/plain"
        ],

    ".css":
        [
            "text/css",
            "text/plain"
        ],

    ".scss":
        [
            "text/css",
            "text/plain"
        ],

    ".less":
        [
            "text/css",
            "text/plain"
        ],

    ".xml":
        [
            "application/xml",
            "text/xml",
            "text/plain"
        ],

    ".svg":
        [
            "image/svg+xml",
            "text/xml",
            "text/plain"
        ],

    ".yaml":
        [
            "application/x-yaml",
            "text/yaml",
            "text/plain"
        ],

    ".yml":
        [
            "application/x-yaml",
            "text/yaml",
            "text/plain"
        ],

    ".log":
        [
            "text/plain"
        ],

    ".sql":
        [
            "text/plain",
            "application/sql"
        ],

    ".py":
        [
            "text/plain",
            "text/x-python"
        ],

    ".java":
        [
            "text/plain",
            "text/x-java-source"
        ],

    ".c":
        [
            "text/plain"
        ],

    ".h":
        [
            "text/plain"
        ],

    ".cpp":
        [
            "text/plain"
        ],

    ".hpp":
        [
            "text/plain"
        ],

    ".cs":
        [
            "text/plain"
        ],

    ".php":
        [
            "text/plain",
            "application/x-php"
        ],

    ".go":
        [
            "text/plain"
        ],

    ".rs":
        [
            "text/plain"
        ],

    ".sh":
        [
            "text/plain",
            "application/x-sh"
        ],

    ".bat":
        [
            "text/plain"
        ],

    ".ps1":
        [
            "text/plain"
        ]
};


// ============================================================
// MIME / EXTENSION CHECK
// ============================================================

function isAllowedUploadExtension6(
    originalName
) {
    const extension =
        getSafeExtension6(
            originalName
        );

    return (
        UPLOAD_CONFIG
            .allowedExtensions
            .includes(
                extension
            )
    );
}


function isAllowedUploadMime6(
    mimeType
) {
    const mime =
        safeString(
            mimeType
        ).toLowerCase();

    if (!mime) {
        return true;
    }

    return (
        UPLOAD_CONFIG
            .allowedMimeTypes
            .includes(
                mime
            ) ||
        mime ===
            "application/octet-stream"
    );
}


function uploadTypeCompatible6(
    originalName,
    mimeType
) {
    const extension =
        getSafeExtension6(
            originalName
        );

    const allowed =
        UPLOAD_EXTENSION_MIME_MAP_6[
            extension
        ];

    if (!allowed) {
        return false;
    }

    const mime =
        safeString(
            mimeType
        ).toLowerCase();

    if (
        !mime ||
        mime ===
            "application/octet-stream"
    ) {
        return true;
    }

    return allowed.includes(
        mime
    );
}


// ============================================================
// FILE SIZE HELPERS
// ============================================================

function bytesToMB6(
    bytes
) {
    return Number(
        (
            Number(bytes || 0) /
            1024 /
            1024
        ).toFixed(
            2
        )
    );
}


function mbToBytes6(
    mb
) {
    return (
        Math.max(
            Number(
                mb
            ) || 0,
            0
        ) *
        1024 *
        1024
    );
}


// ============================================================
// PLAN UPLOAD LIMIT
// ============================================================

function getUserUploadLimitMB6(
    userId
) {
    try {
        if (
            typeof getUserPlanData5 ===
            "function"
        ) {
            const data =
                getUserPlanData5(
                    userId
                );

            if (
                data &&
                data.plan &&
                Number.isFinite(
                    Number(
                        data.plan
                            .maxUploadMB
                    )
                )
            ) {
                return Math.min(
                    Number(
                        data.plan
                            .maxUploadMB
                    ),
                    UPLOAD_CONFIG
                        .absoluteMaxMB
                );
            }
        }
    } catch {
        // fallback
    }

    return UPLOAD_CONFIG
        .defaultMaxMB;
}


// ============================================================
// USER STORAGE LIMIT
// ============================================================

function getUserUploadedFiles6(
    userId
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    return Object.values(
        uploadIndex
    )
    .filter(
        item =>
            item &&
            item.userId ===
                id &&
            item.deleted !==
                true
    );
}


function getUserStorageBytes6(
    userId
) {
    return getUserUploadedFiles6(
        userId
    ).reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item.size ||
                0
            ),
        0
    );
}


function getUserStorageLimitBytes6() {
    return mbToBytes6(
        UPLOAD_CONFIG
            .maxStoragePerUserMB
    );
}


// ============================================================
// UPLOAD VALIDATION
// ============================================================

function validateUploadFile6(
    file,
    userId
) {
    if (!file) {
        return {
            valid:
                false,

            error:
                "file_missing"
        };
    }

    const originalName =
        safeString(
            file.originalname
        );

    const extension =
        getSafeExtension6(
            originalName
        );

    if (
        !isAllowedUploadExtension6(
            originalName
        )
    ) {
        return {
            valid:
                false,

            error:
                "extension_not_allowed",

            extension
        };
    }

    if (
        !isAllowedUploadMime6(
            file.mimetype
        )
    ) {
        return {
            valid:
                false,

            error:
                "mime_not_allowed",

            mime:
                file.mimetype
        };
    }

    if (
        !uploadTypeCompatible6(
            originalName,
            file.mimetype
        )
    ) {
        return {
            valid:
                false,

            error:
                "file_type_mismatch"
        };
    }

    const size =
        Number(
            file.size ||
            0
        );

    const maxMB =
        getUserUploadLimitMB6(
            userId
        );

    if (
        size >
        mbToBytes6(
            maxMB
        )
    ) {
        return {
            valid:
                false,

            error:
                "file_too_large",

            maxMB,

            actualMB:
                bytesToMB6(
                    size
                )
        };
    }

    const currentStorage =
        getUserStorageBytes6(
            userId
        );

    const maxStorage =
        getUserStorageLimitBytes6();

    if (
        currentStorage +
        size >
        maxStorage
    ) {
        return {
            valid:
                false,

            error:
                "storage_quota_exceeded",

            usedMB:
                bytesToMB6(
                    currentStorage
                ),

            maxStorageMB:
                UPLOAD_CONFIG
                    .maxStoragePerUserMB
        };
    }

    return {
        valid:
            true,

        extension,

        maxMB
    };
}


// ============================================================
// MULTER STORAGE
// ============================================================

let uploadMiddleware =
    null;

if (multer) {
    const storage =
        multer.diskStorage({
            destination:
                (
                    req,
                    file,
                    callback
                ) => {
                    const userId =
                        normalizePlanUserId5(
                            req.body &&
                            req.body.userId
                                ? req.body.userId
                                : "guest"
                        );

                    const directory =
                        getUserUploadDirectory6(
                            userId
                        );

                    callback(
                        null,
                        directory
                    );
                },

            filename:
                (
                    req,
                    file,
                    callback
                ) => {
                    callback(
                        null,
                        buildSafeFileName6(
                            file.originalname
                        )
                    );
                }
        });

    uploadMiddleware =
        multer({
            storage,

            limits: {
                fileSize:
                    mbToBytes6(
                        UPLOAD_CONFIG
                            .absoluteMaxMB
                    ),

                files:
                    UPLOAD_CONFIG
                        .maxFilesPerRequest
            },

            fileFilter:
                (
                    req,
                    file,
                    callback
                ) => {
                    const validExtension =
                        isAllowedUploadExtension6(
                            file.originalname
                        );

                    const validMime =
                        isAllowedUploadMime6(
                            file.mimetype
                        );

                    if (
                        !validExtension
                    ) {
                        return callback(
                            new Error(
                                "extension_not_allowed"
                            )
                        );
                    }

                    if (
                        !validMime
                    ) {
                        return callback(
                            new Error(
                                "mime_not_allowed"
                            )
                        );
                    }

                    callback(
                        null,
                        true
                    );
                }
        });
}


// ============================================================
// FILE HASH
// ============================================================

function calculateFileHash6(
    filePath
) {
    try {
        const buffer =
            fs.readFileSync(
                filePath
            );

        return crypto
            .createHash(
                "sha256"
            )
            .update(
                buffer
            )
            .digest(
                "hex"
            );
    } catch {
        return "";
    }
}


// ============================================================
// TEXT FILE DETECTION
// ============================================================

function isTextUpload6(
    fileName,
    mimeType
) {
    const extension =
        getSafeExtension6(
            fileName
        );

    const textExtensions = [
        ".txt",
        ".md",
        ".markdown",
        ".json",
        ".csv",
        ".tsv",
        ".js",
        ".mjs",
        ".cjs",
        ".ts",
        ".tsx",
        ".jsx",
        ".html",
        ".htm",
        ".css",
        ".scss",
        ".less",
        ".xml",
        ".svg",
        ".yaml",
        ".yml",
        ".ini",
        ".log",
        ".sql",
        ".java",
        ".py",
        ".c",
        ".h",
        ".cpp",
        ".hpp",
        ".cs",
        ".php",
        ".go",
        ".rs",
        ".sh",
        ".bat",
        ".ps1"
    ];

    return (
        textExtensions.includes(
            extension
        ) ||
        safeString(
            mimeType
        ).startsWith(
            "text/"
        ) ||
        [
            "application/json",
            "application/javascript",
            "application/xml",
            "application/x-yaml"
        ].includes(
            safeString(
                mimeType
            )
        )
    );
}


// ============================================================
// TEXT EXTRACTION
// ============================================================

function extractUploadText6(
    filePath,
    fileName,
    mimeType
) {
    if (
        !isTextUpload6(
            fileName,
            mimeType
        )
    ) {
        return {
            extracted:
                false,

            text:
                "",

            reason:
                "not_text_file"
        };
    }

    try {
        const stats =
            fs.statSync(
                filePath
            );

        if (
            stats.size >
            mbToBytes6(
                UPLOAD_CONFIG
                    .textReadMaxMB
            )
        ) {
            return {
                extracted:
                    false,

                text:
                    "",

                reason:
                    "text_file_too_large"
            };
        }

        const text =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        const cleaned =
            cleanText(
                text,
                UPLOAD_CONFIG
                    .maxExtractedText
            );

        UPLOAD_STATE
            .extractionSuccess++;

        return {
            extracted:
                true,

            text:
                cleaned,

            characters:
                cleaned.length,

            lines:
                cleaned
                    ? cleaned.split(
                        "\n"
                    ).length
                    : 0
        };

    } catch (error) {
        UPLOAD_STATE
            .extractionFailure++;

        return {
            extracted:
                false,

            text:
                "",

            reason:
                "text_read_failed",

            error:
                error.message
        };
    }
}


// ============================================================
// JSON VALIDATION
// ============================================================

function validateJSONUpload6(
    filePath
) {
    try {
        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        const parsed =
            JSON.parse(
                content
            );

        return {
            valid:
                true,

            type:
                Array.isArray(
                    parsed
                )
                    ? "array"
                    : typeof parsed
        };
    } catch (error) {
        return {
            valid:
                false,

            error:
                error.message
        };
    }
}


// ============================================================
// CSV ANALYSIS
// ============================================================

function analyzeCSVUpload6(
    text
) {
    const value =
        safeString(
            text
        );

    if (!value) {
        return {
            rows:
                0,

            columns:
                0,

            delimiter:
                ","
        };
    }

    const lines =
        value
            .split(
                /\r?\n/
            )
            .filter(
                line =>
                    line.trim()
            );

    if (!lines.length) {
        return {
            rows:
                0,

            columns:
                0,

            delimiter:
                ","
        };
    }

    const delimiters = [
        ",",
        ";",
        "\t"
    ];

    let bestDelimiter =
        ",";

    let bestScore =
        0;

    for (
        const delimiter
        of delimiters
    ) {
        const score =
            lines[0]
                .split(
                    delimiter
                )
                .length;

        if (
            score >
            bestScore
        ) {
            bestScore =
                score;

            bestDelimiter =
                delimiter;
        }
    }

    return {
        rows:
            lines.length,

        columns:
            lines[0]
                .split(
                    bestDelimiter
                )
                .length,

        delimiter:
            bestDelimiter,

        header:
            lines[0]
    };
}


// ============================================================
// CODE FILE ANALYSIS
// ============================================================

function analyzeCodeUpload6(
    text,
    fileName
) {
    const extension =
        getSafeExtension6(
            fileName
        );

    const lines =
        safeString(
            text
        ).split(
            /\r?\n/
        );

    let functions =
        0;

    let classes =
        0;

    let imports =
        0;

    let exports =
        0;

    let comments =
        0;

    for (
        const line
        of lines
    ) {
        const value =
            line.trim();

        if (
            /(?:function\s+\w+|=>\s*[^{]*\{)/.test(
                value
            )
        ) {
            functions++;
        }

        if (
            /\bclass\s+\w+/.test(
                value
            )
        ) {
            classes++;
        }

        if (
            /^(import\s|const\s+.*=\s*require\(|from\s+)/.test(
                value
            )
        ) {
            imports++;
        }

        if (
            /\b(export\s|module\.exports)/.test(
                value
            )
        ) {
            exports++;
        }

        if (
            value.startsWith("//") ||
            value.startsWith("#") ||
            value.startsWith("/*") ||
            value.startsWith("*")
        ) {
            comments++;
        }
    }

    return {
        extension,

        lines:
            lines.length,

        functions,

        classes,

        imports,

        exports,

        commentLines:
            comments
    };
}


// ============================================================
// UPLOAD RECORD
// ============================================================

function createUploadRecord6(
    file,
    userId,
    extraction
) {
    const id =
        createId(
            "upload"
        );

    const filePath =
        safeString(
            file.path
        );

    const stat =
        fs.existsSync(
            filePath
        )
            ? fs.statSync(
                filePath
            )
            : null;

    const record = {
        id,

        userId:
            normalizePlanUserId5(
                userId
            ),

        originalName:
            safeString(
                file.originalname
            ),

        storedName:
            safeString(
                file.filename
            ),

        path:
            filePath,

        relativePath:
            path.relative(
                ROOT_DIR,
                filePath
            ),

        size:
            stat
                ? stat.size
                : Number(
                    file.size ||
                    0
                ),

        sizeMB:
            bytesToMB6(
                stat
                    ? stat.size
                    : Number(
                        file.size ||
                        0
                    )
            ),

        mimeType:
            safeString(
                file.mimetype
            ),

        extension:
            getSafeExtension6(
                file.originalname
            ),

        hash:
            filePath
                ? calculateFileHash6(
                    filePath
                )
                : "",

        text:
            extraction &&
            extraction.extracted
                ? extraction.text
                : "",

        extracted:
            Boolean(
                extraction &&
                extraction.extracted
            ),

        extractedCharacters:
            extraction &&
            extraction.characters
                ? extraction.characters
                : 0,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        deleted:
            false
    };

    return record;
}


// ============================================================
// SAVE UPLOAD INDEX
// ============================================================

function saveUploadIndex6() {
    return writeJSON(
        UPLOAD_INDEX_FILE,
        uploadIndex
    );
}


function saveUploadHistory6() {
    uploadHistory =
        uploadHistory.slice(
            -UPLOAD_CONFIG
                .historyLimit
        );

    return writeJSON(
        UPLOAD_HISTORY_FILE,
        uploadHistory
    );
}


// ============================================================
// ADD UPLOAD HISTORY
// ============================================================

function addUploadHistory6(
    event,
    record = {}
) {
    uploadHistory.push({
        id:
            createId(
                "upload-event"
            ),

        event,

        timestamp:
            nowISO(),

        uploadId:
            record.id ||
            null,

        userId:
            record.userId ||
            null,

        fileName:
            record.originalName ||
            null,

        size:
            record.size ||
            0
    });

    saveUploadHistory6();
}


// ============================================================
// REGISTER UPLOAD
// ============================================================

function registerUpload6(
    record
) {
    uploadIndex[
        record.id
    ] =
        record;

    uploadHistory.push({
        id:
            createId(
                "upload-created"
            ),

        event:
            "uploaded",

        timestamp:
            nowISO(),

        uploadId:
            record.id,

        userId:
            record.userId,

        fileName:
            record.originalName,

        size:
            record.size
    });

    saveUploadIndex6();
    saveUploadHistory6();

    return record;
}


// ============================================================
// UPLOAD USER FILES
// ============================================================

function listUserUploads6(
    userId,
    options = {}
) {
    const id =
        normalizePlanUserId5(
            userId
        );

    let records =
        Object.values(
            uploadIndex
        )
        .filter(
            record =>
                record &&
                record.userId ===
                    id &&
                record.deleted !==
                    true
        );

    if (
        options.extension
    ) {
        const ext =
            safeString(
                options.extension
            ).toLowerCase();

        records =
            records.filter(
                record =>
                    record.extension ===
                    ext
            );
    }

    if (
        options.search
    ) {
        const search =
            normalizeText(
                options.search
            );

        records =
            records.filter(
                record =>
                    normalizeText(
                        [
                            record.originalName,
                            record.extension,
                            record.mimeType
                        ].join(
                            " "
                        )
                    ).includes(
                        search
                    )
            );
    }

    records.sort(
        (a, b) =>
            new Date(
                b.createdAt
            ) -
            new Date(
                a.createdAt
            )
    );

    if (
        options.limit
    ) {
        records =
            records.slice(
                0,
                Math.max(
                    1,
                    Number(
                        options.limit
                    ) || 50
                )
            );
    }

    return clone(
        records
    );
}


// ============================================================
// FIND UPLOAD
// ============================================================

function findUpload6(
    uploadId,
    userId
) {
    const id =
        safeString(
            uploadId
        );

    const user =
        normalizePlanUserId5(
            userId
        );

    const record =
        uploadIndex[
            id
        ];

    if (
        !record ||
        record.userId !==
            user ||
        record.deleted ===
            true
    ) {
        return null;
    }

    return record;
}


// ============================================================
// FILE CONTENT
// ============================================================

function getUploadContent6(
    uploadId,
    userId
) {
    const record =
        findUpload6(
            uploadId,
            userId
        );

    if (!record) {
        return {
            success:
                false,

            error:
                "upload_not_found"
        };
    }

    if (
        !record.extracted
    ) {
        return {
            success:
                false,

            error:
                "text_extraction_unavailable"
        };
    }

    UPLOAD_STATE
        .readOperations++;

    return {
        success:
            true,

        uploadId:
            record.id,

        fileName:
            record.originalName,

        content:
            record.text,

        characters:
            record.text.length
    };
}


// ============================================================
// DELETE FILE
// ============================================================

function deleteUpload6(
    uploadId,
    userId
) {
    const record =
        findUpload6(
            uploadId,
            userId
        );

    if (!record) {
        return {
            success:
                false,

            error:
                "upload_not_found"
        };
    }

    let deletedBytes =
        0;

    try {
        if (
            fs.existsSync(
                record.path
            )
        ) {
            const stat =
                fs.statSync(
                    record.path
                );

            deletedBytes =
                stat.size;

            fs.unlinkSync(
                record.path
            );
        }
    } catch (error) {
        return {
            success:
                false,

            error:
                "file_delete_failed",

            message:
                error.message
        };
    }

    record.deleted =
        true;

    record.deletedAt =
        nowISO();

    record.updatedAt =
        nowISO();

    uploadIndex[
        record.id
    ] =
        record;

    saveUploadIndex6();

    addUploadHistory6(
        "deleted",
        record
    );

    UPLOAD_STATE
        .deleted++;

    UPLOAD_STATE
        .bytesDeleted +=
        deletedBytes;

    return {
        success:
            true,

        uploadId:
            record.id,

        deletedBytes
    };
}


// ============================================================
// STORAGE STATS
// ============================================================

function getUserUploadStats6(
    userId
) {
    const records =
        getUserUploadedFiles6(
            userId
        );

    const bytes =
        records.reduce(
            (
                total,
                record
            ) =>
                total +
                Number(
                    record.size ||
                    0
                ),
            0
        );

    return {
        userId:
            normalizePlanUserId5(
                userId
            ),

        files:
            records.length,

        bytes,

        mb:
            bytesToMB6(
                bytes
            ),

        maxStorageMB:
            UPLOAD_CONFIG
                .maxStoragePerUserMB,

        remainingMB:
            Math.max(
                0,
                UPLOAD_CONFIG
                    .maxStoragePerUserMB -
                    bytesToMB6(
                        bytes
                    )
            ),

        maxFiles:
            UPLOAD_CONFIG
                .maxFilesPerUser
    };
}


// ============================================================
// GLOBAL STORAGE STATS
// ============================================================

function getGlobalUploadStats6() {
    const records =
        Object.values(
            uploadIndex
        )
        .filter(
            record =>
                record &&
                record.deleted !==
                    true
        );

    const bytes =
        records.reduce(
            (
                total,
                record
            ) =>
                total +
                Number(
                    record.size ||
                    0
                ),
            0
        );

    return {
        files:
            records.length,

        bytes,

        mb:
            bytesToMB6(
                bytes
            ),

        users:
            new Set(
                records.map(
                    record =>
                        record.userId
                )
            ).size,

        uploads:
            UPLOAD_STATE
                .uploads,

        successful:
            UPLOAD_STATE
                .successful,

        failed:
            UPLOAD_STATE
                .failed,

        deleted:
            UPLOAD_STATE
                .deleted,

        extracted:
            UPLOAD_STATE
                .extractionSuccess,

        timestamp:
            nowISO()
    };
}


// ============================================================
// CLEANUP ORPHANS
// ============================================================

function cleanupOrphanUploads6() {
    let removed =
        0;

    for (
        const [
            id,
            record
        ]
        of Object.entries(
            uploadIndex
        )
    ) {
        if (
            !record ||
            record.deleted
        ) {
            continue;
        }

        if (
            !record.path ||
            !fs.existsSync(
                record.path
            )
        ) {
            record.deleted =
                true;

            record.deletedAt =
                nowISO();

            record.updatedAt =
                nowISO();

            removed++;
        }
    }

    if (
        removed
    ) {
        saveUploadIndex6();
    }

    return {
        success:
            true,

        removed
    };
}


// ============================================================
// UPLOAD MIDDLEWARE AVAILABILITY
// ============================================================

app.get(
    "/api/upload/status",
    (req, res) => {
        return res.json({
            success:
                true,

            ready:
                Boolean(
                    uploadMiddleware
                ),

            multer:
                Boolean(
                    multer
                ),

            config: {
                enabled:
                    UPLOAD_CONFIG
                        .enabled,

                maxFiles:
                    UPLOAD_CONFIG
                        .maxFilesPerRequest,

                absoluteMaxMB:
                    UPLOAD_CONFIG
                        .absoluteMaxMB,

                allowedExtensions:
                    UPLOAD_CONFIG
                        .allowedExtensions
                        .length,

                maxStoragePerUserMB:
                    UPLOAD_CONFIG
                        .maxStoragePerUserMB
            },

            stats:
                getGlobalUploadStats6()
        });
    }
);


// ============================================================
// UPLOAD API
// ============================================================

if (
    uploadMiddleware
) {
    app.post(
        "/api/upload",
        uploadMiddleware.array(
            "files",
            UPLOAD_CONFIG
                .maxFilesPerRequest
        ),
        async (
            req,
            res
        ) => {
            const userId =
                normalizePlanUserId5(
                    req.body &&
                    req.body.userId
                        ? req.body.userId
                        : "guest"
                );

            const files =
                Array.isArray(
                    req.files
                )
                    ? req.files
                    : [];

            UPLOAD_STATE
                .uploads +=
                files.length;

            if (
                !files.length
            ) {
                UPLOAD_STATE
                    .failed++;

                return res.status(
                    400
                ).json({
                    success:
                        false,

                    error:
                        "files_required"
                });
            }

            const accepted =
                [];

            const rejected =
                [];

            for (
                const file
                of files
            ) {
                const validation =
                    validateUploadFile6(
                        file,
                        userId
                    );

                if (
                    !validation.valid
                ) {
                    rejected.push({
                        originalName:
                            file.originalname,

                        error:
                            validation.error,

                        details:
                            validation
                    });

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
                    } catch {
                        // devam
                    }

                    continue;
                }

                const extraction =
                    extractUploadText6(
                        file.path,
                        file.originalname,
                        file.mimetype
                    );

                const record =
                    createUploadRecord6(
                        file,
                        userId,
                        extraction
                    );

                const extension =
                    getSafeExtension6(
                        file.originalname
                    );

                if (
                    extension ===
                    ".json"
                ) {
                    record.jsonValidation =
                        validateJSONUpload6(
                            file.path
                        );
                }

                if (
                    [
                        ".csv",
                        ".tsv"
                    ].includes(
                        extension
                    ) &&
                    extraction.extracted
                ) {
                    record.csvAnalysis =
                        analyzeCSVUpload6(
                            extraction.text
                        );
                }

                if (
                    [
                        ".js",
                        ".mjs",
                        ".cjs",
                        ".ts",
                        ".tsx",
                        ".jsx",
                        ".py",
                        ".java",
                        ".c",
                        ".cpp",
                        ".cs",
                        ".php",
                        ".go",
                        ".rs"
                    ].includes(
                        extension
                    ) &&
                    extraction.extracted
                ) {
                    record.codeAnalysis =
                        analyzeCodeUpload6(
                            extraction.text,
                            file.originalname
                        );
                }

                registerUpload6(
                    record
                );

                UPLOAD_STATE
                    .successful++;

                UPLOAD_STATE
                    .bytesUploaded +=
                    record.size;

                accepted.push(
                    {
                        ...record,

                        text:
                            undefined
                    }
                );

                addUploadHistory6(
                    "accepted",
                    record
                );
            }

            return res.json({
                success:
                    accepted.length >
                    0,

                userId,

                accepted,

                rejected,

                counts: {
                    accepted:
                        accepted.length,

                    rejected:
                        rejected.length
                },

                storage:
                    getUserUploadStats6(
                        userId
                    )
            });
        }
    );
} else {
    app.post(
        "/api/upload",
        (req, res) => {
            return res.status(
                503
            ).json({
                success:
                    false,

                error:
                    "multer_unavailable",

                message:
                    "Dosya yükleme için multer paketi gerekli."
            });
        }
    );
}


// ============================================================
// UPLOAD LIST
// ============================================================

app.get(
    "/api/upload/list",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            userId,

            files:
                listUserUploads6(
                    userId,
                    {
                        extension:
                            req.query.extension,

                        search:
                            req.query.search,

                        limit:
                            req.query.limit
                    }
                ),

            storage:
                getUserUploadStats6(
                    userId
                )
        });
    }
);


// ============================================================
// UPLOAD INFO
// ============================================================

app.get(
    "/api/upload/:uploadId",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const record =
            findUpload6(
                req.params.uploadId,
                userId
            );

        if (!record) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "upload_not_found"
            });
        }

        return res.json({
            success:
                true,

            file:
                clone(
                    record
                )
        });
    }
);


// ============================================================
// UPLOAD CONTENT
// ============================================================

app.get(
    "/api/upload/:uploadId/content",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const result =
            getUploadContent6(
                req.params.uploadId,
                userId
            );

        if (
            !result.success
        ) {
            return res.status(
                400
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// UPLOAD DOWNLOAD
// ============================================================

app.get(
    "/api/upload/:uploadId/download",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const record =
            findUpload6(
                req.params.uploadId,
                userId
            );

        if (!record) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "upload_not_found"
            });
        }

        if (
            !fs.existsSync(
                record.path
            )
        ) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "file_missing"
            });
        }

        UPLOAD_STATE
            .downloaded++;

        res.download(
            record.path,
            record.originalName,
            error => {
                if (
                    error
                ) {
                    appendLog(
                        SYSTEM_LOG_FILE,
                        "upload_download_error",
                        {
                            uploadId:
                                record.id,

                            message:
                                error.message
                        }
                    );
                }
            }
        );
    }
);


// ============================================================
// UPLOAD DELETE
// ============================================================

app.delete(
    "/api/upload/:uploadId",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const result =
            deleteUpload6(
                req.params.uploadId,
                userId
            );

        if (
            !result.success
        ) {
            return res.status(
                404
            ).json(
                result
            );
        }

        return res.json(
            result
        );
    }
);


// ============================================================
// UPLOAD SEARCH
// ============================================================

app.get(
    "/api/upload/search",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const query =
            safeString(
                req.query.q ||
                req.query.search
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "query_required"
            });
        }

        UPLOAD_STATE
            .searchOperations++;

        return res.json({
            success:
                true,

            userId,

            query,

            results:
                listUserUploads6(
                    userId,
                    {
                        search:
                            query,

                        limit:
                            100
                    }
                )
        });
    }
);


// ============================================================
// STORAGE STATS
// ============================================================

app.get(
    "/api/upload/stats",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            user:
                getUserUploadStats6(
                    userId
                ),

            global:
                getGlobalUploadStats6()
        });
    }
);


// ============================================================
// CLEANUP API
// ============================================================

app.post(
    "/api/upload/cleanup",
    (req, res) => {
        return res.json(
            cleanupOrphanUploads6()
        );
    }
);


// ============================================================
// UPLOAD HISTORY
// ============================================================

app.get(
    "/api/upload/history",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit ||
                        50
                    ) || 50,
                    1
                ),
                UPLOAD_CONFIG
                    .historyLimit
            );

        const filtered =
            uploadHistory
                .filter(
                    item =>
                        !item.userId ||
                        item.userId ===
                            userId
                )
                .slice(
                    -limit
                )
                .reverse();

        return res.json({
            success:
                true,

            userId,

            history:
                clone(
                    filtered
                )
        });
    }
);


// ============================================================
// UPLOAD CONFIG
// ============================================================

app.get(
    "/api/upload/config",
    (req, res) => {
        return res.json({
            success:
                true,

            config: {
                enabled:
                    UPLOAD_CONFIG
                        .enabled,

                maxFiles:
                    UPLOAD_CONFIG
                        .maxFilesPerRequest,

                absoluteMaxMB:
                    UPLOAD_CONFIG
                        .absoluteMaxMB,

                maxStoragePerUserMB:
                    UPLOAD_CONFIG
                        .maxStoragePerUserMB,

                allowedExtensions:
                    clone(
                        UPLOAD_CONFIG
                            .allowedExtensions
                    )
            }
        });
    }
);


// ============================================================
// UPLOAD FILE CONTENT SEARCH
// ============================================================

function searchInsideUpload6(
    record,
    query,
    maxMatches = 50
) {
    if (
        !record ||
        !record.extracted ||
        !record.text
    ) {
        return [];
    }

    const needle =
        normalizeText(
            query
        );

    if (!needle) {
        return [];
    }

    const lines =
        record.text.split(
            /\r?\n/
        );

    const results =
        [];

    for (
        let index = 0;
        index <
            lines.length;
        index++
    ) {
        const line =
            lines[index];

        if (
            normalizeText(
                line
            ).includes(
                needle
            )
        ) {
            results.push({
                line:
                    index + 1,

                text:
                    line.slice(
                        0,
                        2000
                    )
            });

            if (
                results.length >=
                maxMatches
            ) {
                break;
            }
        }
    }

    return results;
}


// ============================================================
// SEARCH INSIDE USER FILES
// ============================================================

app.get(
    "/api/upload/search-content",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const query =
            safeString(
                req.query.q ||
                req.query.search
            );

        if (!query) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "query_required"
            });
        }

        const files =
            getUserUploadedFiles6(
                userId
            );

        const matches =
            [];

        for (
            const file
            of files
        ) {
            const lines =
                searchInsideUpload6(
                    file,
                    query
                );

            if (
                lines.length
            ) {
                matches.push({
                    uploadId:
                        file.id,

                    fileName:
                        file.originalName,

                    matches:
                        lines
                });
            }
        }

        UPLOAD_STATE
            .searchOperations++;

        return res.json({
            success:
                true,

            query,

            files:
                matches
                    .length,

            results:
                matches
        });
    }
);


// ============================================================
// TEXT PREVIEW
// ============================================================

app.get(
    "/api/upload/:uploadId/preview",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        const record =
            findUpload6(
                req.params.uploadId,
                userId
            );

        if (!record) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "upload_not_found"
            });
        }

        const max =
            Math.min(
                Math.max(
                    Number(
                        req.query.max ||
                        5000
                    ) || 5000,
                    100
                ),
                50000
            );

        return res.json({
            success:
                true,

            uploadId:
                record.id,

            fileName:
                record.originalName,

            preview:
                record.extracted
                    ? record.text.slice(
                        0,
                        max
                    )
                    : "",

            truncated:
                Boolean(
                    record.text &&
                    record.text.length >
                        max
                )
        });
    }
);


// ============================================================
// UPLOAD TYPE STATS
// ============================================================

function getUploadTypeStats6(
    userId
) {
    const records =
        getUserUploadedFiles6(
            userId
        );

    const stats =
        {};

    for (
        const record
        of records
    ) {
        const ext =
            record.extension ||
            ".unknown";

        if (
            !stats[ext]
        ) {
            stats[ext] = {
                files:
                    0,

                bytes:
                    0
            };
        }

        stats[ext]
            .files++;

        stats[ext]
            .bytes +=
            Number(
                record.size ||
                0
            );
    }

    return stats;
}


app.get(
    "/api/upload/type-stats",
    (req, res) => {
        const userId =
            normalizePlanUserId5(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            userId,

            stats:
                getUploadTypeStats6(
                    userId
                )
        });
    }
);


// ============================================================
// MASS UPLOAD RULE MATRIX
// ============================================================

const UPLOAD_RULE_ACTIONS_6 = [
    "upload",
    "read",
    "preview",
    "download",
    "delete",
    "search",
    "analyze",
    "extract"
];

const UPLOAD_RULE_TYPES_6 = [
    "text",
    "code",
    "json",
    "csv",
    "markdown",
    "html",
    "css",
    "xml",
    "yaml",
    "log"
];

const UPLOAD_RULE_PLANS_6 = [
    "free",
    "pro",
    "plus",
    "ultra",
    "developer"
];

const UPLOAD_RUNTIME_RULES_6 = [];

for (
    const action
    of UPLOAD_RULE_ACTIONS_6
) {
    for (
        const type
        of UPLOAD_RULE_TYPES_6
    ) {
        for (
            const plan
            of UPLOAD_RULE_PLANS_6
        ) {
            UPLOAD_RUNTIME_RULES_6.push({
                id:
                    UPLOAD_RUNTIME_RULES_6
                        .length +
                    1,

                action,

                type,

                plan,

                key:
                    `${plan}:${type}:${action}`,

                enabled:
                    true
            });
        }
    }
}


// ============================================================
// UPLOAD RULE API
// ============================================================

app.get(
    "/api/upload/rules",
    (req, res) => {
        return res.json({
            success:
                true,

            count:
                UPLOAD_RUNTIME_RULES_6
                    .length,

            rules:
                UPLOAD_RUNTIME_RULES_6
        });
    }
);


// ============================================================
// SOCKET.IO UPLOAD
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:upload:stats",
                payload => {
                    const userId =
                        normalizePlanUserId5(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    socket.emit(
                        "turkai:upload:stats",
                        {
                            success:
                                true,

                            stats:
                                getUserUploadStats6(
                                    userId
                                )
                        }
                    );
                }
            );

            socket.on(
                "turkai:upload:list",
                payload => {
                    const userId =
                        normalizePlanUserId5(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    socket.emit(
                        "turkai:upload:list",
                        {
                            success:
                                true,

                            files:
                                listUserUploads6(
                                    userId,
                                    {
                                        limit:
                                            100
                                    }
                                )
                        }
                    );
                }
            );
        }
    );
}


// ============================================================
// UPLOAD STATE
// ============================================================

serverState.uploads = {
    state:
        UPLOAD_STATE,

    config:
        UPLOAD_CONFIG,

    index:
        uploadIndex,

    history:
        uploadHistory,

    uploadMiddleware,

    list:
        listUserUploads6,

    find:
        findUpload6,

    content:
        getUploadContent6,

    delete:
        deleteUpload6,

    stats:
        getUserUploadStats6,

    globalStats:
        getGlobalUploadStats6,

    cleanup:
        cleanupOrphanUploads6,

    extractText:
        extractUploadText6,

    validate:
        validateUploadFile6,

    searchContent:
        searchInsideUpload6,

    typeStats:
        getUploadTypeStats6
};


// ============================================================
// PART 6 READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 6 Upload/File Engine yüklendi."
);

console.log(
    "[TürkAI] Multer:",
    multer
        ? "AKTİF"
        : "YOK"
);

console.log(
    "[TürkAI] Upload:",
    uploadMiddleware
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "[TürkAI] Extensions:",
    UPLOAD_CONFIG
        .allowedExtensions
        .length
);

console.log(
    "[TürkAI] Runtime rules:",
    UPLOAD_RUNTIME_RULES_6
        .length
);

console.log(
    "[TürkAI] /api/upload"
);

console.log(
    "[TürkAI] /api/upload/list"
);

console.log(
    "[TürkAI] /api/upload/search-content"
);

console.log(
    "[TürkAI] /api/upload/:uploadId/download"
);

console.log(
    "[TürkAI] /api/upload/:uploadId"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 6 END
// ============================================================
//
// PART 7:
//
// - Görsel üretim altyapısı
// - Video üretim altyapısı
// - job queue
// - job status
// - media history
// - image generation provider
// - video generation provider
// - dosya çıktıları
// - progress
// - medya temizleme
//
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 7 / 10
// IMAGE + VIDEO + MEDIA JOB ENGINE
// ============================================================
//
// Bu bölüm:
//
// - Görsel üretim kuyruğu
// - Video üretim kuyruğu
// - Job ID sistemi
// - Job progress
// - Job cancellation
// - Job retry
// - Media history
// - Media metadata
// - Görsel çıktı kaydetme
// - SVG local fallback
// - Uzaktan image provider
// - Uzaktan video provider
// - Polling
// - Kullanıcı bazlı medya klasörleri
// - Plan bazlı image/video limitleri
// - Media storage
// - Media cleanup
// - Socket.IO progress
// - Image/Video API aliasları
// - Diagnostics
//
// ============================================================


// ============================================================
// CHILD PROCESS
// ============================================================

const childProcess7 =
    require("child_process");


// ============================================================
// MEDIA DIRECTORIES
// ============================================================

const MEDIA_IMAGE_DIR_7 =
    path.join(
        MEDIA_DIR,
        "images"
    );

const MEDIA_VIDEO_DIR_7 =
    path.join(
        MEDIA_DIR,
        "videos"
    );

const MEDIA_PREVIEW_DIR_7 =
    path.join(
        MEDIA_DIR,
        "previews"
    );

const MEDIA_META_DIR_7 =
    path.join(
        MEDIA_DIR,
        "metadata"
    );

const MEDIA_JOB_DIR_7 =
    path.join(
        MEDIA_DIR,
        "jobs"
    );

const MEDIA_TEMP_DIR_7 =
    path.join(
        MEDIA_DIR,
        "temp"
    );

const MEDIA_HISTORY_FILE_7 =
    path.join(
        MEDIA_DIR,
        "history.json"
    );

const MEDIA_INDEX_FILE_7 =
    path.join(
        MEDIA_DIR,
        "index.json"
    );


for (
    const dir of [
        MEDIA_IMAGE_DIR_7,
        MEDIA_VIDEO_DIR_7,
        MEDIA_PREVIEW_DIR_7,
        MEDIA_META_DIR_7,
        MEDIA_JOB_DIR_7,
        MEDIA_TEMP_DIR_7
    ]
) {
    try {
        fs.mkdirSync(
            dir,
            {
                recursive:
                    true
            }
        );
    } catch {
        // devam
    }
}


// ============================================================
// MEDIA STATE
// ============================================================

const MEDIA_STATE_7 = {
    startedAt:
        nowISO(),

    totalJobs:
        0,

    imageJobs:
        0,

    videoJobs:
        0,

    queuedJobs:
        0,

    runningJobs:
        0,

    completedJobs:
        0,

    failedJobs:
        0,

    cancelledJobs:
        0,

    retriedJobs:
        0,

    providerCalls:
        0,

    providerFailures:
        0,

    localFallbacks:
        0,

    bytesGenerated:
        0,

    activeWorkers:
        0,

    lastJobAt:
        null
};


// ============================================================
// MEDIA CONFIG
// ============================================================

const MEDIA_CONFIG_7 = {
    enabled:
        true,

    maxConcurrentJobs:
        2,

    maxPromptLength:
        5000,

    maxNegativePromptLength:
        2000,

    maxJobsPerUser:
        100,

    maxStoredMediaPerUser:
        500,

    jobTimeoutMS:
        15 * 60 * 1000,

    pollingIntervalMS:
        3000,

    providerTimeoutMS:
        120000,

    imageFormats: [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "svg"
    ],

    videoFormats: [
        "mp4",
        "webm",
        "mov"
    ],

    defaultImageFormat:
        "png",

    defaultVideoFormat:
        "mp4",

    defaultImageWidth:
        1024,

    defaultImageHeight:
        1024,

    defaultVideoWidth:
        1280,

    defaultVideoHeight:
        720,

    maxImageWidth:
        4096,

    maxImageHeight:
        4096,

    maxVideoWidth:
        3840,

    maxVideoHeight:
        2160,

    maxVideoSeconds:
        60,

    imageProvider:
        safeString(
            process.env
                .TURKAI_IMAGE_PROVIDER ||
            "auto"
        ),

    videoProvider:
        safeString(
            process.env
                .TURKAI_VIDEO_PROVIDER ||
            "auto"
        ),

    imageApiURL:
        safeString(
            process.env
                .TURKAI_IMAGE_API_URL
        ),

    videoApiURL:
        safeString(
            process.env
                .TURKAI_VIDEO_API_URL
        ),

    mediaApiKey:
        safeString(
            process.env
                .TURKAI_MEDIA_API_KEY
        ),

    openAIKey:
        safeString(
            process.env
                .OPENAI_API_KEY
        ),

    openAIImageModel:
        safeString(
            process.env
                .TURKAI_OPENAI_IMAGE_MODEL ||
            "gpt-image-1"
        )
};


// ============================================================
// MEDIA HISTORY / INDEX
// ============================================================

let mediaHistory7 =
    readJSON(
        MEDIA_HISTORY_FILE_7,
        []
    );

if (
    !Array.isArray(
        mediaHistory7
    )
) {
    mediaHistory7 =
        [];
}


let mediaIndex7 =
    readJSON(
        MEDIA_INDEX_FILE_7,
        {}
    );

if (
    !mediaIndex7 ||
    typeof mediaIndex7 !==
        "object" ||
    Array.isArray(
        mediaIndex7
    )
) {
    mediaIndex7 =
        {};
}


// ============================================================
// MEDIA JOBS
// ============================================================

const mediaJobs7 =
    new Map();

const mediaQueue7 =
    [];

const mediaActive7 =
    new Set();

const mediaTimers7 =
    new Map();


// ============================================================
// MEDIA PROVIDERS
// ============================================================

const MEDIA_PROVIDERS_7 = {
    local: {
        id:
            "local",

        enabled:
            true,

        kind:
            "local"
    },

    custom: {
        id:
            "custom",

        enabled:
            Boolean(
                MEDIA_CONFIG_7
                    .imageApiURL ||
                MEDIA_CONFIG_7
                    .videoApiURL
            ),

        kind:
            "http"
    },

    openai: {
        id:
            "openai",

        enabled:
            Boolean(
                MEDIA_CONFIG_7
                    .openAIKey
            ),

        kind:
            "openai"
    }
};


// ============================================================
// MEDIA HELPERS
// ============================================================

function mediaUserId7(
    userId
) {
    try {
        return normalizePlanUserId5(
            userId ||
            "guest"
        );
    } catch {
        return (
            sanitizePathPart6(
                userId ||
                "guest"
            ) ||
            "guest"
        );
    }
}


function mediaSafeName7(
    name
) {
    return safeString(
        name ||
        "media"
    )
        .replace(
            /[^a-zA-Z0-9ğĞüÜşŞıİöÖçÇ._-]/g,
            "_"
        )
        .slice(
            0,
            120
        );
}


function mediaUserDirectory7(
    userId,
    type
) {
    const user =
        mediaUserId7(
            userId
        );

    const root =
        type ===
        "video"
            ? MEDIA_VIDEO_DIR_7
            : MEDIA_IMAGE_DIR_7;

    const directory =
        path.join(
            root,
            mediaSafeName7(
                user
            )
        );

    fs.mkdirSync(
        directory,
        {
            recursive:
                true
        }
    );

    return directory;
}


function mediaExtension7(
    format,
    type
) {
    const value =
        safeString(
            format
        ).toLowerCase();

    if (
        type ===
        "video"
    ) {
        return MEDIA_CONFIG_7
            .videoFormats
            .includes(
                value
            )
            ? value
            : MEDIA_CONFIG_7
                .defaultVideoFormat;
    }

    return MEDIA_CONFIG_7
        .imageFormats
        .includes(
            value
        )
        ? value
        : MEDIA_CONFIG_7
            .defaultImageFormat;
}


// ============================================================
// MEDIA PLAN LIMITS
// ============================================================

function getMediaPlan7(
    userId
) {
    try {
        const data =
            getUserPlanData5(
                mediaUserId7(
                    userId
                )
            );

        return data &&
            data.plan
            ? data.plan
            : null;
    } catch {
        return null;
    }
}


function getMediaLimit7(
    userId,
    type
) {
    const plan =
        getMediaPlan7(
            userId
        );

    if (!plan) {
        return 0;
    }

    if (
        type ===
        "video"
    ) {
        return Math.max(
            0,
            Number(
                plan.videos ||
                0
            )
        );
    }

    return Math.max(
        0,
        Number(
            plan.images ||
            0
        )
    );
}


// ============================================================
// MEDIA USAGE WRAPPER
// ============================================================

function consumeMediaUsage7(
    userId,
    type,
    amount = 1
) {
    try {
        if (
            typeof consumeUserUsage5 ===
            "function"
        ) {
            try {
                return consumeUserUsage5(
                    userId,
                    type,
                    amount
                );
            } catch {
                try {
                    return consumeUserUsage5(
                        userId,
                        {
                            type,
                            amount
                        }
                    );
                } catch {
                    // fallback
                }
            }
        }
    } catch {
        // fallback
    }

    return {
        success:
            true,

        skipped:
            true
    };
}


// ============================================================
// MEDIA JOB LIMIT
// ============================================================

function canCreateMediaJob7(
    userId,
    type
) {
    const current =
        Array.from(
            mediaJobs7.values()
        )
        .filter(
            job =>
                job &&
                job.userId ===
                    mediaUserId7(
                        userId
                    ) &&
                job.type ===
                    type &&
                ![
                    "completed",
                    "failed",
                    "cancelled"
                ].includes(
                    job.status
                )
        )
        .length;

    if (
        current >=
        MEDIA_CONFIG_7
            .maxJobsPerUser
    ) {
        return {
            allowed:
                false,

            error:
                "media_job_limit"
        };
    }

    return {
        allowed:
            true
    };
}


// ============================================================
// MEDIA PROMPT NORMALIZATION
// ============================================================

function normalizeMediaPrompt7(
    prompt
) {
    return cleanText(
        safeString(
            prompt
        ),
        MEDIA_CONFIG_7
            .maxPromptLength
    );
}


function normalizeNegativePrompt7(
    prompt
) {
    return cleanText(
        safeString(
            prompt
        ),
        MEDIA_CONFIG_7
            .maxNegativePromptLength
    );
}


// ============================================================
// DIMENSION NORMALIZATION
// ============================================================

function normalizeMediaDimensions7(
    body,
    type
) {
    const isVideo =
        type ===
        "video";

    const maxWidth =
        isVideo
            ? MEDIA_CONFIG_7
                .maxVideoWidth
            : MEDIA_CONFIG_7
                .maxImageWidth;

    const maxHeight =
        isVideo
            ? MEDIA_CONFIG_7
                .maxVideoHeight
            : MEDIA_CONFIG_7
                .maxImageHeight;

    const defaultWidth =
        isVideo
            ? MEDIA_CONFIG_7
                .defaultVideoWidth
            : MEDIA_CONFIG_7
                .defaultImageWidth;

    const defaultHeight =
        isVideo
            ? MEDIA_CONFIG_7
                .defaultVideoHeight
            : MEDIA_CONFIG_7
                .defaultImageHeight;

    let width =
        Number(
            body &&
            body.width
        ) ||
        defaultWidth;

    let height =
        Number(
            body &&
            body.height
        ) ||
        defaultHeight;

    width =
        Math.min(
            Math.max(
                Math.round(
                    width
                ),
                128
            ),
            maxWidth
        );

    height =
        Math.min(
            Math.max(
                Math.round(
                    height
                ),
                128
            ),
            maxHeight
        );

    return {
        width,
        height
    };
}


// ============================================================
// JOB CREATION
// ============================================================

function createMediaJob7(
    options = {}
) {
    const type =
        options.type ===
        "video"
            ? "video"
            : "image";

    const id =
        createId(
            type ===
                "video"
                ? "video-job"
                : "image-job"
        );

    const userId =
        mediaUserId7(
            options.userId
        );

    const job = {
        id,

        userId,

        type,

        prompt:
            normalizeMediaPrompt7(
                options.prompt
            ),

        negativePrompt:
            normalizeNegativePrompt7(
                options.negativePrompt
            ),

        format:
            mediaExtension7(
                options.format,
                type
            ),

        width:
            Number(
                options.width
            ) || (
                type ===
                "video"
                    ? MEDIA_CONFIG_7
                        .defaultVideoWidth
                    : MEDIA_CONFIG_7
                        .defaultImageWidth
            ),

        height:
            Number(
                options.height
            ) || (
                type ===
                "video"
                    ? MEDIA_CONFIG_7
                        .defaultVideoHeight
                    : MEDIA_CONFIG_7
                        .defaultImageHeight
            ),

        seconds:
            type ===
            "video"
                ? Math.min(
                    Math.max(
                        Number(
                            options.seconds
                        ) || 5,
                        1
                    ),
                    MEDIA_CONFIG_7
                        .maxVideoSeconds
                )
                : 0,

        quality:
            safeString(
                options.quality ||
                "standard"
            ),

        style:
            safeString(
                options.style ||
                "natural"
            ),

        model:
            safeString(
                options.model
            ),

        provider:
            safeString(
                options.provider ||
                "auto"
            ),

        status:
            "queued",

        progress:
            0,

        stage:
            "queued",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        startedAt:
            null,

        completedAt:
            null,

        failedAt:
            null,

        cancelledAt:
            null,

        error:
            null,

        providerJobId:
            null,

        output: {
            path:
                null,

            url:
                null,

            fileName:
                null,

            mimeType:
                null,

            bytes:
                0,

            format:
                null
        },

        metadata: {
            source:
                "turkai",

            version:
                SERVER_VERSION,

            localFallback:
                false
        },

        cancelRequested:
            false,

        retryCount:
            0
    };

    return job;
}


// ============================================================
// JOB PERSISTENCE
// ============================================================

function saveMediaIndex7() {
    return writeJSON(
        MEDIA_INDEX_FILE_7,
        mediaIndex7
    );
}


function saveMediaHistory7() {
    mediaHistory7 =
        mediaHistory7.slice(
            -3000
        );

    return writeJSON(
        MEDIA_HISTORY_FILE_7,
        mediaHistory7
    );
}


function persistMediaJob7(
    job
) {
    if (!job) {
        return;
    }

    mediaIndex7[
        job.id
    ] =
        clone(
            job
        );

    saveMediaIndex7();

    const historyItem = {
        id:
            createId(
                "media-event"
            ),

        jobId:
            job.id,

        userId:
            job.userId,

        type:
            job.type,

        status:
            job.status,

        stage:
            job.stage,

        progress:
            job.progress,

        timestamp:
            nowISO()
    };

    mediaHistory7.push(
        historyItem
    );

    saveMediaHistory7();
}


// ============================================================
// SOCKET MEDIA EVENTS
// ============================================================

function emitMediaJob7(
    event,
    job
) {
    try {
        if (!io || !job) {
            return;
        }

        io.emit(
            event,
            clone(
                job
            )
        );

        io.to(
            `turkai:user:${job.userId}`
        ).emit(
            event,
            clone(
                job
            )
        );
    } catch {
        // devam
    }
}


function updateMediaJob7(
    job,
    patch = {}
) {
    if (!job) {
        return;
    }

    Object.assign(
        job,
        patch
    );

    job.updatedAt =
        nowISO();

    mediaJobs7.set(
        job.id,
        job
    );

    persistMediaJob7(
        job
    );

    emitMediaJob7(
        "turkai:media:job",
        job
    );

    emitMediaJob7(
        `turkai:media:${job.type}:progress`,
        job
    );
}


// ============================================================
// MEDIA JOBS FROM MEMORY
// ============================================================

for (
    const [
        id,
        saved
    ]
    of Object.entries(
        mediaIndex7
    )
) {
    if (
        saved &&
        [
            "queued",
            "processing",
            "polling"
        ].includes(
            saved.status
        )
    ) {
        saved.status =
            "failed";

        saved.error =
            "server_restart";

        saved.failedAt =
            nowISO();

        saved.updatedAt =
            nowISO();
    }

    if (saved) {
        mediaJobs7.set(
            id,
            saved
        );
    }
}


// ============================================================
// MEDIA FILE NAME
// ============================================================

function buildMediaFileName7(
    job
) {
    const shortId =
        safeString(
            job.id
        ).replace(
            /[^a-zA-Z0-9_-]/g,
            ""
        );

    return (
        `${Date.now()}_${shortId}.${job.format}`
    );
}


// ============================================================
// WRITE LOCAL SVG
// ============================================================

function createLocalSVG7(
    job
) {
    const prompt =
        safeString(
            job.prompt,
            "TürkAI"
        );

    const escaped =
        prompt
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            );

    const width =
        Math.max(
            320,
            Number(
                job.width
            ) || 1024
        );

    const height =
        Math.max(
            320,
            Number(
                job.height
            ) || 1024
        );

    return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}"
     height="${height}"
     viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg"
      x1="0%" y1="0%"
      x2="100%" y2="100%">
      <stop offset="0%" stop-color="#081017"/>
      <stop offset="50%" stop-color="#10192B"/>
      <stop offset="100%" stop-color="#091318"/>
    </linearGradient>

    <radialGradient id="glow"
      cx="50%" cy="40%" r="70%">
      <stop offset="0%"
            stop-color="#20C7D6"
            stop-opacity="0.35"/>
      <stop offset="100%"
            stop-color="#20C7D6"
            stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="100%"
        height="100%"
        fill="url(#bg)"/>

  <rect width="100%"
        height="100%"
        fill="url(#glow)"/>

  <circle
      cx="${width / 2}"
      cy="${height * 0.35}"
      r="${Math.min(
          width,
          height
      ) * 0.12}"
      fill="none"
      stroke="#20C7D6"
      stroke-width="5"
      opacity="0.85"/>

  <circle
      cx="${width / 2}"
      cy="${height * 0.35}"
      r="${Math.min(
          width,
          height
      ) * 0.18}"
      fill="none"
      stroke="#F2B632"
      stroke-width="2"
      opacity="0.45"/>

  <text
      x="50%"
      y="${height * 0.60}"
      dominant-baseline="middle"
      text-anchor="middle"
      fill="#FFFFFF"
      font-size="${Math.max(
          20,
          Math.round(
              width / 28
          )
      )}"
      font-family="Arial, sans-serif"
      font-weight="700">
      TürkAI
  </text>

  <text
      x="50%"
      y="${height * 0.68}"
      dominant-baseline="middle"
      text-anchor="middle"
      fill="#B8C4D4"
      font-size="${Math.max(
          12,
          Math.round(
              width / 48
          )
      )}"
      font-family="Arial, sans-serif">
      ${escaped.slice(
          0,
          120
      )}
  </text>

  <text
      x="50%"
      y="${height * 0.92}"
      dominant-baseline="middle"
      text-anchor="middle"
      fill="#6E8196"
      font-size="${Math.max(
          10,
          Math.round(
              width / 80
          )
      )}"
      font-family="Arial, sans-serif">
      TürkAI Local Media Engine
  </text>
</svg>
`;
}


// ============================================================
// LOCAL IMAGE GENERATOR
// ============================================================

async function generateLocalImage7(
    job
) {
    const directory =
        mediaUserDirectory7(
            job.userId,
            "image"
        );

    const fileName =
        buildMediaFileName7({
            ...job,

            format:
                "svg"
        });

    const filePath =
        path.join(
            directory,
            fileName
        );

    const svg =
        createLocalSVG7(
            job
        );

    fs.writeFileSync(
        filePath,
        svg,
        "utf8"
    );

    const stat =
        fs.statSync(
            filePath
        );

    return {
        path:
            filePath,

        fileName,

        format:
            "svg",

        mimeType:
            "image/svg+xml",

        bytes:
            stat.size,

        localFallback:
            true
    };
}


// ============================================================
// GENERIC FETCH TIMEOUT
// ============================================================

async function mediaFetch7(
    url,
    options = {},
    timeout =
        MEDIA_CONFIG_7
            .providerTimeoutMS
) {
    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => {
                controller.abort();
            },
            timeout
        );

    try {
        const response =
            await fetch(
                url,
                {
                    ...options,
                    signal:
                        controller
                            .signal
                }
            );

        return response;
    } finally {
        clearTimeout(
            timer
        );
    }
}


// ============================================================
// DATA URL PARSER
// ============================================================

function parseDataURL7(
    value
) {
    const input =
        safeString(
            value
        );

    const match =
        input.match(
            /^data:([^;,]+)?(;base64)?,(.*)$/s
        );

    if (!match) {
        return null;
    }

    const mimeType =
        match[1] ||
        "application/octet-stream";

    const isBase64 =
        Boolean(
            match[2]
        );

    const body =
        match[3] ||
        "";

    try {
        const buffer =
            isBase64
                ? Buffer.from(
                    body,
                    "base64"
                )
                : Buffer.from(
                    decodeURIComponent(
                        body
                    )
                );

        return {
            mimeType,
            buffer
        };
    } catch {
        return null;
    }
}


// ============================================================
// SAVE BUFFER
// ============================================================

function saveMediaBuffer7(
    job,
    buffer,
    extension,
    mimeType
) {
    const directory =
        mediaUserDirectory7(
            job.userId,
            job.type
        );

    const format =
        mediaExtension7(
            extension,
            job.type
        );

    const fileName =
        buildMediaFileName7({
            ...job,
            format
        });

    const filePath =
        path.join(
            directory,
            fileName
        );

    fs.writeFileSync(
        filePath,
        buffer
    );

    const stat =
        fs.statSync(
            filePath
        );

    return {
        path:
            filePath,

        fileName,

        format,

        mimeType:
            mimeType ||
            (
                job.type ===
                "video"
                    ? "video/mp4"
                    : "image/png"
            ),

        bytes:
            stat.size,

        localFallback:
            false
    };
}


// ============================================================
// DOWNLOAD REMOTE FILE
// ============================================================

async function downloadMediaURL7(
    job,
    url,
    expectedFormat = null
) {
    const remote =
        safeString(
            url
        );

    if (
        !/^https?:\/\//i.test(
            remote
        )
    ) {
        return null;
    }

    const response =
        await mediaFetch7(
            remote,
            {
                method:
                    "GET"
            },
            MEDIA_CONFIG_7
                .providerTimeoutMS
        );

    if (
        !response.ok
    ) {
        throw new Error(
            `remote_download_${response.status}`
        );
    }

    const buffer =
        Buffer.from(
            await response.arrayBuffer()
        );

    const contentType =
        safeString(
            response.headers.get(
                "content-type"
            )
        );

    let extension =
        expectedFormat ||
        job.format;

    if (
        contentType.includes(
            "png"
        )
    ) {
        extension =
            "png";
    } else if (
        contentType.includes(
            "jpeg"
        ) ||
        contentType.includes(
            "jpg"
        )
    ) {
        extension =
            "jpg";
    } else if (
        contentType.includes(
            "webp"
        )
    ) {
        extension =
            "webp";
    } else if (
        contentType.includes(
            "mp4"
        )
    ) {
        extension =
            "mp4";
    } else if (
        contentType.includes(
            "webm"
        )
    ) {
        extension =
            "webm";
    }

    return saveMediaBuffer7(
        job,
        buffer,
        extension,
        contentType
    );
}


// ============================================================
// CUSTOM IMAGE PROVIDER
// ============================================================

async function callCustomImageProvider7(
    job
) {
    if (
        !MEDIA_CONFIG_7
            .imageApiURL
    ) {
        throw new Error(
            "custom_image_provider_not_configured"
        );
    }

    MEDIA_STATE_7
        .providerCalls++;

    const headers = {
        "Content-Type":
            "application/json"
    };

    if (
        MEDIA_CONFIG_7
            .mediaApiKey
    ) {
        headers.Authorization =
            `Bearer ${MEDIA_CONFIG_7.mediaApiKey}`;
    }

    const response =
        await mediaFetch7(
            MEDIA_CONFIG_7
                .imageApiURL,
            {
                method:
                    "POST",

                headers,

                body:
                    JSON.stringify({
                        task:
                            "image_generation",

                        type:
                            "image",

                        prompt:
                            job.prompt,

                        negative_prompt:
                            job.negativePrompt,

                        width:
                            job.width,

                        height:
                            job.height,

                        format:
                            job.format,

                        quality:
                            job.quality,

                        style:
                            job.style,

                        model:
                            job.model ||
                            undefined
                    })
            }
        );

    if (
        !response.ok
    ) {
        MEDIA_STATE_7
            .providerFailures++;

        throw new Error(
            `custom_image_${response.status}`
        );
    }

    const data =
        await response.json();

    const result =
        data &&
        (
            data.data ||
            data.result ||
            data.output ||
            data
        );

    if (
        typeof result ===
        "string"
    ) {
        if (
            result.startsWith(
                "data:"
            )
        ) {
            const parsed =
                parseDataURL7(
                    result
                );

            if (
                parsed
            ) {
                return saveMediaBuffer7(
                    job,
                    parsed.buffer,
                    job.format,
                    parsed.mimeType
                );
            }
        }

        if (
            /^https?:\/\//i.test(
                result
            )
        ) {
            return downloadMediaURL7(
                job,
                result
            );
        }
    }

    const url =
        result &&
        (
            result.url ||
            result.image_url ||
            result.imageUrl
        );

    if (
        url
    ) {
        return downloadMediaURL7(
            job,
            url
        );
    }

    const base64 =
        result &&
        (
            result.b64_json ||
            result.base64 ||
            result.image_base64
        );

    if (
        base64
    ) {
        const buffer =
            Buffer.from(
                base64,
                "base64"
            );

        return saveMediaBuffer7(
            job,
            buffer,
            job.format,
            job.format ===
                "jpg"
                ? "image/jpeg"
                : `image/${job.format}`
        );
    }

    throw new Error(
        "custom_image_empty_result"
    );
}


// ============================================================
// OPENAI IMAGE PROVIDER
// ============================================================

async function callOpenAIImageProvider7(
    job
) {
    if (
        !MEDIA_CONFIG_7
            .openAIKey
    ) {
        throw new Error(
            "openai_image_key_missing"
        );
    }

    MEDIA_STATE_7
        .providerCalls++;

    const response =
        await mediaFetch7(
            "https://api.openai.com/v1/images/generations",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${MEDIA_CONFIG_7.openAIKey}`
                },

                body:
                    JSON.stringify({
                        model:
                            job.model ||
                            MEDIA_CONFIG_7
                                .openAIImageModel,

                        prompt:
                            job.prompt,

                        size:
                            `${job.width}x${job.height}`,

                        quality:
                            job.quality,

                        n:
                            1
                    })
            }
        );

    if (
        !response.ok
    ) {
        MEDIA_STATE_7
            .providerFailures++;

        const errorText =
            await response
                .text()
                .catch(
                    () => ""
                );

        throw new Error(
            `openai_image_${response.status}_${errorText.slice(
                0,
                250
            )}`
        );
    }

    const data =
        await response.json();

    const item =
        Array.isArray(
            data &&
            data.data
        )
            ? data.data[0]
            : null;

    if (!item) {
        throw new Error(
            "openai_image_empty_result"
        );
    }

    if (
        item.b64_json
    ) {
        const buffer =
            Buffer.from(
                item.b64_json,
                "base64"
            );

        return saveMediaBuffer7(
            job,
            buffer,
            job.format,
            "image/png"
        );
    }

    if (
        item.url
    ) {
        return downloadMediaURL7(
            job,
            item.url
        );
    }

    throw new Error(
        "openai_image_invalid_result"
    );
}


// ============================================================
// IMAGE PROVIDER ORDER
// ============================================================

function getImageProviderOrder7(
    job
) {
    const requested =
        safeString(
            job.provider ||
            "auto"
        ).toLowerCase();

    if (
        requested &&
        requested !==
            "auto"
    ) {
        return [
            requested
        ];
    }

    const providers =
        [];

    if (
        MEDIA_CONFIG_7
            .imageApiURL
    ) {
        providers.push(
            "custom"
        );
    }

    if (
        MEDIA_CONFIG_7
            .openAIKey
    ) {
        providers.push(
            "openai"
        );
    }

    providers.push(
        "local"
    );

    return providers;
}


// ============================================================
// VIDEO CUSTOM PROVIDER
// ============================================================

async function callCustomVideoProvider7(
    job
) {
    if (
        !MEDIA_CONFIG_7
            .videoApiURL
    ) {
        throw new Error(
            "custom_video_provider_not_configured"
        );
    }

    MEDIA_STATE_7
        .providerCalls++;

    const headers = {
        "Content-Type":
            "application/json"
    };

    if (
        MEDIA_CONFIG_7
            .mediaApiKey
    ) {
        headers.Authorization =
            `Bearer ${MEDIA_CONFIG_7.mediaApiKey}`;
    }

    const response =
        await mediaFetch7(
            MEDIA_CONFIG_7
                .videoApiURL,
            {
                method:
                    "POST",

                headers,

                body:
                    JSON.stringify({
                        task:
                            "video_generation",

                        type:
                            "video",

                        prompt:
                            job.prompt,

                        negative_prompt:
                            job.negativePrompt,

                        width:
                            job.width,

                        height:
                            job.height,

                        seconds:
                            job.seconds,

                        format:
                            job.format,

                        quality:
                            job.quality,

                        style:
                            job.style,

                        model:
                            job.model ||
                            undefined
                    })
            }
        );

    if (
        !response.ok
    ) {
        MEDIA_STATE_7
            .providerFailures++;

        throw new Error(
            `custom_video_${response.status}`
        );
    }

    const data =
        await response.json();

    const result =
        data &&
        (
            data.data ||
            data.result ||
            data.output ||
            data
        );

    const directURL =
        typeof result ===
        "string"
            ? result
            : (
                result &&
                (
                    result.url ||
                    result.video_url ||
                    result.videoUrl ||
                    result.download_url
                )
            );

    if (
        directURL &&
        /^https?:\/\//i.test(
            directURL
        )
    ) {
        if (
            result &&
            typeof result ===
                "object" &&
            result.id
        ) {
            job.providerJobId =
                safeString(
                    result.id
                );
        }

        return downloadMediaURL7(
            job,
            directURL,
            job.format
        );
    }

    const providerJobId =
        result &&
        (
            result.id ||
            result.job_id ||
            result.jobId
        );

    if (
        providerJobId
    ) {
        job.providerJobId =
            safeString(
                providerJobId
            );

        return {
            providerJobId:
                job.providerJobId,

            polling:
                true
        };
    }

    throw new Error(
        "custom_video_empty_result"
    );
}


// ============================================================
// VIDEO POLL PROVIDER
// ============================================================

async function pollCustomVideoProvider7(
    job
) {
    if (
        !MEDIA_CONFIG_7
            .videoApiURL
    ) {
        throw new Error(
            "video_api_not_configured"
        );
    }

    if (
        !job.providerJobId
    ) {
        throw new Error(
            "provider_job_id_missing"
        );
    }

    const pollURL =
        MEDIA_CONFIG_7
            .videoApiURL
            .replace(
                /\/+$/,
                ""
            ) +
        "/" +
        encodeURIComponent(
            job.providerJobId
        );

    const headers = {};

    if (
        MEDIA_CONFIG_7
            .mediaApiKey
    ) {
        headers.Authorization =
            `Bearer ${MEDIA_CONFIG_7.mediaApiKey}`;
    }

    const response =
        await mediaFetch7(
            pollURL,
            {
                method:
                    "GET",

                headers
            }
        );

    if (
        !response.ok
    ) {
        throw new Error(
            `video_poll_${response.status}`
        );
    }

    const data =
        await response.json();

    const result =
        data &&
        (
            data.data ||
            data.result ||
            data
        );

    const status =
        safeString(
            result &&
            (
                result.status ||
                result.state
            )
        ).toLowerCase();

    const progress =
        Number(
            result &&
            (
                result.progress ||
                result.percent
            )
        );

    if (
        Number.isFinite(
            progress
        )
    ) {
        updateMediaJob7(
            job,
            {
                progress:
                    Math.min(
                        99,
                        Math.max(
                            1,
                            progress
                        )
                    ),

                stage:
                    "polling"
            }
        );
    }

    const videoURL =
        result &&
        (
            result.url ||
            result.video_url ||
            result.videoUrl ||
            result.download_url
        );

    if (
        videoURL
    ) {
        return {
            done:
                true,

            output:
                await downloadMediaURL7(
                    job,
                    videoURL,
                    job.format
                )
        };
    }

    if (
        [
            "failed",
            "error",
            "cancelled"
        ].includes(
            status
        )
    ) {
        throw new Error(
            `video_provider_${status || "failed"}`
        );
    }

    return {
        done:
            false,

        progress:
            Number.isFinite(
                progress
            )
                ? progress
                : null
    };
}


// ============================================================
// IMAGE EXECUTION
// ============================================================

async function executeImageJob7(
    job
) {
    const providers =
        getImageProviderOrder7(
            job
        );

    let lastError =
        null;

    for (
        const provider
        of providers
    ) {
        try {
            if (
                job.cancelRequested
            ) {
                throw new Error(
                    "cancelled"
                );
            }

            updateMediaJob7(
                job,
                {
                    stage:
                        provider ===
                        "local"
                            ? "local_generation"
                            : `provider_${provider}`,

                    progress:
                        provider ===
                        "local"
                            ? 35
                            : 15
                }
            );

            let result;

            if (
                provider ===
                "custom"
            ) {
                result =
                    await callCustomImageProvider7(
                        job
                    );
            } else if (
                provider ===
                "openai"
            ) {
                result =
                    await callOpenAIImageProvider7(
                        job
                    );
            } else {
                result =
                    await generateLocalImage7(
                        job
                    );
            }

            if (
                result
            ) {
                result.localFallback =
                    Boolean(
                        result.localFallback
                    );

                if (
                    result.localFallback
                ) {
                    MEDIA_STATE_7
                        .localFallbacks++;
                }

                return result;
            }
        } catch (error) {
            lastError =
                error;

            if (
                provider !==
                "local"
            ) {
                MEDIA_STATE_7
                    .providerFailures++;
            }
        }
    }

    throw (
        lastError ||
        new Error(
            "image_generation_failed"
        )
    );
}


// ============================================================
// VIDEO EXECUTION
// ============================================================

async function executeVideoJob7(
    job
) {
    if (
        !MEDIA_CONFIG_7
            .videoApiURL
    ) {
        throw new Error(
            "video_provider_not_configured"
        );
    }

    updateMediaJob7(
        job,
        {
            stage:
                "provider_submit",

            progress:
                10
        }
    );

    const result =
        await callCustomVideoProvider7(
            job
        );

    if (
        result &&
        result.polling
    ) {
        updateMediaJob7(
            job,
            {
                status:
                    "polling",

                stage:
                    "provider_polling",

                progress:
                    20
            }
        );

        return pollVideoUntilDone7(
            job
        );
    }

    if (
        result &&
        result.path
    ) {
        return result;
    }

    throw new Error(
        "video_output_missing"
    );
}


// ============================================================
// VIDEO POLLING LOOP
// ============================================================

async function pollVideoUntilDone7(
    job
) {
    const started =
        Date.now();

    return new Promise(
        (
            resolve,
            reject
        ) => {
            const poll =
                async () => {
                    try {
                        if (
                            job.cancelRequested
                        ) {
                            throw new Error(
                                "cancelled"
                            );
                        }

                        if (
                            Date.now() -
                            started >
                            MEDIA_CONFIG_7
                                .jobTimeoutMS
                        ) {
                            throw new Error(
                                "video_job_timeout"
                            );
                        }

                        const result =
                            await pollCustomVideoProvider7(
                                job
                            );

                        if (
                            result &&
                            result.done
                        ) {
                            resolve(
                                result.output
                            );

                            return;
                        }

                        const timer =
                            setTimeout(
                                poll,
                                MEDIA_CONFIG_7
                                    .pollingIntervalMS
                            );

                        mediaTimers7.set(
                            job.id,
                            timer
                        );
                    } catch (error) {
                        reject(
                            error
                        );
                    }
                };

            poll();
        }
    );
}


// ============================================================
// JOB RUNNER
// ============================================================

async function processMediaJob7(
    job
) {
    if (!job) {
        return;
    }

    if (
        job.cancelRequested
    ) {
        updateMediaJob7(
            job,
            {
                status:
                    "cancelled",

                stage:
                    "cancelled",

                progress:
                    0,

                cancelledAt:
                    nowISO()
            }
        );

        MEDIA_STATE_7
            .cancelledJobs++;

        return;
    }

    MEDIA_ACTIVE_PUSH_7:
    mediaActive7.add(
        job.id
    );

    MEDIA_STATE_7
        .activeWorkers =
        mediaActive7.size;

    MEDIA_STATE_7
        .runningJobs++;

    updateMediaJob7(
        job,
        {
            status:
                "processing",

            stage:
                "starting",

            progress:
                5,

            startedAt:
                nowISO()
        }
    );

    try {
        const result =
            job.type ===
            "video"
                ? await executeVideoJob7(
                    job
                )
                : await executeImageJob7(
                    job
                );

        if (
            job.cancelRequested
        ) {
            updateMediaJob7(
                job,
                {
                    status:
                        "cancelled",

                    stage:
                        "cancelled",

                    progress:
                        0,

                    cancelledAt:
                        nowISO()
                }
            );

            MEDIA_STATE_7
                .cancelledJobs++;

            return;
        }

        if (
            !result ||
            !result.path
        ) {
            throw new Error(
                "media_output_missing"
            );
        }

        const stat =
            fs.statSync(
                result.path
            );

        job.output = {
            path:
                result.path,

            url:
                `/api/media/${encodeURIComponent(
                    job.id
                )}/download`,

            fileName:
                result.fileName,

            mimeType:
                result.mimeType,

            bytes:
                stat.size,

            format:
                result.format
        };

        job.metadata = {
            ...job.metadata,

            localFallback:
                Boolean(
                    result.localFallback
                ),

            generatedAt:
                nowISO(),

            sha256:
                calculateFileHash6(
                    result.path
                )
        };

        updateMediaJob7(
            job,
            {
                status:
                    "completed",

                stage:
                    "completed",

                progress:
                    100,

                completedAt:
                    nowISO()
            }
        );

        MEDIA_STATE_7
            .completedJobs++;

        MEDIA_STATE_7
            .bytesGenerated +=
            stat.size;

    } catch (error) {
        const message =
            safeString(
                error &&
                error.message,
                "media_generation_failed"
            );

        if (
            message ===
                "cancelled" ||
            job.cancelRequested
        ) {
            updateMediaJob7(
                job,
                {
                    status:
                        "cancelled",

                    stage:
                        "cancelled",

                    progress:
                        0,

                    cancelledAt:
                        nowISO(),

                    error:
                        message
                }
            );

            MEDIA_STATE_7
                .cancelledJobs++;
        } else {
            updateMediaJob7(
                job,
                {
                    status:
                        "failed",

                    stage:
                        "failed",

                    failedAt:
                        nowISO(),

                    error:
                        message.slice(
                            0,
                            1000
                        )
                }
            );

            MEDIA_STATE_7
                .failedJobs++;
        }
    } finally {
        mediaActive7.delete(
            job.id
        );

        MEDIA_STATE_7
            .activeWorkers =
            mediaActive7.size;

        MEDIA_STATE_7
            .runningJobs =
            Math.max(
                0,
                MEDIA_STATE_7
                    .runningJobs -
                    1
            );

        const timer =
            mediaTimers7.get(
                job.id
            );

        if (timer) {
            clearTimeout(
                timer
            );

            mediaTimers7.delete(
                job.id
            );
        }

        MEDIA_STATE_7
            .lastJobAt =
            nowISO();

        processMediaQueue7();
    }
}


// ============================================================
// MEDIA QUEUE PROCESSOR
// ============================================================

function processMediaQueue7() {
    while (
        mediaActive7.size <
            MEDIA_CONFIG_7
                .maxConcurrentJobs &&
        mediaQueue7.length >
            0
    ) {
        const jobId =
            mediaQueue7.shift();

        const job =
            mediaJobs7.get(
                jobId
            );

        if (
            !job
        ) {
            continue;
        }

        if (
            job.cancelRequested
        ) {
            updateMediaJob7(
                job,
                {
                    status:
                        "cancelled",

                    stage:
                        "cancelled",

                    cancelledAt:
                        nowISO()
                }
            );

            MEDIA_STATE_7
                .cancelledJobs++;

            continue;
        }

        processMediaJob7(
            job
        ).catch(
            error => {
                appendLog(
                    SYSTEM_LOG_FILE,
                    "media_worker_error",
                    {
                        jobId,
                        message:
                            error.message
                    }
                );
            }
        );
    }

    MEDIA_STATE_7
        .queuedJobs =
        mediaQueue7.length;
}


// ============================================================
// QUEUE MEDIA JOB
// ============================================================

function queueMediaJob7(
    job
) {
    mediaJobs7.set(
        job.id,
        job
    );

    mediaQueue7.push(
        job.id
    );

    MEDIA_STATE_7
        .totalJobs++;

    if (
        job.type ===
        "video"
    ) {
        MEDIA_STATE_7
            .videoJobs++;
    } else {
        MEDIA_STATE_7
            .imageJobs++;
    }

    MEDIA_STATE_7
        .queuedJobs =
        mediaQueue7.length;

    persistMediaJob7(
        job
    );

    processMediaQueue7();

    return job;
}


// ============================================================
// MEDIA OUTPUT SANITIZER
// ============================================================

function publicMediaJob7(
    job
) {
    if (!job) {
        return null;
    }

    const cloneJob =
        clone(
            job
        );

    if (
        cloneJob.output
    ) {
        delete cloneJob.output
            .path;
    }

    return cloneJob;
}


// ============================================================
// CREATE IMAGE JOB API
// ============================================================

async function createImageRequest7(
    req,
    res
) {
    const body =
        req.body ||
        {};

    const userId =
        mediaUserId7(
            body.userId ||
            "guest"
        );

    const prompt =
        normalizeMediaPrompt7(
            body.prompt
        );

    if (!prompt) {
        return res.status(
            400
        ).json({
            success:
                false,

            error:
                "prompt_required"
        });
    }

    const planLimit =
        getMediaLimit7(
            userId,
            "image"
        );

    if (
        planLimit <=
        0
    ) {
        return res.status(
            403
        ).json({
            success:
                false,

            error:
                "image_plan_limit",

            message:
                "Bu hesap için görsel üretimi açık değil."
        });
    }

    const can =
        canCreateMediaJob7(
            userId,
            "image"
        );

    if (
        !can.allowed
    ) {
        return res.status(
            429
        ).json(
            can
        );
    }

    const dimensions =
        normalizeMediaDimensions7(
            body,
            "image"
        );

    const usage =
        consumeMediaUsage7(
            userId,
            "images",
            1
        );

    if (
        usage &&
        usage.success ===
            false
    ) {
        return res.status(
            429
        ).json({
            success:
                false,

            error:
                "image_usage_limit"
        });
    }

    const job =
        createMediaJob7({
            type:
                "image",

            userId,

            prompt,

            negativePrompt:
                body.negativePrompt,

            width:
                dimensions.width,

            height:
                dimensions.height,

            format:
                body.format,

            quality:
                body.quality,

            style:
                body.style,

            model:
                body.model,

            provider:
                body.provider
        });

    queueMediaJob7(
        job
    );

    return res.status(
        202
    ).json({
        success:
            true,

        accepted:
            true,

        job:
            publicMediaJob7(
                job
            )
    });
}


// ============================================================
// CREATE VIDEO JOB API
// ============================================================

async function createVideoRequest7(
    req,
    res
) {
    const body =
        req.body ||
        {};

    const userId =
        mediaUserId7(
            body.userId ||
            "guest"
        );

    const prompt =
        normalizeMediaPrompt7(
            body.prompt
        );

    if (!prompt) {
        return res.status(
            400
        ).json({
            success:
                false,

            error:
                "prompt_required"
        });
    }

    const planLimit =
        getMediaLimit7(
            userId,
            "video"
        );

    if (
        planLimit <=
        0
    ) {
        return res.status(
            403
        ).json({
            success:
                false,

            error:
                "video_plan_limit",

            message:
                "Bu hesap için video üretimi açık değil."
        });
    }

    const can =
        canCreateMediaJob7(
            userId,
            "video"
        );

    if (
        !can.allowed
    ) {
        return res.status(
            429
        ).json(
            can
        );
    }

    const dimensions =
        normalizeMediaDimensions7(
            body,
            "video"
        );

    const seconds =
        Math.min(
            Math.max(
                Number(
                    body.seconds
                ) || 5,
                1
            ),
            MEDIA_CONFIG_7
                .maxVideoSeconds
        );

    const usage =
        consumeMediaUsage7(
            userId,
            "videos",
            1
        );

    if (
        usage &&
        usage.success ===
            false
    ) {
        return res.status(
            429
        ).json({
            success:
                false,

            error:
                "video_usage_limit"
        });
    }

    const job =
        createMediaJob7({
            type:
                "video",

            userId,

            prompt,

            negativePrompt:
                body.negativePrompt,

            width:
                dimensions.width,

            height:
                dimensions.height,

            seconds,

            format:
                body.format,

            quality:
                body.quality,

            style:
                body.style,

            model:
                body.model,

            provider:
                body.provider
        });

    queueMediaJob7(
        job
    );

    return res.status(
        202
    ).json({
        success:
            true,

        accepted:
            true,

        job:
            publicMediaJob7(
                job
            )
    });
}


// ============================================================
// IMAGE ROUTES
// ============================================================

app.post(
    "/api/media/image",
    createImageRequest7
);

app.post(
    "/api/image/generate",
    createImageRequest7
);

app.post(
    "/api/media/generate-image",
    createImageRequest7
);


// ============================================================
// VIDEO ROUTES
// ============================================================

app.post(
    "/api/media/video",
    createVideoRequest7
);

app.post(
    "/api/video/generate",
    createVideoRequest7
);

app.post(
    "/api/media/generate-video",
    createVideoRequest7
);


// ============================================================
// GET MEDIA JOB
// ============================================================

app.get(
    "/api/media/jobs/:jobId",
    (req, res) => {
        const job =
            mediaJobs7.get(
                req.params.jobId
            );

        if (!job) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_job_not_found"
            });
        }

        const requestedUser =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        if (
            job.userId !==
            requestedUser &&
            requestedUser !==
                "developer"
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "media_job_forbidden"
            });
        }

        return res.json({
            success:
                true,

            job:
                publicMediaJob7(
                    job
                )
        });
    }
);


// ============================================================
// LIST MEDIA JOBS
// ============================================================

app.get(
    "/api/media/jobs",
    (req, res) => {
        const userId =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        const type =
            safeString(
                req.query.type
            ).toLowerCase();

        const status =
            safeString(
                req.query.status
            ).toLowerCase();

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit ||
                        50
                    ) || 50,
                    1
                ),
                200
            );

        let jobs =
            Array.from(
                mediaJobs7.values()
            )
            .filter(
                job =>
                    job.userId ===
                    userId
            );

        if (
            [
                "image",
                "video"
            ].includes(
                type
            )
        ) {
            jobs =
                jobs.filter(
                    job =>
                        job.type ===
                        type
                );
        }

        if (
            status
        ) {
            jobs =
                jobs.filter(
                    job =>
                        job.status ===
                        status
                );
        }

        jobs.sort(
            (a, b) =>
                new Date(
                    b.createdAt
                ) -
                new Date(
                    a.createdAt
                )
        );

        jobs =
            jobs.slice(
                0,
                limit
            );

        return res.json({
            success:
                true,

            count:
                jobs.length,

            jobs:
                jobs.map(
                    publicMediaJob7
                )
        });
    }
);


// ============================================================
// MEDIA CANCEL
// ============================================================

app.post(
    "/api/media/jobs/:jobId/cancel",
    (req, res) => {
        const job =
            mediaJobs7.get(
                req.params.jobId
            );

        if (!job) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_job_not_found"
            });
        }

        const userId =
            mediaUserId7(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        if (
            job.userId !==
            userId
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "media_job_forbidden"
            });
        }

        if (
            [
                "completed",
                "failed",
                "cancelled"
            ].includes(
                job.status
            )
        ) {
            return res.json({
                success:
                    true,

                alreadyFinished:
                    true,

                job:
                    publicMediaJob7(
                        job
                    )
            });
        }

        job.cancelRequested =
            true;

        updateMediaJob7(
            job,
            {
                stage:
                    "cancel_requested"
            }
        );

        return res.json({
            success:
                true,

            job:
                publicMediaJob7(
                    job
                )
        });
    }
);


// ============================================================
// MEDIA RETRY
// ============================================================

app.post(
    "/api/media/jobs/:jobId/retry",
    (req, res) => {
        const oldJob =
            mediaJobs7.get(
                req.params.jobId
            );

        if (!oldJob) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_job_not_found"
            });
        }

        const userId =
            mediaUserId7(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        if (
            oldJob.userId !==
            userId
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "media_job_forbidden"
            });
        }

        if (
            ![
                "failed",
                "cancelled"
            ].includes(
                oldJob.status
            )
        ) {
            return res.status(
                409
            ).json({
                success:
                    false,

                error:
                    "media_job_not_retryable"
            });
        }

        const newJob =
            createMediaJob7({
                ...oldJob,

                userId,

                type:
                    oldJob.type,

                prompt:
                    oldJob.prompt,

                negativePrompt:
                    oldJob.negativePrompt,

                width:
                    oldJob.width,

                height:
                    oldJob.height,

                seconds:
                    oldJob.seconds,

                format:
                    oldJob.format,

                quality:
                    oldJob.quality,

                style:
                    oldJob.style,

                model:
                    oldJob.model,

                provider:
                    oldJob.provider
            });

        newJob.retryCount =
            Number(
                oldJob.retryCount
            ) + 1;

        MEDIA_STATE_7
            .retriedJobs++;

        queueMediaJob7(
            newJob
        );

        return res.status(
            202
        ).json({
            success:
                true,

            retriedFrom:
                oldJob.id,

            job:
                publicMediaJob7(
                    newJob
                )
        });
    }
);


// ============================================================
// MEDIA DOWNLOAD
// ============================================================

app.get(
    "/api/media/:jobId/download",
    (req, res) => {
        const job =
            mediaJobs7.get(
                req.params.jobId
            );

        if (!job) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_job_not_found"
            });
        }

        const userId =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        if (
            job.userId !==
            userId
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "media_job_forbidden"
            });
        }

        if (
            job.status !==
            "completed"
        ) {
            return res.status(
                409
            ).json({
                success:
                    false,

                error:
                    "media_not_ready",

                status:
                    job.status
            });
        }

        const filePath =
            job.output &&
            job.output.path;

        if (
            !filePath ||
            !fs.existsSync(
                filePath
            )
        ) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_file_missing"
            });
        }

        const safeRoot =
            path.resolve(
                job.type ===
                "video"
                    ? MEDIA_VIDEO_DIR_7
                    : MEDIA_IMAGE_DIR_7
            );

        const resolved =
            path.resolve(
                filePath
            );

        if (
            !resolved.startsWith(
                safeRoot
            )
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "invalid_media_path"
            });
        }

        return res.download(
            resolved,
            job.output.fileName ||
                `turkai-${job.id}.${job.output.format}`,
            error => {
                if (
                    error
                ) {
                    appendLog(
                        SYSTEM_LOG_FILE,
                        "media_download_error",
                        {
                            jobId:
                                job.id,

                            message:
                                error.message
                        }
                    );
                }
            }
        );
    }
);


// ============================================================
// MEDIA DELETE
// ============================================================

app.delete(
    "/api/media/jobs/:jobId",
    (req, res) => {
        const job =
            mediaJobs7.get(
                req.params.jobId
            );

        if (!job) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "media_job_not_found"
            });
        }

        const userId =
            mediaUserId7(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        if (
            job.userId !==
            userId
        ) {
            return res.status(
                403
            ).json({
                success:
                    false,

                error:
                    "media_job_forbidden"
            });
        }

        if (
            job.output &&
            job.output.path &&
            fs.existsSync(
                job.output.path
            )
        ) {
            try {
                fs.unlinkSync(
                    job.output.path
                );
            } catch {
                // devam
            }
        }

        mediaJobs7.delete(
            job.id
        );

        delete mediaIndex7[
            job.id
        ];

        saveMediaIndex7();

        mediaHistory7.push({
            id:
                createId(
                    "media-delete"
                ),

            jobId:
                job.id,

            userId,

            type:
                job.type,

            status:
                "deleted",

            timestamp:
                nowISO()
        });

        saveMediaHistory7();

        return res.json({
            success:
                true,

            jobId:
                job.id
        });
    }
);


// ============================================================
// MEDIA HISTORY
// ============================================================

app.get(
    "/api/media/history",
    (req, res) => {
        const userId =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit ||
                        50
                    ) || 50,
                    1
                ),
                500
            );

        const history =
            mediaHistory7
                .filter(
                    item =>
                        item.userId ===
                        userId
                )
                .slice(
                    -limit
                )
                .reverse();

        return res.json({
            success:
                true,

            count:
                history.length,

            history
        });
    }
);


// ============================================================
// USER MEDIA STORAGE
// ============================================================

function getUserMediaFiles7(
    userId
) {
    const id =
        mediaUserId7(
            userId
        );

    return Array.from(
        mediaJobs7.values()
    )
    .filter(
        job =>
            job.userId ===
                id &&
            job.status ===
                "completed" &&
            job.output &&
            job.output.path
    );
}


function getUserMediaStats7(
    userId
) {
    const files =
        getUserMediaFiles7(
            userId
        );

    const bytes =
        files.reduce(
            (
                total,
                job
            ) =>
                total +
                Number(
                    job.output
                        .bytes ||
                    0
                ),
            0
        );

    return {
        userId:
            mediaUserId7(
                userId
            ),

        total:
            files.length,

        images:
            files.filter(
                job =>
                    job.type ===
                    "image"
            ).length,

        videos:
            files.filter(
                job =>
                    job.type ===
                    "video"
            ).length,

        bytes,

        mb:
            bytesToMB6(
                bytes
            ),

        maxFiles:
            MEDIA_CONFIG_7
                .maxStoredMediaPerUser,

        imageLimit:
            getMediaLimit7(
                userId,
                "image"
            ),

        videoLimit:
            getMediaLimit7(
                userId,
                "video"
            )
    };
}


// ============================================================
// MEDIA STATS
// ============================================================

app.get(
    "/api/media/stats",
    (req, res) => {
        const userId =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            state:
                {
                    ...MEDIA_STATE_7
                },

            user:
                getUserMediaStats7(
                    userId
                ),

            queue:
                {
                    queued:
                        mediaQueue7
                            .length,

                    active:
                        mediaActive7
                            .size,

                    maxConcurrent:
                        MEDIA_CONFIG_7
                            .maxConcurrentJobs
                }
        });
    }
);


// ============================================================
// MEDIA STATUS
// ============================================================

app.get(
    "/api/media/status",
    (req, res) => {
        return res.json({
            success:
                true,

            enabled:
                MEDIA_CONFIG_7
                    .enabled,

            serverVersion:
                SERVER_VERSION,

            providers: {
                local:
                    MEDIA_PROVIDERS_7
                        .local
                        .enabled,

                custom:
                    MEDIA_PROVIDERS_7
                        .custom
                        .enabled,

                openai:
                    MEDIA_PROVIDERS_7
                        .openai
                        .enabled
            },

            config: {
                maxConcurrentJobs:
                    MEDIA_CONFIG_7
                        .maxConcurrentJobs,

                maxVideoSeconds:
                    MEDIA_CONFIG_7
                        .maxVideoSeconds,

                imageProvider:
                    MEDIA_CONFIG_7
                        .imageProvider,

                videoProvider:
                    MEDIA_CONFIG_7
                        .videoProvider,

                hasCustomImageAPI:
                    Boolean(
                        MEDIA_CONFIG_7
                            .imageApiURL
                    ),

                hasCustomVideoAPI:
                    Boolean(
                        MEDIA_CONFIG_7
                            .videoApiURL
                    )
            },

            state:
                {
                    ...MEDIA_STATE_7
                }
        });
    }
);


// ============================================================
// MEDIA PROVIDERS
// ============================================================

app.get(
    "/api/media/providers",
    (req, res) => {
        return res.json({
            success:
                true,

            providers:
                Object.values(
                    MEDIA_PROVIDERS_7
                ).map(
                    provider => ({
                        id:
                            provider.id,

                        enabled:
                            provider.enabled,

                        kind:
                            provider.kind
                    })
                )
        });
    }
);


// ============================================================
// MEDIA CONFIG
// ============================================================

app.get(
    "/api/media/config",
    (req, res) => {
        return res.json({
            success:
                true,

            config: {
                maxConcurrentJobs:
                    MEDIA_CONFIG_7
                        .maxConcurrentJobs,

                maxPromptLength:
                    MEDIA_CONFIG_7
                        .maxPromptLength,

                maxImageWidth:
                    MEDIA_CONFIG_7
                        .maxImageWidth,

                maxImageHeight:
                    MEDIA_CONFIG_7
                        .maxImageHeight,

                maxVideoWidth:
                    MEDIA_CONFIG_7
                        .maxVideoWidth,

                maxVideoHeight:
                    MEDIA_CONFIG_7
                        .maxVideoHeight,

                maxVideoSeconds:
                    MEDIA_CONFIG_7
                        .maxVideoSeconds,

                imageFormats:
                    MEDIA_CONFIG_7
                        .imageFormats,

                videoFormats:
                    MEDIA_CONFIG_7
                        .videoFormats
            }
        });
    }
);


// ============================================================
// MEDIA CLEANUP
// ============================================================

function cleanupMediaFiles7() {
    let removed =
        0;

    let bytes =
        0;

    for (
        const job
        of Array.from(
            mediaJobs7.values()
        )
    ) {
        if (
            !job ||
            !job.output ||
            !job.output.path
        ) {
            continue;
        }

        if (
            [
                "completed",
                "failed",
                "cancelled"
            ].includes(
                job.status
            ) &&
            !fs.existsSync(
                job.output.path
            )
        ) {
            if (
                job.output.bytes
            ) {
                bytes +=
                    Number(
                        job.output.bytes
                    );
            }

            delete mediaIndex7[
                job.id
            ];

            mediaJobs7.delete(
                job.id
            );

            removed++;
        }
    }

    saveMediaIndex7();

    return {
        success:
            true,

        removed,

        bytes
    };
}


app.post(
    "/api/media/cleanup",
    (req, res) => {
        return res.json(
            cleanupMediaFiles7()
        );
    }
);


// ============================================================
// MEDIA SOCKET.IO
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:media:subscribe",
                payload => {
                    const userId =
                        mediaUserId7(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    try {
                        socket.join(
                            `turkai:user:${userId}`
                        );
                    } catch {
                        // devam
                    }

                    socket.emit(
                        "turkai:media:subscribed",
                        {
                            success:
                                true,

                            userId
                        }
                    );
                }
            );

            socket.on(
                "turkai:media:job",
                payload => {
                    const jobId =
                        safeString(
                            payload &&
                            payload.jobId
                        );

                    const job =
                        mediaJobs7.get(
                            jobId
                        );

                    if (!job) {
                        socket.emit(
                            "turkai:media:error",
                            {
                                success:
                                    false,

                                error:
                                    "media_job_not_found"
                            }
                        );

                        return;
                    }

                    socket.emit(
                        "turkai:media:job",
                        publicMediaJob7(
                            job
                        )
                    );
                }
            );

            socket.on(
                "turkai:media:stats",
                payload => {
                    const userId =
                        mediaUserId7(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    socket.emit(
                        "turkai:media:stats",
                        {
                            success:
                                true,

                            stats:
                                getUserMediaStats7(
                                    userId
                                )
                        }
                    );
                }
            );
        }
    );
}


// ============================================================
// MEDIA RULE MATRIX
// ============================================================

const MEDIA_ACTIONS_7 = [
    "generate",
    "queue",
    "process",
    "poll",
    "download",
    "delete",
    "retry",
    "cancel",
    "history",
    "stats",
    "cleanup"
];

const MEDIA_TYPES_7 = [
    "image",
    "video"
];

const MEDIA_PLANS_7 = [
    "free",
    "pro",
    "plus",
    "ultra",
    "developer"
];

const MEDIA_STYLES_7 = [
    "natural",
    "cinematic",
    "anime",
    "illustration",
    "photorealistic",
    "minimal",
    "product",
    "portrait",
    "landscape",
    "concept",
    "digital-art",
    "3d"
];

const MEDIA_FORMATS_7 = [
    "png",
    "jpg",
    "jpeg",
    "webp",
    "svg",
    "mp4",
    "webm",
    "mov"
];

const MEDIA_RUNTIME_RULES_7 = [];

for (
    const action
    of MEDIA_ACTIONS_7
) {
    for (
        const type
        of MEDIA_TYPES_7
    ) {
        for (
            const plan
            of MEDIA_PLANS_7
        ) {
            for (
                const style
                of MEDIA_STYLES_7
            ) {
                MEDIA_RUNTIME_RULES_7.push({
                    id:
                        MEDIA_RUNTIME_RULES_7
                            .length +
                        1,

                    action,

                    type,

                    plan,

                    style,

                    enabled:
                        action !==
                        "generate" ||
                        plan !==
                        "free" ||
                        type ===
                        "image"
                });
            }
        }
    }
}


// ============================================================
// MEDIA FORMAT RULES
// ============================================================

const MEDIA_FORMAT_RULES_7 =
    MEDIA_FORMATS_7.map(
        (
            format,
            index
        ) => ({
            id:
                index + 1,

            format,

            type:
                [
                    "mp4",
                    "webm",
                    "mov"
                ].includes(
                    format
                )
                    ? "video"
                    : "image",

            enabled:
                true
        })
    );


// ============================================================
// MEDIA RULE ROUTE
// ============================================================

app.get(
    "/api/media/rules",
    (req, res) => {
        return res.json({
            success:
                true,

            count:
                MEDIA_RUNTIME_RULES_7
                    .length,

            formatCount:
                MEDIA_FORMAT_RULES_7
                    .length,

            rules:
                MEDIA_RUNTIME_RULES_7
        });
    }
);


// ============================================================
// MEDIA DIAGNOSTICS
// ============================================================

app.get(
    "/api/media/diagnostics",
    async (req, res) => {
        const ffmpeg =
            await new Promise(
                resolve => {
                    childProcess7.exec(
                        "ffmpeg -version",
                        {
                            timeout:
                                3000
                        },
                        (
                            error,
                            stdout
                        ) => {
                            resolve({
                                available:
                                    !error,

                                version:
                                    safeString(
                                        stdout
                                    )
                                        .split(
                                            "\n"
                                        )[0]
                                        .slice(
                                            0,
                                            300
                                        )
                            });
                        }
                    );
                }
            );

        return res.json({
            success:
                true,

            serverVersion:
                SERVER_VERSION,

            node:
                process.version,

            ffmpeg,

            directories: {
                image:
                    fs.existsSync(
                        MEDIA_IMAGE_DIR_7
                    ),

                video:
                    fs.existsSync(
                        MEDIA_VIDEO_DIR_7
                    ),

                metadata:
                    fs.existsSync(
                        MEDIA_META_DIR_7
                    )
            },

            providers:
                Object.keys(
                    MEDIA_PROVIDERS_7
                ),

            state:
                {
                    ...MEDIA_STATE_7
                }
        });
    }
);


// ============================================================
// MEDIA API COMMAND ROUTE
// ============================================================

app.post(
    "/api/media/command",
    async (req, res) => {
        const body =
            req.body ||
            {};

        const command =
            safeString(
                body.command
            )
                .toLowerCase();

        if (
            command ===
            "status"
        ) {
            return res.json({
                success:
                    true,

                state:
                    {
                        ...MEDIA_STATE_7
                    }
            });
        }

        if (
            command ===
            "cleanup"
        ) {
            return res.json(
                cleanupMediaFiles7()
            );
        }

        if (
            command ===
            "process"
        ) {
            processMediaQueue7();

            return res.json({
                success:
                    true,

                queued:
                    mediaQueue7.length,

                active:
                    mediaActive7.size
            });
        }

        return res.status(
            400
        ).json({
            success:
                false,

            error:
                "unknown_media_command"
        });
    }
);


// ============================================================
// MEDIA USER QUOTA
// ============================================================

app.get(
    "/api/media/quota",
    (req, res) => {
        const userId =
            mediaUserId7(
                req.query.userId ||
                "guest"
            );

        const imageLimit =
            getMediaLimit7(
                userId,
                "image"
            );

        const videoLimit =
            getMediaLimit7(
                userId,
                "video"
            );

        const activeImage =
            Array.from(
                mediaJobs7.values()
            )
            .filter(
                job =>
                    job.userId ===
                        userId &&
                    job.type ===
                        "image" &&
                    ![
                        "completed",
                        "failed",
                        "cancelled"
                    ].includes(
                        job.status
                    )
            ).length;

        const activeVideo =
            Array.from(
                mediaJobs7.values()
            )
            .filter(
                job =>
                    job.userId ===
                        userId &&
                    job.type ===
                        "video" &&
                    ![
                        "completed",
                        "failed",
                        "cancelled"
                    ].includes(
                        job.status
                    )
            ).length;

        return res.json({
            success:
                true,

            userId,

            image: {
                limit:
                    imageLimit,

                active:
                    activeImage,

                remaining:
                    Math.max(
                        0,
                        imageLimit -
                        activeImage
                    )
            },

            video: {
                limit:
                    videoLimit,

                active:
                    activeVideo,

                remaining:
                    Math.max(
                        0,
                        videoLimit -
                        activeVideo
                    )
            }
        });
    }
);


// ============================================================
// MEDIA STATE EXPORT
// ============================================================

serverState.media = {
    state:
        MEDIA_STATE_7,

    config:
        MEDIA_CONFIG_7,

    providers:
        MEDIA_PROVIDERS_7,

    jobs:
        mediaJobs7,

    queue:
        mediaQueue7,

    active:
        mediaActive7,

    history:
        mediaHistory7,

    index:
        mediaIndex7,

    createJob:
        createMediaJob7,

    queueJob:
        queueMediaJob7,

    getJob:
        jobId =>
            mediaJobs7.get(
                jobId
            ),

    getUserStats:
        getUserMediaStats7,

    cleanup:
        cleanupMediaFiles7,

    processQueue:
        processMediaQueue7,

    publicJob:
        publicMediaJob7
};


// ============================================================
// PART 7 READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 7 Media Engine yüklendi."
);

console.log(
    "[TürkAI] Image API: /api/media/image"
);

console.log(
    "[TürkAI] Video API: /api/media/video"
);

console.log(
    "[TürkAI] Jobs: /api/media/jobs"
);

console.log(
    "[TürkAI] Queue:",
    mediaQueue7.length
);

console.log(
    "[TürkAI] Active:",
    mediaActive7.size
);

console.log(
    "[TürkAI] Runtime rules:",
    MEDIA_RUNTIME_RULES_7.length
);

console.log(
    "[TürkAI] Custom image:",
    MEDIA_CONFIG_7.imageApiURL
        ? "AKTİF"
        : "YOK"
);

console.log(
    "[TürkAI] Custom video:",
    MEDIA_CONFIG_7.videoApiURL
        ? "AKTİF"
        : "YOK"
);

console.log(
    "[TürkAI] OpenAI image:",
    MEDIA_CONFIG_7.openAIKey
        ? "AKTİF"
        : "YOK"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 7 END
// ============================================================
//
// PART 8:
//
// - Task engine
// - Background jobs
// - Scheduler
// - reminders
// - notifications
// - Socket.IO realtime
// - research/weather/media/chat task bağlantısı
// - task persistence
// - retry
// - recurring tasks
//
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 8 / 10
// TASK + SCHEDULER + BACKGROUND JOB ENGINE
// ============================================================
//
// Bu bölüm:
//
// - Kalıcı görev sistemi
// - Tek seferlik görevler
// - Tekrarlayan görevler
// - Dakikalık / saatlik / günlük / haftalık tekrar
// - Tarih-saat tabanlı görevler
// - Arka plan job runner
// - Retry sistemi
// - Timeout sistemi
// - Görev iptal etme
// - Görev tamamlama
// - Görev geçmişi
// - Bildirim kuyruğu
// - Kullanıcı bazlı görevler
// - Sistem görevleri
// - Araştırma otomasyonu
// - Hava durumu otomasyonu
// - Media queue monitor
// - AI queue monitor
// - Storage cleanup
// - Sağlık kontrolü
// - Socket.IO gerçek zamanlı task eventleri
// - Dashboard özetleri
//
// NOT:
// Bu motor keyfi shell komutu çalıştırmaz.
// Güvenli, önceden tanımlı task handler'lar kullanır.
//
// ============================================================


// ============================================================
// TASK DIRECTORIES
// ============================================================

const TASK_DATA_DIR_8 =
    path.join(
        TASKS_DIR,
        "engine"
    );

const TASK_HISTORY_DIR_8 =
    path.join(
        TASK_DATA_DIR_8,
        "history"
    );

const TASK_RUNTIME_DIR_8 =
    path.join(
        TASK_DATA_DIR_8,
        "runtime"
    );

const TASK_NOTIFICATIONS_DIR_8 =
    path.join(
        TASK_DATA_DIR_8,
        "notifications"
    );

const TASK_EVENTS_FILE_8 =
    path.join(
        TASK_DATA_DIR_8,
        "events.json"
    );

const TASK_HISTORY_FILE_8 =
    path.join(
        TASK_DATA_DIR_8,
        "history.json"
    );

const TASK_NOTIFICATIONS_FILE_8 =
    path.join(
        TASK_NOTIFICATIONS_DIR_8,
        "queue.json"
    );

const TASK_ENGINE_STATE_FILE_8 =
    path.join(
        TASK_RUNTIME_DIR_8,
        "state.json"
    );


for (
    const dir of [
        TASK_DATA_DIR_8,
        TASK_HISTORY_DIR_8,
        TASK_RUNTIME_DIR_8,
        TASK_NOTIFICATIONS_DIR_8
    ]
) {
    try {
        fs.mkdirSync(
            dir,
            {
                recursive:
                    true
            }
        );
    } catch {
        // devam
    }
}


// ============================================================
// TASK ENGINE CONFIG
// ============================================================

const TASK_CONFIG_8 = {
    enabled:
        true,

    schedulerIntervalMS:
        15000,

    workerIntervalMS:
        2500,

    defaultTimeoutMS:
        120000,

    maxTimeoutMS:
        15 * 60 * 1000,

    maxTasksPerUser:
        500,

    maxHistory:
        5000,

    maxNotifications:
        5000,

    maxRetries:
        3,

    cleanupEveryRuns:
        240,

    eventHistoryLimit:
        5000,

    timezone:
        "Europe/Istanbul"
};


// ============================================================
// TASK ENGINE STATE
// ============================================================

const TASK_STATE_8 = {
    startedAt:
        nowISO(),

    schedulerRuns:
        0,

    workerRuns:
        0,

    totalTasks:
        0,

    queuedTasks:
        0,

    runningTasks:
        0,

    completedTasks:
        0,

    failedTasks:
        0,

    cancelledTasks:
        0,

    retryTasks:
        0,

    skippedTasks:
        0,

    timedOutTasks:
        0,

    notificationsCreated:
        0,

    notificationsSent:
        0,

    notificationsFailed:
        0,

    researchJobs:
        0,

    weatherJobs:
        0,

    maintenanceJobs:
        0,

    healthJobs:
        0,

    lastSchedulerRun:
        null,

    lastWorkerRun:
        null,

    lastCleanupRun:
        null,

    currentWorkers:
        0
};


// ============================================================
// TASK COLLECTIONS
// ============================================================

const taskStore8 =
    new Map();

const taskQueue8 =
    [];

const taskRunning8 =
    new Map();

const taskTimers8 =
    new Map();

const taskNotificationQueue8 =
    [];

let taskEvents8 =
    readJSON(
        TASK_EVENTS_FILE_8,
        []
    );

if (
    !Array.isArray(
        taskEvents8
    )
) {
    taskEvents8 =
        [];
}


let taskHistory8 =
    readJSON(
        TASK_HISTORY_FILE_8,
        []
    );

if (
    !Array.isArray(
        taskHistory8
    )
) {
    taskHistory8 =
        [];
}


const savedTaskState8 =
    readJSON(
        TASK_ENGINE_STATE_FILE_8,
        {}
    );


// ============================================================
// TASK TYPE DEFINITIONS
// ============================================================

const TASK_TYPES_8 = {
    reminder:
        {
            id:
                "reminder",

            category:
                "user",

            enabled:
                true
        },

    notification:
        {
            id:
                "notification",

            category:
                "user",

            enabled:
                true
        },

    research:
        {
            id:
                "research",

            category:
                "ai",

            enabled:
                true
        },

    weather:
        {
            id:
                "weather",

            category:
                "utility",

            enabled:
                true
        },

    media_monitor:
        {
            id:
                "media_monitor",

            category:
                "media",

            enabled:
                true
        },

    ai_health:
        {
            id:
                "ai_health",

            category:
                "system",

            enabled:
                true
        },

    system_health:
        {
            id:
                "system_health",

            category:
                "system",

            enabled:
                true
        },

    cleanup:
        {
            id:
                "cleanup",

            category:
                "maintenance",

            enabled:
                true
        },

    usage_reset:
        {
            id:
                "usage_reset",

            category:
                "maintenance",

            enabled:
                true
        }
};


// ============================================================
// TASK STATUS
// ============================================================

const TASK_STATUSES_8 = [
    "scheduled",
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled",
    "paused"
];


// ============================================================
// TASK FREQUENCY
// ============================================================

const TASK_FREQUENCIES_8 = [
    "once",
    "minutely",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "custom"
];


// ============================================================
// SAFE TASK USER ID
// ============================================================

function taskUserId8(
    value
) {
    try {
        return normalizePlanUserId5(
            value ||
            "guest"
        );
    } catch {
        return (
            sanitizePathPart6(
                value ||
                "guest"
            ) ||
            "guest"
        );
    }
}


// ============================================================
// TASK ID
// ============================================================

function createTaskId8() {
    return createId(
        "task"
    );
}


// ============================================================
// TASK NORMALIZATION
// ============================================================

function normalizeTaskType8(
    type
) {
    const value =
        safeString(
            type
        )
        .trim()
        .toLowerCase();

    return TASK_TYPES_8[
        value
    ]
        ? value
        : "reminder";
}


function normalizeTaskFrequency8(
    frequency
) {
    const value =
        safeString(
            frequency
        )
        .trim()
        .toLowerCase();

    return TASK_FREQUENCIES_8.includes(
        value
    )
        ? value
        : "once";
}


// ============================================================
// DATE HELPERS
// ============================================================

function parseTaskDate8(
    value,
    fallback = null
) {
    if (
        value ===
        null ||
        value ===
        undefined ||
        value ===
        ""
    ) {
        return fallback;
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return fallback;
    }

    return date;
}


function taskInterval8(
    frequency,
    interval = 1
) {
    const amount =
        Math.max(
            1,
            Number(
                interval
            ) || 1
        );

    if (
        frequency ===
        "minutely"
    ) {
        return (
            amount *
            60 *
            1000
        );
    }

    if (
        frequency ===
        "hourly"
    ) {
        return (
            amount *
            60 *
            60 *
            1000
        );
    }

    if (
        frequency ===
        "daily"
    ) {
        return (
            amount *
            24 *
            60 *
            60 *
            1000
        );
    }

    if (
        frequency ===
        "weekly"
    ) {
        return (
            amount *
            7 *
            24 *
            60 *
            60 *
            1000
        );
    }

    if (
        frequency ===
        "monthly"
    ) {
        return (
            amount *
            30 *
            24 *
            60 *
            60 *
            1000
        );
    }

    return null;
}


// ============================================================
// TASK NEXT RUN
// ============================================================

function calculateNextRun8(
    task,
    fromDate = new Date()
) {
    if (!task) {
        return null;
    }

    const frequency =
        normalizeTaskFrequency8(
            task.frequency
        );

    if (
        frequency ===
        "once"
    ) {
        return null;
    }

    if (
        frequency ===
        "custom" &&
        task.intervalMS
    ) {
        return new Date(
            fromDate.getTime() +
            Math.max(
                1000,
                Number(
                    task.intervalMS
                )
            )
        ).toISOString();
    }

    if (
        frequency ===
        "monthly"
    ) {
        const current =
            new Date(
                fromDate
            );

        current.setMonth(
            current.getMonth() +
            Math.max(
                1,
                Number(
                    task.interval
                ) || 1
            )
        );

        return current.toISOString();
    }

    const interval =
        taskInterval8(
            frequency,
            task.interval
        );

    if (!interval) {
        return null;
    }

    return new Date(
        fromDate.getTime() +
        interval
    ).toISOString();
}


// ============================================================
// TASK RECORD
// ============================================================

function createTaskRecord8(
    options = {}
) {
    const now =
        new Date();

    const scheduledAt =
        parseTaskDate8(
            options.scheduledAt,
            now
        );

    const frequency =
        normalizeTaskFrequency8(
            options.frequency
        );

    const timeoutMS =
        Math.min(
            Math.max(
                Number(
                    options.timeoutMS
                ) ||
                TASK_CONFIG_8
                    .defaultTimeoutMS,
                1000
            ),
            TASK_CONFIG_8
                .maxTimeoutMS
        );

    const task = {
        id:
            createTaskId8(),

        userId:
            taskUserId8(
                options.userId
            ),

        type:
            normalizeTaskType8(
                options.type
            ),

        title:
            cleanText(
                safeString(
                    options.title ||
                    "TürkAI görevi"
                ),
                300
            ),

        description:
            cleanText(
                safeString(
                    options.description
                ),
                3000
            ),

        payload:
            clone(
                options.payload ||
                {}
            ),

        frequency,

        interval:
            Math.max(
                1,
                Number(
                    options.interval
                ) || 1
            ),

        intervalMS:
            Math.max(
                1000,
                Number(
                    options.intervalMS
                ) || 60000
            ),

        scheduledAt:
            scheduledAt
                ? scheduledAt.toISOString()
                : now.toISOString(),

        nextRunAt:
            scheduledAt
                ? scheduledAt.toISOString()
                : now.toISOString(),

        lastRunAt:
            null,

        completedAt:
            null,

        cancelledAt:
            null,

        failedAt:
            null,

        status:
            "scheduled",

        priority:
            Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        options.priority
                    ) || 50
                )
            ),

        timeoutMS,

        retries:
            0,

        maxRetries:
            Math.min(
                TASK_CONFIG_8
                    .maxRetries,
                Math.max(
                    0,
                    Number(
                        options.maxRetries
                    ) ??
                    TASK_CONFIG_8
                        .maxRetries
                )
            ),

        executionCount:
            0,

        error:
            null,

        result:
            null,

        notification:
            {
                enabled:
                    options.notify !==
                    false,

                channel:
                    safeString(
                        options.channel ||
                        "socket"
                    )
            },

        createdAt:
            now.toISOString(),

        updatedAt:
            now.toISOString(),

        metadata:
            {
                source:
                    "turkai",

                version:
                    SERVER_VERSION
            }
    };

    return task;
}


// ============================================================
// TASK PERSISTENCE
// ============================================================

function saveTasksEngine8() {
    const object =
        {};

    for (
        const [
            id,
            task
        ]
        of taskStore8
    ) {
        object[
            id
        ] =
            task;
    }

    writeJSON(
        path.join(
            TASK_DATA_DIR_8,
            "tasks.json"
        ),
        object
    );
}


function saveTaskEvents8() {
    taskEvents8 =
        taskEvents8.slice(
            -TASK_CONFIG_8
                .eventHistoryLimit
        );

    writeJSON(
        TASK_EVENTS_FILE_8,
        taskEvents8
    );
}


function saveTaskHistory8() {
    taskHistory8 =
        taskHistory8.slice(
            -TASK_CONFIG_8
                .maxHistory
        );

    writeJSON(
        TASK_HISTORY_FILE_8,
        taskHistory8
    );
}


function saveTaskNotifications8() {
    writeJSON(
        TASK_NOTIFICATIONS_FILE_8,
        taskNotificationQueue8
            .slice(
                -TASK_CONFIG_8
                    .maxNotifications
            )
    );
}


function saveTaskState8() {
    writeJSON(
        TASK_ENGINE_STATE_FILE_8,
        TASK_STATE_8
    );
}


// ============================================================
// LOAD TASK STORE
// ============================================================

const SAVED_TASKS_FILE_8 =
    path.join(
        TASK_DATA_DIR_8,
        "tasks.json"
    );

const savedTasks8 =
    readJSON(
        SAVED_TASKS_FILE_8,
        {}
    );

if (
    savedTasks8 &&
    typeof savedTasks8 ===
        "object"
) {
    for (
        const [
            id,
            task
        ]
        of Object.entries(
            savedTasks8
        )
    ) {
        if (
            !task
        ) {
            continue;
        }

        if (
            task.status ===
                "running" ||
            task.status ===
                "queued"
        ) {
            task.status =
                "scheduled";

            task.nextRunAt =
                new Date().toISOString();
        }

        taskStore8.set(
            id,
            task
        );
    }
}


// ============================================================
// LOAD NOTIFICATIONS
// ============================================================

const savedNotifications8 =
    readJSON(
        TASK_NOTIFICATIONS_FILE_8,
        []
    );

if (
    Array.isArray(
        savedNotifications8
    )
) {
    for (
        const item
        of savedNotifications8
    ) {
        taskNotificationQueue8.push(
            item
        );
    }
}


// ============================================================
// TASK EVENT
// ============================================================

function pushTaskEvent8(
    event,
    task,
    extra = {}
) {
    const data = {
        id:
            createId(
                "task-event"
            ),

        event,

        taskId:
            task &&
            task.id
                ? task.id
                : null,

        userId:
            task &&
            task.userId
                ? task.userId
                : null,

        type:
            task &&
            task.type
                ? task.type
                : null,

        status:
            task &&
            task.status
                ? task.status
                : null,

        timestamp:
            nowISO(),

        ...clone(
            extra
        )
    };

    taskEvents8.push(
        data
    );

    saveTaskEvents8();

    try {
        if (
            io
        ) {
            if (
                data.userId
            ) {
                io.to(
                    `turkai:user:${data.userId}`
                ).emit(
                    "turkai:task:event",
                    data
                );
            }

            io.emit(
                "turkai:task:event",
                data
            );
        }
    } catch {
        // devam
    }

    return data;
}


// ============================================================
// TASK HISTORY
// ============================================================

function pushTaskHistory8(
    action,
    task,
    result = null
) {
    taskHistory8.push({
        id:
            createId(
                "task-history"
            ),

        action,

        taskId:
            task &&
            task.id
                ? task.id
                : null,

        userId:
            task &&
            task.userId
                ? task.userId
                : null,

        type:
            task &&
            task.type
                ? task.type
                : null,

        status:
            task &&
            task.status
                ? task.status
                : null,

        result:
            clone(
                result
            ),

        timestamp:
            nowISO()
    });

    saveTaskHistory8();
}


// ============================================================
// TASK NOTIFICATION
// ============================================================

function createTaskNotification8(
    task,
    payload = {}
) {
    if (
        !task ||
        !task.notification ||
        task.notification.enabled ===
            false
    ) {
        return null;
    }

    const notification = {
        id:
            createId(
                "notification"
            ),

        userId:
            task.userId,

        taskId:
            task.id,

        title:
            cleanText(
                safeString(
                    payload.title ||
                    task.title
                ),
                200
            ),

        message:
            cleanText(
                safeString(
                    payload.message ||
                    task.description ||
                    "TürkAI görevi tamamlandı."
                ),
                2000
            ),

        type:
            safeString(
                payload.type ||
                task.type
            ),

        channel:
            safeString(
                payload.channel ||
                task.notification
                    .channel ||
                "socket"
            ),

        read:
            false,

        createdAt:
            nowISO(),

        sent:
            false,

        sentAt:
            null,

        error:
            null
    };

    taskNotificationQueue8.push(
        notification
    );

    TASK_STATE_8
        .notificationsCreated++;

    saveTaskNotifications8();

    try {
        if (
            io
        ) {
            io.to(
                `turkai:user:${task.userId}`
            ).emit(
                "turkai:notification",
                notification
            );
        }
    } catch {
        // devam
    }

    notification.sent =
        true;

    notification.sentAt =
        nowISO();

    TASK_STATE_8
        .notificationsSent++;

    saveTaskNotifications8();

    return notification;
}


// ============================================================
// TASK USER COUNT
// ============================================================

function getUserTaskCount8(
    userId,
    includeFinished = true
) {
    const id =
        taskUserId8(
            userId
        );

    return Array.from(
        taskStore8.values()
    )
    .filter(
        task =>
            task.userId ===
                id &&
            (
                includeFinished ||
                ![
                    "completed",
                    "cancelled",
                    "failed"
                ].includes(
                    task.status
                )
            )
    )
    .length;
}


// ============================================================
// CREATE TASK
// ============================================================

function createAndScheduleTask8(
    options = {}
) {
    const userId =
        taskUserId8(
            options.userId
        );

    const count =
        getUserTaskCount8(
            userId,
            false
        );

    if (
        count >=
        TASK_CONFIG_8
            .maxTasksPerUser
    ) {
        return {
            success:
                false,

            error:
                "task_limit"
        };
    }

    const type =
        normalizeTaskType8(
            options.type
        );

    const typeDefinition =
        TASK_TYPES_8[
            type
        ];

    if (
        !typeDefinition ||
        !typeDefinition.enabled
    ) {
        return {
            success:
                false,

            error:
                "task_type_disabled"
        };
    }

    const task =
        createTaskRecord8(
            {
                ...options,
                userId
            }
        );

    taskStore8.set(
        task.id,
        task
    );

    task.status =
        "scheduled";

    TASK_STATE_8
        .totalTasks++;

    saveTasksEngine8();

    pushTaskHistory8(
        "created",
        task
    );

    pushTaskEvent8(
        "created",
        task
    );

    return {
        success:
            true,

        task:
            clone(
                task
            )
    };
}


// ============================================================
// QUEUE TASK
// ============================================================

function queueTask8(
    task,
    reason = "scheduler"
) {
    if (!task) {
        return false;
    }

    if (
        [
            "cancelled",
            "completed"
        ].includes(
            task.status
        )
    ) {
        return false;
    }

    if (
        taskQueue8.includes(
            task.id
        )
    ) {
        return false;
    }

    task.status =
        "queued";

    task.updatedAt =
        nowISO();

    taskQueue8.push(
        task.id
    );

    TASK_STATE_8
        .queuedTasks =
        taskQueue8.length;

    saveTasksEngine8();

    pushTaskHistory8(
        "queued",
        task,
        {
            reason
        }
    );

    pushTaskEvent8(
        "queued",
        task,
        {
            reason
        }
    );

    return true;
}


// ============================================================
// TASK TIME CHECK
// ============================================================

function taskIsDue8(
    task,
    now = new Date()
) {
    if (!task) {
        return false;
    }

    if (
        task.status !==
            "scheduled"
    ) {
        return false;
    }

    const nextRun =
        parseTaskDate8(
            task.nextRunAt
        );

    if (!nextRun) {
        return false;
    }

    return (
        nextRun.getTime() <=
        now.getTime()
    );
}


// ============================================================
// TASK SCHEDULER
// ============================================================

function runTaskScheduler8() {
    if (
        !TASK_CONFIG_8
            .enabled
    ) {
        return;
    }

    const now =
        new Date();

    TASK_STATE_8
        .schedulerRuns++;

    TASK_STATE_8
        .lastSchedulerRun =
        now.toISOString();

    for (
        const task
        of taskStore8.values()
    ) {
        if (
            taskIsDue8(
                task,
                now
            )
        ) {
            queueTask8(
                task,
                "time_due"
            );
        }
    }

    saveTaskState8();
    processTaskQueue8();
}


// ============================================================
// TASK TIMEOUT
// ============================================================

function setupTaskTimeout8(
    task
) {
    if (!task) {
        return;
    }

    const timeout =
        Math.min(
            Math.max(
                Number(
                    task.timeoutMS
                ) ||
                TASK_CONFIG_8
                    .defaultTimeoutMS,
                1000
            ),
            TASK_CONFIG_8
                .maxTimeoutMS
        );

    const timer =
        setTimeout(
            () => {
                const running =
                    taskRunning8.get(
                        task.id
                    );

                if (!running) {
                    return;
                }

                task.status =
                    "failed";

                task.error =
                    "task_timeout";

                task.failedAt =
                    nowISO();

                task.updatedAt =
                    nowISO();

                TASK_STATE_8
                    .timedOutTasks++;

                TASK_STATE_8
                    .failedTasks++;

                taskRunning8.delete(
                    task.id
                );

                clearTaskTimer8(
                    task.id
                );

                pushTaskHistory8(
                    "timeout",
                    task
                );

                pushTaskEvent8(
                    "timeout",
                    task
                );

                createTaskNotification8(
                    task,
                    {
                        type:
                            "task_error",

                        title:
                            "Görev zaman aşımına uğradı",

                        message:
                            task.title
                    }
                );

                saveTasksEngine8();

                processTaskQueue8();
            },
            timeout
        );

    taskTimers8.set(
        task.id,
        timer
    );
}


function clearTaskTimer8(
    taskId
) {
    const timer =
        taskTimers8.get(
            taskId
        );

    if (timer) {
        clearTimeout(
            timer
        );

        taskTimers8.delete(
            taskId
        );
    }
}


// ============================================================
// TASK EXECUTION CONTEXT
// ============================================================

function taskExecutionContext8(
    task
) {
    return {
        taskId:
            task.id,

        userId:
            task.userId,

        payload:
            clone(
                task.payload ||
                {}
            ),

        type:
            task.type,

        createdAt:
            task.createdAt,

        now:
            nowISO()
    };
}


// ============================================================
// TASK HANDLER: REMINDER
// ============================================================

async function executeReminderTask8(
    task
) {
    const message =
        cleanText(
            safeString(
                task.payload &&
                (
                    task.payload.message ||
                    task.payload.text
                )
            ) ||
            task.description ||
            task.title,
            3000
        );

    return {
        success:
            true,

        message,

        reminder:
            true
    };
}


// ============================================================
// TASK HANDLER: NOTIFICATION
// ============================================================

async function executeNotificationTask8(
    task
) {
    const message =
        cleanText(
            safeString(
                task.payload &&
                task.payload.message
            ) ||
            task.description ||
            task.title,
            3000
        );

    const notification =
        createTaskNotification8(
            task,
            {
                type:
                    "notification",

                title:
                    task.title,

                message
            }
        );

    return {
        success:
            Boolean(
                notification
            ),

        notification
    };
}


// ============================================================
// TASK HANDLER: RESEARCH
// ============================================================

async function executeResearchTask8(
    task
) {
    const query =
        cleanText(
            safeString(
                task.payload &&
                (
                    task.payload.query ||
                    task.payload.question
                )
            ) ||
            task.description ||
            task.title,
            3000
        );

    if (
        !query
    ) {
        throw new Error(
            "research_query_missing"
        );
    }

    if (
        typeof executeResearch !==
        "function"
    ) {
        throw new Error(
            "research_engine_unavailable"
        );
    }

    TASK_STATE_8
        .researchJobs++;

    const result =
        await executeResearch(
            query,
            {
                userId:
                    task.userId,

                force:
                    Boolean(
                        task.payload &&
                        task.payload.force
                    ),

                maxSources:
                    Number(
                        task.payload &&
                        task.payload.maxSources
                    ) || 8
            }
        );

    return {
        success:
            true,

        research:
            result
    };
}


// ============================================================
// TASK HANDLER: WEATHER
// ============================================================

async function executeWeatherTask8(
    task
) {
    const city =
        safeString(
            task.payload &&
            (
                task.payload.city ||
                task.payload.location
            )
        ) ||
        "İstanbul";

    TASK_STATE_8
        .weatherJobs++;

    if (
        typeof weatherByCity4 !==
        "function"
    ) {
        throw new Error(
            "weather_engine_unavailable"
        );
    }

    const result =
        await weatherByCity4(
            city
        );

    return {
        success:
            true,

        city,

        weather:
            result
    };
}


// ============================================================
// TASK HANDLER: MEDIA MONITOR
// ============================================================

async function executeMediaMonitorTask8(
    task
) {
    const userId =
        task.userId;

    const stats =
        serverState.media &&
        typeof serverState.media
            .getUserStats ===
            "function"
            ? serverState.media
                .getUserStats(
                    userId
                )
            : null;

    return {
        success:
            true,

        media:
            stats
    };
}


// ============================================================
// TASK HANDLER: AI HEALTH
// ============================================================

async function executeAIHealthTask8(
    task
) {
    let diagnostics =
        null;

    try {
        if (
            typeof getProviderStatus ===
            "function"
        ) {
            diagnostics =
                getProviderStatus();
        }
    } catch {
        diagnostics =
            null;
    }

    return {
        success:
            true,

        diagnostics
    };
}


// ============================================================
// TASK HANDLER: SYSTEM HEALTH
// ============================================================

async function executeSystemHealthTask8(
    task
) {
    let ai =
        null;

    let research =
        null;

    let weather =
        null;

    let media =
        null;

    try {
        ai =
            serverState.ai &&
            serverState.ai.engine
                ? {
                    available:
                        true
                }
                : null;
    } catch {
        ai =
            null;
    }

    try {
        research =
            serverState.research &&
            serverState.research.state
                ? clone(
                    serverState
                        .research
                        .state
                )
                : null;
    } catch {
        research =
            null;
    }

    try {
        media =
            serverState.media &&
            serverState.media.state
                ? clone(
                    serverState.media.state
                )
                : null;
    } catch {
        media =
            null;
    }

    try {
        weather =
            typeof MARKET_STATE_4 !==
            "undefined"
                ? clone(
                    MARKET_STATE_4
                )
                : null;
    } catch {
        weather =
            null;
    }

    TASK_STATE_8
        .healthJobs++;

    return {
        success:
            true,

        timestamp:
            nowISO(),

        memory: {
            rssMB:
                bytesToMB6(
                    process.memoryUsage()
                        .rss
                ),

            heapUsedMB:
                bytesToMB6(
                    process.memoryUsage()
                        .heapUsed
                ),

            heapTotalMB:
                bytesToMB6(
                    process.memoryUsage()
                        .heapTotal
                )
        },

        ai,

        research,

        weather,

        media
    };
}


// ============================================================
// TASK HANDLER: CLEANUP
// ============================================================

async function executeCleanupTask8(
    task
) {
    TASK_STATE_8
        .maintenanceJobs++;

    const result = {
        uploads:
            null,

        media:
            null
    };

    try {
        if (
            typeof cleanupOrphanUploads6 ===
            "function"
        ) {
            result.uploads =
                cleanupOrphanUploads6();
        }
    } catch (
        error
    ) {
        result.uploads = {
            success:
                false,

            error:
                error.message
        };
    }

    try {
        if (
            typeof cleanupMediaFiles7 ===
            "function"
        ) {
            result.media =
                cleanupMediaFiles7();
        }
    } catch (
        error
    ) {
        result.media = {
            success:
                false,

            error:
                error.message
        };
    }

    TASK_STATE_8
        .lastCleanupRun =
        nowISO();

    return {
        success:
            true,

        result
    };
}


// ============================================================
// TASK HANDLER: USAGE RESET
// ============================================================

async function executeUsageResetTask8(
    task
) {
    const userId =
        task.payload &&
        task.payload.userId
            ? taskUserId8(
                task.payload
                    .userId
            )
            : null;

    if (
        typeof resetUserUsage5 !==
        "function"
    ) {
        return {
            success:
                false,

            error:
                "usage_reset_engine_unavailable"
        };
    }

    if (
        userId
    ) {
        resetUserUsage5(
            userId
        );

        return {
            success:
                true,

            userId
        };
    }

    return {
        success:
            false,

        error:
            "user_id_required"
    };
}


// ============================================================
// SAFE TASK HANDLER REGISTRY
// ============================================================

const TASK_HANDLERS_8 = {
    reminder:
        executeReminderTask8,

    notification:
        executeNotificationTask8,

    research:
        executeResearchTask8,

    weather:
        executeWeatherTask8,

    media_monitor:
        executeMediaMonitorTask8,

    ai_health:
        executeAIHealthTask8,

    system_health:
        executeSystemHealthTask8,

    cleanup:
        executeCleanupTask8,

    usage_reset:
        executeUsageResetTask8
};


// ============================================================
// EXECUTE TASK
// ============================================================

async function executeTask8(
    task
) {
    if (!task) {
        return {
            success:
                false,

            error:
                "task_missing"
        };
    }

    const handler =
        TASK_HANDLERS_8[
            task.type
        ];

    if (
        typeof handler !==
        "function"
    ) {
        throw new Error(
            "task_handler_not_found"
        );
    }

    return handler(
        task,
        taskExecutionContext8(
            task
        )
    );
}


// ============================================================
// RETRY TASK
// ============================================================

function retryTask8(
    task,
    error
) {
    if (!task) {
        return false;
    }

    if (
        task.retries >=
        task.maxRetries
    ) {
        return false;
    }

    task.retries++;

    TASK_STATE_8
        .retryTasks++;

    const delay =
        Math.min(
            5 * 60 * 1000,
            Math.max(
                1000,
                Math.pow(
                    2,
                    task.retries
                ) *
                1000
            )
        );

    task.status =
        "scheduled";

    task.nextRunAt =
        new Date(
            Date.now() +
            delay
        ).toISOString();

    task.lastError =
        safeString(
            error &&
            error.message
        );

    task.updatedAt =
        nowISO();

    saveTasksEngine8();

    pushTaskHistory8(
        "retry",
        task,
        {
            retry:
                task.retries,

            delay,

            error:
                task.lastError
        }
    );

    pushTaskEvent8(
        "retry",
        task,
        {
            retry:
                task.retries,

            delay
        }
    );

    return true;
}


// ============================================================
// COMPLETE TASK
// ============================================================

function completeTask8(
    task,
    result
) {
    task.executionCount++;

    task.lastRunAt =
        nowISO();

    task.result =
        clone(
            result
        );

    task.error =
        null;

    if (
        normalizeTaskFrequency8(
            task.frequency
        ) ===
        "once"
    ) {
        task.status =
            "completed";

        task.completedAt =
            nowISO();

        task.nextRunAt =
            null;

        TASK_STATE_8
            .completedTasks++;

        createTaskNotification8(
            task,
            {
                type:
                    "task_completed",

                title:
                    task.title,

                message:
                    task.description ||
                    "Görev tamamlandı."
            }
        );

    } else {
        task.status =
            "scheduled";

        task.nextRunAt =
            calculateNextRun8(
                task,
                new Date()
            );
    }

    task.updatedAt =
        nowISO();

    pushTaskHistory8(
        "completed",
        task,
        result
    );

    pushTaskEvent8(
        "completed",
        task,
        {
            result:
                clone(
                    result
                )
        }
    );

    saveTasksEngine8();
}


// ============================================================
// FAIL TASK
// ============================================================

function failTask8(
    task,
    error
) {
    const message =
        safeString(
            error &&
            error.message,
            "task_failed"
        );

    if (
        retryTask8(
            task,
            error
        )
    ) {
        return;
    }

    task.status =
        "failed";

    task.failedAt =
        nowISO();

    task.lastRunAt =
        nowISO();

    task.error =
        message.slice(
            0,
            2000
        );

    task.updatedAt =
        nowISO();

    TASK_STATE_8
        .failedTasks++;

    createTaskNotification8(
        task,
        {
            type:
                "task_error",

            title:
                "TürkAI görevi başarısız",

            message:
                `${task.title}: ${message}`
        }
    );

    pushTaskHistory8(
        "failed",
        task,
        {
            error:
                message
        }
    );

    pushTaskEvent8(
        "failed",
        task,
        {
            error:
                message
        }
    );

    saveTasksEngine8();
}


// ============================================================
// WORKER
// ============================================================

async function runTaskWorker8(
    taskId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return;
    }

    if (
        [
            "cancelled",
            "completed"
        ].includes(
            task.status
        )
    ) {
        return;
    }

    task.status =
        "running";

    task.lastRunAt =
        nowISO();

    task.updatedAt =
        nowISO();

    taskRunning8.set(
        task.id,
        {
            startedAt:
                Date.now(),

            taskId:
                task.id
        }
    );

    TASK_STATE_8
        .runningTasks =
        taskRunning8.size;

    TASK_STATE_8
        .currentWorkers =
        taskRunning8.size;

    pushTaskHistory8(
        "running",
        task
    );

    pushTaskEvent8(
        "running",
        task
    );

    saveTasksEngine8();

    setupTaskTimeout8(
        task
    );

    try {
        const result =
            await executeTask8(
                task
            );

        clearTaskTimer8(
            task.id
        );

        taskRunning8.delete(
            task.id
        );

        completeTask8(
            task,
            result
        );

    } catch (
        error
    ) {
        clearTaskTimer8(
            task.id
        );

        taskRunning8.delete(
            task.id
        );

        failTask8(
            task,
            error
        );
    }

    TASK_STATE_8
        .runningTasks =
        taskRunning8.size;

    TASK_STATE_8
        .currentWorkers =
        taskRunning8.size;
}


// ============================================================
// PROCESS TASK QUEUE
// ============================================================

async function processTaskQueue8() {
    if (
        !TASK_CONFIG_8
            .enabled
    ) {
        return;
    }

    while (
        taskQueue8.length >
            0
    ) {
        const taskId =
            taskQueue8.shift();

        const task =
            taskStore8.get(
                taskId
            );

        if (!task) {
            continue;
        }

        if (
            task.status !==
                "queued"
        ) {
            continue;
        }

        if (
            taskRunning8.size >=
            4
        ) {
            taskQueue8.unshift(
                taskId
            );

            break;
        }

        await runTaskWorker8(
            taskId
        );
    }

    TASK_STATE_8
        .queuedTasks =
        taskQueue8.length;

    TASK_STATE_8
        .runningTasks =
        taskRunning8.size;

    saveTaskState8();
}


// ============================================================
// CANCEL TASK
// ============================================================

function cancelTask8(
    taskId,
    userId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return {
            success:
                false,

            error:
                "task_not_found"
        };
    }

    const user =
        taskUserId8(
            userId
        );

    if (
        task.userId !==
        user
    ) {
        return {
            success:
                false,

            error:
                "task_forbidden"
        };
    }

    if (
        [
            "completed",
            "cancelled"
        ].includes(
            task.status
        )
    ) {
        return {
            success:
                true,

            task:
                clone(
                    task
                )
        };
    }

    task.status =
        "cancelled";

    task.cancelledAt =
        nowISO();

    task.updatedAt =
        nowISO();

    const queueIndex =
        taskQueue8.indexOf(
            task.id
        );

    if (
        queueIndex >=
        0
    ) {
        taskQueue8.splice(
            queueIndex,
            1
        );
    }

    clearTaskTimer8(
        task.id
    );

    taskRunning8.delete(
        task.id
    );

    TASK_STATE_8
        .cancelledTasks++;

    pushTaskHistory8(
        "cancelled",
        task
    );

    pushTaskEvent8(
        "cancelled",
        task
    );

    saveTasksEngine8();

    return {
        success:
            true,

        task:
            clone(
                task
            )
    };
}


// ============================================================
// PAUSE TASK
// ============================================================

function pauseTask8(
    taskId,
    userId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return {
            success:
                false,

            error:
                "task_not_found"
        };
    }

    if (
        task.userId !==
        taskUserId8(
            userId
        )
    ) {
        return {
            success:
                false,

            error:
                "task_forbidden"
        };
    }

    if (
        [
            "completed",
            "cancelled"
        ].includes(
            task.status
        )
    ) {
        return {
            success:
                false,

            error:
                "task_not_pauseable"
        };
    }

    task.status =
        "paused";

    task.updatedAt =
        nowISO();

    const index =
        taskQueue8.indexOf(
            task.id
        );

    if (
        index >=
        0
    ) {
        taskQueue8.splice(
            index,
            1
        );
    }

    pushTaskHistory8(
        "paused",
        task
    );

    pushTaskEvent8(
        "paused",
        task
    );

    saveTasksEngine8();

    return {
        success:
            true,

        task:
            clone(
                task
            )
    };
}


// ============================================================
// RESUME TASK
// ============================================================

function resumeTask8(
    taskId,
    userId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return {
            success:
                false,

            error:
                "task_not_found"
        };
    }

    if (
        task.userId !==
        taskUserId8(
            userId
        )
    ) {
        return {
            success:
                false,

            error:
                "task_forbidden"
        };
    }

    if (
        task.status !==
        "paused"
    ) {
        return {
            success:
                false,

            error:
                "task_not_paused"
        };
    }

    task.status =
        "scheduled";

    if (
        !task.nextRunAt
    ) {
        task.nextRunAt =
            new Date()
                .toISOString();
    }

    task.updatedAt =
        nowISO();

    pushTaskHistory8(
        "resumed",
        task
    );

    pushTaskEvent8(
        "resumed",
        task
    );

    saveTasksEngine8();

    return {
        success:
            true,

        task:
            clone(
                task
            )
    };
}


// ============================================================
// DELETE TASK
// ============================================================

function deleteTask8(
    taskId,
    userId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return {
            success:
                false,

            error:
                "task_not_found"
        };
    }

    if (
        task.userId !==
        taskUserId8(
            userId
        )
    ) {
        return {
            success:
                false,

            error:
                "task_forbidden"
        };
    }

    cancelTask8(
        taskId,
        userId
    );

    taskStore8.delete(
        taskId
    );

    const index =
        taskQueue8.indexOf(
            taskId
        );

    if (
        index >=
        0
    ) {
        taskQueue8.splice(
            index,
            1
        );
    }

    taskRunning8.delete(
        taskId
    );

    clearTaskTimer8(
        taskId
    );

    saveTasksEngine8();

    pushTaskHistory8(
        "deleted",
        task
    );

    pushTaskEvent8(
        "deleted",
        task
    );

    return {
        success:
            true,

        taskId
    };
}


// ============================================================
// GET TASK
// ============================================================

function getTask8(
    taskId,
    userId
) {
    const task =
        taskStore8.get(
            taskId
        );

    if (!task) {
        return null;
    }

    if (
        task.userId !==
        taskUserId8(
            userId
        )
    ) {
        return null;
    }

    return clone(
        task
    );
}


// ============================================================
// LIST TASKS
// ============================================================

function listTasks8(
    userId,
    filters = {}
) {
    const id =
        taskUserId8(
            userId
        );

    let tasks =
        Array.from(
            taskStore8.values()
        )
        .filter(
            task =>
                task.userId ===
                id
        );

    if (
        filters.type
    ) {
        const type =
            normalizeTaskType8(
                filters.type
            );

        tasks =
            tasks.filter(
                task =>
                    task.type ===
                    type
            );
    }

    if (
        filters.status
    ) {
        const status =
            safeString(
                filters.status
            ).toLowerCase();

        tasks =
            tasks.filter(
                task =>
                    task.status ===
                    status
            );
    }

    tasks.sort(
        (
            a,
            b
        ) =>
            new Date(
                a.nextRunAt ||
                a.createdAt
            ) -
            new Date(
                b.nextRunAt ||
                b.createdAt
            )
    );

    const limit =
        Math.min(
            Math.max(
                Number(
                    filters.limit
                ) || 100,
                1
            ),
            500
        );

    return tasks
        .slice(
            0,
            limit
        )
        .map(
            clone
        );
}


// ============================================================
// TASK SUMMARY
// ============================================================

function getTaskSummary8(
    userId
) {
    const tasks =
        listTasks8(
            userId,
            {
                limit:
                    500
            }
        );

    const countStatus =
        status =>
            tasks.filter(
                task =>
                    task.status ===
                    status
            ).length;

    return {
        total:
            tasks.length,

        scheduled:
            countStatus(
                "scheduled"
            ),

        queued:
            countStatus(
                "queued"
            ),

        running:
            countStatus(
                "running"
            ),

        completed:
            countStatus(
                "completed"
            ),

        failed:
            countStatus(
                "failed"
            ),

        cancelled:
            countStatus(
                "cancelled"
            ),

        paused:
            countStatus(
                "paused"
            ),

        next:
            tasks
                .filter(
                    task =>
                        [
                            "scheduled",
                            "queued"
                        ].includes(
                            task.status
                        )
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            a.nextRunAt ||
                            0
                        ) -
                        new Date(
                            b.nextRunAt ||
                            0
                        )
                )[0] ||
                null
    };
}


// ============================================================
// TASK HISTORY API
// ============================================================

app.get(
    "/api/tasks/history",
    (req, res) => {
        const userId =
            taskUserId8(
                req.query.userId ||
                "guest"
            );

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit ||
                        100
                    ) || 100,
                    1
                ),
                1000
            );

        const result =
            taskHistory8
                .filter(
                    item =>
                        item.userId ===
                        userId
                )
                .slice(
                    -limit
                )
                .reverse();

        return res.json({
            success:
                true,

            count:
                result.length,

            history:
                result
        });
    }
);


// ============================================================
// CREATE TASK API
// ============================================================

app.post(
    "/api/tasks",
    (req, res) => {
        const body =
            req.body ||
            {};

        const userId =
            taskUserId8(
                body.userId ||
                "guest"
            );

        const result =
            createAndScheduleTask8(
                {
                    userId,

                    type:
                        body.type,

                    title:
                        body.title,

                    description:
                        body.description,

                    payload:
                        body.payload,

                    frequency:
                        body.frequency,

                    interval:
                        body.interval,

                    intervalMS:
                        body.intervalMS,

                    scheduledAt:
                        body.scheduledAt,

                    priority:
                        body.priority,

                    timeoutMS:
                        body.timeoutMS,

                    maxRetries:
                        body.maxRetries,

                    notify:
                        body.notify,

                    channel:
                        body.channel
                }
            );

        if (
            !result.success
        ) {
            return res.status(
                400
            ).json(
                result
            );
        }

        return res.status(
            201
        ).json(
            result
        );
    }
);


// ============================================================
// GET TASKS
// ============================================================

app.get(
    "/api/tasks",
    (req, res) => {
        const userId =
            taskUserId8(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            tasks:
                listTasks8(
                    userId,
                    {
                        type:
                            req.query.type,

                        status:
                            req.query.status,

                        limit:
                            req.query.limit
                    }
                ),

            summary:
                getTaskSummary8(
                    userId
                )
        });
    }
);


// ============================================================
// TASK DETAIL
// ============================================================

app.get(
    "/api/tasks/:taskId",
    (req, res) => {
        const userId =
            taskUserId8(
                req.query.userId ||
                "guest"
            );

        const task =
            getTask8(
                req.params.taskId,
                userId
            );

        if (!task) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "task_not_found"
            });
        }

        return res.json({
            success:
                true,

            task
        });
    }
);


// ============================================================
// CANCEL TASK API
// ============================================================

app.post(
    "/api/tasks/:taskId/cancel",
    (req, res) => {
        const userId =
            taskUserId8(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const result =
            cancelTask8(
                req.params.taskId,
                userId
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(
            result
        );
    }
);


// ============================================================
// PAUSE TASK API
// ============================================================

app.post(
    "/api/tasks/:taskId/pause",
    (req, res) => {
        const userId =
            taskUserId8(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const result =
            pauseTask8(
                req.params.taskId,
                userId
            );

        return res.status(
            result.success
                ? 200
                : 400
        ).json(
            result
        );
    }
);


// ============================================================
// RESUME TASK API
// ============================================================

app.post(
    "/api/tasks/:taskId/resume",
    (req, res) => {
        const userId =
            taskUserId8(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const result =
            resumeTask8(
                req.params.taskId,
                userId
            );

        return res.status(
            result.success
                ? 200
                : 400
        ).json(
            result
        );
    }
);


// ============================================================
// DELETE TASK API
// ============================================================

app.delete(
    "/api/tasks/:taskId",
    (req, res) => {
        const userId =
            taskUserId8(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const result =
            deleteTask8(
                req.params.taskId,
                userId
            );

        return res.status(
            result.success
                ? 200
                : 404
        ).json(
            result
        );
    }
);


// ============================================================
// TASK SUMMARY API
// ============================================================

app.get(
    "/api/tasks/summary",
    (req, res) => {
        const userId =
            taskUserId8(
                req.query.userId ||
                "guest"
            );

        return res.json({
            success:
                true,

            summary:
                getTaskSummary8(
                    userId
                ),

            engine:
                {
                    ...TASK_STATE_8
                }
        });
    }
);


// ============================================================
// TASK NOTIFICATIONS API
// ============================================================

app.get(
    "/api/notifications",
    (req, res) => {
        const userId =
            taskUserId8(
                req.query.userId ||
                "guest"
            );

        const result =
            taskNotificationQueue8
                .filter(
                    notification =>
                        notification
                            .userId ===
                        userId
                )
                .slice(
                    -100
                )
                .reverse();

        return res.json({
            success:
                true,

            notifications:
                result
        });
    }
);


// ============================================================
// MARK NOTIFICATION AS READ
// ============================================================

app.post(
    "/api/notifications/:notificationId/read",
    (req, res) => {
        const userId =
            taskUserId8(
                req.body &&
                req.body.userId
                    ? req.body.userId
                    : req.query.userId ||
                      "guest"
            );

        const notification =
            taskNotificationQueue8.find(
                item =>
                    item.id ===
                        req.params.notificationId &&
                    item.userId ===
                        userId
            );

        if (!notification) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "notification_not_found"
            });
        }

        notification.read =
            true;

        saveTaskNotifications8();

        return res.json({
            success:
                true,

            notification
        });
    }
);


// ============================================================
// TASK ENGINE STATUS
// ============================================================

app.get(
    "/api/tasks/status",
    (req, res) => {
        return res.json({
            success:
                true,

            enabled:
                TASK_CONFIG_8
                    .enabled,

            config:
                {
                    ...TASK_CONFIG_8
                },

            state:
                {
                    ...TASK_STATE_8
                },

            queues: {
                taskQueue:
                    taskQueue8.length,

                running:
                    taskRunning8.size,

                notifications:
                    taskNotificationQueue8
                        .length
            },

            types:
                Object.keys(
                    TASK_HANDLERS_8
                )
        });
    }
);


// ============================================================
// TASK TYPE API
// ============================================================

app.get(
    "/api/tasks/types",
    (req, res) => {
        return res.json({
            success:
                true,

            types:
                Object.values(
                    TASK_TYPES_8
                ),

            frequencies:
                TASK_FREQUENCIES_8,

            statuses:
                TASK_STATUSES_8
        });
    }
);


// ============================================================
// AUTO TASK CREATOR
// ============================================================

function createSystemTask8(
    type,
    title,
    payload = {},
    frequency = "hourly",
    interval = 1
) {
    return createAndScheduleTask8(
        {
            userId:
                "developer",

            type,

            title,

            description:
                "TürkAI otomatik sistem görevi.",

            payload,

            frequency,

            interval,

            notify:
                false,

            maxRetries:
                1,

            priority:
                90
        }
    );
}


// ============================================================
// DEFAULT SYSTEM TASKS
// ============================================================

function ensureDefaultSystemTasks8() {
    const existingTypes =
        new Set(
            Array.from(
                taskStore8.values()
            )
            .filter(
                task =>
                    task.userId ===
                    "developer" &&
                    [
                        "cleanup",
                        "system_health",
                        "ai_health",
                        "media_monitor"
                    ].includes(
                        task.type
                    ) &&
                    ![
                        "completed",
                        "cancelled"
                    ].includes(
                        task.status
                    )
            )
            .map(
                task =>
                    task.type
            )
        );

    if (
        !existingTypes.has(
            "cleanup"
        )
    ) {
        createSystemTask8(
            "cleanup",
            "TürkAI otomatik temizlik",
            {},
            "hourly",
            6
        );
    }

    if (
        !existingTypes.has(
            "system_health"
        )
    ) {
        createSystemTask8(
            "system_health",
            "TürkAI sistem sağlık kontrolü",
            {},
            "hourly",
            1
        );
    }

    if (
        !existingTypes.has(
            "ai_health"
        )
    ) {
        createSystemTask8(
            "ai_health",
            "TürkAI AI sağlayıcı kontrolü",
            {},
            "hourly",
            1
        );
    }

    if (
        !existingTypes.has(
            "media_monitor"
        )
    ) {
        createSystemTask8(
            "media_monitor",
            "TürkAI medya kuyruk kontrolü",
            {},
            "hourly",
            1
        );
    }
}


ensureDefaultSystemTasks8();


// ============================================================
// SCHEDULER LOOP
// ============================================================

const taskSchedulerTimer8 =
    setInterval(
        () => {
            try {
                runTaskScheduler8();
            } catch (
                error
            ) {
                appendLog(
                    SYSTEM_LOG_FILE,
                    "task_scheduler_error",
                    {
                        message:
                            error.message
                    }
                );
            }
        },
        TASK_CONFIG_8
            .schedulerIntervalMS
    );


// ============================================================
// WORKER LOOP
// ============================================================

const taskWorkerTimer8 =
    setInterval(
        () => {
            try {
                if (
                    taskQueue8
                        .length
                ) {
                    processTaskQueue8();
                }
            } catch (
                error
            ) {
                appendLog(
                    SYSTEM_LOG_FILE,
                    "task_worker_error",
                    {
                        message:
                            error.message
                    }
                );
            }
        },
        TASK_CONFIG_8
            .workerIntervalMS
    );


// ============================================================
// SOCKET.IO TASK EVENTS
// ============================================================

if (io) {
    io.on(
        "connection",
        socket => {
            socket.on(
                "turkai:task:subscribe",
                payload => {
                    const userId =
                        taskUserId8(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    try {
                        socket.join(
                            `turkai:user:${userId}`
                        );
                    } catch {
                        // devam
                    }

                    socket.emit(
                        "turkai:task:subscribed",
                        {
                            success:
                                true,

                            userId
                        }
                    );
                }
            );

            socket.on(
                "turkai:task:list",
                payload => {
                    const userId =
                        taskUserId8(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    socket.emit(
                        "turkai:task:list",
                        {
                            success:
                                true,

                            tasks:
                                listTasks8(
                                    userId,
                                    {
                                        limit:
                                            100
                                    }
                                )
                        }
                    );
                }
            );

            socket.on(
                "turkai:task:summary",
                payload => {
                    const userId =
                        taskUserId8(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    socket.emit(
                        "turkai:task:summary",
                        {
                            success:
                                true,

                            summary:
                                getTaskSummary8(
                                    userId
                                )
                        }
                    );
                }
            );

            socket.on(
                "turkai:task:create",
                payload => {
                    const data =
                        payload ||
                        {};

                    const result =
                        createAndScheduleTask8(
                            {
                                ...data,

                                userId:
                                    taskUserId8(
                                        data.userId ||
                                        "guest"
                                    )
                            }
                        );

                    socket.emit(
                        "turkai:task:created",
                        result
                    );

                    if (
                        result.success
                    ) {
                        processTaskQueue8();
                    }
                }
            );

            socket.on(
                "turkai:task:cancel",
                payload => {
                    const userId =
                        taskUserId8(
                            payload &&
                            payload.userId
                                ? payload.userId
                                : "guest"
                        );

                    const result =
                        cancelTask8(
                            payload &&
                            payload.taskId,
                            userId
                        );

                    socket.emit(
                        "turkai:task:cancelled",
                        result
                    );
                }
            );
        }
    );
}


// ============================================================
// TASK RUNTIME RULE MATRIX
// ============================================================

const TASK_ACTIONS_8 = [
    "create",
    "schedule",
    "queue",
    "run",
    "retry",
    "pause",
    "resume",
    "cancel",
    "delete",
    "notify",
    "history",
    "status"
];

const TASK_ROLES_8 = [
    "guest",
    "free",
    "pro",
    "plus",
    "ultra",
    "developer"
];

const TASK_CATEGORIES_8 = [
    "user",
    "ai",
    "utility",
    "media",
    "system",
    "maintenance"
];

const TASK_RUNTIME_RULES_8 = [];

for (
    const action
    of TASK_ACTIONS_8
) {
    for (
        const role
        of TASK_ROLES_8
    ) {
        for (
            const category
            of TASK_CATEGORIES_8
        ) {
            TASK_RUNTIME_RULES_8.push({
                id:
                    TASK_RUNTIME_RULES_8
                        .length +
                    1,

                action,

                role,

                category,

                enabled:
                    true
            });
        }
    }
}


// ============================================================
// TASK RULE API
// ============================================================

app.get(
    "/api/tasks/rules",
    (req, res) => {
        return res.json({
            success:
                true,

            count:
                TASK_RUNTIME_RULES_8
                    .length,

            rules:
                TASK_RUNTIME_RULES_8
        });
    }
);


// ============================================================
// TASK ENGINE PUBLIC STATE
// ============================================================

serverState.tasksEngine = {
    state:
        TASK_STATE_8,

    config:
        TASK_CONFIG_8,

    tasks:
        taskStore8,

    queue:
        taskQueue8,

    running:
        taskRunning8,

    notifications:
        taskNotificationQueue8,

    history:
        taskHistory8,

    events:
        taskEvents8,

    create:
        createAndScheduleTask8,

    queueTask:
        queueTask8,

    execute:
        executeTask8,

    cancel:
        cancelTask8,

    pause:
        pauseTask8,

    resume:
        resumeTask8,

    delete:
        deleteTask8,

    list:
        listTasks8,

    get:
        getTask8,

    summary:
        getTaskSummary8,

    process:
        processTaskQueue8,

    scheduler:
        runTaskScheduler8
};


// ============================================================
// PART 8 READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 8 Task Engine yüklendi."
);

console.log(
    "[TürkAI] Task count:",
    taskStore8.size
);

console.log(
    "[TürkAI] Queue:",
    taskQueue8.length
);

console.log(
    "[TürkAI] Running:",
    taskRunning8.size
);

console.log(
    "[TürkAI] Notifications:",
    taskNotificationQueue8.length
);

console.log(
    "[TürkAI] Runtime rules:",
    TASK_RUNTIME_RULES_8.length
);

console.log(
    "[TürkAI] Scheduler:",
    TASK_CONFIG_8.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 8 END
// ============================================================
//
// PART 9:
//
// - Güvenlik katmanı
// - Admin / developer yetkilendirme
// - API protection
// - request audit
// - abuse protection
// - suspicious request detection
// - diagnostics
// - system metrics
// - service health
// - rate-limit geliştirmesi
// - secrets handling
// - production hardening
//
// ============================================================
// ============================================================
// TÜRKAI MASTER SERVER — PART 9 / 10
// SECURITY + ADMIN + AUDIT + ABUSE PROTECTION
// ============================================================
//
// Bu bölüm:
//
// - Global HTTP security gateway
// - API secret / admin key
// - Developer key
// - HMAC doğrulama
// - timing-safe secret comparison
// - request audit
// - IP rate limit
// - endpoint rate limit
// - abuse detection
// - path traversal engelleme
// - suspicious request detection
// - security events
// - blocked request log
// - admin diagnostics
// - environment diagnostics
// - secret health
// - runtime security configuration
// - Socket.IO security
// - security dashboard
// - rate-limit reset
// - audit temizleme
// - admin commands
// - production hardening
//
// Not:
// Kimlik doğrulama isteyen admin işlemleri için
// x-turkai-admin-key veya Authorization: Bearer ... kullanılır.
//
// ============================================================


// ============================================================
// SECURITY DIRECTORIES
// ============================================================

const SECURITY_DIR_9 =
    path.join(
        LOGS_DIR,
        "security"
    );

const SECURITY_AUDIT_DIR_9 =
    path.join(
        SECURITY_DIR_9,
        "audit"
    );

const SECURITY_BLOCK_DIR_9 =
    path.join(
        SECURITY_DIR_9,
        "blocked"
    );

const SECURITY_REPORT_DIR_9 =
    path.join(
        SECURITY_DIR_9,
        "reports"
    );

for (
    const dir of [
        SECURITY_DIR_9,
        SECURITY_AUDIT_DIR_9,
        SECURITY_BLOCK_DIR_9,
        SECURITY_REPORT_DIR_9
    ]
) {
    try {
        fs.mkdirSync(
            dir,
            {
                recursive:
                    true
            }
        );
    } catch {
        // devam
    }
}


// ============================================================
// SECURITY FILES
// ============================================================

const SECURITY_AUDIT_FILE_9 =
    path.join(
        SECURITY_DIR_9,
        "audit.json"
    );

const SECURITY_EVENTS_FILE_9 =
    path.join(
        SECURITY_DIR_9,
        "events.json"
    );

const SECURITY_BLOCKED_FILE_9 =
    path.join(
        SECURITY_DIR_9,
        "blocked.json"
    );

const SECURITY_RATE_FILE_9 =
    path.join(
        SECURITY_DIR_9,
        "rate-state.json"
    );

const SECURITY_CONFIG_FILE_9 =
    path.join(
        SECURITY_DIR_9,
        "config.json"
    );


// ============================================================
// SECURITY CONFIG
// ============================================================

const SECURITY_CONFIG_9 = {
    enabled:
        true,

    environment:
        safeString(
            process.env.NODE_ENV ||
            "development"
        ),

    enforceApiAuth:
        String(
            process.env
                .TURKAI_ENFORCE_API_AUTH ||
            (
                process.env.NODE_ENV ===
                "production"
                    ? "false"
                    : "false"
            )
        ).toLowerCase() ===
        "true",

    requireAdminKey:
        true,

    trustProxy:
        String(
            process.env
                .TURKAI_TRUST_PROXY ||
            "false"
        ).toLowerCase() ===
        "true",

    maxRequestsPerMinute:
        120,

    maxApiRequestsPerMinute:
        90,

    maxAdminRequestsPerMinute:
        30,

    maxFailedAuthPerMinute:
        10,

    maxSuspiciousPerMinute:
        8,

    banDurationMS:
        10 * 60 * 1000,

    auditLimit:
        10000,

    eventLimit:
        10000,

    blockedLimit:
        5000,

    bodySampleLength:
        500,

    maxHeaderSampleLength:
        300,

    allowedMethods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
        "HEAD"
    ],

    publicPaths: [
        "/",
        "/index.html",
        "/style.css",
        "/app.js",
        "/favicon.ico",
        "/robots.txt",
        "/api",
        "/api/health",
        "/api/status",
        "/api/master",
        "/api/plans",
        "/api/plans/public",
        "/api/upload/status",
        "/api/upload/config",
        "/api/media/status",
        "/api/media/providers",
        "/api/media/config",
        "/api/tasks/status",
        "/api/tasks/types"
    ],

    suspiciousPatterns: [
        /\.\./,
        /%2e%2e/i,
        /%252e/i,
        /\x00/,
        /%00/i,
        /<script\b/i,
        /javascript:/i,
        /vbscript:/i,
        /data:text\/html/i,
        /union\s+select/i,
        /select\s+.*\s+from\s+/i,
        /drop\s+table/i,
        /insert\s+into/i,
        /delete\s+from/i,
        /or\s+1\s*=\s*1/i,
        /and\s+1\s*=\s*1/i
    ],

    protectedPrefixes: [
        "/api/admin",
        "/api/security/admin"
    ]
};


// ============================================================
// SECURITY STATE
// ============================================================

const SECURITY_STATE_9 = {
    startedAt:
        nowISO(),

    requests:
        0,

    apiRequests:
        0,

    adminRequests:
        0,

    successfulRequests:
        0,

    failedRequests:
        0,

    blockedRequests:
        0,

    suspiciousRequests:
        0,

    failedAuth:
        0,

    rateLimited:
        0,

    bannedIPs:
        0,

    unbannedIPs:
        0,

    auditWrites:
        0,

    securityEvents:
        0,

    middlewareErrors:
        0,

    secretChecks:
        0,

    secretFailures:
        0,

    socketConnections:
        0,

    socketRejected:
        0,

    lastRequestAt:
        null,

    lastBlockedAt:
        null,

    lastSecurityEvent:
        null,

    lastAuditAt:
        null
};


// ============================================================
// SECURITY COLLECTIONS
// ============================================================

let securityAudit9 =
    readJSON(
        SECURITY_AUDIT_FILE_9,
        []
    );

if (
    !Array.isArray(
        securityAudit9
    )
) {
    securityAudit9 =
        [];
}


let securityEvents9 =
    readJSON(
        SECURITY_EVENTS_FILE_9,
        []
    );

if (
    !Array.isArray(
        securityEvents9
    )
) {
    securityEvents9 =
        [];
}


let securityBlocked9 =
    readJSON(
        SECURITY_BLOCKED_FILE_9,
        []
    );

if (
    !Array.isArray(
        securityBlocked9
    )
) {
    securityBlocked9 =
        [];
}


const securityRate9 =
    new Map();

const securityBans9 =
    new Map();

const securityAuthFailures9 =
    new Map();

const securitySuspicious9 =
    new Map();

const securityEndpointRate9 =
    new Map();


// ============================================================
// SECURITY SECRET CONFIG
// ============================================================

const SECURITY_SECRETS_9 = {
    apiSecret:
        safeString(
            process.env.API_SECRET
        ),

    adminKey:
        safeString(
            process.env
                .TURKAI_ADMIN_KEY ||
            process.env.API_SECRET
        ),

    developerKey:
        safeString(
            process.env
                .TURKAI_DEVELOPER_KEY
        ),

    proCode:
        safeString(
            process.env
                .TURKAI_PRO_CODE
        )
};


// ============================================================
// SECRET REDACTION
// ============================================================

function redactSecret9(
    value
) {
    const text =
        safeString(
            value
        );

    if (!text) {
        return "";
    }

    if (
        text.length <=
        8
    ) {
        return "***";
    }

    return (
        text.slice(
            0,
            4
        ) +
        "***" +
        text.slice(
            -4
        )
    );
}


// ============================================================
// ADMIN KEY EXTRACTION
// ============================================================

function getAdminKey9(
    req
) {
    if (!req) {
        return "";
    }

    const direct =
        safeString(
            req.headers &&
            (
                req.headers[
                    "x-turkai-admin-key"
                ] ||
                req.headers[
                    "x-turkai-admin"
                ]
            )
        );

    if (
        direct
    ) {
        return direct;
    }

    const authorization =
        safeString(
            req.headers &&
            req.headers.authorization
        );

    if (
        /^Bearer\s+/i.test(
            authorization
        )
    ) {
        return authorization
            .replace(
                /^Bearer\s+/i,
                ""
            )
            .trim();
    }

    return "";
}


// ============================================================
// TIMING SAFE SECRET
// ============================================================

function timingSafeSecret9(
    provided,
    expected
) {
    const a =
        Buffer.from(
            safeString(
                provided
            )
        );

    const b =
        Buffer.from(
            safeString(
                expected
            )
        );

    if (
        a.length === 0 ||
        b.length === 0
    ) {
        return false;
    }

    if (
        a.length !==
        b.length
    ) {
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            a,
            b
        );
    } catch {
        return false;
    }
}


// ============================================================
// ADMIN AUTH
// ============================================================

function isAdminRequest9(
    req
) {
    SECURITY_STATE_9
        .secretChecks++;

    const key =
        getAdminKey9(
            req
        );

    if (
        !key
    ) {
        SECURITY_STATE_9
            .secretFailures++;

        return false;
    }

    const adminValid =
        timingSafeSecret9(
            key,
            SECURITY_SECRETS_9
                .adminKey
        );

    const developerValid =
        timingSafeSecret9(
            key,
            SECURITY_SECRETS_9
                .developerKey
        );

    if (
        adminValid ||
        developerValid
    ) {
        return true;
    }

    SECURITY_STATE_9
        .secretFailures++;

    return false;
}


// ============================================================
// SECURITY IP
// ============================================================

function getClientIP9(
    req
) {
    if (
        !req
    ) {
        return "unknown";
    }

    if (
        SECURITY_CONFIG_9
            .trustProxy
    ) {
        const forwarded =
            safeString(
                req.headers &&
                req.headers[
                    "x-forwarded-for"
                ]
            );

        if (
            forwarded
        ) {
            return forwarded
                .split(
                    ","
                )[0]
                .trim()
                .slice(
                    0,
                    100
                );
        }

        const realIP =
            safeString(
                req.headers &&
                req.headers[
                    "x-real-ip"
                ]
            );

        if (
            realIP
        ) {
            return realIP
                .slice(
                    0,
                    100
                );
        }
    }

    return safeString(
        req.socket &&
        req.socket.remoteAddress,
        "unknown"
    ).slice(
        0,
        100
    );
}


// ============================================================
// NORMALIZE IP
// ============================================================

function normalizeIP9(
    ip
) {
    return safeString(
        ip,
        "unknown"
    )
        .replace(
            /^::ffff:/,
            ""
        )
        .slice(
            0,
            100
        );
}


// ============================================================
// PUBLIC PATH CHECK
// ============================================================

function isPublicPath9(
    pathname
) {
    const clean =
        safeString(
            pathname
        );

    return SECURITY_CONFIG_9
        .publicPaths
        .some(
            publicPath => {
                if (
                    publicPath ===
                    clean
                ) {
                    return true;
                }

                return (
                    publicPath !==
                        "/" &&
                    clean.startsWith(
                        publicPath +
                        "/"
                    )
                );
            }
        );
}


// ============================================================
// ADMIN PREFIX CHECK
// ============================================================

function isProtectedAdminPath9(
    pathname
) {
    return SECURITY_CONFIG_9
        .protectedPrefixes
        .some(
            prefix =>
                safeString(
                    pathname
                ).startsWith(
                    prefix
                )
        );
}


// ============================================================
// SUSPICIOUS REQUEST
// ============================================================

function detectSuspiciousRequest9(
    req
) {
    const url =
        safeString(
            req &&
            req.originalUrl ||
            req &&
            req.url
        );

    const method =
        safeString(
            req &&
            req.method
        );

    const headerText =
        Object.entries(
            req &&
            req.headers
                ? req.headers
                : {}
        )
        .map(
            ([key, value]) =>
                `${key}:${safeString(
                    value
                )}`
        )
        .join(
            " "
        )
        .slice(
            0,
            4000
        );

    const target =
        (
            url +
            " " +
            method +
            " " +
            headerText
        );

    const matches =
        [];

    for (
        const pattern
        of SECURITY_CONFIG_9
            .suspiciousPatterns
    ) {
        if (
            pattern.test(
                target
            )
        ) {
            matches.push(
                pattern.toString()
            );
        }
    }

    return {
        suspicious:
            matches.length >
            0,

        matches
    };
}


// ============================================================
// SECURITY EVENT
// ============================================================

function securityEvent9(
    type,
    data = {}
) {
    const event = {
        id:
            createId(
                "security"
            ),

        type,

        timestamp:
            nowISO(),

        severity:
            safeString(
                data.severity ||
                "info"
            ),

        message:
            cleanText(
                safeString(
                    data.message
                ),
                1000
            ),

        ip:
            normalizeIP9(
                data.ip ||
                "unknown"
            ),

        method:
            safeString(
                data.method
            ),

        path:
            safeString(
                data.path
            ).slice(
                0,
                500
            ),

        userId:
            safeString(
                data.userId
            ).slice(
                0,
                200
            ),

        details:
            clone(
                data.details ||
                {}
            )
    };

    securityEvents9.push(
        event
    );

    securityEvents9 =
        securityEvents9.slice(
            -SECURITY_CONFIG_9
                .eventLimit
        );

    SECURITY_STATE_9
        .securityEvents++;

    SECURITY_STATE_9
        .lastSecurityEvent =
        event.timestamp;

    writeJSON(
        SECURITY_EVENTS_FILE_9,
        securityEvents9
    );

    return event;
}


// ============================================================
// AUDIT REDACTION
// ============================================================

function sanitizeAuditBody9(
    body
) {
    if (
        body ===
        null ||
        body ===
        undefined
    ) {
        return null;
    }

    if (
        typeof body !==
        "object"
    ) {
        return safeString(
            body
        ).slice(
            0,
            SECURITY_CONFIG_9
                .bodySampleLength
        );
    }

    const result =
        {};

    const secretKeys = [
        "password",
        "token",
        "secret",
        "apiKey",
        "api_key",
        "authorization",
        "adminKey",
        "admin_key",
        "proCode",
        "code"
    ];

    for (
        const [
            key,
            value
        ]
        of Object.entries(
            body
        )
    ) {
        if (
            secretKeys.some(
                secret =>
                    key
                        .toLowerCase()
                        .includes(
                            secret.toLowerCase()
                        )
            )
        ) {
            result[key] =
                "***REDACTED***";

            continue;
        }

        if (
            typeof value ===
            "object"
        ) {
            result[key] =
                "[object]";
            continue;
        }

        result[key] =
            safeString(
                value
            ).slice(
                0,
                SECURITY_CONFIG_9
                    .bodySampleLength
            );
    }

    return result;
}


// ============================================================
// AUDIT RECORD
// ============================================================
function writeSecurityAudit9(
    req,
    responseStatus,
    durationMS,
    extra = {}
) {
    const record = {
        id:
            createId(
                "audit"
            ),

        timestamp:
            nowISO(),

        method:
            safeString(
                req &&
                req.method
            ),

        path:
            safeString(
                req &&
                (
                    req.originalUrl ||
                    req.url
                )
            ).split(
                "?"
            )[0]
            .slice(
                0,
                600
            ),

        status:
            Number(
                responseStatus
            ) || 0,

        durationMS:
            Number(
                durationMS
            ) || 0,

        ip:
            getClientIP9(
                req
            ),

        userAgent:
            safeString(
                req &&
                req.headers &&
                req.headers[
                    "user-agent"
                ]
            ).slice(
                0,
                SECURITY_CONFIG_9
                    .maxHeaderSampleLength
            ),

        userId:
            safeString(
                req &&
                (
                    req.headers[
                        "x-user-id"
                    ] ||
                    req.query &&
                    req.query.userId ||
                    req.body &&
                    req.body.userId
                )
            ).slice(
                0,
                200
            ),

        admin:
            false,

        body:
            sanitizeAuditBody9(
                req &&
                req.body
            ),

        ...clone(
            extra
        )
    };

    record.admin =
        isAdminRequest9(
            req
        );

    securityAudit9.push(
        record
    );

    securityAudit9 =
        securityAudit9.slice(
            -SECURITY_CONFIG_9
                .auditLimit
        );

    SECURITY_STATE_9
        .auditWrites++;

    SECURITY_STATE_9
        .lastAuditAt =
        record.timestamp;

    writeJSON(
        SECURITY_AUDIT_FILE_9,
        securityAudit9
    );

    return record;
}


// ============================================================
// RATE LIMIT STATE
// ============================================================

function getRateBucket9(
    map,
    key,
    windowMS
) {
    const now =
        Date.now();

    let entry =
        map.get(
            key
        );

    if (
        !entry ||
        now -
            entry.startedAt >=
            windowMS
    ) {
        entry = {
            startedAt:
                now,

            count:
                0,

            denied:
                0
        };

        map.set(
            key,
            entry
        );
    }

    return entry;
}


// ============================================================
// IP RATE LIMIT
// ============================================================

function checkIPRateLimit9(
    ip
) {
    const key =
        normalizeIP9(
            ip
        );

    const entry =
        getRateBucket9(
            securityRate9,
            key,
            60 *
                1000
        );

    entry.count++;

    const blocked =
        entry.count >
        SECURITY_CONFIG_9
            .maxRequestsPerMinute;

    if (
        blocked
    ) {
        entry.denied++;

        SECURITY_STATE_9
            .rateLimited++;
    }

    return {
        allowed:
            !blocked,

        count:
            entry.count,

        remaining:
            Math.max(
                0,
                SECURITY_CONFIG_9
                    .maxRequestsPerMinute -
                    entry.count
            )
    };
}


// ============================================================
// API RATE LIMIT
// ============================================================

function checkAPIRateLimit9(
    ip,
    pathName
) {
    const key =
        `${normalizeIP9(
            ip
        )}:${safeString(
            pathName
        ).slice(
            0,
            200
        )}`;

    const entry =
        getRateBucket9(
            securityEndpointRate9,
            key,
            60 *
                1000
        );

    entry.count++;

    const limit =
        isProtectedAdminPath9(
            pathName
        )
            ? SECURITY_CONFIG_9
                .maxAdminRequestsPerMinute
            : SECURITY_CONFIG_9
                .maxApiRequestsPerMinute;

    const blocked =
        entry.count >
        limit;

    if (
        blocked
    ) {
        entry.denied++;

        SECURITY_STATE_9
            .rateLimited++;
    }

    return {
        allowed:
            !blocked,

        count:
            entry.count,

        remaining:
            Math.max(
                0,
                limit -
                    entry.count
            )
    };
}


// ============================================================
// AUTH FAILURE TRACKER
// ============================================================

function registerAuthFailure9(
    ip
) {
    const key =
        normalizeIP9(
            ip
        );

    const entry =
        getRateBucket9(
            securityAuthFailures9,
            key,
            60 *
                1000
        );

    entry.count++;

    SECURITY_STATE_9
        .failedAuth++;

    if (
        entry.count >=
        SECURITY_CONFIG_9
            .maxFailedAuthPerMinute
    ) {
        banIP9(
            key,
            "too_many_auth_failures"
        );
    }

    return entry.count;
}


// ============================================================
// SUSPICIOUS TRACKER
// ============================================================

function registerSuspicious9(
    ip
) {
    const key =
        normalizeIP9(
            ip
        );

    const entry =
        getRateBucket9(
            securitySuspicious9,
            key,
            60 *
                1000
        );

    entry.count++;

    SECURITY_STATE_9
        .suspiciousRequests++;

    if (
        entry.count >=
        SECURITY_CONFIG_9
            .maxSuspiciousPerMinute
    ) {
        banIP9(
            key,
            "suspicious_request_rate"
        );
    }

    return entry.count;
}


// ============================================================
// BAN IP
// ============================================================

function banIP9(
    ip,
    reason
) {
    const key =
        normalizeIP9(
            ip
        );

    const existing =
        securityBans9.get(
            key
        );

    if (
        existing &&
        existing.expiresAt >
            Date.now()
    ) {
        return existing;
    }

    const record = {
        ip:
            key,

        reason:
            safeString(
                reason ||
                "security_policy"
            ),

        createdAt:
            nowISO(),

        expiresAt:
            Date.now() +
            SECURITY_CONFIG_9
                .banDurationMS
    };

    securityBans9.set(
        key,
        record
    );

    SECURITY_STATE_9
        .bannedIPs++;

    securityEvent9(
        "ip_banned",
        {
            severity:
                "warning",

            ip:
                key,

            message:
                "IP geçici olarak engellendi.",

            details: {
                reason:
                    record.reason,

                expiresAt:
                    new Date(
                        record.expiresAt
                    ).toISOString()
            }
        }
    );

    return record;
}


// ============================================================
// CHECK IP BAN
// ============================================================

function isIPBanned9(
    ip
) {
    const key =
        normalizeIP9(
            ip
        );

    const ban =
        securityBans9.get(
            key
        );

    if (!ban) {
        return false;
    }

    if (
        ban.expiresAt <=
        Date.now()
    ) {
        securityBans9.delete(
            key
        );

        SECURITY_STATE_9
            .unbannedIPs++;

        return false;
    }

    return ban;
}


// ============================================================
// UNBAN IP
// ============================================================

function unbanIP9(
    ip
) {
    const key =
        normalizeIP9(
            ip
        );

    const existed =
        securityBans9.delete(
            key
        );

    if (
        existed
    ) {
        SECURITY_STATE_9
            .unbannedIPs++;

        securityEvent9(
            "ip_unbanned",
            {
                severity:
                    "info",

                ip:
                    key,

                message:
                    "IP engeli kaldırıldı."
            }
        );
    }

    return existed;
}


// ============================================================
// SECURITY RESPONSE
// ============================================================

function securityReject9(
    res,
    status,
    code,
    message
) {
    if (
        res.headersSent
    ) {
        return;
    }

    res
        .status(
            status
        )
        .json({
            success:
                false,

            error:
                code,

            message:
                message ||
                code
        });
}


// ============================================================
// REQUEST SECURITY CHECK
// ============================================================

function securityCheck9(
    req
) {
    const ip =
        getClientIP9(
            req
        );

    const pathName =
        safeString(
            req.originalUrl ||
            req.url
        ).split(
            "?"
        )[0];

    const method =
        safeString(
            req.method
        ).toUpperCase();

    if (
        !SECURITY_CONFIG_9
            .allowedMethods
            .includes(
                method
            )
    ) {
        return {
            allowed:
                false,

            status:
                405,

            code:
                "method_not_allowed",

            ip
        };
    }

    const ban =
        isIPBanned9(
            ip
        );

    if (
        ban
    ) {
        return {
            allowed:
                false,

            status:
                429,

            code:
                "ip_temporarily_blocked",

            ip,

            details:
                ban
        };
    }

    const suspicious =
        detectSuspiciousRequest9(
            req
        );

    if (
        suspicious.suspicious
    ) {
        registerSuspicious9(
            ip
        );

        return {
            allowed:
                false,

            status:
                400,

            code:
                "suspicious_request",

            ip,

            details:
                suspicious.matches
        };
    }

    const ipLimit =
        checkIPRateLimit9(
            ip
        );

    if (
        !ipLimit.allowed
    ) {
        return {
            allowed:
                false,

            status:
                429,

            code:
                "rate_limit",

            ip,

            details:
                ipLimit
        };
    }

    if (
        pathName.startsWith(
            "/api/"
        )
    ) {
        SECURITY_STATE_9
            .apiRequests++;

        const apiLimit =
            checkAPIRateLimit9(
                ip,
                pathName
            );

        if (
            !apiLimit.allowed
        ) {
            return {
                allowed:
                    false,

                status:
                    429,

                code:
                    "api_rate_limit",

                ip,

                details:
                    apiLimit
            };
        }
    }

    if (
        isProtectedAdminPath9(
            pathName
        )
    ) {
        SECURITY_STATE_9
            .adminRequests++;

        if (
            !isAdminRequest9(
                req
            )
        ) {
            registerAuthFailure9(
                ip
            );

            return {
                allowed:
                    false,

                status:
                    401,

                code:
                    "admin_auth_required",

                ip
            };
        }
    }

    if (
        SECURITY_CONFIG_9
            .enforceApiAuth &&
        pathName.startsWith(
            "/api/"
        ) &&
        !isPublicPath9(
            pathName
        ) &&
        !isAdminRequest9(
            req
        )
    ) {
        registerAuthFailure9(
            ip
        );

        return {
            allowed:
                false,

            status:
                401,

            code:
                "api_auth_required",

            ip
        };
    }

    return {
        allowed:
            true,

        ip
    };
}


// ============================================================
// EARLY HTTP SECURITY GATEWAY
// ============================================================
//
// Part 1'de http.createServer(app) oluşturulduğu için,
// Express'e gelen istekleri listen() öncesinde tek noktadan
// kontrol ediyoruz.
//
// ============================================================

const originalExpressHTTPHandler9 =
    app;

try {
    httpServer.removeListener(
        "request",
        app
    );

    httpServer.on(
        "request",
        (
            req,
            res
        ) => {
            const started =
                Date.now();

            SECURITY_STATE_9
                .requests++;

            SECURITY_STATE_9
                .lastRequestAt =
                nowISO();

            let check;

            try {
                check =
                    securityCheck9(
                        req
                    );
            } catch (
                error
            ) {
                SECURITY_STATE_9
                    .middlewareErrors++;

                securityEvent9(
                    "security_middleware_error",
                    {
                        severity:
                            "error",

                        ip:
                            getClientIP9(
                                req
                            ),

                        method:
                            req.method,

                        path:
                            req.url,

                        message:
                            error.message
                    }
                );

                check = {
                    allowed:
                        false,

                    status:
                        500,

                    code:
                        "security_middleware_error"
                };
            }

            if (
                !check.allowed
            ) {
                SECURITY_STATE_9
                    .blockedRequests++;

                SECURITY_STATE_9
                    .failedRequests++;

                SECURITY_STATE_9
                    .lastBlockedAt =
                    nowISO();

                securityBlocked9.push({
                    id:
                        createId(
                            "blocked"
                        ),

                    timestamp:
                        nowISO(),

                    ip:
                        check.ip ||
                        "unknown",

                    method:
                        req.method,

                    path:
                        safeString(
                            req.url
                        ).slice(
                            0,
                            1000
                        ),

                    status:
                        check.status,

                    code:
                        check.code,

                    details:
                        clone(
                            check.details ||
                            {}
                        )
                });

                securityBlocked9 =
                    securityBlocked9.slice(
                        -SECURITY_CONFIG_9
                            .blockedLimit
                    );

                writeJSON(
                    SECURITY_BLOCKED_FILE_9,
                    securityBlocked9
                );

                securityEvent9(
                    "request_blocked",
                    {
                        severity:
                            check.status >=
                            500
                                ? "error"
                                : "warning",

                        ip:
                            check.ip ||
                            "unknown",

                        method:
                            req.method,

                        path:
                            req.url,

                        message:
                            check.code
                    }
                );

                securityReject9(
                    res,
                    check.status,
                    check.code,
                    check.code
                );

                try {
                    req.resume();
                } catch {
                    // devam
                }

                return;
            }

            try {
                SECURITY_STATE_9
                    .successfulRequests++;

                res.once(
                    "finish",
                    () => {
                        try {
                            const duration =
                                Date.now() -
                                started;

                            writeSecurityAudit9(
                                req,
                                res.statusCode,
                                duration
                            );
                        } catch (
                            error
                        ) {
                            SECURITY_STATE_9
                                .middlewareErrors++;

                            appendLog(
                                SYSTEM_LOG_FILE,
                                "security_audit_error",
                                {
                                    message:
                                        error.message
                                }
                            );
                        }
                    }
                );

                originalExpressHTTPHandler9(
                    req,
                    res
                );
            } catch (
                error
            ) {
                SECURITY_STATE_9
                    .failedRequests++;

                securityEvent9(
                    "request_dispatch_error",
                    {
                        severity:
                            "error",

                        ip:
                            getClientIP9(
                                req
                            ),

                        method:
                            req.method,

                        path:
                            req.url,

                        message:
                            error.message
                    }
                );

                if (
                    !res.headersSent
                ) {
                    res.status(
                        500
                    ).json({
                        success:
                            false,

                        error:
                            "request_dispatch_error"
                    });
                }
            }
        }
    );
} catch (
    error
) {
    appendLog(
        SYSTEM_LOG_FILE,
        "security_gateway_install_error",
        {
            message:
                error.message
        }
    );
}


// ============================================================
// REQUEST ID
// ============================================================

if (
    typeof app.use ===
    "function"
) {
    app.use(
        (
            req,
            res,
            next
        ) => {
            const requestId =
                createId(
                    "req"
                );

            req.turkaiRequestId =
                requestId;

            res.setHeader(
                "X-TürkAI-Request-ID",
                requestId
            );

            next();
        }
    );
}


// ============================================================
// SECURITY HEADERS 2ND LAYER
// ============================================================

if (
    typeof app.use ===
    "function"
) {
    app.use(
        (
            req,
            res,
            next
        ) => {
            res.setHeader(
                "X-Content-Type-Options",
                "nosniff"
            );

            res.setHeader(
                "X-Frame-Options",
                "SAMEORIGIN"
            );

            res.setHeader(
                "Referrer-Policy",
                "strict-origin-when-cross-origin"
            );

            res.setHeader(
                "Permissions-Policy",
                "camera=(), microphone=(), geolocation=()"
            );

            next();
        }
    );
}


// ============================================================
// SECURITY STATUS
// ============================================================

function getSecurityStatus9() {
    return {
        enabled:
            SECURITY_CONFIG_9
                .enabled,

        environment:
            SECURITY_CONFIG_9
                .environment,

        enforceApiAuth:
            SECURITY_CONFIG_9
                .enforceApiAuth,

        adminKeyConfigured:
            Boolean(
                SECURITY_SECRETS_9
                    .adminKey
            ),

        apiSecretConfigured:
            Boolean(
                SECURITY_SECRETS_9
                    .apiSecret
            ),

        developerKeyConfigured:
            Boolean(
                SECURITY_SECRETS_9
                    .developerKey
            ),

        proCodeConfigured:
            Boolean(
                SECURITY_SECRETS_9
                    .proCode
            ),

        bannedIPs:
            securityBans9
                .size,

        rateEntries:
            securityRate9
                .size,

        endpointRateEntries:
            securityEndpointRate9
                .size,

        auditEntries:
            securityAudit9
                .length,

        eventEntries:
            securityEvents9
                .length,

        blockedEntries:
            securityBlocked9
                .length,

        state:
            {
                ...SECURITY_STATE_9
            }
    };
}


// ============================================================
// SECURITY CONFIG SAVE
// ============================================================

writeJSON(
    SECURITY_CONFIG_FILE_9,
    {
        ...SECURITY_CONFIG_9,

        secrets: {
            apiSecret:
                redactSecret9(
                    SECURITY_SECRETS_9
                        .apiSecret
                ),

            adminKey:
                redactSecret9(
                    SECURITY_SECRETS_9
                        .adminKey
                ),

            developerKey:
                redactSecret9(
                    SECURITY_SECRETS_9
                        .developerKey
                ),

            proCode:
                redactSecret9(
                    SECURITY_SECRETS_9
                        .proCode
                )
        }
    }
);


// ============================================================
// SECURITY PUBLIC STATUS
// ============================================================

app.get(
    "/api/security/status",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            security: {
                enabled:
                    SECURITY_CONFIG_9
                        .enabled,

                environment:
                    SECURITY_CONFIG_9
                        .environment,

                enforceApiAuth:
                    SECURITY_CONFIG_9
                        .enforceApiAuth,

                adminKeyConfigured:
                    Boolean(
                        SECURITY_SECRETS_9
                            .adminKey
                    ),

                rateLimited:
                    SECURITY_STATE_9
                        .rateLimited,

                blockedRequests:
                    SECURITY_STATE_9
                        .blockedRequests
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// SECURITY ADMIN MIDDLEWARE
// ============================================================

function adminGuard9(
    req,
    res,
    next
) {
    if (
        isAdminRequest9(
            req
        )
    ) {
        next();
        return;
    }

    registerAuthFailure9(
        getClientIP9(
            req
        )
    );

    return res.status(
        401
    ).json({
        success:
            false,

        error:
            "admin_auth_required"
    });
}


// ============================================================
// SECURITY DIAGNOSTICS
// ============================================================

app.get(
    "/api/security/admin/diagnostics",
    adminGuard9,
    (
        req,
        res
    ) => {
        const memory =
            process.memoryUsage();

        return res.json({
            success:
                true,

            server: {
                version:
                    SERVER_VERSION,

                node:
                    process.version,

                pid:
                    process.pid,

                platform:
                    process.platform,

                arch:
                    process.arch,

                uptime:
                    process.uptime()
            },

            memory: {
                rssMB:
                    bytesToMB6(
                        memory.rss
                    ),

                heapUsedMB:
                    bytesToMB6(
                        memory.heapUsed
                    ),

                heapTotalMB:
                    bytesToMB6(
                        memory.heapTotal
                    ),

                externalMB:
                    bytesToMB6(
                        memory.external
                    ),

                arrayBuffersMB:
                    bytesToMB6(
                        memory.arrayBuffers
                    )
            },

            runtime:
                clone(
                    runtime
                ),

            security:
                getSecurityStatus9(),

            providers:
                Object.keys(
                    providers || {}
                ),

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// SECURITY CONFIG ENDPOINT
// ============================================================

app.get(
    "/api/security/admin/config",
    adminGuard9,
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            config: {
                ...SECURITY_CONFIG_9
            },

            secrets: {
                apiSecret:
                    redactSecret9(
                        SECURITY_SECRETS_9
                            .apiSecret
                    ),

                adminKey:
                    redactSecret9(
                        SECURITY_SECRETS_9
                            .adminKey
                    ),

                developerKey:
                    redactSecret9(
                        SECURITY_SECRETS_9
                            .developerKey
                    ),

                proCode:
                    redactSecret9(
                        SECURITY_SECRETS_9
                            .proCode
                    )
            }
        });
    }
);


// ============================================================
// SECURITY AUDIT API
// ============================================================

app.get(
    "/api/security/admin/audit",
    adminGuard9,
    (
        req,
        res
    ) => {
        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 100,
                    1
                ),
                1000
            );

        const records =
            securityAudit9
                .slice(
                    -limit
                )
                .reverse();

        return res.json({
            success:
                true,

            count:
                records.length,

            records
        });
    }
);


// ============================================================
// SECURITY EVENTS API
// ============================================================

app.get(
    "/api/security/admin/events",
    adminGuard9,
    (
        req,
        res
    ) => {
        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 100,
                    1
                ),
                1000
            );

        return res.json({
            success:
                true,

            events:
                securityEvents9
                    .slice(
                        -limit
                    )
                    .reverse()
        });
    }
);


// ============================================================
// BLOCKED REQUESTS API
// ============================================================

app.get(
    "/api/security/admin/blocked",
    adminGuard9,
    (
        req,
        res
    ) => {
        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 100,
                    1
                ),
                1000
            );

        return res.json({
            success:
                true,

            blocked:
                securityBlocked9
                    .slice(
                        -limit
                    )
                    .reverse()
        });
    }
);


// ============================================================
// BANNED IP LIST
// ============================================================

app.get(
    "/api/security/admin/bans",
    adminGuard9,
    (
        req,
        res
    ) => {
        const now =
            Date.now();

        const bans =
            Array.from(
                securityBans9
                    .values()
            )
            .filter(
                ban =>
                    ban.expiresAt >
                    now
            )
            .map(
                ban => ({
                    ...ban,

                    expiresAt:
                        new Date(
                            ban.expiresAt
                        ).toISOString()
                })
            );

        return res.json({
            success:
                true,

            bans
        });
    }
);


// ============================================================
// UNBAN IP
// ============================================================

app.post(
    "/api/security/admin/unban",
    adminGuard9,
    (
        req,
        res
    ) => {
        const ip =
            normalizeIP9(
                req.body &&
                req.body.ip
            );

        if (
            !ip ||
            ip ===
                "unknown"
        ) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "ip_required"
            });
        }

        const removed =
            unbanIP9(
                ip
            );

        return res.json({
            success:
                true,

            ip,

            removed
        });
    }
);


// ============================================================
// MANUAL BAN
// ============================================================

app.post(
    "/api/security/admin/ban",
    adminGuard9,
    (
        req,
        res
    ) => {
        const ip =
            normalizeIP9(
                req.body &&
                req.body.ip
            );

        const reason =
            safeString(
                req.body &&
                req.body.reason
            ) ||
            "admin_action";

        if (
            !ip ||
            ip ===
                "unknown"
        ) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "ip_required"
            });
        }

        const ban =
            banIP9(
                ip,
                reason
            );

        return res.json({
            success:
                true,

            ban: {
                ...ban,

                expiresAt:
                    new Date(
                        ban.expiresAt
                    ).toISOString()
            }
        });
    }
);


// ============================================================
// RESET RATE LIMITS
// ============================================================

app.post(
    "/api/security/admin/reset-rate",
    adminGuard9,
    (
        req,
        res
    ) => {
        const ip =
            safeString(
                req.body &&
                req.body.ip
            );

        if (
            ip
        ) {
            securityRate9.delete(
                normalizeIP9(
                    ip
                )
            );

            securityAuthFailures9.delete(
                normalizeIP9(
                    ip
                )
            );

            securitySuspicious9.delete(
                normalizeIP9(
                    ip
                )
            );

            for (
                const key
                of Array.from(
                    securityEndpointRate9.keys()
                )
            ) {
                if (
                    key.startsWith(
                        `${normalizeIP9(
                            ip
                        )}:`
                    )
                ) {
                    securityEndpointRate9.delete(
                        key
                    );
                }
            }

            return res.json({
                success:
                    true,

                ip,

                reset:
                    true
            });
        }

        securityRate9.clear();
        securityAuthFailures9.clear();
        securitySuspicious9.clear();
        securityEndpointRate9.clear();

        return res.json({
            success:
                true,

            reset:
                "all"
        });
    }
);


// ============================================================
// CLEAR AUDIT
// ============================================================

app.post(
    "/api/security/admin/clear-audit",
    adminGuard9,
    (
        req,
        res
    ) => {
        securityAudit9 =
            [];

        writeJSON(
            SECURITY_AUDIT_FILE_9,
            securityAudit9
        );

        securityEvent9(
            "audit_cleared",
            {
                severity:
                    "warning",

                message:
                    "Audit kayıtları temizlendi."
            }
        );

        return res.json({
            success:
                true,

            cleared:
                true
        });
    }
);


// ============================================================
// CLEAR SECURITY EVENTS
// ============================================================

app.post(
    "/api/security/admin/clear-events",
    adminGuard9,
    (
        req,
        res
    ) => {
        securityEvents9 =
            [];

        writeJSON(
            SECURITY_EVENTS_FILE_9,
            securityEvents9
        );

        return res.json({
            success:
                true,

            cleared:
                true
        });
    }
);


// ============================================================
// SECURITY CHECK API
// ============================================================

app.post(
    "/api/security/check",
    (
        req,
        res
    ) => {
        const target =
            safeString(
                req.body &&
                req.body.value
            );

        const matches =
            [];

        for (
            const pattern
            of SECURITY_CONFIG_9
                .suspiciousPatterns
        ) {
            if (
                pattern.test(
                    target
                )
            ) {
                matches.push(
                    pattern.toString()
                );
            }
        }

        return res.json({
            success:
                true,

            suspicious:
                matches.length >
                0,

            matches
        });
    }
);


// ============================================================
// SECRET HEALTH
// ============================================================

app.get(
    "/api/security/admin/secrets",
    adminGuard9,
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            secrets: {
                API_SECRET:
                    Boolean(
                        SECURITY_SECRETS_9
                            .apiSecret
                    ),

                TURKAI_ADMIN_KEY:
                    Boolean(
                        SECURITY_SECRETS_9
                            .adminKey
                    ),

                TURKAI_DEVELOPER_KEY:
                    Boolean(
                        SECURITY_SECRETS_9
                            .developerKey
                    ),

                TURKAI_PRO_CODE:
                    Boolean(
                        SECURITY_SECRETS_9
                            .proCode
                    ),

                GROQ_API_KEY:
                    Boolean(
                        process.env
                            .GROQ_API_KEY
                    ),

                CEREBRAS_API_KEY:
                    Boolean(
                        process.env
                            .CEREBRAS_API_KEY
                    ),

                GEMINI_API_KEY:
                    Boolean(
                        process.env
                            .GEMINI_API_KEY
                    ),

                OPENROUTER_API_KEY:
                    Boolean(
                        process.env
                            .OPENROUTER_API_KEY
                    ),

                OPENAI_API_KEY:
                    Boolean(
                        process.env
                            .OPENAI_API_KEY
                    ),

                TURKAI_MEDIA_API_KEY:
                    Boolean(
                        process.env
                            .TURKAI_MEDIA_API_KEY
                    )
            }
        });
    }
);


// ============================================================
// ADMIN SYSTEM SUMMARY
// ============================================================

app.get(
    "/api/admin/system",
    adminGuard9,
    (
        req,
        res
    ) => {
        const system = {
            serverVersion:
                SERVER_VERSION,

            nodeVersion:
                process.version,

            pid:
                process.pid,

            platform:
                process.platform,

            architecture:
                process.arch,

            uptimeSeconds:
                Number(
                    process.uptime()
                .toFixed(
                    2
                )
            ),

            memory:
                {
                    ...process
                        .memoryUsage()
                },

            connections:
                {
                    activeSockets:
                        runtime.activeSockets,

                    activeJobs:
                        runtime.activeJobs
                },

            security:
                getSecurityStatus9(),

            users:
                typeof getPlanStats5 ===
                    "function"
                    ? getPlanStats5()
                    : null,

            media:
                serverState.media &&
                serverState.media.state
                    ? clone(
                        serverState
                            .media
                            .state
                    )
                    : null,

            tasks:
                serverState.tasksEngine &&
                serverState
                    .tasksEngine
                    .state
                    ? clone(
                        serverState
                            .tasksEngine
                            .state
                    )
                    : null
        };

        return res.json({
            success:
                true,

            system
        });
    }
);


// ============================================================
// ADMIN USER SEARCH
// ============================================================

app.get(
    "/api/admin/users",
    adminGuard9,
    (
        req,
        res
    ) => {
        if (
            typeof listPlanUsers5 !==
            "function"
        ) {
            return res.json({
                success:
                    false,

                error:
                    "plan_user_engine_unavailable"
            });
        }

        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 100,
                    1
                ),
                1000
            );

        const users =
            listPlanUsers5(
                {
                    search:
                        req.query.search,

                    plan:
                        req.query.plan,

                    limit
                }
            );

        return res.json({
            success:
                true,

            count:
                users.length,

            users
        });
    }
);


// ============================================================
// ADMIN USER DETAIL
// ============================================================

app.get(
    "/api/admin/user/:userId",
    adminGuard9,
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.params.userId
            );

        if (
            !userId
        ) {
            return res.status(
                400
            ).json({
                success:
                    false,

                error:
                    "user_id_required"
            });
        }

        let plan =
            null;

        let usage =
            null;

        let uploads =
            null;

        let media =
            null;

        let tasks =
            null;

        try {
            plan =
                typeof getUserPlanData5 ===
                    "function"
                    ? getUserPlanData5(
                        userId
                    )
                    : null;
        } catch {
            plan =
                null;
        }

        try {
            usage =
                typeof getUserUsageData5 ===
                    "function"
                    ? getUserUsageData5(
                        userId
                    )
                    : null;
        } catch {
            usage =
                null;
        }

        try {
            uploads =
                typeof getUserUploadStats6 ===
                    "function"
                    ? getUserUploadStats6(
                        userId
                    )
                    : null;
        } catch {
            uploads =
                null;
        }

        try {
            media =
                typeof getUserMediaStats7 ===
                    "function"
                    ? getUserMediaStats7(
                        userId
                    )
                    : null;
        } catch {
            media =
                null;
        }

        try {
            tasks =
                typeof getTaskSummary8 ===
                    "function"
                    ? getTaskSummary8(
                        userId
                    )
                    : null;
        } catch {
            tasks =
                null;
        }

        return res.json({
            success:
                true,

            userId,

            plan,

            usage,

            uploads,

            media,

            tasks
        });
    }
);


// ============================================================
// ADMIN PLAN RESET
// ============================================================

app.post(
    "/api/admin/user/:userId/reset-usage",
    adminGuard9,
    (
        req,
        res
    ) => {
        const userId =
            safeString(
                req.params.userId
            );

        if (
            typeof resetUserUsage5 !==
            "function"
        ) {
            return res.status(
                503
            ).json({
                success:
                    false,

                error:
                    "usage_engine_unavailable"
            });
        }

        try {
            const result =
                resetUserUsage5(
                    userId
                );

            securityEvent9(
                "admin_usage_reset",
                {
                    severity:
                        "warning",

                    userId,

                    message:
                        "Kullanıcı kullanımı admin tarafından sıfırlandı."
                }
            );

            return res.json({
                success:
                    true,

                userId,

                result
            });
        } catch (
            error
        ) {
            return res.status(
                500
            ).json({
                success:
                    false,

                error:
                    "usage_reset_failed",

                message:
                    error.message
            });
        }
    }
);


// ============================================================
// ADMIN HEALTH CHECK
// ============================================================

app.get(
    "/api/admin/health",
    adminGuard9,
    (
        req,
        res
    ) => {
        const checks =
            {};

        checks.node =
            Boolean(
                process.version
            );

        checks.filesystem =
            Boolean(
                fs.existsSync(
                    ROOT_DIR
                )
            );

        checks.data =
            Boolean(
                fs.existsSync(
                    DATA_DIR
                )
            );

        checks.uploads =
            Boolean(
                fs.existsSync(
                    UPLOADS_DIR
                )
            );

        checks.media =
            Boolean(
                fs.existsSync(
                    MEDIA_DIR
                )
            );

        checks.tasks =
            Boolean(
                fs.existsSync(
                    TASKS_DIR
                )
            );

        checks.socket =
            Boolean(
                io
            );

        checks.ai =
            Boolean(
                serverState.ai
            );

        checks.research =
            Boolean(
                serverState.research
            );

        checks.market =
            Boolean(
                serverState.market
            );

        const allHealthy =
            Object.values(
                checks
            ).every(
                Boolean
            );

        return res
            .status(
                allHealthy
                    ? 200
                    : 503
            )
            .json({
                success:
                    allHealthy,

                healthy:
                    allHealthy,

                checks,

                timestamp:
                    nowISO()
            });
    }
);


// ============================================================
// SOCKET.IO SECURITY
// ============================================================

if (
    io &&
    typeof io.use ===
        "function"
) {
    io.use(
        (
            socket,
            next
        ) => {
            try {
                SECURITY_STATE_9
                    .socketConnections++;

                const handshake =
                    socket.handshake ||
                    {};

                const auth =
                    handshake.auth ||
                    {};

                const headers =
                    handshake.headers ||
                    {};

                const token =
                    safeString(
                        auth.token ||
                        headers[
                            "x-turkai-admin-key"
                        ]
                    );

                const requestedAdmin =
                    Boolean(
                        auth.admin
                    );

                if (
                    requestedAdmin
                ) {
                    if (
                        !timingSafeSecret9(
                            token,
                            SECURITY_SECRETS_9
                                .adminKey
                        ) &&
                        !timingSafeSecret9(
                            token,
                            SECURITY_SECRETS_9
                                .developerKey
                        )
                    ) {
                        SECURITY_STATE_9
                            .socketRejected++;

                        return next(
                            new Error(
                                "admin_socket_auth_required"
                            )
                        );
                    }
                }

                socket.turkaiSecurity =
                    {
                        admin:
                            requestedAdmin
                                ? true
                                : false,

                        userId:
                            safeString(
                                auth.userId
                            ).slice(
                                0,
                                200
                            )
                    };

                next();
            } catch (
                error
            ) {
                SECURITY_STATE_9
                    .socketRejected++;

                next(
                    new Error(
                        "socket_security_error"
                    )
                );
            }
        }
    );
}


// ============================================================
// SECURITY RULE MATRIX
// ============================================================

const SECURITY_ACTIONS_9 = [
    "request",
    "read",
    "write",
    "delete",
    "admin",
    "audit",
    "ban",
    "unban",
    "diagnostic",
    "socket",
    "upload",
    "media",
    "task",
    "research",
    "plan",
    "ai"
];

const SECURITY_ROLES_9 = [
    "guest",
    "user",
    "free",
    "pro",
    "plus",
    "ultra",
    "developer",
    "admin"
];

const SECURITY_RESOURCES_9 = [
    "chat",
    "research",
    "weather",
    "currency",
    "gold",
    "upload",
    "media",
    "task",
    "plan",
    "system",
    "socket",
    "security"
];

const SECURITY_DECISIONS_9 = [
    "allow",
    "deny",
    "audit",
    "rate_limit",
    "admin_only"
];

const SECURITY_RUNTIME_RULES_9 = [];

for (
    const action
    of SECURITY_ACTIONS_9
) {
    for (
        const role
        of SECURITY_ROLES_9
    ) {
        for (
            const resource
            of SECURITY_RESOURCES_9
        ) {
            for (
                const decision
                of SECURITY_DECISIONS_9
            ) {
                SECURITY_RUNTIME_RULES_9.push({
                    id:
                        SECURITY_RUNTIME_RULES_9
                            .length +
                        1,

                    action,

                    role,

                    resource,

                    decision,

                    enabled:
                        true
                });
            }
        }
    }
}


// ============================================================
// SECURITY RULE API
// ============================================================

app.get(
    "/api/security/admin/rules",
    adminGuard9,
    (
        req,
        res
    ) => {
        const limit =
            Math.min(
                Math.max(
                    Number(
                        req.query.limit
                    ) || 500,
                    1
                ),
                SECURITY_RUNTIME_RULES_9
                    .length
            );

        return res.json({
            success:
                true,

            total:
                SECURITY_RUNTIME_RULES_9
                    .length,

            rules:
                SECURITY_RUNTIME_RULES_9
                    .slice(
                        0,
                        limit
                    )
        });
    }
);


// ============================================================
// SECURITY METRICS
// ============================================================

function getSecurityMetrics9() {
    const statusCounts =
        {};

    for (
        const record
        of securityAudit9
    ) {
        const code =
            String(
                Math.floor(
                    Number(
                        record.status
                    ) /
                    100
                )
            ) +
            "xx";

        statusCounts[code] =
            (
                statusCounts[code] ||
                0
            ) + 1;
    }

    const recentWindow =
        Date.now() -
        60 *
        1000;

    const recentAudit =
        securityAudit9.filter(
            record =>
                new Date(
                    record.timestamp
                ).getTime() >
                recentWindow
        );

    const recentBlocked =
        securityBlocked9.filter(
            record =>
                new Date(
                    record.timestamp
                ).getTime() >
                recentWindow
        );

    return {
        statusCounts,

        recentRequests:
            recentAudit.length,

        recentBlocked:
            recentBlocked.length,

        requestsPerMinute:
            recentAudit.length,

        blockedPerMinute:
            recentBlocked.length,

        bannedIPs:
            securityBans9.size,

        failedAuth:
            SECURITY_STATE_9
                .failedAuth,

        suspicious:
            SECURITY_STATE_9
                .suspiciousRequests,

        rateLimited:
            SECURITY_STATE_9
                .rateLimited
    };
}


// ============================================================
// SECURITY METRICS API
// ============================================================

app.get(
    "/api/security/admin/metrics",
    adminGuard9,
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            metrics:
                getSecurityMetrics9()
        });
    }
);


// ============================================================
// SECURITY SELF TEST
// ============================================================

function runSecuritySelfTest9() {
    const tests =
        [];

    const addTest =
        (
            name,
            pass,
            details = {}
        ) => {
            tests.push({
                name,
                pass:
                    Boolean(
                        pass
                    ),
                details
            });
        };

    addTest(
        "crypto",
        Boolean(
            crypto &&
            typeof crypto.timingSafeEqual ===
                "function"
        )
    );

    addTest(
        "filesystem",
        Boolean(
            fs.existsSync(
                SECURITY_DIR_9
            )
        )
    );

    addTest(
        "json-storage",
        Boolean(
            typeof writeJSON ===
            "function"
        )
    );

    addTest(
        "express",
        Boolean(
            app
        )
    );

    addTest(
        "http-server",
        Boolean(
            httpServer
        )
    );

    addTest(
        "socketio",
        Boolean(
            io
        )
    );

    addTest(
        "admin-secret",
        Boolean(
            SECURITY_SECRETS_9
                .adminKey
        )
    );

    addTest(
        "api-secret",
        Boolean(
            SECURITY_SECRETS_9
                .apiSecret
        )
    );

    addTest(
        "security-config",
        Boolean(
            SECURITY_CONFIG_9
        )
    );

    return {
        success:
            tests.every(
                test =>
                    test.pass
            ),

        tests
    };
}


// ============================================================
// SECURITY SELF TEST API
// ============================================================

app.get(
    "/api/security/admin/self-test",
    adminGuard9,
    (
        req,
        res
    ) => {
        const result =
            runSecuritySelfTest9();

        return res.status(
            result.success
                ? 200
                : 503
        ).json(
            result
        );
    }
);


// ============================================================
// ADMIN COMMAND
// ============================================================

app.post(
    "/api/security/admin/command",
    adminGuard9,
    (
        req,
        res
    ) => {
        const command =
            safeString(
                req.body &&
                req.body.command
            )
            .toLowerCase();

        if (
            command ===
            "status"
        ) {
            return res.json({
                success:
                    true,

                result:
                    getSecurityStatus9()
            });
        }

        if (
            command ===
            "self-test"
        ) {
            return res.json(
                runSecuritySelfTest9()
            );
        }

        if (
            command ===
            "reset-rate"
        ) {
            securityRate9.clear();
            securityAuthFailures9.clear();
            securitySuspicious9.clear();
            securityEndpointRate9.clear();

            return res.json({
                success:
                    true,

                reset:
                    "rate"
            });
        }

        if (
            command ===
            "cleanup-bans"
        ) {
            let removed =
                0;

            for (
                const [
                    ip,
                    ban
                ]
                of securityBans9
            ) {
                if (
                    ban.expiresAt <=
                    Date.now()
                ) {
                    securityBans9.delete(
                        ip
                    );

                    removed++;
                }
            }

            return res.json({
                success:
                    true,

                removed
            });
        }

        return res.status(
            400
        ).json({
            success:
                false,

            error:
                "unknown_security_command"
        });
    }
);


// ============================================================
// PERIODIC SECURITY CLEANUP
// ============================================================

function cleanupSecurityState9() {
    const now =
        Date.now();

    let expiredBans =
        0;

    for (
        const [
            ip,
            ban
        ]
        of securityBans9
    ) {
        if (
            ban.expiresAt <=
            now
        ) {
            securityBans9.delete(
                ip
            );

            expiredBans++;
        }
    }

    const cleanMap =
        map => {
            for (
                const [
                    key,
                    entry
                ]
                of map
            ) {
                if (
                    !entry ||
                    now -
                        Number(
                            entry.startedAt
                        ) >
                        2 *
                        60 *
                        1000
                ) {
                    map.delete(
                        key
                    );
                }
            }
        };

    cleanMap(
        securityRate9
    );

    cleanMap(
        securityEndpointRate9
    );

    cleanMap(
        securityAuthFailures9
    );

    cleanMap(
        securitySuspicious9
    );

    return {
        expiredBans,

        rateEntries:
            securityRate9.size,

        endpointEntries:
            securityEndpointRate9.size
    };
}


const securityCleanupTimer9 =
    setInterval(
        () => {
            try {
                cleanupSecurityState9();
            } catch (
                error
            ) {
                appendLog(
                    SYSTEM_LOG_FILE,
                    "security_cleanup_error",
                    {
                        message:
                            error.message
                    }
                );
            }
        },
        60 *
        1000
    );


// ============================================================
// SECURITY HEALTH
// ============================================================

app.get(
    "/api/security/health",
    (
        req,
        res
    ) => {
        const selfTest =
            runSecuritySelfTest9();

        const status =
            getSecurityStatus9();

        const healthy =
            Boolean(
                selfTest.success &&
                status.enabled
            );

        return res.status(
            healthy
                ? 200
                : 503
        ).json({
            success:
                healthy,

            healthy,

            selfTest,

            status: {
                enabled:
                    status.enabled,

                adminKeyConfigured:
                    status.adminKeyConfigured,

                apiSecretConfigured:
                    status.apiSecretConfigured,

                bannedIPs:
                    status.bannedIPs
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// SECURITY STATE EXPORT
// ============================================================

serverState.security = {
    config:
        SECURITY_CONFIG_9,

    state:
        SECURITY_STATE_9,

    secretsConfigured: {
        apiSecret:
            Boolean(
                SECURITY_SECRETS_9
                    .apiSecret
            ),

        adminKey:
            Boolean(
                SECURITY_SECRETS_9
                    .adminKey
            ),

        developerKey:
            Boolean(
                SECURITY_SECRETS_9
                    .developerKey
            ),

        proCode:
            Boolean(
                SECURITY_SECRETS_9
                    .proCode
            )
    },

    bans:
        securityBans9,

    rate:
        securityRate9,

    endpointRate:
        securityEndpointRate9,

    audit:
        securityAudit9,

    events:
        securityEvents9,

    blocked:
        securityBlocked9,

    status:
        getSecurityStatus9,

    metrics:
        getSecurityMetrics9,

    selfTest:
        runSecuritySelfTest9,

    ban:
        banIP9,

    unban:
        unbanIP9,

    cleanup:
        cleanupSecurityState9
};


// ============================================================
// PART 9 READY
// ============================================================

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);

console.log(
    "[TürkAI] Part 9 Security Engine yüklendi."
);

console.log(
    "[TürkAI] Security:",
    SECURITY_CONFIG_9.enabled
        ? "AKTİF"
        : "PASİF"
);

console.log(
    "[TürkAI] Admin key:",
    SECURITY_SECRETS_9.adminKey
        ? "AYARLI"
        : "YOK"
);

console.log(
    "[TürkAI] API secret:",
    SECURITY_SECRETS_9.apiSecret
        ? "AYARLI"
        : "YOK"
);

console.log(
    "[TürkAI] API auth:",
    SECURITY_CONFIG_9
        .enforceApiAuth
        ? "ZORUNLU"
        : "OPSİYONEL"
);

console.log(
    "[TürkAI] Audit:",
    securityAudit9.length
);

console.log(
    "[TürkAI] Security events:",
    securityEvents9.length
);

console.log(
    "[TürkAI] Blocked:",
    securityBlocked9.length
);

console.log(
    "[TürkAI] Banned IP:",
    securityBans9.size
);

console.log(
    "[TürkAI] Runtime rules:",
    SECURITY_RUNTIME_RULES_9.length
);

console.log(
    "[TürkAI] Self test:",
    runSecuritySelfTest9()
        .success
        ? "OK"
        : "FAIL"
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// PART 9 END
// ============================================================
//
// PART 10:
//
// - final server integration
// - route conflict cleanup
// - unified diagnostics
// - final 404
// - server listen
// - graceful shutdown
// - uncaught error handling
// - startup health scan
// - Socket.IO startup
// - production environment summary
// - index.html API compatibility contract
//
// ============================================================

// ============================================================
// TÜRKAI MASTER SERVER — PART 10 / 10
// FINAL INTEGRATION + BOOTSTRAP + LISTEN + SHUTDOWN
// ============================================================
//
// Bu bölüm:
//
// - Route conflict resolver
// - Final API bootstrap
// - Frontend API compatibility
// - Full health endpoint
// - Master diagnostics
// - Runtime summary
// - Startup validation
// - Graceful shutdown
// - SIGINT / SIGTERM
// - uncaughtException
// - unhandledRejection
// - process runtime counters
// - final 404
// - final error handler
// - HTTP listen
// - Socket.IO finalization
// - periodic runtime maintenance
//
// ============================================================


// ============================================================
// FINAL INTEGRATION STATE
// ============================================================

const FINAL_STATE_10 = {
    started:
        false,

    ready:
        false,

    shuttingDown:
        false,

    shutdownStartedAt:
        null,

    shutdownFinishedAt:
        null,

    startupChecks:
        [],

    startupWarnings:
        [],

    startupErrors:
        [],

    routeReordered:
        false,

    serverListening:
        false,

    lastHealthCheck:
        null,

    healthChecks:
        0
};


// ============================================================
// ROUTE SPECIFICITY
// ============================================================
//
// Part 5 / Part 6 gibi bölümlerde:
//     /api/plans/:planId
// gibi generic route'lar,
//     /api/plans/stats
// gibi özel route'lardan önce kaydedilmiş olabilir.
//
// Aynı problem:
//     /api/upload/:uploadId
//     /api/upload/list
//
// Express'te ilk eşleşen route çalıştığı için
// final aşamada route'ları specificity'ye göre sıralıyoruz.
//
// ============================================================

function getRouteSpecificity10(
    layer
) {
    if (
        !layer ||
        !layer.route
    ) {
        return -Infinity;
    }

    let routePath =
        layer.route.path;

    if (
        Array.isArray(
            routePath
        )
    ) {
        routePath =
            routePath[0] ||
            "";
    }

    const pathValue =
        safeString(
            routePath
        );

    if (!pathValue) {
        return 0;
    }

    const segments =
        pathValue
            .split("/")
            .filter(
                Boolean
            );

    let score =
        1000;

    for (
        const segment
        of segments
    ) {
        if (
            segment ===
            "*"
        ) {
            score +=
                0;

            continue;
        }

        if (
            segment.startsWith(":")
        ) {
            score +=
                5;

            continue;
        }

        if (
            segment.includes("*")
        ) {
            score +=
                2;

            continue;
        }

        score +=
            50;
    }

    score +=
        segments.length;

    score +=
        pathValue.length /
        10000;

    return score;
}


// ============================================================
// EXPRESS ROUTE REORDER
// ============================================================

function reorderExpressRoutes10() {
    const router =
        app._router ||
        app.router;

    if (
        !router ||
        !Array.isArray(
            router.stack
        )
    ) {
        return {
            success:
                false,

            reason:
                "express_router_stack_unavailable"
        };
    }

    const routeLayers =
        router.stack
            .map(
                (
                    layer,
                    index
                ) => ({
                    layer,
                    index
                })
            )
            .filter(
                item =>
                    item.layer &&
                    item.layer.route
            );

    if (
        routeLayers.length <
        2
    ) {
        return {
            success:
                true,

            reordered:
                false,

            routes:
                routeLayers.length
        };
    }

    const sorted =
        routeLayers
            .slice()
            .sort(
                (
                    a,
                    b
                ) => {
                    const sa =
                        getRouteSpecificity10(
                            a.layer
                        );

                    const sb =
                        getRouteSpecificity10(
                            b.layer
                        );

                    if (
                        sb !==
                        sa
                    ) {
                        return sb - sa;
                    }

                    return (
                        a.index -
                        b.index
                    );
                }
            );

    for (
        let i = 0;
        i <
            routeLayers.length;
        i++
    ) {
        router.stack[
            routeLayers[i].index
        ] =
            sorted[i].layer;
    }

    FINAL_STATE_10
        .routeReordered =
        true;

    return {
        success:
            true,

        reordered:
            true,

        routes:
            routeLayers.length
    };
}


// ============================================================
// RUN ROUTE FIX
// ============================================================

try {
    const routeResult =
        reorderExpressRoutes10();

    if (
        routeResult.success
    ) {
        FINAL_STATE_10
            .startupChecks
            .push({
                name:
                    "route-order",

                success:
                    true,

                details:
                    routeResult
            });
    } else {
        FINAL_STATE_10
            .startupWarnings
            .push(
                `Route resolver: ${
                    routeResult.reason
                }`
            );
    }
} catch (
    error
) {
    FINAL_STATE_10
        .startupWarnings.push(
            `Route resolver error: ${error.message}`
        );
}


// ============================================================
// FINAL RUNTIME COUNTERS
// ============================================================

try {
    runtime.startedAt =
        runtime.startedAt ||
        nowISO();
} catch {
    // devam
}


if (
    typeof runtime.requests !==
    "number"
) {
    runtime.requests =
        0;
}


// ============================================================
// HTTP REQUEST COUNTER
// ============================================================

try {
    httpServer.prependListener(
        "request",
        (
            req
        ) => {
            try {
                runtime.requests++;
            } catch {
                // devam
            }
        }
    );
} catch {
    // devam
}


// ============================================================
// NORMALIZE LOADED TASK STATE
// ============================================================

try {
    TASK_STATE_8
        .totalTasks =
        taskStore8.size;

    TASK_STATE_8
        .queuedTasks =
        taskQueue8.length;

    TASK_STATE_8
        .runningTasks =
        taskRunning8.size;
} catch {
    // devam
}


// ============================================================
// NORMALIZE LOADED MEDIA STATE
// ============================================================

try {
    MEDIA_STATE_7
        .totalJobs =
        mediaJobs7.size;

    MEDIA_STATE_7
        .queuedJobs =
        mediaQueue7.length;

    MEDIA_STATE_7
        .activeWorkers =
        mediaActive7.size;
} catch {
    // devam
}


// ============================================================
// BOOTSTRAP DATA
// ============================================================

function getPublicPlanSummary10() {
    try {
        if (
            typeof getPublicPlans5 ===
            "function"
        ) {
            return getPublicPlans5();
        }
    } catch {
        // fallback
    }

    try {
        if (
            typeof TURKAI_PLANS !==
            "undefined"
        ) {
            return Object.values(
                TURKAI_PLANS
            ).map(
                plan => ({
                    id:
                        plan.id,

                    name:
                        plan.name,

                    price:
                        plan.price,

                    messages:
                        plan.messages,

                    research:
                        plan.research,

                    images:
                        plan.images,

                    videos:
                        plan.videos,

                    uploads:
                        plan.uploads,

                    maxUploadMB:
                        plan.maxUploadMB,

                    features:
                        clone(
                            plan.features ||
                            {}
                        )
                })
            );
        }
    } catch {
        // devam
    }

    return [];
}


// ============================================================
// PUBLIC FEATURE MAP
// ============================================================

function getPublicFeatureMap10() {
    return {
        chat:
            true,

        research:
            true,

        weather:
            true,

        currency:
            true,

        gold:
            true,

        coding:
            true,

        uploads:
            Boolean(
                serverState.uploads
            ),

        imageGeneration:
            Boolean(
                serverState.media
            ),

        videoGeneration:
            Boolean(
                serverState.media
            ),

        tasks:
            Boolean(
                serverState.tasksEngine
            ),

        realtime:
            Boolean(
                io
            ),

        plans:
            Boolean(
                serverState.plans
            ),

        security:
            true
    };
}


// ============================================================
// FRONTEND API CONTRACT
// ============================================================

const FRONTEND_API_CONTRACT_10 = {
    version:
        "1.0",

    chat: {
        endpoint:
            "/api/chat",

        method:
            "POST"
    },

    smartChat: {
        endpoint:
            "/api/chat/smart",

        method:
            "POST"
    },

    research: {
        endpoint:
            "/api/research",

        method:
            "POST"
    },

    weather: {
        endpoint:
            "/api/weather",

        method:
            "GET"
    },

    currency: {
        endpoint:
            "/api/currency",

        method:
            "GET"
    },

    gold: {
        endpoint:
            "/api/gold",

        method:
            "GET"
    },

    upload: {
        endpoint:
            "/api/upload",

        method:
            "POST",

        field:
            "files"
    },

    uploads: {
        list:
            "/api/upload/list",

        content:
            "/api/upload/:uploadId/content",

        preview:
            "/api/upload/:uploadId/preview",

        download:
            "/api/upload/:uploadId/download",

        delete:
            "/api/upload/:uploadId"
    },

    image: {
        endpoint:
            "/api/media/image",

        method:
            "POST"
    },

    video: {
        endpoint:
            "/api/media/video",

        method:
            "POST"
    },

    mediaJobs: {
        list:
            "/api/media/jobs",

        detail:
            "/api/media/jobs/:jobId",

        cancel:
            "/api/media/jobs/:jobId/cancel",

        retry:
            "/api/media/jobs/:jobId/retry",

        download:
            "/api/media/:jobId/download"
    },

    tasks: {
        create:
            "/api/tasks",

        list:
            "/api/tasks",

        detail:
            "/api/tasks/:taskId",

        cancel:
            "/api/tasks/:taskId/cancel",

        pause:
            "/api/tasks/:taskId/pause",

        resume:
            "/api/tasks/:taskId/resume"
    },

    plans: {
        list:
            "/api/plans",

        user:
            "/api/user/:userId",

        usage:
            "/api/user/:userId/usage"
    },

    system: {
        bootstrap:
            "/api/bootstrap",

        health:
            "/api/health",

        fullHealth:
            "/api/health/full",

        status:
            "/api/status"
    },

    realtime: {
        socket:
            true,

        uploadEvent:
            "turkai:upload:stats",

        mediaEvent:
            "turkai:media:job",

        taskEvent:
            "turkai:task:event",

        notification:
            "turkai:notification"
    }
};


// ============================================================
// PUBLIC BOOTSTRAP
// ============================================================

app.get(
    "/api/bootstrap",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            server: {
                name:
                    SERVER_NAME,

                version:
                    SERVER_VERSION,

                node:
                    process.version,

                environment:
                    process.env.NODE_ENV ||
                    "development",

                timezone:
                    "Europe/Istanbul",

                time:
                    nowISO()
            },

            features:
                getPublicFeatureMap10(),

            plans:
                getPublicPlanSummary10(),

            api:
                FRONTEND_API_CONTRACT_10,

            limits: {
                requestBodyMB:
                    Number(
                        MAX_BODY_SIZE
                    ) /
                    1024 /
                    1024,

                uploadAbsoluteMaxMB:
                    UPLOAD_CONFIG
                        .absoluteMaxMB,

                imageMaxWidth:
                    MEDIA_CONFIG_7
                        .maxImageWidth,

                imageMaxHeight:
                    MEDIA_CONFIG_7
                        .maxImageHeight,

                videoMaxWidth:
                    MEDIA_CONFIG_7
                        .maxVideoWidth,

                videoMaxHeight:
                    MEDIA_CONFIG_7
                        .maxVideoHeight,

                videoMaxSeconds:
                    MEDIA_CONFIG_7
                        .maxVideoSeconds
            },

            websocket:
                Boolean(
                    io
                )
        });
    }
);


// ============================================================
// FRONTEND CONFIG ALIAS
// ============================================================

app.get(
    "/api/frontend/config",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            ...FRONTEND_API_CONTRACT_10,

            server: {
                version:
                    SERVER_VERSION,

                name:
                    SERVER_NAME
            },

            features:
                getPublicFeatureMap10()
        });
    }
);


// ============================================================
// COMPLETE HEALTH BUILDER
// ============================================================

function buildFullHealth10() {
    const memory =
        process.memoryUsage();

    let ai =
        null;

    let research =
        null;

    let weather =
        null;

    let market =
        null;

    let plans =
        null;

    let uploads =
        null;

    let media =
        null;

    let tasks =
        null;

    let security =
        null;

    try {
        ai =
            serverState.ai &&
            serverState.ai.engine
                ? {
                    available:
                        true
                }
                : null;
    } catch {
        ai =
            null;
    }

    try {
        research =
            serverState.research
                ? {
                    available:
                        true
                }
                : null;
    } catch {
        research =
            null;
    }

    try {
        weather =
            serverState.market
                ? {
                    available:
                        true
                }
                : null;
    } catch {
        weather =
            null;
    }

    try {
        market =
            serverState.market &&
            serverState.market.state
                ? clone(
                    serverState
                        .market
                        .state
                )
                : null;
    } catch {
        market =
            null;
    }

    try {
        plans =
            serverState.plans
                ? {
                    available:
                        true
                }
                : null;
    } catch {
        plans =
            null;
    }

    try {
        uploads =
            serverState.uploads
                ? {
                    available:
                        true,

                    multer:
                        Boolean(
                            serverState
                                .uploads
                                .uploadMiddleware
                        )
                }
                : null;
    } catch {
        uploads =
            null;
    }

    try {
        media =
            serverState.media
                ? {
                    available:
                        true,

                    queue:
                        mediaQueue7
                            .length,

                    active:
                        mediaActive7
                            .size
                }
                : null;
    } catch {
        media =
            null;
    }

    try {
        tasks =
            serverState.tasksEngine
                ? {
                    available:
                        true,

                    queue:
                        taskQueue8
                            .length,

                    running:
                        taskRunning8
                            .size
                }
                : null;
    } catch {
        tasks =
            null;
    }

    try {
        security =
            typeof getSecurityStatus9 ===
                "function"
                ? getSecurityStatus9()
                : null;
    } catch {
        security =
            null;
    }

    const checks = {
        server:
            true,

        express:
            Boolean(
                app
            ),

        http:
            Boolean(
                httpServer
            ),

        socketio:
            Boolean(
                io
            ),

        dataDirectory:
            fs.existsSync(
                DATA_DIR
            ),

        uploadDirectory:
            fs.existsSync(
                UPLOADS_DIR
            ),

        mediaDirectory:
            fs.existsSync(
                MEDIA_DIR
            ),

        taskDirectory:
            fs.existsSync(
                TASKS_DIR
            ),

        plans:
            Boolean(
                plans
            ),

        uploads:
            Boolean(
                uploads
            ),

        media:
            Boolean(
                media
            ),

        tasks:
            Boolean(
                tasks
            ),

        security:
            Boolean(
                security
            ),

        bootstrap:
            true
    };

    const healthy =
        Object.values(
            checks
        ).every(
            Boolean
        );

    return {
        healthy,

        timestamp:
            nowISO(),

        server: {
            name:
                SERVER_NAME,

            version:
                SERVER_VERSION,

            node:
                process.version,

            pid:
                process.pid,

            platform:
                process.platform,

            architecture:
                process.arch,

            uptimeSeconds:
                Number(
                    process.uptime()
                .toFixed(
                    2
                )
            )
        },

        memory: {
            rssMB:
                bytesToMB6(
                    memory.rss
                ),

            heapUsedMB:
                bytesToMB6(
                    memory.heapUsed
                ),

            heapTotalMB:
                bytesToMB6(
                    memory.heapTotal
                ),

            externalMB:
                bytesToMB6(
                    memory.external
                ),

            arrayBuffersMB:
                bytesToMB6(
                    memory.arrayBuffers
                )
        },

        runtime:
            clone(
                runtime
            ),

        state: {
            final:
                clone(
                    FINAL_STATE_10
                ),

            security,

            media,

            tasks
        },

        engines: {
            ai,

            research,

            weather,

            market,

            plans,

            uploads,

            media,

            tasks
        },

        checks
    };
}


// ============================================================
// FULL HEALTH API
// ============================================================

app.get(
    "/api/health/full",
    (
        req,
        res
    ) => {
        FINAL_STATE_10
            .healthChecks++;

        FINAL_STATE_10
            .lastHealthCheck =
            nowISO();

        const health =
            buildFullHealth10();

        return res.status(
            health.healthy
                ? 200
                : 503
        ).json({
            success:
                health.healthy,

            ...health
        });
    }
);


// ============================================================
// MASTER SYSTEM STATUS
// ============================================================

app.get(
    "/api/master/status",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            server: {
                name:
                    SERVER_NAME,

                version:
                    SERVER_VERSION,

                ready:
                    FINAL_STATE_10
                        .ready,

                listening:
                    httpServer.listening,

                uptime:
                    process.uptime()
            },

            features:
                getPublicFeatureMap10(),

            runtime:
                clone(
                    runtime
                ),

            queue: {
                media:
                    mediaQueue7
                        .length,

                tasks:
                    taskQueue8
                        .length,

                activeMedia:
                    mediaActive7
                        .size,

                activeTasks:
                    taskRunning8
                        .size
            },

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// MASTER DIAGNOSTICS
// ============================================================

app.get(
    "/api/master/diagnostics",
    (
        req,
        res
    ) => {
        let health;

        try {
            health =
                buildFullHealth10();
        } catch (
            error
        ) {
            return res.status(
                500
            ).json({
                success:
                    false,

                error:
                    "diagnostics_failed",

                message:
                    error.message
            });
        }

        return res.json({
            success:
                true,

            health,

            bootstrap:
                {
                    features:
                        getPublicFeatureMap10(),

                    api:
                        FRONTEND_API_CONTRACT_10
                }
        });
    }
);


// ============================================================
// VERSION ENDPOINT
// ============================================================

app.get(
    "/api/version",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            name:
                SERVER_NAME,

            version:
                SERVER_VERSION,

            node:
                process.version,

            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// ROUTE MAP
// ============================================================

function collectRoutes10() {
    const router =
        app._router ||
        app.router;

    if (
        !router ||
        !Array.isArray(
            router.stack
        )
    ) {
        return [];
    }

    return router.stack
        .filter(
            layer =>
                layer &&
                layer.route
        )
        .map(
            layer => {
                const route =
                    layer.route;

                const methods =
                    Object.keys(
                        route.methods ||
                        {}
                    )
                    .filter(
                        method =>
                            route.methods[
                                method
                            ]
                    )
                    .map(
                        method =>
                            method
                                .toUpperCase()
                    );

                return {
                    path:
                        Array.isArray(
                            route.path
                        )
                            ? route.path
                            : safeString(
                                route.path
                            ),

                    methods,

                    specificity:
                        getRouteSpecificity10(
                            layer
                        )
                };
            }
        );
}


app.get(
    "/api/master/routes",
    (
        req,
        res
    ) => {
        const routes =
            collectRoutes10();

        return res.json({
            success:
                true,

            count:
                routes.length,

            routes
        });
    }
);


// ============================================================
// FINAL 404
// ============================================================
//
// Bunu özellikle en sona koyuyoruz.
// Part 1'deki erken 404 kaldırıldığı için,
// bundan sonra gerçekten bulunamayan API'ler buraya düşer.
//
// ============================================================

app.use(
    (
        req,
        res,
        next
    ) => {
        if (
            res.headersSent
        ) {
            return next();
        }

        const isAPI =
            safeString(
                req.originalUrl ||
                req.url
            ).startsWith(
                "/api/"
            );

        if (
            isAPI
        ) {
            return res.status(
                404
            ).json({
                success:
                    false,

                error:
                    "endpoint_not_found",

                path:
                    safeString(
                        req.originalUrl ||
                        req.url
                    ).split(
                        "?"
                    )[0],

                method:
                    req.method,

                requestId:
                    req.turkaiRequestId ||
                    null
            });
        }

        return res.status(
            404
        ).send(
            "TürkAI — Sayfa bulunamadı."
        );
    }
);


// ============================================================
// FINAL ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        runtime.failedRequests =
            Number(
                runtime.failedRequests ||
                0
            ) + 1;

        appendLog(
            SYSTEM_LOG_FILE,
            "final_express_error",
            {
                message:
                    error &&
                    error.message
                        ? error.message
                        : "unknown_error",

                stack:
                    error &&
                    error.stack
                        ? error.stack
                        : "",

                method:
                    req &&
                    req.method,

                path:
                    req &&
                    req.url
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
                error &&
                error.status
            ) || 500;

        return res.status(
            status
        ).json({
            success:
                false,

            error:
                "internal_server_error",

            requestId:
                req &&
                req.turkaiRequestId
                    ? req.turkaiRequestId
                    : null
        });
    }
);


// ============================================================
// FINAL SERVER STATE
// ============================================================

serverState.final =
    FINAL_STATE_10;

serverState.frontend =
    {
        contract:
            FRONTEND_API_CONTRACT_10,

        features:
            getPublicFeatureMap10()
    };


// ============================================================
// PROCESS ERROR HANDLERS
// ============================================================

let shutdownPromise10 =
    null;


async function gracefulShutdown10(
    signal =
        "manual"
) {
    if (
        shutdownPromise10
    ) {
        return shutdownPromise10;
    }

    shutdownPromise10 =
        (async () => {
            if (
                FINAL_STATE_10
                    .shuttingDown
            ) {
                return;
            }

            FINAL_STATE_10
                .shuttingDown =
                true;

            FINAL_STATE_10
                .shutdownStartedAt =
                nowISO();

            console.log(
                `\n[TürkAI] Shutdown başlatıldı: ${signal}`
            );

            try {
                clearInterval(
                    taskSchedulerTimer8
                );
            } catch {
                // devam
            }

            try {
                clearInterval(
                    taskWorkerTimer8
                );
            } catch {
                // devam
            }

            try {
                clearInterval(
                    securityCleanupTimer9
                );
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveTasksEngine8 ===
                    "function"
                ) {
                    saveTasksEngine8();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveTaskEvents8 ===
                    "function"
                ) {
                    saveTaskEvents8();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveTaskHistory8 ===
                    "function"
                ) {
                    saveTaskHistory8();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveTaskNotifications8 ===
                    "function"
                ) {
                    saveTaskNotifications8();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveUploadIndex6 ===
                    "function"
                ) {
                    saveUploadIndex6();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveUploadHistory6 ===
                    "function"
                ) {
                    saveUploadHistory6();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveMediaIndex7 ===
                    "function"
                ) {
                    saveMediaIndex7();
                }
            } catch {
                // devam
            }

            try {
                if (
                    typeof saveMediaHistory7 ===
                    "function"
                ) {
                    saveMediaHistory7();
                }
            } catch {
                // devam
            }

            try {
                writeJSON(
                    SECURITY_CONFIG_FILE_9,
                    {
                        ...SECURITY_CONFIG_9,

                        secrets: {
                            apiSecret:
                                redactSecret9(
                                    SECURITY_SECRETS_9
                                        .apiSecret
                                ),

                            adminKey:
                                redactSecret9(
                                    SECURITY_SECRETS_9
                                        .adminKey
                                ),

                            developerKey:
                                redactSecret9(
                                    SECURITY_SECRETS_9
                                        .developerKey
                                ),

                            proCode:
                                redactSecret9(
                                    SECURITY_SECRETS_9
                                        .proCode
                                )
                        }
                    }
                );
            } catch {
                // devam
            }

            try {
                if (
                    io
                ) {
                    await new Promise(
                        resolve => {
                            try {
                                io.close(
                                    () =>
                                        resolve()
                                );
                            } catch {
                                resolve();
                            }
                        }
                    );
                }
            } catch {
                // devam
            }

            try {
                if (
                    httpServer &&
                    httpServer.listening
                ) {
                    await new Promise(
                        resolve => {
                            httpServer.close(
                                () =>
                                    resolve()
                            );
                        }
                    );
                }
            } catch {
                // devam
            }

            FINAL_STATE_10
                .serverListening =
                false;

            FINAL_STATE_10
                .ready =
                false;

            FINAL_STATE_10
                .shutdownFinishedAt =
                nowISO();

            console.log(
                "[TürkAI] Shutdown tamamlandı."
            );
        })();

    return shutdownPromise10;
}


process.on(
    "SIGINT",
    () => {
        gracefulShutdown10(
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
        gracefulShutdown10(
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


process.on(
    "uncaughtException",
    error => {
        appendLog(
            SYSTEM_LOG_FILE,
            "uncaught_exception",
            {
                message:
                    error &&
                    error.message
                        ? error.message
                        : "unknown",

                stack:
                    error &&
                    error.stack
                        ? error.stack
                        : ""
            }
        );

        console.error(
            "[TürkAI] uncaughtException:",
            error
        );

        gracefulShutdown10(
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


process.on(
    "unhandledRejection",
    reason => {
        appendLog(
            SYSTEM_LOG_FILE,
            "unhandled_rejection",
            {
                reason:
                    safeString(
                        reason &&
                        reason.message
                            ? reason.message
                            : reason
                    )
            }
        );

        console.error(
            "[TürkAI] unhandledRejection:",
            reason
        );
    }
);


// ============================================================
// STARTUP CHECKS
// ============================================================

function runStartupChecks10() {
    const checks =
        [];

    const check =
        (
            name,
            success,
            details = null
        ) => {
            const item = {
                name,

                success:
                    Boolean(
                        success
                    ),

                details
            };

            checks.push(
                item
            );

            if (
                !item.success
            ) {
                FINAL_STATE_10
                    .startupWarnings
                    .push(
                        name
                    );
            }

            return item;
        };

    check(
        "node",
        Boolean(
            process.version
        ),
        {
            version:
                process.version
        }
    );

    check(
        "express",
        Boolean(
            app
        )
    );

    check(
        "http-server",
        Boolean(
            httpServer
        )
    );

    check(
        "socketio",
        Boolean(
            io
        )
    );

    check(
        "data-directory",
        fs.existsSync(
            DATA_DIR
        )
    );

    check(
        "uploads-directory",
        fs.existsSync(
            UPLOADS_DIR
        )
    );

    check(
        "media-directory",
        fs.existsSync(
            MEDIA_DIR
        )
    );

    check(
        "tasks-directory",
        fs.existsSync(
            TASKS_DIR
        )
    );

    check(
        "chat-engine",
        Boolean(
            serverState.ai
        )
    );

    check(
        "research-engine",
        Boolean(
            serverState.research
        )
    );

    check(
        "market-engine",
        Boolean(
            serverState.market
        )
    );

    check(
        "plans-engine",
        Boolean(
            serverState.plans
        )
    );

    check(
        "upload-engine",
        Boolean(
            serverState.uploads
        )
    );

    check(
        "media-engine",
        Boolean(
            serverState.media
        )
    );

    check(
        "task-engine",
        Boolean(
            serverState.tasksEngine
        )
    );

    check(
        "security-engine",
        Boolean(
            serverState.security
        )
    );

    try {
        const securityTest =
            typeof runSecuritySelfTest9 ===
                "function"
                ? runSecuritySelfTest9()
                : null;

        check(
            "security-self-test",
            securityTest
                ? securityTest.success
                : false,
            securityTest
        );
    } catch (
        error
    ) {
        check(
            "security-self-test",
            false,
            {
                error:
                    error.message
            }
        );
    }

    try {
        check(
            "frontend-contract",
            Boolean(
                FRONTEND_API_CONTRACT_10 &&
                FRONTEND_API_CONTRACT_10
                    .chat
            )
        );
    } catch {
        check(
            "frontend-contract",
            false
        );
    }

    FINAL_STATE_10
        .startupChecks =
        checks;

    return {
        success:
            checks.every(
                item =>
                    item.success
            ),

        checks
    };
}


// ============================================================
// SERVER LISTEN
// ============================================================

const STARTUP_RESULT_10 =
    runStartupChecks10();


if (
    !STARTUP_RESULT_10.success
) {
    console.warn(
        "[TürkAI] Bazı startup kontrolleri başarısız oldu."
    );

    console.warn(
        STARTUP_RESULT_10.checks
            .filter(
                item =>
                    !item.success
            )
            .map(
                item =>
                    item.name
            )
            .join(
                ", "
            )
    );
}


serverState.final =
    FINAL_STATE_10;


function startMasterServer10() {
    if (
        httpServer.listening
    ) {
        FINAL_STATE_10
            .started =
            true;

        FINAL_STATE_10
            .ready =
            true;

        FINAL_STATE_10
            .serverListening =
            true;

        return;
    }

    httpServer.listen(
        PORT,
        HOST,
        () => {
            FINAL_STATE_10
                .started =
                true;

            FINAL_STATE_10
                .ready =
                true;

            FINAL_STATE_10
                .serverListening =
                true;

            runtime.startedAt =
                nowISO();

            serverState.final =
                FINAL_STATE_10;

            console.log("");
            console.log(
                "===================================================="
            );
            console.log(
                " TürkAI Master Server"
            );
            console.log(
                "===================================================="
            );
            console.log(
                " Sürüm      :",
                SERVER_VERSION
            );
            console.log(
                " Port       :",
                PORT
            );
            console.log(
                " Host       :",
                HOST
            );
            console.log(
                " Node       :",
                process.version
            );
            console.log(
                " Ortam      :",
                process.env.NODE_ENV ||
                "development"
            );
            console.log(
                " Socket.IO  :",
                io
                    ? "AKTİF"
                    : "YOK"
            );
            console.log(
                " Upload     :",
                serverState.uploads
                    ? "AKTİF"
                    : "YOK"
            );
            console.log(
                " Media      :",
                serverState.media
                    ? "AKTİF"
                    : "YOK"
            );
            console.log(
                " Tasks      :",
                serverState.tasksEngine
                    ? "AKTİF"
                    : "YOK"
            );
            console.log(
                " Security   :",
                serverState.security
                    ? "AKTİF"
                    : "YOK"
            );
            console.log(
                " Frontend   :",
                "/api/bootstrap"
            );
            console.log(
                " Health     :",
                "/api/health/full"
            );
            console.log(
                " Status     :",
                "/api/master/status"
            );
            console.log(
                " URL        :",
                `http://localhost:${PORT}`
            );
            console.log(
                "===================================================="
            );
            console.log(
                " TürkAI hazır."
            );
            console.log(
                "===================================================="
            );
            console.log("");
        }
    );
}


// ============================================================
// START
// ============================================================

startMasterServer10();


// ============================================================
// PERIODIC MASTER HEALTH SNAPSHOT
// ============================================================

const masterHealthTimer10 =
    setInterval(
        () => {
            try {
                const health =
                    buildFullHealth10();

                FINAL_STATE_10
                    .lastHealthCheck =
                    health.timestamp;

                if (
                    !health.healthy
                ) {
                    appendLog(
                        SYSTEM_LOG_FILE,
                        "master_health_warning",
                        {
                            checks:
                                health.checks
                        }
                    );
                }
            } catch (
                error
            ) {
                appendLog(
                    SYSTEM_LOG_FILE,
                    "master_health_error",
                    {
                        message:
                            error.message
                    }
                );
            }
        },
        5 *
        60 *
        1000
    );


// ============================================================
// MASTER CLEANUP ON SHUTDOWN EXTENSION
// ============================================================

const originalGracefulShutdown10 =
    gracefulShutdown10;

gracefulShutdown10 = async function(
    signal =
        "manual"
) {
    try {
        clearInterval(
            masterHealthTimer10
        );
    } catch {
        // devam
    }

    return originalGracefulShutdown10(
        signal
    );
};


// ============================================================
// FINAL SERVER EXPORT
// ============================================================

serverState.master = {
    version:
        SERVER_VERSION,

    name:
        SERVER_NAME,

    final:
        FINAL_STATE_10,

    frontend:
        FRONTEND_API_CONTRACT_10,

    features:
        getPublicFeatureMap10(),

    bootstrap:
        "/api/bootstrap",

    health:
        "/api/health/full",

    status:
        "/api/master/status",

    diagnostics:
        "/api/master/diagnostics",

    routes:
        "/api/master/routes",

    shutdown:
        gracefulShutdown10
};


// ============================================================
// FINAL READY LOG
// ============================================================

console.log(
    "[TürkAI] Part 10/10 final integration yüklendi."
);

console.log(
    "[TürkAI] Route resolver:",
    FINAL_STATE_10.routeReordered
        ? "OK"
        : "PASİF"
);

console.log(
    "[TürkAI] Startup checks:",
    STARTUP_RESULT_10.success
        ? "OK"
        : "WARNING"
);

console.log(
    "[TürkAI] Bootstrap:",
    "/api/bootstrap"
);

console.log(
    "[TürkAI] Full health:",
    "/api/health/full"
);

console.log(
    "[TürkAI] Master status:",
    "/api/master/status"
);

console.log(
    "[TürkAI] Final integration tamamlandı."
);

console.log(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
);


// ============================================================
// TÜRKAI MASTER SERVER — 10/10 END
// ============================================================
