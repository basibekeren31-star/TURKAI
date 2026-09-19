/* ============================================================================
   TÜRKAI SERVER
   PART 1 / 5
   CORE SERVER + CONFIG + STORAGE + SECURITY + LOGGING
   ============================================================================ */

"use strict";

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const crypto = require("crypto");
const express = require("express");

let cors = null;
let helmet = null;
let SocketIOServer = null;

try {
    cors = require("cors");
} catch (_) {}

try {
    helmet = require("helmet");
} catch (_) {}

try {
    ({ Server: SocketIOServer } = require("socket.io"));
} catch (_) {}

const APP_NAME = "TürkAI";
const APP_VERSION = "12.0.0";

const ROOT_DIR = __dirname;

const SRC_DIR = path.join(
    ROOT_DIR,
    "src"
);

const DATA_DIR = path.join(
    ROOT_DIR,
    "data"
);

const UPLOAD_DIR = path.join(
    ROOT_DIR,
    "uploads"
);

const LOG_DIR = path.join(
    ROOT_DIR,
    "logs"
);

const TEMP_DIR = path.join(
    ROOT_DIR,
    "temp"
);

const BACKUP_DIR = path.join(
    ROOT_DIR,
    "backups"
);

const FILES = {
    users: path.join(
        DATA_DIR,
        "users.json"
    ),

    chats: path.join(
        DATA_DIR,
        "chats.json"
    ),

    answerMemory: path.join(
        DATA_DIR,
        "answer_memory.json"
    ),

    conversationMemory: path.join(
        DATA_DIR,
        "conversation_memory.json"
    ),

    userMemory: path.join(
        DATA_DIR,
        "user_memory.json"
    ),

    knowledge: path.join(
        DATA_DIR,
        "knowledge.json"
    ),

    usage: path.join(
        DATA_DIR,
        "usage.json"
    ),

    userPlans: path.join(
        DATA_DIR,
        "user_plans.json"
    ),

    settings: path.join(
        DATA_DIR,
        "settings.json"
    ),

    analytics: path.join(
        DATA_DIR,
        "analytics.json"
    ),

    logs: path.join(
        LOG_DIR,
        "turkai.log"
    ),

    errorLogs: path.join(
        LOG_DIR,
        "errors.log"
    )
};

const CONFIG = {
    app: {
        name: APP_NAME,
        version: APP_VERSION,
        environment:
            process.env.NODE_ENV ||
            "development",

        host:
            process.env.HOST ||
            "0.0.0.0",

        port:
            Number(
                process.env.PORT
            ) || 3000
    },

    security: {
        jsonLimit: "25mb",

        urlencodedLimit: "25mb",

        maxRequestLength:
            1000000,

        rateWindow:
            60 * 1000,

        rateLimit:
            120
    },

    uploads: {
        maxMB: 50,

        maxBytes:
            50 *
            1024 *
            1024,

        allowedExtensions: [
            ".txt",
            ".md",
            ".json",
            ".csv",

            ".js",
            ".ts",
            ".jsx",
            ".tsx",

            ".html",
            ".htm",
            ".css",

            ".py",
            ".java",

            ".c",
            ".cpp",
            ".h",
            ".hpp",

            ".cs",
            ".php",
            ".go",
            ".rs",

            ".sql",
            ".xml",
            ".yaml",
            ".yml",

            ".pdf",

            ".png",
            ".jpg",
            ".jpeg",
            ".webp",

            ".mp3",
            ".wav",

            ".mp4",
            ".webm"
        ]
    },

    memory: {
        enabled: true,

        maxAnswers: 10000,

        maxConversations: 5000,

        maxUserMemory: 1000,

        maxKnowledge: 10000,

        maxMessageLength: 50000
    },

    ai: {
        defaultModel:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b",

        groqModel:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b",

        cerebrasModel:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b",

        geminiModel:
            process.env.GEMINI_MODEL ||
            "gemini-2.5-flash",

        timeout:
            90000
    },

    research: {
        enabled:
            process.env.RESEARCH_ENABLED !==
            "false",

        maxResults: 10,

        timeout: 30000
    },

    voice: {
        enabled: true,

        defaultLanguage:
            process.env.TURKAI_VOICE_LANGUAGE ||
            "tr-TR"
    }
};


/* ============================================================================
   DIRECTORY ENGINE
   ============================================================================ */

function ensureDirectory(
    directory
) {
    if (!directory) {
        return;
    }

    if (
        !fs.existsSync(directory)
    ) {
        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );
    }
}

function initializeDirectories() {
    ensureDirectory(
        SRC_DIR
    );

    ensureDirectory(
        DATA_DIR
    );

    ensureDirectory(
        UPLOAD_DIR
    );

    ensureDirectory(
        LOG_DIR
    );

    ensureDirectory(
        TEMP_DIR
    );

    ensureDirectory(
        BACKUP_DIR
    );
}

initializeDirectories();


/* ============================================================================
   JSON STORAGE ENGINE
   ============================================================================ */

function cloneData(
    value
) {
    try {
        return JSON.parse(
            JSON.stringify(value)
        );
    } catch (_) {
        return value;
    }
}

function writeJSON(
    filePath,
    data
) {
    try {
        ensureDirectory(
            path.dirname(filePath)
        );

        const tempFile =
            `${filePath}.tmp`;

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
            filePath
        );

        return true;
    } catch (error) {
        logError(
            "STORAGE",
            error
        );

        return false;
    }
}

function readJSON(
    filePath,
    fallback = null
) {
    try {
        if (
            !fs.existsSync(filePath)
        ) {
            return cloneData(
                fallback
            );
        }

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (
            !content.trim()
        ) {
            return cloneData(
                fallback
            );
        }

        return JSON.parse(
            content
        );
    } catch (error) {
        logError(
            "STORAGE",
            error
        );

        return cloneData(
            fallback
        );
    }
}

function ensureJSON(
    filePath,
    defaultValue
) {
    if (
        !fs.existsSync(filePath)
    ) {
        writeJSON(
            filePath,
            defaultValue
        );
    }

    return readJSON(
        filePath,
        defaultValue
    );
}

function updateJSON(
    filePath,
    updater,
    fallback
) {
    const current =
        readJSON(
            filePath,
            fallback
        );

    const updated =
        updater(
            cloneData(current)
        );

    writeJSON(
        filePath,
        updated
    );

    return updated;
}


/* ============================================================================
   INITIAL DATA
   ============================================================================ */

function initializeDataFiles() {
    ensureJSON(
        FILES.users,
        {}
    );

    ensureJSON(
        FILES.chats,
        {}
    );

    ensureJSON(
        FILES.answerMemory,
        []
    );

    ensureJSON(
        FILES.conversationMemory,
        {}
    );

    ensureJSON(
        FILES.userMemory,
        {}
    );

    ensureJSON(
        FILES.knowledge,
        []
    );

    ensureJSON(
        FILES.usage,
        {}
    );

    ensureJSON(
        FILES.userPlans,
        {}
    );

    ensureJSON(
        FILES.settings,
        {
            appName: APP_NAME,

            version:
                APP_VERSION,

            createdAt:
                new Date()
                    .toISOString()
        }
    );

    ensureJSON(
        FILES.analytics,
        {
            requests: 0,

            messages: 0,

            errors: 0,

            users: 0,

            uploads: 0,

            researchRequests: 0,

            voiceRequests: 0
        }
    );
}

initializeDataFiles();


/* ============================================================================
   LOGGER
   ============================================================================ */

function timestamp() {
    return new Date()
        .toISOString();
}

function safeString(
    value
) {
    if (
        typeof value ===
        "string"
    ) {
        return value;
    }

    try {
        return JSON.stringify(
            value
        );
    } catch (_) {
        return String(value);
    }
}

function writeLog(
    level,
    area,
    message,
    extra = null
) {
    const line =
        `[${timestamp()}] ` +
        `[${level}] ` +
        `[${area}] ` +
        `${message}` +
        (
            extra !== null
                ? ` ${safeString(extra)}`
                : ""
        ) +
        "\n";

    try {
        fs.appendFileSync(
            FILES.logs,
            line,
            "utf8"
        );

        if (
            level === "ERROR"
        ) {
            fs.appendFileSync(
                FILES.errorLogs,
                line,
                "utf8"
            );
        }
    } catch (_) {}

    if (
        CONFIG.app.environment !==
        "test"
    ) {
        console.log(
            line.trim()
        );
    }
}

function logInfo(
    area,
    message,
    extra = null
) {
    writeLog(
        "INFO",
        area,
        message,
        extra
    );
}

function logWarn(
    area,
    message,
    extra = null
) {
    writeLog(
        "WARN",
        area,
        message,
        extra
    );
}

function logError(
    area,
    error,
    extra = null
) {
    const message =
        error &&
        error.message
            ? error.message
            : String(error);

    writeLog(
        "ERROR",
        area,
        message,
        extra
    );
}

function logDebug(
    area,
    message,
    extra = null
) {
    if (
        CONFIG.app.environment ===
        "development"
    ) {
        writeLog(
            "DEBUG",
            area,
            message,
            extra
        );
    }
}


/* ============================================================================
   ID ENGINE
   ============================================================================ */

function createId(
    prefix = "id"
) {
    return (
        prefix +
        "_" +
        crypto
            .randomBytes(16)
            .toString("hex")
    );
}

function createUserId() {
    return createId(
        "user"
    );
}

function createChatId() {
    return createId(
        "chat"
    );
}

function createMessageId() {
    return createId(
        "msg"
    );
}

function createMemoryId() {
    return createId(
        "mem"
    );
}

function createRequestId() {
    return createId(
        "req"
    );
}


/* ============================================================================
   TEXT ENGINE
   ============================================================================ */

function cleanString(
    value,
    maxLength = 50000
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    let text =
        String(value);

    text =
        text.replace(
            /\u0000/g,
            ""
        );

    text =
        text.trim();

    if (
        text.length >
        maxLength
    ) {
        text =
            text.slice(
                0,
                maxLength
            );
    }

    return text;
}

function cleanName(
    value
) {
    return cleanString(
        value,
        100
    )
        .replace(
            /[<>]/g,
            ""
        );
}

function cleanMessage(
    value
) {
    return cleanString(
        value,
        CONFIG.memory
            .maxMessageLength
    );
}

function normalizeQuestion(
    value
) {
    return cleanMessage(
        value
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(
            /\s+/g,
            " "
        );
}

function isEmpty(
    value
) {
    return (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    );
}


/* ============================================================================
   PLAN CONFIGURATION
   ============================================================================ */

const PLANS = {
    free: {
        id: "free",

        name: "Free",

        price: 0,

        dailyMessages: 50,

        imageDaily: 0,

        videoDaily: 0,

        maxUploadMB: 10,

        memory: true,

        research: true,

        weather: true,

        voice: true
    },

    pro: {
        id: "pro",

        name: "Pro",

        price: 250,

        dailyMessages: 100,

        imageDaily: 2,

        videoDaily: 0,

        maxUploadMB: 10,

        memory: true,

        research: true,

        weather: true,

        voice: true
    },

    plus: {
        id: "plus",

        name: "Plus",

        price: 500,

        dailyMessages: 200,

        imageDaily: 4,

        videoDaily: 5,

        maxUploadMB: 25,

        memory: true,

        research: true,

        weather: true,

        voice: true
    },

    ultra: {
        id: "ultra",

        name: "Ultra",

        price: 1000,

        dailyMessages: 1000,

        imageDaily: 10,

        videoDaily: 20,

        maxUploadMB: 50,

        memory: true,

        research: true,

        weather: true,

        voice: true,

        videoCall: true
    },

    developer: {
        id: "developer",

        name: "Developer",

        price: 0,

        dailyMessages: 400,

        imageDaily: 20,

        videoDaily: 20,

        maxUploadMB: 100,

        memory: true,

        research: true,

        weather: true,

        voice: true,

        developerTools: true
    }
};

function getPlan(
    planName
) {
    const normalized =
        String(
            planName ||
            "free"
        )
            .toLowerCase();

    return (
        PLANS[
            normalized
        ] ||
        PLANS.free
    );
}

function getPlansPublic() {
    return Object.values(
        PLANS
    ).map(
        plan => ({
            id: plan.id,

            name: plan.name,

            price: plan.price,

            dailyMessages:
                plan.dailyMessages,

            imageDaily:
                plan.imageDaily,

            videoDaily:
                plan.videoDaily,

            maxUploadMB:
                plan.maxUploadMB,

            memory:
                plan.memory,

            research:
                plan.research,

            weather:
                plan.weather,

            voice:
                plan.voice,

            videoCall:
                Boolean(
                    plan.videoCall
                ),

            developerTools:
                Boolean(
                    plan.developerTools
                )
        })
    );
}


/* ============================================================================
   USAGE ENGINE
   ============================================================================ */

function dateKey() {
    const now =
        new Date();

    return (
        now
            .toISOString()
            .slice(
                0,
                10
            )
    );
}

function getUsage(
    userId
) {
    const usage =
        readJSON(
            FILES.usage,
            {}
        );

    if (
        !usage[userId]
    ) {
        usage[userId] = {};
    }

    const today =
        dateKey();

    if (
        !usage[userId][today]
    ) {
        usage[userId][today] = {
            messages: 0,

            images: 0,

            videos: 0,

            uploads: 0,

            research: 0,

            voice: 0
        };
    }

    return {
        all: usage,

        today:
            usage[userId][today]
    };
}

function saveUsage(
    usage
) {
    writeJSON(
        FILES.usage,
        usage
    );
}

function incrementUsage(
    userId,
    type
) {
    const usage =
        getUsage(
            userId
        );

    if (
        typeof usage.today[type] !==
        "number"
    ) {
        usage.today[type] = 0;
    }

    usage.today[type]++;

    usage.all[userId][dateKey()] =
        usage.today;

    saveUsage(
        usage.all
    );

    return usage.today;
}

function getPlanUsage(
    userId,
    planName
) {
    const plan =
        getPlan(
            planName
        );

    const usage =
        getUsage(
            userId
        ).today;

    return {
        plan: plan.id,

        limits: {
            messages:
                plan.dailyMessages,

            images:
                plan.imageDaily,

            videos:
                plan.videoDaily
        },

        used: {
            messages:
                usage.messages || 0,

            images:
                usage.images || 0,

            videos:
                usage.videos || 0
        },

        remaining: {
            messages:
                Math.max(
                    0,
                    plan.dailyMessages -
                    (
                        usage.messages ||
                        0
                    )
                ),

            images:
                Math.max(
                    0,
                    plan.imageDaily -
                    (
                        usage.images ||
                        0
                    )
                ),

            videos:
                Math.max(
                    0,
                    plan.videoDaily -
                    (
                        usage.videos ||
                        0
                    )
                )
        }
    };
}


/* ============================================================================
   EXPRESS SERVER
   ============================================================================ */

const app =
    express();

const httpServer =
    http.createServer(
        app
    );

let io = null;

if (
    SocketIOServer
) {
    io =
        new SocketIOServer(
            httpServer,
            {
                cors: {
                    origin: true,

                    credentials: true
                }
            }
        );
}


/* ============================================================================
   EXPRESS CONFIGURATION
   ============================================================================ */

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

if (
    helmet
) {
    app.use(
        helmet({
            contentSecurityPolicy:
                false
        })
    );
}

if (
    cors
) {
    app.use(
        cors({
            origin: true,

            credentials: true
        })
    );
}

app.use(
    express.json({
        limit:
            CONFIG.security
                .jsonLimit
    })
);

app.use(
    express.urlencoded({
        extended: true,

        limit:
            CONFIG.security
                .urlencodedLimit
    })
);


/* ============================================================================
   REQUEST ID
   ============================================================================ */

app.use(
    (req, res, next) => {
        const requestId =
            createRequestId();

        req.requestId =
            requestId;

        res.setHeader(
            "X-TurkAI-Request-ID",
            requestId
        );

        next();
    }
);


/* ============================================================================
   RATE LIMITER
   ============================================================================ */

const rateStore =
    new Map();

function getClientAddress(
    req
) {
    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];

    if (
        forwarded
    ) {
        return forwarded
            .split(",")[0]
            .trim();
    }

    return (
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown"
    );
}

function rateLimitMiddleware(
    req,
    res,
    next
) {
    const key =
        getClientAddress(
            req
        );

    const now =
        Date.now();

    let record =
        rateStore.get(
            key
        );

    if (
        !record ||
        now -
            record.startedAt >=
            CONFIG.security
                .rateWindow
    ) {
        record = {
            startedAt: now,

            count: 0
        };
    }

    record.count++;

    rateStore.set(
        key,
        record
    );

    if (
        record.count >
        CONFIG.security.rateLimit
    ) {
        return res
            .status(429)
            .json({
                success: false,

                error: {
                    code:
                        "RATE_LIMITED",

                    message:
                        "Çok fazla istek gönderildi. Lütfen biraz bekleyin."
                },

                requestId:
                    req.requestId
            });
    }

    next();
}

app.use(
    rateLimitMiddleware
);


/* ============================================================================
   PRIVATE FILE PROTECTION
   ============================================================================ */

app.use(
    (req, res, next) => {
        const pathname =
            req.path.toLowerCase();

        const protectedPaths = [
            "/.env",
            "/data",
            "/logs",
            "/temp",
            "/backups"
        ];

        const blocked =
            protectedPaths.some(
                item =>
                    pathname === item ||
                    pathname.startsWith(
                        item + "/"
                    )
            );

        if (
            blocked
        ) {
            return res
                .status(403)
                .json({
                    success: false,

                    error: {
                        code:
                            "PRIVATE_RESOURCE",

                        message:
                            "Bu kaynak dışarıya açık değildir."
                    }
                });
        }

        next();
    }
);


/* ============================================================================
   STATIC FRONTEND
   ============================================================================ */

app.use(
    express.static(
        ROOT_DIR,
        {
            index: false,

            dotfiles: "deny"
        }
    )
);


/* ============================================================================
   ANALYTICS
   ============================================================================ */

function incrementAnalytics(
    field
) {
    try {
        const analytics =
            readJSON(
                FILES.analytics,
                {}
            );

        if (
            typeof analytics[field] !==
            "number"
        ) {
            analytics[field] = 0;
        }

        analytics[field]++;

        writeJSON(
            FILES.analytics,
            analytics
        );
    } catch (_) {}
}

