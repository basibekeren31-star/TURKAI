"use strict";

/*
╔══════════════════════════════════════════════════════════════════════╗
║                         TÜRKAI SERVER                              ║
║                         VERSION 12.0                               ║
║                                                                      ║
║  PARÇA 1 / 5                                                        ║
║                                                                      ║
║  Bu bölüm:                                                           ║
║  - Express                                                          ║
║  - HTTP                                                              ║
║  - Socket.IO                                                         ║
║  - CORS                                                              ║
║  - Helmet                                                            ║
║  - JSON database                                                     ║
║  - Klasör sistemi                                                    ║
║  - Yardımcı fonksiyonlar                                             ║
║  - ID üretimi                                                         ║
║  - Log sistemi                                                        ║
║  - Güvenlik yardımcıları                                             ║
║  - Request yardımcıları                                              ║
║  - Temel server altyapısı                                             ║
║                                                                      ║
║  SONRAKİ PARÇALAR BU DOSYANIN ALTINA EKLENECEK.                     ║
╚══════════════════════════════════════════════════════════════════════╝
*/


/* ================================================================
   001 — MODÜLLER
================================================================ */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const os = require("os");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");

require("dotenv").config();


/* ================================================================
   002 — EXPRESS
================================================================ */

const app = express();

const httpServer = http.createServer(app);


/* ================================================================
   003 — SOCKET.IO
================================================================ */

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ]
    }
});


/* ================================================================
   004 — TEMEL AYARLAR
================================================================ */

const PORT = Number(process.env.PORT) || 3000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const APP_NAME = "TürkAI";

const APP_VERSION = "12.0.0";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

const START_TIME = Date.now();


/* ================================================================
   005 — ROOT DİZİNLERİ
================================================================ */

const ROOT_DIR = __dirname;

const PUBLIC_DIR =
    path.join(
        ROOT_DIR,
        "public"
    );

const DATA_DIR =
    path.join(
        ROOT_DIR,
        "data"
    );

const DB_DIR =
    path.join(
        DATA_DIR,
        "database"
    );

const STORAGE_DIR =
    path.join(
        DATA_DIR,
        "storage"
    );

const USERS_DIR =
    path.join(
        STORAGE_DIR,
        "users"
    );

const GENERATED_DIR =
    path.join(
        STORAGE_DIR,
        "generated"
    );

const UPLOADS_DIR =
    path.join(
        STORAGE_DIR,
        "uploads"
    );

const PROJECTS_DIR =
    path.join(
        STORAGE_DIR,
        "projects"
    );

const TEMP_DIR =
    path.join(
        STORAGE_DIR,
        "temp"
    );

const LOGS_DIR =
    path.join(
        DATA_DIR,
        "logs"
    );

const BACKUPS_DIR =
    path.join(
        DATA_DIR,
        "backups"
    );


/* ================================================================
   006 — GEREKLİ KLASÖRLER
================================================================ */

const REQUIRED_DIRECTORIES = [
    PUBLIC_DIR,
    DATA_DIR,
    DB_DIR,
    STORAGE_DIR,
    USERS_DIR,
    GENERATED_DIR,
    UPLOADS_DIR,
    PROJECTS_DIR,
    TEMP_DIR,
    LOGS_DIR,
    BACKUPS_DIR
];

for (const directory of REQUIRED_DIRECTORIES) {
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


/* ================================================================
   007 — DATABASE DOSYALARI
================================================================ */

const DB_FILES = {

    users:
        path.join(
            DB_DIR,
            "users.json"
        ),

    sessions:
        path.join(
            DB_DIR,
            "sessions.json"
        ),

    chats:
        path.join(
            DB_DIR,
            "chats.json"
        ),

    messages:
        path.join(
            DB_DIR,
            "messages.json"
        ),

    memories:
        path.join(
            DB_DIR,
            "memories.json"
        ),

    knowledge:
        path.join(
            DB_DIR,
            "knowledge.json"
        ),

    feedback:
        path.join(
            DB_DIR,
            "feedback.json"
        ),

    corrections:
        path.join(
            DB_DIR,
            "corrections.json"
        ),

    usage:
        path.join(
            DB_DIR,
            "usage.json"
        ),

    audit:
        path.join(
            DB_DIR,
            "audit.json"
        ),

    security:
        path.join(
            DB_DIR,
            "security.json"
        ),

    settings:
        path.join(
            DB_DIR,
            "settings.json"
        ),

    files:
        path.join(
            DB_DIR,
            "files.json"
        ),

    projects:
        path.join(
            DB_DIR,
            "projects.json"
        ),

    notifications:
        path.join(
            DB_DIR,
            "notifications.json"
        ),

    events:
        path.join(
            DB_DIR,
            "events.json"
        )
};


/* ================================================================
   008 — BOŞ DATABASE ŞABLONLARI
================================================================ */

const DEFAULT_DATABASES = {

    users: [],

    sessions: [],

    chats: [],

    messages: [],

    memories: [],

    knowledge: [],

    feedback: [],

    corrections: [],

    usage: {},

    audit: [],

    security: [],

    settings: {},

    files: [],

    projects: [],

    notifications: [],

    events: []
};


/* ================================================================
   009 — JSON OKUMA
================================================================ */

function readJSON(
    filePath,
    fallback = null
) {

    try {

        if (!fs.existsSync(filePath)) {
            return fallback;
        }

        const raw =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (!raw.trim()) {
            return fallback;
        }

        return JSON.parse(raw);

    } catch (error) {

        console.error(
            "[TürkAI] JSON okuma hatası:",
            filePath,
            error.message
        );

        return fallback;
    }
}


/* ================================================================
   010 — JSON YAZMA
================================================================ */

function writeJSON(
    filePath,
    data
) {

    try {

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

        console.error(
            "[TürkAI] JSON yazma hatası:",
            filePath,
            error.message
        );

        return false;
    }
}


/* ================================================================
   011 — DATABASE BAŞLATMA
================================================================ */

function initializeDatabase() {

    for (
        const [name, filePath]
        of Object.entries(DB_FILES)
    ) {

        if (!fs.existsSync(filePath)) {

            const template =
                DEFAULT_DATABASES[name] ??
                null;

            writeJSON(
                filePath,
                template
            );

            console.log(
                `[TürkAI] Database oluşturuldu: ${name}`
            );
        }
    }
}

initializeDatabase();


/* ================================================================
   012 — DATABASE CACHE
================================================================ */

const DB = {};

function loadDatabaseCache() {

    for (
        const [name, filePath]
        of Object.entries(DB_FILES)
    ) {

        DB[name] =
            readJSON(
                filePath,
                DEFAULT_DATABASES[name]
            );
    }
}

loadDatabaseCache();


/* ================================================================
   013 — DATABASE KAYDET
================================================================ */

function saveDatabase(
    name
) {

    if (!DB_FILES[name]) {
        return false;
    }

    return writeJSON(
        DB_FILES[name],
        DB[name]
    );
}


/* ================================================================
   014 — TÜM DATABASE'İ KAYDET
================================================================ */

function saveAllDatabases() {

    for (
        const name
        of Object.keys(DB_FILES)
    ) {

        try {
            saveDatabase(name);
        } catch (error) {

            console.error(
                "[TürkAI] Database save:",
                name,
                error.message
            );
        }
    }
}


/* ================================================================
   015 — ID ÜRETİCİ
================================================================ */

function createId(
    prefix = "id"
) {

    const random =
        crypto
            .randomBytes(12)
            .toString("hex");

    const timestamp =
        Date.now()
            .toString(36);

    return `${prefix}_${timestamp}_${random}`;
}


/* ================================================================
   016 — SESSION ID
================================================================ */

function createSessionId() {

    return createId(
        "session"
    );
}


/* ================================================================
   017 — CHAT ID
================================================================ */

function createChatId() {

    return createId(
        "chat"
    );
}


/* ================================================================
   018 — MESSAGE ID
================================================================ */

function createMessageId() {

    return createId(
        "msg"
    );
}


/* ================================================================
   019 — USER ID
================================================================ */

function createUserId() {

    return createId(
        "user"
    );
}


/* ================================================================
   020 — FILE ID
================================================================ */

function createFileId() {

    return createId(
        "file"
    );
}


/* ================================================================
   021 — PROJECT ID
================================================================ */

function createProjectId() {

    return createId(
        "project"
    );
}


/* ================================================================
   022 — ISO TARİH
================================================================ */

function nowISO() {

    return new Date()
        .toISOString();
}


/* ================================================================
   023 — UNIX ZAMAN
================================================================ */

function nowUnix() {

    return Date.now();
}


/* ================================================================
   024 — METİN TEMİZLE
================================================================ */

function cleanText(
    value,
    maxLength = 10000
) {

    if (
        value === undefined ||
        value === null
    ) {
        return "";
    }

    let text =
        String(value);

    text =
        text
            .replace(/\u0000/g, "")
            .trim();

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


/* ================================================================
   025 — GÜVENLİ DOSYA ADI
================================================================ */

function safeFileName(
    value
) {

    const input =
        cleanText(
            value,
            180
        );

    return input
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )
        .replace(
            /_+/g,
            "_"
        );
}


/* ================================================================
   026 — BOOLEAN PARSE
================================================================ */

function toBoolean(
    value,
    fallback = false
) {

    if (
        value === true ||
        value === false
    ) {
        return value;
    }

    if (
        value === "true" ||
        value === "1" ||
        value === 1
    ) {
        return true;
    }

    if (
        value === "false" ||
        value === "0" ||
        value === 0
    ) {
        return false;
    }

    return fallback;
}


/* ================================================================
   027 — NUMBER PARSE
================================================================ */

function toNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    if (
        Number.isFinite(number)
    ) {
        return number;
    }

    return fallback;
}


/* ================================================================
   028 — ARRAY GÜVENLİ
================================================================ */

function safeArray(
    value
) {

    return Array.isArray(value)
        ? value
        : [];
}


/* ================================================================
   029 — OBJECT GÜVENLİ
================================================================ */

function safeObject(
    value
) {

    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
    ) {
        return value;
    }

    return {};
}


/* ================================================================
   030 — LOG DOSYASI
================================================================ */

const LOG_FILE =
    path.join(
        LOGS_DIR,
        "server.log"
    );


/* ================================================================
   031 — LOG YAZ
================================================================ */

function writeLog(
    level,
    message,
    extra = null
) {

    const line = [
        `[${nowISO()}]`,
        `[${String(level).toUpperCase()}]`,
        message,
        extra
            ? JSON.stringify(extra)
            : ""
    ]
        .filter(Boolean)
        .join(" ");

    try {

        fs.appendFileSync(
            LOG_FILE,
            line + "\n",
            "utf8"
        );

    } catch (error) {

        console.error(
            "[TürkAI] Log yazılamadı:",
            error.message
        );
    }

    if (
        level === "error"
    ) {

        console.error(
            line
        );

    } else if (
        level === "warn"
    ) {

        console.warn(
            line
        );

    } else {

        console.log(
            line
        );
    }
}


/* ================================================================
   032 — LOG KISAYOLLARI
================================================================ */

function logInfo(
    message,
    extra
) {

    writeLog(
        "info",
        message,
        extra
    );
}


function logWarn(
    message,
    extra
) {

    writeLog(
        "warn",
        message,
        extra
    );
}


function logError(
    message,
    extra
) {

    writeLog(
        "error",
        message,
        extra
    );
}


/* ================================================================
   033 — REQUEST ID
================================================================ */

function createRequestId() {

    return createId(
        "req"
    );
}


/* ================================================================
   034 — IP AL
================================================================ */

function getClientIP(
    req
) {

    const forwarded =
        req.headers[
            "x-forwarded-for"
        ];

    if (
        forwarded
    ) {

        return String(
            forwarded
        )
        .split(",")[0]
        .trim();
    }

    return (
        req.socket?.remoteAddress ||
        req.ip ||
        "unknown"
    );
}


/* ================================================================
   035 — USER AGENT
================================================================ */

function getUserAgent(
    req
) {

    return cleanText(
        req.headers[
            "user-agent"
        ] || "",
        1000
    );
}


/* ================================================================
   036 — REQUEST LOGGER
================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {

        const requestId =
            createRequestId();

        req.requestId =
            requestId;

        const started =
            Date.now();

        res.setHeader(
            "X-Request-ID",
            requestId
        );

        res.on(
            "finish",
            () => {

                const duration =
                    Date.now() -
                    started;

                logInfo(
                    `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
                    {
                        requestId,
                        ip:
                            getClientIP(
                                req
                            )
                    }
                );
            }
        );

        next();
    }
);


/* ================================================================
   037 — HELMET
================================================================ */

app.use(
    helmet({
        contentSecurityPolicy:
            false,

        crossOriginEmbedderPolicy:
            false
    })
);


/* ================================================================
   038 — CORS
================================================================ */

app.use(
    cors({
        origin: true,

        credentials: false,

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
            "X-Requested-With",
            "X-Request-ID"
        ]
    })
);


/* ================================================================
   039 — BODY PARSER
================================================================ */

app.use(
    express.json({
        limit: "20mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "20mb"
    })
);


/* ================================================================
   040 — JSON HEADER
================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {

        res.setHeader(
            "X-TurkAI-Version",
            APP_VERSION
        );

        res.setHeader(
            "X-TurkAI-Server",
            "TürkAI"
        );

        next();
    }
);


/* ================================================================
   041 — RATE LIMIT CACHE
================================================================ */

const RATE_LIMIT_CACHE =
    new Map();


/* ================================================================
   042 — RATE LIMIT TEMİZLEME
================================================================ */

setInterval(
    () => {

        const now =
            Date.now();

        for (
            const [
                key,
                value
            ]
            of RATE_LIMIT_CACHE
        ) {

            if (
                now -
                value.windowStart >
                15 * 60 * 1000
            ) {

                RATE_LIMIT_CACHE.delete(
                    key
                );
            }
        }

    },
    60 * 1000
);


/* ================================================================
   043 — BASİT RATE LIMIT
================================================================ */

function simpleRateLimit(
    options = {}
) {

    const limit =
        Number(
            options.limit
        ) || 120;

    const windowMs =
        Number(
            options.windowMs
        ) ||
        15 * 60 * 1000;

    return (
        req,
        res,
        next
    ) => {

        const ip =
            getClientIP(req);

        const key =
            `${ip}:${req.path}`;

        const now =
            Date.now();

        let record =
            RATE_LIMIT_CACHE.get(
                key
            );

        if (
            !record ||
            now -
            record.windowStart >
            windowMs
        ) {

            record = {
                count: 0,
                windowStart: now
            };
        }

        record.count++;

        RATE_LIMIT_CACHE.set(
            key,
            record
        );

        res.setHeader(
            "X-RateLimit-Limit",
            String(limit)
        );

        res.setHeader(
            "X-RateLimit-Remaining",
            String(
                Math.max(
                    0,
                    limit -
                    record.count
                )
            )
        );

        if (
            record.count >
            limit
        ) {

            return res
                .status(429)
                .json({
                    ok: false,
                    error:
                        "Çok fazla istek gönderildi.",
                    code:
                        "RATE_LIMITED",
                    requestId:
                        req.requestId
                });
        }

        next();
    };
}


/* ================================================================
   044 — HEALTH ENDPOINT
================================================================ */

app.get(
    "/api/health",
    (
        req,
        res
    ) => {

        res.json({
            ok: true,

            status:
                "online",

            name:
                APP_NAME,

            version:
                APP_VERSION,

            environment:
                NODE_ENV,

            uptime:
                Math.floor(
                    (
                        Date.now() -
                        START_TIME
                    ) / 1000
                ),

            timestamp:
                nowISO(),

            requestId:
                req.requestId
        });
    }
);


/* ================================================================
   045 — ROOT API
================================================================ */

