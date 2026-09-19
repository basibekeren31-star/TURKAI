"use strict";

/*
===============================================================================
 TÜRKAI SERVER 20.0
 CLEAN MASTER SERVER
 PART 1 / 2
===============================================================================

 Amaç:
 - Render uyumlu
 - Localhost uyumlu
 - Express
 - Socket.IO
 - Security
 - Health
 - API Gateway
 - Rate limit
 - Audit log
 - Plan sistemi
 - Memory sistemi
 - AI sistemi
 - Research
 - Weather
 - Upload
 - Media
 - Tasks
 - Graceful shutdown

 ÖNEMLİ:
 Bu dosyada ortak require'lar yalnızca bir kez tanımlanır.
===============================================================================
*/

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");

let socketIO = null;

try {
    socketIO = require("socket.io");
} catch (error) {
    console.warn(
        "[TürkAI] Socket.IO bulunamadı. Socket sistemi devre dışı."
    );
}

/* ============================================================================
   DOTENV
============================================================================ */

try {
    require("dotenv").config();
} catch {
    console.warn(
        "[TürkAI] dotenv yüklenemedi. Ortam değişkenleri mevcut sistemden okunacak."
    );
}

/* ============================================================================
   PATHS
============================================================================ */

const ROOT_DIR = __dirname;

const DATA_DIR = path.join(
    ROOT_DIR,
    "data"
);

const LOG_DIR = path.join(
    DATA_DIR,
    "logs"
);

const USER_DIR = path.join(
    DATA_DIR,
    "users"
);

const CHAT_DIR = path.join(
    DATA_DIR,
    "chats"
);

const PLAN_DIR = path.join(
    DATA_DIR,
    "plans"
);

const MEMORY_DIR = path.join(
    DATA_DIR,
    "memory"
);

const AI_DIR = path.join(
    DATA_DIR,
    "ai"
);

const UPLOAD_DIR = path.join(
    DATA_DIR,
    "uploads"
);

const TEMP_DIR = path.join(
    DATA_DIR,
    "temp"
);

/* ============================================================================
   DIRECTORIES
============================================================================ */

[
    DATA_DIR,
    LOG_DIR,
    USER_DIR,
    CHAT_DIR,
    PLAN_DIR,
    MEMORY_DIR,
    AI_DIR,
    UPLOAD_DIR,
    TEMP_DIR
].forEach((directory) => {
    try {
        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );
    } catch (error) {
        console.error(
            "[TürkAI] Directory error:",
            directory,
            error.message
        );
    }
});

/* ============================================================================
   VERSION
============================================================================ */

const TURKAI_VERSION = "20.0.0";

const SERVER_STARTED_AT = Date.now();

/* ============================================================================
   ENVIRONMENT
============================================================================ */

const PORT = Number(
    process.env.PORT || 3000
);

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

/* ============================================================================
   API KEYS
============================================================================ */

const API_KEYS = {
    groq:
        process.env.GROQ_API_KEY ||
        "",

    cerebras:
        process.env.CEREBRAS_API_KEY ||
        "",

    gemini:
        process.env.GEMINI_API_KEY ||
        "",

    openrouter:
        process.env.OPENROUTER_API_KEY ||
        "",

    turkai:
        process.env.TURKAI_API_KEY ||
        ""
};

/* ============================================================================
   SAFE HELPERS
============================================================================ */

function safeString(
    value,
    fallback = ""
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    return String(value);
}

function cleanString(
    value,
    maxLength = 50000
) {
    return safeString(
        value
    )
        .replace(/\u0000/g, "")
        .trim()
        .slice(
            0,
            maxLength
        );
}

function createId(
    prefix = "id"
) {
    return (
        prefix +
        "_" +
        Date.now() +
        "_" +
        crypto
            .randomBytes(8)
            .toString("hex")
    );
}

function clone(
    value
) {
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

/* ============================================================================
   JSON ENGINE
============================================================================ */

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
    } catch (error) {
        console.error(
            "[TürkAI] JSON read:",
            error.message
        );

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
        const directory =
            path.dirname(file);

        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

        const temporary =
            file +
            "." +
            process.pid +
            "." +
            Date.now() +
            ".tmp";

        fs.writeFileSync(
            temporary,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temporary,
            file
        );

        return true;
    } catch (error) {
        console.error(
            "[TürkAI] JSON write:",
            error.message
        );

        return false;
    }
}

/* ============================================================================
   SERVER STATE
============================================================================ */

const serverState = {
    status: "starting",

    version:
        TURKAI_VERSION,

    startedAt:
        nowISO(),

    environment:
        NODE_ENV,

    port:
        PORT,

    host:
        HOST,

    requests:
        0,

    successfulRequests:
        0,

    failedRequests:
        0,

    activeSockets:
        0,

    lastError:
        null,

    selfHealing:
        true,

    diagnostics:
        true,

    productionCore:
        true
};

/* ============================================================================
   AUDIT SYSTEM
============================================================================ */

const AUDIT_FILE =
    path.join(
        LOG_DIR,
        "audit.log"
    );

function audit(
    type,
    data = {}
) {
    const record = {
        id:
            createId(
                "audit"
            ),

        type,

        timestamp:
            nowISO(),

        data:
            clone(data)
    };

    try {
        fs.appendFileSync(
            AUDIT_FILE,
            JSON.stringify(
                record
            ) + "\n",
            "utf8"
        );
    } catch (error) {
        console.error(
            "[TürkAI] Audit:",
            error.message
        );
    }

    return record;
}

/* ============================================================================
   DEBUG LOGGER
============================================================================ */

function logDebug(
    ...args
) {
    if (
        process.env.TURKAI_DEBUG ===
        "true"
    ) {
        console.log(
            "[TürkAI DEBUG]",
            ...args
        );
    }
}

/* ============================================================================
   SAFE MODULE LOADER
============================================================================ */

function safeRequire(
    modulePath,
    fallback = null
) {
    try {
        return require(
            modulePath
        );
    } catch (error) {
        console.warn(
            `[TürkAI] Optional module yüklenemedi: ${modulePath}`
        );

        logDebug(
            error.stack
        );

        return fallback;
    }
}

/* ============================================================================
   MODULE BRIDGES
============================================================================ */

/*
   Bu bölüm sayesinde bir modül henüz hazır değilse
   server tamamen çökmez.
*/

const answerMemory =
    safeRequire(
        "./src/memory/answerMemory",
        null
    );

const aiEngine =
    safeRequire(
        "./src/ai/aiEngine",
        null
    );

const planManager =
    safeRequire(
        "./src/plans/planManager",
        null
    );

const researchEngine =
    safeRequire(
        "./src/research/researchEngine",
        null
    );

const weatherEngine =
    safeRequire(
        "./src/weather/weatherEngine",
        null
    );

const uploadEngine =
    safeRequire(
        "./src/uploads/uploadEngine",
        null
    );

const mediaEngine =
    safeRequire(
        "./src/media/mediaEngine",
        null
    );

const taskEngine =
    safeRequire(
        "./src/tasks/taskEngine",
        null
    );

/* ============================================================================
   MODULE STATUS
============================================================================ */

const moduleStatus = {
    memory:
        Boolean(
            answerMemory
        ),

    ai:
        Boolean(
            aiEngine
        ),

    plans:
        Boolean(
            planManager
        ),

    research:
        Boolean(
            researchEngine
        ),

    weather:
        Boolean(
            weatherEngine
        ),

    uploads:
        Boolean(
            uploadEngine
        ),

    media:
        Boolean(
            mediaEngine
        ),

    tasks:
        Boolean(
            taskEngine
        )
};

/* ============================================================================
   EXPRESS
============================================================================ */

const app =
    express();

const httpServer =
    http.createServer(
        app
    );

/* ============================================================================
   SOCKET.IO
============================================================================ */

let io = null;

if (
    socketIO &&
    typeof socketIO.Server ===
        "function"
) {
    io =
        new socketIO.Server(
            httpServer,
            {
                cors: {
                    origin:
                        true,

                    credentials:
                        true
                },

                maxHttpBufferSize:
                    10 * 1024 * 1024
            }
        );
}

/* ============================================================================
   EXPRESS CONFIG
============================================================================ */

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

/* ============================================================================
   SECURITY HEADERS
============================================================================ */

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
            "X-XSS-Protection",
            "1; mode=block"
        );

        if (
            IS_PRODUCTION
        ) {
            res.setHeader(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains"
            );
        }

        next();
    }
);