app.use(
    (req, res, next) => {
        incrementAnalytics(
            "requests"
        );

        const started =
            Date.now();

        res.on(
            "finish",
            () => {
                const duration =
                    Date.now() -
                    started;

                logDebug(
                    "HTTP",
                    `${req.method} ${req.originalUrl}`,
                    {
                        requestId:
                            req.requestId,

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
   ROOT
   ============================================================================ */

app.get(
    "/",
    (req, res) => {
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
            success: true,

            app: APP_NAME,

            version:
                APP_VERSION,

            status:
                "online"
        });
    }
);


/* ============================================================================
   HEALTH
   ============================================================================ */

app.get(
    "/api/health",
    (req, res) => {
        return res.json({
            success: true,

            app: APP_NAME,

            version:
                APP_VERSION,

            status:
                "healthy",

            serverTime:
                new Date()
                    .toISOString(),

            uptime:
                process.uptime(),

            node:
                process.version,

            socket:
                Boolean(io),

            memory:
                true,

            research:
                CONFIG.research
                    .enabled,

            voice:
                CONFIG.voice
                    .enabled,

            requestId:
                req.requestId
        });
    }
);


/* ============================================================================
   STATUS
   ============================================================================ */

app.get(
    "/api/status",
    (req, res) => {
        return res.json({
            success: true,

            app: APP_NAME,

            version:
                APP_VERSION,

            environment:
                CONFIG.app
                    .environment,

            port:
                CONFIG.app.port,

            host:
                CONFIG.app.host,

            uptime:
                process.uptime(),

            memoryUsage:
                process.memoryUsage(),

            socket:
                Boolean(io),

            plans:
                Object.keys(
                    PLANS
                ),

            requestId:
                req.requestId
        });
    }
);


/* ============================================================================
   PUBLIC CONFIG
   ============================================================================ */

app.get(
    "/api/config/public",
    (req, res) => {
        return res.json({
            success: true,

            app: {
                name:
                    APP_NAME,

                version:
                    APP_VERSION
            },

            features: {
                memory: true,

                answerMemory: true,

                conversationMemory:
                    true,

                userMemory: true,

                knowledgeMemory:
                    true,

                voice:
                    CONFIG.voice
                        .enabled,

                research:
                    CONFIG.research
                        .enabled,

                weather: true,

                uploads: true,

                image: true,

                video: true
            },

            ai: {
                defaultModel:
                    CONFIG.ai
                        .defaultModel
            },

            plans:
                getPlansPublic(),

            requestId:
                req.requestId
        });
    }
);


/* ============================================================================
   BASIC PLAN ENDPOINT
   ============================================================================ */

app.get(
    "/api/plans",
    (req, res) => {
        return res.json({
            success: true,

            plans:
                getPlansPublic(),

            requestId:
                req.requestId
        });
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
        socket => {
            logInfo(
                "SOCKET",
                "Yeni bağlantı",
                {
                    socketId:
                        socket.id
                }
            );

            socket.emit(
                "turkai:connected",
                {
                    success: true,

                    app:
                        APP_NAME,

                    version:
                        APP_VERSION,

                    socketId:
                        socket.id,

                    serverTime:
                        new Date()
                            .toISOString()
                }
            );

            socket.on(
                "turkai:ping",
                data => {
                    socket.emit(
                        "turkai:pong",
                        {
                            success: true,

                            data:
                                data || null,

                            time:
                                new Date()
                                    .toISOString()
                        }
                    );
                }
            );

            socket.on(
                "disconnect",
                reason => {
                    logInfo(
                        "SOCKET",
                        "Bağlantı kapandı",
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
}


/* ============================================================================
   404
   ============================================================================ */

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,

            error: {
                code:
                    "ROUTE_NOT_FOUND",

                message:
                    "TürkAI API rotası bulunamadı.",

                path:
                    req.originalUrl,

                method:
                    req.method
            },

            requestId:
                req.requestId,

            timestamp:
                new Date()
                    .toISOString()
        });
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
        incrementAnalytics(
            "errors"
        );

        logError(
            "HTTP",
            error,
            {
                requestId:
                    req.requestId,

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
                error.status ||
                500
            )
            .json({
                success: false,

                error: {
                    code:
                        error.code ||
                        "SERVER_ERROR",

                    message:
                        CONFIG.app
                            .environment ===
                        "development"
                            ? error.message
                            : "TürkAI sunucusunda bir hata oluştu."
                },

                requestId:
                    req.requestId,

                timestamp:
                    new Date()
                        .toISOString()
            });
    }
);


/* ============================================================================
   PROCESS HANDLERS
   ============================================================================ */

process.on(
    "uncaughtException",
    error => {
        logError(
            "PROCESS",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    reason => {
        logError(
            "PROCESS",
            reason
        );
    }
);


/* ============================================================================
   GRACEFUL SHUTDOWN
   ============================================================================ */

let serverStarted =
    false;

function shutdown(
    signal
) {
    logInfo(
        "SERVER",
        `${signal} alındı. TürkAI kapatılıyor...`
    );

    if (
        httpServer.listening
    ) {
        httpServer.close(
            () => {
                logInfo(
                    "SERVER",
                    "HTTP sunucusu kapatıldı."
                );

                process.exit(0);
            }
        );
    } else {
        process.exit(0);
    }
}

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);


/* ============================================================================
   SERVER START
   ============================================================================ */

function startServer() {
    if (
        serverStarted
    ) {
        return;
    }

    serverStarted = true;

    httpServer.listen(
        CONFIG.app.port,
        CONFIG.app.host,
        () => {
            logInfo(
                "SERVER",
                `${APP_NAME} ${APP_VERSION} çalışıyor.`,
                {
                    host:
                        CONFIG.app.host,

                    port:
                        CONFIG.app.port,

                    environment:
                        CONFIG.app
                            .environment,

                    memory:
                        CONFIG.memory
                            .enabled,

                    voice:
                        CONFIG.voice
                            .enabled
                }
            );

            console.log("");
            console.log(
                "=============================================="
            );
            console.log(
                "             TÜRKAI SERVER ONLINE"
            );
            console.log(
                "=============================================="
            );
            console.log(
                `Uygulama : ${APP_NAME}`
            );
            console.log(
                `Versiyon : ${APP_VERSION}`
            );
            console.log(
                `Port     : ${CONFIG.app.port}`
            );
            console.log(
                `Adres    : http://localhost:${CONFIG.app.port}`
            );
            console.log(
                "Hafıza   : AKTİF"
            );
            console.log(
                "Ses      : AKTİF"
            );
            console.log(
                "Socket   : " +
                (
                    io
                        ? "AKTİF"
                        : "PASİF"
                )
            );
            console.log(
                "=============================================="
            );
            console.log("");
        }
    );
}


/* ============================================================================
   EXPORTS
   ============================================================================ */

module.exports = {
    app,

    io,

    httpServer,

    CONFIG,

    FILES,

    PLANS,

    getPlan,

    getPlansPublic,

    getUsage,

    getPlanUsage,

    incrementUsage,

    writeJSON,

    readJSON,

    ensureJSON,

    updateJSON,

    createId,

    createUserId,

    createChatId,

    createMessageId,

    createMemoryId,

    createRequestId,

    cleanString,

    cleanName,

    cleanMessage,

    normalizeQuestion,

    logInfo,

    logWarn,

    logError,

    logDebug,

    startServer
};


/* ============================================================================
   START
   ============================================================================ */

if (
    require.main ===
    module
) {
    startServer();
}
/* ============================================================================
   TÜRKAI SERVER
   PART 2 / 5
   MEMORY ENGINE
   ANSWER MEMORY
   CONVERSATION MEMORY
   USER MEMORY
   KNOWLEDGE MEMORY
   MEMORY MANAGER
   ============================================================================ */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR =
    path.resolve(__dirname, "../");

const DATA_DIR =
    path.join(ROOT_DIR, "data");

const MEMORY_FILES = {
    answers:
        path.join(
            DATA_DIR,
            "answer_memory.json"
        ),

    conversations:
        path.join(
            DATA_DIR,
            "conversation_memory.json"
        ),

    users:
        path.join(
            DATA_DIR,
            "user_memory.json"
        ),

    knowledge:
        path.join(
            DATA_DIR,
            "knowledge.json"
        )
};


/* ============================================================================
   MEMORY CONSTANTS
   ============================================================================ */

const MEMORY_CONFIG = {
    enabled: true,

    maxAnswers: 10000,

    maxConversationMessages: 500,

    maxConversationsPerUser: 100,

    maxUserMemoryItems: 1000,

    maxKnowledgeItems: 10000,

    maxMessageLength: 50000,

    minimumQuestionLength: 2,

    similarityThreshold: 0.82,

    contextMessageCount: 30,

    automaticKnowledgeSave: true,

    automaticAnswerSave: true
};


/* ============================================================================
   BASIC FILE ENGINE
   ============================================================================ */

function ensureDirectory(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );
    }
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

function readJSON(
    file,
    fallback
) {
    try {
        if (!fs.existsSync(file)) {
            return clone(fallback);
        }

        const content =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!content.trim()) {
            return clone(fallback);
        }

        return JSON.parse(content);
    } catch {
        return clone(fallback);
    }
}

function writeJSON(
    file,
    data
) {
    ensureDirectory(
        path.dirname(file)
    );

    const temp =
        `${file}.tmp`;

    fs.writeFileSync(
        temp,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );

    fs.renameSync(
        temp,
        file
    );

    return true;
}

function ensureFile(
    file,
    defaultValue
) {
    if (!fs.existsSync(file)) {
        writeJSON(
            file,
            defaultValue
        );
    }
}


/* ============================================================================
   INITIALIZE MEMORY FILES
   ============================================================================ */

ensureDirectory(
    DATA_DIR
);

ensureFile(
    MEMORY_FILES.answers,
    []
);

ensureFile(
    MEMORY_FILES.conversations,
    {}
);

ensureFile(
    MEMORY_FILES.users,
    {}
);

ensureFile(
    MEMORY_FILES.knowledge,
    []
);


/* ============================================================================
   ID ENGINE
   ============================================================================ */

function createMemoryId(
    prefix = "memory"
) {
    return (
        prefix +
        "_" +
        crypto
            .randomBytes(16)
            .toString("hex")
    );
}


/* ============================================================================
   TEXT NORMALIZATION
   ============================================================================ */

function normalizeText(
    text
) {
    if (
        text === undefined ||
        text === null
    ) {
        return "";
    }

    return String(text)
        .toLocaleLowerCase(
            "tr-TR"
        )
        .normalize("NFKC")
        .replace(
            /[\r\n\t]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function normalizeQuestion(
    question
) {
    return normalizeText(
        question
    )
        .replace(
            /[!?.,;:]+$/g,
            ""
        );
}

function cleanText(
    text,
    max = MEMORY_CONFIG.maxMessageLength
) {
    if (
        text === undefined ||
        text === null
    ) {
        return "";
    }

    let result =
        String(text)
            .replace(
                /\u0000/g,
                ""
            )
            .trim();

    if (
        result.length > max
    ) {
        result =
            result.slice(
                0,
                max
            );
    }

    return result;
}


/* ============================================================================
   TOKEN ENGINE
   ============================================================================ */

function tokenize(
    text
) {
    const normalized =
        normalizeText(text);

    if (!normalized) {
        return [];
    }

    return normalized
        .split(
            /[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+/u
        )
        .filter(
            token =>
                token.length > 1
        );
}

function uniqueTokens(
    tokens
) {
    return [
        ...new Set(tokens)
    ];
}

function tokenSet(
    text
) {
    return new Set(
        uniqueTokens(
            tokenize(text)
        )
    );
}


/* ============================================================================
   SIMILARITY ENGINE
   ============================================================================ */

function jaccardSimilarity(
    first,
    second
) {
    const a =
        tokenSet(first);

    const b =
        tokenSet(second);

    if (
        a.size === 0 &&
        b.size === 0
    ) {
        return 1;
    }

    if (
        a.size === 0 ||
        b.size === 0
    ) {
        return 0;
    }

    let intersection = 0;

    for (
        const token of a
    ) {
        if (b.has(token)) {
            intersection++;
        }
    }

    const union =
        new Set([
            ...a,
            ...b
        ]).size;

    if (!union) {
        return 0;
    }

    return (
        intersection /
        union
    );
}

function wordFrequency(
    text
) {
    const tokens =
        tokenize(text);

    const map = {};

    for (
        const token of tokens
    ) {
        map[token] =
            (map[token] || 0) + 1;
    }

    return map;
}

function cosineSimilarity(
    first,
    second
) {
    const a =
        wordFrequency(first);

    const b =
        wordFrequency(second);

    const keys =
        new Set([
            ...Object.keys(a),
            ...Object.keys(b)
        ]);

    let dot = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (
        const key of keys
    ) {
        const x =
            a[key] || 0;

        const y =
            b[key] || 0;

        dot +=
            x * y;

        magnitudeA +=
            x * x;

        magnitudeB +=
            y * y;
    }

    if (
        magnitudeA === 0 ||
        magnitudeB === 0
    ) {
        return 0;
    }

    return (
        dot /
        (
            Math.sqrt(magnitudeA) *
            Math.sqrt(magnitudeB)
        )
    );
}

function calculateSimilarity(
    first,
    second
) {
    const jaccard =
        jaccardSimilarity(
            first,
            second
        );

    const cosine =
        cosineSimilarity(
            first,
            second
        );

    return (
        jaccard * 0.55 +
        cosine * 0.45
    );
}


/* ============================================================================
   ANSWER MEMORY
   ============================================================================ */

class AnswerMemory {

    constructor() {
        this.file =
            MEMORY_FILES.answers;

        this.maxItems =
            MEMORY_CONFIG.maxAnswers;
    }

    load() {
        const data =
            readJSON(
                this.file,
                []
            );

        return Array.isArray(
            data
        )
            ? data
            : [];
    }

    save(
        data
    ) {
        return writeJSON(
            this.file,
            data
        );
    }

    createEntry({
        question,
        answer,
        userId = null,
        model = "local",
        source = "ai",
        language = "tr",
        confidence = 1,
        metadata = {}
    }) {
        const cleanQuestion =
            cleanText(
                question
            );

        const cleanAnswer =
            cleanText(
                answer
            );

        if (
            !cleanQuestion ||
            !cleanAnswer
        ) {
            return null;
        }

        return {
            id:
                createMemoryId(
                    "answer"
                ),

            question:
                cleanQuestion,

            normalizedQuestion:
                normalizeQuestion(
                    cleanQuestion
                ),

            answer:
                cleanAnswer,

            userId,

            model,

            source,

            language,

            confidence,

            metadata,

            createdAt:
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString(),

            usageCount: 0
        };
    }

    add(
        entry
    ) {
        if (!entry) {
            return null;
        }

        const items =
            this.load();

        const normalized =
            normalizeQuestion(
                entry.question
            );

        const existingIndex =
            items.findIndex(
                item =>
                    item.normalizedQuestion ===
                    normalized
            );

        if (
            existingIndex !== -1
        ) {
            const existing =
                items[
                    existingIndex
                ];

            existing.answer =
                entry.answer;

            existing.updatedAt =
                new Date()
                    .toISOString();

            existing.model =
                entry.model;

            existing.source =
                entry.source;

            existing.confidence =
                entry.confidence;

            existing.metadata =
                entry.metadata;

            items[
                existingIndex
            ] = existing;

            this.save(items);

            return existing;
        }

        items.unshift(
            entry
        );

        const trimmed =
            items.slice(
                0,
                this.maxItems
            );

        this.save(
            trimmed
        );

        return entry;
    }

    remember({
        question,
        answer,
        userId = null,
        model = "local",
        source = "ai",
        language = "tr",
        confidence = 1,
        metadata = {}
    }) {
        if (
            !MEMORY_CONFIG
                .automaticAnswerSave
        ) {
            return null;
        }

        const entry =
            this.createEntry({
                question,
                answer,
                userId,
                model,
                source,
                language,
                confidence,
                metadata
            });

        return this.add(
            entry
        );
    }

    findExact(
        question
    ) {
        const normalized =
            normalizeQuestion(
                question
            );

        if (!normalized) {
            return null;
        }

        const items =
            this.load();

        const result =
            items.find(
                item =>
                    item.normalizedQuestion ===
                    normalized
            );

        if (!result) {
            return null;
        }

        result.usageCount =
            (
                result.usageCount ||
                0
            ) + 1;

        result.lastUsedAt =
            new Date()
                .toISOString();

        this.save(items);

        return result;
    }

    findSimilar(
        question,
        threshold =
            MEMORY_CONFIG
                .similarityThreshold
    ) {
        const cleanQuestion =
            cleanText(
                question
            );

        if (
            cleanQuestion.length <
            MEMORY_CONFIG
                .minimumQuestionLength
        ) {
            return null;
        }

        const items =
            this.load();

        let best = null;

        let bestScore = 0;

        for (
            const item of items
        ) {
            const score =
                calculateSimilarity(
                    cleanQuestion,
                    item.question
                );

            if (
                score > bestScore
            ) {
                bestScore =
                    score;

                best = item;
            }
        }

        if (
            best &&
            bestScore >=
                threshold
        ) {
            best.similarity =
                bestScore;

            best.usageCount =
                (
                    best.usageCount ||
                    0
                ) + 1;

            best.lastUsedAt =
                new Date()
                    .toISOString();

            this.save(items);

            return best;
        }

        return null;
    }

    find(
        question
    ) {
        const exact =
            this.findExact(
                question
            );

        if (exact) {
            return {
                ...exact,

                matchType:
                    "exact",

                similarity: 1
            };
        }

        const similar =
            this.findSimilar(
                question
            );

        if (similar) {
            return {
                ...similar,

                matchType:
                    "similar"
            };
        }

        return null;
    }

    delete(
        id
    ) {
        const items =
            this.load();

        const filtered =
            items.filter(
                item =>
                    item.id !== id
            );

        this.save(
            filtered
        );

        return (
            filtered.length !==
            items.length
        );
    }

    clear() {
        this.save([]);

        return true;
    }

    stats() {
        const items =
            this.load();

        return {
            count:
                items.length,

            maximum:
                this.maxItems,

            enabled:
                MEMORY_CONFIG
                    .automaticAnswerSave
        };
    }
}


/* ============================================================================
   CONVERSATION MEMORY
   ============================================================================ */

class ConversationMemory {

    constructor() {
        this.file =
            MEMORY_FILES
                .conversations;

        this.maxMessages =
            MEMORY_CONFIG
                .maxConversationMessages;

        this.maxChats =
            MEMORY_CONFIG
                .maxConversationsPerUser;
    }

    load() {
        const data =
            readJSON(
                this.file,
                {}
            );

        return (
            data &&
            typeof data ===
                "object"
                ? data
                : {}
        );
    }

    save(
        data
    ) {
        return writeJSON(
            this.file,
            data
        );
    }

    ensureChat(
        userId,
        chatId
    ) {
        const data =
            this.load();

        if (!data[userId]) {
            data[userId] = {};
        }

        if (
            !data[userId][chatId]
        ) {
            data[userId][chatId] = {
                id: chatId,

                userId,

                title:
                    "Yeni sohbet",

                messages: [],

                createdAt:
                    new Date()
                        .toISOString(),

                updatedAt:
                    new Date()
                        .toISOString()
            };
        }

        return {
            data,

            chat:
                data[userId][chatId]
        };
    }

    addMessage({
        userId,
        chatId,
        role,
        content,
        metadata = {}
    }) {
        if (
            !userId ||
            !chatId
        ) {
            return null;
        }

        const result =
            this.ensureChat(
                userId,
                chatId
            );

        const data =
            result.data;

        const chat =
            result.chat;

        const message = {
            id:
                createMemoryId(
                    "message"
                ),

            role:
                role || "user",

            content:
                cleanText(
                    content
                ),

            metadata,

            createdAt:
                new Date()
                    .toISOString()
        };

        chat.messages.push(
            message
        );

        if (
            chat.messages.length >
            this.maxMessages
        ) {
            chat.messages =
                chat.messages.slice(
                    -this.maxMessages
                );
        }

        chat.updatedAt =
            new Date()
                .toISOString();

        data[userId][chatId] =
            chat;

        this.save(data);

        return message;
    }

    getChat(
        userId,
        chatId
    ) {
        const data =
            this.load();

        return (
            data[userId] &&
            data[userId][chatId]
        ) || null;
    }

    getMessages(
        userId,
        chatId,
        limit =
            MEMORY_CONFIG
                .contextMessageCount
    ) {
        const chat =
            this.getChat(
                userId,
                chatId
            );

        if (!chat) {
            return [];
        }

        return chat.messages
            .slice(-limit);
    }

    getContext(
        userId,
        chatId,
        limit =
            MEMORY_CONFIG
                .contextMessageCount
    ) {
        return this.getMessages(
            userId,
            chatId,
            limit
        ).map(
            message => ({
                role:
                    message.role,

                content:
                    message.content
            })
        );
    }

    setTitle(
        userId,
        chatId,
        title
    ) {
        const result =
            this.ensureChat(
                userId,
                chatId
            );

        result.chat.title =
            cleanText(
                title,
                200
            );

        result.chat.updatedAt =
            new Date()
                .toISOString();

        result.data[userId][chatId] =
            result.chat;

        this.save(
            result.data
        );

        return result.chat;
    }

    listChats(
        userId
    ) {
        const data =
            this.load();

        if (!data[userId]) {
            return [];
        }

        return Object.values(
            data[userId]
        ).sort(
            (
                a,
                b
            ) =>
                new Date(
                    b.updatedAt
                ) -
                new Date(
                    a.updatedAt
                )
        );
    }

    deleteChat(
        userId,
        chatId
    ) {
        const data =
            this.load();

        if (
            !data[userId] ||
            !data[userId][chatId]
        ) {
            return false;
        }

        delete data[
            userId
        ][chatId];

        this.save(
            data
        );

        return true;
    }

    clearUser(
        userId
    ) {
        const data =
            this.load();

        delete data[userId];

        this.save(
            data
        );

        return true;
    }

    stats(
        userId
    ) {
        const chats =
            this.listChats(
                userId
            );

        let messages = 0;

        for (
            const chat of chats
        ) {
            messages +=
                chat.messages
                    .length;
        }

        return {
            chats:
                chats.length,

            messages
        };
    }
}


/* ============================================================================
   USER MEMORY
   ============================================================================ */

class UserMemory {

    constructor() {
        this.file =
            MEMORY_FILES.users;

        this.maximum =
            MEMORY_CONFIG
                .maxUserMemoryItems;
    }

    load() {
        const data =
            readJSON(
                this.file,
                {}
            );

        return (
            data &&
            typeof data ===
                "object"
                ? data
                : {}
        );
    }

    save(
        data
    ) {
        return writeJSON(
            this.file,
            data
        );
    }

    ensureUser(
        userId
    ) {
        const data =
            this.load();

        if (!data[userId]) {
            data[userId] = {
                id: userId,

                memories: [],

                createdAt:
                    new Date()
                        .toISOString(),

                updatedAt:
                    new Date()
                        .toISOString()
            };
        }

        return {
            data,

            user:
                data[userId]
        };
    }

    remember({
        userId,
        key,
        value,
        type = "fact",
        importance = 1,
        source = "conversation"
    }) {
        if (
            !userId ||
            !key ||
            value === undefined
        ) {
            return null;
        }

        const result =
            this.ensureUser(
                userId
            );

        const data =
            result.data;

        const user =
            result.user;

        const normalizedKey =
            normalizeText(
                key
            );

        const existingIndex =
            user.memories.findIndex(
                item =>
                    item.normalizedKey ===
                    normalizedKey
            );

        const memory = {
            id:
                createMemoryId(
                    "user_memory"
                ),

            key:
                cleanText(
                    key,
                    200
                ),

            normalizedKey,

            value:
                cleanText(
                    String(value),
                    5000
                ),

            type,

            importance,

            source,

            updatedAt:
                new Date()
                    .toISOString()
        };

        if (
            existingIndex !==
            -1
        ) {
            memory.id =
                user.memories[
                    existingIndex
                ].id;

            user.memories[
                existingIndex
            ] = memory;
        } else {
            user.memories.unshift(
                memory
            );
        }

        user.memories =
            user.memories.slice(
                0,
                this.maximum
            );

        user.updatedAt =
            new Date()
                .toISOString();

        data[userId] =
            user;

        this.save(
            data
        );

        return memory;
    }

    get(
        userId
    ) {
        const data =
            this.load();

        if (!data[userId]) {
            return [];
        }

        return data[
            userId
        ].memories || [];
    }

    find(
        userId,
        key
    ) {
        const normalized =
            normalizeText(
                key
            );

        return this.get(
            userId
        ).find(
            item =>
                item.normalizedKey ===
                normalized
        ) || null;
    }

    remove(
        userId,
        memoryId
    ) {
        const data =
            this.load();

        if (!data[userId]) {
            return false;
        }

        const before =
            data[
                userId
            ].memories.length;

        data[
            userId
        ].memories =
            data[
                userId
            ].memories.filter(
                item =>
                    item.id !==
                    memoryId
            );

        this.save(
            data
        );

        return (
            before !==
            data[
                userId
            ].memories.length
        );
    }

    clear(
        userId
    ) {
        const data =
            this.load();

        if (data[userId]) {
            data[userId].memories =
                [];

            data[userId].updatedAt =
                new Date()
                    .toISOString();
        }

        this.save(
            data
        );

        return true;
    }

    buildContext(
        userId
    ) {
        const memories =
            this.get(
                userId
            );

        if (!memories.length) {
            return "";
        }

        return memories
            .slice(0, 50)
            .map(
                item =>
                    `${item.key}: ${item.value}`
            )
            .join("\n");
    }
}


/* ============================================================================
   KNOWLEDGE MEMORY
   ============================================================================ */

class KnowledgeMemory {

    constructor() {
        this.file =
            MEMORY_FILES
                .knowledge;

        this.maximum =
            MEMORY_CONFIG
                .maxKnowledgeItems;
    }

    load() {
        const data =
            readJSON(
                this.file,
                []
            );

        return Array.isArray(data)
            ? data
            : [];
    }

    save(
        data
    ) {
        return writeJSON(
            this.file,
            data
        );
    }

    add({
        question,
        answer,
        category = "general",
        source = "local",
        confidence = 1,
        tags = []
    }) {
        const cleanQuestion =
            cleanText(
                question
            );

        const cleanAnswer =
            cleanText(
                answer
            );

        if (
            !cleanQuestion ||
            !cleanAnswer
        ) {
            return null;
        }

        const items =
            this.load();

        const normalized =
            normalizeQuestion(
                cleanQuestion
            );

        const existingIndex =
            items.findIndex(
                item =>
                    item.normalizedQuestion ===
                    normalized
            );

        const item = {
            id:
                createMemoryId(
                    "knowledge"
                ),

            question:
                cleanQuestion,

            normalizedQuestion:
                normalized,

            answer:
                cleanAnswer,

            category,

            source,

            confidence,

            tags,

            createdAt:
                new Date()
                    .toISOString(),

            updatedAt:
                new Date()
                    .toISOString(),

            usageCount: 0
        };

        if (
            existingIndex !==
            -1
        ) {
            item.id =
                items[
                    existingIndex
                ].id;

            item.createdAt =
                items[
                    existingIndex
                ].createdAt;

            item.usageCount =
                items[
                    existingIndex
                ].usageCount || 0;

            items[
                existingIndex
            ] = item;
        } else {
            items.unshift(
                item
            );
        }

        this.save(
            items.slice(
                0,
                this.maximum
            )
        );

        return item;
    }

    find(
        question
    ) {
        const normalized =
            normalizeQuestion(
                question
            );

        if (!normalized) {
            return null;
        }

        const items =
            this.load();

        const exact =
            items.find(
                item =>
                    item.normalizedQuestion ===
                    normalized
            );

        if (exact) {
            exact.usageCount =
                (
                    exact.usageCount ||
                    0
                ) + 1;

            exact.updatedAt =
                new Date()
                    .toISOString();

            this.save(
                items
            );

            return {
                ...exact,

                matchType:
                    "exact",

                similarity: 1
            };
        }

        let best = null;

        let bestScore = 0;

        for (
            const item of items
        ) {
            const score =
                calculateSimilarity(
                    question,
                    item.question
                );

            if (
                score > bestScore
            ) {
                bestScore =
                    score;

                best =
                    item;
            }
        }

        if (
            best &&
            bestScore >=
                MEMORY_CONFIG
                    .similarityThreshold
        ) {
            best.usageCount =
                (
                    best.usageCount ||
                    0
                ) + 1;

            best.updatedAt =
                new Date()
                    .toISOString();

            this.save(
                items
            );

            return {
                ...best,

                matchType:
                    "similar",

                similarity:
                    bestScore
            };
        }

        return null;
    }

    remove(
        id
    ) {
        const items =
            this.load();

        const filtered =
            items.filter(
                item =>
                    item.id !== id
            );

        this.save(
            filtered
        );

        return (
            filtered.length !==
            items.length
        );
    }

    clear() {
        this.save([]);

        return true;
    }

    stats() {
        return {
            count:
                this.load().length,

            maximum:
                this.maximum
        };
    }
}


/* ============================================================================
   MEMORY MANAGER
   ============================================================================ */

class MemoryManager {

    constructor() {
        this.answer =
            new AnswerMemory();

        this.conversation =
            new ConversationMemory();

        this.user =
            new UserMemory();

        this.knowledge =
            new KnowledgeMemory();
    }

    findAnswer(
        question
    ) {
        const answer =
            this.answer.find(
                question
            );

        if (answer) {
            return {
                type:
                    "answer_memory",

                ...answer
            };
        }

        const knowledge =
            this.knowledge.find(
                question
            );

        if (knowledge) {
            return {
                type:
                    "knowledge_memory",

                ...knowledge
            };
        }

        return null;
    }

    saveAnswer({
        question,
        answer,
        userId = null,
        model = "local",
        source = "ai",
        confidence = 1
    }) {
        return this.answer.remember({
            question,
            answer,
            userId,
            model,
            source,
            confidence
        });
    }

    saveKnowledge({
        question,
        answer,
        category = "general",
        source = "turkai",
        confidence = 1,
        tags = []
    }) {
        if (
            !MEMORY_CONFIG
                .automaticKnowledgeSave
        ) {
            return null;
        }

        return this.knowledge.add({
            question,
            answer,
            category,
            source,
            confidence,
            tags
        });
    }

    addConversationMessage(
        options
    ) {
        return this.conversation
            .addMessage(
                options
            );
    }

    getConversationContext(
        userId,
        chatId,
        limit = 30
    ) {
        return this.conversation
            .getContext(
                userId,
                chatId,
                limit
            );
    }

    rememberUser(
        options
    ) {
        return this.user.remember(
            options
        );
    }

    getUserMemory(
        userId
    ) {
        return this.user.get(
            userId
        );
    }

    buildUserContext(
        userId
    ) {
        return this.user
            .buildContext(
                userId
            );
    }

    getFullContext({
        userId,
        chatId,
        question
    }) {
        const answer =
            this.findAnswer(
                question
            );

        const conversation =
            this.getConversationContext(
                userId,
                chatId
            );

        const userMemory =
            this.getUserMemory(
                userId
            );

        return {
            cachedAnswer:
                answer,

            conversation,

            userMemory
        };
    }

    clearUserMemory(
        userId
    ) {
        this.user.clear(
            userId
        );

        return this.conversation
            .clearUser(
                userId
            );
    }

    statistics(
        userId
    ) {
        return {
            answers:
                this.answer.stats(),

            knowledge:
                this.knowledge.stats(),

            conversations:
                this.conversation
                    .stats(
                        userId
                    ),

            userMemory:
                this.user.get(
                    userId
                ).length
        };
    }
}


/* ============================================================================
   SINGLETON MEMORY SYSTEM
   ============================================================================ */

const memoryManager =
    new MemoryManager();


/* ============================================================================
   MEMORY API ROUTES
   ============================================================================ */

function registerMemoryRoutes(
    app
) {

    app.get(
        "/api/memory/stats",
        (req, res) => {
            const userId =
                String(
                    req.query.userId ||
                    "anonymous"
                );

            return res.json({
                success: true,

                memory:
                    memoryManager
                        .statistics(
                            userId
                        )
            });
        }
    );


    app.get(
        "/api/memory/user",
        (req, res) => {
            const userId =
                String(
                    req.query.userId ||
                    "anonymous"
                );

            return res.json({
                success: true,

                memories:
                    memoryManager
                        .getUserMemory(
                            userId
                        )
            });
        }
    );


    app.post(
        "/api/memory/user",
        (req, res) => {
            const {
                userId,
                key,
                value,
                type,
                importance
            } = req.body || {};

            if (
                !userId ||
                !key ||
                value === undefined
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "userId, key ve value gerekli."
                    });
            }

            const memory =
                memoryManager
                    .rememberUser({
                        userId,
                        key,
                        value,
                        type,
                        importance
                    });

            return res.json({
                success: true,

                memory
            });
        }
    );


    app.delete(
        "/api/memory/user/:userId/:memoryId",
        (req, res) => {
            const removed =
                memoryManager
                    .user
                    .remove(
                        req.params.userId,
                        req.params.memoryId
                    );

            return res.json({
                success: removed
            });
        }
    );


    app.delete(
        "/api/memory/user/:userId",
        (req, res) => {
            const userId =
                req.params.userId;

            memoryManager
                .clearUserMemory(
                    userId
                );

            return res.json({
                success: true,

                message:
                    "Kullanıcı hafızası temizlendi."
            });
        }
    );


    app.get(
        "/api/memory/answer",
        (req, res) => {
            const question =
                cleanText(
                    req.query.question
                );

            if (!question) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "question gerekli."
                    });
            }

            const result =
                memoryManager
                    .findAnswer(
                        question
                    );

            return res.json({
                success: true,

                found:
                    Boolean(result),

                result
            });
        }
    );


    app.post(
        "/api/memory/answer",
        (req, res) => {
            const {
                question,
                answer,
                userId,
                model,
                source,
                confidence
            } = req.body || {};

            if (
                !question ||
                !answer
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "question ve answer gerekli."
                    });
            }

            const result =
                memoryManager
                    .saveAnswer({
                        question,
                        answer,
                        userId,
                        model,
                        source,
                        confidence
                    });

            return res.json({
                success: true,

                memory:
                    result
            });
        }
    );


    app.post(
        "/api/memory/knowledge",
        (req, res) => {
            const {
                question,
                answer,
                category,
                source,
                confidence,
                tags
            } = req.body || {};

            if (
                !question ||
                !answer
            ) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "question ve answer gerekli."
                    });
            }

            const result =
                memoryManager
                    .saveKnowledge({
                        question,
                        answer,
                        category,
                        source,
                        confidence,
                        tags
                    });

            return res.json({
                success: true,

                memory:
                    result
            });
        }
    );


    app.get(
        "/api/memory/chat",
        (req, res) => {
            const userId =
                String(
                    req.query.userId ||
                    "anonymous"
                );

            const chatId =
                String(
                    req.query.chatId ||
                    ""
                );

            if (!chatId) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "chatId gerekli."
                    });
            }

            return res.json({
                success: true,

                messages:
                    memoryManager
                        .conversation
                        .getMessages(
                            userId,
                            chatId
                        )
            });
        }
    );


    app.delete(
        "/api/memory/chat",
        (req, res) => {
            const userId =
                String(
                    req.query.userId ||
                    "anonymous"
                );

            const chatId =
                String(
                    req.query.chatId ||
                    ""
                );

            if (!chatId) {
                return res
                    .status(400)
                    .json({
                        success: false,

                        error:
                            "chatId gerekli."
                    });
            }

            const removed =
                memoryManager
                    .conversation
                    .deleteChat(
                        userId,
                        chatId
                    );

            return res.json({
                success:
                    removed
            });
        }
    );
}