app.get(
    "/api",
    (
        req,
        res
    ) => {

        res.json({

            ok: true,

            name:
                APP_NAME,

            version:
                APP_VERSION,

            message:
                "TürkAI API aktif.",

            endpoints: [
                "/api/health",
                "/api/chat",
                "/api/upload",
                "/api/research",
                "/api/weather"
            ],

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   046 — SERVER INFO
================================================================ */

app.get(
    "/api/server-info",
    (
        req,
        res
    ) => {

        const memory =
            process.memoryUsage();

        res.json({

            ok: true,

            app: {
                name:
                    APP_NAME,

                version:
                    APP_VERSION,

                environment:
                    NODE_ENV,

                node:
                    process.version,

                platform:
                    process.platform,

                architecture:
                    process.arch
            },

            server: {

                hostname:
                    os.hostname(),

                cpuCount:
                    os.cpus().length,

                uptime:
                    process.uptime(),

                memory: {

                    rss:
                        memory.rss,

                    heapTotal:
                        memory.heapTotal,

                    heapUsed:
                        memory.heapUsed,

                    external:
                        memory.external
                }
            },

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   047 — STATIC PUBLIC
================================================================ */

if (
    fs.existsSync(
        PUBLIC_DIR
    )
) {

    app.use(
        express.static(
            PUBLIC_DIR,
            {
                index:
                    "index.html",

                extensions: [
                    "html"
                ],

                maxAge:
                    IS_PRODUCTION
                        ? "1h"
                        : 0
            }
        )
    );
}


/* ================================================================
   048 — SECURITY HEADER
================================================================ */

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

        next();
    }
);


/* ================================================================
   049 — SOCKET.IO BAĞLANTI
================================================================ */

io.on(
    "connection",
    (
        socket
    ) => {

        logInfo(
            "Socket.IO bağlantısı",
            {
                socketId:
                    socket.id
            }
        );

        socket.emit(
            "turkai:connected",
            {
                ok: true,

                server:
                    APP_NAME,

                version:
                    APP_VERSION,

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
                            nowISO()
                    }
                );
            }
        );


        socket.on(
            "disconnect",
            (
                reason
            ) => {

                logInfo(
                    "Socket.IO bağlantısı kapandı",
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


/* ================================================================
   050 — GENEL 404 API
================================================================ */

app.use(
    "/api",
    (
        req,
        res
    ) => {

        res.status(404)
            .json({

                ok: false,

                error:
                    "API endpoint bulunamadı.",

                code:
                    "API_NOT_FOUND",

                path:
                    req.originalUrl,

                method:
                    req.method,

                requestId:
                    req.requestId,

                available:
                    [
                        "/api",
                        "/api/health",
                        "/api/server-info",
                        "/api/chat"
                    ]
            });
    }
);


/* ================================================================
   051 — FRONTEND FALLBACK
================================================================ */

app.get(
    "*",
    (
        req,
        res,
        next
    ) => {

        if (
            req.path.startsWith(
                "/api/"
            )
        ) {

            return next();
        }

        const indexPath =
            path.join(
                PUBLIC_DIR,
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

        return res.status(404)
            .send(
                `
                <!doctype html>
                <html lang="tr">
                <head>
                    <meta charset="utf-8">
                    <title>TürkAI</title>
                    <style>
                        body{
                            margin:0;
                            background:#090b10;
                            color:#fff;
                            font-family:Arial,sans-serif;
                            display:grid;
                            place-items:center;
                            min-height:100vh;
                        }
                        .box{
                            padding:30px;
                            border:1px solid #252a36;
                            border-radius:18px;
                            background:#11151d;
                            text-align:center;
                        }
                    </style>
                </head>
                <body>
                    <div class="box">
                        <h1>TürkAI</h1>
                        <p>Frontend bulunamadı.</p>
                    </div>
                </body>
                </html>
                `
            );
    }
);


/* ================================================================
   052 — GENEL ERROR HANDLER
================================================================ */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        logError(
            "Express hata yakaladı",
            {
                message:
                    error?.message,

                stack:
                    error?.stack,

                requestId:
                    req.requestId
            }
        );

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }

        res.status(
            Number(
                error?.status
            ) || 500
        )
        .json({

            ok: false,

            error:
                IS_PRODUCTION
                    ? "Sunucu hatası."
                    : (
                        error?.message ||
                        "Sunucu hatası."
                    ),

            code:
                "INTERNAL_SERVER_ERROR",

            requestId:
                req.requestId
        });
    }
);


/* ================================================================
   053 — PROCESS HATA YAKALAMA
================================================================ */

process.on(
    "uncaughtException",
    (
        error
    ) => {

        logError(
            "UNCAUGHT EXCEPTION",
            {
                message:
                    error.message,

                stack:
                    error.stack
            }
        );
    }
);


/* ================================================================
   054 — UNHANDLED PROMISE
================================================================ */

process.on(
    "unhandledRejection",
    (
        reason
    ) => {

        logError(
            "UNHANDLED REJECTION",
            {
                reason:
                    String(reason)
            }
        );
    }
);


/* ================================================================
   055 — SHUTDOWN
================================================================ */

let shuttingDown =
    false;

async function gracefulShutdown(
    signal
) {

    if (
        shuttingDown
    ) {
        return;
    }

    shuttingDown =
        true;

    logInfo(
        `Server kapatılıyor: ${signal}`
    );

    try {

        saveAllDatabases();

    } catch (error) {

        logError(
            "Database kapanış kaydı başarısız",
            {
                message:
                    error.message
            }
        );
    }

    try {

        io.close();

    } catch (error) {

        logError(
            "Socket.IO kapatma hatası",
            {
                message:
                    error.message
            }
        );
    }

    try {

        httpServer.close(
            () => {

                logInfo(
                    "HTTP server kapandı."
                );

                process.exit(
                    0
                );
            }
        );

    } catch (error) {

        logError(
            "HTTP server kapatma hatası",
            {
                message:
                    error.message
            }
        );

        process.exit(
            1
        );
    }

    setTimeout(
        () => {

            process.exit(
                1
            );

        },
        10000
    );
}


process.on(
    "SIGTERM",
    () =>
        gracefulShutdown(
            "SIGTERM"
        )
);

process.on(
    "SIGINT",
    () =>
        gracefulShutdown(
            "SIGINT"
        )
);


/* ================================================================
   056 — START SERVER
================================================================ */

function startServer() {

    httpServer.listen(
        PORT,
        HOST,
        () => {

            console.log("");
            console.log(
                "════════════════════════════════════════════════════════"
            );
            console.log(
                "                    TÜRKAI SERVER"
            );
            console.log(
                "════════════════════════════════════════════════════════"
            );
            console.log(
                `Uygulama : ${APP_NAME}`
            );
            console.log(
                `Versiyon : ${APP_VERSION}`
            );
            console.log(
                `Node     : ${process.version}`
            );
            console.log(
                `Ortam    : ${NODE_ENV}`
            );
            console.log(
                `Port     : ${PORT}`
            );
            console.log(
                `Host     : ${HOST}`
            );
            console.log(
                `Public   : ${PUBLIC_DIR}`
            );
            console.log(
                `Database : ${DB_DIR}`
            );
            console.log(
                "────────────────────────────────────────────────────────"
            );
            console.log(
                `Health   : http://localhost:${PORT}/api/health`
            );
            console.log(
                `API      : http://localhost:${PORT}/api`
            );
            console.log(
                `Server   : http://localhost:${PORT}/api/server-info`
            );
            console.log(
                "────────────────────────────────────────────────────────"
            );
            console.log(
                "🔥 TÜRKAI SERVER AKTİF 🔥"
            );
            console.log(
                "════════════════════════════════════════════════════════"
            );
            console.log("");

            logInfo(
                "TürkAI server başlatıldı",
                {
                    port:
                        PORT,

                    host:
                        HOST,

                    version:
                        APP_VERSION
                }
            );
        }
    );
}


/* ================================================================
   057 — BAŞLAT
================================================================ */

startServer();


/*
╔══════════════════════════════════════════════════════════════════════╗
║                         PARÇA 1 SONU                                ║
║                                                                      ║
║  BURADAN SONRA PARÇA 2 GELECEK.                                    ║
║                                                                      ║
║  ÖNEMLİ:                                                            ║
║  Şimdilik server.js'yi çalıştırırsan:                               ║
║                                                                      ║
║      node server.js                                                 ║
║                                                                      ║
║  şu endpointler çalışır:                                           ║
║                                                                      ║
║      /api                                                           ║
║      /api/health                                                    ║
║      /api/server-info                                               ║
║                                                                      ║
║  /api/chat ise PARÇA 3'te gerçek olarak eklenecek.                  ║
╚══════════════════════════════════════════════════════════════════════╝
*/
/* ================================================================
   TÜRKAI SERVER — PARÇA 2 / 5
   USER + SESSION + CHAT + MEMORY + KNOWLEDGE ENGINE
================================================================ */


/* ================================================================
   058 — PLAN SİSTEMİ
================================================================ */

const PLANS = {

    free: {
        name: "Free",
        dailyMessages: 50,
        maxChats: 20,
        maxMemory: 50,
        maxUploadMB: 10,
        research: true,
        weather: true,
        coding: true,
        imageGeneration: false,
        videoGeneration: false
    },

    pro: {
        name: "Pro",
        dailyMessages: 100,
        maxChats: 100,
        maxMemory: 250,
        maxUploadMB: 25,
        research: true,
        weather: true,
        coding: true,
        imageGeneration: true,
        videoGeneration: false
    },

    plus: {
        name: "Plus",
        dailyMessages: 200,
        maxChats: 250,
        maxMemory: 500,
        maxUploadMB: 50,
        research: true,
        weather: true,
        coding: true,
        imageGeneration: true,
        videoGeneration: true
    },

    ultra: {
        name: "Ultra",
        dailyMessages: 1000,
        maxChats: 1000,
        maxMemory: 2000,
        maxUploadMB: 100,
        research: true,
        weather: true,
        coding: true,
        imageGeneration: true,
        videoGeneration: true
    },

    developer: {
        name: "Developer",
        dailyMessages: 400,
        maxChats: 9999,
        maxMemory: 9999,
        maxUploadMB: 200,
        research: true,
        weather: true,
        coding: true,
        imageGeneration: true,
        videoGeneration: true
    }
};


/* ================================================================
   059 — PLAN GETİR
================================================================ */

function getPlan(
    planName
) {

    const key =
        String(
            planName || "free"
        )
        .toLowerCase();

    return (
        PLANS[key] ||
        PLANS.free
    );
}


/* ================================================================
   060 — PLAN NORMALİZE
================================================================ */

function normalizePlan(
    plan
) {

    const key =
        String(
            plan || "free"
        )
        .toLowerCase();

    if (
        !PLANS[key]
    ) {
        return "free";
    }

    return key;
}


/* ================================================================
   061 — USER BUL
================================================================ */

function findUserById(
    userId
) {

    if (
        !userId
    ) {
        return null;
    }

    return safeArray(
        DB.users
    )
    .find(
        user =>
            user.id === userId
    ) || null;
}


/* ================================================================
   062 — EMAIL İLE USER BUL
================================================================ */

function findUserByEmail(
    email
) {

    const normalized =
        cleanText(
            email,
            320
        )
        .toLowerCase();

    if (
        !normalized
    ) {
        return null;
    }

    return safeArray(
        DB.users
    )
    .find(
        user =>
            String(
                user.email || ""
            )
            .toLowerCase() ===
            normalized
    ) || null;
}


/* ================================================================
   063 — USER OLUŞTUR
================================================================ */

function createUser(
    data = {}
) {

    const now =
        nowISO();

    const user = {

        id:
            createUserId(),

        name:
            cleanText(
                data.name ||
                "TürkAI Kullanıcısı",
                120
            ),

        email:
            cleanText(
                data.email || "",
                320
            )
            .toLowerCase(),

        avatar:
            cleanText(
                data.avatar || "",
                1000
            ),

        provider:
            cleanText(
                data.provider ||
                "local",
                50
            ),

        plan:
            normalizePlan(
                data.plan ||
                "free"
            ),

        active:
            true,

        createdAt:
            now,

        updatedAt:
            now,

        lastSeenAt:
            now,

        settings: {

            language:
                "tr",

            theme:
                "dark",

            notifications:
                true,

            sound:
                true,

            research:
                true
        },

        stats: {

            totalMessages:
                0,

            totalChats:
                0,

            totalUploads:
                0,

            totalResearch:
                0
        }
    };

    DB.users.push(
        user
    );

    saveDatabase(
        "users"
    );

    return user;
}


/* ================================================================
   064 — USER GETİR VEYA OLUŞTUR
================================================================ */

function getOrCreateUser(
    data = {}
) {

    let user = null;

    if (
        data.id
    ) {

        user =
            findUserById(
                data.id
            );
    }

    if (
        !user &&
        data.email
    ) {

        user =
            findUserByEmail(
                data.email
            );
    }

    if (
        user
    ) {

        user.lastSeenAt =
            nowISO();

        user.updatedAt =
            nowISO();

        if (
            data.name
        ) {

            user.name =
                cleanText(
                    data.name,
                    120
                );
        }

        if (
            data.avatar
        ) {

            user.avatar =
                cleanText(
                    data.avatar,
                    1000
                );
        }

        saveDatabase(
            "users"
        );

        return user;
    }

    return createUser(
        data
    );
}


/* ================================================================
   065 — USER PUBLIC VERİ
================================================================ */

function publicUser(
    user
) {

    if (
        !user
    ) {
        return null;
    }

    return {

        id:
            user.id,

        name:
            user.name,

        email:
            user.email,

        avatar:
            user.avatar,

        provider:
            user.provider,

        plan:
            user.plan,

        planInfo:
            getPlan(
                user.plan
            ),

        active:
            user.active,

        createdAt:
            user.createdAt,

        lastSeenAt:
            user.lastSeenAt,

        stats:
            user.stats,

        settings:
            user.settings
    };
}


/* ================================================================
   066 — SESSION OLUŞTUR
================================================================ */

function createSession(
    user
) {

    const token =
        crypto
            .randomBytes(32)
            .toString("hex");

    const session = {

        id:
            createSessionId(),

        token,

        userId:
            user.id,

        createdAt:
            nowISO(),

        lastSeenAt:
            nowISO(),

        expiresAt:
            new Date(
                Date.now() +
                30 *
                24 *
                60 *
                60 *
                1000
            )
            .toISOString(),

        ip:
            null,

        userAgent:
            null,

        active:
            true
    };

    DB.sessions.push(
        session
    );

    saveDatabase(
        "sessions"
    );

    return session;
}


/* ================================================================
   067 — SESSION BUL
================================================================ */

function findSession(
    token
) {

    if (
        !token
    ) {
        return null;
    }

    const session =
        safeArray(
            DB.sessions
        )
        .find(
            item =>
                item.token ===
                token &&
                item.active === true
        );

    if (
        !session
    ) {
        return null;
    }

    if (
        session.expiresAt &&
        new Date(
            session.expiresAt
        ).getTime() <
        Date.now()
    ) {

        session.active =
            false;

        saveDatabase(
            "sessions"
        );

        return null;
    }

    return session;
}


/* ================================================================
   068 — TOKEN ÇÖZ
================================================================ */

function getTokenFromRequest(
    req
) {

    const authorization =
        req.headers.authorization;

    if (
        authorization &&
        authorization.startsWith(
            "Bearer "
        )
    ) {

        return authorization
            .slice(7)
            .trim();
    }

    const headerToken =
        req.headers[
            "x-session-token"
        ];

    if (
        headerToken
    ) {
        return String(
            headerToken
        ).trim();
    }

    return null;
}


/* ================================================================
   069 — SESSION USER
================================================================ */

function getRequestUser(
    req
) {

    const token =
        getTokenFromRequest(
            req
        );

    if (
        token
    ) {

        const session =
            findSession(
                token
            );

        if (
            session
        ) {

            const user =
                findUserById(
                    session.userId
                );

            if (
                user
            ) {

                session.lastSeenAt =
                    nowISO();

                user.lastSeenAt =
                    nowISO();

                return user;
            }
        }
    }

    return null;
}


/* ================================================================
   070 — USER MIDDLEWARE
================================================================ */

function attachUser(
    req,
    res,
    next
) {

    try {

        req.user =
            getRequestUser(
                req
            );

    } catch (
        error
    ) {

        logError(
            "attachUser hatası",
            {
                message:
                    error.message
            }
        );

        req.user =
            null;
    }

    next();
}

app.use(
    attachUser
);


/* ================================================================
   071 — GUEST USER
================================================================ */

function getGuestUser(
    req
) {

    const guestId =
        req.headers[
            "x-guest-id"
        ] ||
        req.body?.guestId ||
        req.query?.guestId;

    if (
        guestId
    ) {

        return {
            id:
                `guest_${cleanText(
                    guestId,
                    100
                )}`,

            name:
                "Misafir",

            plan:
                "free",

            guest:
                true
        };
    }

    return {
        id:
            `guest_${getClientIP(
                req
            )}`,

        name:
            "Misafir",

        plan:
            "free",

        guest:
            true
    };
}


/* ================================================================
   072 — CHAT BUL
================================================================ */

function findChatById(
    chatId
) {

    if (
        !chatId
    ) {
        return null;
    }

    return safeArray(
        DB.chats
    )
    .find(
        chat =>
            chat.id === chatId
    ) || null;
}


/* ================================================================
   073 — USER CHATLARI
================================================================ */

function getUserChats(
    userId
) {

    return safeArray(
        DB.chats
    )
    .filter(
        chat =>
            chat.userId ===
            userId
    )
    .sort(
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


/* ================================================================
   074 — CHAT OLUŞTUR
================================================================ */

function createChat(
    userId,
    data = {}
) {

    const now =
        nowISO();

    const chat = {

        id:
            createChatId(),

        userId,

        title:
            cleanText(
                data.title ||
                "Yeni sohbet",
                200
            ),

        model:
            cleanText(
                data.model ||
                "fast",
                100
            ),

        createdAt:
            now,

        updatedAt:
            now,

        archived:
            false,

        pinned:
            false,

        messageCount:
            0,

        metadata:
            safeObject(
                data.metadata
            )
    };

    DB.chats.push(
        chat
    );

    saveDatabase(
        "chats"
    );

    return chat;
}


/* ================================================================
   075 — CHAT ERİŞİM KONTROL
================================================================ */

function userOwnsChat(
    user,
    chat
) {

    if (
        !user ||
        !chat
    ) {
        return false;
    }

    if (
        user.guest
    ) {

        return (
            chat.userId ===
            user.id
        );
    }

    return (
        chat.userId ===
        user.id
    );
}


/* ================================================================
   076 — MESAJLARI GETİR
================================================================ */

function getChatMessages(
    chatId,
    limit = 100
) {

    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) || 100,
                1
            ),
            500
        );

    return safeArray(
        DB.messages
    )
    .filter(
        message =>
            message.chatId ===
            chatId
    )
    .sort(
        (
            a,
            b
        ) =>
            new Date(
                a.createdAt
            ) -
            new Date(
                b.createdAt
            )
    )
    .slice(
        -safeLimit
    );
}


/* ================================================================
   077 — MESAJ OLUŞTUR
================================================================ */

function createMessage(
    data = {}
) {

    const message = {

        id:
            createMessageId(),

        chatId:
            data.chatId,

        userId:
            data.userId || null,

        role:
            data.role ||
            "user",

        content:
            cleanText(
                data.content || "",
                50000
            ),

        model:
            data.model ||
            null,

        createdAt:
            nowISO(),

        metadata:
            safeObject(
                data.metadata
            )
    };

    DB.messages.push(
        message
    );

    saveDatabase(
        "messages"
    );

    const chat =
        findChatById(
            data.chatId
        );

    if (
        chat
    ) {

        chat.messageCount =
            getChatMessages(
                chat.id,
                10000
            ).length;

        chat.updatedAt =
            nowISO();

        saveDatabase(
            "chats"
        );
    }

    return message;
}


/* ================================================================
   078 — CHAT BAŞLIĞI ÜRET
================================================================ */

function generateChatTitle(
    text
) {

    const clean =
        cleanText(
            text,
            200
        );

    if (
        !clean
    ) {
        return "Yeni sohbet";
    }

    const words =
        clean.split(
            /\s+/
        );

    let title =
        words
            .slice(
                0,
                8
            )
            .join(" ");

    if (
        title.length >
        60
    ) {

        title =
            title.slice(
                0,
                60
            );
    }

    if (
        clean.length >
        title.length
    ) {

        title +=
            "…";
    }

    return title;
}


/* ================================================================
   079 — CHAT TITLE OTOMATİK
================================================================ */

function updateChatTitle(
    chat,
    firstMessage
) {

    if (
        !chat
    ) {
        return;
    }

    if (
        chat.messageCount <= 2 ||
        chat.title ===
        "Yeni sohbet"
    ) {

        chat.title =
            generateChatTitle(
                firstMessage
            );

        chat.updatedAt =
            nowISO();

        saveDatabase(
            "chats"
        );
    }
}


/* ================================================================
   080 — MEMORY BUL
================================================================ */

function getUserMemories(
    userId
) {

    return safeArray(
        DB.memories
    )
    .filter(
        memory =>
            memory.userId ===
            userId
    )
    .sort(
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


/* ================================================================
   081 — MEMORY EKLE
================================================================ */

function addMemory(
    userId,
    content,
    metadata = {}
) {

    const text =
        cleanText(
            content,
            2000
        );

    if (
        !text
    ) {
        return null;
    }

    const existing =
        safeArray(
            DB.memories
        )
        .find(
            item =>
                item.userId ===
                userId &&
                item.content
                    .toLowerCase() ===
                text.toLowerCase()
        );

    if (
        existing
    ) {

        existing.updatedAt =
            nowISO();

        existing.metadata =
            safeObject(
                metadata
            );

        saveDatabase(
            "memories"
        );

        return existing;
    }

    const memory = {

        id:
            createId(
                "memory"
            ),

        userId,

        content:
            text,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        important:
            Boolean(
                metadata.important
            ),

        source:
            metadata.source ||
            "user",

        metadata:
            safeObject(
                metadata
            )
    };

    DB.memories.push(
        memory
    );

    saveDatabase(
        "memories"
    );

    return memory;
}


/* ================================================================
   082 — MEMORY SİL
================================================================ */

function deleteMemory(
    userId,
    memoryId
) {

    const index =
        DB.memories.findIndex(
            memory =>
                memory.id ===
                memoryId &&
                memory.userId ===
                userId
        );

    if (
        index === -1
    ) {
        return false;
    }

    DB.memories.splice(
        index,
        1
    );

    saveDatabase(
        "memories"
    );

    return true;
}


/* ================================================================
   083 — KNOWLEDGE ARAMA
================================================================ */

function searchKnowledge(
    query,
    limit = 5
) {

    const text =
        cleanText(
            query,
            5000
        )
        .toLowerCase();

    if (
        !text
    ) {
        return [];
    }

    const queryWords =
        text
            .split(
                /\s+/
            )
            .filter(
                word =>
                    word.length >= 2
            );

    const results =
        safeArray(
            DB.knowledge
        )
        .map(
            item => {

                const source =
                    `${item.question || ""} ${item.answer || ""}`
                    .toLowerCase();

                let score = 0;

                for (
                    const word
                    of queryWords
                ) {

                    if (
                        source.includes(
                            word
                        )
                    ) {

                        score++;
                    }
                }

                if (
                    source.includes(
                        text
                    )
                ) {

                    score += 5;
                }

                return {
                    item,
                    score
                };
            }
        )
        .filter(
            result =>
                result.score > 0
        )
        .sort(
            (
                a,
                b
            ) =>
                b.score -
                a.score
        )
        .slice(
            0,
            Math.max(
                1,
                limit
            )
        );

    return results;
}


/* ================================================================
   084 — KNOWLEDGE CEVABI
================================================================ */

function findKnowledgeAnswer(
    query
) {

    const results =
        searchKnowledge(
            query,
            3
        );

    if (
        !results.length
    ) {
        return null;
    }

    const best =
        results[0];

    if (
        best.score < 2
    ) {
        return null;
    }

    return {

        answer:
            best.item.answer,

        source:
            "knowledge",

        score:
            best.score,

        id:
            best.item.id
    };
}


/* ================================================================
   085 — KNOWLEDGE KAYDET
================================================================ */

function saveKnowledge(
    question,
    answer,
    metadata = {}
) {

    const q =
        cleanText(
            question,
            5000
        );

    const a =
        cleanText(
            answer,
            20000
        );

    if (
        !q ||
        !a
    ) {
        return null;
    }

    const existing =
        safeArray(
            DB.knowledge
        )
        .find(
            item =>
                String(
                    item.question || ""
                )
                .toLowerCase() ===
                q.toLowerCase()
        );

    if (
        existing
    ) {

        existing.answer =
            a;

        existing.updatedAt =
            nowISO();

        existing.metadata =
            safeObject(
                metadata
            );

        saveDatabase(
            "knowledge"
        );

        return existing;
    }

    const entry = {

        id:
            createId(
                "knowledge"
            ),

        question:
            q,

        answer:
            a,

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        usageCount:
            0,

        metadata:
            safeObject(
                metadata
            )
    };

    DB.knowledge.push(
        entry
    );

    saveDatabase(
        "knowledge"
    );

    return entry;
}


/* ================================================================
   086 — KNOWLEDGE KULLANIMI
================================================================ */

function markKnowledgeUsed(
    knowledgeId
) {

    const item =
        DB.knowledge.find(
            entry =>
                entry.id ===
                knowledgeId
        );

    if (
        !item
    ) {
        return;
    }

    item.usageCount =
        Number(
            item.usageCount
        ) + 1;

    item.updatedAt =
        nowISO();

    saveDatabase(
        "knowledge"
    );
}


/* ================================================================
   087 — GÜNLÜK ANAHTAR
================================================================ */

function getDateKey(
    date = new Date()
) {

    return date
        .toISOString()
        .slice(
            0,
            10
        );
}


/* ================================================================
   088 — KULLANIM GETİR
================================================================ */

function getUsageRecord(
    userId
) {

    const day =
        getDateKey();

    if (
        !DB.usage ||
        typeof DB.usage !==
        "object"
    ) {

        DB.usage = {};
    }

    if (
        !DB.usage[userId]
    ) {

        DB.usage[userId] = {};
    }

    if (
        !DB.usage[userId][day]
    ) {

        DB.usage[userId][day] = {

            messages:
                0,

            research:
                0,

            images:
                0,

            videos:
                0,

            uploads:
                0
        };
    }

    return DB.usage[
        userId
    ][day];
}


/* ================================================================
   089 — KULLANIM ARTIR
================================================================ */

function incrementUsage(
    userId,
    type = "messages"
) {

    const record =
        getUsageRecord(
            userId
        );

    if (
        typeof record[type] !==
        "number"
    ) {

        record[type] =
            0;
    }

    record[type]++;

    saveDatabase(
        "usage"
    );

    return record;
}


/* ================================================================
   090 — MESAJ LİMİTİ
================================================================ */

function canSendMessage(
    user
) {

    if (
        !user
    ) {
        return {
            allowed: true
        };
    }

    const plan =
        getPlan(
            user.plan
        );

    const usage =
        getUsageRecord(
            user.id
        );

    const used =
        Number(
            usage.messages
        ) || 0;

    if (
        used >=
        plan.dailyMessages
    ) {

        return {

            allowed:
                false,

            reason:
                "Günlük mesaj limitine ulaştın.",

            used,

            limit:
                plan.dailyMessages
        };
    }

    return {

        allowed:
            true,

        used,

        limit:
            plan.dailyMessages
    };
}


/* ================================================================
   091 — CHAT LİMİTİ
================================================================ */

function canCreateChat(
    user
) {

    if (
        !user
    ) {
        return {
            allowed: true
        };
    }

    const plan =
        getPlan(
            user.plan
        );

    const chats =
        getUserChats(
            user.id
        );

    if (
        chats.length >=
        plan.maxChats
    ) {

        return {

            allowed:
                false,

            reason:
                "Maksimum sohbet sayısına ulaştın.",

            used:
                chats.length,

            limit:
                plan.maxChats
        };
    }

    return {

        allowed:
            true,

        used:
            chats.length,

        limit:
            plan.maxChats
    };
}


/* ================================================================
   092 — MEMORY LİMİTİ
================================================================ */

function canCreateMemory(
    user
) {

    if (
        !user
    ) {
        return {
            allowed: true
        };
    }

    const plan =
        getPlan(
            user.plan
        );

    const memories =
        getUserMemories(
            user.id
        );

    if (
        memories.length >=
        plan.maxMemory
    ) {

        return {

            allowed:
                false,

            reason:
                "Memory limitine ulaştın.",

            used:
                memories.length,

            limit:
                plan.maxMemory
        };
    }

    return {

        allowed:
            true,

        used:
            memories.length,

        limit:
            plan.maxMemory
    };
}


/* ================================================================
   093 — PLAN İSTATİSTİĞİ
================================================================ */

function getUserUsage(
    user
) {

    if (
        !user
    ) {
        return {
            messages: 0,
            research: 0,
            images: 0,
            videos: 0,
            uploads: 0
        };
    }

    return getUsageRecord(
        user.id
    );
}


/* ================================================================
   094 — USER STATS
================================================================ */

function calculateUserStats(
    user
) {

    if (
        !user
    ) {
        return {};
    }

    const chats =
        getUserChats(
            user.id
        );

    const messages =
        DB.messages.filter(
            message =>
                message.userId ===
                user.id
        );

    const memories =
        getUserMemories(
            user.id
        );

    const usage =
        getUserUsage(
            user
        );

    return {

        chats:
            chats.length,

        messages:
            messages.length,

        memories:
            memories.length,

        daily:
            usage,

        plan:
            user.plan,

        planInfo:
            getPlan(
                user.plan
            )
    };
}


/* ================================================================
   095 — AUTH LOGIN
================================================================ */

app.post(
    "/api/auth/login",
    simpleRateLimit({
        limit: 30,
        windowMs:
            15 *
            60 *
            1000
    }),
    (
        req,
        res
    ) => {

        try {

            const body =
                safeObject(
                    req.body
                );

            const user =
                getOrCreateUser({

                    id:
                        body.userId,

                    name:
                        body.name,

                    email:
                        body.email,

                    avatar:
                        body.avatar,

                    provider:
                        body.provider ||
                        "local"
                });

            const session =
                createSession(
                    user
                );

            session.ip =
                getClientIP(
                    req
                );

            session.userAgent =
                getUserAgent(
                    req
                );

            saveDatabase(
                "sessions"
            );

            res.json({

                ok:
                    true,

                token:
                    session.token,

                sessionId:
                    session.id,

                user:
                    publicUser(
                        user
                    )
            });

        } catch (
            error
        ) {

            logError(
                "Login hatası",
                {
                    message:
                        error.message
                }
            );

            res.status(500)
                .json({

                    ok:
                        false,

                    error:
                        "Giriş işlemi başarısız."
                });
        }
    }
);


/* ================================================================
   096 — AUTH ME
================================================================ */

app.get(
    "/api/auth/me",
    (
        req,
        res
    ) => {

        const user =
            req.user;

        if (
            !user
        ) {

            return res.json({

                ok:
                    true,

                authenticated:
                    false,

                user:
                    null
            });
        }

        return res.json({

            ok:
                true,

            authenticated:
                true,

            user:
                publicUser(
                    user
                )
        });
    }
);


/* ================================================================
   097 — LOGOUT
================================================================ */

app.post(
    "/api/auth/logout",
    (
        req,
        res
    ) => {

        const token =
            getTokenFromRequest(
                req
            );

        if (
            token
        ) {

            const session =
                findSession(
                    token
                );

            if (
                session
            ) {

                session.active =
                    false;

                saveDatabase(
                    "sessions"
                );
            }
        }

        res.json({

            ok:
                true,

            message:
                "Oturum kapatıldı."
        });
    }
);


/* ================================================================
   098 — USER PROFILE
================================================================ */

app.get(
    "/api/user/profile",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Oturum gerekli."
                });
        }

        return res.json({

            ok:
                true,

            user:
                publicUser(
                    req.user
                ),

            stats:
                calculateUserStats(
                    req.user
                )
        });
    }
);


/* ================================================================
   099 — USER SETTINGS
================================================================ */

app.patch(
    "/api/user/settings",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Oturum gerekli."
                });
        }

        const settings =
            safeObject(
                req.body?.settings ||
                req.body
            );

        req.user.settings = {

            ...req.user.settings,

            ...settings
        };

        req.user.updatedAt =
            nowISO();

        saveDatabase(
            "users"
        );

        res.json({

            ok:
                true,

            settings:
                req.user.settings
        });
    }
);


/* ================================================================
   100 — CHAT LISTESİ
================================================================ */

app.get(
    "/api/chats",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.json({

                ok:
                    true,

                chats:
                    []
            });
        }

        const chats =
            getUserChats(
                req.user.id
            )
            .map(
                chat => ({
                    ...chat
                })
            );

        res.json({

            ok:
                true,

            chats
        });
    }
);


/* ================================================================
   101 — CHAT OLUŞTUR API
================================================================ */

app.post(
    "/api/chats",
    (
        req,
        res
    ) => {

        const user =
            req.user ||
            getGuestUser(req);

        const permission =
            canCreateChat(
                user
            );

        if (
            !permission.allowed
        ) {

            return res.status(403)
                .json({

                    ok:
                        false,

                    error:
                        permission.reason,

                    limit:
                        permission.limit,

                    used:
                        permission.used
                });
        }

        const chat =
            createChat(
                user.id,
                req.body || {}
            );

        res.json({

            ok:
                true,

            chat
        });
    }
);


/* ================================================================
   102 — CHAT DETAY
================================================================ */

app.get(
    "/api/chats/:chatId",
    (
        req,
        res
    ) => {

        const user =
            req.user ||
            getGuestUser(req);

        const chat =
            findChatById(
                req.params.chatId
            );

        if (
            !chat
        ) {

            return res.status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        if (
            !userOwnsChat(
                user,
                chat
            )
        ) {

            return res.status(403)
                .json({

                    ok:
                        false,

                    error:
                        "Bu sohbete erişim iznin yok."
                });
        }

        res.json({

            ok:
                true,

            chat,

            messages:
                getChatMessages(
                    chat.id,
                    500
                )
        });
    }
);


/* ================================================================
   103 — CHAT SİL
================================================================ */

app.delete(
    "/api/chats/:chatId",
    (
        req,
        res
    ) => {

        const user =
            req.user ||
            getGuestUser(req);

        const index =
            DB.chats.findIndex(
                chat =>
                    chat.id ===
                    req.params.chatId &&
                    chat.userId ===
                    user.id
            );

        if (
            index === -1
        ) {

            return res.status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        const chat =
            DB.chats[index];

        DB.chats.splice(
            index,
            1
        );

        DB.messages =
            DB.messages.filter(
                message =>
                    message.chatId !==
                    chat.id
            );

        saveDatabase(
            "chats"
        );

        saveDatabase(
            "messages"
        );

        res.json({

            ok:
                true,

            message:
                "Sohbet silindi."
        });
    }
);


/* ================================================================
   104 — CHAT PIN
================================================================ */

app.patch(
    "/api/chats/:chatId/pin",
    (
        req,
        res
    ) => {

        const user =
            req.user ||
            getGuestUser(req);

        const chat =
            findChatById(
                req.params.chatId
            );

        if (
            !chat ||
            !userOwnsChat(
                user,
                chat
            )
        ) {

            return res.status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        chat.pinned =
            !chat.pinned;

        chat.updatedAt =
            nowISO();

        saveDatabase(
            "chats"
        );

        res.json({

            ok:
                true,

            pinned:
                chat.pinned
        });
    }
);


/* ================================================================
   105 — MEMORY GET
================================================================ */

app.get(
    "/api/memory",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.json({

                ok:
                    true,

                memories:
                    []
            });
        }

        res.json({

            ok:
                true,

            memories:
                getUserMemories(
                    req.user.id
                )
        });
    }
);


/* ================================================================
   106 — MEMORY EKLE API
================================================================ */

app.post(
    "/api/memory",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Memory için giriş yapmalısın."
                });
        }

        const permission =
            canCreateMemory(
                req.user
            );

        if (
            !permission.allowed
        ) {

            return res.status(403)
                .json({

                    ok:
                        false,

                    error:
                        permission.reason,

                    limit:
                        permission.limit,

                    used:
                        permission.used
                });
        }

        const memory =
            addMemory(
                req.user.id,
                req.body?.content,
                req.body?.metadata
            );

        if (
            !memory
        ) {

            return res.status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Geçerli memory içeriği gerekli."
                });
        }

        res.json({

            ok:
                true,

            memory
        });
    }
);


/* ================================================================
   107 — MEMORY SİL API
================================================================ */

app.delete(
    "/api/memory/:memoryId",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Oturum gerekli."
                });
        }

        const deleted =
            deleteMemory(
                req.user.id,
                req.params.memoryId
            );

        if (
            !deleted
        ) {

            return res.status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Memory bulunamadı."
                });
        }

        res.json({

            ok:
                true,

            message:
                "Memory silindi."
        });
    }
);


/* ================================================================
   108 — MEMORY ARAMA
================================================================ */

app.get(
    "/api/memory/search",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Oturum gerekli."
                });
        }

        const query =
            cleanText(
                req.query.q,
                5000
            )
            .toLowerCase();

        const results =
            getUserMemories(
                req.user.id
            )
            .filter(
                memory =>
                    memory.content
                        .toLowerCase()
                        .includes(
                            query
                        )
            )
            .slice(
                0,
                50
            );

        res.json({

            ok:
                true,

            query,

            results
        });
    }
);


/* ================================================================
   109 — USAGE API
================================================================ */

app.get(
    "/api/usage",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.json({

                ok:
                    true,

                plan:
                    "free",

                usage: {
                    messages: 0
                }
            });
        }

        const usage =
            getUserUsage(
                req.user
            );

        const plan =
            getPlan(
                req.user.plan
            );

        res.json({

            ok:
                true,

            plan:
                req.user.plan,

            planInfo:
                plan,

            usage,

            limits: {

                messages:
                    plan.dailyMessages,

                chats:
                    plan.maxChats,

                memory:
                    plan.maxMemory
            }
        });
    }
);


