"use strict";

/* ============================================================================
   TÜRKAI MASTER SERVER
   CLEAN BUILD
   Version: 21.0.0

   IMPORTANT:
   - Hazır cevaplar burada tutulmaz.
   - Yerel cevaplar: ./src/memory/localAnswerMemory.js
   - AI mantığı: ./src/ai/aiEngine.js
   - Hafıza: ./src/memory/answerMemory.js
   - Server yalnızca API / gateway / orchestration görevi görür.
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

/* ============================================================================
   SOCKET.IO
============================================================================ */

let SocketIOServer = null;

try {
    const socketIO = require("socket.io");

    if (
        socketIO &&
        typeof socketIO.Server === "function"
    ) {
        SocketIOServer = socketIO.Server;
    }
} catch (error) {
    SocketIOServer = null;
}

/* ============================================================================
   BASIC CONFIG
============================================================================ */

const TURKAI_VERSION = "21.0.0";

const NODE_ENV = String(
    process.env.NODE_ENV || "development"
).toLowerCase();

const IS_PRODUCTION =
    NODE_ENV === "production";

const HOST = "0.0.0.0";

const PORT =
    Number(process.env.PORT || 3000);

/* ============================================================================
   PATHS
============================================================================ */

const ROOT_DIR = path.resolve(__dirname);

const DATA_DIR = path.join(
    ROOT_DIR,
    "data"
);

const MEMORY_DIR = path.join(
    DATA_DIR,
    "memory"
);

const USERS_DIR = path.join(
    DATA_DIR,
    "users"
);

const CHATS_DIR = path.join(
    DATA_DIR,
    "chats"
);

const PLANS_DIR = path.join(
    DATA_DIR,
    "plans"
);

const AI_DIR = path.join(
    DATA_DIR,
    "ai"
);

const LOGS_DIR = path.join(
    DATA_DIR,
    "logs"
);

const UPLOADS_DIR = path.join(
    DATA_DIR,
    "uploads"
);

const TEMP_DIR = path.join(
    DATA_DIR,
    "temp"
);

/* ============================================================================
   DIRECTORY BOOTSTRAP
============================================================================ */

const REQUIRED_DIRECTORIES = [
    DATA_DIR,
    MEMORY_DIR,
    USERS_DIR,
    CHATS_DIR,
    PLANS_DIR,
    AI_DIR,
    LOGS_DIR,
    UPLOADS_DIR,
    TEMP_DIR
];

for (
    const directory of REQUIRED_DIRECTORIES
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
            "[TürkAI] Directory error:",
            directory,
            error.message
        );
    }
}

/* ============================================================================
   ENVIRONMENT VALUES
============================================================================ */

const TURKAI_API_KEY = String(
    process.env.TURKAI_API_KEY || ""
).trim();

const TURKAI_ADMIN_KEY = String(
    process.env.TURKAI_ADMIN_KEY || ""
).trim();

const TURKAI_PRO_CODE = String(
    process.env.TURKAI_PRO_CODE || ""
).trim();

/* ============================================================================
   EXPRESS APP
============================================================================ */

const app = express();

app.disable("x-powered-by");

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

if (SocketIOServer) {
    try {
        io = new SocketIOServer(
            httpServer,
            {
                cors: {
                    origin: true,
                    credentials: true
                },

                transports: [
                    "websocket",
                    "polling"
                ]
            }
        );
    } catch (error) {
        console.error(
            "[TürkAI] Socket.IO error:",
            error.message
        );

        io = null;
    }
}

/* ============================================================================
   SERVER STATE
============================================================================ */

const SERVER_STARTED_AT =
    Date.now();

const serverState = {
    status: "starting",

    version:
        TURKAI_VERSION,

    environment:
        NODE_ENV,

    startedAt:
        new Date(
            SERVER_STARTED_AT
        ).toISOString(),

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
        null,

    lastSuccessfulRequestAt:
        null,

    lastFailedRequestAt:
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
        return String(value);
    } catch (error) {
        return fallback;
    }
}

function cleanString(
    value,
    maxLength = 50000
) {
    return safeString(value)
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
    return new Date().toISOString();
}

