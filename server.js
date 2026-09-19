"use strict";

/* ============================================================================
   TÜRKAI SERVER
   CLEAN MASTER SERVER
   Version: 21.0.0
============================================================================ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");

let dotenvLoaded = false;

try {
    require("dotenv").config();
    dotenvLoaded = true;
} catch (error) {
    dotenvLoaded = false;
}

let Server = null;

try {
    const socketIo = require("socket.io");
    Server = socketIo.Server;
} catch (error) {
    Server = null;
}

/* ============================================================================
   ROOT PATHS
============================================================================ */

const ROOT_DIR =
    path.resolve(
        __dirname
    );

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const MEMORY_DIR =
    path.join(
        DATA_DIR,
        "memory"
    );

const USER_DIR =
    path.join(
        DATA_DIR,
        "users"
    );

const CHAT_DIR =
    path.join(
        DATA_DIR,
        "chats"
    );

const PLAN_DIR =
    path.join(
        DATA_DIR,
        "plans"
    );

const AI_DIR =
    path.join(
        DATA_DIR,
        "ai"
    );

const LOG_DIR =
    path.join(
        DATA_DIR,
        "logs"
    );

const UPLOAD_DIR =
    path.join(
        DATA_DIR,
        "uploads"
    );

const TEMP_DIR =
    path.join(
        DATA_DIR,
        "temp"
    );

/* ============================================================================
   CREATE DIRECTORIES
============================================================================ */

[
    DATA_DIR,
    MEMORY_DIR,
    USER_DIR,
    CHAT_DIR,
    PLAN_DIR,
    AI_DIR,
    LOG_DIR,
    UPLOAD_DIR,
    TEMP_DIR
].forEach(
    (directory) => {
        try {
            fs.mkdirSync(
                directory,
                {
                    recursive: true
                }
            );
        } catch (error) {
            console.error(
                "[TürkAI] Klasör oluşturulamadı:",
                directory,
                error.message
            );
        }
    }
);

/* ============================================================================
   SERVER CONFIG
============================================================================ */

const TURKAI_VERSION =
    "21.0.0";

const NODE_ENV =
    String(
        process.env.NODE_ENV ||
        "development"
    ).toLowerCase();

const IS_PRODUCTION =
    NODE_ENV ===
    "production";

const HOST =
    "0.0.0.0";

const PORT =
    Number(
        process.env.PORT ||
        3000
    );

const SERVER_STARTED_AT =
    Date.now();

/* ============================================================================
   ENV
============================================================================ */

const API_KEYS = {
    turkai:
        String(
            process.env.TURKAI_API_KEY ||
            ""
        ).trim(),

    admin:
        String(
            process.env.TURKAI_ADMIN_KEY ||
            ""
        ).trim()
};

const TURKAI_PRO_CODE =
    String(
        process.env.TURKAI_PRO_CODE ||
        ""
    ).trim();

/* ============================================================================
   EXPRESS
============================================================================ */

const app =
    express();

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

/* ============================================================================
   HTTP SERVER
============================================================================ */

const httpServer =
    http.createServer(
        app
    );

/* ============================================================================
   SOCKET.IO
============================================================================ */

let io = null;

if (Server) {
    try {
        io =
            new Server(
                httpServer,
                {
                    cors: {
                        origin:
                            true,

                        credentials:
                            true
                    },

                    transports: [
                        "websocket",
                        "polling"
                    ]
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

/* ============================================================================
   SAFE HELPERS
============================================================================ */

function safeString(
    value,
    fallback = ""
) {
    if (
        value ===
        null ||
        value ===
        undefined
    ) {
        return fallback;
    }

    try {
        return String(
            value
        );
    } catch {
        return fallback;
    }
}

function cleanString(
    value,
    maxLength = 50000
) {
    return safeString(
        value
    )
        .replace(
            /\u0000/g,
            ""
        )
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
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}

function nowISO() {
    return new Date()
        .toISOString();
}

function clone(
    value
) {
    try {
        return JSON.parse(
            JSON.stringify(
                value
            )
        );
    } catch {
        return value;
    }
}

/* ============================================================================
   JSON STORAGE HELPERS
============================================================================ */

function readJSON(
    file,
    fallback = null
) {
    try {
        if (
            !fs.existsSync(
                file
            )
        ) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (
            !raw.trim()
        ) {
            return fallback;
        }

        return JSON.parse(
            raw
        );
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] JSON okuma hatası:",
            file,
            error.message
        );

        return fallback;
    }
}

function writeJSON(
    file,
    data
) {
    const directory =
        path.dirname(
            file
        );

    fs.mkdirSync(
        directory,
        {
            recursive:
                true
        }
    );

    const temporary =
        file +
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
}

/* ============================================================================
   SERVER STATE
============================================================================ */

const serverState = {
    status:
        "starting",

    startedAt:
        nowISO(),

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

    lastRequestAt:
        null
};

/* ============================================================================
   LOG FILES
============================================================================ */

const SERVER_LOG_FILE =
    path.join(
        LOG_DIR,
        "server.log"
    );

function audit(
    event,
    data = {}
) {
    const record = {
        id:
            createId(
                "audit"
            ),

        event,

        timestamp:
            nowISO(),

        data:
            clone(
                data
            )
    };

    try {
        fs.appendFileSync(
            SERVER_LOG_FILE,
            JSON.stringify(
                record
            ) +
                "\n",
            "utf8"
        );
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Audit log hatası:",
            error.message
        );
    }
}

function logDebug(
    ...args
) {
    if (
        !IS_PRODUCTION
    ) {
        console.log(
            "[TürkAI]",
            ...args
        );
    }
}

/* ============================================================================
   MODULE LOADER
============================================================================ */

function safeRequire(
    relativePath
) {
    try {
        return require(
            relativePath
        );
    } catch (
        error
    ) {
        logDebug(
            `Modül yüklenemedi: ${relativePath}`,
            error.message
        );

        return null;
    }
}

/* ============================================================================
   MODULE CONNECTIONS
============================================================================ */

const answerMemory =
    safeRequire(
        "./src/memory/answerMemory"
    );

const localAnswerMemory =
    safeRequire(
        "./src/memory/localAnswerMemory"
    );

const aiEngine =
    safeRequire(
        "./src/ai/aiEngine"
    );

const planManager =
    safeRequire(
        "./src/plans/planManager"
    );

const researchEngine =
    safeRequire(
        "./src/research/researchEngine"
    );

const weatherEngine =
    safeRequire(
        "./src/weather/weatherEngine"
    );

const uploadEngine =
    safeRequire(
        "./src/uploads/uploadEngine"
    );

const mediaEngine =
    safeRequire(
        "./src/media/mediaEngine"
    );

const taskEngine =
    safeRequire(
        "./src/tasks/taskEngine"
    );

/* ============================================================================
   MODULE STATUS
============================================================================ */

const moduleStatus = {
    answerMemory:
        Boolean(
            answerMemory
        ),

    localAnswerMemory:
        Boolean(
            localAnswerMemory
        ),

    aiEngine:
        Boolean(
            aiEngine
        ),

    planManager:
        Boolean(
            planManager
        ),

    researchEngine:
        Boolean(
            researchEngine
        ),

    weatherEngine:
        Boolean(
            weatherEngine
        ),

    uploadEngine:
        Boolean(
            uploadEngine
        ),

    mediaEngine:
        Boolean(
            mediaEngine
        ),

    taskEngine:
        Boolean(
            taskEngine
        ),

    socketIO:
        Boolean(
            io
        ),

    dotenv:
        dotenvLoaded
};

/* ============================================================================
   EXPRESS MIDDLEWARE
============================================================================ */

app.use(
    express.json(
        {
            limit:
                "50mb"
        }
    )
);

app.use(
    express.urlencoded(
        {
            extended:
                true,

            limit:
                "50mb"
        }
    )
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

        res.setHeader(
            "Permissions-Policy",
            "geolocation=(self), microphone=(self), camera=(self)"
        );

        next();
    }
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
        serverState.requests++;

        serverState.lastRequestAt =
            nowISO();

        const started =
            Date.now();

        res.on(
            "finish",
            () => {
                const duration =
                    Date.now() -
                    started;

                if (
                    res.statusCode >=
                    200 &&
                    res.statusCode <
                    400
                ) {
                    serverState.successfulRequests++;
                } else {
                    serverState.failedRequests++;
                }

                audit(
                    "request",
                    {
                        method:
                            req.method,

                        path:
                            req.originalUrl,

                        status:
                            res.statusCode,

                        duration
                    }
                );
            }
        );

        next();
    }
);