/* ============================================================================
   EXPORT
   ============================================================================ */

module.exports = {
    AnswerMemory,

    ConversationMemory,

    UserMemory,

    KnowledgeMemory,

    MemoryManager,

    memoryManager,

    registerMemoryRoutes,

    normalizeText,

    normalizeQuestion,

    calculateSimilarity,

    jaccardSimilarity,

    cosineSimilarity
};


/* ============================================================================
   PART 2 READY
   ============================================================================ */
// ============================================================
// TürkAI — PART 3
// DOSYA: src/voice/voiceEngine.js
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const EventEmitter = require("events");

// ============================================================
// PATHS
// ============================================================

const ROOT_DIR = path.resolve(__dirname, "../../");

const SRC_DIR = path.join(ROOT_DIR, "src");
const DATA_DIR = path.join(ROOT_DIR, "data");
const VOICE_DIR = path.join(DATA_DIR, "voice");
const TEMP_DIR = path.join(ROOT_DIR, "temp");

const VOICE_LOG_FILE = path.join(VOICE_DIR, "voice_logs.json");
const VOICE_SETTINGS_FILE = path.join(VOICE_DIR, "voice_settings.json");
const VOICE_USAGE_FILE = path.join(VOICE_DIR, "voice_usage.json");

// ============================================================
// DIRECTORIES
// ============================================================

[
    SRC_DIR,
    DATA_DIR,
    VOICE_DIR,
    TEMP_DIR
].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
});

// ============================================================
// DEFAULT CONFIG
// ============================================================

const VOICE_CONFIG = {
    enabled: true,

    input: {
        enabled: true,
        maxTextLength: 10000,
        supportedLanguages: [
            "tr-TR",
            "en-US",
            "de-DE",
            "fr-FR",
            "es-ES",
            "it-IT",
            "pt-BR",
            "ru-RU",
            "ar-SA",
            "ja-JP",
            "ko-KR",
            "zh-CN"
        ]
    },

    output: {
        enabled: true,
        defaultLanguage: "tr-TR",
        defaultRate: 1,
        defaultPitch: 1,
        defaultVolume: 1,
        minRate: 0.5,
        maxRate: 2,
        minPitch: 0,
        maxPitch: 2,
        minVolume: 0,
        maxVolume: 1
    },

    limits: {
        free: {
            dailyCharacters: 5000,
            dailyRequests: 50
        },

        pro: {
            dailyCharacters: 25000,
            dailyRequests: 150
        },

        plus: {
            dailyCharacters: 75000,
            dailyRequests: 400
        },

        ultra: {
            dailyCharacters: 250000,
            dailyRequests: 1000
        },

        developer: {
            dailyCharacters: 1000000,
            dailyRequests: 10000
        }
    },

    cache: {
        enabled: true,
        maxItems: 500,
        maxTextLength: 5000
    },

    logs: {
        enabled: true,
        maxEntries: 5000
    }
};

// ============================================================
// JSON STORAGE
// ============================================================

function safeClone(value) {
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return safeClone(fallback);
        }

        const raw = fs.readFileSync(file, "utf8");

        if (!raw.trim()) {
            return safeClone(fallback);
        }

        return JSON.parse(raw);
    } catch {
        return safeClone(fallback);
    }
}