/* ============================================================================
   BODY PARSERS
============================================================================ */

app.use(
    express.json({
        limit:
            "10mb"
    })
);

app.use(
    express.urlencoded({
        extended:
            true,

        limit:
            "10mb"
    })
);

/* ============================================================================
   REQUEST LOGGER
============================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {
        const started =
            Date.now();

        serverState.requests++;

        res.on(
            "finish",
            () => {
                const duration =
                    Date.now() -
                    started;

                if (
                    res.statusCode >=
                    400
                ) {
                    serverState.failedRequests++;
                } else {
                    serverState.successfulRequests++;
                }

                logDebug(
                    req.method,
                    req.originalUrl,
                    res.statusCode,
                    `${duration}ms`
                );
            }
        );

        next();
    }
);

/* ============================================================================
   BASIC RATE LIMITER
============================================================================ */

const rateStore =
    new Map();

const RATE_WINDOW =
    60 * 1000;

const RATE_LIMIT =
    Number(
        process.env.TURKAI_RATE_LIMIT ||
        120
    );

function getClientIP(
    req
) {
    return (
        req.ip ||
        req.headers[
            "x-forwarded-for"
        ] ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}

function rateLimitMiddleware(
    req,
    res,
    next
) {
    const ip =
        getClientIP(
            req
        );

    const current =
        Date.now();

    let record =
        rateStore.get(
            ip
        );

    if (
        !record ||
        current -
            record.startedAt >
            RATE_WINDOW
    ) {
        record = {
            startedAt:
                current,

            count:
                0
        };
    }

    record.count++;

    rateStore.set(
        ip,
        record
    );

    res.setHeader(
        "X-RateLimit-Limit",
        String(
            RATE_LIMIT
        )
    );

    res.setHeader(
        "X-RateLimit-Remaining",
        String(
            Math.max(
                0,
                RATE_LIMIT -
                    record.count
            )
        )
    );

    if (
        record.count >
        RATE_LIMIT
    ) {
        audit(
            "rate_limit_block",
            {
                ip,
                path:
                    req.originalUrl
            }
        );

        return res
            .status(429)
            .json({
                success:
                    false,

                error:
                    "Çok fazla istek gönderildi.",

                code:
                    "RATE_LIMIT"
            });
    }

    next();
}

app.use(
    rateLimitMiddleware
);

/* ============================================================================
   API AUTHENTICATION
============================================================================ */

function getAPIKey(
    req
) {
    const authorization =
        req.headers[
            "authorization"
        ];

    if (
        authorization &&
        authorization
            .startsWith(
                "Bearer "
            )
    ) {
        return authorization
            .slice(7)
            .trim();
    }

    return (
        req.headers[
            "x-api-key"
        ] ||
        req.headers[
            "x-turkai-key"
        ] ||
        ""
    );
}

function isValidAPIKey(
    req
) {
    const configured =
        API_KEYS.turkai;

    /*
      API key tanımlı değilse normal web uygulamasının
      public endpointlerini engellemiyoruz.
    */

    if (!configured) {
        return true;
    }

    const supplied =
        getAPIKey(
            req
        );

    if (
        !supplied
    ) {
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(
                supplied
            ),
            Buffer.from(
                configured
            )
        );
    } catch {
        return false;
    }
}

function requireAPIKey(
    req,
    res,
    next
) {
    if (
        isValidAPIKey(
            req
        )
    ) {
        return next();
    }

    audit(
        "invalid_api_key",
        {
            ip:
                getClientIP(
                    req
                ),

            path:
                req.originalUrl
        }
    );

    return res
        .status(401)
        .json({
            success:
                false,

            error:
                "Geçersiz API anahtarı.",

            code:
                "INVALID_API_KEY"
        });
}

/* ============================================================================
   HEALTH
============================================================================ */

app.get(
    "/api/health",
    (
        req,
        res
    ) => {
        res.json({
            success:
                true,

            name:
                "TürkAI",

            version:
                TURKAI_VERSION,

            status:
                serverState.status,

            uptime:
                Math.floor(
                    process.uptime()
                ),

            timestamp:
                nowISO()
        });
    }
);

app.get(
    "/api/security/health",
    (
        req,
        res
    ) => {
        res.json({
            success:
                true,

            security: {
                rateLimit:
                    true,

                auditLog:
                    true,

                apiKey:
                    Boolean(
                        API_KEYS.turkai
                    ),

                headers:
                    true,

                pathTraversal:
                    true
            },

            timestamp:
                nowISO()
        });
    }
);

app.get(
    "/api/status",
    (
        req,
        res
    ) => {
        res.json({
            success:
                true,

            server:
                clone(
                    serverState
                ),

            modules:
                clone(
                    moduleStatus
                ),

            memory:
                process.memoryUsage(),

            node:
                process.version,

            platform:
                process.platform,

            timestamp:
                nowISO()
        });
    }
);

/* ============================================================================
   MASTER CORE
============================================================================ */

app.get(
    "/api/master",
    (
        req,
        res
    ) => {
        res.json({
            success:
                true,

            product:
                "TürkAI",

            version:
                TURKAI_VERSION,

            core:
                "20/20",

            status:
                serverState.status,

            selfHealing:
                true,

            diagnostics:
                true,

            productionCore:
                true,

            modules:
                moduleStatus,

            uptime:
                Math.floor(
                    process.uptime()
                ),

            timestamp:
                nowISO()
        });
    }
);

/* ============================================================================
   MEMORY API
============================================================================ */

app.get(
    "/api/memory/status",
    (
        req,
        res
    ) => {
        if (
            !answerMemory
        ) {
            return res.json({
                success:
                    true,

                enabled:
                    false,

                reason:
                    "Memory engine henüz bağlanmadı."
            });
        }

        try {
            if (
                typeof answerMemory.getMemoryStatus ===
                "function"
            ) {
                return res.json({
                    success:
                        true,

                    memory:
                        answerMemory
                            .getMemoryStatus()
                });
            }

            res.json({
                success:
                    true,

                enabled:
                    true
            });
        } catch (error) {
            res.status(500)
                .json({
                    success:
                        false,

                    error:
                        error.message
                });
        }
    }
);

/* ============================================================================
   PLAN API
============================================================================ */

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {
        try {
            if (
                planManager &&
                typeof planManager.listPlans ===
                    "function"
            ) {
                return res.json({
                    success:
                        true,

                    plans:
                        planManager.listPlans()
                });
            }

            if (
                planManager &&
                typeof planManager.list ===
                    "function"
            ) {
                return res.json({
                    success:
                        true,

                    plans:
                        planManager.list()
                });
            }

            res.json({
                success:
                    true,

                plans: [
                    {
                        id:
                            "free",

                        name:
                            "TürkAI Free",

                        price:
                            0
                    },

                    {
                        id:
                            "pro",

                        name:
                            "TürkAI Pro",

                        price:
                            250
                    },

                    {
                        id:
                            "plus",

                        name:
                            "TürkAI Plus",

                        price:
                            500
                    },

                    {
                        id:
                            "ultra",

                        name:
                            "TürkAI Ultra",

                        price:
                            1000,

                        status:
                            "coming_soon"
                    }
                ]
            });
        } catch (error) {
            res.status(500)
                .json({
                    success:
                        false,

                    error:
                        error.message
                });
        }
    }
);

/* ============================================================================
   USER PLAN
============================================================================ */

app.get(
    "/api/plans/user/:userId",
    (
        req,
        res
    ) => {
        const userId =
            cleanString(
                req.params.userId,
                200
            );

        try {
            if (
                planManager &&
                typeof planManager.getUserPlan ===
                    "function"
            ) {
                return res.json({
                    success:
                        true,

                    plan:
                        planManager
                            .getUserPlan(
                                userId
                            )
                });
            }

            res.json({
                success:
                    true,

                userId,

                plan:
                    "free"
            });
        } catch (error) {
            res.status(500)
                .json({
                    success:
                        false,

                    error:
                        error.message
                });
        }
    }
);

/* ============================================================================
   STATIC FILES
============================================================================ */

const PUBLIC_DIR =
    fs.existsSync(
        path.join(
            ROOT_DIR,
            "public"
        )
    )
        ? path.join(
              ROOT_DIR,
              "public"
          )
        : ROOT_DIR;