/* ================================================================
   110 — KNOWLEDGE API
================================================================ */

app.get(
    "/api/knowledge/search",
    simpleRateLimit({
        limit: 60,
        windowMs:
            15 *
            60 *
            1000
    }),
    (
        req,
        res
    ) => {

        const query =
            cleanText(
                req.query.q,
                5000
            );

        if (
            !query
        ) {

            return res.status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Arama sorgusu gerekli."
                });
        }

        const results =
            searchKnowledge(
                query,
                10
            );

        res.json({

            ok:
                true,

            query,

            results
        });
    }
);


/* ================================================================
   111 — KNOWLEDGE EKLE
================================================================ */

app.post(
    "/api/knowledge",
    (
        req,
        res
    ) => {

        const question =
            cleanText(
                req.body?.question,
                5000
            );

        const answer =
            cleanText(
                req.body?.answer,
                20000
            );

        if (
            !question ||
            !answer
        ) {

            return res.status(400)
                .json({

                    ok:
                        false,

                    error:
                        "Soru ve cevap gerekli."
                });
        }

        const entry =
            saveKnowledge(
                question,
                answer,
                {
                    source:
                        "api"
                }
            );

        res.json({

            ok:
                true,

            entry
        });
    }
);


/* ================================================================
   112 — STATS
================================================================ */