function writeJSON(file, data) {
    try {
        const dir = path.dirname(file);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        const tempFile =
            `${file}.${process.pid}.${Date.now()}.tmp`;

        fs.writeFileSync(
            tempFile,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        fs.renameSync(tempFile, file);

        return true;
    } catch (error) {
        console.error(
            "[TürkAI Voice] JSON write error:",
            error.message
        );

        return false;
    }
}

function ensureJSON(file, fallback) {
    if (!fs.existsSync(file)) {
        writeJSON(file, fallback);
    }

    return readJSON(file, fallback);
}

// ============================================================
// DEFAULT FILES
// ============================================================

ensureJSON(VOICE_LOG_FILE, []);
ensureJSON(VOICE_USAGE_FILE, {});
ensureJSON(
    VOICE_SETTINGS_FILE,
    {
        enabled: true,
        defaultLanguage: VOICE_CONFIG.output.defaultLanguage,
        defaultRate: VOICE_CONFIG.output.defaultRate,
        defaultPitch: VOICE_CONFIG.output.defaultPitch,
        defaultVolume: VOICE_CONFIG.output.defaultVolume,
        autoSpeak: false
    }
);

// ============================================================
// HELPERS
// ============================================================

function createId(prefix = "voice") {
    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")}`;
}

function normalizeText(value) {
    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function clamp(value, min, max) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.min(
        max,
        Math.max(min, number)
    );
}

function getDayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getUserKey(userId) {
    if (!userId) {
        return "anonymous";
    }

    return String(userId)
        .trim()
        .slice(0, 200);
}

function normalizeLanguage(language) {
    if (!language) {
        return VOICE_CONFIG.output.defaultLanguage;
    }

    const value = String(language).trim();

    if (
        VOICE_CONFIG.input.supportedLanguages
            .includes(value)
    ) {
        return value;
    }

    const base = value.split("-")[0].toLowerCase();

    const found =
        VOICE_CONFIG.input.supportedLanguages.find(
            (item) =>
                item.split("-")[0].toLowerCase() === base
        );

    return found ||
        VOICE_CONFIG.output.defaultLanguage;
}

// ============================================================
// VOICE CACHE
// ============================================================

class VoiceCache {
    constructor() {
        this.items = new Map();
    }

    createKey(text, options = {}) {
        const payload = JSON.stringify({
            text,
            language: options.language,
            rate: options.rate,
            pitch: options.pitch,
            volume: options.volume,
            voice: options.voice || null
        });

        return crypto
            .createHash("sha256")
            .update(payload)
            .digest("hex");
    }

    get(text, options = {}) {
        if (!VOICE_CONFIG.cache.enabled) {
            return null;
        }

        const key = this.createKey(
            text,
            options
        );

        const item = this.items.get(key);

        if (!item) {
            return null;
        }

        item.lastUsed = Date.now();

        return safeClone(item);
    }

    set(text, options = {}, data = {}) {
        if (!VOICE_CONFIG.cache.enabled) {
            return;
        }

        if (
            text.length >
            VOICE_CONFIG.cache.maxTextLength
        ) {
            return;
        }

        const key = this.createKey(
            text,
            options
        );

        this.items.set(
            key,
            {
                key,
                text,
                options: safeClone(options),
                data: safeClone(data),
                createdAt: Date.now(),
                lastUsed: Date.now()
            }
        );

        this.cleanup();
    }

    cleanup() {
        const max =
            VOICE_CONFIG.cache.maxItems;

        if (this.items.size <= max) {
            return;
        }

        const sorted =
            [...this.items.values()]
                .sort(
                    (a, b) =>
                        a.lastUsed -
                        b.lastUsed
                );

        const removeCount =
            this.items.size - max;

        for (let i = 0; i < removeCount; i++) {
            this.items.delete(
                sorted[i].key
            );
        }
    }

    clear() {
        this.items.clear();
    }

    size() {
        return this.items.size;
    }
}

const voiceCache = new VoiceCache();

// ============================================================
// VOICE USAGE ENGINE
// ============================================================

class VoiceUsage {
    constructor() {
        this.data =
            ensureJSON(
                VOICE_USAGE_FILE,
                {}
            );
    }

    save() {
        writeJSON(
            VOICE_USAGE_FILE,
            this.data
        );
    }

    get(userId) {
        const userKey =
            getUserKey(userId);

        const day =
            getDayKey();

        if (!this.data[userKey]) {
            this.data[userKey] = {};
        }

        if (!this.data[userKey][day]) {
            this.data[userKey][day] = {
                characters: 0,
                requests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                updatedAt: Date.now()
            };
        }

        return this.data[userKey][day];
    }

    canUse(
        userId,
        plan = "free",
        characterCount = 0
    ) {
        const usage =
            this.get(userId);

        const limits =
            VOICE_CONFIG.limits[
                String(plan).toLowerCase()
            ] ||
            VOICE_CONFIG.limits.free;

        return {
            allowed:
                usage.characters +
                characterCount <=
                    limits.dailyCharacters &&
                usage.requests + 1 <=
                    limits.dailyRequests,

            charactersRemaining:
                Math.max(
                    0,
                    limits.dailyCharacters -
                    usage.characters
                ),

            requestsRemaining:
                Math.max(
                    0,
                    limits.dailyRequests -
                    usage.requests
                ),

            limits: safeClone(limits),
            usage: safeClone(usage)
        };
    }

    consume(
        userId,
        characterCount,
        success = true
    ) {
        const usage =
            this.get(userId);

        usage.characters +=
            Number(characterCount) || 0;

        usage.requests += 1;

        if (success) {
            usage.successfulRequests += 1;
        } else {
            usage.failedRequests += 1;
        }

        usage.updatedAt =
            Date.now();

        this.save();

        return safeClone(usage);
    }

    resetUser(userId) {
        const userKey =
            getUserKey(userId);

        delete this.data[userKey];

        this.save();

        return true;
    }

    stats() {
        const result = {
            users: 0,
            characters: 0,
            requests: 0,
            successfulRequests: 0,
            failedRequests: 0
        };

        for (
            const userDays of
            Object.values(this.data)
        ) {
            result.users++;

            for (
                const usage of
                Object.values(userDays)
            ) {
                result.characters +=
                    usage.characters || 0;

                result.requests +=
                    usage.requests || 0;

                result.successfulRequests +=
                    usage.successfulRequests || 0;

                result.failedRequests +=
                    usage.failedRequests || 0;
            }
        }

        return result;
    }
}

const voiceUsage =
    new VoiceUsage();

// ============================================================
// VOICE LOG ENGINE
// ============================================================

class VoiceLogger {
    constructor() {
        this.logs =
            ensureJSON(
                VOICE_LOG_FILE,
                []
            );
    }

    save() {
        if (!VOICE_CONFIG.logs.enabled) {
            return;
        }

        if (
            this.logs.length >
            VOICE_CONFIG.logs.maxEntries
        ) {
            this.logs =
                this.logs.slice(
                    -VOICE_CONFIG.logs.maxEntries
                );
        }

        writeJSON(
            VOICE_LOG_FILE,
            this.logs
        );
    }

    add(type, data = {}) {
        if (!VOICE_CONFIG.logs.enabled) {
            return null;
        }

        const entry = {
            id: createId("vlog"),
            type,
            timestamp: new Date().toISOString(),
            data: safeClone(data)
        };

        this.logs.push(entry);
        this.save();

        return entry;
    }

    recent(limit = 100) {
        return this.logs
            .slice(-Math.max(
                1,
                Math.min(
                    Number(limit) || 100,
                    500
                )
            ))
            .reverse();
    }

    clear() {
        this.logs = [];
        this.save();
    }
}

const voiceLogger =
    new VoiceLogger();

// ============================================================
// VOICE SETTINGS
// ============================================================

class VoiceSettings {
    constructor() {
        this.settings =
            ensureJSON(
                VOICE_SETTINGS_FILE,
                {}
            );
    }

    get() {
        return safeClone(
            this.settings
        );
    }

    update(values = {}) {
        if (
            typeof values !==
            "object" ||
            values === null
        ) {
            return this.get();
        }

        if (
            typeof values.enabled ===
            "boolean"
        ) {
            this.settings.enabled =
                values.enabled;
        }

        if (
            values.defaultLanguage
        ) {
            this.settings.defaultLanguage =
                normalizeLanguage(
                    values.defaultLanguage
                );
        }

        if (
            values.defaultRate !==
            undefined
        ) {
            this.settings.defaultRate =
                clamp(
                    values.defaultRate,
                    VOICE_CONFIG.output.minRate,
                    VOICE_CONFIG.output.maxRate
                );
        }

        if (
            values.defaultPitch !==
            undefined
        ) {
            this.settings.defaultPitch =
                clamp(
                    values.defaultPitch,
                    VOICE_CONFIG.output.minPitch,
                    VOICE_CONFIG.output.maxPitch
                );
        }

        if (
            values.defaultVolume !==
            undefined
        ) {
            this.settings.defaultVolume =
                clamp(
                    values.defaultVolume,
                    VOICE_CONFIG.output.minVolume,
                    VOICE_CONFIG.output.maxVolume
                );
        }

        if (
            typeof values.autoSpeak ===
            "boolean"
        ) {
            this.settings.autoSpeak =
                values.autoSpeak;
        }

        writeJSON(
            VOICE_SETTINGS_FILE,
            this.settings
        );

        return this.get();
    }
}

const voiceSettings =
    new VoiceSettings();

// ============================================================
// SPEECH TEXT PREPROCESSOR
// ============================================================

class SpeechTextProcessor {
    clean(text) {
        let value =
            normalizeText(text);

        if (!value) {
            return "";
        }

        value =
            value.replace(
                /https?:\/\/\S+/gi,
                " bağlantı "
            );

        value =
            value.replace(
                /www\.\S+/gi,
                " bağlantı "
            );

        value =
            value.replace(
                /```[\s\S]*?```/g,
                " kod bloğu "
            );

        value =
            value.replace(
                /`([^`]+)`/g,
                "$1"
            );

        value =
            value.replace(
                /[*_~#]+/g,
                ""
            );

        value =
            value.replace(
                /\[(.*?)\]\((.*?)\)/g,
                "$1"
            );

        value =
            value.replace(
                /https?:\/\/\S+/gi,
                ""
            );

        value =
            value.replace(
                /\s{2,}/g,
                " "
            );

        if (
            value.length >
            VOICE_CONFIG.input.maxTextLength
        ) {
            value =
                value.slice(
                    0,
                    VOICE_CONFIG.input.maxTextLength
                );
        }

        return value.trim();
    }

    split(text, maxLength = 1000) {
        const value =
            this.clean(text);

        if (!value) {
            return [];
        }

        if (
            value.length <=
            maxLength
        ) {
            return [value];
        }

        const sentences =
            value.split(
                /(?<=[.!?。！？])\s+/
            );

        const chunks = [];
        let current = "";

        for (
            const sentence of sentences
        ) {
            if (
                current.length +
                sentence.length +
                1 <=
                maxLength
            ) {
                current =
                    current
                        ? `${current} ${sentence}`
                        : sentence;
            } else {
                if (current) {
                    chunks.push(current);
                }

                if (
                    sentence.length >
                    maxLength
                ) {
                    for (
                        let i = 0;
                        i < sentence.length;
                        i += maxLength
                    ) {
                        chunks.push(
                            sentence.slice(
                                i,
                                i + maxLength
                            )
                        );
                    }

                    current = "";
                } else {
                    current =
                        sentence;
                }
            }
        }

        if (current) {
            chunks.push(current);
        }

        return chunks;
    }

    estimateDuration(text, rate = 1) {
        const characters =
            text.length;

        const base =
            Math.max(
                1,
                characters / 14
            );

        return Math.round(
            base /
            Math.max(
                0.5,
                Number(rate) || 1
            )
        );
    }
}

const speechProcessor =
    new SpeechTextProcessor();

// ============================================================
// VOICE ENGINE
// ============================================================

class VoiceEngine extends EventEmitter {
    constructor() {
        super();

        this.enabled =
            VOICE_CONFIG.enabled;

        this.cache =
            voiceCache;

        this.usage =
            voiceUsage;

        this.logger =
            voiceLogger;

        this.settings =
            voiceSettings;

        this.processor =
            speechProcessor;
    }

    isEnabled() {
        return this.enabled;
    }

    enable() {
        this.enabled = true;

        this.emit(
            "enabled"
        );

        return true;
    }

    disable() {
        this.enabled = false;

        this.emit(
            "disabled"
        );

        return true;
    }

    validateRequest(input = {}) {
        const text =
            this.processor.clean(
                input.text
            );

        if (!text) {
            return {
                valid: false,
                error: "Seslendirilecek metin bulunamadı."
            };
        }

        if (
            text.length >
            VOICE_CONFIG.input.maxTextLength
        ) {
            return {
                valid: false,
                error: "Metin izin verilen maksimum uzunluğu aşıyor."
            };
        }

        return {
            valid: true,
            text
        };
    }

    normalizeOptions(input = {}) {
        const settings =
            this.settings.get();

        return {
            language:
                normalizeLanguage(
                    input.language ||
                    settings.defaultLanguage
                ),

            rate:
                clamp(
                    input.rate ??
                    settings.defaultRate,
                    VOICE_CONFIG.output.minRate,
                    VOICE_CONFIG.output.maxRate
                ),

            pitch:
                clamp(
                    input.pitch ??
                    settings.defaultPitch,
                    VOICE_CONFIG.output.minPitch,
                    VOICE_CONFIG.output.maxPitch
                ),

            volume:
                clamp(
                    input.volume ??
                    settings.defaultVolume,
                    VOICE_CONFIG.output.minVolume,
                    VOICE_CONFIG.output.maxVolume
                ),

            voice:
                input.voice
                    ? String(input.voice).slice(0, 200)
                    : null
        };
    }

    checkLimit(
        userId,
        plan,
        text
    ) {
        return this.usage.canUse(
            userId,
            plan,
            text.length
        );
    }

    prepare(
        input = {}
    ) {
        if (!this.enabled) {
            return {
                success: false,
                error: "Ses sistemi devre dışı."
            };
        }

        const validation =
            this.validateRequest(
                input
            );

        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        const options =
            this.normalizeOptions(
                input
            );

        const userId =
            input.userId ||
            "anonymous";

        const plan =
            String(
                input.plan ||
                "free"
            ).toLowerCase();

        const limit =
            this.checkLimit(
                userId,
                plan,
                validation.text
            );

        if (!limit.allowed) {
            return {
                success: false,
                error:
                    "Günlük ses kullanım limitine ulaşıldı.",
                code: "VOICE_LIMIT",
                usage: limit
            };
        }

        return {
            success: true,
            text: validation.text,
            options,
            userId,
            plan,
            limit
        };
    }

    synthesize(
        input = {}
    ) {
        const prepared =
            this.prepare(input);

        if (!prepared.success) {
            this.logger.add(
                "synthesis_failed",
                {
                    userId:
                        input.userId ||
                        "anonymous",
                    reason:
                        prepared.error
                }
            );

            return prepared;
        }

        const {
            text,
            options,
            userId,
            plan
        } = prepared;

        const cached =
            this.cache.get(
                text,
                options
            );

        if (cached) {
            this.usage.consume(
                userId,
                text.length,
                true
            );

            this.logger.add(
                "synthesis_cache_hit",
                {
                    userId,
                    plan,
                    characters:
                        text.length,
                    language:
                        options.language
                }
            );

            return {
                success: true,
                cached: true,
                id: createId("speech"),
                text,
                options,
                estimatedDuration:
                    this.processor
                        .estimateDuration(
                            text,
                            options.rate
                        ),
                engine:
                    "browser-speech-compatible"
            };
        }

        const chunks =
            this.processor.split(
                text,
                1000
            );

        const result = {
            success: true,
            cached: false,
            id: createId("speech"),
            text,
            chunks,
            options,
            estimatedDuration:
                this.processor
                    .estimateDuration(
                        text,
                        options.rate
                    ),
            engine:
                "browser-speech-compatible",
            createdAt:
                new Date().toISOString()
        };

        this.cache.set(
            text,
            options,
            result
        );

        this.usage.consume(
            userId,
            text.length,
            true
        );

        this.logger.add(
            "synthesis_success",
            {
                id: result.id,
                userId,
                plan,
                characters:
                    text.length,
                chunks:
                    chunks.length,
                language:
                    options.language
            }
        );

        this.emit(
            "speech",
            result
        );

        return result;
    }

    prepareRecognition(
        input = {}
    ) {
        if (!this.enabled) {
            return {
                success: false,
                error:
                    "Ses tanıma sistemi devre dışı."
            };
        }

        const language =
            normalizeLanguage(
                input.language
            );

        const userId =
            input.userId ||
            "anonymous";

        const plan =
            String(
                input.plan ||
                "free"
            ).toLowerCase();

        const limit =
            this.usage.canUse(
                userId,
                plan,
                0
            );

        if (!limit.allowed) {
            return {
                success: false,
                error:
                    "Günlük ses tanıma limitine ulaşıldı.",
                code:
                    "VOICE_LIMIT",
                usage:
                    limit
            };
        }

        const session = {
            success: true,
            sessionId:
                createId("recognition"),
            userId,
            plan,
            language,
            continuous:
                Boolean(
                    input.continuous
                ),
            interimResults:
                input.interimResults !==
                false,
            maxAlternatives:
                Math.max(
                    1,
                    Math.min(
                        5,
                        Number(
                            input.maxAlternatives
                        ) || 1
                    )
                ),
            createdAt:
                new Date().toISOString()
        };

        this.logger.add(
            "recognition_started",
            {
                sessionId:
                    session.sessionId,
                userId,
                language
            }
        );

        return session;
    }

    finishRecognition(
        input = {}
    ) {
        const text =
            this.processor.clean(
                input.text
            );

        const userId =
            input.userId ||
            "anonymous";

        if (!text) {
            return {
                success: false,
                error:
                    "Ses tanıma sonucu boş."
            };
        }

        this.usage.consume(
            userId,
            text.length,
            true
        );

        const result = {
            success: true,
            sessionId:
                input.sessionId ||
                null,
            text,
            language:
                normalizeLanguage(
                    input.language
                ),
            confidence:
                Number.isFinite(
                    Number(input.confidence)
                )
                    ? clamp(
                        input.confidence,
                        0,
                        1
                    )
                    : null,
            timestamp:
                new Date().toISOString()
        };

        this.logger.add(
            "recognition_finished",
            {
                sessionId:
                    result.sessionId,
                userId,
                characters:
                    text.length,
                language:
                    result.language
            }
        );

        this.emit(
            "recognition",
            result
        );

        return result;
    }

    getStatus() {
        return {
            enabled:
                this.enabled,
            inputEnabled:
                VOICE_CONFIG.input.enabled,
            outputEnabled:
                VOICE_CONFIG.output.enabled,
            supportedLanguages:
                [
                    ...VOICE_CONFIG
                        .input
                        .supportedLanguages
                ],
            cacheSize:
                this.cache.size(),
            settings:
                this.settings.get()
        };
    }

    getUsage(userId) {
        return this.usage.get(
            userId
        );
    }

    getStats() {
        return {
            usage:
                this.usage.stats(),
            cache:
                this.cache.size(),
            logs:
                this.logger.logs.length
        };
    }
}

const voiceEngine =
    new VoiceEngine();

// ============================================================
// VOICE ROUTES
// ============================================================

function registerVoiceRoutes(
    app
) {
    if (!app || typeof app.get !== "function") {
        throw new Error(
            "registerVoiceRoutes için geçerli Express app gerekli."
        );
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    app.get(
        "/api/voice/status",
        (req, res) => {
            res.json({
                success: true,
                app: "TürkAI",
                voice:
                    voiceEngine.getStatus()
            });
        }
    );

    // --------------------------------------------------------
    // SETTINGS
    // --------------------------------------------------------

    app.get(
        "/api/voice/settings",
        (req, res) => {
            res.json({
                success: true,
                settings:
                    voiceSettings.get()
            });
        }
    );

    app.post(
        "/api/voice/settings",
        (req, res) => {
            try {
                const settings =
                    voiceSettings.update(
                        req.body || {}
                    );

                res.json({
                    success: true,
                    settings
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error:
                        "Ses ayarları kaydedilemedi."
                });
            }
        }
    );

    // --------------------------------------------------------
    // TEXT TO SPEECH
    // --------------------------------------------------------

    app.post(
        "/api/voice/speak",
        (req, res) => {
            try {
                const body =
                    req.body || {};

                const result =
                    voiceEngine.synthesize({
                        text:
                            body.text,
                        language:
                            body.language,
                        rate:
                            body.rate,
                        pitch:
                            body.pitch,
                        volume:
                            body.volume,
                        voice:
                            body.voice,
                        userId:
                            body.userId ||
                            req.user?.id ||
                            req.body?.userId ||
                            "anonymous",
                        plan:
                            body.plan ||
                            req.user?.plan ||
                            "free"
                    });

                if (!result.success) {
                    return res.status(
                        result.code ===
                        "VOICE_LIMIT"
                            ? 429
                            : 400
                    ).json(result);
                }

                return res.json(
                    result
                );
            } catch (error) {
                voiceLogger.add(
                    "route_error",
                    {
                        route:
                            "/api/voice/speak",
                        error:
                            error.message
                    }
                );

                return res.status(500).json({
                    success: false,
                    error:
                        "Ses oluşturulurken hata oluştu."
                });
            }
        }
    );

    // --------------------------------------------------------
    // SPEECH RECOGNITION SESSION
    // --------------------------------------------------------

    app.post(
        "/api/voice/recognition/start",
        (req, res) => {
            try {
                const body =
                    req.body || {};

                const result =
                    voiceEngine
                        .prepareRecognition({
                            language:
                                body.language,
                            continuous:
                                body.continuous,
                            interimResults:
                                body.interimResults,
                            maxAlternatives:
                                body.maxAlternatives,
                            userId:
                                body.userId ||
                                req.user?.id ||
                                "anonymous",
                            plan:
                                body.plan ||
                                req.user?.plan ||
                                "free"
                        });

                if (!result.success) {
                    return res.status(
                        result.code ===
                        "VOICE_LIMIT"
                            ? 429
                            : 400
                    ).json(result);
                }

                return res.json(
                    result
                );
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error:
                        "Ses tanıma başlatılamadı."
                });
            }
        }
    );

    // --------------------------------------------------------
    // SPEECH RECOGNITION RESULT
    // --------------------------------------------------------

    app.post(
        "/api/voice/recognition/finish",
        (req, res) => {
            try {
                const body =
                    req.body || {};

                const result =
                    voiceEngine
                        .finishRecognition({
                            sessionId:
                                body.sessionId,
                            text:
                                body.text,
                            language:
                                body.language,
                            confidence:
                                body.confidence,
                            userId:
                                body.userId ||
                                req.user?.id ||
                                "anonymous"
                        });

                if (!result.success) {
                    return res.status(400)
                        .json(result);
                }

                return res.json(
                    result
                );
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error:
                        "Ses tanıma sonucu işlenemedi."
                });
            }
        }
    );

    // --------------------------------------------------------
    // USER USAGE
    // --------------------------------------------------------

    app.get(
        "/api/voice/usage",
        (req, res) => {
            const userId =
                req.query.userId ||
                req.user?.id ||
                "anonymous";

            res.json({
                success: true,
                userId,
                usage:
                    voiceEngine.getUsage(
                        userId
                    )
            });
        }
    );

    // --------------------------------------------------------
    // ADMIN STATS
    // --------------------------------------------------------

    app.get(
        "/api/voice/stats",
        (req, res) => {
            res.json({
                success: true,
                stats:
                    voiceEngine.getStats()
            });
        }
    );

    // --------------------------------------------------------
    // RECENT LOGS
    // --------------------------------------------------------

    app.get(
        "/api/voice/logs",
        (req, res) => {
            const limit =
                Math.max(
                    1,
                    Math.min(
                        200,
                        Number(
                            req.query.limit
                        ) || 50
                    )
                );

            res.json({
                success: true,
                logs:
                    voiceLogger.recent(
                        limit
                    )
            });
        }
    );

    // --------------------------------------------------------
    // CLEAR CACHE
    // --------------------------------------------------------

    app.post(
        "/api/voice/cache/clear",
        (req, res) => {
            voiceCache.clear();

            res.json({
                success: true,
                message:
                    "Ses önbelleği temizlendi."
            });
        }
    );

    return app;
}

// ============================================================
// SOCKET.IO VOICE SUPPORT
// ============================================================

function registerVoiceSocket(
    io
) {
    if (
        !io ||
        typeof io.on !== "function"
    ) {
        return;
    }

    io.on(
        "connection",
        (socket) => {
            socket.on(
                "voice:status",
                () => {
                    socket.emit(
                        "voice:status",
                        voiceEngine
                            .getStatus()
                    );
                }
            );

            socket.on(
                "voice:speak",
                (payload = {}) => {
                    try {
                        const result =
                            voiceEngine.synthesize({
                                ...payload,
                                userId:
                                    payload.userId ||
                                    socket.id
                            });

                        socket.emit(
                            "voice:speak:result",
                            result
                        );
                    } catch (error) {
                        socket.emit(
                            "voice:speak:result",
                            {
                                success: false,
                                error:
                                    "Ses işlemi başarısız."
                            }
                        );
                    }
                }
            );

            socket.on(
                "voice:recognition:start",
                (payload = {}) => {
                    try {
                        const result =
                            voiceEngine
                                .prepareRecognition({
                                    ...payload,
                                    userId:
                                        payload.userId ||
                                        socket.id
                                });

                        socket.emit(
                            "voice:recognition:started",
                            result
                        );
                    } catch (error) {
                        socket.emit(
                            "voice:recognition:started",
                            {
                                success: false,
                                error:
                                    "Ses tanıma başlatılamadı."
                            }
                        );
                    }
                }
            );

            socket.on(
                "voice:recognition:finish",
                (payload = {}) => {
                    try {
                        const result =
                            voiceEngine
                                .finishRecognition({
                                    ...payload,
                                    userId:
                                        payload.userId ||
                                        socket.id
                                });

                        socket.emit(
                            "voice:recognition:result",
                            result
                        );
                    } catch (error) {
                        socket.emit(
                            "voice:recognition:result",
                            {
                                success: false,
                                error:
                                    "Ses sonucu işlenemedi."
                            }
                        );
                    }
                }
            );
        }
    );
}

// ============================================================
// BROWSER SPEECH CONFIG
// ============================================================

function getBrowserSpeechConfig(
    options = {}
) {
    const normalized = {
        language:
            normalizeLanguage(
                options.language
            ),

        rate:
            clamp(
                options.rate ??
                VOICE_CONFIG.output.defaultRate,
                VOICE_CONFIG.output.minRate,
                VOICE_CONFIG.output.maxRate
            ),

        pitch:
            clamp(
                options.pitch ??
                VOICE_CONFIG.output.defaultPitch,
                VOICE_CONFIG.output.minPitch,
                VOICE_CONFIG.output.maxPitch
            ),

        volume:
            clamp(
                options.volume ??
                VOICE_CONFIG.output.defaultVolume,
                VOICE_CONFIG.output.minVolume,
                VOICE_CONFIG.output.maxVolume
            )
    };

    return {
        ...normalized,

        clientScript: `
(() => {
    if (!("speechSynthesis" in window)) {
        return {
            supported: false,
            error: "Tarayıcı ses sentezini desteklemiyor."
        };
    }

    const text = ${JSON.stringify(
        options.text || ""
    )};

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang =
        ${JSON.stringify(
            normalized.language
        )};

    utterance.rate =
        ${JSON.stringify(
            normalized.rate
        )};

    utterance.pitch =
        ${JSON.stringify(
            normalized.pitch
        )};

    utterance.volume =
        ${JSON.stringify(
            normalized.volume
        )};

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);

    return {
        supported: true
    };
})();
`
    };
}

// ============================================================
// VOICE COMMAND PARSER
// ============================================================

class VoiceCommandParser {
    constructor() {
        this.commands = new Map();

        this.registerDefaults();
    }

    register(
        name,
        patterns,
        handler
    ) {
        this.commands.set(
            name,
            {
                patterns,
                handler
            }
        );
    }

    registerDefaults() {
        this.register(
            "stop",
            [
                "dur",
                "sesi durdur",
                "konuşmayı durdur",
                "sus"
            ],
            () => ({
                action: "stop_speech"
            })
        );

        this.register(
            "repeat",
            [
                "tekrar söyle",
                "tekrar et",
                "yeniden söyle"
            ],
            () => ({
                action: "repeat_last"
            })
        );

        this.register(
            "new_chat",
            [
                "yeni sohbet",
                "yeni konuşma",
                "yeni sohbet aç"
            ],
            () => ({
                action: "new_chat"
            })
        );

        this.register(
            "clear_chat",
            [
                "sohbeti temizle",
                "konuşmayı temizle",
                "mesajları temizle"
            ],
            () => ({
                action: "clear_chat"
            })
        );

        this.register(
            "research",
            [
                "araştır",
                "internette araştır",
                "webde araştır",
                "internetten bak"
            ],
            () => ({
                action: "research"
            })
        );

        this.register(
            "weather",
            [
                "hava durumu",
                "hava nasıl",
                "bugün hava nasıl"
            ],
            () => ({
                action: "weather"
            })
        );
    }

    parse(text) {
        const value =
            normalizeText(
                text
            ).toLocaleLowerCase(
                "tr-TR"
            );

        if (!value) {
            return {
                matched: false,
                action: null
            };
        }

        for (
            const [
                name,
                command
            ] of this.commands
        ) {
            for (
                const pattern of
                command.patterns
            ) {
                if (
                    value ===
                    pattern ||
                    value.includes(
                        pattern
                    )
                ) {
                    return {
                        matched: true,
                        name,
                        ...command.handler(
                            value
                        )
                    };
                }
            }
        }

        return {
            matched: false,
            action: null
        };
    }
}

const voiceCommandParser =
    new VoiceCommandParser();

// ============================================================
// VOICE ROUTE — COMMAND PARSER
// ============================================================

function registerVoiceCommandRoute(
    app
) {
    app.post(
        "/api/voice/command",
        (req, res) => {
            const text =
                normalizeText(
                    req.body?.text
                );

            const result =
                voiceCommandParser.parse(
                    text
                );

            res.json({
                success: true,
                text,
                ...result
            });
        }
    );
}

// ============================================================
// FULL REGISTRATION
// ============================================================

function registerVoiceSystem(
    app,
    io = null
) {
    registerVoiceRoutes(
        app
    );

    registerVoiceCommandRoute(
        app
    );

    if (io) {
        registerVoiceSocket(
            io
        );
    }

    return {
        voiceEngine,
        voiceUsage,
        voiceCache,
        voiceSettings,
        voiceLogger,
        voiceCommandParser
    };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    VOICE_CONFIG,

    voiceEngine,
    voiceUsage,
    voiceCache,
    voiceSettings,
    voiceLogger,
    voiceCommandParser,

    VoiceEngine,
    VoiceUsage,
    VoiceCache,
    VoiceSettings,
    VoiceLogger,
    SpeechTextProcessor,
    VoiceCommandParser,

    registerVoiceRoutes,
    registerVoiceCommandRoute,
    registerVoiceSocket,
    registerVoiceSystem,

    getBrowserSpeechConfig,

    normalizeLanguage,
    normalizeText,
    getDayKey,
    createId
};
// ============================================================
// TürkAI — PART 4
// DOSYA: src/plans/planEngine.js
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ============================================================
// PATHS
// ============================================================

const ROOT_DIR = path.resolve(__dirname, "../../");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PLANS_DIR = path.join(DATA_DIR, "plans");

const PLANS_FILE = path.join(
    PLANS_DIR,
    "plans.json"
);

const USER_PLANS_FILE = path.join(
    PLANS_DIR,
    "user_plans.json"
);

const PLAN_USAGE_FILE = path.join(
    PLANS_DIR,
    "plan_usage.json"
);

const PLAN_LOG_FILE = path.join(
    PLANS_DIR,
    "plan_logs.json"
);

// ============================================================
// DIRECTORIES
// ============================================================

[
    DATA_DIR,
    PLANS_DIR
].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
});

// ============================================================
// HELPERS
// ============================================================

function clone(value) {
    try {
        return JSON.parse(
            JSON.stringify(value)
        );
    } catch {
        return value;
    }
}

function readJSON(file, fallback) {
    try {
        if (!fs.existsSync(file)) {
            return clone(fallback);
        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!raw.trim()) {
            return clone(fallback);
        }

        return JSON.parse(raw);
    } catch {
        return clone(fallback);
    }
}

function writeJSON(file, data) {
    try {
        const dir =
            path.dirname(file);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        const temp =
            `${file}.${process.pid}.${Date.now()}.tmp`;

        fs.writeFileSync(
            temp,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temp,
            file
        );

        return true;
    } catch (error) {
        console.error(
            "[TürkAI Plans]",
            error.message
        );

        return false;
    }
}

function createId(prefix = "plan") {
    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")}`;
}