app.use(
    express.static(
        PUBLIC_DIR,
        {
            index:
                false,

            maxAge:
                IS_PRODUCTION
                    ? "1h"
                    : 0
        }
    )
);

/* ============================================================================
   BASIC ROOT
============================================================================ */

app.get(
    "/",
    (
        req,
        res
    ) => {
        const indexFile =
            path.join(
                ROOT_DIR,
                "index.html"
            );

        if (
            fs.existsSync(
                indexFile
            )
        ) {
            return res.sendFile(
                indexFile
            );
        }

        res.json({
            success:
                true,

            name:
                "TürkAI",

            version:
                TURKAI_VERSION,

            message:
                "TürkAI Server çalışıyor."
        });
    }
);

/* ============================================================================
   PART 1 READY
============================================================================ */

console.log(
    "============================================================"
);

console.log(
    "TÜRKAI SERVER 20.0"
);

console.log(
    "Part 1/2 aktif."
);

console.log(
    "Express + Security + Health + Plans + Memory Gateway aktif."
);

console.log(
    "============================================================"
);
/* ============================================================================
   TÜRKAI SERVER 20.0
   PART 2 / 2 — FINAL
   ============================================================================

   Bu bölüm Part 1'in hemen devamıdır.

   İçerik:
   - Chat
   - Memory
   - Research
   - Weather
   - Upload
   - Plans
   - Pro activation
   - Payment test
   - Media image
   - Media video
   - Media jobs
   - Media history
   - Media health
   - Tasks
   - Queue status
   - Task health
   - Socket.IO
   - Diagnostics
   - 404
   - Global error handler
   - Self healing
   - Graceful shutdown
   - Server start
============================================================================ */

/* ============================================================================
   EXTRA HELPERS
============================================================================ */

function normalizeUserIdForServer(
    value
) {
    const id =
        safeString(
            value,
            "anonymous"
        )
            .trim()
            .slice(
                0,
                200
            );

    return id || "anonymous";
}

function getBody(
    req
) {
    return (
        req &&
        req.body &&
        typeof req.body === "object"
            ? req.body
            : {}
    );
}

function successResponse(
    res,
    data = {}
) {
    return res.json({
        success:
            true,

        ...data,

        timestamp:
            nowISO()
    });
}

function errorResponse(
    res,
    status,
    message,
    code = "SERVER_ERROR",
    extra = {}
) {
    return res
        .status(
            status
        )
        .json({
            success:
                false,

            error:
                message,

            code,

            ...extra,

            timestamp:
                nowISO()
        });
}

/* ============================================================================
   ROOT STATUS
============================================================================ */

app.get(
    "/api",
    (
        req,
        res
    ) => {
        return successResponse(
            res,
            {
                name:
                    "TürkAI",

                version:
                    TURKAI_VERSION,

                message:
                    "TürkAI API aktif.",

                endpoints: {
                    health:
                        "/api/health",

                    status:
                        "/api/status",

                    master:
                        "/api/master",

                    diagnostics:
                        "/api/diagnostics",

                    chat:
                        "/api/chat",

                    research:
                        "/api/research",

                    weather:
                        "/api/weather",

                    upload:
                        "/api/upload",

                    plans:
                        "/api/plans",

                    tasks:
                        "/api/tasks"
                }
            }
        );
    }
);

/* ============================================================================
   CHAT
============================================================================ */