/* ============================================================================
   RATE LIMITER
============================================================================ */

const rateStore =
    new Map();

const RATE_WINDOW =
    60 *
    1000;

const RATE_MAX =
    120;

function rateLimit(
    req,
    res,
    next
) {
    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];

    const ip =
        safeString(
            forwarded ||
            req.ip ||
            req.socket?.remoteAddress ||
            "unknown"
        )
            .split(",")[0]
            .trim();

    const now =
        Date.now();

    let record =
        rateStore.get(
            ip
        );

    if (
        !record ||
        now -
            record.startedAt >
            RATE_WINDOW
    ) {
        record = {
            startedAt:
                now,

            count:
                0
        };
    }

    record.count++;

    rateStore.set(
        ip,
        record
    );

    if (
        record.count >
        RATE_MAX
    ) {
        return res
            .status(
                429
            )
            .json({
                success:
                    false,

                error:
                    "Çok fazla istek gönderildi. Lütfen kısa süre sonra tekrar dene.",

                code:
                    "RATE_LIMITED"
            });
    }

    next();
}

app.use(
    "/api",
    rateLimit
);

/* ============================================================================
   API KEY MIDDLEWARE
============================================================================ */

function requireAPIKey(
    req,
    res,
    next
) {
    /*
      API anahtarı .env'de ayarlanmamışsa
      geliştirme uyumluluğu için geçişe izin verilir.
    */

    if (
        !API_KEYS.turkai
    ) {
        return next();
    }

    const key =
        safeString(
            req.headers[
                "x-turkai-key"
            ] ||
            req.headers[
                "x-api-key"
            ] ||
            req.headers.authorization
        )
            .replace(
                /^Bearer\s+/i,
                ""
            )
            .trim();

    if (
        key &&
        (
            key ===
                API_KEYS.turkai ||
            key ===
                API_KEYS.admin
        )
    ) {
        return next();
    }

    return res
        .status(
            401
        )
        .json({
            success:
                false,

            error:
                "Geçersiz veya eksik API anahtarı.",

            code:
                "UNAUTHORIZED"
        });
}

/* ============================================================================
   ROOT
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

        return res.json({
            success:
                true,

            name:
                "TürkAI",

            version:
                TURKAI_VERSION,

            status:
                serverState.status
        });
    }
);

/* ============================================================================
   HEALTH
============================================================================ */

app.get(
    "/api/health",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            status:
                "ok",

            server:
                "online",

            name:
                "TürkAI",

            version:
                TURKAI_VERSION,

            uptime:
                process.uptime(),

            timestamp:
                nowISO()
        });
    }
);

/* ============================================================================
   STATUS
============================================================================ */

app.get(
    "/api/status",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            status:
                serverState.status,

            version:
                TURKAI_VERSION,

            environment:
                NODE_ENV,

            modules:
                clone(
                    moduleStatus
                ),

            server:
                clone(
                    serverState
                ),

            timestamp:
                nowISO()
        });
    }
);

/* ============================================================================
   MASTER STATUS
============================================================================ */