function today() {
    const d = new Date();

    return [
        d.getFullYear(),
        String(
            d.getMonth() + 1
        ).padStart(2, "0"),
        String(
            d.getDate()
        ).padStart(2, "0")
    ].join("-");
}

function normalizeUserId(userId) {
    if (!userId) {
        return "anonymous";
    }

    return String(userId)
        .trim()
        .slice(0, 200);
}

function normalizePlan(plan) {
    const value =
        String(
            plan || "free"
        )
            .trim()
            .toLowerCase();

    if (
        PLANS[value]
    ) {
        return value;
    }

    return "free";
}

// ============================================================
// PLAN DEFINITIONS
// ============================================================

const PLANS = {

    free: {
        id: "free",
        name: "Free",
        displayName: "TürkAI Free",

        price: 0,
        currency: "TRY",

        billing: "monthly",

        limits: {
            messagesPerDay: 50,
            researchPerDay: 5,
            imagePerDay: 0,
            videoPerDay: 0,
            fileUploadsPerDay: 5,
            maxFileSizeMB: 10,
            memoryItems: 100,
            voiceCharactersPerDay: 5000
        },

        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            coding: true,
            fileUpload: true,
            voiceInput: true,
            voiceOutput: true,
            imageGeneration: false,
            videoGeneration: false,
            advancedModels: false,
            priority: false,
            customModels: false,
            videoCall: false
        },

        models: [
            "turkai-local"
        ],

        badge: "FREE"
    },

    pro: {
        id: "pro",
        name: "Pro",
        displayName: "TürkAI Pro",

        price: 250,
        currency: "TRY",

        billing: "monthly",

        limits: {
            messagesPerDay: 100,
            researchPerDay: 25,
            imagePerDay: 2,
            videoPerDay: 0,
            fileUploadsPerDay: 20,
            maxFileSizeMB: 25,
            memoryItems: 1000,
            voiceCharactersPerDay: 25000
        },

        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            coding: true,
            fileUpload: true,
            voiceInput: true,
            voiceOutput: true,
            imageGeneration: true,
            videoGeneration: false,
            advancedModels: true,
            priority: true,
            customModels: false,
            videoCall: false
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b"
        ],

        badge: "PRO"
    },

    plus: {
        id: "plus",
        name: "Plus",
        displayName: "TürkAI Plus",

        price: 500,
        currency: "TRY",

        billing: "monthly",

        limits: {
            messagesPerDay: 200,
            researchPerDay: 75,
            imagePerDay: 4,
            videoPerDay: 5,
            fileUploadsPerDay: 50,
            maxFileSizeMB: 50,
            memoryItems: 5000,
            voiceCharactersPerDay: 75000
        },

        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            coding: true,
            fileUpload: true,
            voiceInput: true,
            voiceOutput: true,
            imageGeneration: true,
            videoGeneration: true,
            advancedModels: true,
            priority: true,
            customModels: true,
            videoCall: false
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini"
        ],

        badge: "PLUS"
    },

    ultra: {
        id: "ultra",
        name: "Ultra",
        displayName: "TürkAI Ultra",

        price: 1000,
        currency: "TRY",

        billing: "monthly",

        limits: {
            messagesPerDay: 1000,
            researchPerDay: 250,
            imagePerDay: 10,
            videoPerDay: 20,
            fileUploadsPerDay: 100,
            maxFileSizeMB: 100,
            memoryItems: 25000,
            voiceCharactersPerDay: 250000
        },

        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            coding: true,
            fileUpload: true,
            voiceInput: true,
            voiceOutput: true,
            imageGeneration: true,
            videoGeneration: true,
            advancedModels: true,
            priority: true,
            customModels: true,
            videoCall: true
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini",
            "turkai-ultra"
        ],

        badge: "ULTRA",

        status: "coming_soon"
    },

    developer: {
        id: "developer",
        name: "Developer",
        displayName: "TürkAI Developer",

        price: 0,
        currency: "TRY",

        billing: "internal",

        limits: {
            messagesPerDay: 400,
            researchPerDay: 1000,
            imagePerDay: 50,
            videoPerDay: 50,
            fileUploadsPerDay: 500,
            maxFileSizeMB: 250,
            memoryItems: 100000,
            voiceCharactersPerDay: 1000000
        },

        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            coding: true,
            fileUpload: true,
            voiceInput: true,
            voiceOutput: true,
            imageGeneration: true,
            videoGeneration: true,
            advancedModels: true,
            priority: true,
            customModels: true,
            videoCall: true,
            developerTools: true,
            diagnostics: true,
            adminTools: true
        },

        models: [
            "turkai-local",
            "groq-gpt-oss-20b",
            "cerebras-gpt-oss-120b",
            "gemini",
            "turkai-ultra"
        ],

        badge: "DEV"
    }
};

// ============================================================
// PLAN ORDER
// ============================================================

const PLAN_ORDER = [
    "free",
    "pro",
    "plus",
    "ultra",
    "developer"
];

// ============================================================
// STORAGE
// ============================================================

const defaultUserPlans = {};
const defaultUsage = {};
const defaultLogs = [];

if (!fs.existsSync(PLANS_FILE)) {
    writeJSON(
        PLANS_FILE,
        PLANS
    );
}

const userPlans =
    readJSON(
        USER_PLANS_FILE,
        defaultUserPlans
    );

const planUsage =
    readJSON(
        PLAN_USAGE_FILE,
        defaultUsage
    );

const planLogs =
    readJSON(
        PLAN_LOG_FILE,
        defaultLogs
    );

// ============================================================
// PLAN MANAGER
// ============================================================

class PlanManager {

    constructor() {
        this.plans = clone(
            PLANS
        );

        this.users =
            userPlans;

        this.usage =
            planUsage;

        this.logs =
            planLogs;
    }

    saveUsers() {
        return writeJSON(
            USER_PLANS_FILE,
            this.users
        );
    }

    saveUsage() {
        return writeJSON(
            PLAN_USAGE_FILE,
            this.usage
        );
    }

    saveLogs() {
        if (
            this.logs.length >
            5000
        ) {
            this.logs =
                this.logs.slice(
                    -5000
                );
        }

        return writeJSON(
            PLAN_LOG_FILE,
            this.logs
        );
    }

    log(
        type,
        data = {}
    ) {
        this.logs.push({
            id: createId("plog"),
            type,
            timestamp:
                new Date().toISOString(),
            data: clone(data)
        });

        this.saveLogs();
    }

    list() {
        return PLAN_ORDER
            .map(
                (id) =>
                    clone(
                        this.plans[id]
                    )
            );
    }

    get(plan) {
        const id =
            normalizePlan(
                plan
            );

        return clone(
            this.plans[id]
        );
    }

    getRaw(plan) {
        const id =
            normalizePlan(
                plan
            );

        return this.plans[id];
    }

    exists(plan) {
        const id =
            String(
                plan || ""
            )
                .trim()
                .toLowerCase();

        return Boolean(
            this.plans[id]
        );
    }

    getUserPlan(
        userId
    ) {
        const id =
            normalizeUserId(
                userId
            );

        const record =
            this.users[id];

        if (!record) {
            return {
                userId: id,
                plan: "free",
                active: true,
                source: "default",
                startedAt: null,
                expiresAt: null
            };
        }

        if (
            record.expiresAt &&
            new Date(
                record.expiresAt
            ).getTime() <
                Date.now()
        ) {
            this.users[id] = {
                userId: id,
                plan: "free",
                active: true,
                source: "expired",
                startedAt:
                    new Date().toISOString(),
                expiresAt: null
            };

            this.saveUsers();

            return clone(
                this.users[id]
            );
        }

        return clone(
            record
        );
    }

    getUserPlanDetails(
        userId
    ) {
        const record =
            this.getUserPlan(
                userId
            );

        return {
            ...record,
            details:
                this.get(
                    record.plan
                )
        };
    }