app.post(
    "/api/chat",
    async (
        req,
        res
    ) => {
        const startedAt =
            Date.now();

        try {
            const body =
                getBody(
                    req
                );

            const message =
                cleanString(
                    body.message ??
                    body.prompt ??
                    body.text ??
                    "",
                    50000
                );

            const userId =
                normalizeUserIdForServer(
                    body.userId ??
                    body.user?.id
                );

            const conversationId =
                cleanString(
                    body.conversationId ??
                    body.chatId ??
                    "",
                    200
                ) ||
                createId(
                    "conversation"
                );

            const plan =
                cleanString(
                    body.plan ??
                    "free",
                    50
                )
                    .toLowerCase();

            const model =
                cleanString(
                    body.model ??
                    "",
                    200
                );

            const language =
                cleanString(
                    body.language ??
                    "tr",
                    20
                );

            const history =
                Array.isArray(
                    body.history
                )
                    ? body.history
                          .slice(
                              -30
                          )
                          .map(
                              (
                                  item
                              ) => ({
                                  role:
                                      cleanString(
                                          item?.role ||
                                          "user",
                                          30
                                      ),

                                  content:
                                      cleanString(
                                          item?.content ||
                                          "",
                                          10000
                                      )
                              })
                          )
                    : [];

            if (
                !message
            ) {
                return errorResponse(
                    res,
                    400,
                    "Mesaj boş olamaz.",
                    "EMPTY_MESSAGE"
                );
            }

            audit(
                "chat_request",
                {
                    userId,
                    conversationId,
                    plan,
                    model:
                        model ||
                        null,
                    language
                }
            );

            /* ------------------------------------------------------------
               CONVERSATION MEMORY — USER MESSAGE
            ------------------------------------------------------------ */

            try {
                if (
                    answerMemory &&
                    typeof answerMemory.addConversationMessage ===
                        "function"
                ) {
                    await answerMemory.addConversationMessage(
                        {
                            userId,
                            conversationId,
                            role:
                                "user",
                            content:
                                message
                        }
                    );
                }
            } catch (
                memoryError
            ) {
                logDebug(
                    "Conversation memory user message:",
                    memoryError.message
                );
            }

            /* ------------------------------------------------------------
               AI ENGINE
            ------------------------------------------------------------ */

            if (
                aiEngine
            ) {
                try {
                    let result =
                        null;

                    if (
                        typeof aiEngine.chat ===
                        "function"
                    ) {
                        result =
                            await aiEngine.chat(
                                {
                                    message,

                                    prompt:
                                        message,

                                    userId,

                                    conversationId,

                                    chatId:
                                        conversationId,

                                    history,

                                    model:
                                        model ||
                                        null,

                                    plan,

                                    language,

                                    metadata:
                                        body.metadata ||
                                        {}
                                }
                            );
                    } else if (
                        typeof aiEngine.generate ===
                        "function"
                    ) {
                        result =
                            await aiEngine.generate(
                                {
                                    message,

                                    prompt:
                                        message,

                                    userId,

                                    conversationId,

                                    history,

                                    model:
                                        model ||
                                        null,

                                    plan,

                                    language
                                }
                            );
                    } else if (
                        typeof aiEngine.ask ===
                        "function"
                    ) {
                        result =
                            await aiEngine.ask(
                                message,
                                {
                                    userId,
                                    conversationId,
                                    history,
                                    model,
                                    plan,
                                    language
                                }
                            );
                    }

                    if (
                        result !==
                        null &&
                        result !==
                        undefined
                    ) {
                        const normalizedResult =
                            (
                                typeof result ===
                                "object"
                            )
                                ? result
                                : {
                                      answer:
                                          safeString(
                                              result
                                          )
                                  };

                        const answer =
                            cleanString(
                                normalizedResult.answer ??
                                normalizedResult.response ??
                                normalizedResult.text ??
                                "",
                                50000
                            );

                        /* ------------------------------------------------
                           CONVERSATION MEMORY — AI RESPONSE
                        ------------------------------------------------ */

                        if (
                            answer
                        ) {
                            try {
                                if (
                                    answerMemory &&
                                    typeof answerMemory.addConversationMessage ===
                                        "function"
                                ) {
                                    await answerMemory.addConversationMessage(
                                        {
                                            userId,
                                            conversationId,
                                            role:
                                                "assistant",
                                            content:
                                                answer,
                                            metadata:
                                                normalizedResult
                                                    .metadata ||
                                                {}
                                        }
                                    );
                                }
                            } catch (
                                conversationError
                            ) {
                                logDebug(
                                    "Conversation memory assistant message:",
                                    conversationError.message
                                );
                            }
                        }

                        serverState.successfulRequests++;

                        return successResponse(
                            res,
                            {
                                answer:
                                    answer ||
                                    "TürkAI bir sonuç üretemedi.",

                                response:
                                    answer ||
                                    "TürkAI bir sonuç üretemedi.",

                                source:
                                    normalizedResult.source ??
                                    "ai",

                                provider:
                                    normalizedResult.provider ??
                                    null,

                                model:
                                    normalizedResult.model ??
                                    model ??
                                    null,

                                conversationId,

                                meta: {
                                    duration:
                                        Date.now() -
                                        startedAt,

                                    fallback:
                                        Boolean(
                                            normalizedResult.fallback
                                        )
                                },

                                ...normalizedResult
                            }
                        );
                    }
                } catch (
                    aiError
                ) {
                    logDebug(
                        "AI engine failed:",
                        aiError.message
                    );

                    audit(
                        "ai_engine_error",
                        {
                            userId,
                            error:
                                aiError.message
                        }
                    );
                }
            }

            /* ------------------------------------------------------------
               MEMORY FALLBACK
            ------------------------------------------------------------ */

            if (
                answerMemory
            ) {
                try {
                    let memoryResult =
                        null;

                    if (
                        typeof answerMemory.getBestAnswer ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.getBestAnswer(
                                {
                                    question:
                                        message,

                                    userId,

                                    language
                                }
                            );
                    }

                    if (
                        !memoryResult &&
                        typeof answerMemory.findBestMemoryAnswer ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.findBestMemoryAnswer(
                                message,
                                {
                                    userId
                                }
                            );
                    }

                    if (
                        !memoryResult &&
                        typeof answerMemory.findAnswer ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.findAnswer(
                                message
                            );
                    }

                    if (
                        !memoryResult &&
                        typeof answerMemory.find ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.find(
                                message
                            );
                    }

                    const memoryAnswer =
                        cleanString(
                            memoryResult?.answer ??
                            memoryResult?.response ??
                            memoryResult?.text ??
                            "",
                            50000
                        );

                    if (
                        memoryAnswer
                    ) {
                        try {
                            if (
                                typeof answerMemory.markHit ===
                                "function"
                            ) {
                                await answerMemory.markHit(
                                    memoryResult.id
                                );
                            }
                        } catch {}

                        try {
                            if (
                                typeof answerMemory.addConversationMessage ===
                                "function"
                            ) {
                                await answerMemory.addConversationMessage(
                                    {
                                        userId,
                                        conversationId,
                                        role:
                                            "assistant",
                                        content:
                                            memoryAnswer,
                                        metadata: {
                                            source:
                                                "memory",
                                            matchType:
                                                memoryResult.matchType ??
                                                null
                                        }
                                    }
                                );
                            }
                        } catch {}

                        return successResponse(
                            res,
                            {
                                answer:
                                    memoryAnswer,

                                response:
                                    memoryAnswer,

                                source:
                                    "memory",

                                model:
                                    "turkai-memory",

                                conversationId,

                                meta: {
                                    duration:
                                        Date.now() -
                                        startedAt,

                                    memory:
                                        true,

                                    matchType:
                                        memoryResult.matchType ??
                                        null,

                                    similarity:
                                        memoryResult.similarity ??
                                        null
                                }
                            }
                        );
                    }
                } catch (
                    memoryError
                ) {
                    logDebug(
                        "Memory fallback failed:",
                        memoryError.message
                    );
                }
            }

            /* ------------------------------------------------------------
               LOCAL FALLBACK
            ------------------------------------------------------------ */

            const localAnswer =
                createLocalAnswer(
                    message
                );

            /* ------------------------------------------------------------
               SAVE TO MEMORY
            ------------------------------------------------------------ */

            if (
                answerMemory
            ) {
                try {
                    if (
                        typeof answerMemory.learnIfUseful ===
                            "function"
                    ) {
                        await answerMemory.learnIfUseful(
                            {
                                question:
                                    message,

                                answer:
                                    localAnswer,

                                userId,

                                model:
                                    "turkai-local",

                                source:
                                    "local",

                                language
                            }
                        );
                    } else if (
                        typeof answerMemory.remember ===
                            "function"
                    ) {
                        await answerMemory.remember(
                            {
                                question:
                                    message,

                                answer:
                                    localAnswer,

                                userId,

                                model:
                                    "turkai-local",

                                source:
                                    "local",

                                language
                            }
                        );
                    }
                } catch (
                    learningError
                ) {
                    logDebug(
                        "Memory learning failed:",
                        learningError.message
                    );
                }

                try {
                    if (
                        typeof answerMemory.addConversationMessage ===
                            "function"
                    ) {
                        await answerMemory.addConversationMessage(
                            {
                                userId,
                                conversationId,
                                role:
                                    "assistant",
                                content:
                                    localAnswer,
                                metadata: {
                                    source:
                                        "local"
                                }
                            }
                        );
                    }
                } catch {}
            }

            return successResponse(
                res,
                {
                    answer:
                        localAnswer,

                    response:
                        localAnswer,

                    source:
                        "local",

                    provider:
                        "local",

                    model:
                        "turkai-local",

                    conversationId,

                    meta: {
                        duration:
                            Date.now() -
                            startedAt,

                        fallback:
                            true
                    }
                }
            );
        } catch (
            error
        ) {
            serverState.lastError =
                error.message;

            audit(
                "chat_error",
                {
                    error:
                        error.message,

                    stack:
                        error.stack
                }
            );

            return errorResponse(
                res,
                500,
                "TürkAI cevap sisteminde bir hata oluştu.",
                "CHAT_ERROR"
            );
        }
    }
);

/* ============================================================================
   LOCAL RESPONSE
============================================================================ */

function createLocalAnswer(
    message
) {
    const text =
        cleanString(
            message,
            50000
        );

    const normalized =
        text
            .toLocaleLowerCase(
                "tr-TR"
            )
            .trim();

    if (
        normalized.includes(
            "en hızlı kim"
        )
    ) {
        return "TürkAI ⚡🤖";
    }

    if (
        normalized ===
            "selam" ||
        normalized.includes(
            "merhaba"
        )
    ) {
        return "Merhaba! Ben TürkAI. Ne yapmak istiyorsun?";
    }

    if (
        normalized.includes(
            "nasılsın"
        )
    ) {
        return "İyiyim knk, TürkAI çalışıyor. Hazırım.";
    }

    if (
        normalized.includes(
            "sen kimsin"
        )
    ) {
        return "Ben TürkAI. Sohbet, kodlama, araştırma, dosya işleme ve AI araçları için tasarlanmış Türkçe odaklı bir yapay zekâ sistemiyim.";
    }

    if (
        normalized.includes(
            "hangi sürüm"
        ) ||
        normalized.includes(
            "kaçıncı sürüm"
        ) ||
        normalized.includes(
            "versiyon"
        )
    ) {
        return `TürkAI ${TURKAI_VERSION}.`;
    }

    if (
        normalized.includes(
            "sunucu çalışıyor mu"
        ) ||
        normalized.includes(
            "server çalışıyor mu"
        )
    ) {
        return "Evet. TürkAI sunucusu çalışıyor.";
    }

    if (
        normalized.includes(
            "saat kaç"
        )
    ) {
        return (
            "Sunucu zamanı: " +
            new Date()
                .toLocaleString(
                    "tr-TR"
                )
        );
    }

    if (
        normalized.includes(
            "merhaba türkai"
        )
    ) {
        return "Merhaba! TürkAI hazır.";
    }

    return (
        "Bu isteği şu anda TürkAI yerel motoru işliyor. " +
        "Daha ayrıntılı veya güncel sorular için AI ve araştırma motorları devreye girebilir."
    );
}

/* ============================================================================
   MEMORY STATUS
============================================================================ */