app.get(
    "/api/master",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            name:
                "TürkAI",

            version:
                TURKAI_VERSION,

            master:
                true,

            status:
                serverState.status,

            capabilities: {
                chat:
                    true,

                memory:
                    Boolean(
                        answerMemory
                    ),

                localAnswers:
                    Boolean(
                        localAnswerMemory
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

                image:
                    Boolean(
                        mediaEngine
                    ),

                video:
                    Boolean(
                        mediaEngine
                    ),

                tasks:
                    Boolean(
                        taskEngine
                    ),

                socket:
                    Boolean(
                        io
                    )
            },

            timestamp:
                nowISO()
        });
    }
);

/* ============================================================================
   API INFO
============================================================================ */

app.get(
    "/api",
    (
        req,
        res
    ) => {
        return res.json({
            success:
                true,

            name:
                "TürkAI API",

            version:
                TURKAI_VERSION,

            endpoints: [
                "/api/health",
                "/api/status",
                "/api/master",
                "/api/chat",
                "/api/research",
                "/api/weather",
                "/api/upload",
                "/api/plans",
                "/api/memory/status",
                "/api/memory/search",
                "/api/media/image",
                "/api/media/video",
                "/api/media/health",
                "/api/tasks",
                "/api/tasks/health",
                "/api/security",
                "/api/diagnostics"
            ]
        });
    }
);

/* ============================================================================
   LOCAL ANSWER HELPER
   ============================================================================

   ÖNEMLİ:
   Burada hazır cevap tutulmaz.

   Bütün yerel cevaplar:
   src/memory/localAnswerMemory.js
   üzerinden alınır.
============================================================================ */

function getLocalAnswer(
    message
) {
    if (
        !localAnswerMemory
    ) {
        return null;
    }

    try {
        if (
            typeof localAnswerMemory.getAnswer ===
                "function"
        ) {
            return cleanString(
                localAnswerMemory.getAnswer(
                    message
                ),
                50000
            ) || null;
        }

        if (
            typeof localAnswerMemory.find ===
                "function"
        ) {
            const result =
                localAnswerMemory.find(
                    message
                );

            return cleanString(
                result?.answer ??
                result?.response ??
                result?.text ??
                "",
                50000
            ) || null;
        }

        return null;
    } catch (
        error
    ) {
        logDebug(
            "Local answer memory:",
            error.message
        );

        return null;
    }
}