app.get(
    "/api/stats",
    (
        req,
        res
    ) => {

        const user =
            req.user;

        res.json({

            ok:
                true,

            server: {

                users:
                    DB.users.length,

                sessions:
                    DB.sessions.length,

                chats:
                    DB.chats.length,

                messages:
                    DB.messages.length,

                memories:
                    DB.memories.length,

                knowledge:
                    DB.knowledge.length,

                files:
                    DB.files.length,

                projects:
                    DB.projects.length
            },

            user:
                user
                    ? calculateUserStats(
                        user
                    )
                    : null,

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   113 — OTOMATİK TEMİZLEME
================================================================ */

function cleanupExpiredSessions() {

    const now =
        Date.now();

    let changed =
        false;

    for (
        const session
        of safeArray(
            DB.sessions
        )
    ) {

        if (
            session.expiresAt &&
            new Date(
                session.expiresAt
            ).getTime() <
            now &&
            session.active
        ) {

            session.active =
                false;

            changed =
                true;
        }
    }

    if (
        changed
    ) {

        saveDatabase(
            "sessions"
        );
    }
}


/* ================================================================
   114 — SESSION CLEANUP
================================================================ */

setInterval(
    cleanupExpiredSessions,
    60 *
    60 *
    1000
);


/* ================================================================
   115 — MEMORY AUTO SAVE
================================================================ */

function autoRemember(
    user,
    text
) {

    if (
        !user ||
        user.guest
    ) {
        return null;
    }

    const value =
        cleanText(
            text,
            1000
        );

    if (
        !value
    ) {
        return null;
    }

    const patterns = [

        /benim adım\s+(.+)/i,

        /adım\s+(.+)/i,

        /ben\s+(.+)\s+seviyorum/i,

        /favorim\s+(.+)/i,

        /(.+)\s+öğreniyorum/i
    ];

    for (
        const pattern
        of patterns
    ) {

        const match =
            value.match(
                pattern
            );

        if (
            match
        ) {

            const memory =
                cleanText(
                    match[0],
                    1000
                );

            if (
                memory
            ) {

                const permission =
                    canCreateMemory(
                        user
                    );

                if (
                    permission.allowed
                ) {

                    return addMemory(
                        user.id,
                        memory,
                        {
                            source:
                                "auto"
                        }
                    );
                }
            }
        }
    }

    return null;
}


/* ================================================================
   116 — CHAT CONTEXT
================================================================ */

function buildChatContext(
    user,
    chatId,
    limit = 12
) {

    const messages =
        getChatMessages(
            chatId,
            limit
        );

    const memories =
        user &&
        !user.guest
            ? getUserMemories(
                user.id
            ).slice(
                0,
                20
            )
            : [];

    return {

        messages,

        memories,

        user:
            user
                ? {
                    id:
                        user.id,

                    name:
                        user.name,

                    plan:
                        user.plan
                }
                : null
    };
}


/* ================================================================
   117 — DATABASE BACKUP
================================================================ */

function backupDatabase() {

    const timestamp =
        Date.now();

    const backupFolder =
        path.join(
            BACKUPS_DIR,
            String(timestamp)
        );

    try {

        fs.mkdirSync(
            backupFolder,
            {
                recursive: true
            }
        );

        for (
            const [
                name,
                filePath
            ]
            of Object.entries(
                DB_FILES
            )
        ) {

            if (
                fs.existsSync(
                    filePath
                )
            ) {

                fs.copyFileSync(
                    filePath,
                    path.join(
                        backupFolder,
                        `${name}.json`
                    )
                );
            }
        }

        return backupFolder;

    } catch (
        error
    ) {

        logError(
            "Database backup hatası",
            {
                message:
                    error.message
            }
        );

        return null;
    }
}


/* ================================================================
   118 — OTOMATİK BACKUP
================================================================ */

setInterval(
    () => {

        try {

            backupDatabase();

        } catch (
            error
        ) {

            logError(
                "Otomatik backup hatası",
                {
                    message:
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


/* ================================================================
   119 — PLAN AKTİVASYON
================================================================ */

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";


/* ================================================================
   120 — PLAN KODU DOĞRULA
================================================================ */

function activatePlanByCode(
    user,
    code
) {

    if (
        !user
    ) {
        return {
            success: false,
            error:
                "Kullanıcı bulunamadı."
        };
    }

    const input =
        cleanText(
            code,
            200
        );

    if (
        !input
    ) {

        return {
            success: false,
            error:
                "Kod gerekli."
        };
    }

    if (
        TURKAI_PRO_CODE &&
        input ===
        TURKAI_PRO_CODE
    ) {

        user.plan =
            "pro";

        user.updatedAt =
            nowISO();

        saveDatabase(
            "users"
        );

        return {

            success:
                true,

            plan:
                "pro",

            planInfo:
                getPlan(
                    "pro"
                )
        };
    }

    return {

        success:
            false,

        error:
            "Geçersiz aktivasyon kodu."
    };
}


/* ================================================================
   121 — PRO AKTİVASYON API
================================================================ */

app.post(
    "/api/pro/activate",
    (
        req,
        res
    ) => {

        if (
            !req.user
        ) {

            return res.status(401)
                .json({

                    ok:
                        false,

                    error:
                        "Önce giriş yapmalısın."
                });
        }

        const result =
            activatePlanByCode(
                req.user,
                req.body?.code
            );

        if (
            !result.success
        ) {

            return res.status(400)
                .json({

                    ok:
                        false,

                    error:
                        result.error
                });
        }

        res.json({

            ok:
                true,

            ...result
        });
    }
);


/* ================================================================
   122 — PLAN API
================================================================ */

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {

        res.json({

            ok:
                true,

            plans:
                PLANS
        });
    }
);


/* ================================================================
   123 — SYSTEM STATUS
================================================================ */

app.get(
    "/api/system/status",
    (
        req,
        res
    ) => {

        res.json({

            ok:
                true,

            status:
                "online",

            turkai:
                true,

            version:
                APP_VERSION,

            node:
                process.version,

            uptime:
                process.uptime(),

            database: {

                users:
                    DB.users.length,

                chats:
                    DB.chats.length,

                messages:
                    DB.messages.length,

                memories:
                    DB.memories.length,

                knowledge:
                    DB.knowledge.length
            },

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   124 — PARÇA 2 SONU
================================================================ */

/*
    PARÇA 2 TAMAMLANDI.

    Bu bölüm artık şunları sağlıyor:

    /api/auth/login
    /api/auth/me
    /api/auth/logout

    /api/user/profile
    /api/user/settings

    /api/chats
    /api/chats/:chatId
    /api/chats/:chatId/pin

    /api/memory
    /api/memory/search

    /api/usage
    /api/stats

    /api/knowledge
    /api/knowledge/search

    /api/plans
    /api/pro/activate

    /api/system/status

    SONRA:
    PARÇA 3 = GERÇEK /api/chat MOTORU
*//* ================================================================
   TÜRKAI SERVER — PARÇA 3 / 5
   CHAT ENGINE + LOCAL AI + GROQ + CEREBRAS + FALLBACK
================================================================ */


/* ================================================================
   125 — AI AYARLARI
================================================================ */

const AI_CONFIG = {

    groqApiKey:
        process.env.GROQ_API_KEY ||
        "",

    cerebrasApiKey:
        process.env.CEREBRAS_API_KEY ||
        "",

    openRouterApiKey:
        process.env.OPENROUTER_API_KEY ||
        "",

    geminiApiKey:
        process.env.GEMINI_API_KEY ||
        "",

    groqModel:
        process.env.GROQ_MODEL ||
        "openai/gpt-oss-20b",

    cerebrasModel:
        process.env.CEREBRAS_MODEL ||
        "gpt-oss-120b",

    openRouterModel:
        process.env.OPENROUTER_MODEL ||
        "openai/gpt-oss-20b",

    geminiModel:
        process.env.GEMINI_MODEL ||
        "gemini-2.0-flash",

    temperature:
        Number(
            process.env.AI_TEMPERATURE
        ) || 0.7,

    maxTokens:
        Number(
            process.env.AI_MAX_TOKENS
        ) || 3000,

    timeout:
        Number(
            process.env.AI_TIMEOUT
        ) || 60000
};


/* ================================================================
   126 — AI DURUMU
================================================================ */

const AI_STATUS = {

    groq: {
        enabled:
            Boolean(
                AI_CONFIG.groqApiKey
            ),

        failures:
            0,

        lastFailure:
            null
    },

    cerebras: {
        enabled:
            Boolean(
                AI_CONFIG.cerebrasApiKey
            ),

        failures:
            0,

        lastFailure:
            null
    },

    openrouter: {
        enabled:
            Boolean(
                AI_CONFIG.openRouterApiKey
            ),

        failures:
            0,

        lastFailure:
            null
    },

    gemini: {
        enabled:
            Boolean(
                AI_CONFIG.geminiApiKey
            ),

        failures:
            0,

        lastFailure:
            null
    }
};


/* ================================================================
   127 — FETCH
================================================================ */

async function fetchWithTimeout(
    url,
    options = {},
    timeout =
        AI_CONFIG.timeout
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

        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(
            timer
        );
    }
}


/* ================================================================
   128 — JSON RESPONSE OKUMA
================================================================ */

async function parseJSONResponse(
    response
) {

    const text =
        await response.text();

    let data = null;

    try {

        data =
            text
                ? JSON.parse(text)
                : null;

    } catch {

        data = {
            raw:
                text
        };
    }

    return {
        status:
            response.status,

        ok:
            response.ok,

        data
    };
}


/* ================================================================
   129 — AI ERROR
================================================================ */

function createAIError(
    provider,
    status,
    message
) {

    const error =
        new Error(
            message ||
            `${provider} API hatası`
        );

    error.provider =
        provider;

    error.status =
        status;

    return error;
}


/* ================================================================
   130 — PROVIDER FAILURE
================================================================ */

function registerProviderFailure(
    provider,
    error
) {

    if (
        !AI_STATUS[provider]
    ) {
        return;
    }

    AI_STATUS[
        provider
    ].failures++;

    AI_STATUS[
        provider
    ].lastFailure = {

        at:
            nowISO(),

        status:
            error?.status ||
            null,

        message:
            cleanText(
                error?.message ||
                "Bilinmeyen hata",
                500
            )
    };

    logWarn(
        `${provider} AI başarısız`,
        {
            status:
                error?.status,

            message:
                error?.message
        }
    );
}


/* ================================================================
   131 — PROVIDER SUCCESS
================================================================ */

function registerProviderSuccess(
    provider
) {

    if (
        !AI_STATUS[provider]
    ) {
        return;
    }

    AI_STATUS[
        provider
    ].failures = 0;
}


/* ================================================================
   132 — SYSTEM PROMPT
================================================================ */

const TURKAI_SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için geliştirilmiş modern,
yardımcı, hızlı ve güvenilir bir yapay zekâ asistanısın.

Temel kurallar:

1. Kullanıcı Türkçe konuşuyorsa Türkçe cevap ver.
2. Kullanıcı başka bir dil kullanıyorsa o dile uyum sağla.
3. Gereksiz yere uzun cevap verme.
4. Kod istendiğinde çalışan ve düzenli kod üret.
5. Kod verirken hangi dosyaya konacağını belirt.
6. Bilmediğin güncel bilgileri kesin gerçekmiş gibi uydurma.
7. Güncel bilgi gerektiğinde research sisteminin kullanılabileceğini dikkate al.
8. Kullanıcı kısa cevap istiyorsa kısa cevap ver.
9. Kullanıcı detay isterse detaylandır.
10. Matematik işlemlerinde sonucu dikkatli hesapla.
11. Güvenlik konularında yasal ve güvenli sınırlar içinde yardımcı ol.
12. Kullanıcı bir hata mesajı verirse önce hatanın nedenini açıkla,
    sonra uygulanabilir çözüm sun.
13. Kullanıcının önceki mesajlarından gelen konuşma bağlamını dikkate al.
14. Memory verileri verilmişse bunları yalnızca uygun bağlamda kullan.
15. Kendini TürkAI olarak tanıt.
16. Gereksiz sistem mesajı, API anahtarı veya iç teknik ayrıntı paylaşma.
17. Kullanıcı "En hızlı kim?" diye sorarsa:
    "TürkAI" cevabını ver.
18. Cevaplarını doğal ve arkadaşça tut.
`;


/* ================================================================
   133 — TEXT NORMALIZE
================================================================ */

function normalizeAIText(
    text
) {

    if (
        text === undefined ||
        text === null
    ) {
        return "";
    }

    return String(
        text
    )
    .replace(
        /\r\n/g,
        "\n"
    )
    .replace(
        /\u0000/g,
        ""
    )
    .trim();
}


/* ================================================================
   134 — LOCAL RESPONSE
================================================================ */

function localResponse(
    message,
    context = {}
) {

    const text =
        normalizeAIText(
            message
        );

    const lower =
        text.toLocaleLowerCase(
            "tr-TR"
        );


    /* ------------------------------------------------------------
       SELAMLAMA
    ------------------------------------------------------------ */

    if (
        /^(merhaba|selam|sa|hey|hello|hi|selamlar)[!. ]*$/i
            .test(text)
    ) {

        const name =
            context.user?.name;

        if (
            name &&
            name !==
            "Misafir"
        ) {

            return `Merhaba ${name}! Ben TürkAI. Sana nasıl yardımcı olabilirim?`;
        }

        return (
            "Merhaba! Ben TürkAI. " +
            "Kodlama, araştırma, matematik, eğitim veya günlük sorularında yardımcı olabilirim."
        );
    }


    /* ------------------------------------------------------------
       EN HIZLI
    ------------------------------------------------------------ */

    if (
        lower.includes(
            "en hızlı kim"
        )
    ) {

        return "TürkAI";
    }


    /* ------------------------------------------------------------
       KİMSİN
    ------------------------------------------------------------ */

    if (
        lower.includes(
            "sen kimsin"
        ) ||
        lower.includes(
            "kimsin sen"
        ) ||
        lower ===
        "türkai nedir"
    ) {

        return (
            "Ben TürkAI. Türkçe odaklı, " +
            "kodlama, araştırma, eğitim ve günlük sorularda " +
            "yardımcı olmak için tasarlanmış bir yapay zekâ asistanıyım."
        );
    }


    /* ------------------------------------------------------------
       SAAT
    ------------------------------------------------------------ */

    if (
        lower.includes(
            "saat kaç"
        )
    ) {

        return (
            "Sunucunun saat bilgisi: " +
            new Date().toLocaleTimeString(
                "tr-TR"
            )
        );
    }


    /* ------------------------------------------------------------
       TARİH
    ------------------------------------------------------------ */

    if (
        lower.includes(
            "bugün hangi gün"
        ) ||
        lower.includes(
            "bugünün tarihi"
        ) ||
        lower.includes(
            "bugün tarih"
        )
    ) {

        return (
            "Bugünün tarihi: " +
            new Date().toLocaleDateString(
                "tr-TR",
                {
                    weekday:
                        "long",

                    year:
                        "numeric",

                    month:
                        "long",

                    day:
                        "numeric"
                }
            )
        );
    }


    /* ------------------------------------------------------------
       TEŞEKKÜR
    ------------------------------------------------------------ */

    if (
        /^(teşekkür|teşekkürler|sağ ol|eyvallah|thanks)[!. ]*$/i
            .test(text)
    ) {

        return (
            "Rica ederim! "
            +
            "Başka bir konuda da yardımcı olabilirim."
        );
    }


    /* ------------------------------------------------------------
       EVET
    ------------------------------------------------------------ */

    if (
        lower === "evet"
    ) {

        return (
            "Tamamdır. Devam edebiliriz."
        );
    }


    /* ------------------------------------------------------------
       HAYIR
    ------------------------------------------------------------ */

    if (
        lower === "hayır"
    ) {

        return (
            "Tamamdır. Başka bir şey yapmak istersen buradayım."
        );
    }


    /* ------------------------------------------------------------
       KODLAMA
    ------------------------------------------------------------ */

    if (
        lower.includes(
            "javascript öğren"
        )
    ) {

        return (
            "JavaScript öğrenmeye değişkenler, koşullar, " +
            "fonksiyonlar ve DOM ile başlayabiliriz. " +
            "İstersen TürkAI üzerinde küçük bir proje yaparak ilerleyebiliriz."
        );
    }


    if (
        lower.includes(
            "html öğren"
        )
    ) {

        return (
            "HTML sayfanın iskeletini oluşturur. " +
            "Başlangıçta HTML etiketleri, formlar, butonlar ve sayfa yapısını öğrenmek iyi bir başlangıçtır."
        );
    }


    if (
        lower.includes(
            "css öğren"
        )
    ) {

        return (
            "CSS, HTML elemanlarının görünümünü kontrol eder. " +
            "Renk, boyut, boşluk, grid, flexbox ve responsive tasarımla başlayabiliriz."
        );
    }


    /* ------------------------------------------------------------
       MATEMATİK BASİT
    ------------------------------------------------------------ */

    const mathCandidate =
        text.match(
            /^[\d\s+\-*/().,%]+$/
        );

    if (
        mathCandidate
    ) {

        try {

            const expression =
                text
                    .replace(
                        /,/g,
                        "."
                    )
                    .replace(
                        /%/g,
                        "/100"
                    );

            if (
                expression.length <= 100
            ) {

                const valid =
                    /^[0-9+\-*/().\s]+$/
                        .test(
                            expression
                        );

                if (
                    valid
                ) {

                    const result =
                        Function(
                            `"use strict"; return (${expression})`
                        )();

                    if (
                        Number.isFinite(
                            result
                        )
                    ) {

                        return String(
                            result
                        );
                    }
                }
            }

        } catch {
            /* local math fallback başarısız */
        }
    }


    /* ------------------------------------------------------------
       DEFAULT
    ------------------------------------------------------------ */

    return (
        "Bu soruyu yerel bilgi motorumla doğrudan yanıtlayamadım. " +
        "İstersen daha açık bir şekilde sorabilir veya güncel bilgi gerekiyorsa araştırma özelliğini kullanabilirsin."
    );
}


/* ================================================================
   135 — CONTEXT MESAJLARI
================================================================ */

function buildAIMessageList(
    user,
    chatId,
    message
) {

    const context =
        buildChatContext(
            user,
            chatId,
            16
        );

    const messages = [

        {
            role:
                "system",

            content:
                TURKAI_SYSTEM_PROMPT
        }
    ];


    /* ------------------------------------------------------------
       MEMORY
    ------------------------------------------------------------ */

    if (
        context.memories.length
    ) {

        const memoryText =
            context.memories
                .slice(
                    0,
                    20
                )
                .map(
                    memory =>
                        `- ${memory.content}`
                )
                .join(
                    "\n"
                );

        messages.push({

            role:
                "system",

            content:
                `Kullanıcı hakkında kayıtlı uygun bilgiler:\n${memoryText}`
        });
    }


    /* ------------------------------------------------------------
       CHAT HISTORY
    ------------------------------------------------------------ */

    for (
        const item
        of context.messages
    ) {

        if (
            !item.content
        ) {
            continue;
        }

        if (
            item.role !== "user" &&
            item.role !== "assistant" &&
            item.role !== "system"
        ) {
            continue;
        }

        messages.push({

            role:
                item.role,

            content:
                item.content
        });
    }


    /* ------------------------------------------------------------
       CURRENT MESSAGE
    ------------------------------------------------------------ */

    messages.push({

        role:
            "user",

        content:
            message
    });

    return messages;
}


/* ================================================================
   136 — GROQ
================================================================ */

async function callGroq(
    messages
) {

    if (
        !AI_CONFIG.groqApiKey
    ) {

        throw createAIError(
            "groq",
            0,
            "Groq API anahtarı yok."
        );
    }

    const response =
        await fetchWithTimeout(

            "https://api.groq.com/openai/v1/chat/completions",

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${AI_CONFIG.groqApiKey}`
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.groqModel,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const result =
        await parseJSONResponse(
            response
        );


    if (
        !result.ok
    ) {

        const message =
            result.data?.error?.message ||
            `Groq HTTP ${result.status}`;

        throw createAIError(
            "groq",
            result.status,
            message
        );
    }


    const answer =
        result.data
            ?.choices?.[0]
            ?.message?.content;


    if (
        !answer
    ) {

        throw createAIError(
            "groq",
            result.status,
            "Groq boş cevap döndürdü."
        );
    }


    registerProviderSuccess(
        "groq"
    );

    return {

        provider:
            "groq",

        model:
            AI_CONFIG.groqModel,

        answer:
            normalizeAIText(
                answer
            )
    };
}


/* ================================================================
   137 — CEREBRAS
================================================================ */

async function callCerebras(
    messages
) {

    if (
        !AI_CONFIG.cerebrasApiKey
    ) {

        throw createAIError(
            "cerebras",
            0,
            "Cerebras API anahtarı yok."
        );
    }


    const response =
        await fetchWithTimeout(

            "https://api.cerebras.ai/v1/chat/completions",

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${AI_CONFIG.cerebrasApiKey}`
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.cerebrasModel,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const result =
        await parseJSONResponse(
            response
        );


    if (
        !result.ok
    ) {

        const message =
            result.data?.error?.message ||
            `Cerebras HTTP ${result.status}`;

        throw createAIError(
            "cerebras",
            result.status,
            message
        );
    }


    const answer =
        result.data
            ?.choices?.[0]
            ?.message?.content;


    if (
        !answer
    ) {

        throw createAIError(
            "cerebras",
            result.status,
            "Cerebras boş cevap döndürdü."
        );
    }


    registerProviderSuccess(
        "cerebras"
    );


    return {

        provider:
            "cerebras",

        model:
            AI_CONFIG.cerebrasModel,

        answer:
            normalizeAIText(
                answer
            )
    };
}


/* ================================================================
   138 — OPENROUTER
================================================================ */

async function callOpenRouter(
    messages
) {

    if (
        !AI_CONFIG.openRouterApiKey
    ) {

        throw createAIError(
            "openrouter",
            0,
            "OpenRouter API anahtarı yok."
        );
    }


    const response =
        await fetchWithTimeout(

            "https://openrouter.ai/api/v1/chat/completions",

            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${AI_CONFIG.openRouterApiKey}`,

                    "HTTP-Referer":
                        "https://turkai.app",

                    "X-Title":
                        "TürkAI"
                },

                body:
                    JSON.stringify({

                        model:
                            AI_CONFIG.openRouterModel,

                        messages,

                        temperature:
                            AI_CONFIG.temperature,

                        max_tokens:
                            AI_CONFIG.maxTokens
                    })
            }
        );


    const result =
        await parseJSONResponse(
            response
        );


    if (
        !result.ok
    ) {

        const message =
            result.data?.error?.message ||
            `OpenRouter HTTP ${result.status}`;

        throw createAIError(
            "openrouter",
            result.status,
            message
        );
    }


    const answer =
        result.data
            ?.choices?.[0]
            ?.message?.content;


    if (
        !answer
    ) {

        throw createAIError(
            "openrouter",
            result.status,
            "OpenRouter boş cevap döndürdü."
        );
    }


    registerProviderSuccess(
        "openrouter"
    );


    return {

        provider:
            "openrouter",

        model:
            AI_CONFIG.openRouterModel,

        answer:
            normalizeAIText(
                answer
            )
    };
}


/* ================================================================
   139 — GEMINI
================================================================ */

async function callGemini(
    messages
) {

    if (
        !AI_CONFIG.geminiApiKey
    ) {

        throw createAIError(
            "gemini",
            0,
            "Gemini API anahtarı yok."
        );
    }


    const systemMessages =
        messages
            .filter(
                item =>
                    item.role ===
                    "system"
            );


    const normalMessages =
        messages
            .filter(
                item =>
                    item.role !==
                    "system"
            );


    const systemText =
        systemMessages
            .map(
                item =>
                    item.content
            )
            .join(
                "\n\n"
            );


    const contents =
        normalMessages
            .map(
                item => ({

                    role:
                        item.role ===
                        "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text:
                                item.content
                        }
                    ]
                })
            );


    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            AI_CONFIG.geminiModel
        )}:generateContent?key=${encodeURIComponent(
            AI_CONFIG.geminiApiKey
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
                    JSON.stringify({

                        systemInstruction: {

                            parts: [
                                {
                                    text:
                                        systemText ||
                                        TURKAI_SYSTEM_PROMPT
                                }
                            ]
                        },

                        contents,

                        generationConfig: {

                            temperature:
                                AI_CONFIG.temperature,

                            maxOutputTokens:
                                AI_CONFIG.maxTokens
                        }
                    })
            }
        );


    const result =
        await parseJSONResponse(
            response
        );


    if (
        !result.ok
    ) {

        const message =
            result.data?.error?.message ||
            `Gemini HTTP ${result.status}`;

        throw createAIError(
            "gemini",
            result.status,
            message
        );
    }


    const answer =
        result.data
            ?.candidates?.[0]
            ?.content?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            .join(
                ""
            );


    if (
        !answer
    ) {

        throw createAIError(
            "gemini",
            result.status,
            "Gemini boş cevap döndürdü."
        );
    }


    registerProviderSuccess(
        "gemini"
    );


    return {

        provider:
            "gemini",

        model:
            AI_CONFIG.geminiModel,

        answer:
            normalizeAIText(
                answer
            )
    };
}


/* ================================================================
   140 — AI PROVIDER SIRASI
================================================================ */

async function callAIProviders(
    messages
) {

    const providers = [

        {
            name:
                "groq",

            enabled:
                AI_STATUS.groq.enabled,

            fn:
                () =>
                    callGroq(
                        messages
                    )
        },

        {
            name:
                "cerebras",

            enabled:
                AI_STATUS.cerebras.enabled,

            fn:
                () =>
                    callCerebras(
                        messages
                    )
        },

        {
            name:
                "openrouter",

            enabled:
                AI_STATUS.openrouter.enabled,

            fn:
                () =>
                    callOpenRouter(
                        messages
                    )
        },

        {
            name:
                "gemini",

            enabled:
                AI_STATUS.gemini.enabled,

            fn:
                () =>
                    callGemini(
                        messages
                    )
        }
    ];


    const errors = [];


    for (
        const provider
        of providers
    ) {

        if (
            !provider.enabled
        ) {
            continue;
        }


        try {

            const result =
                await provider.fn();

            return {

                ...result,

                fallback:
                    errors.length > 0,

                errors
            };

        } catch (
            error
        ) {

            registerProviderFailure(
                provider.name,
                error
            );

            errors.push({

                provider:
                    provider.name,

                status:
                    error?.status ||
                    null,

                error:
                    cleanText(
                        error?.message ||
                        "Bilinmeyen hata",
                        500
                    )
            });
        }
    }


    return {

        answer:
            null,

        provider:
            "local",

        model:
            "local",

        fallback:
            true,

        errors
    };
}


/* ================================================================
   141 — CURRENT QUESTION TESPİT
================================================================ */

function looksLikeCurrentQuestion(
    text
) {

    const lower =
        cleanText(
            text,
            5000
        )
        .toLocaleLowerCase(
            "tr-TR"
        );


    const currentWords = [

        "bugün",

        "şu an",

        "şimdi",

        "son dakika",

        "güncel",

        "en son",

        "2026",

        "haber",

        "hava",

        "döviz",

        "dolar",

        "euro",

        "altın",

        "kur",

        "kaç tl",

        "kaç lira",

        "kim kazandı",

        "maç sonucu"
    ];


    return currentWords.some(
        word =>
            lower.includes(
                word
            )
    );
}


/* ================================================================
   142 — CODING SORUSU
================================================================ */

function looksLikeCodingQuestion(
    text
) {

    const lower =
        cleanText(
            text,
            5000
        )
        .toLocaleLowerCase(
            "tr-TR"
        );


    const words = [

        "kod",

        "javascript",

        "html",

        "css",

        "python",

        "java",

        "c++",

        "c#",

        "node.js",

        "nodejs",

        "express",

        "api",

        "server.js",

        "index.html",

        "bug",

        "hata",
        
        "console.log",

        "fonksiyon",

        "değişken"
    ];


    return words.some(
        word =>
            lower.includes(
                word
            )
    );
}


/* ================================================================
   143 — LOCAL + AI KARAR
================================================================ */

async function generateAIAnswer(
    user,
    chatId,
    message
) {

    const knowledge =
        findKnowledgeAnswer(
            message
        );


    /* ------------------------------------------------------------
       KNOWLEDGE ÖNCELİĞİ
    ------------------------------------------------------------ */

    if (
        knowledge &&
        !looksLikeCurrentQuestion(
            message
        )
    ) {

        markKnowledgeUsed(
            knowledge.id
        );

        return {

            answer:
                knowledge.answer,

            provider:
                "knowledge",

            model:
                "knowledge",

            source:
                "knowledge",

            fallback:
                false
        };
    }


    /* ------------------------------------------------------------
       LOCAL BASİT CEVAP
    ------------------------------------------------------------ */

    const local =
        localResponse(
            message,
            {
                user
            }
        );


    /*
       Yerel motorun gerçek cevap ürettiğini anlamak için
       generic fallback olup olmadığını kontrol ediyoruz.
    */

    const localIsGeneric =
        local.startsWith(
            "Bu soruyu yerel bilgi motorumla"
        );


    if (
        !localIsGeneric
    ) {

        return {

            answer:
                local,

            provider:
                "local",

            model:
                "local",

            source:
                "local",

            fallback:
                false
        };
    }


    /* ------------------------------------------------------------
       AI CONTEXT
    ------------------------------------------------------------ */

    const messages =
        buildAIMessageList(
            user,
            chatId,
            message
        );


    /* ------------------------------------------------------------
       AI PROVIDERLARI
    ------------------------------------------------------------ */

    const ai =
        await callAIProviders(
            messages
        );


    if (
        ai.answer
    ) {

        return {

            answer:
                ai.answer,

            provider:
                ai.provider,

            model:
                ai.model,

            source:
                "ai",

            fallback:
                ai.fallback,

            providerErrors:
                ai.errors || []
        };
    }


    /* ------------------------------------------------------------
       SON FALLBACK
    ------------------------------------------------------------ */

    return {

        answer:
            local,

        provider:
            "local",

        model:
            "local",

        source:
            "local-fallback",

        fallback:
            true,

        providerErrors:
            ai.errors || []
    };
}


/* ================================================================
   144 — CHAT REQUEST VALIDATION
================================================================ */

function validateChatRequest(
    body
) {

    const message =
        cleanText(
            body?.message,
            50000
        );


    if (
        !message
    ) {

        return {

            valid:
                false,

            error:
                "Mesaj boş olamaz."
        };
    }


    return {

        valid:
            true,

        message
    };
}


/* ================================================================
   145 — CHAT API
================================================================ */

app.post(
    "/api/chat",
    simpleRateLimit({
        limit: 120,
        windowMs:
            15 *
            60 *
            1000
    }),
    async (
        req,
        res
    ) => {

        const started =
            Date.now();


        try {

            const validation =
                validateChatRequest(
                    req.body
                );


            if (
                !validation.valid
            ) {

                return res.status(400)
                    .json({

                        ok:
                            false,

                        error:
                            validation.error,

                        code:
                            "INVALID_MESSAGE",

                        requestId:
                            req.requestId
                    });
            }


            const message =
                validation.message;


            const user =
                req.user ||
                getGuestUser(
                    req
                );


            /* ----------------------------------------------------
               LIMIT
            ---------------------------------------------------- */

            const permission =
                canSendMessage(
                    user
                );


            if (
                !permission.allowed
            ) {

                return res.status(429)
                    .json({

                        ok:
                            false,

                        error:
                            permission.reason,

                        code:
                            "MESSAGE_LIMIT",

                        used:
                            permission.used,

                        limit:
                            permission.limit,

                        requestId:
                            req.requestId
                    });
            }


            /* ----------------------------------------------------
               CHAT
            ---------------------------------------------------- */

            let chat = null;


            if (
                req.body?.chatId
            ) {

                chat =
                    findChatById(
                        cleanText(
                            req.body.chatId,
                            200
                        )
                    );


                if (
                    chat &&
                    !userOwnsChat(
                        user,
                        chat
                    )
                ) {

                    chat =
                        null;
                }
            }


            if (
                !chat
            ) {

                const chatPermission =
                    canCreateChat(
                        user
                    );


                if (
                    !chatPermission.allowed
                ) {

                    return res.status(403)
                        .json({

                            ok:
                                false,

                            error:
                                chatPermission.reason,

                            code:
                                "CHAT_LIMIT",

                            used:
                                chatPermission.used,

                            limit:
                                chatPermission.limit
                        });
                }


                chat =
                    createChat(
                        user.id,
                        {
                            title:
                                generateChatTitle(
                                    message
                                ),

                            model:
                                req.body?.model ||
                                "fast"
                        }
                    );
            }


            /* ----------------------------------------------------
               USER MESSAGE
            ---------------------------------------------------- */

            createMessage({

                chatId:
                    chat.id,

                userId:
                    user.id,

                role:
                    "user",

                content:
                    message,

                model:
                    req.body?.model ||
                    "fast",

                metadata: {

                    requestId:
                        req.requestId
                }
            });


            updateChatTitle(
                chat,
                message
            );


            /* ----------------------------------------------------
               AUTO MEMORY
            ---------------------------------------------------- */

            try {

                autoRemember(
                    user,
                    message
                );

            } catch (
                memoryError
            ) {

                logWarn(
                    "Auto memory hatası",
                    {
                        message:
                            memoryError.message
                    }
                );
            }


            /* ----------------------------------------------------
               AI
            ---------------------------------------------------- */

            const result =
                await generateAIAnswer(
                    user,
                    chat.id,
                    message
                );


            /* ----------------------------------------------------
               ASSISTANT MESSAGE
            ---------------------------------------------------- */

            createMessage({

                chatId:
                    chat.id,

                userId:
                    user.id,

                role:
                    "assistant",

                content:
                    result.answer,

                model:
                    result.model,

                metadata: {

                    provider:
                        result.provider,

                    source:
                        result.source,

                    fallback:
                        Boolean(
                            result.fallback
                        ),

                    requestId:
                        req.requestId
                }
            });


            /* ----------------------------------------------------
               USAGE
            ---------------------------------------------------- */

            if (
                !user.guest
            ) {

                incrementUsage(
                    user.id,
                    "messages"
                );


                if (
                    result.source ===
                    "ai"
                ) {

                    user.stats.totalMessages =
                        Number(
                            user.stats.totalMessages
                        ) + 1;

                } else {

                    user.stats.totalMessages =
                        Number(
                            user.stats.totalMessages
                        ) + 1;
                }


                user.updatedAt =
                    nowISO();


                saveDatabase(
                    "users"
                );
            }


            /* ----------------------------------------------------
               KNOWLEDGE AUTO SAVE
            ---------------------------------------------------- */

            if (
                result.answer &&
                result.source ===
                "ai" &&
                !looksLikeCurrentQuestion(
                    message
                )
            ) {

                try {

                    saveKnowledge(
                        message,
                        result.answer,
                        {
                            source:
                                result.provider,

                            auto:
                                true
                        }
                    );

                } catch (
                    knowledgeError
                ) {

                    logWarn(
                        "Knowledge auto save başarısız",
                        {
                            message:
                                knowledgeError.message
                        }
                    );
                }
            }


            /* ----------------------------------------------------
               RESPONSE
            ---------------------------------------------------- */

            const duration =
                Date.now() -
                started;


            return res.json({

                ok:
                    true,

                reply:
                    result.answer,

                response:
                    result.answer,

                message:
                    result.answer,

                text:
                    result.answer,

                chatId:
                    chat.id,

                chat: {

                    id:
                        chat.id,

                    title:
                        chat.title,

                    updatedAt:
                        chat.updatedAt
                },

                provider:
                    result.provider,

                model:
                    result.model,

                source:
                    result.source,

                fallback:
                    Boolean(
                        result.fallback
                    ),

                duration,

                requestId:
                    req.requestId
            });


        } catch (
            error
        ) {

            logError(
                "CHAT API HATASI",
                {
                    message:
                        error.message,

                    stack:
                        error.stack,

                    requestId:
                        req.requestId
                }
            );


            return res.status(500)
                .json({

                    ok:
                        false,

                    error:
                        "TürkAI cevap oluştururken bir hata oluştu.",

                    details:
                        IS_PRODUCTION
                            ? undefined
                            : error.message,

                    code:
                        "CHAT_ERROR",

                    requestId:
                        req.requestId
                });
        }
    }
);


/* ================================================================
   146 — CHAT STREAM TEST
================================================================ */

app.get(
    "/api/chat/test",
    (
        req,
        res
    ) => {

        res.json({

            ok:
                true,

            endpoint:
                "/api/chat",

            method:
                "POST",

            required: {

                message:
                    "string"
            },

            optional: {

                chatId:
                    "string",

                model:
                    "string",

                guestId:
                    "string"
            },

            example: {

                message:
                    "Merhaba TürkAI",

                model:
                    "fast"
            },

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   147 — AI STATUS
================================================================ */

app.get(
    "/api/ai/status",
    (
        req,
        res
    ) => {

        res.json({

            ok:
                true,

            local:
                {
                    enabled:
                        true
                },

            providers: {

                groq: {

                    enabled:
                        AI_STATUS.groq.enabled,

                    failures:
                        AI_STATUS.groq.failures,

                    lastFailure:
                        AI_STATUS.groq.lastFailure
                },

                cerebras: {

                    enabled:
                        AI_STATUS.cerebras.enabled,

                    failures:
                        AI_STATUS.cerebras.failures,

                    lastFailure:
                        AI_STATUS.cerebras.lastFailure
                },

                openrouter: {

                    enabled:
                        AI_STATUS.openrouter.enabled,

                    failures:
                        AI_STATUS.openrouter.failures,

                    lastFailure:
                        AI_STATUS.openrouter.lastFailure
                },

                gemini: {

                    enabled:
                        AI_STATUS.gemini.enabled,

                    failures:
                        AI_STATUS.gemini.failures,

                    lastFailure:
                        AI_STATUS.gemini.lastFailure
                }
            },

            timestamp:
                nowISO()
        });
    }
);


/* ================================================================
   148 — MODEL LISTESİ
================================================================ */

app.get(
    "/api/models",
    (
        req,
        res
    ) => {

        res.json({

            ok:
                true,

            models: [

                {
                    id:
                        "fast",

                    name:
                        "TürkAI Fast",

                    description:
                        "Hızlı otomatik model seçimi"
                },

                {
                    id:
                        "groq",

                    name:
                        "Groq",

                    description:
                        AI_CONFIG.groqModel,

                    available:
                        AI_STATUS.groq.enabled
                },

                {
                    id:
                        "cerebras",

                    name:
                        "Cerebras",

                    description:
                        AI_CONFIG.cerebrasModel,

                    available:
                        AI_STATUS.cerebras.enabled
                },

                {
                    id:
                        "openrouter",

                    name:
                        "OpenRouter",

                    description:
                        AI_CONFIG.openRouterModel,

                    available:
                        AI_STATUS.openrouter.enabled
                },

                {
                    id:
                        "gemini",

                    name:
                        "Gemini",

                    description:
                        AI_CONFIG.geminiModel,

                    available:
                        AI_STATUS.gemini.enabled
                },

                {
                    id:
                        "local",

                    name:
                        "TürkAI Local",

                    description:
                        "Harici API olmadan yerel cevap motoru",

                    available:
                        true
                }
            ]
        });
    }
);


/* ================================================================
   149 — SIMPLE MESSAGE API
================================================================ */

const simpleMessages = {

    "merhaba":
        "Merhaba! Ben TürkAI. Nasıl yardımcı olabilirim?",

    "selam":
        "Selam! TürkAI burada.",

    "iyi misin":
        "İyiyim, teşekkürler. Sen nasılsın?",

    "teşekkürler":
        "Rica ederim!",

    "sağ ol":
        "Rica ederim!",

    "en hızlı kim":
        "TürkAI"
};


/* ================================================================
   150 — SIMPLE MESSAGE TEST
================================================================ */

app.get(
    "/api/simple/:message",
    (
        req,
        res
    ) => {

        const key =
            cleanText(
                req.params.message,
                200
            )
            .toLocaleLowerCase(
                "tr-TR"
            );

        const answer =
            simpleMessages[key];

        if (
            !answer
        ) {

            return res.status(404)
                .json({

                    ok:
                        false,

                    error:
                        "Basit cevap bulunamadı."
                });
        }

        res.json({

            ok:
                true,

            reply:
                answer
        });
    }
);


/* ================================================================
   151 — PARÇA 3 SONU
================================================================ */

/*
    ARTIK GERÇEK:

        POST /api/chat

    VAR.

    Frontend'in gönderdiği:

        {
            message,
            chatId,
            model
        }

    kabul ediliyor.

    Response içinde:

        reply
        response
        message
        text
        chatId
        provider
        model
        source
        fallback

    alanları dönüyor.

    Yani mevcut index.html ile uyumlu.

    SONRAKİ:

    PARÇA 4
    ---------------------------------------------------------------
    - /api/upload
    - dosya yönetimi
    - research
    - weather
    - döviz
    - projects
    - notifications
    - feedback
    - admin
    - güvenlik
    - dosya metadata sistemi
    ---------------------------------------------------------------
*/
// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS — PARÇA 4 / 5
// ============================================================
// Bu bölüm:
// - Dosya yükleme
// - Dosya listeleme / indirme / silme
// - İnternet araştırması
// - Hava durumu
// - Döviz
// - Projeler
// - Bildirimler
// - Feedback
// - Admin panel API
// - Güvenlik API
// - Sistem istatistikleri
// - Health endpoint
// ============================================================


// ============================================================
// 400 — DOSYA / STORAGE YARDIMCILARI
// ============================================================

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES = [
    "text/plain",
    "text/html",
    "text/css",
    "text/javascript",
    "application/javascript",
    "application/json",
    "application/xml",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/markdown",
    "text/csv",
    "application/zip"
];

const BLOCKED_EXTENSIONS = [
    ".exe",
    ".dll",
    ".scr",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".vbs",
    ".vbe",
    ".ps1"
];

function safeFileName(fileName) {
    let value = String(fileName || "dosya");

    value = value
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
        .replace(/\.\./g, "_")
        .trim();

    if (!value) {
        value = "dosya";
    }

    if (value.length > 180) {
        value = value.slice(0, 180);
    }

    return value;
}

function getFileExtension(fileName) {
    const value = String(fileName || "");
    const index = value.lastIndexOf(".");

    if (index === -1) {
        return "";
    }

    return value.slice(index).toLowerCase();
}

function isBlockedExtension(fileName) {
    return BLOCKED_EXTENSIONS.includes(
        getFileExtension(fileName)
    );
}

function detectMimeType(fileName) {
    const ext = getFileExtension(fileName);

    const map = {
        ".txt": "text/plain",
        ".html": "text/html",
        ".htm": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".json": "application/json",
        ".xml": "application/xml",
        ".md": "text/markdown",
        ".csv": "text/csv",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".pdf": "application/pdf",
        ".zip": "application/zip"
    };

    return map[ext] || "application/octet-stream";
}

function formatBytes(bytes) {
    const value = Number(bytes) || 0;

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    if (value < 1024 * 1024 * 1024) {
        return `${(value / 1024 / 1024).toFixed(1)} MB`;
    }

    return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getUserStorageDirectory(userId) {
    const cleanId = String(userId || "guest")
        .replace(/[^a-zA-Z0-9_-]/g, "_");

    const directory = path.join(
        USERS_DIR,
        cleanId
    );

    fs.mkdirSync(directory, {
        recursive: true
    });

    return directory;
}

function getUserUploadDirectory(userId) {
    const directory = path.join(
        getUserStorageDirectory(userId),
        "uploads"
    );

    fs.mkdirSync(directory, {
        recursive: true
    });

    return directory;
}

function getFileDatabase() {
    return readJSONSafe(
        DB_FILES.files,
        []
    );
}

function saveFileDatabase(files) {
    writeJSONSafe(
        DB_FILES.files,
        Array.isArray(files) ? files : []
    );
}

function createFileRecord(data) {
    return {
        id: crypto.randomUUID(),
        userId: data.userId || "guest",
        originalName: data.originalName || "dosya",
        storedName: data.storedName || "file",
        path: data.path || "",
        mimeType: data.mimeType || "application/octet-stream",
        size: Number(data.size) || 0,
        sizeText: formatBytes(data.size),
        extension: getFileExtension(data.originalName),
        createdAt: nowISO(),
        updatedAt: nowISO(),
        status: "ready"
    };
}


// ============================================================
// 401 — RAW REQUEST BODY
// ============================================================

function readRawRequestBody(req, maxBytes) {
    return new Promise((resolve, reject) => {
        let total = 0;
        const chunks = [];

        const limit = Number(maxBytes) || MAX_UPLOAD_SIZE;

        req.on("data", chunk => {
            total += chunk.length;

            if (total > limit) {
                reject(
                    new Error("UPLOAD_TOO_LARGE")
                );

                req.destroy();
                return;
            }

            chunks.push(chunk);
        });

        req.on("end", () => {
            resolve(
                Buffer.concat(chunks)
            );
        });

        req.on("error", error => {
            reject(error);
        });
    });
}


// ============================================================
// 402 — MULTIPART PARSER
// ============================================================

function parseMultipartBody(buffer, boundary) {
    const result = [];

    if (!buffer || !boundary) {
        return result;
    }

    const separator = Buffer.from(
        `--${boundary}`
    );

    let start = 0;

    while (true) {
        const boundaryIndex = buffer.indexOf(
            separator,
            start
        );

        if (boundaryIndex === -1) {
            break;
        }

        const nextStart = boundaryIndex + separator.length;

        if (
            buffer[nextStart] === 45 &&
            buffer[nextStart + 1] === 45
        ) {
            break;
        }

        let partStart = nextStart;

        if (
            buffer[partStart] === 13 &&
            buffer[partStart + 1] === 10
        ) {
            partStart += 2;
        }

        const nextBoundary = buffer.indexOf(
            separator,
            partStart
        );

        if (nextBoundary === -1) {
            break;
        }

        let partEnd = nextBoundary;

        if (
            buffer[partEnd - 2] === 13 &&
            buffer[partEnd - 1] === 10
        ) {
            partEnd -= 2;
        }

        const part = buffer.slice(
            partStart,
            partEnd
        );

        const headerEnd = part.indexOf(
            Buffer.from("\r\n\r\n")
        );

        if (headerEnd === -1) {
            start = nextBoundary;
            continue;
        }

        const headerBuffer = part.slice(
            0,
            headerEnd
        );

        const body = part.slice(
            headerEnd + 4
        );

        const headerText = headerBuffer.toString(
            "utf8"
        );

        const headers = {};

        for (const line of headerText.split("\r\n")) {
            const separatorIndex = line.indexOf(":");

            if (separatorIndex === -1) {
                continue;
            }

            const key = line
                .slice(0, separatorIndex)
                .trim()
                .toLowerCase();

            const value = line
                .slice(separatorIndex + 1)
                .trim();

            headers[key] = value;
        }

        const disposition =
            headers["content-disposition"] || "";

        const nameMatch =
            disposition.match(
                /name="([^"]*)"/i
            );

        const fileMatch =
            disposition.match(
                /filename="([^"]*)"/i
            );

        result.push({
            headers,
            name: nameMatch
                ? nameMatch[1]
                : null,
            filename: fileMatch
                ? fileMatch[1]
                : null,
            data: body
        });

        start = nextBoundary;
    }

    return result;
}


// ============================================================
// 403 — UPLOAD ENDPOINT
// ============================================================

app.post(
    "/api/upload",
    async (req, res) => {
        const requestId =
            req.requestId || crypto.randomUUID();

        try {
            const contentType =
                String(
                    req.headers["content-type"] || ""
                );

            if (
                !contentType
                    .toLowerCase()
                    .startsWith("multipart/form-data")
            ) {
                return res.status(415).json({
                    ok: false,
                    error: "MULTIPART_REQUIRED",
                    message:
                        "Dosya yüklemek için multipart/form-data kullanın.",
                    requestId
                });
            }

            const boundaryMatch =
                contentType.match(
                    /boundary=(?:"([^"]+)"|([^;]+))/i
                );

            if (!boundaryMatch) {
                return res.status(400).json({
                    ok: false,
                    error: "BOUNDARY_MISSING",
                    message: "Multipart boundary bulunamadı.",
                    requestId
                });
            }

            const boundary =
                boundaryMatch[1] ||
                boundaryMatch[2];

            const rawBody =
                await readRawRequestBody(
                    req,
                    MAX_UPLOAD_SIZE + 1024 * 1024
                );

            const parts =
                parseMultipartBody(
                    rawBody,
                    boundary
                );

            const fileParts =
                parts.filter(
                    part => Boolean(part.filename)
                );

            if (!fileParts.length) {
                return res.status(400).json({
                    ok: false,
                    error: "FILE_MISSING",
                    message: "Dosya bulunamadı.",
                    requestId
                });
            }

            const uploadedFiles = [];

            const userId =
                req.user?.id || "guest";

            const uploadDirectory =
                getUserUploadDirectory(userId);

            for (const part of fileParts) {
                const originalName =
                    safeFileName(
                        part.filename
                    );

                if (
                    isBlockedExtension(
                        originalName
                    )
                ) {
                    continue;
                }

                if (
                    part.data.length >
                    MAX_UPLOAD_SIZE
                ) {
                    continue;
                }

                const mimeType =
                    part.headers[
                        "content-type"
                    ] ||
                    detectMimeType(
                        originalName
                    );

                const fileId =
                    crypto.randomUUID();

                const storedName =
                    `${fileId}${getFileExtension(originalName)}`;

                const targetPath =
                    path.join(
                        uploadDirectory,
                        storedName
                    );

                fs.writeFileSync(
                    targetPath,
                    part.data
                );

                const record =
                    createFileRecord({
                        userId,
                        originalName,
                        storedName,
                        path: targetPath,
                        mimeType,
                        size: part.data.length
                    });

                const files =
                    getFileDatabase();

                files.push(record);

                saveFileDatabase(files);

                uploadedFiles.push({
                    id: record.id,
                    name: record.originalName,
                    originalName:
                        record.originalName,
                    size: record.size,
                    sizeText:
                        record.sizeText,
                    mimeType:
                        record.mimeType,
                    createdAt:
                        record.createdAt
                });
            }

            if (!uploadedFiles.length) {
                return res.status(400).json({
                    ok: false,
                    error: "UPLOAD_REJECTED",
                    message:
                        "Yüklenen dosyaların hiçbiri kabul edilmedi.",
                    requestId
                });
            }

            res.json({
                ok: true,
                message:
                    "Dosya başarıyla yüklendi.",
                files: uploadedFiles,
                file: uploadedFiles[0],
                requestId
            });
        } catch (error) {
            logError(
                "UPLOAD_ERROR",
                error
            );

            if (
                error.message ===
                "UPLOAD_TOO_LARGE"
            ) {
                return res.status(413).json({
                    ok: false,
                    error: "UPLOAD_TOO_LARGE",
                    message:
                        "Dosya boyutu çok büyük.",
                    requestId
                });
            }

            res.status(500).json({
                ok: false,
                error: "UPLOAD_FAILED",
                message:
                    "Dosya yüklenirken hata oluştu.",
                requestId
            });
        }
    }
);


// ============================================================
// 404 — FILE LIST
// ============================================================

app.get(
    "/api/files",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const files =
            getFileDatabase()
                .filter(
                    file =>
                        file.userId === userId
                )
                .map(file => ({
                    id: file.id,
                    name: file.originalName,
                    originalName:
                        file.originalName,
                    mimeType:
                        file.mimeType,
                    size:
                        file.size,
                    sizeText:
                        file.sizeText,
                    extension:
                        file.extension,
                    createdAt:
                        file.createdAt,
                    status:
                        file.status
                }));

        res.json({
            ok: true,
            files
        });
    }
);


// ============================================================
// 405 — FILE DETAIL
// ============================================================

app.get(
    "/api/files/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const files =
            getFileDatabase();

        const file =
            files.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === userId
            );

        if (!file) {
            return res.status(404).json({
                ok: false,
                error: "FILE_NOT_FOUND"
            });
        }

        res.json({
            ok: true,
            file: {
                id: file.id,
                name: file.originalName,
                mimeType: file.mimeType,
                size: file.size,
                sizeText: file.sizeText,
                createdAt: file.createdAt,
                status: file.status
            }
        });
    }
);


// ============================================================
// 406 — FILE DOWNLOAD
// ============================================================

app.get(
    "/api/files/:id/download",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const files =
            getFileDatabase();

        const file =
            files.find(
                item =>
                    item.id === req.params.id &&
                    item.userId === userId
            );

        if (!file) {
            return res.status(404).json({
                ok: false,
                error: "FILE_NOT_FOUND"
            });
        }

        if (
            !file.path ||
            !fs.existsSync(file.path)
        ) {
            return res.status(404).json({
                ok: false,
                error: "FILE_STORAGE_MISSING"
            });
        }

        res.download(
            file.path,
            file.originalName
        );
    }
);