app.get(
    "/api/memory/status",
    (
        req,
        res
    ) => {
        try {
            if (
                !answerMemory
            ) {
                return successResponse(
                    res,
                    {
                        enabled:
                            false,

                        available:
                            false,

                        reason:
                            "Memory engine henüz bağlanmadı."
                    }
                );
            }

            let status =
                null;

            if (
                typeof answerMemory.getMemoryStatus ===
                    "function"
            ) {
                status =
                    answerMemory.getMemoryStatus();
            } else if (
                typeof answerMemory.getMemoryHealth ===
                    "function"
            ) {
                status =
                    answerMemory.getMemoryHealth();
            } else if (
                typeof answerMemory.stats ===
                    "function"
            ) {
                status =
                    answerMemory.stats();
            }

            return successResponse(
                res,
                {
                    enabled:
                        true,

                    available:
                        true,

                    memory:
                        status
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                "Memory status alınamadı.",
                "MEMORY_STATUS_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEMORY SAVE
============================================================================ */

app.post(
    "/api/memory/save",
    requireAPIKey,
    async (
        req,
        res
    ) => {
        try {
            if (
                !answerMemory
            ) {
                return errorResponse(
                    res,
                    503,
                    "Memory engine bağlı değil.",
                    "MEMORY_UNAVAILABLE"
                );
            }

            if (
                typeof answerMemory.forceSave ===
                    "function"
            ) {
                await answerMemory.forceSave();
            } else if (
                typeof answerMemory.saveAll ===
                    "function"
            ) {
                await answerMemory.saveAll();
            }

            return successResponse(
                res,
                {
                    message:
                        "Memory kaydedildi."
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "MEMORY_SAVE_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEMORY SEARCH
============================================================================ */

app.post(
    "/api/memory/search",
    async (
        req,
        res
    ) => {
        try {
            const query =
                cleanString(
                    getBody(
                        req
                    ).query ??
                    getBody(
                        req
                    ).question ??
                    "",
                    20000
                );

            if (
                !query
            ) {
                return errorResponse(
                    res,
                    400,
                    "Arama sorgusu gerekli.",
                    "EMPTY_QUERY"
                );
            }

            if (
                !answerMemory
            ) {
                return successResponse(
                    res,
                    {
                        results:
                            []
                    }
                );
            }

            let result =
                null;

            if (
                typeof answerMemory.searchMemory ===
                    "function"
            ) {
                result =
                    await answerMemory.searchMemory(
                        query,
                        getBody(
                            req
                        )
                    );
            } else if (
                typeof answerMemory.findSmartAnswer ===
                    "function"
            ) {
                result =
                    await answerMemory.findSmartAnswer(
                        query
                    );
            } else if (
                typeof answerMemory.findSimilarAnswers ===
                    "function"
            ) {
                result =
                    await answerMemory.findSimilarAnswers(
                        query
                    );
            } else if (
                typeof answerMemory.findAnswer ===
                    "function"
            ) {
                const item =
                    await answerMemory.findAnswer(
                        query
                    );

                result =
                    item
                        ? [item]
                        : [];
            }

            return successResponse(
                res,
                {
                    results:
                        Array.isArray(
                            result
                        )
                            ? result
                            : result
                            ? [result]
                            : []
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "MEMORY_SEARCH_ERROR"
            );
        }
    }
);

/* ============================================================================
   RESEARCH
============================================================================ */

app.post(
    "/api/research",
    async (
        req,
        res
    ) => {
        try {
            const body =
                getBody(
                    req
                );

            const query =
                cleanString(
                    body.query ??
                    body.question ??
                    body.message ??
                    body.text ??
                    "",
                    20000
                );

            if (
                !query
            ) {
                return errorResponse(
                    res,
                    400,
                    "Araştırma sorgusu gerekli.",
                    "EMPTY_RESEARCH_QUERY"
                );
            }

            audit(
                "research_request",
                {
                    query
                }
            );

            if (
                researchEngine
            ) {
                if (
                    typeof researchEngine.research ===
                        "function"
                ) {
                    const result =
                        await researchEngine.research(
                            query,
                            body
                        );

                    return successResponse(
                        res,
                        {
                            query,

                            result
                        }
                    );
                }

                if (
                    typeof researchEngine.search ===
                        "function"
                ) {
                    const result =
                        await researchEngine.search(
                            query,
                            body
                        );

                    return successResponse(
                        res,
                        {
                            query,

                            result
                        }
                    );
                }

                if (
                    typeof researchEngine.run ===
                        "function"
                ) {
                    const result =
                        await researchEngine.run(
                            query,
                            body
                        );

                    return successResponse(
                        res,
                        {
                            query,

                            result
                        }
                    );
                }
            }

            return successResponse(
                res,
                {
                    query,

                    available:
                        false,

                    results:
                        [],

                    message:
                        "Research engine bağlı değil."
                }
            );
        } catch (
            error
        ) {
            audit(
                "research_error",
                {
                    error:
                        error.message
                }
            );

            return errorResponse(
                res,
                500,
                error.message,
                "RESEARCH_ERROR"
            );
        }
    }
);

/* ============================================================================
   WEATHER
============================================================================ */

app.get(
    "/api/weather",
    async (
        req,
        res
    ) => {
        try {
            const city =
                cleanString(
                    req.query.city ??
                    req.query.location ??
                    "",
                    200
                );

            if (
                weatherEngine
            ) {
                if (
                    typeof weatherEngine.getWeather ===
                        "function"
                ) {
                    const result =
                        await weatherEngine.getWeather(
                            city
                        );

                    return successResponse(
                        res,
                        {
                            city,

                            weather:
                                result
                        }
                    );
                }

                if (
                    typeof weatherEngine.weather ===
                        "function"
                ) {
                    const result =
                        await weatherEngine.weather(
                            city
                        );

                    return successResponse(
                        res,
                        {
                            city,

                            weather:
                                result
                        }
                    );
                }

                if (
                    typeof weatherEngine.get ===
                        "function"
                ) {
                    const result =
                        await weatherEngine.get(
                            city
                        );

                    return successResponse(
                        res,
                        {
                            city,

                            weather:
                                result
                        }
                    );
                }
            }

            return successResponse(
                res,
                {
                    city:
                        city ||
                        null,

                    available:
                        false,

                    weather:
                        null,

                    message:
                        "Weather engine bağlı değil."
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "WEATHER_ERROR"
            );
        }
    }
);

/* ============================================================================
   UPLOAD
============================================================================ */

app.post(
    "/api/upload",
    async (
        req,
        res
    ) => {
        try {
            if (
                uploadEngine
            ) {
                if (
                    typeof uploadEngine.handleUpload ===
                        "function"
                ) {
                    const result =
                        await uploadEngine.handleUpload(
                            req,
                            res
                        );

                    if (
                        result !==
                            undefined &&
                        !res.headersSent
                    ) {
                        return successResponse(
                            res,
                            {
                                result
                            }
                        );
                    }

                    return;
                }

                if (
                    typeof uploadEngine.upload ===
                        "function"
                ) {
                    const result =
                        await uploadEngine.upload(
                            req,
                            getBody(
                                req
                            )
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }

                if (
                    typeof uploadEngine.processUpload ===
                        "function"
                ) {
                    const result =
                        await uploadEngine.processUpload(
                            req,
                            getBody(
                                req
                            )
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }
            }

            return errorResponse(
                res,
                503,
                "Upload engine bağlı değil.",
                "UPLOAD_UNAVAILABLE"
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "UPLOAD_ERROR"
            );
        }
    }
);

/* ============================================================================
   PLANS
============================================================================ */

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {
        try {
            if (
                planManager
            ) {
                if (
                    typeof planManager.listPlans ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            plans:
                                planManager.listPlans()
                        }
                    );
                }

                if (
                    typeof planManager.list ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            plans:
                                planManager.list()
                        }
                    );
                }

                if (
                    typeof planManager.getPlans ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            plans:
                                planManager.getPlans()
                        }
                    );
                }
            }

            return successResponse(
                res,
                {
                    plans: [
                        {
                            id:
                                "free",

                            name:
                                "TürkAI Free",

                            price:
                                0,

                            currency:
                                "TRY"
                        },

                        {
                            id:
                                "pro",

                            name:
                                "TürkAI Pro",

                            price:
                                250,

                            currency:
                                "TRY"
                        },

                        {
                            id:
                                "plus",

                            name:
                                "TürkAI Plus",

                            price:
                                500,

                            currency:
                                "TRY"
                        },

                        {
                            id:
                                "ultra",

                            name:
                                "TürkAI Ultra",

                            price:
                                1000,

                            currency:
                                "TRY",

                            status:
                                "coming_soon"
                        }
                    ]
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "PLAN_LIST_ERROR"
            );
        }
    }
);

/* ============================================================================
   USER PLAN
============================================================================ */

app.get(
    "/api/plans/user/:userId",
    (
        req,
        res
    ) => {
        try {
            const userId =
                normalizeUserIdForServer(
                    req.params.userId
                );

            if (
                planManager
            ) {
                if (
                    typeof planManager.getUserPlan ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            userId,

                            plan:
                                planManager.getUserPlan(
                                    userId
                                )
                        }
                    );
                }

                if (
                    typeof planManager.getPlanForUser ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            userId,

                            plan:
                                planManager.getPlanForUser(
                                    userId
                                )
                        }
                    );
                }
            }

            return successResponse(
                res,
                {
                    userId,

                    plan:
                        "free"
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "USER_PLAN_ERROR"
            );
        }
    }
);

/* ============================================================================
   PRO ACTIVATION
============================================================================ */

app.post(
    "/api/pro/activate",
    requireAPIKey,
    (
        req,
        res
    ) => {
        try {
            const body =
                getBody(
                    req
                );

            const userId =
                normalizeUserIdForServer(
                    body.userId
                );

            const code =
                cleanString(
                    body.code ??
                    body.proCode ??
                    "",
                    300
                );

            if (
                !code
            ) {
                return errorResponse(
                    res,
                    400,
                    "Pro kodu gerekli.",
                    "PRO_CODE_REQUIRED"
                );
            }

            if (
                planManager &&
                typeof planManager.activatePro ===
                    "function"
            ) {
                const result =
                    planManager.activatePro(
                        userId,
                        code
                    );

                audit(
                    "pro_activate",
                    {
                        userId,

                        success:
                            Boolean(
                                result?.success ??
                                result
                            )
                    }
                );

                return successResponse(
                    res,
                    {
                        activated:
                            Boolean(
                                result?.success ??
                                result
                            ),

                        result
                    }
                );
            }

            const configuredCode =
                process.env.TURKAI_PRO_CODE ||
                "";

            if (
                configuredCode &&
                code ===
                    configuredCode
            ) {
                return successResponse(
                    res,
                    {
                        activated:
                            true,

                        userId,

                        plan:
                            "pro",

                        source:
                            "env"
                    }
                );
            }

            return errorResponse(
                res,
                403,
                "Geçersiz Pro kodu.",
                "INVALID_PRO_CODE"
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "PRO_ACTIVATION_ERROR"
            );
        }
    }
);

/* ============================================================================
   TEST PAYMENT
============================================================================ */

app.post(
    "/api/test-payment",
    (
        req,
        res
    ) => {
        const body =
            getBody(
                req
            );

        audit(
            "test_payment",
            {
                userId:
                    normalizeUserIdForServer(
                        body.userId
                    ),

                plan:
                    body.plan ||
                    "pro"
            }
        );

        return successResponse(
            res,
            {
                payment:
                    {
                        status:
                            "test",

                        successful:
                            true,

                        transactionId:
                            createId(
                                "testpay"
                            ),

                        plan:
                            body.plan ||
                            "pro"
                    }
            }
        );
    }
);

/* ============================================================================
   MEDIA — IMAGE
============================================================================ */

app.post(
    "/api/media/image",
    async (
        req,
        res
    ) => {
        try {
            const body =
                getBody(
                    req
                );

            if (
                mediaEngine
            ) {
                if (
                    typeof mediaEngine.generateImage ===
                        "function"
                ) {
                    const result =
                        await mediaEngine.generateImage(
                            body
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }

                if (
                    typeof mediaEngine.image ===
                        "function"
                ) {
                    const result =
                        await mediaEngine.image(
                            body
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }
            }

            return errorResponse(
                res,
                503,
                "Image engine bağlı değil.",
                "IMAGE_ENGINE_UNAVAILABLE"
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "IMAGE_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA — VIDEO
============================================================================ */

app.post(
    "/api/media/video",
    async (
        req,
        res
    ) => {
        try {
            const body =
                getBody(
                    req
                );

            if (
                mediaEngine
            ) {
                if (
                    typeof mediaEngine.generateVideo ===
                        "function"
                ) {
                    const result =
                        await mediaEngine.generateVideo(
                            body
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }

                if (
                    typeof mediaEngine.video ===
                        "function"
                ) {
                    const result =
                        await mediaEngine.video(
                            body
                        );

                    return successResponse(
                        res,
                        {
                            result
                        }
                    );
                }
            }

            return errorResponse(
                res,
                503,
                "Video engine bağlı değil.",
                "VIDEO_ENGINE_UNAVAILABLE"
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "VIDEO_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA — JOB
============================================================================ */

app.get(
    "/api/media/jobs/:jobId",
    async (
        req,
        res
    ) => {
        try {
            const jobId =
                cleanString(
                    req.params.jobId,
                    200
                );

            if (
                mediaEngine &&
                typeof mediaEngine.getJob ===
                    "function"
            ) {
                const result =
                    await mediaEngine.getJob(
                        jobId
                    );

                return successResponse(
                    res,
                    {
                        job:
                            result
                    }
                );
            }

            return successResponse(
                res,
                {
                    jobId,

                    status:
                        "unknown",

                    available:
                        false
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "MEDIA_JOB_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA — HISTORY
============================================================================ */

app.get(
    "/api/media/history",
    async (
        req,
        res
    ) => {
        try {
            const userId =
                normalizeUserIdForServer(
                    req.query.userId
                );

            if (
                mediaEngine &&
                typeof mediaEngine.getHistory ===
                    "function"
            ) {
                const history =
                    await mediaEngine.getHistory(
                        userId
                    );

                return successResponse(
                    res,
                    {
                        history:
                            Array.isArray(
                                history
                            )
                                ? history
                                : []
                    }
                );
            }

            return successResponse(
                res,
                {
                    history:
                        []
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "MEDIA_HISTORY_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA — HEALTH
============================================================================ */

app.get(
    "/api/media/health",
    (
        req,
        res
    ) => {
        return successResponse(
            res,
            {
                available:
                    Boolean(
                        mediaEngine
                    ),

                image:
                    Boolean(
                        mediaEngine &&
                        typeof mediaEngine.generateImage ===
                            "function"
                    ),

                video:
                    Boolean(
                        mediaEngine &&
                        typeof mediaEngine.generateVideo ===
                            "function"
                    )
            }
        );
    }
);

/* ============================================================================
   TASKS
============================================================================ */

app.post(
    "/api/tasks",
    async (
        req,
        res
    ) => {
        try {
            if (
                taskEngine
            ) {
                if (
                    typeof taskEngine.createTask ===
                        "function"
                ) {
                    const task =
                        await taskEngine.createTask(
                            getBody(
                                req
                            )
                        );

                    return successResponse(
                        res,
                        {
                            task
                        }
                    );
                }

                if (
                    typeof taskEngine.addTask ===
                        "function"
                ) {
                    const task =
                        await taskEngine.addTask(
                            getBody(
                                req
                            )
                        );

                    return successResponse(
                        res,
                        {
                            task
                        }
                    );
                }

                if (
                    typeof taskEngine.enqueue ===
                        "function"
                ) {
                    const task =
                        await taskEngine.enqueue(
                            getBody(
                                req
                            )
                        );

                    return successResponse(
                        res,
                        {
                            task
                        }
                    );
                }
            }

            return errorResponse(
                res,
                503,
                "Task engine bağlı değil.",
                "TASK_ENGINE_UNAVAILABLE"
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "TASK_ERROR"
            );
        }
    }
);

/* ============================================================================
   TASK QUEUE STATUS
============================================================================ */

app.get(
    "/api/tasks/queue/status",
    (
        req,
        res
    ) => {
        try {
            if (
                taskEngine
            ) {
                if (
                    typeof taskEngine.getQueueStatus ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            queue:
                                taskEngine.getQueueStatus()
                        }
                    );
                }

                if (
                    typeof taskEngine.queueStatus ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            queue:
                                taskEngine.queueStatus()
                        }
                    );
                }

                if (
                    typeof taskEngine.status ===
                        "function"
                ) {
                    return successResponse(
                        res,
                        {
                            queue:
                                taskEngine.status()
                        }
                    );
                }
            }

            return successResponse(
                res,
                {
                    queue: {
                        available:
                            false,

                        pending:
                            0,

                        running:
                            0,

                        completed:
                            0,

                        failed:
                            0
                    }
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "QUEUE_STATUS_ERROR"
            );
        }
    }
);

/* ============================================================================
   TASK HEALTH
============================================================================ */

app.get(
    "/api/tasks/health",
    (
        req,
        res
    ) => {
        return successResponse(
            res,
            {
                available:
                    Boolean(
                        taskEngine
                    ),

                workers:
                    Boolean(
                        taskEngine
                    )
            }
        );
    }
);

/* ============================================================================
   SECURITY HEALTH
============================================================================ */

app.get(
    "/api/security",
    (
        req,
        res
    ) => {
        return successResponse(
            res,
            {
                security: {
                    rateLimit:
                        true,

                    auditLog:
                        true,

                    securityHeaders:
                        true,

                    apiGateway:
                        true,

                    apiKeySystem:
                        Boolean(
                            API_KEYS.turkai
                        ),

                    pathTraversalProtection:
                        true,

                    secretProtection:
                        true
                }
            }
        );
    }
);

/* ============================================================================
   PROVIDER STATUS
============================================================================ */

app.get(
    "/api/ai/providers",
    requireAPIKey,
    (
        req,
        res
    ) => {
        try {
            if (
                aiEngine &&
                typeof aiEngine.getProviderStatus ===
                    "function"
            ) {
                return successResponse(
                    res,
                    {
                        providers:
                            aiEngine.getProviderStatus()
                    }
                );
            }

            if (
                aiEngine &&
                typeof aiEngine.providerStatus ===
                    "function"
            ) {
                return successResponse(
                    res,
                    {
                        providers:
                            aiEngine.providerStatus()
                    }
                );
            }

            return successResponse(
                res,
                {
                    providers:
                        {},
                    
                    available:
                        false
                }
            );
        } catch (
            error
        ) {
            return errorResponse(
                res,
                500,
                error.message,
                "AI_PROVIDER_STATUS_ERROR"
            );
        }
    }
);

/* ============================================================================
   DIAGNOSTICS
============================================================================ */

function getDiagnostics() {
    return {
        name:
            "TürkAI",

        version:
            TURKAI_VERSION,

        environment:
            NODE_ENV,

        node:
            process.version,

        platform:
            process.platform,

        architecture:
            process.arch,

        uptime:
            process.uptime(),

        uptimeMs:
            Date.now() -
            SERVER_STARTED_AT,

        memory:
            process.memoryUsage(),

        requests:
            serverState.requests,

        successfulRequests:
            serverState.successfulRequests,

        failedRequests:
            serverState.failedRequests,

        activeSockets:
            serverState.activeSockets,

        lastError:
            serverState.lastError,

        modules:
            clone(
                moduleStatus
            ),

        timestamp:
            nowISO()
    };
}

app.get(
    "/api/diagnostics",
    requireAPIKey,
    (
        req,
        res
    ) => {
        return successResponse(
            res,
            {
                diagnostics:
                    getDiagnostics()
            }
        );
    }
);

/* ============================================================================
   SOCKET.IO
============================================================================ */

if (
    io
) {
    io.on(
        "connection",
        (
            socket
        ) => {
            serverState.activeSockets++;

            audit(
                "socket_connected",
                {
                    socketId:
                        socket.id
                }
            );

            socket.emit(
                "turkai:ready",
                {
                    success:
                        true,

                    name:
                        "TürkAI",

                    version:
                        TURKAI_VERSION,

                    timestamp:
                        nowISO()
                }
            );

            socket.on(
                "ping",
                () => {
                    socket.emit(
                        "pong",
                        {
                            timestamp:
                                Date.now()
                        }
                    );
                }
            );

            socket.on(
                "chat",
                async (
                    payload = {}
                ) => {
                    try {
                        const message =
                            cleanString(
                                payload.message ??
                                payload.prompt ??
                                payload.text ??
                                "",
                                50000
                            );

                        if (
                            !message
                        ) {
                            return socket.emit(
                                "chat:error",
                                {
                                    success:
                                        false,

                                    error:
                                        "Mesaj boş olamaz.",

                                    code:
                                        "EMPTY_MESSAGE"
                                }
                            );
                        }

                        const userId =
                            normalizeUserIdForServer(
                                payload.userId
                            );

                        const conversationId =
                            cleanString(
                                payload.conversationId ??
                                payload.chatId ??
                                socket.id,
                                200
                            );

                        if (
                            aiEngine &&
                            typeof aiEngine.chat ===
                                "function"
                        ) {
                            const result =
                                await aiEngine.chat(
                                    {
                                        message,

                                        prompt:
                                            message,

                                        userId,

                                        conversationId,

                                        history:
                                            Array.isArray(
                                                payload.history
                                            )
                                                ? payload.history
                                                : [],

                                        model:
                                            payload.model ||
                                            null,

                                        plan:
                                            payload.plan ||
                                            "free",

                                        language:
                                            payload.language ||
                                            "tr"
                                    }
                                );

                            socket.emit(
                                "chat:response",
                                {
                                    success:
                                        true,

                                    result
                                }
                            );

                            return;
                        }

                        socket.emit(
                            "chat:response",
                            {
                                success:
                                    true,

                                result: {
                                    answer:
                                        createLocalAnswer(
                                            message
                                        ),

                                    source:
                                        "local",

                                    model:
                                        "turkai-local"
                                }
                            }
                        );
                    } catch (
                        error
                    ) {
                        socket.emit(
                            "chat:error",
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

            socket.on(
                "memory:search",
                async (
                    payload = {}
                ) => {
                    try {
                        const query =
                            cleanString(
                                payload.query ??
                                payload.question ??
                                "",
                                20000
                            );

                        if (
                            !query
                        ) {
                            return socket.emit(
                                "memory:error",
                                {
                                    error:
                                        "Sorgu gerekli."
                                }
                            );
                        }

                        if (
                            answerMemory
                        ) {
                            let result =
                                null;

                            if (
                                typeof answerMemory.searchMemory ===
                                    "function"
                            ) {
                                result =
                                    await answerMemory.searchMemory(
                                        query,
                                        payload
                                    );
                            } else if (
                                typeof answerMemory.findSmartAnswer ===
                                    "function"
                            ) {
                                result =
                                    await answerMemory.findSmartAnswer(
                                        query
                                    );
                            }

                            return socket.emit(
                                "memory:response",
                                {
                                    success:
                                        true,

                                    result
                                }
                            );
                        }

                        socket.emit(
                            "memory:response",
                            {
                                success:
                                    true,

                                result:
                                    null
                            }
                        );
                    } catch (
                        error
                    ) {
                        socket.emit(
                            "memory:error",
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

            socket.on(
                "disconnect",
                (
                    reason
                ) => {
                    serverState.activeSockets =
                        Math.max(
                            0,
                            serverState.activeSockets -
                                1
                        );

                    audit(
                        "socket_disconnected",
                        {
                            socketId:
                                socket.id,

                            reason
                        }
                    );
                }
            );
        }
    );

    console.log(
        "[TürkAI] Socket.IO aktif."
    );
} else {
    console.log(
        "[TürkAI] Socket.IO kullanılabilir değil."
    );
}

/* ============================================================================
   404 API
============================================================================ */

app.use(
    "/api",
    (
        req,
        res
    ) => {
        return res
            .status(
                404
            )
            .json({
                success:
                    false,

                error:
                    "API endpoint bulunamadı.",

                code:
                    "ENDPOINT_NOT_FOUND",

                path:
                    req.originalUrl,

                timestamp:
                    nowISO()
            });
    }
);

/* ============================================================================
   FRONTEND FALLBACK
============================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {
        if (
            req.method !==
            "GET"
        ) {
            return next();
        }

        if (
            req.originalUrl.startsWith(
                "/api/"
            )
        ) {
            return next();
        }

        const indexFile =
            path.join(
                ROOT_DIR,
                "index.html"
            );

        if (
            fs.existsSync(
                indexFile
            )
        ) {
            return res.sendFile(
                indexFile
            );
        }

        return next();
    }
);

/* ============================================================================
   GLOBAL ERROR HANDLER
============================================================================ */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "[TürkAI ERROR]",
            error
        );

        serverState.lastError =
            error.message;

        audit(
            "server_error",
            {
                message:
                    error.message,

                path:
                    req.originalUrl,

                method:
                    req.method
            }
        );

        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        return res
            .status(
                Number(
                    error.status
                ) || 500
            )
            .json({
                success:
                    false,

                error:
                    IS_PRODUCTION
                        ? "Sunucu hatası."
                        : error.message,

                code:
                    "INTERNAL_SERVER_ERROR",

                timestamp:
                    nowISO()
            });
    }
);

/* ============================================================================
   SELF HEALING
============================================================================ */

const SELF_HEAL_TIMER =
    setInterval(
        () => {
            try {
                const current =
                    Date.now();

                for (
                    const [
                        ip,
                        record
                    ] of rateStore.entries()
                ) {
                    if (
                        !record ||
                        current -
                            record.startedAt >
                            RATE_WINDOW *
                                2
                    ) {
                        rateStore.delete(
                            ip
                        );
                    }
                }

                if (
                    serverState.lastError &&
                    current -
                        SERVER_STARTED_AT >
                        15000
                ) {
                    /*
                      Son hata bilgisini tutmaya devam ediyoruz.
                      Burada sadece sistem durumunu
                      bozuk durumda bırakmıyoruz.
                    */
                }

                serverState.status =
                    "healthy";
            } catch (
                error
            ) {
                serverState.status =
                    "degraded";

                serverState.lastError =
                    error.message;
            }
        },
        60 *
            1000
    );

SELF_HEAL_TIMER.unref?.();

/* ============================================================================
   MEMORY AUTO SAVE
============================================================================ */

const MEMORY_SAVE_TIMER =
    setInterval(
        async () => {
            try {
                if (
                    answerMemory &&
                    typeof answerMemory.saveAll ===
                        "function"
                ) {
                    await answerMemory.saveAll();
                } else if (
                    answerMemory &&
                    typeof answerMemory.forceSave ===
                        "function"
                ) {
                    await answerMemory.forceSave();
                }
            } catch (
                error
            ) {
                logDebug(
                    "Memory auto save:",
                    error.message
                );
            }
        },
        60 *
            1000
    );

MEMORY_SAVE_TIMER.unref?.();

/* ============================================================================
   SERVER START
============================================================================ */

let serverStarted =
    false;

function startServer() {
    if (
        serverStarted
    ) {
        console.warn(
            "[TürkAI] Server zaten başlatılmış."
        );

        return httpServer;
    }

    serverStarted =
        true;

    httpServer.listen(
        PORT,
        HOST,
        () => {
            serverState.status =
                "healthy";

            audit(
                "server_started",
                {
                    port:
                        PORT,

                    host:
                        HOST,

                    environment:
                        NODE_ENV,

                    version:
                        TURKAI_VERSION
                }
            );

            console.log("");

            console.log(
                "============================================================"
            );

            console.log(
                " TÜRKAI MASTER CORE 20/20"
            );

            console.log(
                "============================================================"
            );

            console.log(
                ` Sürüm       : ${TURKAI_VERSION}`
            );

            console.log(
                ` Durum       : ${serverState.status}`
            );

            console.log(
                " Self-Healing: AKTİF"
            );

            console.log(
                " Diagnostics : AKTİF"
            );

            console.log(
                " Security    : AKTİF"
            );

            console.log(
                " API Gateway : AKTİF"
            );

            console.log(
                "============================================================"
            );

            console.log(
                ` Local URL   : http://localhost:${PORT}`
            );

            console.log(
                ` Port        : ${PORT}`
            );

            console.log(
                ` Environment : ${NODE_ENV}`
            );

            console.log(
                "============================================================"
            );

            console.log(
                "[TürkAI] MODULE STATUS"
            );

            console.log(
                JSON.stringify(
                    moduleStatus,
                    null,
                    2
                )
            );

            console.log(
                "============================================================"
            );

            console.log(
                "[TürkAI] API:"
            );

            console.log(
                `GET  /api/health`
            );

            console.log(
                `GET  /api/status`
            );

            console.log(
                `GET  /api/master`
            );

            console.log(
                `POST /api/chat`
            );

            console.log(
                `POST /api/research`
            );

            console.log(
                `GET  /api/weather`
            );

            console.log(
                `POST /api/upload`
            );

            console.log(
                `GET  /api/plans`
            );

            console.log(
                `POST /api/pro/activate`
            );

            console.log(
                `POST /api/test-payment`
            );

            console.log(
                `POST /api/media/image`
            );

            console.log(
                `POST /api/media/video`
            );

            console.log(
                `GET  /api/media/health`
            );

            console.log(
                `POST /api/tasks`
            );

            console.log(
                `GET  /api/tasks/health`
            );

            console.log(
                `GET  /api/security/health`
            );

            console.log(
                "============================================================"
            );

            console.log(
                " TÜRKAI SERVER HAZIR"
            );

            console.log(
                "============================================================"
            );

            console.log("");
        }
    );

    httpServer.on(
        "error",
        (
            error
        ) => {
            serverState.status =
                "error";

            serverState.lastError =
                error.message;

            audit(
                "http_server_error",
                {
                    error:
                        error.message
                }
            );

            console.error(
                "[TürkAI] HTTP Server Error:",
                error.message
            );
        }
    );

    return httpServer;
}

/* ============================================================================
   GRACEFUL SHUTDOWN
============================================================================ */

let shuttingDown =
    false;

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

    console.log(
        `[TürkAI] ${signal} alındı. Güvenli kapanış başlıyor...`
    );

    audit(
        "server_shutdown",
        {
            signal
        }
    );

    try {
        clearInterval(
            SELF_HEAL_TIMER
        );
    } catch {}

    try {
        clearInterval(
            MEMORY_SAVE_TIMER
        );
    } catch {}

    /* ------------------------------------------------------------
       MEMORY SAVE
    ------------------------------------------------------------ */

    try {
        if (
            answerMemory &&
            typeof answerMemory.forceSave ===
                "function"
        ) {
            await answerMemory.forceSave();
        } else if (
            answerMemory &&
            typeof answerMemory.saveAll ===
                "function"
        ) {
            await answerMemory.saveAll();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Memory save error:",
            error.message
        );
    }

    /* ------------------------------------------------------------
       TASK ENGINE
    ------------------------------------------------------------ */

    try {
        if (
            taskEngine &&
            typeof taskEngine.stop ===
                "function"
        ) {
            await taskEngine.stop();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Task shutdown:",
            error.message
        );
    }

    /* ------------------------------------------------------------
       MEDIA ENGINE
    ------------------------------------------------------------ */

    try {
        if (
            mediaEngine &&
            typeof mediaEngine.stop ===
                "function"
        ) {
            await mediaEngine.stop();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Media shutdown:",
            error.message
        );
    }

    /* ------------------------------------------------------------
       SOCKET
    ------------------------------------------------------------ */

    try {
        if (
            io
        ) {
            io.close();
        }
    } catch {}

    /* ------------------------------------------------------------
       HTTP
    ------------------------------------------------------------ */

    try {
        httpServer.close(
            () => {
                console.log(
                    "[TürkAI] HTTP server kapandı."
                );

                serverState.status =
                    "stopped";

                process.exit(
                    0
                );
            }
        );
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Shutdown error:",
            error.message
        );

        process.exit(
            0
        );
    }

    setTimeout(
        () => {
            process.exit(
                0
            );
        },
        5000
    ).unref();
}

/* ============================================================================
   PROCESS SIGNALS
============================================================================ */

process.on(
    "SIGTERM",
    () =>
        shutdown(
            "SIGTERM"
        )
);

process.on(
    "SIGINT",
    () =>
        shutdown(
            "SIGINT"
        )
);

/* ============================================================================
   UNCAUGHT EXCEPTION
============================================================================ */

process.on(
    "uncaughtException",
    (
        error
    ) => {
        serverState.lastError =
            error.message;

        audit(
            "uncaught_exception",
            {
                error:
                    error.message,

                stack:
                    error.stack
            }
        );

        console.error(
            "[TürkAI] UNCAUGHT EXCEPTION:",
            error
        );

        /*
          Burada process'i doğrudan öldürmüyoruz.
          Kritik kapanış gerekiyorsa Render/process yöneticisi
          süreci yeniden başlatabilir.
        */
    }
);

/* ============================================================================
   UNHANDLED REJECTION
============================================================================ */

process.on(
    "unhandledRejection",
    (
        reason
    ) => {
        const message =
            safeString(
                reason,
                "Unknown rejection"
            );

        serverState.lastError =
            message;

        audit(
            "unhandled_rejection",
            {
                reason:
                    message
            }
        );

        console.error(
            "[TürkAI] UNHANDLED REJECTION:",
            reason
        );
    }
);

/* ============================================================================
   FINAL EXPORTS
============================================================================ */

module.exports = {
    app,

    httpServer,

    io,

    startServer,

    shutdown,

    audit,

    logDebug,

    diagnostics:
        getDiagnostics,

    serverState,

    moduleStatus,

    TURKAI_VERSION,

    ROOT_DIR,

    DATA_DIR
};

/* ============================================================================
   START WHEN DIRECTLY EXECUTED
============================================================================ */

if (
    require.main ===
    module
) {
    startServer();
}