    setUserPlan(
        userId,
        plan,
        options = {}
    ) {
        const id =
            normalizeUserId(
                userId
            );

        const normalized =
            normalizePlan(
                plan
            );

        const current =
            this.getUserPlan(
                id
            );

        const startedAt =
            options.startedAt ||
            current.startedAt ||
            new Date().toISOString();

        const expiresAt =
            options.expiresAt ||
            null;

        this.users[id] = {
            userId: id,
            plan: normalized,
            active:
                options.active !== false,
            source:
                options.source ||
                "system",
            startedAt,
            expiresAt,
            subscriptionId:
                options.subscriptionId ||
                null,
            paymentId:
                options.paymentId ||
                null,
            updatedAt:
                new Date().toISOString()
        };

        this.saveUsers();

        this.log(
            "plan_changed",
            {
                userId: id,
                from:
                    current.plan,
                to:
                    normalized,
                source:
                    options.source ||
                    "system"
            }
        );

        return this.getUserPlanDetails(
            id
        );
    }

    activatePlan(
        userId,
        plan,
        durationDays = 30,
        options = {}
    ) {
        const days =
            Math.max(
                1,
                Number(
                    durationDays
                ) || 30
            );

        const start =
            new Date();

        const end =
            new Date(
                start.getTime() +
                days *
                24 *
                60 *
                60 *
                1000
            );

        return this.setUserPlan(
            userId,
            plan,
            {
                ...options,
                startedAt:
                    start.toISOString(),
                expiresAt:
                    end.toISOString(),
                active: true
            }
        );
    }

    deactivatePlan(
        userId,
        reason = "manual"
    ) {
        const id =
            normalizeUserId(
                userId
            );

        const current =
            this.getUserPlan(
                id
            );

        this.users[id] = {
            ...current,
            plan: "free",
            active: true,
            source: reason,
            expiresAt: null,
            updatedAt:
                new Date().toISOString()
        };

        this.saveUsers();

        this.log(
            "plan_deactivated",
            {
                userId: id,
                previousPlan:
                    current.plan,
                reason
            }
        );

        return this.getUserPlanDetails(
            id
        );
    }

    hasFeature(
        userId,
        feature
    ) {
        const details =
            this.getUserPlanDetails(
                userId
            );

        return Boolean(
            details.details
                .features?.[
                    feature
                ]
        );
    }

    getLimit(
        userId,
        limitName
    ) {
        const details =
            this.getUserPlanDetails(
                userId
            );

        return (
            details.details
                .limits?.[
                    limitName
                ] ?? 0
        );
    }

    getModels(
        userId
    ) {
        const details =
            this.getUserPlanDetails(
                userId
            );

        return clone(
            details.details.models ||
            []
        );
    }

    canUseModel(
        userId,
        model
    ) {
        const models =
            this.getModels(
                userId
            );

        if (
            models.includes(
                model
            )
        ) {
            return true;
        }

        return false;
    }

    getUsage(
        userId,
        date = today()
    ) {
        const id =
            normalizeUserId(
                userId
            );

        if (!this.usage[id]) {
            this.usage[id] = {};
        }

        if (!this.usage[id][date]) {
            this.usage[id][date] = {
                messages: 0,
                research: 0,
                image: 0,
                video: 0,
                fileUploads: 0,
                voiceCharacters: 0,
                updatedAt:
                    new Date().toISOString()
            };
        }

        return this.usage[id][date];
    }

    incrementUsage(
        userId,
        type,
        amount = 1
    ) {
        const usage =
            this.getUsage(
                userId
            );

        if (
            usage[type] ===
            undefined
        ) {
            usage[type] = 0;
        }

        usage[type] +=
            Number(
                amount
            ) || 0;

        usage.updatedAt =
            new Date().toISOString();

        this.saveUsage();

        return clone(
            usage
        );
    }

    checkLimit(
        userId,
        type,
        amount = 1
    ) {
        const details =
            this.getUserPlanDetails(
                userId
            );

        const usage =
            this.getUsage(
                userId
            );

        let limitName =
            type;

        if (
            type === "messages"
        ) {
            limitName =
                "messagesPerDay";
        }

        if (
            type === "research"
        ) {
            limitName =
                "researchPerDay";
        }

        if (
            type === "image"
        ) {
            limitName =
                "imagePerDay";
        }

        if (
            type === "video"
        ) {
            limitName =
                "videoPerDay";
        }

        if (
            type === "fileUploads"
        ) {
            limitName =
                "fileUploadsPerDay";
        }

        if (
            type ===
            "voiceCharacters"
        ) {
            limitName =
                "voiceCharactersPerDay";
        }

        const limit =
            details.details
                .limits?.[
                    limitName
                ] ?? 0;

        const current =
            Number(
                usage[type]
            ) || 0;

        return {
            allowed:
                current +
                amount <=
                limit,

            type,

            current,

            requested:
                amount,

            limit,

            remaining:
                Math.max(
                    0,
                    limit -
                    current
                ),

            plan:
                details.plan
        };
    }

    consume(
        userId,
        type,
        amount = 1
    ) {
        const check =
            this.checkLimit(
                userId,
                type,
                amount
            );

        if (!check.allowed) {
            return {
                success: false,
                ...check
            };
        }

        const usage =
            this.incrementUsage(
                userId,
                type,
                amount
            );

        return {
            success: true,
            ...check,
            usage
        };
    }

    resetDailyUsage(
        userId
    ) {
        const id =
            normalizeUserId(
                userId
            );

        const date =
            today();

        if (
            this.usage[id]
        ) {
            delete this.usage[id][
                date
            ];

            this.saveUsage();
        }

        return true;
    }

    getAllUsers() {
        return clone(
            this.users
        );
    }

    getPlanStats() {
        const result = {};

        PLAN_ORDER.forEach(
            (plan) => {
                result[plan] = 0;
            }
        );

        for (
            const record of
            Object.values(
                this.users
            )
        ) {
            const plan =
                normalizePlan(
                    record.plan
                );

            if (
                result[plan] !==
                undefined
            ) {
                result[plan]++;
            }
        }

        return result;
    }

    getSystemStats() {
        let totalMessages = 0;
        let totalResearch = 0;
        let totalImages = 0;
        let totalVideos = 0;
        let totalUploads = 0;
        let totalVoice = 0;

        for (
            const days of
            Object.values(
                this.usage
            )
        ) {
            for (
                const usage of
                Object.values(days)
            ) {
                totalMessages +=
                    usage.messages || 0;

                totalResearch +=
                    usage.research || 0;

                totalImages +=
                    usage.image || 0;

                totalVideos +=
                    usage.video || 0;

                totalUploads +=
                    usage.fileUploads || 0;

                totalVoice +=
                    usage.voiceCharacters || 0;
            }
        }

        return {
            users:
                Object.keys(
                    this.users
                ).length,

            plans:
                this.getPlanStats(),

            usage: {
                messages:
                    totalMessages,

                research:
                    totalResearch,

                image:
                    totalImages,

                video:
                    totalVideos,

                fileUploads:
                    totalUploads,

                voiceCharacters:
                    totalVoice
            }
        };
    }
}

// ============================================================
// SINGLETON
// ============================================================

const planManager =
    new PlanManager();

// ============================================================
// PUBLIC PLAN ROUTES
// ============================================================

function registerPlanRoutes(
    app
) {
    // --------------------------------------------------------
    // ALL PLANS
    // --------------------------------------------------------

    app.get(
        "/api/plans",
        (req, res) => {
            res.json({
                success: true,
                plans:
                    planManager.list()
            });
        }
    );

    // --------------------------------------------------------
    // SINGLE PLAN
    // --------------------------------------------------------

    app.get(
        "/api/plans/:plan",
        (req, res) => {
            const plan =
                req.params.plan;

            if (
                !planManager.exists(
                    plan
                )
            ) {
                return res.status(404)
                    .json({
                        success: false,
                        error:
                            "Plan bulunamadı."
                    });
            }

            return res.json({
                success: true,
                plan:
                    planManager.get(
                        plan
                    )
            });
        }
    );

    // --------------------------------------------------------
    // USER PLAN
    // --------------------------------------------------------

    app.get(
        "/api/user/plan",
        (req, res) => {
            const userId =
                req.query.userId ||
                req.user?.id ||
                "anonymous";

            res.json({
                success: true,
                ...planManager
                    .getUserPlanDetails(
                        userId
                    )
            });
        }
    );

    // --------------------------------------------------------
    // USER USAGE
    // --------------------------------------------------------

    app.get(
        "/api/user/usage",
        (req, res) => {
            const userId =
                req.query.userId ||
                req.user?.id ||
                "anonymous";

            res.json({
                success: true,
                userId,
                usage:
                    planManager
                        .getUsage(
                            userId
                        )
            });
        }
    );

    // --------------------------------------------------------
    // USER FEATURES
    // --------------------------------------------------------

    app.get(
        "/api/user/features",
        (req, res) => {
            const userId =
                req.query.userId ||
                req.user?.id ||
                "anonymous";

            const details =
                planManager
                    .getUserPlanDetails(
                        userId
                    );

            res.json({
                success: true,
                userId,
                plan:
                    details.plan,
                features:
                    details.details
                        .features,
                limits:
                    details.details
                        .limits,
                models:
                    details.details
                        .models
            });
        }
    );

    // --------------------------------------------------------
    // PLAN CHECK
    // --------------------------------------------------------

    app.post(
        "/api/plans/check",
        (req, res) => {
            const body =
                req.body || {};

            const userId =
                body.userId ||
                req.user?.id ||
                "anonymous";

            const type =
                body.type ||
                "messages";

            const amount =
                Math.max(
                    1,
                    Number(
                        body.amount
                    ) || 1
                );

            const result =
                planManager
                    .checkLimit(
                        userId,
                        type,
                        amount
                    );

            res.json({
                success: true,
                ...result
            });
        }
    );

    // --------------------------------------------------------
    // FEATURE CHECK
    // --------------------------------------------------------

    app.post(
        "/api/plans/feature-check",
        (req, res) => {
            const body =
                req.body || {};

            const userId =
                body.userId ||
                req.user?.id ||
                "anonymous";

            const feature =
                String(
                    body.feature ||
                    ""
                ).trim();

            res.json({
                success: true,
                userId,
                feature,
                allowed:
                    planManager
                        .hasFeature(
                            userId,
                            feature
                        )
            });
        }
    );

    // --------------------------------------------------------
    // MODEL CHECK
    // --------------------------------------------------------

    app.post(
        "/api/plans/model-check",
        (req, res) => {
            const body =
                req.body || {};

            const userId =
                body.userId ||
                req.user?.id ||
                "anonymous";

            const model =
                String(
                    body.model ||
                    ""
                ).trim();

            res.json({
                success: true,
                userId,
                model,
                allowed:
                    planManager
                        .canUseModel(
                            userId,
                            model
                        )
            });
        }
    );

    // --------------------------------------------------------
    // INTERNAL PLAN ACTIVATION
    // --------------------------------------------------------

    app.post(
        "/api/plans/internal/activate",
        (req, res) => {
            const body =
                req.body || {};

            const userId =
                body.userId ||
                "anonymous";

            const plan =
                body.plan ||
                "free";

            const duration =
                Number(
                    body.durationDays
                ) || 30;

            const result =
                planManager
                    .activatePlan(
                        userId,
                        plan,
                        duration,
                        {
                            source:
                                body.source ||
                                "internal"
                        }
                    );

            res.json({
                success: true,
                result
            });
        }
    );

    // --------------------------------------------------------
    // INTERNAL DEACTIVATE
    // --------------------------------------------------------

    app.post(
        "/api/plans/internal/deactivate",
        (req, res) => {
            const body =
                req.body || {};

            const userId =
                body.userId ||
                "anonymous";

            const result =
                planManager
                    .deactivatePlan(
                        userId,
                        body.reason ||
                            "internal"
                    );

            res.json({
                success: true,
                result
            });
        }
    );

    // --------------------------------------------------------
    // SYSTEM STATS
    // --------------------------------------------------------

    app.get(
        "/api/plans/stats",
        (req, res) => {
            res.json({
                success: true,
                stats:
                    planManager
                        .getSystemStats()
            });
        }
    );
}

// ============================================================
// PLAN MIDDLEWARE
// ============================================================

function planMiddleware(
    req,
    res,
    next
) {
    const userId =
        req.user?.id ||
        req.headers[
            "x-user-id"
        ] ||
        req.body?.userId ||
        req.query?.userId ||
        "anonymous";

    const details =
        planManager
            .getUserPlanDetails(
                userId
            );

    req.turkaiUserId =
        userId;

    req.turkaiPlan =
        details.plan;

    req.turkaiPlanDetails =
        details.details;

    req.turkaiPlanLimits =
        details.details.limits;

    req.turkaiPlanFeatures =
        details.details.features;

    req.turkaiPlanModels =
        details.details.models;

    next();
}

// ============================================================
// MESSAGE LIMIT MIDDLEWARE
// ============================================================

function requireMessageLimit(
    amount = 1
) {
    return (
        req,
        res,
        next
    ) => {
        const userId =
            req.turkaiUserId ||
            req.user?.id ||
            "anonymous";

        const check =
            planManager
                .checkLimit(
                    userId,
                    "messages",
                    amount
                );

        if (!check.allowed) {
            return res.status(429)
                .json({
                    success: false,
                    error:
                        "Günlük mesaj limitine ulaştın.",
                    code:
                        "MESSAGE_LIMIT",
                    ...check
                });
        }

        next();
    };
}

// ============================================================
// FEATURE MIDDLEWARE
// ============================================================

function requireFeature(
    feature
) {
    return (
        req,
        res,
        next
    ) => {
        const userId =
            req.turkaiUserId ||
            req.user?.id ||
            "anonymous";

        if (
            !planManager.hasFeature(
                userId,
                feature
            )
        ) {
            return res.status(403)
                .json({
                    success: false,
                    error:
                        `Bu özellik ${feature} planında mevcut değil.`,
                    code:
                        "FEATURE_NOT_AVAILABLE",
                    feature,
                    plan:
                        req.turkaiPlan ||
                        "free"
                });
        }

        next();
    };
}

// ============================================================
// USAGE CONSUMERS
// ============================================================

function consumeMessage(
    userId,
    amount = 1
) {
    return planManager.consume(
        userId,
        "messages",
        amount
    );
}

function consumeResearch(
    userId,
    amount = 1
) {
    return planManager.consume(
        userId,
        "research",
        amount
    );
}

function consumeImage(
    userId,
    amount = 1
) {
    return planManager.consume(
        userId,
        "image",
        amount
    );
}

function consumeVideo(
    userId,
    amount = 1
) {
    return planManager.consume(
        userId,
        "video",
        amount
    );
}

function consumeUpload(
    userId,
    amount = 1
) {
    return planManager.consume(
        userId,
        "fileUploads",
        amount
    );
}

function consumeVoice(
    userId,
    characters
) {
    return planManager.consume(
        userId,
        "voiceCharacters",
        characters
    );
}

// ============================================================
// PUBLIC PLAN DATA
// ============================================================

function getPublicPlans() {
    return planManager
        .list()
        .map(
            (plan) => ({
                id: plan.id,
                name: plan.name,
                displayName:
                    plan.displayName,
                price:
                    plan.price,
                currency:
                    plan.currency,
                billing:
                    plan.billing,
                limits:
                    clone(
                        plan.limits
                    ),
                features:
                    clone(
                        plan.features
                    ),
                models:
                    clone(
                        plan.models
                    ),
                badge:
                    plan.badge,
                status:
                    plan.status ||
                    "active"
            })
        );
}

// ============================================================
// PLAN COMPARISON DATA
// ============================================================

function getComparison() {
    const plans =
        planManager.list();

    const features = [
        "chat",
        "memory",
        "research",
        "weather",
        "coding",
        "fileUpload",
        "voiceInput",
        "voiceOutput",
        "imageGeneration",
        "videoGeneration",
        "advancedModels",
        "priority",
        "customModels",
        "videoCall"
    ];

    return {
        plans:
            plans.map(
                (plan) => ({
                    id:
                        plan.id,
                    name:
                        plan.name,
                    price:
                        plan.price,
                    features:
                        features.reduce(
                            (
                                result,
                                feature
                            ) => {
                                result[
                                    feature
                                ] =
                                    Boolean(
                                        plan.features?.[
                                            feature
                                        ]
                                    );

                                return result;
                            },
                            {}
                        ),
                    limits:
                        clone(
                            plan.limits
                        )
                })
            )
    };
}

// ============================================================
// SUBSCRIPTION VALIDATION
// ============================================================

function validateSubscription(
    userId
) {
    const record =
        planManager
            .getUserPlan(
                userId
            );

    if (
        !record ||
        !record.plan
    ) {
        return {
            valid: false,
            plan: "free"
        };
    }

    if (
        record.expiresAt &&
        new Date(
            record.expiresAt
        ).getTime() <
            Date.now()
    ) {
        return {
            valid: false,
            expired: true,
            plan: "free"
        };
    }

    return {
        valid:
            record.active !== false,
        expired: false,
        plan:
            normalizePlan(
                record.plan
            ),
        expiresAt:
            record.expiresAt ||
            null
    };
}

// ============================================================
// SAFE PLAN RESPONSE
// ============================================================

function buildUserPlanResponse(
    userId
) {
    const details =
        planManager
            .getUserPlanDetails(
                userId
            );

    const usage =
        planManager
            .getUsage(
                userId
            );

    return {
        success: true,

        user: {
            id:
                normalizeUserId(
                    userId
                )
        },

        subscription: {
            plan:
                details.plan,
            active:
                details.active,
            source:
                details.source,
            startedAt:
                details.startedAt,
            expiresAt:
                details.expiresAt
        },

        plan: {
            id:
                details.details.id,
            name:
                details.details.name,
            displayName:
                details.details
                    .displayName,
            price:
                details.details.price,
            currency:
                details.details
                    .currency,
            badge:
                details.details.badge
        },

        features:
            clone(
                details.details
                    .features
            ),

        limits:
            clone(
                details.details
                    .limits
            ),

        models:
            clone(
                details.details
                    .models
            ),

        usage:
            clone(usage)
    };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    PLANS,
    PLAN_ORDER,

    PLANS_FILE,
    USER_PLANS_FILE,
    PLAN_USAGE_FILE,
    PLAN_LOG_FILE,

    planManager,

    PlanManager,

    registerPlanRoutes,
    planMiddleware,

    requireMessageLimit,
    requireFeature,

    consumeMessage,
    consumeResearch,
    consumeImage,
    consumeVideo,
    consumeUpload,
    consumeVoice,

    getPublicPlans,
    getComparison,

    validateSubscription,
    buildUserPlanResponse,

    normalizePlan,
    normalizeUserId,
    today,
    createId
};

// ============================================================
// PART 4 END
// ============================================================
// ============================================================
// TürkAI — PART 5
// DOSYA: src/ai/aiEngine.js
// ============================================================

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const EventEmitter = require("events");

// ============================================================
// PATHS
// ============================================================

const ROOT_DIR = path.resolve(__dirname, "../../");

const DATA_DIR = path.join(
    ROOT_DIR,
    "data"
);

const AI_DIR = path.join(
    DATA_DIR,
    "ai"
);

const AI_LOG_FILE = path.join(
    AI_DIR,
    "ai_logs.json"
);

const AI_CACHE_FILE = path.join(
    AI_DIR,
    "ai_cache.json"
);

const AI_SETTINGS_FILE = path.join(
    AI_DIR,
    "ai_settings.json"
);

// ============================================================
// DIRECTORIES
// ============================================================

[
    DATA_DIR,
    AI_DIR
].forEach((dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        });
    }
});

// ============================================================
// CONFIG
// ============================================================