const GENERIC_LOCAL_FALLBACK =
    "Bu isteği şu anda TürkAI yerel motoru işliyor. Daha ayrıntılı veya güncel sorular için AI ve araştırma motorları devreye girebilir.";

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
                req.body ||
                {};

            const message =
                cleanString(
                    body.message ??
                    body.prompt ??
                    body.text ??
                    "",
                    50000
                );

            const userId =
                cleanString(
                    body.userId ??
                    body.user?.id ??
                    "anonymous",
                    200
                ) ||
                "anonymous";

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
                return res
                    .status(
                        400
                    )
                    .json({
                        success:
                            false,

                        error:
                            "Mesaj boş olamaz.",

                        code:
                            "EMPTY_MESSAGE"
                    });
            }

            audit(
                "chat_request",
                {
                    userId,
                    conversationId,
                    plan,
                    model,
                    language
                }
            );

            /* ------------------------------------------------------------
               USER MEMORY
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
                error
            ) {
                logDebug(
                    "User memory kaydı:",
                    error.message
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
                        const normalized =
                            typeof result ===
                            "object"
                                ? result
                                : {
                                      answer:
                                          safeString(
                                              result
                                          )
                                  };

                        const answer =
                            cleanString(
                                normalized.answer ??
                                normalized.response ??
                                normalized.text ??
                                "",
                                50000
                            );

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
                                                normalized.metadata ||
                                                {}
                                        }
                                    );
                                }
                            } catch {}

                            return res.json({
                                success:
                                    true,

                                answer,

                                response:
                                    answer,

                                source:
                                    normalized.source ||
                                    "ai",

                                provider:
                                    normalized.provider ||
                                    null,

                                model:
                                    normalized.model ||
                                    model ||
                                    null,

                                conversationId,

                                meta: {
                                    duration:
                                        Date.now() -
                                        startedAt,

                                    fallback:
                                        Boolean(
                                            normalized.fallback
                                        )
                                }
                            });
                        }
                    }
                } catch (
                    error
                ) {
                    audit(
                        "ai_error",
                        {
                            userId,
                            error:
                                error.message
                        }
                    );

                    logDebug(
                        "AI Engine:",
                        error.message
                    );
                }
            }

            /* ------------------------------------------------------------
               KNOWLEDGE MEMORY
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
                    } else if (
                        typeof answerMemory.findSmartAnswer ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.findSmartAnswer(
                                message,
                                {
                                    userId
                                }
                            );
                    } else if (
                        typeof answerMemory.findAnswer ===
                            "function"
                    ) {
                        memoryResult =
                            await answerMemory.findAnswer(
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
                        return res.json({
                            success:
                                true,

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
                                    true
                            }
                        });
                    }
                } catch (
                    error
                ) {
                    logDebug(
                        "Knowledge memory:",
                        error.message
                    );
                }
            }

            /* ------------------------------------------------------------
               LOCAL ANSWER MEMORY
            ------------------------------------------------------------ */

            const localAnswer =
                getLocalAnswer(
                    message
                );

            const finalAnswer =
                localAnswer ||
                GENERIC_LOCAL_FALLBACK;

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
                                finalAnswer,

                            metadata: {
                                source:
                                    localAnswer
                                        ? "local-answer-memory"
                                        : "local-fallback"
                            }
                        }
                    );
                }
            } catch {}

            return res.json({
                success:
                    true,

                answer:
                    finalAnswer,

                response:
                    finalAnswer,

                source:
                    localAnswer
                        ? "local-answer-memory"
                        : "local",

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
            });
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

            return res
                .status(
                    500
                )
                .json({
                    success:
                        false,

                    error:
                        "TürkAI cevap sisteminde bir hata oluştu.",

                    code:
                        "CHAT_ERROR"
                });
        }
    }
);

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
            let memory =
                null;

            if (
                answerMemory &&
                typeof answerMemory.getMemoryStatus ===
                    "function"
            ) {
                memory =
                    answerMemory.getMemoryStatus();
            } else if (
                answerMemory &&
                typeof answerMemory.getMemoryHealth ===
                    "function"
            ) {
                memory =
                    answerMemory.getMemoryHealth();
            } else if (
                answerMemory &&
                typeof answerMemory.stats ===
                    "function"
            ) {
                memory =
                    answerMemory.stats();
            }

            let local =
                null;

            if (
                localAnswerMemory &&
                typeof localAnswerMemory.health ===
                    "function"
            ) {
                local =
                    localAnswerMemory.health();
            }

            return res.json({
                success:
                    true,

                available:
                    Boolean(
                        answerMemory
                    ),

                localAnswerMemory:
                    Boolean(
                        localAnswerMemory
                    ),

                memory,

                local
            });
        } catch (
            error
        ) {
            return res
                .status(
                    500
                )
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
   LOCAL ANSWERS INFO
============================================================================ */

app.get(
    "/api/local-answers",
    (
        req,
        res
    ) => {
        try {
            if (
                !localAnswerMemory
            ) {
                return res.json({
                    success:
                        true,

                    available:
                        false,

                    answers:
                        []
                });
            }

            if (
                typeof localAnswerMemory.listAnswers ===
                    "function"
            ) {
                return res.json({
                    success:
                        true,

                    available:
                        true,

                    answers:
                        localAnswerMemory.listAnswers()
                });
            }

            return res.json({
                success:
                    true,

                available:
                    true,

                answers:
                    []
            });
        } catch (
            error
        ) {
            return res
                .status(
                    500
                )
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
   LOCAL ANSWERS RELOAD
============================================================================ */

app.post(
    "/api/local-answers/reload",
    requireAPIKey,
    (
        req,
        res
    ) => {
        try {
            if (
                !localAnswerMemory
            ) {
                return res
                    .status(
                        503
                    )
                    .json({
                        success:
                            false,

                        error:
                            "Local answer memory bağlı değil."
                    });
            }

            let count =
                null;

            if (
                typeof localAnswerMemory.reload ===
                    "function"
            ) {
                count =
                    localAnswerMemory.reload();
            }

            return res.json({
                success:
                    true,

                reloaded:
                    true,

                count
            });
        } catch (
            error
        ) {
            return res
                .status(
                    500
                )
                .json({
                    success:
                        false,

                    error:
                        error.message
                });
        }
    }
);
if (
    !aiCache ||
    typeof aiCache !== "object"
) {
    aiCache = {};
}

/* ============================================================================
   CACHE HELPERS
============================================================================ */

function cacheKey(
    messages,
    model,
    language
) {
    const payload = JSON.stringify({
        messages:
            Array.isArray(messages)
                ? messages
                : [],

        model:
            model ||
            "turkai-local",

        language:
            language ||
            "tr"
    });

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            payload
        )
        .digest(
            "hex"
        );
}

function getCachedAnswer(
    key
) {
    if (
        !DEFAULT_AI_CONFIG.cache?.enabled
    ) {
        return null;
    }

    const item =
        aiCache[key];

    if (
        !item ||
        typeof item !== "object"
    ) {
        return null;
    }

    const createdAt =
        Number(
            item.createdAt || 0
        );

    const ttl =
        Number(
            item.ttl ||
            DEFAULT_AI_CONFIG.cache.ttl
        );

    if (
        createdAt <= 0
    ) {
        delete aiCache[key];
        return null;
    }

    if (
        Date.now() -
            createdAt >
        ttl
    ) {
        delete aiCache[key];
        return null;
    }

    return (
        item.value ??
        null
    );
}

function setCachedAnswer(
    key,
    value,
    extra = {}
) {
    if (
        !DEFAULT_AI_CONFIG.cache?.enabled
    ) {
        return;
    }

    aiCache[key] = {
        value:

            typeof value ===
            "object"
                ? clone(value)
                : value,

        createdAt:
            Date.now(),

        ttl:
            Number(
                extra.ttl ||
                DEFAULT_AI_CONFIG.cache.ttl
            ),

        model:
            extra.model ||
            null,

        provider:
            extra.provider ||
            null,

        language:
            extra.language ||
            null
    };

    /*
      Cache'in kontrolsüz büyümesini önle.
    */

    const entries =
        Object.entries(
            aiCache
        );

    const maxEntries =
        1000;

    if (
        entries.length >
        maxEntries
    ) {
        entries
            .sort(
                (
                    [, a],
                    [, b]
                ) =>
                    Number(
                        a.createdAt ||
                        0
                    ) -
                    Number(
                        b.createdAt ||
                        0
                    )
            )
            .slice(
                0,
                entries.length -
                    maxEntries
            )
            .forEach(
                ([keyToDelete]) => {
                    delete aiCache[
                        keyToDelete
                    ];
                }
            );
    }
}

function persistAICache() {
    try {
        writeJSON(
            CACHE_FILE,
            aiCache
        );
        return true;
    } catch (
        error
    ) {
        return false;
    }
}

/* ============================================================================
   CONFIG HELPERS
============================================================================ */

let aiConfig =
    readJSON(
        AI_CONFIG_FILE,
        {}
    );

if (
    !aiConfig ||
    typeof aiConfig !== "object" ||
    Array.isArray(aiConfig)
) {
    aiConfig = {};
}

aiConfig = {
    ...clone(
        DEFAULT_AI_CONFIG
    ),
    ...aiConfig,

    cache: {
        ...clone(
            DEFAULT_AI_CONFIG.cache
        ),
        ...(aiConfig.cache || {})
    },

    providers: {
        ...clone(
            DEFAULT_AI_CONFIG.providers
        ),
        ...(aiConfig.providers || {})
    }
};

function getAIConfig() {
    return clone(
        aiConfig
    );
}

function saveAIConfig(
    patch = {}
) {
    if (
        !patch ||
        typeof patch !== "object"
    ) {
        return getAIConfig();
    }

    aiConfig = {
        ...aiConfig,
        ...patch,

        cache: {
            ...(aiConfig.cache || {}),
            ...(patch.cache || {})
        },

        providers: {
            ...(aiConfig.providers || {}),
            ...(patch.providers || {})
        }
    };

    writeJSON(
        AI_CONFIG_FILE,
        aiConfig
    );

    return getAIConfig();
}

/* ============================================================================
   PROVIDER HELPERS
============================================================================ */

function getProviderKey(
    name
) {
    return cleanText(
        name,
        100
    )
        .toLowerCase()
        .trim();
}

function isProviderConfigured(
    name
) {
    const provider =
        getProviderKey(
            name
        );

    if (
        provider === "local"
    ) {
        return true;
    }

    if (
        provider === "groq"
    ) {
        return Boolean(
            ENV.GROQ_API_KEY
        );
    }

    if (
        provider === "cerebras"
    ) {
        return Boolean(
            ENV.CEREBRAS_API_KEY
        );
    }

    if (
        provider === "gemini"
    ) {
        return Boolean(
            ENV.GEMINI_API_KEY
        );
    }

    if (
        provider === "openrouter"
    ) {
        return Boolean(
            ENV.OPENROUTER_API_KEY
        );
    }

    return false;
}

function isProviderCoolingDown(
    name
) {
    const provider =
        getProviderKey(
            name
        );

    const state =
        providerState[
            provider
        ];

    if (
        !state
    ) {
        return false;
    }

    if (
        !state.cooldownUntil
    ) {
        return false;
    }

    return (
        Date.now() <
        Number(
            state.cooldownUntil
        )
    );
}

function markProviderSuccess(
    name,
    metadata = {}
) {
    const provider =
        getProviderKey(
            name
        );

    if (
        !providerState[
            provider
        ]
    ) {
        return;
    }

    const state =
        providerState[
            provider
        ];

    state.requests =
        Number(
            state.requests || 0
        );

    state.successes =
        Number(
            state.successes || 0
        );

    state.requests += 1;
    state.successes += 1;
    state.available = true;

    state.lastSuccess =
        new Date()
            .toISOString();

    state.lastError =
        null;

    state.cooldownUntil =
        0;

    state.lastMetadata =
        clone(
            metadata
        );
}

function markProviderFailure(
    name,
    error,
    metadata = {}
) {
    const provider =
        getProviderKey(
            name
        );

    if (
        !providerState[
            provider
        ]
    ) {
        return;
    }

    const state =
        providerState[
            provider
        ];

    state.requests =
        Number(
            state.requests || 0
        );

    state.failures =
        Number(
            state.failures || 0
        );

    state.requests += 1;
    state.failures += 1;

    state.lastFailure =
        new Date()
            .toISOString();

    state.lastError =
        safeString(
            error?.message ||
            error ||
            "Unknown provider error"
        ).slice(
            0,
            2000
        );

    state.lastMetadata =
        clone(
            metadata
        );

    /*
      Geçici provider hatalarında kısa cooldown.
    */

    state.cooldownUntil =
        Date.now() +
        3000;
}

function getProviderStatus() {
    const result = {};

    for (
        const providerName of Object.keys(
            providerState
        )
    ) {
        const state =
            providerState[
                providerName
            ];

        result[
            providerName
        ] = {
            available:
                Boolean(
                    state.available
                ),

            configured:
                isProviderConfigured(
                    providerName
                ),

            coolingDown:
                isProviderCoolingDown(
                    providerName
                ),

            requests:
                Number(
                    state.requests || 0
                ),

            successes:
                Number(
                    state.successes || 0
                ),

            failures:
                Number(
                    state.failures || 0
                ),

            lastSuccess:
                state.lastSuccess ||
                null,

            lastFailure:
                state.lastFailure ||
                null,

            lastError:
                state.lastError ||
                null,

            cooldownUntil:
                Number(
                    state.cooldownUntil || 0
                )
        };
    }

    return result;
}

/* ============================================================================
   LANGUAGE DETECTION
============================================================================ */

const TURKISH_CHARS =
    /[çğıöşüÇĞİÖŞÜ]/;

const TURKISH_WORDS = [
    "ve",
    "bir",
    "bu",
    "şu",
    "için",
    "ile",
    "nasıl",
    "neden",
    "hangi",
    "kim",
    "nerede",
    "ne",
    "mi",
    "mı",
    "mu",
    "mü",
    "de",
    "da"
];

const ENGLISH_WORDS = [
    "the",
    "and",
    "this",
    "that",
    "what",
    "why",
    "how",
    "where",
    "when",
    "who",
    "is",
    "are",
    "can",
    "please"
];

const GERMAN_WORDS = [
    "der",
    "die",
    "das",
    "und",
    "ist",
    "was",
    "wie",
    "warum"
];

const SPANISH_WORDS = [
    "el",
    "la",
    "los",
    "las",
    "que",
    "como",
    "por",
    "para",
    "hola"
];

const FRENCH_WORDS = [
    "le",
    "la",
    "les",
    "des",
    "est",
    "que",
    "pour",
    "bonjour"
];

function tokenizeLanguageText(
    text
) {
    return cleanText(
        text,
        20000
    )
        .toLocaleLowerCase()
        .split(
            /[^a-zA-ZÀ-žÇĞİÖŞÜçğıöşü]+/u
        )
        .filter(
            Boolean
        );
}

function scoreLanguage(
    tokens,
    words
) {
    let score = 0;

    for (
        const token of tokens
    ) {
        if (
            words.includes(
                token
            )
        ) {
            score++;
        }
    }

    return score;
}

function detectLanguage(
    text,
    requestedLanguage = null
) {
    const explicit =
        cleanText(
            requestedLanguage,
            20
        )
            .toLowerCase();

    if (
        explicit &&
        explicit !== "auto"
    ) {
        return explicit;
    }

    const source =
        cleanText(
            text,
            20000
        );

    if (
        !source
    ) {
        return (
            aiConfig.defaultLanguage ||
            "tr"
        );
    }

    if (
        TURKISH_CHARS.test(
            source
        )
    ) {
        return "tr";
    }

    const tokens =
        tokenizeLanguageText(
            source
        );

    const scores = {
        tr:
            scoreLanguage(
                tokens,
                TURKISH_WORDS
            ),

        en:
            scoreLanguage(
                tokens,
                ENGLISH_WORDS
            ),

        de:
            scoreLanguage(
                tokens,
                GERMAN_WORDS
            ),

        es:
            scoreLanguage(
                tokens,
                SPANISH_WORDS
            ),

        fr:
            scoreLanguage(
                tokens,
                FRENCH_WORDS
            )
    };

    const sorted =
        Object.entries(
            scores
        ).sort(
            (
                [, a],
                [, b]
            ) =>
                b - a
        );

    if (
        !sorted.length ||
        sorted[0][1] <= 0
    ) {
        return (
            aiConfig.defaultLanguage ||
            "tr"
        );
    }

    return sorted[0][0];
}

/* ============================================================================
   QUESTION CLEANING
============================================================================ */

function normalizeQuestion(
    message
) {
    return cleanText(
        message,
        aiConfig.maxMessageLength ||
            50000
    )
        .replace(
            /\r\n/g,
            "\n"
        )
        .replace(
            /[ \t]+/g,
            " "
        )
        .trim();
}

function stripRepeatedWhitespace(
    text
) {
    return cleanText(
        text,
        50000
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

/* ============================================================================
   QUESTION CLASSIFICATION
============================================================================ */

const CURRENT_QUESTION_PATTERNS = [
    /\bbugün\b/i,
    /\bşimdi\b/i,
    /\bşu an\b/i,
    /\bşuan\b/i,
    /\bson dakika\b/i,
    /\bgüncel\b/i,
    /\ben son\b/i,
    /\bson haber\b/i,
    /\bbu hafta\b/i,
    /\bbu ay\b/i,
    /\bkaçta\b/i,
    /\bkur\b/i,
    /\bdolar\b/i,
    /\beuro\b/i,
    /\bhava\b/i,
    /\bsıcaklık\b/i,
    /\bseçim\b/i,
    /\bbaşkan\b/i,
    /\bhaberler\b/i,
    /\bfiyat\b/i,
    /\bbedel\b/i
];

const CODING_PATTERNS = [
    /\bjavascript\b/i,
    /\btypescript\b/i,
    /\bpython\b/i,
    /\bhtml\b/i,
    /\bcss\b/i,
    /\bjava\b/i,
    /\bc\+\+\b/i,
    /\bc#\b/i,
    /\bnode\.?js\b/i,
    /\breact\b/i,
    /\bvue\b/i,
    /\bangular\b/i,
    /\bphp\b/i,
    /\bsql\b/i,
    /\bjson\b/i,
    /\bapi\b/i,
    /\bregex\b/i,
    /\bkod\b/i,
    /\bkodla\b/i,
    /\bkodunu\b/i,
    /\bfonksiyon\b/i,
    /\bclass\b/i,
    /\bbug\b/i,
    /\bhata\b/i,
    /\bdebug\b/i,
    /```/,
    /const\s+\w+/i,
    /let\s+\w+/i,
    /function\s+\w+/i
];

const RESEARCH_PATTERNS = [
    /\binternetten\b/i,
    /\baraştır\b/i,
    /\bresearch\b/i,
    /\bwebde\b/i,
    /\bweb'de\b/i,
    /\bgüncel bilgi\b/i,
    /\bkaynak bul\b/i,
    /\bsources?\b/i,
    /\blink bul\b/i,
    /\bkim ne dedi\b/i
];

const LONG_TASK_PATTERNS = [
    /\bdetaylı\b/i,
    /\bdetayli\b/i,
    /\bçok kapsamlı\b/i,
    /\bcok kapsamli\b/i,
    /\bbaştan sona\b/i,
    /\bbastan sona\b/i,
    /\bkomple\b/i,
    /\bprofesyonel\b/i,
    /\bultra\b/i,
    /\beksiksiz\b/i
];

function matchesAnyPattern(
    text,
    patterns
) {
    return patterns.some(
        (
            pattern
        ) =>
            pattern.test(
                text
            )
    );
}

function classifyQuestion(
    message
) {
    const text =
        normalizeQuestion(
            message
        );

    const lower =
        text.toLocaleLowerCase(
            "tr-TR"
        );

    const classification = {
        text,

        language:
            detectLanguage(
                text
            ),

        isEmpty:
            !text,

        isCurrent:
            matchesAnyPattern(
                text,
                CURRENT_QUESTION_PATTERNS
            ),

        isCoding:
            matchesAnyPattern(
                text,
                CODING_PATTERNS
            ),

        needsResearch:
            matchesAnyPattern(
                text,
                RESEARCH_PATTERNS
            ),

        isLongTask:
            matchesAnyPattern(
                text,
                LONG_TASK_PATTERNS
            ),

        isGreeting:
            /^(slm|selam|sa|s\.a\.|merhaba|hey|hi|hello)\b/i.test(
                lower
            ),

        isQuestion:
            /[?？]/.test(
                text
            ) ||
            /^(ne|neden|nasıl|nasilsin|kim|hangi|kaç|ne kadar|what|why|how|who|when|where)\b/i.test(
                lower
            ),

        isShort:
            text.length <=
            120,

        isVeryLong:
            text.length >=
            10000
    };

    /*
      Güncel sorular otomatik araştırmaya daha yüksek öncelik verir.
    */

    if (
        classification.isCurrent &&
        aiConfig.autoResearch
    ) {
        classification.needsResearch =
            true;
    }

    return classification;
}

/* ============================================================================
   MESSAGE NORMALIZATION
============================================================================ */

function normalizeMessages(
    history,
    message,
    systemPrompt = null,
    maxHistory = 30
) {
    const output = [];

    if (
        systemPrompt
    ) {
        output.push({
            role:
                "system",

            content:
                cleanText(
                    systemPrompt,
                    20000
                )
        });
    }

    if (
        Array.isArray(
            history
        )
    ) {
        for (
            const item of history.slice(
                -maxHistory
            )
        ) {
            const role =
                cleanText(
                    item?.role ||
                    "user",
                    30
                ).toLowerCase();

            const content =
                cleanText(
                    item?.content ??
                    item?.text ??
                    "",
                    20000
                );

            if (
                !content
            ) {
                continue;
            }

            const allowedRoles = [
                "system",
                "user",
                "assistant"
            ];

            output.push({
                role:
                    allowedRoles.includes(
                        role
                    )
                        ? role
                        : "user",

                content
            });
        }
    }

    if (
        message
    ) {
        output.push({
            role:
                "user",

            content:
                normalizeQuestion(
                    message
                )
        });
    }

    return output;
}

/* ============================================================================
   SYSTEM PROMPT
============================================================================ */

function createSystemPrompt(
    {
        language = "tr",
        plan = "free",
        coding = false,
        research = false
    } = {}
) {
    const languageText =
        language === "tr"
            ? "Türkçe"
            : language;

    let prompt =
        "Sen TürkAI'sın. Kullanıcıya açık, doğru, doğal ve faydalı cevaplar ver. ";

    prompt +=
        `Varsayılan cevap dili: ${languageText}. `;

    prompt +=
        "Kullanıcı Türkçe konuşuyorsa doğal Türkçe kullan. ";

    prompt +=
        "Bilmediğin bir şeyi kesin gerçek gibi uydurma. ";

    prompt +=
        "Gereksiz yere aynı cümleyi tekrar etme. ";

    prompt +=
        "Kod istenirse çalışabilir, düzenli ve açıklanabilir kod üret. ";

    prompt +=
        `Kullanıcı planı: ${plan}. `;

    if (
        coding
    ) {
        prompt +=
            "Bu istek kodlama içeriği içeriyor; kodu doğrudan uygulanabilir şekilde ele al. ";
    }

    if (
        research
    ) {
        prompt +=
            "Bu istekte güncellik önemli olabilir; araştırma sonucu varsa kaynak bilgilerini dikkate al. ";
    }

    return prompt;
}

/* ============================================================================
   LOCAL FALLBACK GENERATOR
============================================================================ */

/*
  Burada da hazır selam cevaplarını tutmuyoruz.
  Yerel cevaplar:
  src/memory/localAnswerMemory.js

  tarafından sağlanır.
*/

function getLocalAnswerMemoryModule() {
    try {
        return require(
            "../memory/localAnswerMemory"
        );
    } catch (
        error
    ) {
        return null;
    }
}

function getLocalMemoryAnswer(
    message
) {
    const memoryModule =
        getLocalAnswerMemoryModule();

    if (
        !memoryModule
    ) {
        return null;
    }

    try {
        if (
            typeof memoryModule.getAnswer ===
                "function"
        ) {
            return cleanText(
                memoryModule.getAnswer(
                    message
                ) || "",
                50000
            ) || null;
        }

        if (
            typeof memoryModule.find ===
                "function"
        ) {
            const result =
                memoryModule.find(
                    message
                );

            return cleanText(
                result?.answer ??
                result?.response ??
                result?.text ??
                "",
                50000
            ) || null;
        }
    } catch (
        error
    ) {
        logDebug(
            "Local answer lookup:",
            error.message
        );
    }

    return null;
}

/* ============================================================================
   ERROR CLASSIFICATION
============================================================================ */

function classifyProviderError(
    error
) {
    const status =
        Number(
            error?.status ??
            error?.statusCode ??
            error?.response?.status ??
            0
        );

    const message =
        safeString(
            error?.message ??
            error ??
            ""
        )
            .toLowerCase();

    if (
        status ===
        401 ||
        message.includes(
            "unauthorized"
        ) ||
        message.includes(
            "invalid api key"
        )
    ) {
        return {
            type:
                "auth",

            retryable:
                false,

            cooldown:
                0
        };
    }

    if (
        status ===
        402 ||
        message.includes(
            "payment required"
        ) ||
        message.includes(
            "insufficient"
        ) ||
        message.includes(
            "credits"
        )
    ) {
        return {
            type:
                "billing",

            retryable:
                false,

            cooldown:
                60000
        };
    }

    if (
        status ===
        429 ||
        message.includes(
            "rate limit"
        ) ||
        message.includes(
            "too many requests"
        ) ||
        message.includes(
            "quota"
        )
    ) {
        return {
            type:
                "quota",

            retryable:
                true,

            cooldown:
                30000
        };
    }

    if (
        status >=
            500 &&
        status <=
            599
    ) {
        return {
            type:
                "server",

            retryable:
                true,

            cooldown:
                5000
        };
    }

    if (
        message.includes(
            "timeout"
        ) ||
        message.includes(
            "timed out"
        ) ||
        message.includes(
            "network"
        ) ||
        message.includes(
            "fetch failed"
        ) ||
        message.includes(
            "econnreset"
        )
    ) {
        return {
            type:
                "network",

            retryable:
                true,

            cooldown:
                5000
        };
    }

    return {
        type:
            "unknown",

        retryable:
            true,

        cooldown:
            3000
    };
}

function applyProviderCooldown(
    providerName,
    milliseconds
) {
    const provider =
        getProviderKey(
            providerName
        );

    if (
        !providerState[
            provider
        ]
    ) {
        return;
    }

    providerState[
        provider
    ].cooldownUntil =
        Date.now() +
        Math.max(
            0,
            Number(
                milliseconds ||
                0
            )
        );
}

/* ============================================================================
   USAGE TRACKING
============================================================================ */

let aiUsage =
    readJSON(
        USAGE_FILE,
        {}
    );

if (
    !aiUsage ||
    typeof aiUsage !== "object" ||
    Array.isArray(aiUsage)
) {
    aiUsage = {};
}

function getUsageDay() {
    return new Date()
        .toISOString()
        .slice(
            0,
            10
        );
}

function ensureUsageDay(
    day = getUsageDay()
) {
    if (
        !aiUsage[day] ||
        typeof aiUsage[day] !== "object"
    ) {
        aiUsage[day] = {
            total:
                0,

            successes:
                0,

            failures:
                0,

            providers:
                {}
        };
    }

    if (
        !aiUsage[day].providers ||
        typeof aiUsage[day].providers !== "object"
    ) {
        aiUsage[day].providers =
            {};
    }

    return aiUsage[
        day
    ];
}

function recordUsage(
    providerName,
    success,
    metadata = {}
) {
    const day =
        ensureUsageDay();

    day.total++;

    if (
        success
    ) {
        day.successes++;
    } else {
        day.failures++;
    }

    const provider =
        getProviderKey(
            providerName
        );

    if (
        !day.providers[
            provider
        ]
    ) {
        day.providers[
            provider
        ] = {
            requests:
                0,

            successes:
                0,

            failures:
                0
        };
    }

    const providerUsage =
        day.providers[
            provider
        ];

    providerUsage.requests++;

    if (
        success
    ) {
        providerUsage.successes++;
    } else {
        providerUsage.failures++;
    }

    providerUsage.lastAt =
        now();

    providerUsage.lastModel =
        metadata.model ||
        null;

    providerUsage.lastError =
        success
            ? null
            : metadata.error ||
              null;

    try {
        writeJSON(
            USAGE_FILE,
            aiUsage
        );
    } catch {}

    return clone(
        day
    );
}

/* ============================================================================
   AI REQUEST NORMALIZATION
============================================================================ */

function normalizeAIRequest(
    input = {}
) {
    const message =
        normalizeQuestion(
            input.message ??
            input.prompt ??
            input.text ??
            ""
        );

    const userId =
        cleanText(
            input.userId ??
            "anonymous",
            200
        ) ||
        "anonymous";

    const conversationId =
        cleanText(
            input.conversationId ??
            input.chatId ??
            "",
            200
        ) ||
        null;

    const language =
        detectLanguage(
            message,
            input.language
        );

    const classification =
        classifyQuestion(
            message
        );

    const requestedModel =
        cleanText(
            input.model ??
            "",
            200
        );

    const requestedProvider =
        getProviderKey(
            input.provider ??
            ""
        );

    const plan =
        cleanText(
            input.plan ??
            "free",
            50
        )
            .toLowerCase();

    const history =
        Array.isArray(
            input.history
        )
            ? input.history
            : [];

    return {
        ...input,

        message,

        prompt:
            message,

        userId,

        conversationId,

        language,

        classification,

        requestedModel,

        requestedProvider,

        plan,

        history
    };
}

/* ============================================================================
   MODEL RESOLUTION
============================================================================ */

function resolveModel(
    request
) {
    const requested =
        request.requestedModel;

    if (
        requested
    ) {
        if (
            MODELS[requested]
        ) {
            return requested;
        }

        const directMatch =
            Object.values(
                MODELS
            ).find(
                (
                    model
                ) =>
                    model?.model ===
                    requested
            );

        if (
            directMatch
        ) {
            const found =
                Object.entries(
                    MODELS
                ).find(
                    (
                        [, model]
                    ) =>
                        model ===
                        directMatch
                );

            if (
                found
            ) {
                return found[0];
            }
        }
    }

    if (
        request.plan ===
        "ultra"
    ) {
        if (
            MODELS[
                "turkai-ultra"
            ]
        ) {
            return "turkai-ultra";
        }
    }

    if (
        request.classification.isCoding &&
        MODELS[
            "groq-gpt-oss-20b"
        ] &&
        ENV.GROQ_API_KEY
    ) {
        return "groq-gpt-oss-20b";
    }

    return (
        aiConfig.defaultModel ||
        "turkai-local"
    );
}

function resolveProviderForModel(
    modelName
) {
    const model =
        MODELS[
            modelName
        ];

    if (
        !model
    ) {
        return (
            aiConfig.defaultProvider ||
            "local"
        );
    }

    return (
        model.provider ||
        "local"
    );
}

function buildProviderOrder(
    request
) {
    const order = [];

    if (
        request.requestedProvider
    ) {
        order.push(
            request.requestedProvider
        );
    }

    const selectedModel =
        resolveModel(
            request
        );

    const selectedProvider =
        resolveProviderForModel(
            selectedModel
        );

    if (
        selectedProvider
    ) {
        order.push(
            selectedProvider
        );
    }

    /*
      Yerel motor daima son güvenli fallback.
    */

    const fallbackOrder = [
        "groq",
        "cerebras",
        "gemini",
        "openrouter",
        "local"
    ];

    for (
        const provider of fallbackOrder
    ) {
        if (
            !order.includes(
                provider
            )
        ) {
            order.push(
                provider
            );
        }
    }

    return [
        ...new Set(
            order
        )
    ];
}

/* ============================================================================
   SAFE TEXT EXTRACTION
============================================================================ */

function extractTextFromResult(
    result
) {
    if (
        result ===
        null ||
        result ===
        undefined
    ) {
        return "";
    }

    if (
        typeof result ===
        "string"
    ) {
        return cleanText(
            result,
            50000
        );
    }

    const candidates = [
        result.answer,
        result.response,
        result.text,
        result.content,
        result.message,
        result.output
    ];

    for (
        const candidate of candidates
    ) {
        if (
            typeof candidate ===
                "string" &&
            candidate.trim()
        ) {
            return cleanText(
                candidate,
                50000
            );
        }
    }

    if (
        Array.isArray(
            result.choices
        )
    ) {
        for (
            const choice of result.choices
        ) {
            const content =
                choice?.message?.content ??
                choice?.text ??
                "";

            if (
                typeof content ===
                    "string" &&
                content.trim()
            ) {
                return cleanText(
                    content,
                    50000
                );
            }
        }
    }

    return "";
}