// ============================================================
// 407 — FILE DELETE
// ============================================================

app.delete(
    "/api/files/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const files =
            getFileDatabase();

        const index =
            files.findIndex(
                item =>
                    item.id === req.params.id &&
                    item.userId === userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error: "FILE_NOT_FOUND"
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
            logWarn(
                "FILE_DELETE_STORAGE_WARNING",
                error.message
            );
        }

        files.splice(index, 1);

        saveFileDatabase(files);

        res.json({
            ok: true,
            message:
                "Dosya silindi.",
            id: file.id
        });
    }
);


// ============================================================
// 408 — FILE SEARCH
// ============================================================

app.get(
    "/api/files/search",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const query =
            cleanText(
                req.query.q || ""
            ).toLowerCase();

        const files =
            getFileDatabase()
                .filter(
                    file =>
                        file.userId === userId
                )
                .filter(file => {
                    if (!query) {
                        return true;
                    }

                    return String(
                        file.originalName
                    )
                        .toLowerCase()
                        .includes(query);
                });

        res.json({
            ok: true,
            query,
            count: files.length,
            files
        });
    }
);


// ============================================================
// 409 — RESEARCH HELPERS
// ============================================================

const RESEARCH_TIMEOUT =
    20000;

function normalizeResearchQuery(query) {
    return cleanText(
        query || ""
    )
        .replace(/\s+/g, " ")
        .slice(0, 500);
}

function buildResearchPrompt(query, sources) {
    const sourceText =
        sources
            .slice(0, 8)
            .map(
                (item, index) =>
                    `${index + 1}. ${item.title}\n${item.url}\n${item.content}`
            )
            .join("\n\n");

    return [
        "Aşağıdaki internet araştırma sonuçlarını Türkçe olarak özetle.",
        "Kesin olmayan bilgileri kesin gerçek gibi sunma.",
        "Kaynakları ayrı listele.",
        "",
        `SORU: ${query}`,
        "",
        "SONUÇLAR:",
        sourceText
    ].join("\n");
}

async function researchWithTavily(query) {
    const apiKey =
        process.env.TAVILY_API_KEY;

    if (!apiKey) {
        return null;
    }

    const response =
        await fetchWithTimeout(
            "https://api.tavily.com/search",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query,
                    search_depth: "advanced",
                    include_answer: true,
                    include_raw_content: false,
                    max_results: 8
                })
            },
            RESEARCH_TIMEOUT
        );

    if (!response.ok) {
        throw new Error(
            `TAVILY_HTTP_${response.status}`
        );
    }

    const data =
        await response.json();

    return {
        provider: "tavily",
        answer:
            data.answer || null,
        sources:
            Array.isArray(data.results)
                ? data.results.map(item => ({
                    title:
                        item.title || "",
                    url:
                        item.url || "",
                    content:
                        item.content || ""
                }))
                : []
    };
}

async function researchWithBingLikeProvider(query) {
    const apiKey =
        process.env.BRAVE_SEARCH_API_KEY;

    if (!apiKey) {
        return null;
    }

    const url =
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`;

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "GET",
                headers: {
                    "Accept":
                        "application/json",
                    "X-Subscription-Token":
                        apiKey
                }
            },
            RESEARCH_TIMEOUT
        );

    if (!response.ok) {
        throw new Error(
            `BRAVE_HTTP_${response.status}`
        );
    }

    const data =
        await response.json();

    const results =
        data?.web?.results || [];

    return {
        provider: "brave",
        answer: null,
        sources:
            results
                .slice(0, 8)
                .map(item => ({
                    title:
                        item.title || "",
                    url:
                        item.url || "",
                    content:
                        item.description || ""
                }))
    };
}

async function performResearch(query) {
    const cleanQuery =
        normalizeResearchQuery(
            query
        );

    if (!cleanQuery) {
        return {
            ok: false,
            error: "QUERY_REQUIRED"
        };
    }

    const providers = [
        researchWithTavily,
        researchWithBingLikeProvider
    ];

    for (const provider of providers) {
        try {
            const result =
                await provider(
                    cleanQuery
                );

            if (
                result &&
                result.sources &&
                result.sources.length
            ) {
                return {
                    ok: true,
                    query: cleanQuery,
                    provider:
                        result.provider,
                    directAnswer:
                        result.answer,
                    sources:
                        result.sources
                };
            }
        } catch (error) {
            logWarn(
                "RESEARCH_PROVIDER_ERROR",
                error.message
            );
        }
    }

    return {
        ok: false,
        error:
            "RESEARCH_PROVIDER_UNAVAILABLE",
        query: cleanQuery
    };
}


// ============================================================
// 410 — RESEARCH ENDPOINT
// ============================================================

app.post(
    "/api/research",
    async (req, res) => {
        const requestId =
            req.requestId ||
            crypto.randomUUID();

        try {
            const query =
                normalizeResearchQuery(
                    req.body?.query ||
                    req.body?.message ||
                    req.body?.q
                );

            if (!query) {
                return res.status(400).json({
                    ok: false,
                    error: "QUERY_REQUIRED",
                    requestId
                });
            }

            const result =
                await performResearch(
                    query
                );

            if (!result.ok) {
                return res.status(503).json({
                    ...result,
                    message:
                        "Araştırma servisi şu anda kullanılamıyor.",
                    requestId
                });
            }

            res.json({
                ...result,
                requestId,
                completedAt: nowISO()
            });
        } catch (error) {
            logError(
                "RESEARCH_ROUTE_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error: "RESEARCH_FAILED",
                requestId
            });
        }
    }
);


// ============================================================
// 411 — RESEARCH GET
// ============================================================

app.get(
    "/api/research",
    async (req, res) => {
        const query =
            normalizeResearchQuery(
                req.query.q ||
                req.query.query
            );

        if (!query) {
            return res.status(400).json({
                ok: false,
                error: "QUERY_REQUIRED"
            });
        }

        try {
            const result =
                await performResearch(
                    query
                );

            res.json(result);
        } catch (error) {
            logError(
                "RESEARCH_GET_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error: "RESEARCH_FAILED"
            });
        }
    }
);


// ============================================================
// 412 — WEATHER HELPERS
// ============================================================

async function geocodeCity(city) {
    const name =
        cleanText(city || "");

    if (!name) {
        return null;
    }

    const url =
        "https://geocoding-api.open-meteo.com/v1/search" +
        `?name=${encodeURIComponent(name)}` +
        "&count=1" +
        "&language=tr" +
        "&format=json";

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "GET"
            },
            10000
        );

    if (!response.ok) {
        throw new Error(
            `GEOCODING_HTTP_${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        !data.results ||
        !data.results.length
    ) {
        return null;
    }

    return data.results[0];
}

async function getWeatherData(city) {
    const location =
        await geocodeCity(city);

    if (!location) {
        return {
            ok: false,
            error: "CITY_NOT_FOUND"
        };
    }

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${encodeURIComponent(location.latitude)}` +
        `&longitude=${encodeURIComponent(location.longitude)}` +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m" +
        "&hourly=temperature_2m,precipitation_probability,weather_code" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset" +
        "&timezone=auto";

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "GET"
            },
            10000
        );

    if (!response.ok) {
        throw new Error(
            `WEATHER_HTTP_${response.status}`
        );
    }

    const data =
        await response.json();

    return {
        ok: true,
        location: {
            name:
                location.name,
            country:
                location.country,
            latitude:
                location.latitude,
            longitude:
                location.longitude,
            timezone:
                location.timezone
        },
        current:
            data.current || null,
        hourly:
            data.hourly || null,
        daily:
            data.daily || null,
        fetchedAt:
            nowISO()
    };
}


// ============================================================
// 413 — WEATHER ENDPOINT
// ============================================================

app.get(
    "/api/weather",
    async (req, res) => {
        const city =
            cleanText(
                req.query.city ||
                req.query.q ||
                "Konya"
            );

        try {
            const result =
                await getWeatherData(
                    city
                );

            if (!result.ok) {
                return res.status(404).json(
                    result
                );
            }

            res.json(result);
        } catch (error) {
            logError(
                "WEATHER_ERROR",
                error
            );

            res.status(503).json({
                ok: false,
                error: "WEATHER_UNAVAILABLE",
                message:
                    "Hava durumu servisine ulaşılamadı."
            });
        }
    }
);


// ============================================================
// 414 — CURRENCY HELPERS
// ============================================================

async function getCurrencyRates(base) {
    const normalizedBase =
        cleanText(
            base || "USD"
        )
            .toUpperCase()
            .slice(0, 10);

    const url =
        `https://open.er-api.com/v6/latest/${encodeURIComponent(normalizedBase)}`;

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "GET"
            },
            10000
        );

    if (!response.ok) {
        throw new Error(
            `CURRENCY_HTTP_${response.status}`
        );
    }

    const data =
        await response.json();

    if (
        data.result !== "success"
    ) {
        throw new Error(
            "CURRENCY_API_FAILED"
        );
    }

    return {
        ok: true,
        base:
            data.base_code,
        rates:
            data.rates || {},
        timeLastUpdate:
            data.time_last_update_utc,
        timeNextUpdate:
            data.time_next_update_utc,
        provider:
            "open.er-api.com"
    };
}


// ============================================================
// 415 — CURRENCY ENDPOINT
// ============================================================

app.get(
    "/api/currency",
    async (req, res) => {
        const base =
            cleanText(
                req.query.base ||
                "USD"
            ).toUpperCase();

        try {
            const result =
                await getCurrencyRates(
                    base
                );

            const selected = {};

            const wanted = [
                "TRY",
                "USD",
                "EUR",
                "GBP",
                "JPY",
                "CHF",
                "CAD",
                "AUD"
            ];

            for (const code of wanted) {
                if (
                    result.rates[code] !==
                    undefined
                ) {
                    selected[code] =
                        result.rates[code];
                }
            }

            res.json({
                ...result,
                selected
            });
        } catch (error) {
            logError(
                "CURRENCY_ERROR",
                error
            );

            res.status(503).json({
                ok: false,
                error:
                    "CURRENCY_UNAVAILABLE"
            });
        }
    }
);


// ============================================================
// 416 — PROJECT DATABASE
// ============================================================

const PROJECTS_DB_FILE =
    path.join(
        DB_DIR,
        "projects.json"
    );

const NOTIFICATIONS_DB_FILE =
    path.join(
        DB_DIR,
        "notifications.json"
    );

function getProjects() {
    return readJSONSafe(
        PROJECTS_DB_FILE,
        []
    );
}

function saveProjects(projects) {
    writeJSONSafe(
        PROJECTS_DB_FILE,
        Array.isArray(projects)
            ? projects
            : []
    );
}

function createProjectRecord(data) {
    return {
        id: crypto.randomUUID(),
        userId:
            data.userId || "guest",
        name:
            cleanText(
                data.name ||
                "Yeni Proje"
            ).slice(0, 120),
        description:
            cleanText(
                data.description || ""
            ).slice(0, 1000),
        language:
            cleanText(
                data.language ||
                "javascript"
            ).slice(0, 40),
        code:
            String(
                data.code || ""
            ).slice(0, 500000),
        status:
            "active",
        createdAt:
            nowISO(),
        updatedAt:
            nowISO()
    };
}


// ============================================================
// 417 — PROJECT LIST
// ============================================================

app.get(
    "/api/projects",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const projects =
            getProjects()
                .filter(
                    project =>
                        project.userId === userId
                );

        res.json({
            ok: true,
            projects,
            count:
                projects.length
        });
    }
);


// ============================================================
// 418 — PROJECT CREATE
// ============================================================

app.post(
    "/api/projects",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const name =
            cleanText(
                req.body?.name ||
                "Yeni Proje"
            );

        if (!name) {
            return res.status(400).json({
                ok: false,
                error: "PROJECT_NAME_REQUIRED"
            });
        }

        const projects =
            getProjects();

        const project =
            createProjectRecord({
                ...req.body,
                userId,
                name
            });

        projects.push(project);

        saveProjects(
            projects
        );

        res.status(201).json({
            ok: true,
            project
        });
    }
);


// ============================================================
// 419 — PROJECT DETAIL
// ============================================================

app.get(
    "/api/projects/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const project =
            getProjects().find(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId === userId
            );

        if (!project) {
            return res.status(404).json({
                ok: false,
                error:
                    "PROJECT_NOT_FOUND"
            });
        }

        res.json({
            ok: true,
            project
        });
    }
);


// ============================================================
// 420 — PROJECT UPDATE
// ============================================================

app.patch(
    "/api/projects/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const projects =
            getProjects();

        const index =
            projects.findIndex(
                project =>
                    project.id ===
                        req.params.id &&
                    project.userId === userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "PROJECT_NOT_FOUND"
            });
        }

        const current =
            projects[index];

        if (
            req.body.name !==
            undefined
        ) {
            current.name =
                cleanText(
                    req.body.name
                ).slice(0, 120);
        }

        if (
            req.body.description !==
            undefined
        ) {
            current.description =
                cleanText(
                    req.body.description
                ).slice(0, 1000);
        }

        if (
            req.body.language !==
            undefined
        ) {
            current.language =
                cleanText(
                    req.body.language
                ).slice(0, 40);
        }

        if (
            req.body.code !==
            undefined
        ) {
            current.code =
                String(
                    req.body.code
                ).slice(0, 500000);
        }

        current.updatedAt =
            nowISO();

        projects[index] =
            current;

        saveProjects(
            projects
        );

        res.json({
            ok: true,
            project: current
        });
    }
);


// ============================================================
// 421 — PROJECT DELETE
// ============================================================

app.delete(
    "/api/projects/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const projects =
            getProjects();

        const index =
            projects.findIndex(
                project =>
                    project.id ===
                        req.params.id &&
                    project.userId === userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "PROJECT_NOT_FOUND"
            });
        }

        const deleted =
            projects.splice(
                index,
                1
            )[0];

        saveProjects(
            projects
        );

        res.json({
            ok: true,
            deletedId:
                deleted.id
        });
    }
);


// ============================================================
// 422 — PROJECT SEARCH
// ============================================================

app.get(
    "/api/projects/search",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const query =
            cleanText(
                req.query.q || ""
            ).toLowerCase();

        const projects =
            getProjects()
                .filter(
                    project =>
                        project.userId === userId
                )
                .filter(project => {
                    if (!query) {
                        return true;
                    }

                    return [
                        project.name,
                        project.description,
                        project.language
                    ]
                        .join(" ")
                        .toLowerCase()
                        .includes(query);
                });

        res.json({
            ok: true,
            projects
        });
    }
);


// ============================================================
// 423 — NOTIFICATION HELPERS
// ============================================================

function getNotifications() {
    return readJSONSafe(
        NOTIFICATIONS_DB_FILE,
        []
    );
}

function saveNotifications(
    notifications
) {
    writeJSONSafe(
        NOTIFICATIONS_DB_FILE,
        Array.isArray(
            notifications
        )
            ? notifications
            : []
    );
}

function createNotification(
    userId,
    data
) {
    return {
        id: crypto.randomUUID(),
        userId:
            userId || "guest",
        type:
            data.type || "info",
        title:
            cleanText(
                data.title ||
                "TürkAI"
            ).slice(0, 160),
        message:
            cleanText(
                data.message || ""
            ).slice(0, 1000),
        read: false,
        createdAt:
            nowISO()
    };
}


// ============================================================
// 424 — NOTIFICATION LIST
// ============================================================

app.get(
    "/api/notifications",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const notifications =
            getNotifications()
                .filter(
                    item =>
                        item.userId === userId
                )
                .sort(
                    (a, b) =>
                        String(
                            b.createdAt
                        ).localeCompare(
                            String(
                                a.createdAt
                            )
                        )
                )
                .slice(0, 100);

        res.json({
            ok: true,
            notifications,
            unread:
                notifications.filter(
                    item =>
                        !item.read
                ).length
        });
    }
);


// ============================================================
// 425 — NOTIFICATION CREATE
// ============================================================

app.post(
    "/api/notifications",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const notification =
            createNotification(
                userId,
                req.body || {}
            );

        const notifications =
            getNotifications();

        notifications.push(
            notification
        );

        saveNotifications(
            notifications
        );

        res.status(201).json({
            ok: true,
            notification
        });
    }
);


// ============================================================
// 426 — NOTIFICATION READ
// ============================================================

app.patch(
    "/api/notifications/:id/read",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const notifications =
            getNotifications();

        const notification =
            notifications.find(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId === userId
            );

        if (!notification) {
            return res.status(404).json({
                ok: false,
                error:
                    "NOTIFICATION_NOT_FOUND"
            });
        }

        notification.read =
            true;

        saveNotifications(
            notifications
        );

        res.json({
            ok: true,
            notification
        });
    }
);


// ============================================================
// 427 — NOTIFICATION READ ALL
// ============================================================

app.post(
    "/api/notifications/read-all",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const notifications =
            getNotifications();

        let changed = 0;

        for (const item of notifications) {
            if (
                item.userId === userId &&
                !item.read
            ) {
                item.read = true;
                changed++;
            }
        }

        saveNotifications(
            notifications
        );

        res.json({
            ok: true,
            changed
        });
    }
);


// ============================================================
// 428 — FEEDBACK
// ============================================================

app.post(
    "/api/feedback",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const rating =
            Number(
                req.body?.rating
            );

        const message =
            cleanText(
                req.body?.message ||
                req.body?.text ||
                ""
            ).slice(0, 3000);

        if (
            !message &&
            !Number.isFinite(rating)
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "FEEDBACK_REQUIRED"
            });
        }

        const feedback =
            readJSONSafe(
                DB_FILES.feedback,
                []
            );

        const record = {
            id: crypto.randomUUID(),
            userId,
            rating:
                Number.isFinite(rating)
                    ? Math.max(
                        1,
                        Math.min(
                            5,
                            rating
                        )
                    )
                    : null,
            message,
            page:
                cleanText(
                    req.body?.page ||
                    ""
                ).slice(0, 300),
            createdAt:
                nowISO()
        };

        feedback.push(
            record
        );

        writeJSONSafe(
            DB_FILES.feedback,
            feedback
        );

        res.status(201).json({
            ok: true,
            feedback: record
        });
    }
);


// ============================================================
// 429 — USER FEEDBACK
// ============================================================

app.get(
    "/api/feedback",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const feedback =
            readJSONSafe(
                DB_FILES.feedback,
                []
            )
                .filter(
                    item =>
                        item.userId === userId
                )
                .slice(-100);

        res.json({
            ok: true,
            feedback
        });
    }
);


// ============================================================
// 430 — ADMIN HELPERS
// ============================================================

function getAdminCode() {
    return String(
        process.env.TURKAI_PRO_CODE ||
        ""
    );
}

function getAuthorizationToken(req) {
    const header =
        String(
            req.headers.authorization ||
            ""
        );

    if (
        header
            .toLowerCase()
            .startsWith("bearer ")
    ) {
        return header.slice(7).trim();
    }

    return "";
}

function isAdminRequest(req) {
    if (
        req.user &&
        (
            req.user.role === "admin" ||
            req.user.role === "developer"
        )
    ) {
        return true;
    }

    const adminHeader =
        String(
            req.headers[
                "x-admin-code"
            ] || ""
        );

    const bearer =
        getAuthorizationToken(
            req
        );

    const configured =
        getAdminCode();

    if (!configured) {
        return false;
    }

    return (
        adminHeader === configured ||
        bearer === configured
    );
}

function requireAdmin(req, res, next) {
    if (!isAdminRequest(req)) {
        return res.status(403).json({
            ok: false,
            error: "ADMIN_REQUIRED",
            message:
                "Bu işlem yönetici yetkisi gerektiriyor."
        });
    }

    next();
}


// ============================================================
// 431 — ADMIN STATS
// ============================================================

app.get(
    "/api/admin/stats",
    requireAdmin,
    (req, res) => {
        const users =
            readJSONSafe(
                DB_FILES.users,
                []
            );

        const chats =
            readJSONSafe(
                DB_FILES.chats,
                []
            );

        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            );

        const memories =
            readJSONSafe(
                DB_FILES.memories,
                []
            );

        const files =
            readJSONSafe(
                DB_FILES.files,
                []
            );

        const feedback =
            readJSONSafe(
                DB_FILES.feedback,
                []
            );

        const usage =
            readJSONSafe(
                DB_FILES.usage,
                {}
            );

        res.json({
            ok: true,
            stats: {
                users:
                    users.length,
                chats:
                    chats.length,
                messages:
                    messages.length,
                memories:
                    memories.length,
                files:
                    files.length,
                feedback:
                    feedback.length,
                usageEntries:
                    Object.keys(
                        usage
                    ).length,
                uptime:
                    process.uptime(),
                memory:
                    process.memoryUsage(),
                node:
                    process.version,
                platform:
                    process.platform,
                version:
                    APP_VERSION
            }
        });
    }
);


// ============================================================
// 432 — ADMIN USERS
// ============================================================

app.get(
    "/api/admin/users",
    requireAdmin,
    (req, res) => {
        const users =
            readJSONSafe(
                DB_FILES.users,
                []
            );

        const safeUsers =
            users.map(
                user => ({
                    id:
                        user.id,
                    name:
                        user.name,
                    email:
                        user.email,
                    role:
                        user.role ||
                        "user",
                    plan:
                        user.plan ||
                        "free",
                    createdAt:
                        user.createdAt,
                    updatedAt:
                        user.updatedAt
                })
            );

        res.json({
            ok: true,
            users:
                safeUsers,
            count:
                safeUsers.length
        });
    }
);


// ============================================================
// 433 — ADMIN FILES
// ============================================================

app.get(
    "/api/admin/files",
    requireAdmin,
    (req, res) => {
        const files =
            getFileDatabase();

        res.json({
            ok: true,
            files,
            count:
                files.length
        });
    }
);


// ============================================================
// 434 — ADMIN FEEDBACK
// ============================================================

app.get(
    "/api/admin/feedback",
    requireAdmin,
    (req, res) => {
        const feedback =
            readJSONSafe(
                DB_FILES.feedback,
                []
            );

        res.json({
            ok: true,
            feedback,
            count:
                feedback.length
        });
    }
);


// ============================================================
// 435 — ADMIN LOG
// ============================================================

app.get(
    "/api/admin/logs",
    requireAdmin,
    (req, res) => {
        let files = [];

        try {
            files =
                fs.readdirSync(
                    LOGS_DIR
                );
        } catch {
            files = [];
        }

        res.json({
            ok: true,
            logs:
                files.slice(-100)
        });
    }
);


// ============================================================
// 436 — SECURITY STATUS
// ============================================================

function getSecurityStatus() {
    return {
        helmet: true,
        cors: true,
        rateLimit:
            true,
        requestId:
            true,
        uploadLimit:
            MAX_UPLOAD_SIZE,
        blockedExtensions:
            BLOCKED_EXTENSIONS,
        production:
            IS_PRODUCTION,
        node:
            process.version,
        uptime:
            process.uptime()
    };
}

app.get(
    "/api/security/status",
    (req, res) => {
        res.json({
            ok: true,
            security:
                getSecurityStatus()
        });
    }
);


// ============================================================
// 437 — SECURITY EVENTS
// ============================================================

function getSecurityEvents() {
    return readJSONSafe(
        DB_FILES.security,
        []
    );
}

function saveSecurityEvents(
    events
) {
    writeJSONSafe(
        DB_FILES.security,
        events
    );
}

function recordSecurityEvent(
    type,
    data
) {
    const events =
        getSecurityEvents();

    events.push({
        id:
            crypto.randomUUID(),
        type,
        ip:
            data.ip || null,
        userId:
            data.userId || null,
        path:
            data.path || null,
        method:
            data.method || null,
        message:
            data.message || "",
        createdAt:
            nowISO()
    });

    if (events.length > 5000) {
        events.splice(
            0,
            events.length - 5000
        );
    }

    saveSecurityEvents(
        events
    );
}


// ============================================================
// 438 — SECURITY EVENT LIST
// ============================================================

app.get(
    "/api/security/events",
    requireAdmin,
    (req, res) => {
        const events =
            getSecurityEvents();

        res.json({
            ok: true,
            events:
                events.slice(-200)
        });
    }
);


// ============================================================
// 439 — SYSTEM INFO
// ============================================================

app.get(
    "/api/system",
    (req, res) => {
        res.json({
            ok: true,
            app: {
                name:
                    APP_NAME,
                version:
                    APP_VERSION,
                environment:
                    NODE_ENV
            },
            runtime: {
                node:
                    process.version,
                platform:
                    process.platform,
                arch:
                    process.arch,
                uptime:
                    process.uptime()
            },
            memory:
                process.memoryUsage(),
            time:
                nowISO()
        });
    }
);


// ============================================================
// 440 — HEALTH CHECK
// ============================================================

app.get(
    "/api/health",
    (req, res) => {
        const memory =
            process.memoryUsage();

        const health = {
            ok: true,
            status: "healthy",
            service:
                APP_NAME,
            version:
                APP_VERSION,
            timestamp:
                nowISO(),
            uptime:
                process.uptime(),
            node:
                process.version,
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
                    AI_STATUS.groq,
                cerebras:
                    AI_STATUS.cerebras,
                openrouter:
                    AI_STATUS.openrouter,
                gemini:
                    AI_STATUS.gemini
            }
        };

        res.status(200).json(
            health
        );
    }
);


// ============================================================
// 441 — PING
// ============================================================

app.get(
    "/api/ping",
    (req, res) => {
        res.json({
            ok: true,
            pong: true,
            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// 442 — VERSION
// ============================================================

app.get(
    "/api/version",
    (req, res) => {
        res.json({
            ok: true,
            name:
                APP_NAME,
            version:
                APP_VERSION,
            node:
                process.version,
            api:
                "v1"
        });
    }
);


// ============================================================
// 443 — DEBUG INFO
// ============================================================

app.get(
    "/api/debug",
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true,
            env:
                NODE_ENV,
            cwd:
                process.cwd(),
            root:
                ROOT_DIR,
            data:
                DATA_DIR,
            storage:
                STORAGE_DIR,
            public:
                PUBLIC_DIR,
            memory:
                process.memoryUsage(),
            uptime:
                process.uptime()
        });
    }
);


// ============================================================
// 444 — MEMORY API
// ============================================================

app.get(
    "/api/memory",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const memories =
            readJSONSafe(
                DB_FILES.memories,
                []
            )
                .filter(
                    item =>
                        item.userId === userId
                );

        res.json({
            ok: true,
            memories
        });
    }
);


