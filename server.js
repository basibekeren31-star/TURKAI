"use strict";

/* ============================================================================
   TÜRKAI MASTER SERVER
   CLEAN GATEWAY
   VERSION 21.0.0

   SERVER GÖREVLERİ:
   - Express
   - HTTP
   - Socket.IO
   - Security
   - Rate limit
   - Health
   - Module gateway
   - Chat gateway
   - Memory gateway
   - Research gateway
   - Weather gateway
   - Upload gateway
   - Plan gateway
   - Media gateway
   - Task gateway

   BU DOSYADA OLMAYANLAR:
   - AI provider cache
   - AI model mantığı
   - AI provider state
   - hazır yerel cevaplar
   - AI Engine iç kodları

   Yerel cevaplar:
   ./src/memory/localAnswerMemory.js

   AI:
   ./src/ai/aiEngine.js
============================================================================ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");

/* ============================================================================
   DOTENV
============================================================================ */

try {
    require("dotenv").config();
} catch (error) {
    console.warn(
        "[TürkAI] dotenv yüklenemedi."
    );
}

/* ============================================================================
   SOCKET.IO
============================================================================ */

let SocketServer = null;

try {
    const socketIO = require("socket.io");

    if (
        socketIO &&
        typeof socketIO.Server === "function"
    ) {
        SocketServer =
            socketIO.Server;
    }
} catch (error) {
    SocketServer = null;
}

/* ============================================================================
   CONFIG
============================================================================ */

const APP_NAME =
    "TürkAI";

const SERVER_VERSION =
    "21.0.0";

const HOST =
    "0.0.0.0";

const PORT =
    Number(
        process.env.PORT || 3000
    );

const NODE_ENV =
    String(
        process.env.NODE_ENV ||
        "development"
    ).toLowerCase();

const IS_PRODUCTION =
    NODE_ENV === "production";

const START_TIME =
    Date.now();

/* ============================================================================
   DIRECTORIES
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

const PLANS_DIR =
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

const DIRECTORIES = [
    DATA_DIR,
    MEMORY_DIR,
    USERS_DIR,
    CHATS_DIR,
    PLANS_DIR,
    AI_DIR,
    LOG_DIR,
    UPLOAD_DIR,
    TEMP_DIR
];

for (
    const directory of DIRECTORIES
) {
    try {
        fs.mkdirSync(
            directory,
            {
                recursive:
                    true
            }
        );
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Klasör oluşturulamadı:",
            directory,
            error.message
        );
    }
}

/* ============================================================================
   ENV VALUES
============================================================================ */

const TURKAI_API_KEY =
    String(
        process.env.TURKAI_API_KEY ||
        ""
    ).trim();

const TURKAI_ADMIN_KEY =
    String(
        process.env.TURKAI_ADMIN_KEY ||
        ""
    ).trim();

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
   HTTP
============================================================================ */

const httpServer =
    http.createServer(
        app
    );

/* ============================================================================
   SOCKET.IO
============================================================================ */

let io = null;

if (
    SocketServer
) {
    try {
        io =
            new SocketServer(
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
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Socket.IO başlatılamadı:",
            error.message
        );

        io = null;
    }
}

/* ============================================================================
   SERVER STATE
============================================================================ */

const serverState = {
    name:
        APP_NAME,

    version:
        SERVER_VERSION,

    status:
        "starting",

    environment:
        NODE_ENV,

    startedAt:
        new Date(
            START_TIME
        ).toISOString(),

    requests:
        0,

    successfulRequests:
        0,

    failedRequests:
        0,

    activeSockets:
        0,

    lastRequestAt:
        null,

    lastError:
        null
};

/* ============================================================================
   HELPERS
============================================================================ */

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
        return String(
            value
        );
    } catch (
        error
    ) {
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
            .randomBytes(6)
            .toString("hex")
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
    } catch (
        error
    ) {
        return value;
    }
}

function normalizeUserId(
    value
) {
    return (
        cleanString(
            value ||
                "anonymous",
            200
        ) ||
        "anonymous"
    );
}

/* ============================================================================
   JSON HELPERS
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

    const tempFile =
        file +
        ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        tempFile,
        file
    );
}

/* ============================================================================
   AUDIT LOG
============================================================================ */