const AI_CONFIG = {
    appName: "TürkAI",

    defaults: {
        model: "turkai-local",
        temperature: 0.7,
        maxTokens: 3000
    },

    providers: {
        local: {
            id: "turkai-local",
            name: "TürkAI Local",
            enabled: true,
            priority: 1
        },

        groq: {
            id: "groq",
            name: "Groq",
            enabled: true,
            priority: 2,
            endpoint:
                "https://api.groq.com/openai/v1/chat/completions",
            model:
                "openai/gpt-oss-20b"
        },

        cerebras: {
            id: "cerebras",
            name: "Cerebras",
            enabled: true,
            priority: 3,
            endpoint:
                "https://api.cerebras.ai/v1/chat/completions",
            model:
                "gpt-oss-120b"
        },

        gemini: {
            id: "gemini",
            name: "Gemini",
            enabled: true,
            priority: 4,
            model:
                "gemini-2.5-flash"
        }
    },

    timeoutMs: 30000,

    cache: {
        enabled: true,
        maxItems: 1000,
        maxTextLength: 5000
    },

    logs: {
        enabled: true,
        maxItems: 5000
    }
};

// ============================================================
// STORAGE
// ============================================================

function clone(value) {
    try {
        return JSON.parse(
            JSON.stringify(value)
        );
    } catch {
        return value;
    }
}

function readJSON(
    file,
    fallback
) {
    try {
        if (!fs.existsSync(file)) {
            return clone(fallback);
        }

        const raw =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (!raw.trim()) {
            return clone(fallback);
        }

        return JSON.parse(raw);
    } catch {
        return clone(fallback);
    }
}

function writeJSON(
    file,
    data
) {
    try {
        const dir =
            path.dirname(file);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, {
                recursive: true
            });
        }

        const temp =
            `${file}.${process.pid}.${Date.now()}.tmp`;

        fs.writeFileSync(
            temp,
            JSON.stringify(
                data,
                null,
                2
            ),
            "utf8"
        );

        fs.renameSync(
            temp,
            file
        );

        return true;
    } catch {
        return false;
    }
}

function createId(
    prefix = "ai"
) {
    return `${prefix}_${Date.now()}_${crypto
        .randomBytes(5)
        .toString("hex")}`;
}

function normalizeText(
    value
) {
    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    return String(value)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
}

function clamp(
    value,
    min,
    max
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {
        return min;
    }

    return Math.min(
        max,
        Math.max(
            min,
            number
        )
    );
}

// ============================================================
// INITIAL FILES
// ============================================================

const aiLogs =
    readJSON(
        AI_LOG_FILE,
        []
    );

const aiCache =
    readJSON(
        AI_CACHE_FILE,
        {}
    );

const aiSettings =
    readJSON(
        AI_SETTINGS_FILE,
        {
            defaultModel:
                AI_CONFIG.defaults.model,

            temperature:
                AI_CONFIG.defaults.temperature,

            maxTokens:
                AI_CONFIG.defaults.maxTokens,

            autoResearch:
                true,

            memoryEnabled:
                true,

            localFallback:
                true
        }
    );

writeJSON(
    AI_LOG_FILE,
    aiLogs
);

writeJSON(
    AI_CACHE_FILE,
    aiCache
);

writeJSON(
    AI_SETTINGS_FILE,
    aiSettings
);

// ============================================================
// SIMPLE KNOWLEDGE
// ============================================================

const SIMPLE_MESSAGES = {
    "merhaba":
        "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?",

    "selam":
        "Selam! TürkAI burada.",

    "nasılsın":
        "İyiyim, teşekkürler. Hazırım.",

    "iyi misin":
        "Hazırım ve çalışıyorum.",

    "sen kimsin":
        "Ben TürkAI; sohbet, kodlama, araştırma, dosya, hafıza ve daha birçok konuda yardımcı olmak için tasarlanmış bir yapay zekâ sistemiyim.",

    "adın ne":
        "Benim adım TürkAI.",

    "en hızlı kim":
        "TürkAI ⚡🤖",

    "teşekkürler":
        "Rica ederim.",

    "teşekkür ederim":
        "Rica ederim.",

    "görüşürüz":
        "Görüşürüz! Ne zaman istersen buradayım."
};