// ============================================================
// 445 — MEMORY CREATE
// ============================================================

app.post(
    "/api/memory",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const text =
            cleanText(
                req.body?.text ||
                req.body?.memory ||
                ""
            ).slice(0, 2000);

        if (!text) {
            return res.status(400).json({
                ok: false,
                error:
                    "MEMORY_TEXT_REQUIRED"
            });
        }

        const memories =
            readJSONSafe(
                DB_FILES.memories,
                []
            );

        const record = {
            id:
                crypto.randomUUID(),
            userId,
            text,
            source:
                "manual",
            createdAt:
                nowISO(),
            updatedAt:
                nowISO()
        };

        memories.push(
            record
        );

        writeJSONSafe(
            DB_FILES.memories,
            memories
        );

        res.status(201).json({
            ok: true,
            memory:
                record
        });
    }
);


// ============================================================
// 446 — MEMORY DELETE
// ============================================================

app.delete(
    "/api/memory/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const memories =
            readJSONSafe(
                DB_FILES.memories,
                []
            );

        const index =
            memories.findIndex(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId ===
                        userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "MEMORY_NOT_FOUND"
            });
        }

        memories.splice(
            index,
            1
        );

        writeJSONSafe(
            DB_FILES.memories,
            memories
        );

        res.json({
            ok: true
        });
    }
);


// ============================================================
// 447 — MEMORY CLEAR
// ============================================================

app.delete(
    "/api/memory",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const memories =
            readJSONSafe(
                DB_FILES.memories,
                []
            );

        const remaining =
            memories.filter(
                item =>
                    item.userId !==
                    userId
            );

        writeJSONSafe(
            DB_FILES.memories,
            remaining
        );

        res.json({
            ok: true,
            deleted:
                memories.length -
                remaining.length
        });
    }
);


// ============================================================
// 448 — SETTINGS DATABASE
// ============================================================

function getSettings() {
    return readJSONSafe(
        DB_FILES.settings,
        {}
    );
}

function saveSettings(settings) {
    writeJSONSafe(
        DB_FILES.settings,
        settings || {}
    );
}


// ============================================================
// 449 — USER SETTINGS
// ============================================================

app.get(
    "/api/settings",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const settings =
            getSettings();

        res.json({
            ok: true,
            settings:
                settings[userId] ||
                {}
        });
    }
);


// ============================================================
// 450 — UPDATE SETTINGS
// ============================================================

app.patch(
    "/api/settings",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const settings =
            getSettings();

        const current =
            settings[userId] || {};

        const incoming =
            req.body || {};

        const allowedKeys = [
            "theme",
            "language",
            "model",
            "fontSize",
            "sound",
            "voice",
            "research",
            "memory",
            "compactMode",
            "animations"
        ];

        for (const key of allowedKeys) {
            if (
                incoming[key] !==
                undefined
            ) {
                current[key] =
                    incoming[key];
            }
        }

        current.updatedAt =
            nowISO();

        settings[userId] =
            current;

        saveSettings(
            settings
        );

        res.json({
            ok: true,
            settings:
                current
        });
    }
);


// ============================================================
// 451 — USAGE STATUS
// ============================================================

app.get(
    "/api/usage",
    (req, res) => {
        const user =
            req.user ||
            getGuestUser();

        let usage = {};

        try {
            usage =
                readJSONSafe(
                    DB_FILES.usage,
                    {}
                );
        } catch {
            usage = {};
        }

        const userUsage =
            usage[user.id] || {};

        res.json({
            ok: true,
            userId:
                user.id,
            plan:
                user.plan ||
                "free",
            usage:
                userUsage
        });
    }
);


// ============================================================
// 452 — USAGE RESET ADMIN
// ============================================================

app.post(
    "/api/admin/usage/reset",
    requireAdmin,
    (req, res) => {
        const usage =
            readJSONSafe(
                DB_FILES.usage,
                {}
            );

        const userId =
            cleanText(
                req.body?.userId ||
                ""
            );

        if (userId) {
            delete usage[userId];
        }

        writeJSONSafe(
            DB_FILES.usage,
            usage
        );

        res.json({
            ok: true,
            resetUser:
                userId || null
        });
    }
);


// ============================================================
// 453 — CHAT LIST
// ============================================================

app.get(
    "/api/chats",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const chats =
            readJSONSafe(
                DB_FILES.chats,
                []
            )
                .filter(
                    chat =>
                        chat.userId === userId
                )
                .sort(
                    (a, b) =>
                        String(
                            b.updatedAt ||
                            b.createdAt ||
                            ""
                        ).localeCompare(
                            String(
                                a.updatedAt ||
                                a.createdAt ||
                                ""
                            )
                        )
                );

        res.json({
            ok: true,
            chats
        });
    }
);


// ============================================================
// 454 — CHAT DELETE
// ============================================================

app.delete(
    "/api/chats/:id",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const chats =
            readJSONSafe(
                DB_FILES.chats,
                []
            );

        const index =
            chats.findIndex(
                chat =>
                    chat.id ===
                        req.params.id &&
                    chat.userId === userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "CHAT_NOT_FOUND"
            });
        }

        chats.splice(
            index,
            1
        );

        writeJSONSafe(
            DB_FILES.chats,
            chats
        );

        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            );

        const remainingMessages =
            messages.filter(
                message =>
                    message.chatId !==
                    req.params.id
            );

        writeJSONSafe(
            DB_FILES.messages,
            remainingMessages
        );

        res.json({
            ok: true,
            deletedChat:
                req.params.id
        });
    }
);


// ============================================================
// 455 — CHAT CLEAR ALL
// ============================================================

app.delete(
    "/api/chats",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const chats =
            readJSONSafe(
                DB_FILES.chats,
                []
            );

        const userChats =
            chats.filter(
                chat =>
                    chat.userId === userId
            );

        const chatIds =
            new Set(
                userChats.map(
                    chat => chat.id
                )
            );

        const remainingChats =
            chats.filter(
                chat =>
                    chat.userId !== userId
            );

        writeJSONSafe(
            DB_FILES.chats,
            remainingChats
        );

        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            );

        const remainingMessages =
            messages.filter(
                message =>
                    !chatIds.has(
                        message.chatId
                    )
            );

        writeJSONSafe(
            DB_FILES.messages,
            remainingMessages
        );

        res.json({
            ok: true,
            deletedChats:
                userChats.length
        });
    }
);


// ============================================================
// 456 — ADMIN CHAT INSPECTION
// ============================================================

app.get(
    "/api/admin/chats",
    requireAdmin,
    (req, res) => {
        const chats =
            readJSONSafe(
                DB_FILES.chats,
                []
            );

        res.json({
            ok: true,
            chats,
            count:
                chats.length
        });
    }
);


// ============================================================
// 457 — ADMIN MESSAGES
// ============================================================

app.get(
    "/api/admin/messages",
    requireAdmin,
    (req, res) => {
        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            );

        res.json({
            ok: true,
            messages:
                messages.slice(-1000)
        });
    }
);


// ============================================================
// 458 — KNOWLEDGE API
// ============================================================

app.get(
    "/api/knowledge",
    requireAdmin,
    (req, res) => {
        const knowledge =
            readJSONSafe(
                DB_FILES.knowledge,
                []
            );

        res.json({
            ok: true,
            knowledge
        });
    }
);


// ============================================================
// 459 — KNOWLEDGE CREATE
// ============================================================

app.post(
    "/api/knowledge",
    requireAdmin,
    (req, res) => {
        const question =
            cleanText(
                req.body?.question ||
                ""
            ).slice(0, 1000);

        const answer =
            cleanText(
                req.body?.answer ||
                ""
            ).slice(0, 5000);

        if (!question || !answer) {
            return res.status(400).json({
                ok: false,
                error:
                    "QUESTION_AND_ANSWER_REQUIRED"
            });
        }

        const knowledge =
            readJSONSafe(
                DB_FILES.knowledge,
                []
            );

        const record = {
            id:
                crypto.randomUUID(),
            question,
            answer,
            source:
                "admin",
            createdAt:
                nowISO(),
            updatedAt:
                nowISO()
        };

        knowledge.push(
            record
        );

        writeJSONSafe(
            DB_FILES.knowledge,
            knowledge
        );

        res.status(201).json({
            ok: true,
            knowledge:
                record
        });
    }
);


// ============================================================
// 460 — CORRECTIONS API
// ============================================================

app.get(
    "/api/corrections",
    requireAdmin,
    (req, res) => {
        const corrections =
            readJSONSafe(
                DB_FILES.corrections,
                []
            );

        res.json({
            ok: true,
            corrections
        });
    }
);


// ============================================================
// 461 — CREATE CORRECTION
// ============================================================

app.post(
    "/api/corrections",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const wrong =
            cleanText(
                req.body?.wrong ||
                ""
            ).slice(0, 2000);

        const correct =
            cleanText(
                req.body?.correct ||
                ""
            ).slice(0, 5000);

        if (!wrong || !correct) {
            return res.status(400).json({
                ok: false,
                error:
                    "CORRECTION_REQUIRED"
            });
        }

        const corrections =
            readJSONSafe(
                DB_FILES.corrections,
                []
            );

        const record = {
            id:
                crypto.randomUUID(),
            userId,
            wrong,
            correct,
            createdAt:
                nowISO()
        };

        corrections.push(
            record
        );

        writeJSONSafe(
            DB_FILES.corrections,
            corrections
        );

        res.status(201).json({
            ok: true,
            correction:
                record
        });
    }
);


// ============================================================
// 462 — DATABASE STATUS
// ============================================================

app.get(
    "/api/database/status",
    requireAdmin,
    (req, res) => {
        const result = {};

        for (
            const [
                key,
                file
            ] of Object.entries(
                DB_FILES
            )
        ) {
            let exists = false;
            let size = 0;

            try {
                exists =
                    fs.existsSync(
                        file
                    );

                if (exists) {
                    size =
                        fs.statSync(
                            file
                        ).size;
                }
            } catch {
                exists = false;
            }

            result[key] = {
                exists,
                size,
                sizeText:
                    formatBytes(
                        size
                    )
            };
        }

        res.json({
            ok: true,
            database:
                result
        });
    }
);


// ============================================================
// 463 — STORAGE STATUS
// ============================================================

app.get(
    "/api/storage/status",
    requireAdmin,
    (req, res) => {
        function directorySize(
            directory
        ) {
            let total = 0;

            if (
                !fs.existsSync(
                    directory
                )
            ) {
                return 0;
            }

            const entries =
                fs.readdirSync(
                    directory,
                    {
                        withFileTypes:
                            true
                    }
                );

            for (
                const entry of entries
            ) {
                const full =
                    path.join(
                        directory,
                        entry.name
                    );

                if (
                    entry.isDirectory()
                ) {
                    total +=
                        directorySize(
                            full
                        );
                } else {
                    try {
                        total +=
                            fs.statSync(
                                full
                            ).size;
                    } catch {
                        // ignore
                    }
                }
            }

            return total;
        }

        const size =
            directorySize(
                STORAGE_DIR
            );

        res.json({
            ok: true,
            storage: {
                directory:
                    STORAGE_DIR,
                bytes:
                    size,
                sizeText:
                    formatBytes(
                        size
                    )
            }
        });
    }
);


// ============================================================
// 464 — PUBLIC CONFIG
// ============================================================

app.get(
    "/api/config",
    (req, res) => {
        res.json({
            ok: true,
            app: {
                name:
                    APP_NAME,
                version:
                    APP_VERSION
            },
            features: {
                chat: true,
                research:
                    Boolean(
                        process.env.TAVILY_API_KEY ||
                        process.env.BRAVE_SEARCH_API_KEY
                    ),
                weather: true,
                currency: true,
                uploads: true,
                memory: true,
                projects: true,
                notifications:
                    true,
                feedback: true,
                socket: true
            },
            limits: {
                maxUpload:
                    MAX_UPLOAD_SIZE,
                maxUploadText:
                    formatBytes(
                        MAX_UPLOAD_SIZE
                    )
            }
        });
    }
);


// ============================================================
// 465 — SERVICE CHECK
// ============================================================

app.get(
    "/api/services",
    async (req, res) => {
        const services = {
            server: {
                ok: true
            },
            weather: {
                ok: false
            },
            currency: {
                ok: false
            },
            research: {
                ok: false
            }
        };

        try {
            await getWeatherData(
                "Konya"
            );

            services.weather.ok =
                true;
        } catch {
            services.weather.ok =
                false;
        }

        try {
            await getCurrencyRates(
                "USD"
            );

            services.currency.ok =
                true;
        } catch {
            services.currency.ok =
                false;
        }

        services.research.ok =
            Boolean(
                process.env.TAVILY_API_KEY ||
                process.env.BRAVE_SEARCH_API_KEY
            );

        res.json({
            ok: true,
            services,
            checkedAt:
                nowISO()
        });
    }
);


// ============================================================
// 466 — REQUEST METRICS
// ============================================================

const REQUEST_METRICS = {
    total: 0,
    successful: 0,
    failed: 0,
    byMethod: {},
    byPath: {},
    startedAt: nowISO()
};

function registerMetric(
    req,
    statusCode
) {
    REQUEST_METRICS.total++;

    if (
        statusCode >= 200 &&
        statusCode < 400
    ) {
        REQUEST_METRICS.successful++;
    } else {
        REQUEST_METRICS.failed++;
    }

    const method =
        req.method || "UNKNOWN";

    const route =
        req.route?.path ||
        req.path ||
        "unknown";

    REQUEST_METRICS.byMethod[
        method
    ] =
        (
            REQUEST_METRICS.byMethod[
                method
            ] || 0
        ) + 1;

    REQUEST_METRICS.byPath[
        route
    ] =
        (
            REQUEST_METRICS.byPath[
                route
            ] || 0
        ) + 1;
}


// ============================================================
// 467 — METRICS ENDPOINT
// ============================================================

app.get(
    "/api/metrics",
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true,
            metrics:
                REQUEST_METRICS
        });
    }
);


// ============================================================
// 468 — EXPORT DATA
// ============================================================

app.get(
    "/api/admin/export",
    requireAdmin,
    (req, res) => {
        const exportData = {
            exportedAt:
                nowISO(),
            version:
                APP_VERSION,
            users:
                readJSONSafe(
                    DB_FILES.users,
                    []
                ),
            chats:
                readJSONSafe(
                    DB_FILES.chats,
                    []
                ),
            messages:
                readJSONSafe(
                    DB_FILES.messages,
                    []
                ),
            memories:
                readJSONSafe(
                    DB_FILES.memories,
                    []
                ),
            knowledge:
                readJSONSafe(
                    DB_FILES.knowledge,
                    []
                ),
            feedback:
                readJSONSafe(
                    DB_FILES.feedback,
                    []
                ),
            projects:
                getProjects()
        };

        res.json({
            ok: true,
            export:
                exportData
        });
    }
);


// ============================================================
// 469 — BACKUP DATABASE
// ============================================================

app.post(
    "/api/admin/backup",
    requireAdmin,
    (req, res) => {
        const backupDirectory =
            path.join(
                DATA_DIR,
                "backups"
            );

        fs.mkdirSync(
            backupDirectory,
            {
                recursive: true
            }
        );

        const backupId =
            new Date()
                .toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );

        const target =
            path.join(
                backupDirectory,
                `backup-${backupId}.json`
            );

        const payload = {
            createdAt:
                nowISO(),
            files: {}
        };

        for (
            const [
                key,
                file
            ] of Object.entries(
                DB_FILES
            )
        ) {
            payload.files[key] =
                readJSONSafe(
                    file,
                    []
                );
        }

        payload.files.projects =
            getProjects();

        payload.files.notifications =
            getNotifications();

        fs.writeFileSync(
            target,
            JSON.stringify(
                payload,
                null,
                2
            ),
            "utf8"
        );

        res.json({
            ok: true,
            backup: {
                id:
                    backupId,
                path:
                    target,
                size:
                    fs.statSync(
                        target
                    ).size
            }
        });
    }
);


// ============================================================
// 470 — BACKUP LIST
// ============================================================

app.get(
    "/api/admin/backups",
    requireAdmin,
    (req, res) => {
        const directory =
            path.join(
                DATA_DIR,
                "backups"
            );

        if (
            !fs.existsSync(
                directory
            )
        ) {
            return res.json({
                ok: true,
                backups: []
            });
        }

        const backups =
            fs.readdirSync(
                directory
            )
                .filter(
                    name =>
                        name.endsWith(
                            ".json"
                        )
                )
                .map(
                    name => {
                        const full =
                            path.join(
                                directory,
                                name
                            );

                        let size = 0;

                        try {
                            size =
                                fs.statSync(
                                    full
                                ).size;
                        } catch {
                            size = 0;
                        }

                        return {
                            name,
                            size,
                            sizeText:
                                formatBytes(
                                    size
                                )
                        };
                    }
                );

        res.json({
            ok: true,
            backups
        });
    }
);


// ============================================================
// 471 — LOGGING MIDDLEWARE
// ============================================================

app.use(
    (req, res, next) => {
        const start =
            Date.now();

        res.on(
            "finish",
            () => {
                const duration =
                    Date.now() -
                    start;

                registerMetric(
                    req,
                    res.statusCode
                );

                if (
                    res.statusCode >= 400
                ) {
                    recordSecurityEvent(
                        "http_error",
                        {
                            ip:
                                req.ip,
                            userId:
                                req.user?.id ||
                                null,
                            path:
                                req.path,
                            method:
                                req.method,
                            message:
                                `${res.statusCode} ${duration}ms`
                        }
                    );
                }
            }
        );

        next();
    }
);


// ============================================================
// 472 — SOCKET.IO AUTH / EVENTS
// ============================================================

io.on(
    "connection",
    socket => {
        socket.emit(
            "turkai:connected",
            {
                ok: true,
                id:
                    socket.id,
                serverTime:
                    nowISO(),
                version:
                    APP_VERSION
            }
        );

        socket.on(
            "turkai:ping",
            payload => {
                socket.emit(
                    "turkai:pong",
                    {
                        ok: true,
                        received:
                            payload || null,
                        serverTime:
                            nowISO()
                    }
                );
            }
        );

        socket.on(
            "chat:typing",
            payload => {
                socket.broadcast.emit(
                    "chat:typing",
                    {
                        userId:
                            payload?.userId ||
                            null,
                        typing:
                            Boolean(
                                payload?.typing
                            )
                    }
                );
            }
        );

        socket.on(
            "chat:message",
            payload => {
                if (!payload) {
                    return;
                }

                socket.broadcast.emit(
                    "chat:new",
                    {
                        message:
                            payload.message ||
                            "",
                        chatId:
                            payload.chatId ||
                            null,
                        createdAt:
                            nowISO()
                    }
                );
            }
        );

        socket.on(
            "disconnect",
            reason => {
                logWarn(
                    "SOCKET_DISCONNECTED",
                    {
                        id:
                            socket.id,
                        reason
                    }
                );
            }
        );
    }
);


// ============================================================
// 473 — SOCKET HEALTH
// ============================================================

app.get(
    "/api/socket/status",
    (req, res) => {
        res.json({
            ok: true,
            socket: {
                connectedClients:
                    io.engine?.clientsCount ||
                    0,
                transport:
                    "socket.io"
            }
        });
    }
);


// ============================================================
// 474 — STATIC PUBLIC FILES
// ============================================================

if (
    fs.existsSync(
        PUBLIC_DIR
    )
) {
    app.use(
        express.static(
            PUBLIC_DIR,
            {
                extensions: [
                    "html"
                ],
                index:
                    "index.html"
            }
        )
    );
}


// ============================================================
// 475 — ROOT ROUTE
// ============================================================

app.get(
    "/",
    (req, res) => {
        const indexFile =
            path.join(
                PUBLIC_DIR,
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

        res.type(
            "html"
        ).send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport"
                    content="width=device-width,initial-scale=1">
                <title>${APP_NAME}</title>
            </head>
            <body>
                <h1>${APP_NAME}</h1>
                <p>API aktif.</p>
                <p>Sunucu sürümü: ${APP_VERSION}</p>
            </body>
            </html>
        `);
    }
);


// ============================================================
// 476 — API 404 HANDLER
// ============================================================

app.use(
    "/api",
    (req, res) => {
        res.status(404).json({
            ok: false,
            error:
                "API_ENDPOINT_NOT_FOUND",
            message:
                "İstenen API endpoint bulunamadı.",
            path:
                req.originalUrl,
            method:
                req.method,
            requestId:
                req.requestId ||
                null
        });
    }
);


// ============================================================
// 477 — GLOBAL ERROR HANDLER
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        logError(
            "GLOBAL_SERVER_ERROR",
            error
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
                error.status ||
                error.statusCode
            ) || 500;

        res.status(
            status
        ).json({
            ok: false,
            error:
                IS_PRODUCTION
                    ? "INTERNAL_SERVER_ERROR"
                    : (
                        error.message ||
                        "INTERNAL_SERVER_ERROR"
                    ),
            requestId:
                req.requestId ||
                null
        });
    }
);


// ============================================================
// 478 — PROCESS ERROR HANDLERS
// ============================================================

process.on(
    "uncaughtException",
    error => {
        logError(
            "UNCAUGHT_EXCEPTION",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    reason => {
        logError(
            "UNHANDLED_REJECTION",
            reason
        );
    }
);


// ============================================================
// 479 — GRACEFUL SHUTDOWN
// ============================================================

let shuttingDown =
    false;

async function shutdown(
    signal
) {
    if (shuttingDown) {
        return;
    }

    shuttingDown =
        true;

    logWarn(
        "SERVER_SHUTDOWN",
        signal
    );

    try {
        await new Promise(
            resolve => {
                httpServer.close(
                    () => resolve()
                );
            }
        );
    } catch (error) {
        logError(
            "HTTP_CLOSE_ERROR",
            error
        );
    }

    process.exit(0);
}

process.on(
    "SIGTERM",
    () => {
        shutdown(
            "SIGTERM"
        );
    }
);

process.on(
    "SIGINT",
    () => {
        shutdown(
            "SIGINT"
        );
    }
);


// ============================================================
// 480 — STARTUP CHECK
// ============================================================

function startupCheck() {
    const checks = {
        data:
            fs.existsSync(
                DATA_DIR
            ),
        database:
            fs.existsSync(
                DB_DIR
            ),
        storage:
            fs.existsSync(
                STORAGE_DIR
            ),
        uploads:
            fs.existsSync(
                UPLOADS_DIR
            ),
        public:
            fs.existsSync(
                PUBLIC_DIR
            )
    };

    logWarn(
        "STARTUP_CHECK",
        checks
    );

    return checks;
}

startupCheck();


// ============================================================
// 481 — DATABASE INITIALIZATION
// ============================================================

function initializeDatabase() {
    const defaults = {
        [DB_FILES.users]:
            [],
        [DB_FILES.sessions]:
            [],
        [DB_FILES.chats]:
            [],
        [DB_FILES.messages]:
            [],
        [DB_FILES.memories]:
            [],
        [DB_FILES.knowledge]:
            [],
        [DB_FILES.feedback]:
            [],
        [DB_FILES.corrections]:
            [],
        [DB_FILES.usage]:
            {},
        [DB_FILES.audit]:
            [],
        [DB_FILES.security]:
            [],
        [DB_FILES.settings]:
            {},
        [DB_FILES.files]:
            []
    };

    for (
        const [
            file,
            defaultValue
        ] of Object.entries(
            defaults
        )
    ) {
        if (
            !fs.existsSync(
                file
            )
        ) {
            writeJSONSafe(
                file,
                defaultValue
            );
        }
    }

    if (
        !fs.existsSync(
            PROJECTS_DB_FILE
        )
    ) {
        saveProjects([]);
    }

    if (
        !fs.existsSync(
            NOTIFICATIONS_DB_FILE
        )
    ) {
        saveNotifications([]);
    }
}

initializeDatabase();


// ============================================================
// 482 — STARTUP MESSAGE
// ============================================================

function printStartupBanner() {
    const lines = [
        "",
        "============================================================",
        "                     TÜRKAI SERVER",
        "============================================================",
        ` Uygulama      : ${APP_NAME}`,
        ` Sürüm         : ${APP_VERSION}`,
        ` Node          : ${process.version}`,
        ` Ortam         : ${NODE_ENV}`,
        ` Host          : ${HOST}`,
        ` Port          : ${PORT}`,
        ` AI Groq       : ${AI_STATUS.groq.configured ? "HAZIR" : "YOK"}`,
        ` AI Cerebras   : ${AI_STATUS.cerebras.configured ? "HAZIR" : "YOK"}`,
        ` AI OpenRouter : ${AI_STATUS.openrouter.configured ? "HAZIR" : "YOK"}`,
        ` AI Gemini     : ${AI_STATUS.gemini.configured ? "HAZIR" : "YOK"}`,
        ` Research      : ${
            process.env.TAVILY_API_KEY ||
            process.env.BRAVE_SEARCH_API_KEY
                ? "HAZIR"
                : "LOCAL / KEY YOK"
        }`,
        "============================================================",
        ""
    ];

    console.log(
        lines.join("\n")
    );
}


// ============================================================
// 483 — SERVER START
// ============================================================

httpServer.listen(
    PORT,
    HOST,
    () => {
        printStartupBanner();

        logWarn(
            "SERVER_STARTED",
            {
                url:
                    `http://${HOST}:${PORT}`,
                port:
                    PORT,
                version:
                    APP_VERSION
            }
        );
    }
);


// ============================================================
// 484 — FINAL INTERNAL CHECK
// ============================================================

function finalInternalCheck() {
    const required = [
        "APP_NAME",
        "APP_VERSION",
        "PORT",
        "HOST",
        "DATA_DIR",
        "DB_DIR",
        "STORAGE_DIR"
    ];

    const result = {};

    for (
        const name of required
    ) {
        result[name] =
            typeof globalThis[
                name
            ] !== "undefined";
    }

    return result;
}

finalInternalCheck();


// ============================================================
// 485 — SERVER READY
// ============================================================

console.log(
    `[${APP_NAME}] API sistemi yükleniyor...`
);

console.log(
    `[${APP_NAME}] /api/health hazır.`
);

console.log(
    `[${APP_NAME}] /api/chat hazır.`
);

console.log(
    `[${APP_NAME}] /api/upload hazır.`
);

console.log(
    `[${APP_NAME}] /api/research hazır.`
);

console.log(
    `[${APP_NAME}] /api/weather hazır.`
);

console.log(
    `[${APP_NAME}] /api/currency hazır.`
);

console.log(
    `[${APP_NAME}] /api/projects hazır.`
);

console.log(
    `[${APP_NAME}] Socket.IO hazır.`
);