const SERVER_LOG =
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

        event:
            cleanString(
                event,
                200
            ),

        timestamp:
            nowISO(),

        data:
            clone(
                data
            )
    };

    try {
        fs.appendFileSync(
            SERVER_LOG,
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

function debug(
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
   MODULAR LOADER
============================================================================ */

function loadModule(
    modulePath
) {
    try {
        return require(
            modulePath
        );
    } catch (
        error
    ) {
        console.warn(
            `[TürkAI] Optional module yüklenemedi: ${modulePath}`
        );

        if (
            !IS_PRODUCTION
        ) {
            console.warn(
                error.message
            );
        }

        return null;
    }
}

/* ============================================================================
   MODULES
============================================================================ */

const modules = {
    answerMemory:
        loadModule(
            "./src/memory/answerMemory"
        ),

    localAnswerMemory:
        loadModule(
            "./src/memory/localAnswerMemory"
        ),

    aiEngine:
        loadModule(
            "./src/ai/aiEngine"
        ),

    planManager:
        loadModule(
            "./src/plans/planManager"
        ),

    researchEngine:
        loadModule(
            "./src/research/researchEngine"
        ),

    weatherEngine:
        loadModule(
            "./src/weather/weatherEngine"
        ),

    uploadEngine:
        loadModule(
            "./src/uploads/uploadEngine"
        ),

    mediaEngine:
        loadModule(
            "./src/media/mediaEngine"
        ),

    taskEngine:
        loadModule(
            "./src/tasks/taskEngine"
        )
};

/* ============================================================================
   MODULE STATUS
============================================================================ */

function getModuleStatus() {
    return {
        memory:
            Boolean(
                modules.answerMemory
            ),

        localAnswers:
            Boolean(
                modules.localAnswerMemory
            ),

        ai:
            Boolean(
                modules.aiEngine
            ),

        plans:
            Boolean(
                modules.planManager
            ),

        research:
            Boolean(
                modules.researchEngine
            ),

        weather:
            Boolean(
                modules.weatherEngine
            ),

        uploads:
            Boolean(
                modules.uploadEngine
            ),

        media:
            Boolean(
                modules.mediaEngine
            ),

        tasks:
            Boolean(
                modules.taskEngine
            ),

        socketIO:
            Boolean(
                io
            )
    };
}

/* ============================================================================
   MIDDLEWARE
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
            "camera=(self), microphone=(self), geolocation=(self)"
        );

        next();
    }
);

/* ============================================================================
   REQUEST TRACKING
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

        res.once(
            "finish",
            () => {
                const duration =
                    Date.now() -
                    started;

                const success =
                    res.statusCode >=
                        200 &&
                    res.statusCode <
                        400;

                if (
                    success
                ) {
                    serverState.successfulRequests++;
                } else {
                    serverState.failedRequests++;
                }

                audit(
                    "http_request",
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
   RATE LIMIT
============================================================================ */

const rateStore =
    new Map();

const RATE_WINDOW =
    60 * 1000;

const RATE_MAX =
    120;

function getClientIP(
    req
) {
    return safeString(
        req.headers[
            "x-forwarded-for"
        ] ||
            req.ip ||
            req.socket?.remoteAddress ||
            "unknown"
    )
        .split(",")[0]
        .trim();
}

function rateLimit(
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

    if (
        record.count >
        RATE_MAX
    ) {
        return res
            .status(429)
            .json({
                success:
                    false,

                error:
                    "Çok fazla istek gönderildi.",

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
   OPTIONAL API AUTH
============================================================================ */

function requireAPIKey(
    req,
    res,
    next
) {
    /*
      API key .env'de yoksa temel kullanım açık kalır.
    */

    if (
        !TURKAI_API_KEY
    ) {
        return next();
    }

    const authorization =
        safeString(
            req.headers.authorization
        ).replace(
            /^Bearer\s+/i,
            ""
        )
        .trim();

    const headerKey =
        cleanString(
            req.headers[
                "x-turkai-key"
            ] ||
            req.headers[
                "x-api-key"
            ] ||
            authorization ||
            "",
            1000
        );

    if (
        headerKey ===
            TURKAI_API_KEY ||
        (
            TURKAI_ADMIN_KEY &&
            headerKey ===
                TURKAI_ADMIN_KEY
        )
    ) {
        return next();
    }

    return res
        .status(401)
        .json({
            success:
                false,

            error:
                "Yetkisiz API isteği.",

            code:
                "UNAUTHORIZED"
        });
}

/* ============================================================================
   RESPONSE HELPERS
============================================================================ */

function success(
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

function failure(
    res,
    status,
    message,
    code = "SERVER_ERROR"
) {
    return res
        .status(
            status
        )
        .json({
            success:
                false,

            error:
                cleanString(
                    message,
                    2000
                ),

            code,

            timestamp:
                nowISO()
        });
}

/* ============================================================================
   LOCAL ANSWER MODULE BRIDGE
============================================================================ */

/*
  DİKKAT:

  Burada hazır cevap YOK.

  Örneğin "slm" cevabı:
  src/memory/localAnswerMemory.js

  tarafından bulunur.
*/

function findLocalAnswer(
    message
) {
    const localMemory =
        modules.localAnswerMemory;

    if (
        !localMemory
    ) {
        return null;
    }

    try {
        if (
            typeof localMemory.getAnswer ===
                "function"
        ) {
            const answer =
                localMemory.getAnswer(
                    message
                );

            return (
                cleanString(
                    answer,
                    50000
                ) ||
                null
            );
        }

        if (
            typeof localMemory.find ===
                "function"
        ) {
            const result =
                localMemory.find(
                    message
                );

            return (
                cleanString(
                    result?.answer ??
                    result?.response ??
                    result?.text ??
                    "",
                    50000
                ) ||
                null
            );
        }
    } catch (
        error
    ) {
        debug(
            "Local answer error:",
            error.message
        );
    }

    return null;
}

/* ============================================================================
   CHAT
============================================================================ */

app.post(
    "/api/chat",
    async (
        req,
        res
    ) => {
        const started =
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

            if (
                !message
            ) {
                return failure(
                    res,
                    400,
                    "Mesaj boş olamaz.",
                    "EMPTY_MESSAGE"
                );
            }

            const userId =
                normalizeUserId(
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
                                          item?.role ??
                                          "user",
                                          30
                                      ),

                                  content:
                                      cleanString(
                                          item?.content ??
                                          item?.text ??
                                          "",
                                          10000
                                      )
                              })
                          )
                          .filter(
                              (
                                  item
                              ) =>
                                  item.content
                          )
                    : [];

            const request =
                {
                    ...body,

                    message,

                    prompt:
                        message,

                    userId,

                    conversationId,

                    history,

                    plan:
                        cleanString(
                            body.plan ??
                            "free",
                            50
                        ).toLowerCase(),

                    model:
                        cleanString(
                            body.model ??
                            "",
                            200
                        ),

                    language:
                        cleanString(
                            body.language ??
                            "tr",
                            30
                        )
                };

            audit(
                "chat",
                {
                    userId,

                    conversationId
                }
            );

            /* ------------------------------------------------------------
               USER CONVERSATION MEMORY
            ------------------------------------------------------------ */

            try {
                if (
                    modules.answerMemory &&
                    typeof modules.answerMemory.addConversationMessage ===
                        "function"
                ) {
                    await modules.answerMemory.addConversationMessage(
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
                debug(
                    "User memory:",
                    error.message
                );
            }

            /* ------------------------------------------------------------
               AI ENGINE
            ------------------------------------------------------------ */

            if (
                modules.aiEngine
            ) {
                try {
                    let result =
                        null;

                    if (
                        typeof modules.aiEngine.chat ===
                            "function"
                    ) {
                        result =
                            await modules.aiEngine.chat(
                                request
                            );
                    } else if (
                        typeof modules.aiEngine.generate ===
                            "function"
                    ) {
                        result =
                            await modules.aiEngine.generate(
                                request
                            );
                    } else if (
                        typeof modules.aiEngine.ask ===
                            "function"
                    ) {
                        result =
                            await modules.aiEngine.ask(
                                message,
                                request
                            );
                    }

                    const answer =
                        cleanString(
                            typeof result ===
                                "string"
                                ? result
                                : result?.answer ??
                                      result?.response ??
                                      result?.text ??
                                      "",
                            50000
                        );

                    if (
                        answer
                    ) {
                        try {
                            if (
                                modules.answerMemory &&
                                typeof modules.answerMemory.addConversationMessage ===
                                    "function"
                            ) {
                                await modules.answerMemory.addConversationMessage(
                                    {
                                        userId,

                                        conversationId,

                                        role:
                                            "assistant",

                                        content:
                                            answer,

                                        metadata:
                                            result &&
                                            typeof result ===
                                                "object"
                                                ? result.metadata ||
                                                  {}
                                                : {}
                                    }
                                );
                            }
                        } catch {}

                        return success(
                            res,
                            {
                                answer,

                                response:
                                    answer,

                                source:
                                    result?.source ||
                                    "ai",

                                provider:
                                    result?.provider ||
                                    null,

                                model:
                                    result?.model ||
                                    request.model ||
                                    null,

                                conversationId,

                                duration:
                                    Date.now() -
                                    started
                            }
                        );
                    }
                } catch (
                    error
                ) {
                    serverState.lastError =
                        error.message;

                    audit(
                        "ai_error",
                        {
                            userId,

                            conversationId,

                            error:
                                error.message
                        }
                    );

                    debug(
                        "AI Engine:",
                        error.message
                    );
                }
            }

            /* ------------------------------------------------------------
               LOCAL ANSWER MEMORY
            ------------------------------------------------------------ */

            const localAnswer =
                findLocalAnswer(
                    message
                );

            if (
                localAnswer
            ) {
                try {
                    if (
                        modules.answerMemory &&
                        typeof modules.answerMemory.addConversationMessage ===
                            "function"
                    ) {
                        await modules.answerMemory.addConversationMessage(
                            {
                                userId,

                                conversationId,

                                role:
                                    "assistant",

                                content:
                                    localAnswer,

                                metadata: {
                                    source:
                                        "local-answer-memory"
                                }
                            }
                        );
                    }
                } catch {}

                return success(
                    res,
                    {
                        answer:
                            localAnswer,

                        response:
                            localAnswer,

                        source:
                            "local-answer-memory",

                        provider:
                            "local",

                        model:
                            "turkai-local",

                        conversationId,

                        duration:
                            Date.now() -
                            started
                    }
                );
            }

            /* ------------------------------------------------------------
               KNOWLEDGE MEMORY
            ------------------------------------------------------------ */

            if (
                modules.answerMemory
            ) {
                try {
                    let result =
                        null;

                    if (
                        typeof modules.answerMemory.getBestAnswer ===
                            "function"
                    ) {
                        result =
                            await modules.answerMemory.getBestAnswer(
                                {
                                    question:
                                        message,

                                    userId,

                                    language:
                                        request.language
                                }
                            );
                    } else if (
                        typeof modules.answerMemory.findSmartAnswer ===
                            "function"
                    ) {
                        result =
                            await modules.answerMemory.findSmartAnswer(
                                message
                            );
                    } else if (
                        typeof modules.answerMemory.findAnswer ===
                            "function"
                    ) {
                        result =
                            await modules.answerMemory.findAnswer(
                                message
                            );
                    }

                    const answer =
                        cleanString(
                            result?.answer ??
                            result?.response ??
                            result?.text ??
                            "",
                            50000
                        );

                    if (
                        answer
                    ) {
                        return success(
                            res,
                            {
                                answer,

                                response:
                                    answer,

                                source:
                                    "memory",

                                provider:
                                    "memory",

                                model:
                                    "turkai-memory",

                                conversationId,

                                duration:
                                    Date.now() -
                                    started
                            }
                        );
                    }
                } catch (
                    error
                ) {
                    debug(
                        "Knowledge memory:",
                        error.message
                    );
                }
            }

            /* ------------------------------------------------------------
               GENERIC FALLBACK
               Burada hiçbir özel hazır cevap bulunmaz.
            ------------------------------------------------------------ */

            const fallback =
                request.language
                    .toLowerCase()
                    .startsWith(
                        "tr"
                    )
                    ? "Bu soru için yerel cevap bulunamadı. TürkAI AI motoru ve araştırma modülleri hazır olduğunda daha kapsamlı cevap üretilebilir."
                    : "No local answer was found for this request.";

            return success(
                res,
                {
                    answer:
                        fallback,

                    response:
                        fallback,

                    source:
                        "local-fallback",

                    provider:
                        "local",

                    model:
                        "turkai-local",

                    conversationId,

                    duration:
                        Date.now() -
                        started
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
                        error.message
                }
            );

            return failure(
                res,
                500,
                "Chat işlemi başarısız oldu.",
                "CHAT_ERROR"
            );
        }
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
        return success(
            res,
            {
                status:
                    "ok",

                server:
                    "online",

                name:
                    APP_NAME,

                version:
                    SERVER_VERSION,

                uptime:
                    process.uptime()
            }
        );
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
        return success(
            res,
            {
                status:
                    serverState.status,

                version:
                    SERVER_VERSION,

                environment:
                    NODE_ENV,

                modules:
                    getModuleStatus(),

                server:
                    clone(
                        serverState
                    )
            }
        );
    }
);
/* ============================================================================
   MASTER
============================================================================ */

app.get(
    "/api/master",
    (req, res) => {
        return success(
            res,
            {
                name:
                    APP_NAME,

                version:
                    SERVER_VERSION,

                status:
                    serverState.status,

                capabilities: {
                    chat:
                        true,

                    memory:
                        Boolean(
                            modules.answerMemory
                        ),

                    localAnswers:
                        Boolean(
                            modules.localAnswerMemory
                        ),

                    ai:
                        Boolean(
                            modules.aiEngine
                        ),

                    research:
                        Boolean(
                            modules.researchEngine
                        ),

                    weather:
                        Boolean(
                            modules.weatherEngine
                        ),

                    uploads:
                        Boolean(
                            modules.uploadEngine
                        ),

                    media:
                        Boolean(
                            modules.mediaEngine
                        ),

                    tasks:
                        Boolean(
                            modules.taskEngine
                        ),

                    socket:
                        Boolean(
                            io
                        )
                }
            }
        );
    }
);

/* ============================================================================
   MEMORY STATUS
============================================================================ */

app.get(
    "/api/memory/status",
    (req, res) => {
        try {
            let memory = null;

            if (
                modules.answerMemory
            ) {
                if (
                    typeof modules.answerMemory.getMemoryStatus ===
                    "function"
                ) {
                    memory =
                        modules.answerMemory.getMemoryStatus();
                } else if (
                    typeof modules.answerMemory.getMemoryHealth ===
                    "function"
                ) {
                    memory =
                        modules.answerMemory.getMemoryHealth();
                } else if (
                    typeof modules.answerMemory.stats ===
                    "function"
                ) {
                    memory =
                        modules.answerMemory.stats();
                }
            }

            let local = null;

            if (
                modules.localAnswerMemory &&
                typeof modules.localAnswerMemory.health ===
                "function"
            ) {
                local =
                    modules.localAnswerMemory.health();
            }

            return success(
                res,
                {
                    memory,
                    localAnswers:
                        local
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "MEMORY_STATUS_ERROR"
            );
        }
    }
);

/* ============================================================================
   LOCAL ANSWERS
============================================================================ */

app.get(
    "/api/local-answers",
    (req, res) => {
        try {
            if (
                !modules.localAnswerMemory
            ) {
                return success(
                    res,
                    {
                        available:
                            false,

                        answers:
                            []
                    }
                );
            }

            if (
                typeof modules.localAnswerMemory.listAnswers ===
                "function"
            ) {
                return success(
                    res,
                    {
                        available:
                            true,

                        answers:
                            modules.localAnswerMemory.listAnswers()
                    }
                );
            }

            return success(
                res,
                {
                    available:
                        true,

                    answers:
                        []
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "LOCAL_ANSWERS_ERROR"
            );
        }
    }
);

/* ============================================================================
   LOCAL ANSWER RELOAD
============================================================================ */

app.post(
    "/api/local-answers/reload",
    requireAPIKey,
    (req, res) => {
        try {
            if (
                !modules.localAnswerMemory
            ) {
                return failure(
                    res,
                    503,
                    "Local answer memory bağlı değil.",
                    "LOCAL_MEMORY_UNAVAILABLE"
                );
            }

            let count = null;

            if (
                typeof modules.localAnswerMemory.reload ===
                "function"
            ) {
                count =
                    modules.localAnswerMemory.reload();
            }

            return success(
                res,
                {
                    reloaded:
                        true,

                    count
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "LOCAL_RELOAD_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEMORY SEARCH
============================================================================ */

app.post(
    "/api/memory/search",
    async (req, res) => {
        try {
            const body =
                req.body || {};

            const query =
                cleanString(
                    body.query ??
                    body.question ??
                    body.message ??
                    "",
                    20000
                );

            if (
                !query
            ) {
                return failure(
                    res,
                    400,
                    "Arama sorgusu gerekli.",
                    "EMPTY_QUERY"
                );
            }

            if (
                !modules.answerMemory
            ) {
                return success(
                    res,
                    {
                        results:
                            []
                    }
                );
            }

            let result = null;

            if (
                typeof modules.answerMemory.searchMemory ===
                "function"
            ) {
                result =
                    await modules.answerMemory.searchMemory(
                        query,
                        body
                    );
            } else if (
                typeof modules.answerMemory.findSimilarAnswers ===
                "function"
            ) {
                result =
                    await modules.answerMemory.findSimilarAnswers(
                        query
                    );
            } else if (
                typeof modules.answerMemory.findSmartAnswer ===
                "function"
            ) {
                result =
                    await modules.answerMemory.findSmartAnswer(
                        query
                    );
            } else if (
                typeof modules.answerMemory.findAnswer ===
                "function"
            ) {
                const found =
                    await modules.answerMemory.findAnswer(
                        query
                    );

                result =
                    found
                        ? [found]
                        : [];
            }

            return success(
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
        } catch (error) {
            return failure(
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
    async (req, res) => {
        try {
            const body =
                req.body || {};

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
                return failure(
                    res,
                    400,
                    "Araştırma sorgusu gerekli.",
                    "EMPTY_RESEARCH_QUERY"
                );
            }

            if (
                !modules.researchEngine
            ) {
                return success(
                    res,
                    {
                        available:
                            false,

                        query,

                        results:
                            []
                    }
                );
            }

            let result = null;

            if (
                typeof modules.researchEngine.research ===
                "function"
            ) {
                result =
                    await modules.researchEngine.research(
                        query,
                        body
                    );
            } else if (
                typeof modules.researchEngine.search ===
                "function"
            ) {
                result =
                    await modules.researchEngine.search(
                        query,
                        body
                    );
            } else if (
                typeof modules.researchEngine.run ===
                "function"
            ) {
                result =
                    await modules.researchEngine.run(
                        query,
                        body
                    );
            }

            return success(
                res,
                {
                    available:
                        true,

                    query,

                    result
                }
            );
        } catch (error) {
            return failure(
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
    async (req, res) => {
        try {
            const city =
                cleanString(
                    req.query.city ??
                    req.query.location ??
                    "",
                    200
                );

            if (
                !modules.weatherEngine
            ) {
                return success(
                    res,
                    {
                        available:
                            false,

                        city:
                            city || null,

                        weather:
                            null
                    }
                );
            }

            let weather = null;

            if (
                typeof modules.weatherEngine.getWeather ===
                "function"
            ) {
                weather =
                    await modules.weatherEngine.getWeather(
                        city
                    );
            } else if (
                typeof modules.weatherEngine.weather ===
                "function"
            ) {
                weather =
                    await modules.weatherEngine.weather(
                        city
                    );
            } else if (
                typeof modules.weatherEngine.get ===
                "function"
            ) {
                weather =
                    await modules.weatherEngine.get(
                        city
                    );
            }

            return success(
                res,
                {
                    available:
                        true,

                    city:
                        city || null,

                    weather
                }
            );
        } catch (error) {
            return failure(
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
    async (req, res) => {
        try {
            if (
                !modules.uploadEngine
            ) {
                return failure(
                    res,
                    503,
                    "Upload engine bağlı değil.",
                    "UPLOAD_UNAVAILABLE"
                );
            }

            if (
                typeof modules.uploadEngine.handleUpload ===
                "function"
            ) {
                const result =
                    await modules.uploadEngine.handleUpload(
                        req,
                        res
                    );

                if (
                    !res.headersSent
                ) {
                    return success(
                        res,
                        {
                            result
                        }
                    );
                }

                return;
            }

            if (
                typeof modules.uploadEngine.upload ===
                "function"
            ) {
                const result =
                    await modules.uploadEngine.upload(
                        req,
                        req.body || {}
                    );

                return success(
                    res,
                    {
                        result
                    }
                );
            }

            if (
                typeof modules.uploadEngine.processUpload ===
                "function"
            ) {
                const result =
                    await modules.uploadEngine.processUpload(
                        req,
                        req.body || {}
                    );

                return success(
                    res,
                    {
                        result
                    }
                );
            }

            return failure(
                res,
                503,
                "Upload fonksiyonu bulunamadı.",
                "UPLOAD_FUNCTION_MISSING"
            );
        } catch (error) {
            return failure(
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
    (req, res) => {
        try {
            if (
                modules.planManager
            ) {
                if (
                    typeof modules.planManager.listPlans ===
                    "function"
                ) {
                    return success(
                        res,
                        {
                            plans:
                                modules.planManager.listPlans()
                        }
                    );
                }

                if (
                    typeof modules.planManager.getPlans ===
                    "function"
                ) {
                    return success(
                        res,
                        {
                            plans:
                                modules.planManager.getPlans()
                        }
                    );
                }

                if (
                    typeof modules.planManager.list ===
                    "function"
                ) {
                    return success(
                        res,
                        {
                            plans:
                                modules.planManager.list()
                        }
                    );
                }
            }

            return success(
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
                        },

                        {
                            id:
                                "developer",

                            name:
                                "TürkAI Developer",

                            price:
                                0,

                            currency:
                                "TRY",

                            status:
                                "internal"
                        }
                    ]
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "PLANS_ERROR"
            );
        }
    }
);

/* ============================================================================
   USER PLAN
============================================================================ */

app.get(
    "/api/plans/user/:userId",
    (req, res) => {
        try {
            const userId =
                normalizeUserId(
                    req.params.userId
                );

            if (
                modules.planManager
            ) {
                if (
                    typeof modules.planManager.getUserPlan ===
                    "function"
                ) {
                    return success(
                        res,
                        {
                            userId,

                            plan:
                                modules.planManager.getUserPlan(
                                    userId
                                )
                        }
                    );
                }

                if (
                    typeof modules.planManager.getPlanForUser ===
                    "function"
                ) {
                    return success(
                        res,
                        {
                            userId,

                            plan:
                                modules.planManager.getPlanForUser(
                                    userId
                                )
                        }
                    );
                }
            }

            return success(
                res,
                {
                    userId,

                    plan:
                        "free"
                }
            );
        } catch (error) {
            return failure(
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
    async (req, res) => {
        try {
            const body =
                req.body || {};

            const userId =
                normalizeUserId(
                    body.userId
                );

            const code =
                cleanString(
                    body.code ??
                    body.proCode ??
                    "",
                    500
                );

            if (
                !code
            ) {
                return failure(
                    res,
                    400,
                    "Pro kodu gerekli.",
                    "PRO_CODE_REQUIRED"
                );
            }

            if (
                modules.planManager &&
                typeof modules.planManager.activatePro ===
                "function"
            ) {
                const result =
                    await Promise.resolve(
                        modules.planManager.activatePro(
                            userId,
                            code
                        )
                    );

                return success(
                    res,
                    {
                        userId,

                        result
                    }
                );
            }

            if (
                TURKAI_PRO_CODE &&
                code ===
                    TURKAI_PRO_CODE
            ) {
                return success(
                    res,
                    {
                        activated:
                            true,

                        userId,

                        plan:
                            "pro"
                    }
                );
            }

            return failure(
                res,
                403,
                "Geçersiz Pro kodu.",
                "INVALID_PRO_CODE"
            );
        } catch (error) {
            return failure(
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
    (req, res) => {
        const body =
            req.body || {};

        const transactionId =
            createId(
                "payment"
            );

        audit(
            "test_payment",
            {
                userId:
                    normalizeUserId(
                        body.userId
                    ),

                plan:
                    body.plan ||
                    "pro",

                transactionId
            }
        );

        return success(
            res,
            {
                payment: {
                    status:
                        "test",

                    successful:
                        true,

                    transactionId,

                    userId:
                        normalizeUserId(
                            body.userId
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
   IMAGE
============================================================================ */

app.post(
    "/api/media/image",
    async (req, res) => {
        try {
            if (
                !modules.mediaEngine
            ) {
                return failure(
                    res,
                    503,
                    "Media engine bağlı değil.",
                    "MEDIA_UNAVAILABLE"
                );
            }

            let result = null;

            if (
                typeof modules.mediaEngine.generateImage ===
                "function"
            ) {
                result =
                    await modules.mediaEngine.generateImage(
                        req.body || {}
                    );
            } else if (
                typeof modules.mediaEngine.image ===
                "function"
            ) {
                result =
                    await modules.mediaEngine.image(
                        req.body || {}
                    );
            } else {
                return failure(
                    res,
                    503,
                    "Image fonksiyonu bulunamadı.",
                    "IMAGE_FUNCTION_MISSING"
                );
            }

            return success(
                res,
                {
                    result
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "IMAGE_ERROR"
            );
        }
    }
);

/* ============================================================================
   VIDEO
============================================================================ */

app.post(
    "/api/media/video",
    async (req, res) => {
        try {
            if (
                !modules.mediaEngine
            ) {
                return failure(
                    res,
                    503,
                    "Media engine bağlı değil.",
                    "MEDIA_UNAVAILABLE"
                );
            }

            let result = null;

            if (
                typeof modules.mediaEngine.generateVideo ===
                "function"
            ) {
                result =
                    await modules.mediaEngine.generateVideo(
                        req.body || {}
                    );
            } else if (
                typeof modules.mediaEngine.video ===
                "function"
            ) {
                result =
                    await modules.mediaEngine.video(
                        req.body || {}
                    );
            } else {
                return failure(
                    res,
                    503,
                    "Video fonksiyonu bulunamadı.",
                    "VIDEO_FUNCTION_MISSING"
                );
            }

            return success(
                res,
                {
                    result
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "VIDEO_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA JOB
============================================================================ */

app.get(
    "/api/media/jobs/:jobId",
    async (req, res) => {
        try {
            const jobId =
                cleanString(
                    req.params.jobId,
                    300
                );

            if (
                modules.mediaEngine &&
                typeof modules.mediaEngine.getJob ===
                "function"
            ) {
                const job =
                    await modules.mediaEngine.getJob(
                        jobId
                    );

                return success(
                    res,
                    {
                        jobId,

                        job
                    }
                );
            }

            return success(
                res,
                {
                    jobId,

                    status:
                        "unknown",

                    available:
                        false
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "MEDIA_JOB_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA HISTORY
============================================================================ */

app.get(
    "/api/media/history",
    async (req, res) => {
        try {
            const userId =
                normalizeUserId(
                    req.query.userId
                );

            if (
                modules.mediaEngine &&
                typeof modules.mediaEngine.getHistory ===
                "function"
            ) {
                const history =
                    await modules.mediaEngine.getHistory(
                        userId
                    );

                return success(
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

            return success(
                res,
                {
                    history:
                        []
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "MEDIA_HISTORY_ERROR"
            );
        }
    }
);

/* ============================================================================
   MEDIA HEALTH
============================================================================ */

app.get(
    "/api/media/health",
    (req, res) => {
        const media =
            modules.mediaEngine;

        return success(
            res,
            {
                available:
                    Boolean(
                        media
                    ),

                image:
                    Boolean(
                        media &&
                        (
                            typeof media.generateImage ===
                            "function" ||

                            typeof media.image ===
                            "function"
                        )
                    ),

                video:
                    Boolean(
                        media &&
                        (
                            typeof media.generateVideo ===
                            "function" ||

                            typeof media.video ===
                            "function"
                        )
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
    async (req, res) => {
        try {
            if (
                !modules.taskEngine
            ) {
                return failure(
                    res,
                    503,
                    "Task engine bağlı değil.",
                    "TASK_UNAVAILABLE"
                );
            }

            let task = null;

            if (
                typeof modules.taskEngine.createTask ===
                "function"
            ) {
                task =
                    await modules.taskEngine.createTask(
                        req.body || {}
                    );
            } else if (
                typeof modules.taskEngine.addTask ===
                "function"
            ) {
                task =
                    await modules.taskEngine.addTask(
                        req.body || {}
                    );
            } else if (
                typeof modules.taskEngine.enqueue ===
                "function"
            ) {
                task =
                    await modules.taskEngine.enqueue(
                        req.body || {}
                    );
            } else {
                return failure(
                    res,
                    503,
                    "Task fonksiyonu bulunamadı.",
                    "TASK_FUNCTION_MISSING"
                );
            }

            return success(
                res,
                {
                    task
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "TASK_ERROR"
            );
        }
    }
);

/* ============================================================================
   TASK HEALTH
============================================================================ */

app.get(
    "/api/tasks/health",
    (req, res) => {
        return success(
            res,
            {
                available:
                    Boolean(
                        modules.taskEngine
                    )
            }
        );
    }
);

/* ============================================================================
   SECURITY
============================================================================ */

app.get(
    "/api/security",
    (req, res) => {
        return success(
            res,
            {
                security: {
                    headers:
                        true,

                    rateLimit:
                        true,

                    auditLog:
                        true,

                    apiKey:
                        Boolean(
                            TURKAI_API_KEY
                        )
                }
            }
        );
    }
);

/* ============================================================================
   AI STATUS
============================================================================ */

app.get(
    "/api/ai/status",
    requireAPIKey,
    (req, res) => {
        try {
            if (
                !modules.aiEngine
            ) {
                return success(
                    res,
                    {
                        available:
                            false,

                        status:
                            null
                    }
                );
            }

            let status =
                null;

            if (
                typeof modules.aiEngine.status ===
                "function"
            ) {
                status =
                    modules.aiEngine.status();
            } else if (
                typeof modules.aiEngine.health ===
                "function"
            ) {
                status =
                    modules.aiEngine.health();
            }

            return success(
                res,
                {
                    available:
                        true,

                    status
                }
            );
        } catch (error) {
            return failure(
                res,
                500,
                error.message,
                "AI_STATUS_ERROR"
            );
        }
    }
);

/* ============================================================================
   DIAGNOSTICS
============================================================================ */

function diagnostics() {
    return {
        name:
            APP_NAME,

        version:
            SERVER_VERSION,

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
            START_TIME,

        memory:
            process.memoryUsage(),

        server:
            clone(
                serverState
            ),

        modules:
            getModuleStatus(),

        timestamp:
            nowISO()
    };
}

app.get(
    "/api/diagnostics",
    requireAPIKey,
    (req, res) => {
        return success(
            res,
            {
                diagnostics:
                    diagnostics()
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
        (socket) => {
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
                        APP_NAME,

                    version:
                        SERVER_VERSION,

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
                            normalizeUserId(
                                payload.userId
                            );

                        const conversationId =
                            cleanString(
                                payload.conversationId ??
                                payload.chatId ??
                                socket.id,
                                200
                            );

                        /*
                          AI engine varsa önce onu kullan.
                        */

                        if (
                            modules.aiEngine &&
                            typeof modules.aiEngine.chat ===
                            "function"
                        ) {
                            try {
                                const result =
                                    await modules.aiEngine.chat(
                                        {
                                            ...payload,

                                            message,

                                            prompt:
                                                message,

                                            userId,

                                            conversationId
                                        }
                                    );

                                const answer =
                                    cleanString(
                                        typeof result ===
                                        "string"
                                            ? result
                                            : result?.answer ??
                                              result?.response ??
                                              result?.text ??
                                              "",
                                        50000
                                    );

                                if (
                                    answer
                                ) {
                                    socket.emit(
                                        "chat:response",
                                        {
                                            success:
                                                true,

                                            result:
                                                {
                                                    ...(result &&
                                                    typeof result ===
                                                    "object"
                                                        ? result
                                                        : {}),

                                                    answer
                                                }
                                        }
                                    );

                                    return;
                                }
                            } catch (
                                error
                            ) {
                                debug(
                                    "Socket AI:",
                                    error.message
                                );
                            }
                        }

                        /*
                          AI yoksa yerel cevap modülü.
                          Hazır cevaplar server'da bulunmaz.
                        */

                        const localAnswer =
                            findLocalAnswer(
                                message
                            );

                        if (
                            localAnswer
                        ) {
                            socket.emit(
                                "chat:response",
                                {
                                    success:
                                        true,

                                    result: {
                                        answer:
                                            localAnswer,

                                        source:
                                            "local-answer-memory",

                                        provider:
                                            "local",

                                        model:
                                            "turkai-local"
                                    }
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
                                        "Bu soru için yerel cevap bulunamadı.",

                                    source:
                                        "local-fallback",

                                    provider:
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
                                    error.message,

                                code:
                                    "SOCKET_CHAT_ERROR"
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
                                    success:
                                        false,

                                    error:
                                        "Sorgu gerekli."
                                }
                            );
                        }

                        if (
                            !modules.answerMemory
                        ) {
                            return socket.emit(
                                "memory:response",
                                {
                                    success:
                                        true,

                                    result:
                                        null
                                }
                            );
                        }

                        let result =
                            null;

                        if (
                            typeof modules.answerMemory.searchMemory ===
                            "function"
                        ) {
                            result =
                                await modules.answerMemory.searchMemory(
                                    query,
                                    payload
                                );
                        } else if (
                            typeof modules.answerMemory.findSmartAnswer ===
                            "function"
                        ) {
                            result =
                                await modules.answerMemory.findSmartAnswer(
                                    query
                                );
                        } else if (
                            typeof modules.answerMemory.findAnswer ===
                            "function"
                        ) {
                            result =
                                await modules.answerMemory.findAnswer(
                                    query
                                );
                        }

                        socket.emit(
                            "memory:response",
                            {
                                success:
                                    true,

                                result
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
   API 404
============================================================================ */

app.use(
    "/api",
    (req, res) => {
        return failure(
            res,
            404,
            "API endpoint bulunamadı.",
            "ENDPOINT_NOT_FOUND"
        );
    }
);

/* ============================================================================
   FRONTEND
============================================================================ */

app.get(
    "/",
    (req, res, next) => {
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
   FRONTEND FILES
============================================================================ */

app.get(
    "/app.js",
    (req, res, next) => {
        const file =
            path.join(
                ROOT_DIR,
                "app.js"
            );

        if (
            fs.existsSync(
                file
            )
        ) {
            return res.sendFile(
                file
            );
        }

        return next();
    }
);

app.get(
    "/style.css",
    (req, res, next) => {
        const file =
            path.join(
                ROOT_DIR,
                "style.css"
            );

        if (
            fs.existsSync(
                file
            )
        ) {
            return res.sendFile(
                file
            );
        }

        return next();
    }
);

/* ============================================================================
   GENERAL 404
============================================================================ */

app.use(
    (req, res) => {
        return failure(
            res,
            404,
            "Sayfa bulunamadı.",
            "NOT_FOUND"
        );
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
            "[TürkAI] GLOBAL ERROR:",
            error
        );

        serverState.lastError =
            error.message;

        audit(
            "global_error",
            {
                error:
                    error.message,

                method:
                    req.method,

                path:
                    req.originalUrl
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
   CLEANUP TIMER
============================================================================ */

const CLEANUP_TIMER =
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
            } catch (
                error
            ) {
                serverState.lastError =
                    error.message;
            }
        },
        60 * 1000
    );

CLEANUP_TIMER.unref?.();

/* ============================================================================
   START SERVER
============================================================================ */

let serverStarted =
    false;

function startServer() {
    if (
        serverStarted
    ) {
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

                    version:
                        SERVER_VERSION
                }
            );

            console.log("");
            console.log(
                "============================================================"
            );
            console.log(
                "                 TÜRKAI MASTER SERVER"
            );
            console.log(
                "============================================================"
            );
            console.log(
                `Sürüm        : ${SERVER_VERSION}`
            );
            console.log(
                `Durum        : ${serverState.status}`
            );
            console.log(
                `Port         : ${PORT}`
            );
            console.log(
                `Environment  : ${NODE_ENV}`
            );
            console.log(
                `Node         : ${process.version}`
            );
            console.log(
                "Security     : AKTİF"
            );
            console.log(
                "Rate Limit   : AKTİF"
            );
            console.log(
                "Socket.IO    : " +
                    (
                        io
                            ? "AKTİF"
                            : "KAPALI"
                    )
            );
            console.log(
                "============================================================"
            );

            console.log(
                "[TürkAI] MODULE STATUS"
            );

            console.log(
                JSON.stringify(
                    getModuleStatus(),
                    null,
                    2
                )
            );

            console.log(
                "============================================================"
            );

            console.log(
                `Local URL    : http://localhost:${PORT}`
            );

            console.log(
                "============================================================"
            );

            console.log(
                "TÜRKAI SERVER HAZIR"
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

            console.error(
                "[TürkAI] HTTP ERROR:",
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
        `[TürkAI] ${signal} alındı. Kapanış başlıyor...`
    );

    audit(
        "server_shutdown",
        {
            signal
        }
    );

    try {
        clearInterval(
            CLEANUP_TIMER
        );
    } catch {}

    try {
        if (
            modules.answerMemory &&
            typeof modules.answerMemory.forceSave ===
            "function"
        ) {
            await modules.answerMemory.forceSave();
        } else if (
            modules.answerMemory &&
            typeof modules.answerMemory.saveAll ===
            "function"
        ) {
            await modules.answerMemory.saveAll();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Memory save error:",
            error.message
        );
    }

    try {
        if (
            modules.taskEngine &&
            typeof modules.taskEngine.stop ===
            "function"
        ) {
            await modules.taskEngine.stop();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Task shutdown:",
            error.message
        );
    }

    try {
        if (
            modules.mediaEngine &&
            typeof modules.mediaEngine.stop ===
            "function"
        ) {
            await modules.mediaEngine.stop();
        }
    } catch (
        error
    ) {
        console.error(
            "[TürkAI] Media shutdown:",
            error.message
        );
    }

    try {
        if (
            io
        ) {
            io.close();
        }
    } catch {}

    try {
        httpServer.close(
            () => {
                serverState.status =
                    "stopped";

                console.log(
                    "[TürkAI] Server kapandı."
                );

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
                error:
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
   EXPORTS
============================================================================ */

module.exports = {
    app,

    httpServer,

    io,

    startServer,

    shutdown,

    diagnostics,

    audit,

    serverState,

    modules,

    getModuleStatus,

    APP_NAME,

    SERVER_VERSION,

    ROOT_DIR,

    DATA_DIR
};

/* ============================================================================
   DIRECT START
============================================================================ */

if (
    require.main ===
    module
) {
    startServer();
}