function normalizeQuestion(
    text
) {
    return normalizeText(
        text
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .replace(/[!?.,;:()[\]{}"'`]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function findSimpleAnswer(
    text
) {
    const normalized =
        normalizeQuestion(
            text
        );

    if (
        SIMPLE_MESSAGES[
            normalized
        ]
    ) {
        return {
            found: true,
            answer:
                SIMPLE_MESSAGES[
                    normalized
                ],
            source:
                "simple_messages"
        };
    }

    return {
        found: false,
        answer: null,
        source: null
    };
}

// ============================================================
// CACHE
// ============================================================

class AICache {

    constructor() {
        this.items =
            aiCache || {};
    }

    key(
        messages,
        options
    ) {
        const payload =
            JSON.stringify({
                messages,
                model:
                    options.model,
                temperature:
                    options.temperature
            });

        return crypto
            .createHash(
                "sha256"
            )
            .update(payload)
            .digest("hex");
    }

    get(
        messages,
        options
    ) {
        if (
            !AI_CONFIG.cache.enabled
        ) {
            return null;
        }

        const key =
            this.key(
                messages,
                options
            );

        const item =
            this.items[key];

        if (!item) {
            return null;
        }

        item.lastUsed =
            Date.now();

        writeJSON(
            AI_CACHE_FILE,
            this.items
        );

        return clone(
            item
        );
    }

    set(
        messages,
        options,
        response
    ) {
        if (
            !AI_CONFIG.cache.enabled
        ) {
            return;
        }

        const key =
            this.key(
                messages,
                options
            );

        this.items[key] = {
            key,
            response:
                clone(response),
            createdAt:
                Date.now(),
            lastUsed:
                Date.now()
        };

        this.cleanup();

        writeJSON(
            AI_CACHE_FILE,
            this.items
        );
    }

    cleanup() {
        const entries =
            Object.values(
                this.items
            );

        if (
            entries.length <=
            AI_CONFIG.cache.maxItems
        ) {
            return;
        }

        entries.sort(
            (a, b) =>
                a.lastUsed -
                b.lastUsed
        );

        const remove =
            entries.length -
            AI_CONFIG.cache.maxItems;

        for (
            let i = 0;
            i < remove;
            i++
        ) {
            delete this.items[
                entries[i].key
            ];
        }
    }

    clear() {
        this.items = {};

        writeJSON(
            AI_CACHE_FILE,
            this.items
        );
    }

    size() {
        return Object.keys(
            this.items
        ).length;
    }
}

const aiCacheManager =
    new AICache();

// ============================================================
// AI LOGGER
// ============================================================

class AILogger {

    constructor() {
        this.logs =
            aiLogs || [];
    }

    add(
        type,
        data = {}
    ) {
        if (
            !AI_CONFIG.logs.enabled
        ) {
            return;
        }

        this.logs.push({
            id:
                createId(
                    "ailog"
                ),

            type,

            timestamp:
                new Date()
                    .toISOString(),

            data:
                clone(data)
        });

        if (
            this.logs.length >
            AI_CONFIG.logs.maxItems
        ) {
            this.logs =
                this.logs.slice(
                    -AI_CONFIG.logs.maxItems
                );
        }

        writeJSON(
            AI_LOG_FILE,
            this.logs
        );
    }

    recent(
        limit = 100
    ) {
        return this.logs
            .slice(
                -Math.max(
                    1,
                    Math.min(
                        500,
                        Number(
                            limit
                        ) || 100
                    )
                )
            )
            .reverse();
    }
}

const aiLogger =
    new AILogger();

// ============================================================
// SETTINGS
// ============================================================

class AISettings {

    constructor() {
        this.data =
            aiSettings;
    }

    get() {
        return clone(
            this.data
        );
    }

    update(
        values = {}
    ) {
        if (
            typeof values !==
                "object" ||
            values === null
        ) {
            return this.get();
        }

        if (
            values.defaultModel
        ) {
            this.data.defaultModel =
                String(
                    values.defaultModel
                );
        }

        if (
            values.temperature !==
            undefined
        ) {
            this.data.temperature =
                clamp(
                    values.temperature,
                    0,
                    2
                );
        }

        if (
            values.maxTokens !==
            undefined
        ) {
            this.data.maxTokens =
                Math.max(
                    100,
                    Math.min(
                        20000,
                        Number(
                            values.maxTokens
                        ) || 3000
                    )
                );
        }

        if (
            typeof values.autoResearch ===
            "boolean"
        ) {
            this.data.autoResearch =
                values.autoResearch;
        }

        if (
            typeof values.memoryEnabled ===
            "boolean"
        ) {
            this.data.memoryEnabled =
                values.memoryEnabled;
        }

        if (
            typeof values.localFallback ===
            "boolean"
        ) {
            this.data.localFallback =
                values.localFallback;
        }

        writeJSON(
            AI_SETTINGS_FILE,
            this.data
        );

        return this.get();
    }
}

const aiSettingsManager =
    new AISettings();

// ============================================================
// LOCAL RESPONSE ENGINE
// ============================================================

class LocalAI {

    constructor() {
        this.name =
            "TürkAI Local";
    }

    detectLanguage(
        text
    ) {
        const value =
            normalizeQuestion(
                text
            );

        if (
            /[ğüşöçıİ]/i.test(
                value
            )
        ) {
            return "tr";
        }

        if (
            /\b(the|what|how|why|hello|please|can|could)\b/i.test(
                value
            )
        ) {
            return "en";
        }

        if (
            /\b(der|die|das|und|ich|wie|was)\b/i.test(
                value
            )
        ) {
            return "de";
        }

        return "tr";
    }

    generate(
        text,
        context = {}
    ) {
        const simple =
            findSimpleAnswer(
                text
            );

        if (
            simple.found
        ) {
            return {
                success: true,
                answer:
                    simple.answer,
                provider:
                    "local",
                model:
                    "turkai-local",
                source:
                    simple.source
            };
        }

        const value =
            normalizeQuestion(
                text
            );

        if (
            !value
        ) {
            return {
                success: true,
                answer:
                    "Bir şey yazarsan hemen yardımcı olabilirim.",
                provider:
                    "local",
                model:
                    "turkai-local",
                source:
                    "local_empty"
            };
        }

        if (
            value.includes(
                "kod"
            ) ||
            value.includes(
                "javascript"
            ) ||
            value.includes(
                "python"
            ) ||
            value.includes(
                "html"
            ) ||
            value.includes(
                "css"
            )
        ) {
            return {
                success: true,

                answer:
                    "Kodlama konusunda yardımcı olabilirim. İstersen kodunu gönder; hatayı bulup düzeltebilir, yeni bir özellik ekleyebilir veya dosyayı baştan oluşturabiliriz.",

                provider:
                    "local",

                model:
                    "turkai-local",

                source:
                    "local_coding"
            };
        }

        if (
            value.includes(
                "hava"
            )
        ) {
            return {
                success: true,

                answer:
                    "Hava durumunu öğrenmek için konumu belirtirsen güncel hava bilgisi araştırma sistemi üzerinden alınabilir.",

                provider:
                    "local",

                model:
                    "turkai-local",

                source:
                    "local_weather"
            };
        }

        if (
            value.includes(
                "araştır"
            ) ||
            value.includes(
                "internetten"
            ) ||
            value.includes(
                "güncel"
            )
        ) {
            return {
                success: true,

                answer:
                    "Bu soru güncel bilgi gerektiriyor. TürkAI araştırma sistemiyle web kaynaklarını kontrol edebilir.",

                provider:
                    "local",

                model:
                    "turkai-local",

                source:
                    "local_research"
            };
        }

        const language =
            this.detectLanguage(
                text
            );

        if (
            language ===
            "en"
        ) {
            return {
                success: true,

                answer:
                    "I can help with this. If you need current information, TürkAI can use its research system.",

                provider:
                    "local",

                model:
                    "turkai-local",

                source:
                    "local_generic"
            };
        }

        return {
            success: true,

            answer:
                "Bunu doğrudan yanıtlamak için daha fazla bağlam gerekebilir. Sorunu biraz daha ayrıntılı yazarsan yardımcı olabilirim.",

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "local_generic"
        };
    }
}

const localAI =
    new LocalAI();

// ============================================================
// PROVIDER BASE
// ============================================================

class ProviderBase {

    constructor(
        config
    ) {
        this.config =
            config;
    }

    get enabled() {
        return Boolean(
            this.config.enabled
        );
    }

    async request() {
        throw new Error(
            "Provider request() uygulanmadı."
        );
    }
}

// ============================================================
// GROQ PROVIDER
// ============================================================

class GroqProvider
    extends ProviderBase {

    constructor() {
        super(
            AI_CONFIG.providers.groq
        );
    }

    async request(
        messages,
        options = {}
    ) {
        const key =
            process.env.GROQ_API_KEY;

        if (!key) {
            return {
                success: false,
                provider:
                    "groq",
                error:
                    "GROQ_API_KEY bulunamadı.",
                code:
                    "MISSING_API_KEY"
            };
        }

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
                AI_CONFIG.timeoutMs
            );

        try {
            const response =
                await fetch(
                    this.config.endpoint,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${key}`
                        },

                        body:
                            JSON.stringify({
                                model:
                                    options.model ||
                                    this.config.model,

                                messages,

                                temperature:
                                    options.temperature ??
                                    AI_CONFIG.defaults.temperature,

                                max_tokens:
                                    options.maxTokens ??
                                    AI_CONFIG.defaults.maxTokens,

                                stream:
                                    false
                            }),

                        signal:
                            controller.signal
                    }
                );

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );

            if (
                !response.ok
            ) {
                return {
                    success: false,
                    provider:
                        "groq",
                    status:
                        response.status,
                    error:
                        data?.error?.message ||
                        `Groq HTTP ${response.status}`,
                    code:
                        response.status === 429
                            ? "RATE_LIMIT"
                            : response.status === 402
                                ? "PAYMENT_REQUIRED"
                                : "PROVIDER_ERROR"
                };
            }

            const answer =
                data?.choices?.[0]
                    ?.message?.content;

            if (!answer) {
                return {
                    success: false,
                    provider:
                        "groq",
                    error:
                        "Groq boş yanıt döndürdü.",
                    code:
                        "EMPTY_RESPONSE"
                };
            }

            return {
                success: true,
                provider:
                    "groq",
                model:
                    options.model ||
                    this.config.model,
                answer:
                    String(answer),
                raw:
                    data
            };
        } catch (error) {
            return {
                success: false,
                provider:
                    "groq",
                error:
                    error.name ===
                    "AbortError"
                        ? "Groq zaman aşımına uğradı."
                        : error.message,
                code:
                    error.name ===
                    "AbortError"
                        ? "TIMEOUT"
                        : "NETWORK_ERROR"
            };
        } finally {
            clearTimeout(
                timeout
            );
        }
    }
}

// ============================================================
// CEREBRAS PROVIDER
// ============================================================

class CerebrasProvider
    extends ProviderBase {

    constructor() {
        super(
            AI_CONFIG.providers.cerebras
        );
    }

    async request(
        messages,
        options = {}
    ) {
        const key =
            process.env.CEREBRAS_API_KEY;

        if (!key) {
            return {
                success: false,
                provider:
                    "cerebras",
                error:
                    "CEREBRAS_API_KEY bulunamadı.",
                code:
                    "MISSING_API_KEY"
            };
        }

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
                AI_CONFIG.timeoutMs
            );

        try {
            const response =
                await fetch(
                    this.config.endpoint,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            Authorization:
                                `Bearer ${key}`
                        },

                        body:
                            JSON.stringify({
                                model:
                                    options.model ||
                                    this.config.model,

                                messages,

                                temperature:
                                    options.temperature ??
                                    AI_CONFIG.defaults.temperature,

                                max_tokens:
                                    options.maxTokens ??
                                    AI_CONFIG.defaults.maxTokens,

                                stream:
                                    false
                            }),

                        signal:
                            controller.signal
                    }
                );

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );

            if (
                !response.ok
            ) {
                return {
                    success: false,
                    provider:
                        "cerebras",
                    status:
                        response.status,
                    error:
                        data?.error?.message ||
                        `Cerebras HTTP ${response.status}`,
                    code:
                        response.status === 429
                            ? "RATE_LIMIT"
                            : response.status === 402
                                ? "PAYMENT_REQUIRED"
                                : "PROVIDER_ERROR"
                };
            }

            const answer =
                data?.choices?.[0]
                    ?.message?.content;

            if (!answer) {
                return {
                    success: false,
                    provider:
                        "cerebras",
                    error:
                        "Cerebras boş yanıt döndürdü.",
                    code:
                        "EMPTY_RESPONSE"
                };
            }

            return {
                success: true,
                provider:
                    "cerebras",
                model:
                    options.model ||
                    this.config.model,
                answer:
                    String(answer),
                raw:
                    data
            };
        } catch (error) {
            return {
                success: false,
                provider:
                    "cerebras",
                error:
                    error.name ===
                    "AbortError"
                        ? "Cerebras zaman aşımına uğradı."
                        : error.message,
                code:
                    error.name ===
                    "AbortError"
                        ? "TIMEOUT"
                        : "NETWORK_ERROR"
            };
        } finally {
            clearTimeout(
                timeout
            );
        }
    }
}

// ============================================================
// GEMINI PROVIDER
// ============================================================

class GeminiProvider
    extends ProviderBase {

    constructor() {
        super(
            AI_CONFIG.providers.gemini
        );
    }

    async request(
        messages,
        options = {}
    ) {
        const key =
            process.env.GEMINI_API_KEY;

        if (!key) {
            return {
                success: false,
                provider:
                    "gemini",
                error:
                    "GEMINI_API_KEY bulunamadı.",
                code:
                    "MISSING_API_KEY"
            };
        }

        const model =
            options.model ||
            this.config.model;

        const endpoint =
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
                model
            )}:generateContent?key=${encodeURIComponent(
                key
            )}`;

        const contents =
            messages
                .filter(
                    (message) =>
                        message.role !==
                        "system"
                )
                .map(
                    (message) => ({
                        role:
                            message.role ===
                            "assistant"
                                ? "model"
                                : "user",

                        parts: [
                            {
                                text:
                                    String(
                                        message.content ||
                                        ""
                                    )
                            }
                        ]
                    })
                );

        const system =
            messages.find(
                (message) =>
                    message.role ===
                    "system"
            );

        const payload = {
            contents,

            generationConfig: {
                temperature:
                    options.temperature ??
                    AI_CONFIG.defaults.temperature,

                maxOutputTokens:
                    options.maxTokens ??
                    AI_CONFIG.defaults.maxTokens
            }
        };

        if (
            system
        ) {
            payload.systemInstruction = {
                parts: [
                    {
                        text:
                            String(
                                system.content ||
                                ""
                            )
                    }
                ]
            };
        }

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () =>
                    controller.abort(),
                AI_CONFIG.timeoutMs
            );

        try {
            const response =
                await fetch(
                    endpoint,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                payload
                            ),

                        signal:
                            controller.signal
                    }
                );

            const data =
                await response.json()
                    .catch(
                        () => ({})
                    );

            if (
                !response.ok
            ) {
                return {
                    success: false,
                    provider:
                        "gemini",
                    status:
                        response.status,
                    error:
                        data?.error?.message ||
                        `Gemini HTTP ${response.status}`,
                    code:
                        response.status === 429
                            ? "RATE_LIMIT"
                            : "PROVIDER_ERROR"
                };
            }

            const answer =
                data?.candidates?.[0]
                    ?.content?.parts
                    ?.map(
                        (part) =>
                            part.text || ""
                    )
                    .join("")
                    .trim();

            if (!answer) {
                return {
                    success: false,
                    provider:
                        "gemini",
                    error:
                        "Gemini boş yanıt döndürdü.",
                    code:
                        "EMPTY_RESPONSE"
                };
            }

            return {
                success: true,
                provider:
                    "gemini",
                model,
                answer,
                raw:
                    data
            };
        } catch (error) {
            return {
                success: false,
                provider:
                    "gemini",
                error:
                    error.name ===
                    "AbortError"
                        ? "Gemini zaman aşımına uğradı."
                        : error.message,
                code:
                    error.name ===
                    "AbortError"
                        ? "TIMEOUT"
                        : "NETWORK_ERROR"
            };
        } finally {
            clearTimeout(
                timeout
            );
        }
    }
}

// ============================================================
// PROVIDER MANAGER
// ============================================================

class ProviderManager {

    constructor() {
        this.local =
            localAI;

        this.providers = {
            groq:
                new GroqProvider(),

            cerebras:
                new CerebrasProvider(),

            gemini:
                new GeminiProvider()
        };
    }

    get(
        name
    ) {
        if (
            name ===
            "local"
        ) {
            return this.local;
        }

        return this.providers[
            name
        ] || null;
    }

    list() {
        return [
            {
                id:
                    "local",
                name:
                    "TürkAI Local",
                enabled:
                    true
            },

            ...Object.entries(
                this.providers
            ).map(
                ([id, provider]) => ({
                    id,
                    name:
                        provider.config
                            .name,

                    enabled:
                        provider.enabled,

                    model:
                        provider.config
                            .model
                })
            )
        ];
    }

    async request(
        providerName,
        messages,
        options = {}
    ) {
        if (
            providerName ===
            "local"
        ) {
            return this.local.generate(
                messages
                    .filter(
                        (m) =>
                            m.role ===
                            "user"
                    )
                    .map(
                        (m) =>
                            m.content
                    )
                    .join("\n"),
                options
            );
        }

        const provider =
            this.get(
                providerName
            );

        if (!provider) {
            return {
                success: false,
                provider:
                    providerName,
                error:
                    "Provider bulunamadı.",
                code:
                    "UNKNOWN_PROVIDER"
            };
        }

        if (
            !provider.enabled
        ) {
            return {
                success: false,
                provider:
                    providerName,
                error:
                    "Provider devre dışı.",
                code:
                    "PROVIDER_DISABLED"
            };
        }

        return provider.request(
            messages,
            options
        );
    }
}

const providerManager =
    new ProviderManager();

// ============================================================
// SYSTEM PROMPT
// ============================================================

const DEFAULT_SYSTEM_PROMPT = `
Sen TürkAI'sin.

Türkçe öncelikli, doğal ve yardımcı bir yapay zekâ asistanısın.

Kurallar:
- Kullanıcı hangi dilde yazıyorsa mümkün olduğunca aynı dilde cevap ver.
- Bilmediğin güncel bilgileri uydurma.
- Güncel bilgi gerektiğinde araştırma sistemi kullanılabileceğini belirt.
- Kod istenirse uygulanabilir ve düzgün kod üret.
- Gereksiz şekilde uzun cevap verme.
- Kullanıcının verdiği kodu bozacak şekilde rastgele değiştirme.
- TürkAI'nin özellikleri hakkında gerçek olmayan yetenekler uydurma.
- Kullanıcı istemedikçe sistem mesajlarından veya dahili mimariden bahsetme.
- Güvenli olmayan veya zararlı taleplerde güvenli alternatif sun.
`.trim();

// ============================================================
// REQUEST BUILDER
// ============================================================

function buildMessages(
    input = {}
) {
    const messages = [];

    messages.push({
        role:
            "system",
        content:
            input.systemPrompt ||
            DEFAULT_SYSTEM_PROMPT
    });

    if (
        Array.isArray(
            input.history
        )
    ) {
        input.history
            .slice(-30)
            .forEach(
                (message) => {
                    if (
                        !message ||
                        !message.role
                    ) {
                        return;
                    }

                    const role =
                        [
                            "system",
                            "user",
                            "assistant"
                        ].includes(
                            message.role
                        )
                            ? message.role
                            : "user";

                    messages.push({
                        role,
                        content:
                            normalizeText(
                                message.content
                            ).slice(
                                0,
                                20000
                            )
                    });
                }
            );
    }

    if (
        input.context
    ) {
        messages.push({
            role:
                "system",
            content:
                `Ek bağlam:\n${normalizeText(
                    input.context
                ).slice(
                    0,
                    12000
                )}`
        });
    }

    messages.push({
        role:
            "user",
        content:
            normalizeText(
                input.message
            )
    });

    return messages;
}

// ============================================================
// RESEARCH DETECTION
// ============================================================

const CURRENT_KEYWORDS = [
    "şu an",
    "şuan",
    "bugün",
    "bugünkü",
    "dün",
    "yarın",
    "son dakika",
    "güncel",
    "en son",
    "latest",
    "şimdi",
    "2026",
    "bu hafta",
    "bu ay",
    "fiyatı",
    "fiyatı ne",
    "kur",
    "döviz",
    "hava durumu",
    "haber",
    "haberler",
    "kim kazandı",
    "maç sonucu"
];

function needsResearch(
    text
) {
    const value =
        normalizeQuestion(
            text
        );

    return CURRENT_KEYWORDS
        .some(
            (keyword) =>
                value.includes(
                    keyword
                )
        );
}

// ============================================================
// MODEL SELECTION
// ============================================================

function resolveProvider(
    model
) {
    const value =
        String(
            model ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        value ===
        "turkai-local"
    ) {
        return {
            provider:
                "local",
            model:
                "turkai-local"
        };
    }

    if (
        value.includes(
            "groq"
        ) ||
        value.includes(
            "gpt-oss-20b"
        )
    ) {
        return {
            provider:
                "groq",
            model:
                "openai/gpt-oss-20b"
        };
    }

    if (
        value.includes(
            "cerebras"
        ) ||
        value.includes(
            "gpt-oss-120b"
        )
    ) {
        return {
            provider:
                "cerebras",
            model:
                "gpt-oss-120b"
        };
    }

    if (
        value.includes(
            "gemini"
        )
    ) {
        return {
            provider:
                "gemini",
            model:
                "gemini-2.5-flash"
        };
    }

    return {
        provider:
            "local",
        model:
            "turkai-local"
    };
}

// ============================================================
// AI ENGINE
// ============================================================

class AIEngine
    extends EventEmitter {

    constructor() {
        super();

        this.providers =
            providerManager;

        this.cache =
            aiCacheManager;

        this.logger =
            aiLogger;

        this.settings =
            aiSettingsManager;
    }

    getStatus() {
        return {
            app:
                AI_CONFIG.appName,

            defaultModel:
                this.settings
                    .get()
                    .defaultModel,

            settings:
                this.settings.get(),

            providers:
                this.providers.list(),

            cacheSize:
                this.cache.size()
        };
    }

    async generate(
        input = {}
    ) {
        const message =
            normalizeText(
                input.message
            );

        if (!message) {
            return {
                success: false,
                error:
                    "Mesaj boş olamaz.",
                code:
                    "EMPTY_MESSAGE"
            };
        }

        const settings =
            this.settings.get();

        const model =
            input.model ||
            settings.defaultModel ||
            AI_CONFIG.defaults.model;

        const options = {
            model,
            temperature:
                clamp(
                    input.temperature ??
                    settings.temperature,
                    0,
                    2
                ),
            maxTokens:
                Math.max(
                    100,
                    Math.min(
                        20000,
                        Number(
                            input.maxTokens ??
                            settings.maxTokens
                        ) || 3000
                    )
                )
        };

        const messages =
            buildMessages(
                input
            );

        const simple =
            findSimpleAnswer(
                message
            );

        if (
            simple.found
        ) {
            const result = {
                success: true,
                answer:
                    simple.answer,
                provider:
                    "local",
                model:
                    "turkai-local",
                source:
                    simple.source,
                cached:
                    false
            };

            this.logger.add(
                "simple_response",
                {
                    message:
                        message.slice(
                            0,
                            300
                        )
                }
            );

            return result;
        }

        if (
            input.allowCache !==
            false
        ) {
            const cached =
                this.cache.get(
                    messages,
                    options
                );

            if (cached) {
                return {
                    ...cached.response,
                    cached:
                        true
                };
            }
        }

        const researchRequired =
            input.forceResearch ===
                true ||
            (
                settings.autoResearch !==
                    false &&
                needsResearch(
                    message
                )
            );

        if (
            researchRequired &&
            typeof input.researchFn ===
                "function"
        ) {
            try {
                const research =
                    await input.researchFn(
                        message,
                        input
                    );

                if (
                    research?.success &&
                    research?.context
                ) {
                    messages.push({
                        role:
                            "system",
                        content:
                            `Güncel araştırma bağlamı:\n${String(
                                research.context
                            ).slice(
                                0,
                                20000
                            )}`
                    });
                }
            } catch (error) {
                this.logger.add(
                    "research_context_error",
                    {
                        error:
                            error.message
                    }
                );
            }
        }

        const selected =
            resolveProvider(
                model
            );

        const chain = [];

        if (
            selected.provider ===
            "groq"
        ) {
            chain.push({
                provider:
                    "groq",
                model:
                    selected.model
            });

            chain.push({
                provider:
                    "cerebras",
                model:
                    "gpt-oss-120b"
            });

            chain.push({
                provider:
                    "gemini",
                model:
                    "gemini-2.5-flash"
            });
        } else if (
            selected.provider ===
            "cerebras"
        ) {
            chain.push({
                provider:
                    "cerebras",
                model:
                    selected.model
            });

            chain.push({
                provider:
                    "groq",
                model:
                    "openai/gpt-oss-20b"
            });

            chain.push({
                provider:
                    "gemini",
                model:
                    "gemini-2.5-flash"
            });
        } else if (
            selected.provider ===
            "gemini"
        ) {
            chain.push({
                provider:
                    "gemini",
                model:
                    selected.model
            });

            chain.push({
                provider:
                    "groq",
                model:
                    "openai/gpt-oss-20b"
            });

            chain.push({
                provider:
                    "cerebras",
                model:
                    "gpt-oss-120b"
            });
        } else {
            chain.push({
                provider:
                    "local",
                model:
                    "turkai-local"
            });
        }

        if (
            settings.localFallback
        ) {
            chain.push({
                provider:
                    "local",
                model:
                    "turkai-local"
            });
        }

        const attempts = [];

        for (
            const target of chain
        ) {
            const started =
                Date.now();

            const result =
                await this.providers
                    .request(
                        target.provider,
                        messages,
                        {
                            ...options,
                            model:
                                target.model
                        }
                    );

            const elapsed =
                Date.now() -
                started;

            attempts.push({
                provider:
                    target.provider,
                model:
                    target.model,
                success:
                    result.success,
                code:
                    result.code ||
                    null,
                status:
                    result.status ||
                    null,
                durationMs:
                    elapsed
            });

            if (
                result.success
            ) {
                const response = {
                    success:
                        true,

                    answer:
                        result.answer,

                    provider:
                        result.provider,

                    model:
                        result.model ||
                        target.model,

                    source:
                        "ai_provider",

                    researched:
                        researchRequired,

                    cached:
                        false,

                    attempts,

                    requestId:
                        createId(
                            "request"
                        )
                };

                if (
                    input.allowCache !==
                    false
                ) {
                    this.cache.set(
                        messages,
                        options,
                        response
                    );
                }

                this.logger.add(
                    "generation_success",
                    {
                        provider:
                            result.provider,
                        model:
                            result.model ||
                            target.model,
                        durationMs:
                            elapsed,
                        researched:
                            researchRequired
                    }
                );

                this.emit(
                    "response",
                    response
                );

                return response;
            }

            this.logger.add(
                "provider_failed",
                {
                    provider:
                        target.provider,
                    model:
                        target.model,
                    code:
                        result.code,
                    status:
                        result.status,
                    error:
                        result.error
                }
            );
        }

        const local =
            localAI.generate(
                message,
                input
            );

        const fallback = {
            success:
                true,

            answer:
                local.answer,

            provider:
                "local",

            model:
                "turkai-local",

            source:
                "local_fallback",

            researched:
                researchRequired,

            cached:
                false,

            attempts,

            fallback:
                true,

            requestId:
                createId(
                    "fallback"
                )
        };

        this.logger.add(
            "local_fallback",
            {
                attempts
            }
        );

        return fallback;
    }
}

// ============================================================
// SINGLETON
// ============================================================

const aiEngine =
    new AIEngine();

// ============================================================
// EXPRESS ROUTES
// ============================================================

function registerAIRoutes(
    app
) {
    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    app.get(
        "/api/ai/status",
        (req, res) => {
            res.json({
                success: true,
                ...aiEngine
                    .getStatus()
            });
        }
    );

    // --------------------------------------------------------
    // SETTINGS
    // --------------------------------------------------------

    app.get(
        "/api/ai/settings",
        (req, res) => {
            res.json({
                success: true,
                settings:
                    aiSettingsManager
                        .get()
            });
        }
    );

    app.post(
        "/api/ai/settings",
        (req, res) => {
            const settings =
                aiSettingsManager
                    .update(
                        req.body ||
                        {}
                    );

            res.json({
                success: true,
                settings
            });
        }
    );

    // --------------------------------------------------------
    // MODELS
    // --------------------------------------------------------

    app.get(
        "/api/ai/providers",
        (req, res) => {
            res.json({
                success: true,
                providers:
                    providerManager
                        .list()
            });
        }
    );

    // --------------------------------------------------------
    // MAIN CHAT
    // --------------------------------------------------------

    app.post(
        "/api/chat",
        async (req, res) => {
            try {
                const body =
                    req.body ||
                    {};

                const result =
                    await aiEngine.generate({
                        message:
                            body.message ||
                            body.prompt,

                        model:
                            body.model,

                        history:
                            body.history,

                        context:
                            body.context,

                        systemPrompt:
                            body.systemPrompt,

                        temperature:
                            body.temperature,

                        maxTokens:
                            body.maxTokens,

                        forceResearch:
                            body.forceResearch,

                        allowCache:
                            body.allowCache,

                        researchFn:
                            req.app.locals
                                ?.turkaiResearch
                    });

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
            } catch (error) {
                aiLogger.add(
                    "chat_route_error",
                    {
                        error:
                            error.message
                    }
                );

                return res.status(
                    500
                ).json({
                    success: false,
                    error:
                        "TürkAI yanıt oluştururken hata oluştu."
                });
            }
        }
    );

    // --------------------------------------------------------
    // MESSAGE ALIAS
    // --------------------------------------------------------

    app.post(
        "/api/message",
        async (req, res) => {
            try {
                const body =
                    req.body ||
                    {};

                const result =
                    await aiEngine.generate({
                        message:
                            body.message ||
                            body.text ||
                            body.prompt,

                        model:
                            body.model,

                        history:
                            body.history,

                        context:
                            body.context,

                        forceResearch:
                            body.forceResearch
                    });

                return res.json(
                    result
                );
            } catch {
                return res.status(
                    500
                ).json({
                    success: false,
                    error:
                        "Mesaj işlenemedi."
                });
            }
        }
    );

    // --------------------------------------------------------
    // ASK ALIAS
    // --------------------------------------------------------

    app.post(
        "/api/ask",
        async (req, res) => {
            try {
                const body =
                    req.body ||
                    {};

                const result =
                    await aiEngine.generate({
                        message:
                            body.question ||
                            body.message ||
                            body.prompt,

                        model:
                            body.model,

                        history:
                            body.history,

                        context:
                            body.context,

                        forceResearch:
                            body.forceResearch
                    });

                return res.json(
                    result
                );
            } catch {
                return res.status(
                    500
                ).json({
                    success: false,
                    error:
                        "Soru işlenemedi."
                });
            }
        }
    );

    // --------------------------------------------------------
    // SIMPLE TEST
    // --------------------------------------------------------

    app.post(
        "/api/ai/test",
        async (req, res) => {
            const result =
                await aiEngine.generate({
                    message:
                        req.body?.message ||
                        "Merhaba TürkAI"
                });

            res.json(
                result
            );
        }
    );

    // --------------------------------------------------------
    // CACHE CLEAR
    // --------------------------------------------------------

    app.post(
        "/api/ai/cache/clear",
        (req, res) => {
            aiCacheManager.clear();

            res.json({
                success: true,
                message:
                    "AI önbelleği temizlendi."
            });
        }
    );

    // --------------------------------------------------------
    // LOGS
    // --------------------------------------------------------

    app.get(
        "/api/ai/logs",
        (req, res) => {
            res.json({
                success: true,
                logs:
                    aiLogger.recent(
                        req.query.limit
                    )
            });
        }
    );
}

// ============================================================
// SOCKET.IO
// ============================================================

function registerAISocket(
    io
) {
    if (
        !io ||
        typeof io.on !==
            "function"
    ) {
        return;
    }

    io.on(
        "connection",
        (socket) => {

            socket.on(
                "ai:message",
                async (
                    payload = {}
                ) => {
                    try {
                        const result =
                            await aiEngine
                                .generate({
                                    ...payload,

                                    message:
                                        payload.message ||
                                        payload.text,

                                    history:
                                        payload.history,

                                    context:
                                        payload.context
                                });

                        socket.emit(
                            "ai:response",
                            result
                        );
                    } catch (error) {
                        socket.emit(
                            "ai:response",
                            {
                                success: false,
                                error:
                                    "AI yanıtı oluşturulamadı."
                            }
                        );
                    }
                }
            );

            socket.on(
                "ai:typing",
                () => {
                    socket.emit(
                        "ai:typing",
                        {
                            active:
                                true
                        }
                    );
                }
            );
        }
    );
}

// ============================================================
// FULL AI REGISTRATION
// ============================================================

function registerAISystem(
    app,
    io = null
) {
    registerAIRoutes(
        app
    );

    if (io) {
        registerAISocket(
            io
        );
    }

    return {
        aiEngine,
        providerManager,
        aiCacheManager,
        aiLogger,
        aiSettingsManager
    };
}

// ============================================================
// RESEARCH HOOK
// ============================================================

function attachResearchEngine(
    app,
    researchFunction
) {
    if (
        !app ||
        typeof researchFunction !==
            "function"
    ) {
        return false;
    }

    app.locals =
        app.locals || {};

    app.locals
        .turkaiResearch =
        researchFunction;

    return true;
}

// ============================================================
// MEMORY HOOK
// ============================================================

function attachMemoryManager(
    app,
    manager
) {
    if (
        !app ||
        !manager
    ) {
        return false;
    }

    app.locals =
        app.locals || {};

    app.locals
        .turkaiMemory =
        manager;

    return true;
}

// ============================================================
// PLAN HOOK
// ============================================================

function attachPlanManager(
    app,
    manager
) {
    if (
        !app ||
        !manager
    ) {
        return false;
    }

    app.locals =
        app.locals || {};

    app.locals
        .turkaiPlans =
        manager;

    return true;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    AI_CONFIG,

    DEFAULT_SYSTEM_PROMPT,

    SIMPLE_MESSAGES,

    aiEngine,

    aiCacheManager,

    aiLogger,

    aiSettingsManager,

    providerManager,

    localAI,

    GroqProvider,

    CerebrasProvider,

    GeminiProvider,

    ProviderManager,

    AIEngine,

    AICache,

    AILogger,

    AISettings,

    LocalAI,

    registerAIRoutes,

    registerAISocket,

    registerAISystem,

    attachResearchEngine,

    attachMemoryManager,

    attachPlanManager,

    buildMessages,

    findSimpleAnswer,

    needsResearch,

    resolveProvider,

    normalizeQuestion,

    normalizeText,

    createId
};

// ============================================================
// PART 5 END
// ============================================================