// ============================================================
// PARÇA 4 SONU
// ============================================================
//
// Sonraki PARÇA 5 / 5:
//
// - Pro / Plus / Ultra sistemleri
// - Iyzico entegrasyon hazırlığı
// - Kullanıcı planları
// - Günlük kullanım limitleri
// - Admin araçları
// - Gelişmiş auth/session
// - Audit sistemi
// - Daha gelişmiş AI router
// - Otomatik knowledge öğrenme
// - AI model seçimi
// - Chat export
// - JSON/Markdown export
// - Sistem bakım araçları
// - Cache
// - gelişmiş rate-limit
// - final middleware
// - final server kapanışı
//
// ============================================================
// ============================================================
// TÜRKAI 11.0.0
// SERVER.JS — PARÇA 5 / 5
// ============================================================
// FINAL ENGINE
// ============================================================


// ============================================================
// 500 — PLAN SİSTEMİ
// ============================================================

const PLAN_CONFIG = {
    free: {
        id: "free",
        name: "Free",
        dailyMessages: 50,
        dailyResearch: 5,
        dailyImages: 0,
        dailyVideos: 0,
        maxChats: 20,
        maxFiles: 20,
        maxFileSize:
            10 * 1024 * 1024,
        models: [
            "fast"
        ],
        features: [
            "chat",
            "memory",
            "weather",
            "currency"
        ],
        priceMonthly: 0
    },

    pro: {
        id: "pro",
        name: "Pro",
        dailyMessages: 100,
        dailyResearch: 20,
        dailyImages: 2,
        dailyVideos: 0,
        maxChats: 100,
        maxFiles: 100,
        maxFileSize:
            20 * 1024 * 1024,
        models: [
            "fast",
            "balanced",
            "smart"
        ],
        features: [
            "chat",
            "memory",
            "research",
            "weather",
            "currency",
            "projects",
            "image"
        ],
        priceMonthly: 250
    },

    plus: {
        id: "plus",
        name: "Plus",
        dailyMessages: 200,
        dailyResearch: 50,
        dailyImages: 4,
        dailyVideos: 5,
        maxChats: 300,
        maxFiles: 300,
        maxFileSize:
            30 * 1024 * 1024,
        models: [
            "fast",
            "balanced",
            "smart",
            "reasoning"
        ],
        features: [
            "chat",
            "memory",
            "research",
            "weather",
            "currency",
            "projects",
            "image",
            "video"
        ],
        priceMonthly: 500
    },

    ultra: {
        id: "ultra",
        name: "Ultra",
        dailyMessages: 1000,
        dailyResearch: 200,
        dailyImages: 10,
        dailyVideos: 20,
        maxChats: 1000,
        maxFiles: 1000,
        maxFileSize:
            50 * 1024 * 1024,
        models: [
            "fast",
            "balanced",
            "smart",
            "reasoning",
            "ultra"
        ],
        features: [
            "chat",
            "memory",
            "research",
            "weather",
            "currency",
            "projects",
            "image",
            "video",
            "advanced",
            "priority"
        ],
        priceMonthly: 1000
    },

    developer: {
        id: "developer",
        name: "Developer",
        dailyMessages: 400,
        dailyResearch: 500,
        dailyImages: 20,
        dailyVideos: 50,
        maxChats: 5000,
        maxFiles: 5000,
        maxFileSize:
            100 * 1024 * 1024,
        models: [
            "fast",
            "balanced",
            "smart",
            "reasoning",
            "ultra"
        ],
        features: [
            "all"
        ],
        priceMonthly: 0
    }
};


// ============================================================
// 501 — PLAN DATABASE
// ============================================================

const USER_PLANS_FILE =
    path.join(
        DB_DIR,
        "user_plans.json"
    );

function getUserPlans() {
    return readJSONSafe(
        USER_PLANS_FILE,
        {}
    );
}

function saveUserPlans(plans) {
    writeJSONSafe(
        USER_PLANS_FILE,
        plans || {}
    );
}


// ============================================================
// 502 — USER PLAN
// ============================================================

function getUserPlan(userId) {
    const plans =
        getUserPlans();

    const plan =
        plans[userId];

    if (
        plan &&
        PLAN_CONFIG[plan.plan]
    ) {
        return plan;
    }

    return {
        userId,
        plan: "free",
        active: true,
        createdAt:
            nowISO(),
        updatedAt:
            nowISO()
    };
}


// ============================================================
// 503 — SET USER PLAN
// ============================================================

function setUserPlan(
    userId,
    plan,
    extra = {}
) {
    if (
        !PLAN_CONFIG[plan]
    ) {
        throw new Error(
            "INVALID_PLAN"
        );
    }

    const plans =
        getUserPlans();

    plans[userId] = {
        userId,
        plan,
        active:
            extra.active !== false,
        expiresAt:
            extra.expiresAt ||
            null,
        paymentId:
            extra.paymentId ||
            null,
        source:
            extra.source ||
            "system",
        createdAt:
            plans[userId]?.createdAt ||
            nowISO(),
        updatedAt:
            nowISO()
    };

    saveUserPlans(
        plans
    );

    return plans[userId];
}


// ============================================================
// 504 — PLAN LIST
// ============================================================

app.get(
    "/api/plans",
    (req, res) => {
        res.json({
            ok: true,
            plans:
                Object.values(
                    PLAN_CONFIG
                )
        });
    }
);


// ============================================================
// 505 — MY PLAN
// ============================================================

app.get(
    "/api/me/plan",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const plan =
            getUserPlan(
                userId
            );

        const config =
            PLAN_CONFIG[
                plan.plan
            ] ||
            PLAN_CONFIG.free;

        res.json({
            ok: true,
            subscription:
                plan,
            config
        });
    }
);


// ============================================================
// 506 — ADMIN PLAN UPDATE
// ============================================================

app.post(
    "/api/admin/plan",
    requireAdmin,
    (req, res) => {
        const userId =
            cleanText(
                req.body?.userId ||
                ""
            );

        const plan =
            cleanText(
                req.body?.plan ||
                ""
            ).toLowerCase();

        if (!userId) {
            return res.status(400).json({
                ok: false,
                error:
                    "USER_ID_REQUIRED"
            });
        }

        if (
            !PLAN_CONFIG[plan]
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "INVALID_PLAN"
            });
        }

        try {
            const subscription =
                setUserPlan(
                    userId,
                    plan,
                    {
                        source:
                            "admin"
                    }
                );

            res.json({
                ok: true,
                subscription
            });
        } catch (error) {
            res.status(400).json({
                ok: false,
                error:
                    error.message
            });
        }
    }
);


// ============================================================
// 507 — USAGE ENGINE
// ============================================================

function getUsageDate() {
    return new Date()
        .toISOString()
        .slice(0, 10);
}

function getUsageDatabase() {
    return readJSONSafe(
        DB_FILES.usage,
        {}
    );
}

function saveUsageDatabase(
    usage
) {
    writeJSONSafe(
        DB_FILES.usage,
        usage || {}
    );
}

function getUserDailyUsage(
    userId
) {
    const usage =
        getUsageDatabase();

    const date =
        getUsageDate();

    if (
        !usage[userId] ||
        usage[userId].date !== date
    ) {
        return {
            date,
            messages: 0,
            research: 0,
            images: 0,
            videos: 0,
            files: 0
        };
    }

    return {
        date,
        messages:
            Number(
                usage[userId].messages
            ) || 0,
        research:
            Number(
                usage[userId].research
            ) || 0,
        images:
            Number(
                usage[userId].images
            ) || 0,
        videos:
            Number(
                usage[userId].videos
            ) || 0,
        files:
            Number(
                usage[userId].files
            ) || 0
    };
}


// ============================================================
// 508 — USAGE SAVE
// ============================================================

function saveUserDailyUsage(
    userId,
    data
) {
    const usage =
        getUsageDatabase();

    usage[userId] = {
        date:
            getUsageDate(),
        messages:
            Number(
                data.messages
            ) || 0,
        research:
            Number(
                data.research
            ) || 0,
        images:
            Number(
                data.images
            ) || 0,
        videos:
            Number(
                data.videos
            ) || 0,
        files:
            Number(
                data.files
            ) || 0,
        updatedAt:
            nowISO()
    };

    saveUsageDatabase(
        usage
    );

    return usage[userId];
}


// ============================================================
// 509 — CHECK LIMIT
// ============================================================

function checkUsageLimit(
    userId,
    type
) {
    const subscription =
        getUserPlan(
            userId
        );

    const plan =
        PLAN_CONFIG[
            subscription.plan
        ] ||
        PLAN_CONFIG.free;

    const usage =
        getUserDailyUsage(
            userId
        );

    const field =
        type === "message"
            ? "messages"
            : type === "research"
                ? "research"
                : type === "image"
                    ? "images"
                    : type === "video"
                        ? "videos"
                        : type === "file"
                            ? "files"
                            : null;

    if (!field) {
        return {
            allowed: true,
            usage,
            limit: null
        };
    }

    const limit =
        type === "message"
            ? plan.dailyMessages
            : type === "research"
                ? plan.dailyResearch
                : type === "image"
                    ? plan.dailyImages
                    : type === "video"
                        ? plan.dailyVideos
                        : plan.maxFiles;

    return {
        allowed:
            usage[field] < limit,
        usage,
        limit,
        remaining:
            Math.max(
                0,
                limit -
                    usage[field]
            ),
        plan:
            subscription.plan
    };
}


// ============================================================
// 510 — INCREMENT DAILY USAGE
// ============================================================

function incrementDailyUsage(
    userId,
    type
) {
    const usage =
        getUserDailyUsage(
            userId
        );

    if (
        type === "message"
    ) {
        usage.messages++;
    }

    if (
        type === "research"
    ) {
        usage.research++;
    }

    if (
        type === "image"
    ) {
        usage.images++;
    }

    if (
        type === "video"
    ) {
        usage.videos++;
    }

    if (
        type === "file"
    ) {
        usage.files++;
    }

    return saveUserDailyUsage(
        userId,
        usage
    );
}


// ============================================================
// 511 — USAGE API
// ============================================================

app.get(
    "/api/limits",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const subscription =
            getUserPlan(
                userId
            );

        const config =
            PLAN_CONFIG[
                subscription.plan
            ] ||
            PLAN_CONFIG.free;

        const usage =
            getUserDailyUsage(
                userId
            );

        res.json({
            ok: true,
            plan:
                subscription.plan,
            usage,
            limits: {
                messages:
                    config.dailyMessages,
                research:
                    config.dailyResearch,
                images:
                    config.dailyImages,
                videos:
                    config.dailyVideos,
                files:
                    config.maxFiles
            }
        });
    }
);


// ============================================================
// 512 — PRO CODE
// ============================================================

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";

app.post(
    "/api/pro/activate",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const code =
            String(
                req.body?.code ||
                req.body?.proCode ||
                ""
            ).trim();

        if (!code) {
            return res.status(400).json({
                ok: false,
                error:
                    "PRO_CODE_REQUIRED"
            });
        }

        if (
            !TURKAI_PRO_CODE ||
            code !==
                TURKAI_PRO_CODE
        ) {
            return res.status(403).json({
                ok: false,
                error:
                    "INVALID_PRO_CODE"
            });
        }

        const subscription =
            setUserPlan(
                userId,
                "pro",
                {
                    source:
                        "pro_code"
                }
            );

        res.json({
            ok: true,
            message:
                "Pro plan aktif edildi.",
            subscription
        });
    }
);


// ============================================================
// 513 — PAYMENT TEST
// ============================================================

app.post(
    "/api/test-payment",
    requireAdmin,
    (req, res) => {
        const userId =
            cleanText(
                req.body?.userId ||
                ""
            );

        const plan =
            cleanText(
                req.body?.plan ||
                "pro"
            ).toLowerCase();

        if (!userId) {
            return res.status(400).json({
                ok: false,
                error:
                    "USER_ID_REQUIRED"
            });
        }

        if (
            !PLAN_CONFIG[plan]
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "INVALID_PLAN"
            });
        }

        const paymentId =
            `TEST-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

        const subscription =
            setUserPlan(
                userId,
                plan,
                {
                    source:
                        "test_payment",
                    paymentId
                }
            );

        res.json({
            ok: true,
            payment: {
                id:
                    paymentId,
                status:
                    "success",
                test:
                    true
            },
            subscription
        });
    }
);


// ============================================================
// 514 — IYZICO STATUS
// ============================================================

app.get(
    "/api/payment/status",
    (req, res) => {
        res.json({
            ok: true,
            provider:
                "iyzico",
            configured:
                Boolean(
                    process.env.IYZICO_API_KEY &&
                    process.env.IYZICO_SECRET_KEY
                ),
            mode:
                process.env.IYZICO_MODE ||
                "sandbox",
            message:
                "Gerçek ödeme için Iyzico hesap ve API bilgileri gerekir."
        });
    }
);


// ============================================================
// 515 — PAYMENT CALLBACK
// ============================================================

app.post(
    "/api/payment/callback",
    (req, res) => {
        const payment =
            req.body || {};

        const userId =
            cleanText(
                payment.userId ||
                ""
            );

        const plan =
            cleanText(
                payment.plan ||
                "pro"
            ).toLowerCase();

        if (
            !userId ||
            !PLAN_CONFIG[plan]
        ) {
            return res.status(400).json({
                ok: false,
                error:
                    "INVALID_PAYMENT_CALLBACK"
            });
        }

        const paymentId =
            cleanText(
                payment.paymentId ||
                payment.id ||
                ""
            );

        const subscription =
            setUserPlan(
                userId,
                plan,
                {
                    source:
                        "payment_callback",
                    paymentId
                }
            );

        res.json({
            ok: true,
            subscription
        });
    }
);


// ============================================================
// 516 — MODEL ROUTER
// ============================================================

const MODEL_ROUTER = {
    fast: {
        name:
            "TürkAI Fast",
        providerOrder: [
            "groq",
            "cerebras",
            "openrouter",
            "gemini"
        ]
    },

    balanced: {
        name:
            "TürkAI Balanced",
        providerOrder: [
            "cerebras",
            "groq",
            "openrouter",
            "gemini"
        ]
    },

    smart: {
        name:
            "TürkAI Smart",
        providerOrder: [
            "openrouter",
            "groq",
            "cerebras",
            "gemini"
        ]
    },

    reasoning: {
        name:
            "TürkAI Reasoning",
        providerOrder: [
            "cerebras",
            "openrouter",
            "groq",
            "gemini"
        ]
    },

    ultra: {
        name:
            "TürkAI Ultra",
        providerOrder: [
            "cerebras",
            "openrouter",
            "gemini",
            "groq"
        ]
    }
};


// ============================================================
// 517 — MODEL ACCESS
// ============================================================

function canUseModel(
    userId,
    model
) {
    const subscription =
        getUserPlan(
            userId
        );

    const config =
        PLAN_CONFIG[
            subscription.plan
        ] ||
        PLAN_CONFIG.free;

    return config.models.includes(
        model
    );
}


// ============================================================
// 518 — MODEL ENDPOINT
// ============================================================

app.get(
    "/api/models",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const subscription =
            getUserPlan(
                userId
            );

        const config =
            PLAN_CONFIG[
                subscription.plan
            ] ||
            PLAN_CONFIG.free;

        const models =
            Object.entries(
                MODEL_ROUTER
            ).map(
                ([id, item]) => ({
                    id,
                    name:
                        item.name,
                    available:
                        config.models.includes(
                            id
                        )
                })
            );

        res.json({
            ok: true,
            plan:
                subscription.plan,
            models
        });
    }
);


// ============================================================
// 519 — AI REQUEST PREPARATION
// ============================================================

function selectAIModel(
    requestedModel,
    userId
) {
    let model =
        cleanText(
            requestedModel ||
            "fast"
        ).toLowerCase();

    if (
        !MODEL_ROUTER[model]
    ) {
        model = "fast";
    }

    if (
        !canUseModel(
            userId,
            model
        )
    ) {
        model = "fast";
    }

    return model;
}


// ============================================================
// 520 — ADVANCED AI ANSWER
// ============================================================

async function generateAdvancedAIAnswer(
    params
) {
    const userId =
        params.userId ||
        "guest";

    const message =
        cleanText(
            params.message ||
            ""
        );

    const model =
        selectAIModel(
            params.model,
            userId
        );

    const config =
        MODEL_ROUTER[
            model
        ] ||
        MODEL_ROUTER.fast;

    const originalStatus = {
        groq:
            AI_STATUS.groq,
        cerebras:
            AI_STATUS.cerebras,
        openrouter:
            AI_STATUS.openrouter,
        gemini:
            AI_STATUS.gemini
    };

    const result =
        await callAIProviders(
            params.messages ||
            [
                {
                    role:
                        "user",
                    content:
                        message
                }
            ]
        );

    return {
        ...result,
        model,
        modelName:
            config.name,
        providers:
            config.providerOrder,
        status:
            originalStatus
    };
}


// ============================================================
// 521 — CHAT ADVANCED ROUTE
// ============================================================

app.post(
    "/api/chat/advanced",
    async (req, res) => {
        const requestId =
            req.requestId ||
            crypto.randomUUID();

        const userId =
            req.user?.id || "guest";

        const message =
            cleanText(
                req.body?.message ||
                ""
            ).slice(0, 12000);

        if (!message) {
            return res.status(400).json({
                ok: false,
                error:
                    "MESSAGE_REQUIRED",
                requestId
            });
        }

        const limit =
            checkUsageLimit(
                userId,
                "message"
            );

        if (!limit.allowed) {
            return res.status(429).json({
                ok: false,
                error:
                    "DAILY_LIMIT_REACHED",
                message:
                    "Günlük mesaj limitine ulaştınız.",
                usage:
                    limit.usage,
                limit:
                    limit.limit,
                plan:
                    limit.plan,
                requestId
            });
        }

        try {
            const answer =
                await generateAdvancedAIAnswer({
                    userId,
                    message,
                    model:
                        req.body?.model,
                    messages:
                        Array.isArray(
                            req.body?.messages
                        )
                            ? req.body.messages
                            : [
                                {
                                    role:
                                        "user",
                                    content:
                                        message
                                }
                            ]
                });

            incrementDailyUsage(
                userId,
                "message"
            );

            res.json({
                ok: true,
                ...answer,
                requestId
            });
        } catch (error) {
            logError(
                "ADVANCED_CHAT_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error:
                    "ADVANCED_CHAT_FAILED",
                requestId
            });
        }
    }
);


// ============================================================
// 522 — RESEARCH LIMIT WRAPPER
// ============================================================

app.post(
    "/api/research/limited",
    async (req, res) => {
        const userId =
            req.user?.id || "guest";

        const limit =
            checkUsageLimit(
                userId,
                "research"
            );

        if (!limit.allowed) {
            return res.status(429).json({
                ok: false,
                error:
                    "RESEARCH_LIMIT_REACHED",
                usage:
                    limit.usage,
                limit:
                    limit.limit,
                plan:
                    limit.plan
            });
        }

        const query =
            cleanText(
                req.body?.query ||
                ""
            );

        if (!query) {
            return res.status(400).json({
                ok: false,
                error:
                    "QUERY_REQUIRED"
            });
        }

        try {
            const result =
                await performResearch(
                    query
                );

            if (result.ok) {
                incrementDailyUsage(
                    userId,
                    "research"
                );
            }

            res.json(
                result
            );
        } catch (error) {
            logError(
                "LIMITED_RESEARCH_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error:
                    "RESEARCH_FAILED"
            });
        }
    }
);


// ============================================================
// 523 — IMAGE USAGE
// ============================================================

app.post(
    "/api/image/usage",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const limit =
            checkUsageLimit(
                userId,
                "image"
            );

        if (!limit.allowed) {
            return res.status(429).json({
                ok: false,
                error:
                    "IMAGE_LIMIT_REACHED",
                usage:
                    limit.usage,
                limit:
                    limit.limit,
                plan:
                    limit.plan
            });
        }

        incrementDailyUsage(
            userId,
            "image"
        );

        res.json({
            ok: true,
            usage:
                getUserDailyUsage(
                    userId
                )
        });
    }
);


// ============================================================
// 524 — VIDEO USAGE
// ============================================================

app.post(
    "/api/video/usage",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const limit =
            checkUsageLimit(
                userId,
                "video"
            );

        if (!limit.allowed) {
            return res.status(429).json({
                ok: false,
                error:
                    "VIDEO_LIMIT_REACHED",
                usage:
                    limit.usage,
                limit:
                    limit.limit,
                plan:
                    limit.plan
            });
        }

        incrementDailyUsage(
            userId,
            "video"
        );

        res.json({
            ok: true,
            usage:
                getUserDailyUsage(
                    userId
                )
        });
    }
);


// ============================================================
// 525 — CHAT EXPORT
// ============================================================

app.get(
    "/api/chats/:id/export",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const chat =
            readJSONSafe(
                DB_FILES.chats,
                []
            ).find(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId === userId
            );

        if (!chat) {
            return res.status(404).json({
                ok: false,
                error:
                    "CHAT_NOT_FOUND"
            });
        }

        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            )
                .filter(
                    item =>
                        item.chatId ===
                        chat.id
                )
                .sort(
                    (a, b) =>
                        String(
                            a.createdAt ||
                            ""
                        ).localeCompare(
                            String(
                                b.createdAt ||
                                ""
                            )
                        )
                );

        const lines = [
            `# ${chat.title || "TürkAI Sohbeti"}`,
            "",
            `Oluşturulma: ${chat.createdAt || ""}`,
            "",
            "---",
            ""
        ];

        for (
            const message of messages
        ) {
            const role =
                message.role ===
                "user"
                    ? "Sen"
                    : "TürkAI";

            lines.push(
                `## ${role}`,
                "",
                String(
                    message.content ||
                    message.text ||
                    ""
                ),
                "",
                "---",
                ""
            );
        }

        res.type(
            "text/markdown"
        ).send(
            lines.join("\n")
        );
    }
);


// ============================================================
// 526 — CHAT EXPORT JSON
// ============================================================

app.get(
    "/api/chats/:id/export.json",
    (req, res) => {
        const userId =
            req.user?.id || "guest";

        const chat =
            readJSONSafe(
                DB_FILES.chats,
                []
            ).find(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId === userId
            );

        if (!chat) {
            return res.status(404).json({
                ok: false,
                error:
                    "CHAT_NOT_FOUND"
            });
        }

        const messages =
            readJSONSafe(
                DB_FILES.messages,
                []
            )
                .filter(
                    item =>
                        item.chatId ===
                        chat.id
                );

        res.json({
            ok: true,
            export: {
                chat,
                messages,
                exportedAt:
                    nowISO()
            }
        });
    }
);


// ============================================================
// 527 — KNOWLEDGE AUTO SAVE
// ============================================================

function autoSaveKnowledge(
    question,
    answer,
    source = "ai"
) {
    const cleanQuestion =
        cleanText(
            question || ""
        ).slice(0, 1000);

    const cleanAnswer =
        cleanText(
            answer || ""
        ).slice(0, 5000);

    if (
        !cleanQuestion ||
        !cleanAnswer
    ) {
        return null;
    }

    const knowledge =
        readJSONSafe(
            DB_FILES.knowledge,
            []
        );

    const normalized =
        cleanQuestion
            .toLowerCase();

    const existing =
        knowledge.find(
            item =>
                cleanText(
                    item.question ||
                    ""
                )
                    .toLowerCase() ===
                normalized
        );

    if (existing) {
        existing.answer =
            cleanAnswer;

        existing.updatedAt =
            nowISO();

        existing.source =
            source;

        writeJSONSafe(
            DB_FILES.knowledge,
            knowledge
        );

        return existing;
    }

    const record = {
        id:
            crypto.randomUUID(),
        question:
            cleanQuestion,
        answer:
            cleanAnswer,
        source,
        createdAt:
            nowISO(),
        updatedAt:
            nowISO(),
        uses:
            0
    };

    knowledge.push(
        record
    );

    if (
        knowledge.length >
        10000
    ) {
        knowledge.splice(
            0,
            knowledge.length -
                10000
        );
    }

    writeJSONSafe(
        DB_FILES.knowledge,
        knowledge
    );

    return record;
}


// ============================================================
// 528 — KNOWLEDGE AUTO API
// ============================================================

app.post(
    "/api/knowledge/learn",
    requireAdmin,
    (req, res) => {
        const question =
            req.body?.question;

        const answer =
            req.body?.answer;

        const record =
            autoSaveKnowledge(
                question,
                answer,
                "admin"
            );

        if (!record) {
            return res.status(400).json({
                ok: false,
                error:
                    "INVALID_KNOWLEDGE"
            });
        }

        res.json({
            ok: true,
            record
        });
    }
);


// ============================================================
// 529 — AUDIT ENGINE
// ============================================================

function getAuditLogs() {
    return readJSONSafe(
        DB_FILES.audit,
        []
    );
}

function saveAuditLogs(
    logs
) {
    writeJSONSafe(
        DB_FILES.audit,
        logs || []
    );
}

function createAuditLog(
    req,
    action,
    details = {}
) {
    const logs =
        getAuditLogs();

    logs.push({
        id:
            crypto.randomUUID(),
        action,
        userId:
            req.user?.id ||
            "guest",
        ip:
            req.ip ||
            null,
        path:
            req.originalUrl ||
            req.path ||
            null,
        method:
            req.method ||
            null,
        details,
        createdAt:
            nowISO()
    });

    if (
        logs.length >
        20000
    ) {
        logs.splice(
            0,
            logs.length -
                20000
        );
    }

    saveAuditLogs(
        logs
    );
}


// ============================================================
// 530 — AUDIT ENDPOINT
// ============================================================

app.get(
    "/api/admin/audit",
    requireAdmin,
    (req, res) => {
        const logs =
            getAuditLogs();

        res.json({
            ok: true,
            logs:
                logs.slice(-500)
        });
    }
);


// ============================================================
// 531 — CACHE ENGINE
// ============================================================

const MEMORY_CACHE =
    new Map();

const CACHE_DEFAULT_TTL =
    60 * 1000;

function cacheGet(
    key
) {
    const item =
        MEMORY_CACHE.get(
            key
        );

    if (!item) {
        return null;
    }

    if (
        Date.now() >
        item.expiresAt
    ) {
        MEMORY_CACHE.delete(
            key
        );

        return null;
    }

    return item.value;
}

function cacheSet(
    key,
    value,
    ttl =
        CACHE_DEFAULT_TTL
) {
    MEMORY_CACHE.set(
        key,
        {
            value,
            expiresAt:
                Date.now() +
                Math.max(
                    1000,
                    Number(ttl) ||
                        CACHE_DEFAULT_TTL
                )
        }
    );

    if (
        MEMORY_CACHE.size >
        500
    ) {
        const first =
            MEMORY_CACHE.keys()
                .next()
                .value;

        if (first) {
            MEMORY_CACHE.delete(
                first
            );
        }
    }

    return value;
}

function cacheDelete(
    key
) {
    return MEMORY_CACHE.delete(
        key
    );
}


// ============================================================
// 532 — CACHE STATUS
// ============================================================

app.get(
    "/api/cache/status",
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true,
            size:
                MEMORY_CACHE.size
        });
    }
);