function deepClone(
    value
) {
    try {
        return JSON.parse(
            JSON.stringify(value)
        );
    } catch (error) {
        return value;
    }
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
            !fs.existsSync(file)
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
    } catch (error) {
        console.error(
            "[TürkAI] JSON read error:",
            file,
            error.message
        );

        return fallback;
    }
}

function writeJSON(
    file,
    value
) {
    const directory =
        path.dirname(file);

    fs.mkdirSync(
        directory,
        {
            recursive: true
        }
    );

    const tempFile =
        file + ".tmp";

    fs.writeFileSync(
        tempFile,
        JSON.stringify(
            value,
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

const SERVER_LOG_FILE =
    path.join(
        LOGS_DIR,
        "server.log"
    );

function audit(
    event,
    data = {}
) {
    const record = {
        id:
            createId("audit"),

        event:
            safeString(event),

        timestamp:
            nowISO(),

        data:
            deepClone(data)
    };

    try {
        fs.appendFileSync(
            SERVER_LOG_FILE,
            JSON.stringify(
                record
            ) + "\n",
            "utf8"
        );
    } catch (error) {
        console.error(
            "[TürkAI] Audit error:",
            error.message
        );
    }
}

function logDebug(
    ...args
) {
    if (!IS_PRODUCTION) {
        console.log(
            "[TürkAI]",
            ...args
        );
    }
}

/* ============================================================================
   SAFE MODULE LOADER
============================================================================ */

function safeRequire(
    modulePath
) {
    try {
        return require(
            modulePath
        );
    } catch (error) {
        logDebug(
            `Optional module yüklenemedi: ${modulePath}`
        );

        logDebug(
            error.message
        );

        return null;
    }
}

/* ============================================================================
   MODULAR ENGINES
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
    memory:
        Boolean(
            answerMemory
        ),

    localAnswers:
        Boolean(
            localAnswerMemory
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

                if (
                    res.statusCode >=
                        200 &&
                    res.statusCode <
                        400
                ) {
                    serverState.successfulRequests++;

                    serverState.lastSuccessfulRequestAt =
                        nowISO();
                } else {
                    serverState.failedRequests++;

                    serverState.lastFailedRequestAt =
                        nowISO();
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

const RATE_WINDOW_MS =
    60 * 1000;

const RATE_LIMIT =
    120;

function getClientIP(
    req
) {
    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];

    return safeString(
        forwarded ||
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
        getClientIP(req);

    const current =
        Date.now();

    let record =
        rateStore.get(ip);

    if (
        !record ||
        current -
            record.startedAt >
            RATE_WINDOW_MS
    ) {
        record = {
            startedAt:
                current,

            count:
                0
        };
    }

    record.count += 1;

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
   OPTIONAL API KEY
============================================================================ */

function requireAPIKey(
    req,
    res,
    next
) {
    /*
      .env içinde TURKAI_API_KEY yoksa geliştirme/
      temel frontend kullanımı engellenmez.
    */

    if (
        !TURKAI_API_KEY
    ) {
        return next();
    }

    const headerKey =
        cleanString(
            req.headers[
                "x-turkai-key"
            ] ||
            req.headers[
                "x-api-key"
            ] ||
            req.headers.authorization ||
            "",
            1000
        );

    const key =
        headerKey.replace(
            /^Bearer\s+/i,
            ""
        ).trim();

    if (
        key ===
            TURKAI_API_KEY ||
        (
            TURKAI_ADMIN_KEY &&
            key ===
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

function sendSuccess(
    res,
    payload = {}
) {
    return res.json({
        success:
            true,

        ...payload,

        timestamp:
            nowISO()
    });
}

function sendError(
    res,
    status,
    error,
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
                safeString(
                    error,
                    "Sunucu hatası."
                ),

            code,

            ...extra,

            timestamp:
                nowISO()
        });
}

/* ============================================================================
   LOCAL ANSWER BRIDGE
============================================================================

   ÖNEMLİ:
   Burada hiçbir hazır cevap bulunmuyor.

   Server sadece aşağıdaki ayrı dosyadan cevap ister:
   ./src/memory/localAnswerMemory.js
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
            const answer =
                localAnswerMemory.getAnswer(
                    message
                );

            return (
                cleanString(
                    answer,
                    50000
                ) || null
            );
        }

        if (
            typeof localAnswerMemory.find ===
                "function"
        ) {
            const result =
                localAnswerMemory.find(
                    message
                );

            const answer =
                result?.answer ??
                result?.response ??
                result?.text ??
                "";

            return (
                cleanString(
                    answer,
                    50000
                ) || null
            );
        }
    } catch (error) {
        logDebug(
            "Local answer lookup:",
            error.message
        );
    }

    return null;
}

const GENERIC_LOCAL_FALLBACK =
    "Bu isteği şu anda TürkAI yerel motoru işliyor. Daha ayrıntılı veya güncel sorular için AI ve araştırma motorları devreye girebilir.";

/* ============================================================================
   BASIC ROOT ROUTES
============================================================================ */

app.get(
    "/api",
    (
        req,
        res
    ) => {
        return sendSuccess(
            res,
            {
                name:
                    "TürkAI API",

                version:
                    TURKAI_VERSION,

                status:
                    serverState.status,

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
                    "/api/local-answers",
                    "/api/media/image",
                    "/api/media/video",
                    "/api/media/health",
                    "/api/tasks",
                    "/api/tasks/health",
                    "/api/security",
                    "/api/diagnostics"
                ]
            }
        );
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
        return sendSuccess(
            res,
            {
                status:
                    "ok",

                server:
                    "online",

                name:
                    "TürkAI",

                version:
                    TURKAI_VERSION,

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
        return sendSuccess(
            res,
            {
                status:
                    serverState.status,

                version:
                    TURKAI_VERSION,

                environment:
                    NODE_ENV,

                modules:
                    deepClone(
                        moduleStatus
                    ),

                server:
                    deepClone(
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
    (
        req,
        res
    ) => {
        return sendSuccess(
            res,
            {
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

                    ai:
                        Boolean(
                            aiEngine
                        ),

                    research:
                        Boolean(
                            researchEngine
                        ),

                    weather:
                        Boolean(
                            weatherEngine
                        ),

                    upload:
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
                }
            }
        );
    }
);

/* ============================================================================
   STATIC FRONTEND
============================================================================ */

app.use(
    express.static(
        ROOT_DIR,
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
   GEMINI PROVIDER
============================================================================ */

function convertMessagesToGemini(
    request,
    systemPrompt
) {
    const contents = [];

    if (
        Array.isArray(
            request.history
        )
    ) {
        for (
            const item of request.history.slice(
                -toNumber(
                    aiConfig.maxHistory,
                    30
                )
            )
        ) {
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

            const originalRole =
                cleanText(
                    item?.role ??
                    "user",
                    30
                ).toLowerCase();

            const role =
                originalRole ===
                "assistant"
                    ? "model"
                    : "user";

            contents.push({
                role,

                parts: [
                    {
                        text:
                            content
                    }
                ]
            });
        }
    }

    if (
        request.message
    ) {
        contents.push({
            role:
                "user",

            parts: [
                {
                    text:
                        cleanText(
                            request.message,
                            50000
                        )
                }
            ]
        });
    }

    return {
        contents,

        systemInstruction: {
            parts: [
                {
                    text:
                        cleanText(
                            systemPrompt,
                            20000
                        )
                }
            ]
        }
    };
}

async function callGeminiProvider(
    request,
    modelName
) {
    const provider =
        getProviderConfig(
            "gemini"
        );

    if (
        !provider
    ) {
        throw new Error(
            "Gemini provider bulunamadı."
        );
    }

    const apiKey =
        ENV.GEMINI_API_KEY;

    if (
        !apiKey
    ) {
        const error =
            new Error(
                "Gemini API key bulunamadı."
            );

        error.status =
            401;

        error.code =
            "MISSING_API_KEY";

        throw error;
    }

    const systemPrompt =
        createSystemPrompt(
            {
                language:
                    request.language,

                plan:
                    request.plan,

                coding:
                    request.classification?.isCoding,

                research:
                    request.classification?.needsResearch
            }
        );

    const body =
        convertMessagesToGemini(
            request,
            systemPrompt
        );

    body.generationConfig = {
        temperature:
            0.6,

        maxOutputTokens:
            toNumber(
                request.maxTokens,
                4096
            )
    };

    const selectedModel =
        modelName ||
        provider.model ||
        "gemini-2.5-flash";

    const url =
        `${provider.baseURL}/models/${encodeURIComponent(
            selectedModel
        )}:generateContent?key=${encodeURIComponent(
            apiKey
        )}`;

    const response =
        await fetchWithTimeout(
            url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(
                        body
                    )
            },
            provider.timeout
        );

    const raw =
        await response.text();

    let data =
        null;

    try {
        data =
            raw
                ? JSON.parse(
                      raw
                  )
                : {};
    } catch {
        data = {
            raw
        };
    }

    if (
        !response.ok
    ) {
        const error =
            new Error(
                data?.error?.message ||
                data?.message ||
                raw ||
                `Gemini HTTP ${response.status}`
            );

        error.status =
            response.status;

        error.provider =
            "gemini";

        error.response =
            data;

        throw error;
    }

    let answer =
        "";

    const candidates =
        Array.isArray(
            data?.candidates
        )
            ? data.candidates
            : [];

    for (
        const candidate of candidates
    ) {
        const parts =
            Array.isArray(
                candidate?.content?.parts
            )
                ? candidate.content.parts
                : [];

        const texts =
            parts
                .map(
                    (
                        part
                    ) =>
                        cleanText(
                            part?.text ??
                            "",
                            50000
                        )
                )
                .filter(
                    Boolean
                );

        if (
            texts.length
        ) {
            answer =
                texts.join(
                    "\n"
                );

            break;
        }
    }

    if (
        !answer
    ) {
        const direct =
            cleanText(
                data?.text ??
                "",
                50000
            );

        if (
            direct
        ) {
            answer =
                direct;
        }
    }

    if (
        !answer
    ) {
        const error =
            new Error(
                "Gemini boş cevap döndürdü."
            );

        error.status =
            502;

        error.provider =
            "gemini";

        throw error;
    }

    return {
        success:
            true,

        answer,

        source:
            "provider",

        provider:
            "gemini",

        model:
            selectedModel,

        raw:
            request.debug
                ? data
                : undefined
    };
}

/* ============================================================================
   PROVIDER DISPATCHER
============================================================================ */

async function callProvider(
    providerName,
    request,
    modelName
) {
    const provider =
        getProviderKey(
            providerName
        );

    if (
        provider ===
        "local"
    ) {
        return localGenerate(
            request
        );
    }

    if (
        provider ===
            "groq" ||
        provider ===
            "cerebras" ||
        provider ===
            "openrouter"
    ) {
        return callOpenAICompatibleProvider(
            request,
            provider,
            modelName
        );
    }

    if (
        provider ===
        "gemini"
    ) {
        return callGeminiProvider(
            request,
            modelName
        );
    }

    throw new Error(
        `Desteklenmeyen AI provider: ${providerName}`
    );
}

/* ============================================================================
   RUNTIME PROVIDER ORDER
============================================================================ */

/*
  Local provider varsayılan olarak bulunabilir.
  Fakat AI Engine'in bilinmeyen sorularda hemen generic local cevap vermemesi
  için local'i son fallback olarak kullanıyoruz.

  Böylece:
  1. Kullanıcının istediği provider/model
  2. Yapılandırılmış harici providerlar
  3. Local answer memory
  4. Generic local fallback
*/

function buildRuntimeProviderOrder(
    request
) {
    const order = [];

    const requestedProvider =
        getProviderKey(
            request.requestedProvider
        );

    const selectedModel =
        resolveModel(
            request
        );

    const selectedProvider =
        resolveProviderForModel(
            selectedModel
        );

    if (
        requestedProvider &&
        requestedProvider !==
            "local"
    ) {
        order.push(
            requestedProvider
        );
    }

    if (
        selectedProvider &&
        selectedProvider !==
            "local"
    ) {
        order.push(
            selectedProvider
        );
    }

    const preferredExternal = [
        "groq",
        "cerebras",
        "gemini",
        "openrouter"
    ];

    for (
        const provider of preferredExternal
    ) {
        if (
            isProviderConfigured(
                provider
            ) &&
            !isProviderCoolingDown(
                provider
            ) &&
            !order.includes(
                provider
            )
        ) {
            order.push(
                provider
            );
        }
    }

    /*
      Local her zaman son.
    */

    order.push(
        "local"
    );

    return [
        ...new Set(
            order
        )
    ];
}

/* ============================================================================
   MODEL FOR PROVIDER
============================================================================ */

function getModelForProvider(
    request,
    providerName
) {
    const selectedModel =
        resolveModel(
            request
        );

    const selectedModelInfo =
        MODELS[
            selectedModel
        ];

    if (
        selectedModelInfo &&
        selectedModelInfo.provider ===
            providerName
    ) {
        return (
            selectedModelInfo.model ||
            null
        );
    }

    const provider =
        PROVIDERS[
            providerName
        ];

    if (
        provider
    ) {
        return (
            provider.model ||
            null
        );
    }

    return null;
}

/* ============================================================================
   PROVIDER ELIGIBILITY
============================================================================ */

function canUseProvider(
    providerName
) {
    const provider =
        getProviderKey(
            providerName
        );

    if (
        provider ===
        "local"
    ) {
        return true;
    }

    if (
        !PROVIDERS[
            provider
        ]
    ) {
        return false;
    }

    if (
        aiConfig.providers?.[
            provider
        ]?.enabled ===
        false
    ) {
        return false;
    }

    if (
        !isProviderConfigured(
            provider
        )
    ) {
        return false;
    }

    if (
        isProviderCoolingDown(
            provider
        )
    ) {
        return false;
    }

    return true;
}

/* ============================================================================
   USAGE RECORDING
============================================================================ */

function recordProviderUsage(
    providerName,
    success,
    metadata = {}
) {
    const day =
        ensureUsageDate();

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
                0,

            lastAt:
                null,

            lastModel:
                null,

            lastError:
                null
        };
    }

    const stats =
        day.providers[
            provider
        ];

    stats.requests++;

    if (
        success
    ) {
        stats.successes++;
    } else {
        stats.failures++;
    }

    stats.lastAt =
        nowISO();

    stats.lastModel =
        metadata.model ||
        null;

    stats.lastError =
        success
            ? null
            : metadata.error ||
              null;

    day.total =
        toNumber(
            day.total
        ) + 1;

    if (
        success
    ) {
        day.successes =
            toNumber(
                day.successes
            ) + 1;
    } else {
        day.failures =
            toNumber(
                day.failures
            ) + 1;
    }

    try {
        writeJSON(
            USAGE_FILE,
            aiUsage
        );
    } catch {}

    return clone(
        stats
    );
}

/* ============================================================================
   PROVIDER SUCCESS / FAILURE
============================================================================ */

function providerSucceeded(
    providerName,
    metadata = {}
) {
    const provider =
        getProviderKey(
            providerName
        );

    markProviderSuccess(
        provider,
        metadata
    );

    recordProviderUsage(
        provider,
        true,
        metadata
    );
}

function providerFailed(
    providerName,
    error,
    metadata = {}
) {
    const provider =
        getProviderKey(
            providerName
        );

    const classification =
        classifyProviderError(
            error
        );

    markProviderFailure(
        provider,
        error,
        {
            ...metadata,

            error:
                safeString(
                    error?.message ||
                    error
                ).slice(
                    0,
                    1000
                ),

            errorType:
                classification.type
        }
    );

    recordProviderUsage(
        provider,
        false,
        {
            ...metadata,

            error:
                safeString(
                    error?.message ||
                    error
                ).slice(
                    0,
                    1000
                )
        }
    );

    applyProviderCooldown(
        provider,
        classification.cooldown
    );

    return classification;
}

/* ============================================================================
   CACHE KEY FOR REQUEST
============================================================================ */

function buildRequestCacheKey(
    request
) {
    const cachePayload = {
        message:
            request.message,

        history:
            Array.isArray(
                request.history
            )
                ? request.history.slice(
                      -10
                  )
                : [],

        model:
            request.requestedModel ||
            resolveModel(
                request
            ),

        provider:
            request.requestedProvider ||
            "",

        language:
            request.language,

        plan:
            request.plan
    };

    return cacheKey(
        [
            {
                role:
                    "system",

                content:
                    JSON.stringify(
                        cachePayload
                    )
            }
        ],

        cachePayload.model,

        cachePayload.language
    );
}

/* ============================================================================
   NORMALIZE AI RESULT
============================================================================ */

function normalizeAIResult(
    result,
    request,
    provider,
    model,
    extra = {}
) {
    const answer =
        extractTextFromResult(
            result
        );

    return {
        success:
            Boolean(
                answer
            ),

        answer,

        response:
            answer,

        source:
            result?.source ||
            "provider",

        provider:
            result?.provider ||
            provider,

        model:
            result?.model ||
            model ||
            null,

        language:
            request.language,

        userId:
            request.userId,

        conversationId:
            request.conversationId,

        cached:
            Boolean(
                extra.cached
            ),

        fallback:
            Boolean(
                extra.fallback
            ),

        research:
            Boolean(
                request.classification
                    ?.needsResearch
            ),

        coding:
            Boolean(
                request.classification
                    ?.isCoding
            ),

        classification:
            clone(
                request.classification
            ),

        timestamp:
            nowISO()
    };
}

/* ============================================================================
   CHAT ENGINE
============================================================================ */

async function chat(
    input = {}
) {
    const startedAt =
        Date.now();

    const request =
        normalizeAIRequest(
            input
        );

    const validation =
        validateRequest(
            request
        );

    if (
        !validation.valid
    ) {
        const error =
            new Error(
                validation.errors.join(
                    " "
                )
            );

        error.code =
            "INVALID_AI_REQUEST";

        throw error;
    }

    /*
      Çok kısa selamlaşmalarda önce local answer memory.
      Böylece slm/selam gibi kayıtlı cevaplar gereksiz yere harici API'ye gitmez.
    */

    if (
        request.classification.isShort &&
        (
            request.classification.isGreeting
        )
    ) {
        const localGreeting =
            findLocalAnswer(
                request.message
            );

        if (
            localGreeting
        ) {
            return normalizeAIResult(
                localGreeting,
                request,
                "local",
                "turkai-local",
                {
                    fallback:
                        true
                }
            );
        }
    }

    /*
      Cache.
    */

    const useCache =
        aiConfig.cache?.enabled !==
        false;

    const requestCacheKey =
        useCache
            ? buildRequestCacheKey(
                  request
              )
            : null;

    if (
        requestCacheKey
    ) {
        const cached =
            getCache(
                requestCacheKey
            );

        if (
            cached
        ) {
            return normalizeAIResult(
                cached,
                request,
                cached.provider ||
                    "cache",
                cached.model ||
                    null,
                {
                    cached:
                        true
                }
            );
        }
    }

    const providerOrder =
        buildRuntimeProviderOrder(
            request
        );

    let lastError =
        null;

    for (
        const providerName of providerOrder
    ) {
        if (
            !canUseProvider(
                providerName
            )
        ) {
            continue;
        }

        const modelName =
            getModelForProvider(
                request,
                providerName
            );

        const attemptStartedAt =
            Date.now();

        try {
            logDebug(
                `AI provider deniyor: ${providerName}`,
                modelName ||
                    ""
            );

            const result =
                await callProvider(
                    providerName,
                    request,
                    modelName
                );

            const normalized =
                normalizeAIResult(
                    result,
                    request,
                    providerName,
                    modelName,
                    {
                        fallback:
                            providerName ===
                            "local"
                    }
                );

            if (
                normalized.answer
            ) {
                providerSucceeded(
                    providerName,
                    {
                        model:
                            modelName,

                        duration:
                            Date.now() -
                            attemptStartedAt
                    }
                );

                if (
                    requestCacheKey &&
                    providerName !==
                        "local"
                ) {
                    setCache(
                        requestCacheKey,
                        normalized,
                        {
                            provider:
                                providerName,

                            model:
                                modelName,

                            language:
                                request.language
                        }
                    );
                }

                return {
                    ...normalized,

                    duration:
                        Date.now() -
                        startedAt
                };
            }

            const emptyError =
                new Error(
                    `${providerName} cevap üretmedi.`
                );

            providerFailed(
                providerName,
                emptyError,
                {
                    model:
                        modelName,

                    duration:
                        Date.now() -
                        attemptStartedAt
                }
            );

            lastError =
                emptyError;
        } catch (
            error
        ) {
            lastError =
                error;

            providerFailed(
                providerName,
                error,
                {
                    model:
                        modelName,

                    duration:
                        Date.now() -
                        attemptStartedAt
                }
            );

            const classification =
                classifyProviderError(
                    error
                );

            auditProviderFailure(
                providerName,
                request,
                error,
                classification
            );

            /*
              Fallback zinciri devam eder.
            */

            continue;
        }
    }

    /*
      Her provider başarısızsa local fallback.
    */

    const localResult =
        localGenerate(
            request
        );

    const normalizedLocal =
        normalizeAIResult(
            localResult,
            request,
            "local",
            "turkai-local",
            {
                fallback:
                    true
            }
        );

    if (
        !normalizedLocal.answer &&
        lastError
    ) {
        throw lastError;
    }

    return {
        ...normalizedLocal,

        duration:
            Date.now() -
            startedAt,

        fallback:
            true
    };
}

/* ============================================================================
   PROVIDER FAILURE AUDIT
============================================================================ */

function auditProviderFailure(
    providerName,
    request,
    error,
    classification
) {
    const record = {
        id:
            createId(
                "provider_error"
            ),

        provider:
            providerName,

        type:
            classification?.type ||
            "unknown",

        retryable:
            Boolean(
                classification?.retryable
            ),

        userId:
            request.userId,

        model:
            request.requestedModel ||
            null,

        language:
            request.language,

        message:
            safeString(
                error?.message ||
                error
            ).slice(
                0,
                1000
            ),

        timestamp:
            nowISO()
    };

    try {
        const logs =
            readJSON(
                PROVIDER_LOG_FILE,
                []
            );

        const list =
            Array.isArray(
                logs
            )
                ? logs
                : [];

        list.push(
            record
        );

        while (
            list.length >
            2000
        ) {
            list.shift();
        }

        writeJSON(
            PROVIDER_LOG_FILE,
            list
        );
    } catch {}
}

/* ============================================================================
   GENERATE ALIAS
============================================================================ */

async function generate(
    input = {}
) {
    return chat(
        input
    );
}

/* ============================================================================
   ASK ALIAS
============================================================================ */

async function ask(
    message,
    options = {}
) {
    return chat(
        {
            ...options,

            message
        }
    );
}

/* ============================================================================
   COMPLETE ALIAS
============================================================================ */

async function complete(
    message,
    options = {}
) {
    const result =
        await chat(
            {
                ...options,

                message
            }
        );

    return result.answer;
}

/* ============================================================================
   SIMPLE LOCAL TEST
============================================================================ */

async function test(
    message = "slm"
) {
    const result =
        await chat(
            {
                message,

                userId:
                    "test",

                conversationId:
                    createId(
                        "test"
                    ),

                plan:
                    "free",

                language:
                    "tr"
            }
        );

    return result;
}

/* ============================================================================
   PROVIDER STATS
============================================================================ */

function getProviderStats() {
    return getProviderStatus();
}

function getUsageStats(
    date = getUsageDate()
) {
    const item =
        ensureUsageDate(
            date
        );

    return clone(
        item
    );
}

/* ============================================================================
   CACHE STATS
============================================================================ */

function getCacheStats() {
    cleanupCache();

    const entries =
        Object.entries(
            aiCache
        );

    return {
        enabled:
            Boolean(
                aiConfig.cache?.enabled
            ),

        count:
            entries.length,

        ttl:
            toNumber(
                aiConfig.cache?.ttl,
                24 *
                    60 *
                    60 *
                    1000
            )
    };
}

/* ============================================================================
   HEALTH
============================================================================ */

function health() {
    const providerStatus =
        getProviderStatus();

    let configured =
        0;

    let available =
        0;

    for (
        const provider of Object.keys(
            providerStatus
        )
    ) {
        if (
            providerStatus[
                provider
            ].configured
        ) {
            configured++;
        }

        if (
            providerStatus[
                provider
            ].available
        ) {
            available++;
        }
    }

    return {
        status:
            "ok",

        available:
            true,

        configuredProviders:
            configured,

        availableProviders:
            available,

        providers:
            providerStatus,

        cache:
            getCacheStats(),

        usage:
            getUsageStats(),

        config:
            {
                language:
                    aiConfig.defaultLanguage,

                provider:
                    aiConfig.defaultProvider,

                model:
                    aiConfig.defaultModel,

                autoResearch:
                    Boolean(
                        aiConfig.autoResearch
                    ),

                codingDetection:
                    Boolean(
                        aiConfig.codingDetection
                    ),

                fallback:
                    Boolean(
                        aiConfig.fallback
                    )
            },

        timestamp:
            nowISO()
    };
}

/* ============================================================================
   STATUS
============================================================================ */

function status() {
    return {
        version:
            "1.0.0",

        health:
            health(),

        models:
            clone(
                MODELS
            ),

        providers:
            getProviderStatus()
    };
}

/* ============================================================================
   CONFIG API
============================================================================ */

function getConfig() {
    return getAIConfig();
}

function updateConfig(
    patch = {}
) {
    return saveAIConfig(
        patch
    );
}

/* ============================================================================
   CACHE CLEAR
============================================================================ */

function clearCache() {
    aiCache =
        {};

    return flushCache();
}

/* ============================================================================
   USAGE RESET FOR DAY
============================================================================ */

function resetUsage(
    date = getUsageDate()
) {
    delete aiUsage[
        date
    ];

    return writeJSON(
        USAGE_FILE,
        aiUsage
    );
}

/* ============================================================================
   SHUTDOWN
============================================================================ */

async function shutdown() {
    try {
        cleanupCache();

        flushCache();

        writeJSON(
            USAGE_FILE,
            aiUsage
        );

        writeJSON(
            AI_CONFIG_FILE,
            aiConfig
        );
    } catch (
        error
    ) {
        logDebug(
            "AI shutdown:",
            error.message
        );
    }

    return {
        success:
            true,

        timestamp:
            nowISO()
    };
}

/* ============================================================================
   PERIODIC CACHE SAVE
============================================================================ */

const AI_CACHE_TIMER =
    setInterval(
        () => {
            try {
                flushCache();
            } catch {}
        },
        60 *
            1000
    );

AI_CACHE_TIMER.unref?.();

/* ============================================================================
   ERROR SAFE PROCESS HOOK
============================================================================ */

if (
    typeof process !==
    "undefined"
) {
    process.once(
        "beforeExit",
        () => {
            try {
                cleanupCache();

                flushCache();

                writeJSON(
                    USAGE_FILE,
                    aiUsage
                );
            } catch {}
        }
    );
}

/* ============================================================================
   FINAL EXPORTS
============================================================================ */

module.exports = {
    chat,

    generate,

    ask,

    complete,

    test,

    health,

    status,

    shutdown,

    getConfig,

    updateConfig,

    getProviderStatus,

    getProviderStats,

    getUsageStats,

    getCacheStats,

    clearCache,

    resetUsage,

    detectLanguage,

    classifyQuestion,

    normalizeAIRequest,

    resolveModel,

    resolveProviderForModel,

    getProviderOrder,

    buildRuntimeProviderOrder,

    callProvider,

    localGenerate,

    findLocalAnswer
};