// ============================================================
// 533 — CACHE CLEAR
// ============================================================

app.delete(
    "/api/cache",
    requireAdmin,
    (req, res) => {
        const before =
            MEMORY_CACHE.size;

        MEMORY_CACHE.clear();

        res.json({
            ok: true,
            deleted:
                before
        });
    }
);


// ============================================================
// 534 — ADVANCED RATE LIMIT
// ============================================================

const RATE_LIMIT_STORE =
    new Map();

const RATE_LIMIT_WINDOW =
    60 * 1000;

const RATE_LIMIT_MAX =
    120;

function advancedRateLimit(
    req,
    res,
    next
) {
    const ip =
        req.ip ||
        req.socket?.remoteAddress ||
        "unknown";

    const now =
        Date.now();

    let item =
        RATE_LIMIT_STORE.get(
            ip
        );

    if (
        !item ||
        now - item.startedAt >
            RATE_LIMIT_WINDOW
    ) {
        item = {
            startedAt:
                now,
            count:
                0
        };
    }

    item.count++;

    RATE_LIMIT_STORE.set(
        ip,
        item
    );

    res.setHeader(
        "X-RateLimit-Limit",
        RATE_LIMIT_MAX
    );

    res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(
            0,
            RATE_LIMIT_MAX -
                item.count
        )
    );

    if (
        item.count >
        RATE_LIMIT_MAX
    ) {
        recordSecurityEvent(
            "rate_limit",
            {
                ip,
                path:
                    req.path,
                method:
                    req.method,
                message:
                    "Advanced rate limit exceeded."
            }
        );

        return res.status(429).json({
            ok: false,
            error:
                "RATE_LIMIT_EXCEEDED",
            message:
                "Çok fazla istek gönderildi."
        });
    }

    next();
}


// ============================================================
// 535 — RATE LIMIT CLEANUP
// ============================================================

setInterval(
    () => {
        const now =
            Date.now();

        for (
            const [
                key,
                item
            ] of RATE_LIMIT_STORE
        ) {
            if (
                now -
                    item.startedAt >
                RATE_LIMIT_WINDOW * 2
            ) {
                RATE_LIMIT_STORE.delete(
                    key
                );
            }
        }
    },
    5 * 60 * 1000
);


// ============================================================
// 536 — APPLY API RATE LIMIT
// ============================================================

app.use(
    "/api",
    advancedRateLimit
);


// ============================================================
// 537 — AUDIT IMPORTANT REQUESTS
// ============================================================

app.use(
    "/api",
    (req, res, next) => {
        const importantMethods = [
            "POST",
            "PATCH",
            "PUT",
            "DELETE"
        ];

        if (
            importantMethods.includes(
                req.method
            )
        ) {
            createAuditLog(
                req,
                "api_request",
                {
                    bodyKeys:
                        req.body &&
                        typeof req.body ===
                            "object"
                            ? Object.keys(
                                req.body
                            ).slice(0, 50)
                            : []
                }
            );
        }

        next();
    }
);


// ============================================================
// 538 — AI PROVIDER STATUS
// ============================================================

app.get(
    "/api/ai/providers",
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true,
            providers: {
                groq:
                    AI_STATUS.groq,
                cerebras:
                    AI_STATUS.cerebras,
                openrouter:
                    AI_STATUS.openrouter,
                gemini:
                    AI_STATUS.gemini
            }
        });
    }
);


// ============================================================
// 539 — AI RESET FAILURES
// ============================================================

app.post(
    "/api/admin/ai/reset",
    requireAdmin,
    (req, res) => {
        for (
            const key of [
                "groq",
                "cerebras",
                "openrouter",
                "gemini"
            ]
        ) {
            if (
                AI_STATUS[key]
            ) {
                AI_STATUS[key]
                    .failures = 0;

                AI_STATUS[key]
                    .lastError = null;

                AI_STATUS[key]
                    .lastFailureAt =
                    null;
            }
        }

        res.json({
            ok: true,
            status:
                AI_STATUS
        });
    }
);


// ============================================================
// 540 — SYSTEM CLEANUP
// ============================================================

function cleanupOldData() {
    const now =
        Date.now();

    const oneDay =
        24 * 60 * 60 * 1000;

    const security =
        getSecurityEvents()
            .filter(item => {
                const time =
                    Date.parse(
                        item.createdAt ||
                        ""
                    );

                if (
                    !Number.isFinite(
                        time
                    )
                ) {
                    return true;
                }

                return (
                    now - time <
                    oneDay * 30
                );
            });

    saveSecurityEvents(
        security
    );

    const audit =
        getAuditLogs()
            .filter(item => {
                const time =
                    Date.parse(
                        item.createdAt ||
                        ""
                    );

                if (
                    !Number.isFinite(
                        time
                    )
                ) {
                    return true;
                }

                return (
                    now - time <
                    oneDay * 90
                );
            });

    saveAuditLogs(
        audit
    );
}


// ============================================================
// 541 — PERIODIC CLEANUP
// ============================================================

setInterval(
    () => {
        try {
            cleanupOldData();
        } catch (error) {
            logError(
                "CLEANUP_ERROR",
                error
            );
        }
    },
    6 * 60 * 60 * 1000
);


// ============================================================
// 542 — AI HEALTH SCORE
// ============================================================

function calculateAIHealth() {
    const providers = [
        "groq",
        "cerebras",
        "openrouter",
        "gemini"
    ];

    let available = 0;

    for (
        const provider of providers
    ) {
        const status =
            AI_STATUS[
                provider
            ];

        if (
            status &&
            status.configured &&
            status.failures <
                5
        ) {
            available++;
        }
    }

    return {
        available,
        total:
            providers.length,
        percentage:
            Math.round(
                (
                    available /
                    providers.length
                ) * 100
            )
    };
}


// ============================================================
// 543 — AI HEALTH
// ============================================================

app.get(
    "/api/ai/health",
    (req, res) => {
        res.json({
            ok: true,
            health:
                calculateAIHealth(),
            providers:
                AI_STATUS
        });
    }
);


// ============================================================
// 544 — LOCAL AI TEST
// ============================================================

app.post(
    "/api/ai/test",
    requireAdmin,
    async (req, res) => {
        const message =
            cleanText(
                req.body?.message ||
                "Merhaba TürkAI"
            );

        try {
            const answer =
                await generateAIAnswer(
                    message,
                    []
                );

            res.json({
                ok: true,
                answer
            });
        } catch (error) {
            logError(
                "AI_TEST_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error:
                    "AI_TEST_FAILED"
            });
        }
    }
);


// ============================================================
// 545 — SEARCH CACHE
// ============================================================

async function cachedResearch(
    query
) {
    const key =
        `research:${query.toLowerCase()}`;

    const cached =
        cacheGet(
            key
        );

    if (cached) {
        return {
            ...cached,
            cached: true
        };
    }

    const result =
        await performResearch(
            query
        );

    if (result.ok) {
        cacheSet(
            key,
            result,
            2 * 60 * 1000
        );
    }

    return {
        ...result,
        cached: false
    };
}


// ============================================================
// 546 — CACHED RESEARCH API
// ============================================================

app.get(
    "/api/research/cached",
    async (req, res) => {
        const query =
            normalizeResearchQuery(
                req.query.q ||
                req.query.query
            );

        if (!query) {
            return res.status(400).json({
                ok: false,
                error:
                    "QUERY_REQUIRED"
            });
        }

        try {
            const result =
                await cachedResearch(
                    query
                );

            res.json(
                result
            );
        } catch (error) {
            logError(
                "CACHED_RESEARCH_ERROR",
                error
            );

            res.status(500).json({
                ok: false,
                error:
                    "RESEARCH_FAILED"
            });
        }
    }
);


// ============================================================
// 547 — USER PROFILE
// ============================================================

app.get(
    "/api/me",
    (req, res) => {
        const user =
            req.user ||
            getGuestUser();

        const subscription =
            getUserPlan(
                user.id
            );

        res.json({
            ok: true,
            user: {
                id:
                    user.id,
                name:
                    user.name ||
                    "Misafir",
                email:
                    user.email ||
                    null,
                role:
                    user.role ||
                    "user",
                plan:
                    subscription.plan
            }
        });
    }
);


// ============================================================
// 548 — USER PROFILE UPDATE
// ============================================================

app.patch(
    "/api/me",
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        const users =
            readJSONSafe(
                DB_FILES.users,
                []
            );

        const index =
            users.findIndex(
                user =>
                    user.id ===
                    userId
            );

        if (index === -1) {
            return res.status(404).json({
                ok: false,
                error:
                    "USER_NOT_FOUND"
            });
        }

        const user =
            users[index];

        if (
            req.body?.name !==
            undefined
        ) {
            user.name =
                cleanText(
                    req.body.name
                ).slice(0, 100);
        }

        user.updatedAt =
            nowISO();

        users[index] =
            user;

        writeJSONSafe(
            DB_FILES.users,
            users
        );

        res.json({
            ok: true,
            user
        });
    }
);


// ============================================================
// 549 — SESSION STATUS
// ============================================================

app.get(
    "/api/session",
    (req, res) => {
        const user =
            req.user ||
            getGuestUser();

        res.json({
            ok: true,
            authenticated:
                Boolean(
                    user &&
                    user.id !==
                        "guest"
                ),
            user: {
                id:
                    user.id,
                name:
                    user.name ||
                    "Misafir",
                role:
                    user.role ||
                    "user"
            }
        });
    }
);


// ============================================================
// 550 — SERVER FINAL STATUS
// ============================================================

app.get(
    "/api/status",
    (req, res) => {
        const ai =
            calculateAIHealth();

        res.json({
            ok: true,
            status:
                "online",
            app:
                APP_NAME,
            version:
                APP_VERSION,
            serverTime:
                nowISO(),
            uptime:
                process.uptime(),
            ai,
            socket:
                io.engine?.clientsCount ||
                0,
            cache:
                MEMORY_CACHE.size,
            rateLimitEntries:
                RATE_LIMIT_STORE.size
        });
    }
);


// ============================================================
// 551 — ADMIN MAINTENANCE
// ============================================================

let MAINTENANCE_MODE =
    false;

app.get(
    "/api/maintenance",
    (req, res) => {
        res.json({
            ok: true,
            maintenance:
                MAINTENANCE_MODE
        });
    }
);

app.post(
    "/api/admin/maintenance",
    requireAdmin,
    (req, res) => {
        MAINTENANCE_MODE =
            Boolean(
                req.body?.enabled
            );

        res.json({
            ok: true,
            maintenance:
                MAINTENANCE_MODE
        });
    }
);


// ============================================================
// 552 — MAINTENANCE GUARD
// ============================================================

app.use(
    "/api",
    (req, res, next) => {
        const allowedPaths = [
            "/health",
            "/ping",
            "/status",
            "/maintenance",
            "/config"
        ];

        if (
            MAINTENANCE_MODE &&
            !allowedPaths.includes(
                req.path
            ) &&
            !isAdminRequest(req)
        ) {
            return res.status(503).json({
                ok: false,
                error:
                    "MAINTENANCE_MODE",
                message:
                    "TürkAI bakım modunda."
            });
        }

        next();
    }
);


// ============================================================
// 553 — ERROR SAFE RESPONSE
// ============================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        if (
            res.headersSent
        ) {
            return next(
                error
            );
        }

        const requestId =
            req.requestId ||
            crypto.randomUUID();

        logError(
            "FINAL_ERROR_HANDLER",
            {
                requestId,
                error:
                    error?.stack ||
                    error?.message ||
                    String(error)
            }
        );

        res.status(500).json({
            ok: false,
            error:
                "SERVER_ERROR",
            requestId,
            message:
                IS_PRODUCTION
                    ? "Sunucu hatası oluştu."
                    : (
                        error?.message ||
                        "Sunucu hatası oluştu."
                    )
        });
    }
);


// ============================================================
// 554 — PROCESS MEMORY WATCH
// ============================================================

setInterval(
    () => {
        try {
            const memory =
                process.memoryUsage();

            const heapLimit =
                512 * 1024 * 1024;

            if (
                memory.rss >
                heapLimit
            ) {
                logWarn(
                    "HIGH_MEMORY_USAGE",
                    {
                        rss:
                            memory.rss,
                        heapUsed:
                            memory.heapUsed,
                        heapTotal:
                            memory.heapTotal
                    }
                );
            }
        } catch {
            // ignore
        }
    },
    60 * 1000
);


// ============================================================
// 555 — SOCKET BROADCAST HELPER
// ============================================================

function broadcastSystemEvent(
    event,
    payload
) {
    try {
        io.emit(
            event,
            {
                ...payload,
                timestamp:
                    nowISO()
            }
        );
    } catch (error) {
        logError(
            "SOCKET_BROADCAST_ERROR",
            error
        );
    }
}


// ============================================================
// 556 — ADMIN BROADCAST
// ============================================================

app.post(
    "/api/admin/broadcast",
    requireAdmin,
    (req, res) => {
        const event =
            cleanText(
                req.body?.event ||
                "turkai:announcement"
            ).slice(0, 100);

        const message =
            cleanText(
                req.body?.message ||
                ""
            ).slice(0, 2000);

        if (!message) {
            return res.status(400).json({
                ok: false,
                error:
                    "MESSAGE_REQUIRED"
            });
        }

        broadcastSystemEvent(
            event,
            {
                message,
                source:
                    "admin"
            }
        );

        res.json({
            ok: true,
            event
        });
    }
);


// ============================================================
// 557 — CHAT STREAM EVENT
// ============================================================

function broadcastChatUpdate(
    chatId,
    data
) {
    broadcastSystemEvent(
        "chat:update",
        {
            chatId,
            ...data
        }
    );
}


// ============================================================
// 558 — FILE EVENT
// ============================================================

function broadcastFileUpdate(
    userId,
    file
) {
    io.emit(
        "file:update",
        {
            userId,
            file,
            timestamp:
                nowISO()
        }
    );
}


// ============================================================
// 559 — APP CONFIG CACHE
// ============================================================

function getCachedPublicConfig() {
    const key =
        "public-config";

    const cached =
        cacheGet(
            key
        );

    if (cached) {
        return cached;
    }

    const config = {
        app: {
            name:
                APP_NAME,
            version:
                APP_VERSION
        },
        plans:
            Object.values(
                PLAN_CONFIG
            ).map(
                plan => ({
                    id:
                        plan.id,
                    name:
                        plan.name,
                    price:
                        plan.priceMonthly,
                    messages:
                        plan.dailyMessages
                })
            ),
        features: {
            chat: true,
            memory: true,
            research: true,
            weather: true,
            currency: true,
            upload: true,
            projects: true,
            socket: true
        }
    };

    return cacheSet(
        key,
        config,
        5 * 60 * 1000
    );
}


// ============================================================
// 560 — CONFIG CACHE ENDPOINT
// ============================================================

app.get(
    "/api/config/cached",
    (req, res) => {
        res.json({
            ok: true,
            config:
                getCachedPublicConfig()
        });
    }
);


// ============================================================
// 561 — SERVER STATISTICS
// ============================================================

function getServerStatistics() {
    const users =
        readJSONSafe(
            DB_FILES.users,
            []
        );

    const chats =
        readJSONSafe(
            DB_FILES.chats,
            []
        );

    const messages =
        readJSONSafe(
            DB_FILES.messages,
            []
        );

    const projects =
        getProjects();

    const files =
        getFileDatabase();

    return {
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
        uptime:
            process.uptime(),
        memory:
            process.memoryUsage(),
        requests:
            REQUEST_METRICS.total
    };
}


// ============================================================
// 562 — SERVER STATISTICS ENDPOINT
// ============================================================

app.get(
    "/api/statistics",
    requireAdmin,
    (req, res) => {
        res.json({
            ok: true,
            statistics:
                getServerStatistics()
        });
    }
);


// ============================================================
// 563 — LOG ROTATION
// ============================================================

function rotateLogFiles() {
    try {
        const files =
            fs.readdirSync(
                LOGS_DIR
            );

        if (
            files.length <=
            20
        ) {
            return;
        }

        files
            .sort()
            .slice(
                0,
                files.length -
                    20
            )
            .forEach(
                file => {
                    try {
                        fs.unlinkSync(
                            path.join(
                                LOGS_DIR,
                                file
                            )
                        );
                    } catch {
                        // ignore
                    }
                }
            );
    } catch {
        // ignore
    }
}


// ============================================================
// 564 — PERIODIC LOG ROTATION
// ============================================================

setInterval(
    () => {
        rotateLogFiles();
    },
    60 * 60 * 1000
);


// ============================================================
// 565 — FINAL DATABASE CHECK
// ============================================================

function finalDatabaseCheck() {
    const files =
        Object.values(
            DB_FILES
        );

    let missing = 0;

    for (
        const file of files
    ) {
        if (
            !fs.existsSync(
                file
            )
        ) {
            missing++;
        }
    }

    return {
        total:
            files.length,
        missing
    };
}


// ============================================================
// 566 — FINAL STORAGE CHECK
// ============================================================

function finalStorageCheck() {
    const directories = [
        DATA_DIR,
        DB_DIR,
        STORAGE_DIR,
        USERS_DIR,
        GENERATED_DIR,
        UPLOADS_DIR,
        LOGS_DIR,
        PUBLIC_DIR
    ];

    return directories.map(
        directory => ({
            directory,
            exists:
                fs.existsSync(
                    directory
                )
        })
    );
}


// ============================================================
// 567 — FINAL STARTUP REPORT
// ============================================================

function finalStartupReport() {
    const database =
        finalDatabaseCheck();

    const storage =
        finalStorageCheck();

    console.log(
        "============================================================"
    );

    console.log(
        "TÜRKAI FINAL STARTUP REPORT"
    );

    console.log(
        "============================================================"
    );

    console.log(
        `Database files : ${database.total}`
    );

    console.log(
        `Missing files  : ${database.missing}`
    );

    console.log(
        `Storage checks : ${storage.length}`
    );

    console.log(
        `AI health      : ${JSON.stringify(calculateAIHealth())}`
    );

    console.log(
        `Port           : ${PORT}`
    );

    console.log(
        `Environment    : ${NODE_ENV}`
    );

    console.log(
        `Version        : ${APP_VERSION}`
    );

    console.log(
        "============================================================"
    );
}

finalStartupReport();


// ============================================================
// 568 — READY EVENT
// ============================================================

setTimeout(
    () => {
        broadcastSystemEvent(
            "turkai:ready",
            {
                app:
                    APP_NAME,
                version:
                    APP_VERSION,
                status:
                    "ready"
            }
        );
    },
    1000
);


// ============================================================
// 569 — DAILY USAGE CLEANER
// ============================================================

function cleanOldUsage() {
    const usage =
        getUsageDatabase();

    const today =
        getUsageDate();

    let changed = false;

    for (
        const [
            userId,
            data
        ] of Object.entries(
            usage
        )
    ) {
        if (
            data &&
            data.date &&
            data.date !== today
        ) {
            delete usage[userId];
            changed = true;
        }
    }

    if (changed) {
        saveUsageDatabase(
            usage
        );
    }
}


// ============================================================
// 570 — DAILY CLEANUP TIMER
// ============================================================

setInterval(
    () => {
        try {
            cleanOldUsage();
        } catch (error) {
            logError(
                "USAGE_CLEANUP_ERROR",
                error
            );
        }
    },
    60 * 60 * 1000
);


// ============================================================
// 571 — KNOWLEDGE LIMITER
// ============================================================

function limitKnowledgeSize() {
    const knowledge =
        readJSONSafe(
            DB_FILES.knowledge,
            []
        );

    if (
        knowledge.length <=
        10000
    ) {
        return;
    }

    knowledge.splice(
        0,
        knowledge.length -
            10000
    );

    writeJSONSafe(
        DB_FILES.knowledge,
        knowledge
    );
}


// ============================================================
// 572 — KNOWLEDGE CLEANUP
// ============================================================

setInterval(
    () => {
        try {
            limitKnowledgeSize();
        } catch (error) {
            logError(
                "KNOWLEDGE_CLEANUP_ERROR",
                error
            );
        }
    },
    12 * 60 * 60 * 1000
);


// ============================================================
// 573 — PROJECT LIMITER
// ============================================================

function limitProjectSize() {
    const projects =
        getProjects();

    if (
        projects.length <=
        20000
    ) {
        return;
    }

    projects.splice(
        0,
        projects.length -
            20000
    );

    saveProjects(
        projects
    );
}


// ============================================================
// 574 — PROJECT CLEANUP
// ============================================================

setInterval(
    () => {
        try {
            limitProjectSize();
        } catch (error) {
            logError(
                "PROJECT_CLEANUP_ERROR",
                error
            );
        }
    },
    12 * 60 * 60 * 1000
);


// ============================================================
// 575 — NOTIFICATION LIMITER
// ============================================================

function limitNotificationSize() {
    const notifications =
        getNotifications();

    if (
        notifications.length <=
        50000
    ) {
        return;
    }

    notifications.splice(
        0,
        notifications.length -
            50000
    );

    saveNotifications(
        notifications
    );
}


// ============================================================
// 576 — NOTIFICATION CLEANUP
// ============================================================

setInterval(
    () => {
        try {
            limitNotificationSize();
        } catch (error) {
            logError(
                "NOTIFICATION_CLEANUP_ERROR",
                error
            );
        }
    },
    12 * 60 * 60 * 1000
);


// ============================================================
// 577 — FINAL API MAP
// ============================================================

const TURKAI_API_MAP = [
    "/api/health",
    "/api/ping",
    "/api/status",
    "/api/system",
    "/api/config",
    "/api/config/cached",

    "/api/chat",
    "/api/chat/advanced",
    "/api/chats",
    "/api/chats/:id",
    "/api/chats/:id/export",
    "/api/chats/:id/export.json",

    "/api/research",
    "/api/research/limited",
    "/api/research/cached",

    "/api/weather",
    "/api/currency",

    "/api/upload",
    "/api/files",
    "/api/files/:id",
    "/api/files/:id/download",

    "/api/projects",
    "/api/projects/:id",
    "/api/projects/search",

    "/api/memory",
    "/api/memory/:id",

    "/api/notifications",
    "/api/feedback",

    "/api/plans",
    "/api/me",
    "/api/me/plan",
    "/api/limits",

    "/api/pro/activate",
    "/api/test-payment",
    "/api/payment/status",

    "/api/models",
    "/api/ai/status",
    "/api/ai/health",
    "/api/ai/providers",

    "/api/socket/status"
];


// ============================================================
// 578 — API MAP ENDPOINT
// ============================================================

app.get(
    "/api",
    (req, res) => {
        res.json({
            ok: true,
            name:
                APP_NAME,
            version:
                APP_VERSION,
            endpoints:
                TURKAI_API_MAP
        });
    }
);


// ============================================================
// 579 — API DOCUMENTATION
// ============================================================

app.get(
    "/api/docs",
    (req, res) => {
        res.json({
            ok: true,
            name:
                APP_NAME,
            version:
                APP_VERSION,
            description:
                "TürkAI API",
            endpoints:
                TURKAI_API_MAP.map(
                    endpoint => ({
                        path:
                            endpoint,
                        methods:
                            endpoint.includes(
                                ":"
                            )
                                ? [
                                    "GET",
                                    "PATCH",
                                    "DELETE"
                                ]
                                : [
                                    "GET",
                                    "POST"
                                ]
                    })
                )
        });
    }
);


// ============================================================
// 580 — FINAL HEALTH CACHE
// ============================================================

function getCachedHealth() {
    const key =
        "health";

    const cached =
        cacheGet(
            key
        );

    if (cached) {
        return cached;
    }

    const health = {
        ok: true,
        status:
            "healthy",
        app:
            APP_NAME,
        version:
            APP_VERSION,
        uptime:
            process.uptime(),
        ai:
            calculateAIHealth(),
        timestamp:
            nowISO()
    };

    return cacheSet(
        key,
        health,
        5000
    );
}


// ============================================================
// 581 — FAST HEALTH
// ============================================================

app.get(
    "/api/health/fast",
    (req, res) => {
        res.json(
            getCachedHealth()
        );
    }
);


// ============================================================
// 582 — ADMIN RELOAD
// ============================================================

app.post(
    "/api/admin/reload",
    requireAdmin,
    (req, res) => {
        initializeDatabase();
        cleanupOldData();
        cleanOldUsage();
        limitKnowledgeSize();
        limitProjectSize();
        limitNotificationSize();

        res.json({
            ok: true,
            message:
                "TürkAI veri sistemleri yeniden yüklendi.",
            timestamp:
                nowISO()
        });
    }
);


// ============================================================
// 583 — ADMIN CLEAR CACHE
// ============================================================

app.post(
    "/api/admin/cache/clear",
    requireAdmin,
    (req, res) => {
        const before =
            MEMORY_CACHE.size;

        MEMORY_CACHE.clear();

        res.json({
            ok: true,
            cleared:
                before
        });
    }
);


// ============================================================
// 584 — ADMIN SYSTEM CHECK
// ============================================================

app.get(
    "/api/admin/system-check",
    requireAdmin,
    (req, res) => {
        const checks = {
            database:
                finalDatabaseCheck(),
            storage:
                finalStorageCheck(),
            ai:
                calculateAIHealth(),
            memory:
                process.memoryUsage(),
            uptime:
                process.uptime(),
            requests:
                REQUEST_METRICS
        };

        res.json({
            ok: true,
            checks
        });
    }
);


// ============================================================
// 585 — FINAL EXPORT
// ============================================================

module.exports = {
    app,
    httpServer,
    io,
    APP_NAME,
    APP_VERSION,
    PLAN_CONFIG,
    MODEL_ROUTER,
    getUserPlan,
    setUserPlan,
    checkUsageLimit,
    incrementDailyUsage,
    getServerStatistics
};


// ============================================================
// 586 — FINAL MESSAGE
// ============================================================

console.log(
    ""
);

console.log(
    "============================================================"
);

console.log(
    " TÜRKAI SERVER TAMAMLANDI"
);

console.log(
    "============================================================"
);

console.log(
    ` ${APP_NAME} ${APP_VERSION}`
);

console.log(
    " Chat API       : AKTİF"
);

console.log(
    " AI Router      : AKTİF"
);

console.log(
    " Memory         : AKTİF"
);

console.log(
    " Knowledge      : AKTİF"
);

console.log(
    " Research       : AKTİF"
);

console.log(
    " Weather        : AKTİF"
);

console.log(
    " Currency       : AKTİF"
);

console.log(
    " Upload         : AKTİF"
);

console.log(
    " Projects       : AKTİF"
);

console.log(
    " Plans          : AKTİF"
);

console.log(
    " Pro / Plus     : AKTİF"
);

console.log(
    " Socket.IO      : AKTİF"
);

console.log(
    " Security       : AKTİF"
);

console.log(
    " Admin API      : AKTİF"
);

console.log(
    " Health API     : AKTİF"
);

console.log(
    "============================================================"
);

console.log(
    ""
);


// ============================================================
// TÜRKAI SERVER.JS — END
// ============================================================
