"use strict";

/*
================================================================
 TÜRKAI SERVER
 Temiz sıfırdan mimari
 PARÇA 1 / 5

 Hedef:
 - Render
 - GitHub
 - Local Node.js
 - Socket.IO
 - JSON database
 - Kullanıcı sistemi
 - Session sistemi
 - Plan sistemi
 - Temel API
 - Güvenli başlangıç

 ÖNEMLİ:
 Bu dosyanın diğer parçaları bunun DEVAMINA eklenecek.
 Aynı değişkenleri tekrar const ile tanımlamayacağız.
================================================================
*/

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const {
    Server: SocketIOServer
} = require("socket.io");

/*
================================================================
 001 — APPLICATION
================================================================
*/

const APP_NAME =
    "TürkAI";

const APP_VERSION =
    "15.0.0";

const APP_DESCRIPTION =
    "Türkçe yapay zekâ platformu";

const APP_AUTHOR =
    "TürkAI";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV ===
    "production";

const PORT =
    Number(
        process.env.PORT
    ) ||
    10000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const START_TIME =
    Date.now();

const SERVER_ID =
    process.env.RENDER_INSTANCE_ID ||
    crypto
        .randomBytes(12)
        .toString("hex");

/*
================================================================
 002 — EXPRESS
================================================================
*/

const app =
    express();

const httpServer =
    http.createServer(
        app
    );

/*
================================================================
 003 — SOCKET.IO
================================================================
*/

const io =
    new SocketIOServer(
        httpServer,
        {
            cors: {
                origin: true,
                credentials: true,
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

/*
================================================================
 004 — DIRECTORY SYSTEM
================================================================
*/

const ROOT_DIR =
    __dirname;

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

const DATABASE_DIR =
    path.join(
        ROOT_DIR,
        "database"
    );

const STORAGE_DIR =
    path.join(
        ROOT_DIR,
        "storage"
    );

const USERS_DIR =
    path.join(
        STORAGE_DIR,
        "users"
    );

const UPLOADS_DIR =
    path.join(
        STORAGE_DIR,
        "uploads"
    );

const GENERATED_DIR =
    path.join(
        STORAGE_DIR,
        "generated"
    );

const LOGS_DIR =
    path.join(
        STORAGE_DIR,
        "logs"
    );

const CACHE_DIR =
    path.join(
        STORAGE_DIR,
        "cache"
    );

const TEMP_DIR =
    path.join(
        STORAGE_DIR,
        "temp"
    );

const BACKUP_DIR =
    path.join(
        STORAGE_DIR,
        "backups"
    );

/*
================================================================
 005 — DIRECTORY CREATION
================================================================
*/

const ALL_DIRECTORIES = [

    PUBLIC_DIR,

    DATA_DIR,

    DATABASE_DIR,

    STORAGE_DIR,

    USERS_DIR,

    UPLOADS_DIR,

    GENERATED_DIR,

    LOGS_DIR,

    CACHE_DIR,

    TEMP_DIR,

    BACKUP_DIR

];

for (
    const directory
    of ALL_DIRECTORIES
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
            "[DIR ERROR]",
            directory,
            error.message
        );

        throw error;
    }
}

/*
================================================================
 006 — DATABASE FILES
================================================================
*/

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
        ),

    statistics:
        path.join(
            DATABASE_DIR,
            "statistics.json"
        )
};

/*
================================================================
 007 — DEFAULT DATABASE
================================================================
*/

const DEFAULT_DATABASE = {

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

    statistics: [],

    settings: {

        maintenance:
            false,

        allowRegistration:
            true,

        allowGuest:
            true,

        maxUploadMB:
            25,

        defaultModel:
            "turkai-local",

        defaultPlan:
            "free",

        researchEnabled:
            true,

        weatherEnabled:
            true,

        memoryEnabled:
            true,

        imageEnabled:
            true,

        videoEnabled:
            true,

        updatedAt:
            null
    }
};

/*
================================================================
 008 — DATABASE INITIALIZATION
================================================================
*/

function ensureDatabaseFile(
    file,
    defaultValue
) {

    try {

        if (
            !fs.existsSync(
                file
            )
        ) {

            fs.writeFileSync(
                file,
                JSON.stringify(
                    defaultValue,
                    null,
                    2
                ),
                "utf8"
            );

            return;
        }

        const content =
            fs.readFileSync(
                file,
                "utf8"
            );

        if (
            !content.trim()
        ) {

            fs.writeFileSync(
                file,
                JSON.stringify(
                    defaultValue,
                    null,
                    2
                ),
                "utf8"
            );
        }

    } catch (
        error
    ) {

        console.error(
            "[DATABASE INIT ERROR]",
            file,
            error.message
        );

        throw error;
    }
}

/*
================================================================
 009 — INITIAL DATABASE FILES
================================================================
*/

ensureDatabaseFile(
    DB_FILES.users,
    DEFAULT_DATABASE.users
);

ensureDatabaseFile(
    DB_FILES.sessions,
    DEFAULT_DATABASE.sessions
);

ensureDatabaseFile(
    DB_FILES.chats,
    DEFAULT_DATABASE.chats
);

ensureDatabaseFile(
    DB_FILES.messages,
    DEFAULT_DATABASE.messages
);

ensureDatabaseFile(
    DB_FILES.memories,
    DEFAULT_DATABASE.memories
);

ensureDatabaseFile(
    DB_FILES.knowledge,
    DEFAULT_DATABASE.knowledge
);

ensureDatabaseFile(
    DB_FILES.usage,
    DEFAULT_DATABASE.usage
);

ensureDatabaseFile(
    DB_FILES.files,
    DEFAULT_DATABASE.files
);

ensureDatabaseFile(
    DB_FILES.projects,
    DEFAULT_DATABASE.projects
);

ensureDatabaseFile(
    DB_FILES.research,
    DEFAULT_DATABASE.research
);

ensureDatabaseFile(
    DB_FILES.payments,
    DEFAULT_DATABASE.payments
);

ensureDatabaseFile(
    DB_FILES.notifications,
    DEFAULT_DATABASE.notifications
);

ensureDatabaseFile(
    DB_FILES.audit,
    DEFAULT_DATABASE.audit
);

ensureDatabaseFile(
    DB_FILES.security,
    DEFAULT_DATABASE.security
);

ensureDatabaseFile(
    DB_FILES.statistics,
    DEFAULT_DATABASE.statistics
);

ensureDatabaseFile(
    DB_FILES.settings,
    DEFAULT_DATABASE.settings
);

/*
================================================================
 010 — SAFE JSON READ
================================================================
*/

function readJSON(
    file,
    fallback
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
            "[JSON READ ERROR]",
            file,
            error.message
        );

        return fallback;
    }
}

/*
================================================================
 011 — SAFE JSON WRITE
================================================================
*/

function writeJSON(
    file,
    value
) {

    const temporaryFile =
        `${file}.tmp`;

    try {

        fs.writeFileSync(
            temporaryFile,
            JSON.stringify(
                value,
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

    } catch (
        error
    ) {

        console.error(
            "[JSON WRITE ERROR]",
            file,
            error.message
        );

        try {

            if (
                fs.existsSync(
                    temporaryFile
                )
            ) {

                fs.unlinkSync(
                    temporaryFile
                );
            }

        } catch (
            cleanupError
        ) {}

        return false;
    }
}

/*
================================================================
 012 — DATABASE GETTERS
================================================================
*/

function getUsers() {

    return readJSON(
        DB_FILES.users,
        []
    );
}

function saveUsers(
    users
) {

    return writeJSON(
        DB_FILES.users,
        Array.isArray(users)
            ? users
            : []
    );
}

function getSessions() {

    return readJSON(
        DB_FILES.sessions,
        []
    );
}

function saveSessions(
    sessions
) {

    return writeJSON(
        DB_FILES.sessions,
        Array.isArray(sessions)
            ? sessions
            : []
    );
}

function getChats() {

    return readJSON(
        DB_FILES.chats,
        []
    );
}

function saveChats(
    chats
) {

    return writeJSON(
        DB_FILES.chats,
        Array.isArray(chats)
            ? chats
            : []
    );
}

function getMessages() {

    return readJSON(
        DB_FILES.messages,
        []
    );
}

function saveMessages(
    messages
) {

    return writeJSON(
        DB_FILES.messages,
        Array.isArray(messages)
            ? messages
            : []
    );
}

function getMemories() {

    return readJSON(
        DB_FILES.memories,
        []
    );
}

function saveMemories(
    memories
) {

    return writeJSON(
        DB_FILES.memories,
        Array.isArray(memories)
            ? memories
            : []
    );
}

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
        Array.isArray(knowledge)
            ? knowledge
            : []
    );
}

function getUsage() {

    return readJSON(
        DB_FILES.usage,
        []
    );
}

function saveUsage(
    usage
) {

    return writeJSON(
        DB_FILES.usage,
        Array.isArray(usage)
            ? usage
            : []
    );
}

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
        Array.isArray(files)
            ? files
            : []
    );
}

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
        Array.isArray(projects)
            ? projects
            : []
    );
}

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
        Array.isArray(research)
            ? research
            : []
    );
}

function getPayments() {

    return readJSON(
        DB_FILES.payments,
        []
    );
}

function savePayments(
    payments
) {

    return writeJSON(
        DB_FILES.payments,
        Array.isArray(payments)
            ? payments
            : []
    );
}

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
        Array.isArray(notifications)
            ? notifications
            : []
    );
}

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
        Array.isArray(logs)
            ? logs
            : []
    );
}

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
        Array.isArray(events)
            ? events
            : []
    );
}

function getStatistics() {

    return readJSON(
        DB_FILES.statistics,
        []
    );
}

function saveStatistics(
    statistics
) {

    return writeJSON(
        DB_FILES.statistics,
        Array.isArray(statistics)
            ? statistics
            : []
    );
}

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
        {
            ...DEFAULT_DATABASE.settings,
            ...(settings || {})
        }
    );
}

/*
================================================================
 013 — BASIC HELPERS
================================================================
*/

function nowISO() {

    return new Date()
        .toISOString();
}

function createId(
    prefix = "id"
) {

    return (
        `${prefix}_` +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(8)
            .toString("hex")
    );
}

function createToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");
}

function hashText(
    text
) {

    return crypto
        .createHash("sha256")
        .update(
            String(text || ""),
            "utf8"
        )
        .digest("hex");
}

function cleanText(
    value,
    maxLength = 10000
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return "";
    }

    return String(value)
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

function normalizeText(
    value
) {

    return cleanText(
        value,
        100000
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .normalize(
            "NFKC"
        );
}

function clamp(
    value,
    minimum,
    maximum
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(
            number
        )
    ) {

        return minimum;
    }

    return Math.min(
        maximum,
        Math.max(
            minimum,
            number
        )
    );
}

function safeNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    return Number.isFinite(
        number
    )
        ? number
        : fallback;
}

/*
================================================================
 014 — LOGGING
================================================================
*/

function writeLog(
    level,
    message,
    meta = {}
) {

    const line =
        JSON.stringify(
            {
                timestamp:
                    nowISO(),

                level,

                message,

                meta
            }
        );

    console.log(
        `[${level}] ${message}`,
        Object.keys(meta).length
            ? meta
            : ""
    );

    try {

        const logFile =
            path.join(
                LOGS_DIR,
                "server.log"
            );

        fs.appendFileSync(
            logFile,
            line + "\n",
            "utf8"
        );

    } catch (
        error
    ) {

        console.error(
            "Log file error:",
            error.message
        );
    }
}

function logInfo(
    message,
    meta = {}
) {

    writeLog(
        "INFO",
        message,
        meta
    );
}

function logWarn(
    message,
    meta = {}
) {

    writeLog(
        "WARN",
        message,
        meta
    );
}

function logError(
    message,
    meta = {}
) {

    writeLog(
        "ERROR",
        message,
        meta
    );
}

/*
================================================================
 015 — SECURITY LOG
================================================================
*/

function logSecurity(
    event,
    meta = {}
) {

    writeLog(
        "SECURITY",
        event,
        meta
    );

    try {

        const events =
            getSecurityEvents();

        events.push(
            {
                id:
                    createId(
                        "sec"
                    ),

                event,

                meta,

                timestamp:
                    nowISO()
            }
        );

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

    } catch (
        error
    ) {

        logError(
            "Security log save failed",
            {
                error:
                    error.message
            }
        );
    }
}

/*
================================================================
 016 — AI LOG
================================================================
*/

function logAI(
    provider,
    model,
    meta = {}
) {

    writeLog(
        "AI",
        "AI request",
        {
            provider,
            model,
            ...meta
        }
    );
}

/*
================================================================
 017 — EXPRESS SECURITY
================================================================
*/

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

/*
================================================================
 018 — HELMET
================================================================
*/

app.use(
    helmet(
        {
            contentSecurityPolicy:
                false,

            crossOriginEmbedderPolicy:
                false
        }
    )
);

/*
================================================================
 019 — CORS
================================================================
*/

app.use(
    cors(
        {
            origin:
                true,

            credentials:
                true,

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
        }
    )
);

/*
================================================================
 020 — BODY PARSER
================================================================
*/

app.use(
    express.json(
        {
            limit:
                "25mb"
        }
    )
);

app.use(
    express.urlencoded(
        {
            extended:
                true,

            limit:
                "25mb"
        }
    )
);

/*
================================================================
 021 — REQUEST ID
================================================================
*/

app.use(
    (
        req,
        res,
        next
    ) => {

        const requestId =
            req.headers[
                "x-request-id"
            ] ||
            createId(
                "req"
            );

        req.requestId =
            String(
                requestId
            );

        res.setHeader(
            "X-Request-ID",
            req.requestId
        );

        next();
    }
);

/*
================================================================
 022 — REQUEST LOGGER
================================================================
*/

app.use(
    (
        req,
        res,
        next
    ) => {

        const started =
            Date.now();

        res.on(
            "finish",
            () => {

                const duration =
                    Date.now() -
                    started;

                if (
                    req.path.startsWith(
                        "/api"
                    )
                ) {

                    logInfo(
                        "HTTP request",
                        {
                            requestId:
                                req.requestId,

                            method:
                                req.method,

                            path:
                                req.path,

                            status:
                                res.statusCode,

                            duration
                        }
                    );
                }
            }
        );

        next();
    }
);

/*
================================================================
 023 — HEALTH CHECK
================================================================
*/

app.get(
    "/api/health",
    (
        req,
        res
    ) => {

        res.status(200)
            .json(
                {
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

                    uptime:
                        process.uptime(),

                    timestamp:
                        nowISO()
                }
            );
    }
);

/*
================================================================
 024 — STATUS
================================================================
*/

app.get(
    "/api/status",
    (
        req,
        res
    ) => {

        const memory =
            process.memoryUsage();

        res.json(
            {
                success:
                    true,

                status:
                    "online",

                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                serverId:
                    SERVER_ID,

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

                memory: {

                    rss:
                        memory.rss,

                    heapTotal:
                        memory.heapTotal,

                    heapUsed:
                        memory.heapUsed,

                    external:
                        memory.external
                },

                timestamp:
                    nowISO()
            }
        );
    }
);

/*
================================================================
 025 — PLANS
================================================================
*/

const PLANS = {

    free: {

        id:
            "free",

        name:
            "Free",

        price:
            0,

        dailyMessages:
            50,

        dailyResearch:
            5,

        dailyImages:
            0,

        dailyVideos:
            0,

        maxUploadMB:
            10
    },

    pro: {

        id:
            "pro",

        name:
            "Pro",

        price:
            250,

        dailyMessages:
            100,

        dailyResearch:
            25,

        dailyImages:
            2,

        dailyVideos:
            0,

        maxUploadMB:
            25
    },

    plus: {

        id:
            "plus",

        name:
            "Plus",

        price:
            500,

        dailyMessages:
            200,

        dailyResearch:
            75,

        dailyImages:
            4,

        dailyVideos:
            5,

        maxUploadMB:
            50
    },

    ultra: {

        id:
            "ultra",

        name:
            "Ultra",

        price:
            1000,

        dailyMessages:
            1000,

        dailyResearch:
            250,

        dailyImages:
            10,

        dailyVideos:
            15,

        maxUploadMB:
            100
    },

    developer: {

        id:
            "developer",

        name:
            "Developer",

        price:
            0,

        dailyMessages:
            400,

        dailyResearch:
            500,

        dailyImages:
            50,

        dailyVideos:
            50,

        maxUploadMB:
            200
    }
};

/*
================================================================
 026 — PLANS API
================================================================
*/

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {

        res.json(
            {
                success:
                    true,

                plans:
                    PLANS
            }
        );
    }
);

/*
================================================================
 027 — USER HELPERS
================================================================
*/

function findUserById(
    userId
) {

    const users =
        getUsers();

    return users.find(
        user =>
            user.id ===
            String(
                userId
            )
    ) || null;
}

function findUserByEmail(
    email
) {

    const normalized =
        normalizeText(
            email
        );

    if (
        !normalized
    ) {

        return null;
    }

    const users =
        getUsers();

    return users.find(
        user =>
            normalizeText(
                user.email
            ) ===
            normalized
    ) || null;
}

/*
================================================================
 028 — CREATE USER
================================================================
*/

function createUser(
    data = {}
) {

    const users =
        getUsers();

    const email =
        cleanText(
            data.email,
            320
        );

    const name =
        cleanText(
            data.name ||
            data.displayName ||
            "TürkAI Kullanıcısı",
            120
        );

    let existing =
        null;

    if (
        email
    ) {

        existing =
            findUserByEmail(
                email
            );
    }

    if (
        existing
    ) {

        return existing;
    }

    const user = {

        id:
            createId(
                "user"
            ),

        email:
            email ||
            null,

        name,

        displayName:
            name,

        plan:
            data.plan ||
            "free",

        role:
            data.role ||
            "user",

        avatar:
            data.avatar ||
            null,

        provider:
            data.provider ||
            "local",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        lastLoginAt:
            nowISO(),

        active:
            true
    };

    users.push(
        user
    );

    saveUsers(
        users
    );

    return user;
}

/*
================================================================
 029 — GUEST USER
================================================================
*/

function getGuestUser() {

    return {

        id:
            "guest",

        email:
            null,

        name:
            "Misafir",

        displayName:
            "Misafir",

        plan:
            "free",

        role:
            "guest",

        provider:
            "guest",

        active:
            true
    };
}

/*
================================================================
 030 — SESSION
================================================================
*/

function createSession(
    userId,
    options = {}
) {

    const sessions =
        getSessions();

    const token =
        createToken();

    const session = {

        id:
            createId(
                "session"
            ),

        token,

        userId,

        createdAt:
            nowISO(),

        expiresAt:
            new Date(
                Date.now() +
                (
                    options.ttl ||
                    1000 *
                    60 *
                    60 *
                    24 *
                    30
                )
            ).toISOString(),

        userAgent:
            cleanText(
                options.userAgent,
                1000
            ),

        ip:
            cleanText(
                options.ip,
                100
            )
    };

    sessions.push(
        session
    );

    if (
        sessions.length >
        10000
    ) {

        sessions.splice(
            0,
            sessions.length -
            10000
        );
    }

    saveSessions(
        sessions
    );

    return session;
}

/*
================================================================
 031 — GET SESSION
================================================================
*/

function getSessionByToken(
    token
) {

    const cleaned =
        cleanText(
            token,
            500
        );

    if (
        !cleaned
    ) {

        return null;
    }

    const sessions =
        getSessions();

    const now =
        Date.now();

    const session =
        sessions.find(
            item => {

                if (
                    item.token !==
                    cleaned
                ) {

                    return false;
                }

                if (
                    !item.expiresAt
                ) {

                    return true;
                }

                return (
                    new Date(
                        item.expiresAt
                    ).getTime() >
                    now
                );
            }
        );

    return session ||
        null;
}

/*
================================================================
 032 — REQUEST USER
================================================================
*/

function getRequestUser(
    req
) {

    try {

        const header =
            req.headers.authorization ||
            "";

        const token =
            header
                .replace(
                    /^Bearer\s+/i,
                    ""
                )
                .trim();

        if (
            token
        ) {

            const session =
                getSessionByToken(
                    token
                );

            if (
                session
            ) {

                return (
                    findUserById(
                        session.userId
                    ) ||
                    getGuestUser()
                );
            }
        }

        const userId =
            req.headers[
                "x-user-id"
            ];

        if (
            userId
        ) {

            return (
                findUserById(
                    userId
                ) ||
                getGuestUser()
            );
        }

        return getGuestUser();

    } catch (
        error
    ) {

        return getGuestUser();
    }
}

/*
================================================================
 033 — OPTIONAL AUTH
================================================================
*/

function optionalAuth(
    req,
    res,
    next
) {

    req.user =
        getRequestUser(
            req
        );

    next();
}

/*
================================================================
 034 — CURRENT USER
================================================================
*/

app.get(
    "/api/me",
    optionalAuth,
    (
        req,
        res
    ) => {

        res.json(
            {
                success:
                    true,

                authenticated:
                    req.user.role !==
                    "guest",

                user:
                    req.user
            }
        );
    }
);

/*
================================================================
 035 — LOGIN
================================================================
*/

app.post(
    "/api/auth/login",
    (
        req,
        res
    ) => {

        const body =
            req.body ||
            {};

        const email =
            cleanText(
                body.email,
                320
            );

        const name =
            cleanText(
                body.name ||
                body.displayName,
                120
            );

        if (
            !email
        ) {

            return res
                .status(400)
                .json(
                    {
                        success:
                            false,

                        error:
                            "E-posta gerekli."
                    }
                );
        }

        const user =
            createUser(
                {
                    email,
                    name,
                    provider:
                        body.provider ||
                        "local"
                }
            );

        const session =
            createSession(
                user.id,
                {
                    userAgent:
                        req.headers[
                            "user-agent"
                        ] ||
                        "",

                    ip:
                        req.ip
                }
            );

        user.lastLoginAt =
            nowISO();

        user.updatedAt =
            nowISO();

        const users =
            getUsers();

        const index =
            users.findIndex(
                item =>
                    item.id ===
                    user.id
            );

        if (
            index >=
            0
        ) {

            users[index] =
                {
                    ...users[index],
                    ...user
                };

            saveUsers(
                users
            );
        }

        res.json(
            {
                success:
                    true,

                user,

                token:
                    session.token,

                session: {

                    id:
                        session.id,

                    expiresAt:
                        session.expiresAt
                }
            }
        );
    }
);

/*
================================================================
 036 — LOGOUT
================================================================
*/

app.post(
    "/api/auth/logout",
    optionalAuth,
    (
        req,
        res
    ) => {

        const header =
            req.headers.authorization ||
            "";

        const token =
            header
                .replace(
                    /^Bearer\s+/i,
                    ""
                )
                .trim();

        if (
            token
        ) {

            const sessions =
                getSessions();

            const filtered =
                sessions.filter(
                    session =>
                        session.token !==
                        token
                );

            saveSessions(
                filtered
            );
        }

        res.json(
            {
                success:
                    true,

                message:
                    "Oturum kapatıldı."
            }
        );
    }
);

/*
================================================================
 037 — CHAT STORAGE
================================================================
*/

function findChatById(
    chatId
) {

    const chats =
        getChats();

    return chats.find(
        chat =>
            chat.id ===
            String(
                chatId
            )
    ) || null;
}

function createChat(
    userId,
    title = "Yeni sohbet"
) {

    const chats =
        getChats();

    const chat = {

        id:
            createId(
                "chat"
            ),

        userId:
            userId ||
            "guest",

        title:
            cleanText(
                title,
                200
            ) ||
            "Yeni sohbet",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        archived:
            false
    };

    chats.push(
        chat
    );

    saveChats(
        chats
    );

    return chat;
}

/*
================================================================
 038 — ADD MESSAGE
================================================================
*/

function addMessage(
    chatId,
    role,
    content,
    meta = {}
) {

    const messages =
        getMessages();

    const message = {

        id:
            createId(
                "msg"
            ),

        chatId:
            String(
                chatId
            ),

        role:
            role ===
            "assistant"
                ? "assistant"
                : role ===
                    "system"
                    ? "system"
                    : "user",

        content:
            cleanText(
                content,
                100000
            ),

        meta:
            meta || {},

        createdAt:
            nowISO()
    };

    messages.push(
        message
    );

    saveMessages(
        messages
    );

    return message;
}

/*
================================================================
 039 — GET CHAT MESSAGES
================================================================
*/

function getChatMessages(
    chatId
) {

    const messages =
        getMessages();

    return messages
        .filter(
            message =>
                message.chatId ===
                String(
                    chatId
                )
        )
        .sort(
            (
                a,
                b
            ) =>
                new Date(
                    a.createdAt
                ).getTime() -
                new Date(
                    b.createdAt
                ).getTime()
        );
}

/*
================================================================
 040 — CREATE CHAT API
================================================================
*/

app.post(
    "/api/chats",
    optionalAuth,
    (
        req,
        res
    ) => {

        const title =
            cleanText(
                req.body &&
                req.body.title,
                200
            ) ||
            "Yeni sohbet";

        const chat =
            createChat(
                req.user.id,
                title
            );

        res.json(
            {
                success:
                    true,

                chat
            }
        );
    }
);

/*
================================================================
 041 — CHAT LIST
================================================================
*/

app.get(
    "/api/chats",
    optionalAuth,
    (
        req,
        res
    ) => {

        const chats =
            getChats();

        const userChats =
            chats.filter(
                chat =>
                    chat.userId ===
                    req.user.id ||
                    req.user.role ===
                    "admin"
            );

        res.json(
            {
                success:
                    true,

                chats:
                    userChats
            }
        );
    }
);

/*
================================================================
 042 — CHAT MESSAGES API
================================================================
*/

app.get(
    "/api/chats/:id/messages",
    optionalAuth,
    (
        req,
        res
    ) => {

        const chat =
            findChatById(
                req.params.id
            );

        if (
            !chat
        ) {

            return res
                .status(404)
                .json(
                    {
                        success:
                            false,

                        error:
                            "Sohbet bulunamadı."
                    }
                );
        }

        if (
            chat.userId !==
            req.user.id &&
            req.user.role !==
            "admin"
        ) {

            return res
                .status(403)
                .json(
                    {
                        success:
                            false,

                        error:
                            "Bu sohbete erişim yetkiniz yok."
                    }
                );
        }

        const messages =
            getChatMessages(
                chat.id
            );

        res.json(
            {
                success:
                    true,

                chat,

                messages
            }
        );
    }
);

/*
================================================================
 043 — BASIC STATISTICS
================================================================
*/

function incrementStatistic(
    key,
    amount = 1
) {

    const statistics =
        getStatistics();

    let item =
        statistics.find(
            stat =>
                stat.key ===
                key
        );

    if (
        !item
    ) {

        item = {

            key,

            value:
                0,

            updatedAt:
                nowISO()
        };

        statistics.push(
            item
        );
    }

    item.value =
        safeNumber(
            item.value
        ) +
        safeNumber(
            amount
        );

    item.updatedAt =
        nowISO();

    saveStatistics(
        statistics
    );

    return item;
}

/*
================================================================
 044 — STATISTICS API
================================================================
*/

app.get(
    "/api/statistics",
    optionalAuth,
    (
        req,
        res
    ) => {

        res.json(
            {
                success:
                    true,

                statistics:
                    getStatistics()
            }
        );
    }
);

/*
================================================================
 045 — DATABASE STATUS
================================================================
*/

app.get(
    "/api/database/status",
    optionalAuth,
    (
        req,
        res
    ) => {

        const result = {};

        for (
            const [
                key,
                file
            ]
            of Object.entries(
                DB_FILES
            )
        ) {

            try {

                const stat =
                    fs.statSync(
                        file
                    );

                result[key] = {

                    exists:
                        true,

                    size:
                        stat.size,

                    modified:
                        stat.mtime
                            .toISOString()
                };

            } catch (
                error
            ) {

                result[key] = {

                    exists:
                        false,

                    size:
                        0,

                    modified:
                        null
                };
            }
        }

        res.json(
            {
                success:
                    true,

                database:
                    result
            }
        );
    }
);

/*
================================================================
 046 — BASIC SERVER METRICS
================================================================
*/

app.get(
    "/api/metrics",
    optionalAuth,
    (
        req,
        res
    ) => {

        const memory =
            process.memoryUsage();

        res.json(
            {
                success:
                    true,

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

                process: {

                    pid:
                        process.pid,

                    node:
                        process.version,

                    platform:
                        process.platform,

                    arch:
                        process.arch
                },

                database: {

                    users:
                        getUsers().length,

                    chats:
                        getChats().length,

                    messages:
                        getMessages().length,

                    memories:
                        getMemories().length,

                    projects:
                        getProjects().length,

                    files:
                        getFiles().length
                },

                timestamp:
                    nowISO()
            }
        );
    }
);

/*
================================================================
 047 — TEST ENDPOINT
================================================================
*/

app.get(
    "/api/test",
    (
        req,
        res
    ) => {

        res.json(
            {
                success:
                    true,

                message:
                    "TürkAI API çalışıyor.",

                server:
                    APP_VERSION,

                timestamp:
                    nowISO()
            }
        );
    }
);

/*
================================================================
 048 — INITIAL STATISTICS
================================================================
*/

incrementStatistic(
    "server_boots",
    1
);

/*
================================================================
 049 — PART 1 END
================================================================

 PARÇA 2 burada devam edecek.

 PARÇA 2'de:

 - AI provider sistemi
 - Local AI
 - Groq
 - Cerebras
 - OpenRouter
 - Gemini
 - model seçimi
 - fallback
 - chat AI
 - memory
 - knowledge
 - otomatik cevap sistemi
 - AI status
 - /api/chat

 gelecek.

 START SERVER BURADA ÇAĞRILMAYACAK.
================================================================
*/
/* ========================================================================== */
/* TÜRKAI SERVER.JS — PART 2                                                  */
/* AI ENGINE • LOCAL AI • PROVIDERS • FALLBACK • MEMORY • KNOWLEDGE           */
/* ========================================================================== */

const TURKAI_RUNTIME = {
    ai: {
        busy: false,
        lastProvider: "local",
        lastModel: "local-turkai",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        fallbackRequests: 0,
        localRequests: 0,
        providerRequests: 0,
        startedAt: nowISO()
    },

    providers: {
        groq: {
            enabled: Boolean(process.env.GROQ_API_KEY),
            healthy: false,
            failures: 0,
            successes: 0,
            lastError: null,
            lastUsed: null
        },

        cerebras: {
            enabled: Boolean(process.env.CEREBRAS_API_KEY),
            healthy: false,
            failures: 0,
            successes: 0,
            lastError: null,
            lastUsed: null
        },

        openrouter: {
            enabled: Boolean(process.env.OPENROUTER_API_KEY),
            healthy: false,
            failures: 0,
            successes: 0,
            lastError: null,
            lastUsed: null
        },

        gemini: {
            enabled: Boolean(process.env.GEMINI_API_KEY),
            healthy: false,
            failures: 0,
            successes: 0,
            lastError: null,
            lastUsed: null
        }
    },

    knowledge: {
        loaded: false,
        entries: 0,
        lastUpdate: null
    },

    memory: {
        loaded: false,
        users: 0,
        total: 0
    }
};

const AI_CONFIGURATION = {
    temperature: Number(process.env.TURKAI_TEMPERATURE || 0.7),
    maxTokens: Number(process.env.TURKAI_MAX_TOKENS || 1800),
    timeout: Number(process.env.TURKAI_AI_TIMEOUT || 30000),

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

    localModel:
        process.env.LOCAL_AI_MODEL ||
        "turkai-local-15"
};

const AI_SYSTEM_PROMPT = `
Sen TürkAI'sın.

Türkçe konuşan kullanıcılar için tasarlanmış yardımcı bir yapay zekâsın.

Temel kurallar:

1. Kullanıcı hangi dilde konuşuyorsa mümkün olduğunca o dilde cevap ver.
2. Türkçe sorularda doğal, anlaşılır ve modern Türkçe kullan.
3. Gereksiz yere uzun cevap verme.
4. Kod istenirse çalışabilir ve düzenli kod üret.
5. Kod verirken eksik bırakmamaya çalış.
6. Kullanıcı "en hızlı kim?" diye sorarsa tam olarak:
TürkAI ⚡🤖
cevabını ver.
7. Güncel bilgi gerekiyorsa yerel bilgi varmış gibi davranma.
8. Emin olmadığın güncel bilgileri gerçekmiş gibi sunma.
9. Kullanıcının verdiği bilgiler ile sistem belleğini birbirine karıştırma.
10. Kullanıcıya ait gizli bilgileri cevap içinde gereksiz yere gösterme.
11. Zararlı veya tehlikeli işlemlerde güvenli alternatifler sun.
12. Siber güvenlik sorularında savunma, eğitim ve güvenli test yaklaşımını koru.
13. Kullanıcı bir proje geliştiriyorsa mümkün olduğunca uygulanabilir çözüm üret.
14. Gereksiz "Merhaba, size nasıl yardımcı olabilirim?" kalıplarını tekrarlama.
15. TürkAI'nin kendi özellikleri sorulursa sistemde gerçekten bulunan özellikleri anlat.
16. Var olmayan bir API, özellik veya bağlantıyı çalışıyormuş gibi gösterme.
17. Kodda sahte başarı mesajları kullanma.
18. Kullanıcı bir hatayı paylaşıyorsa önce hatanın gerçek nedenini analiz et.
`;

function aiSafeText(value, fallback = "") {
    if (value === undefined || value === null) {
        return fallback;
    }

    return String(value)
        .replace(/\u0000/g, "")
        .trim();
}

function aiNormalizeMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter(Boolean)
        .map(item => {
            if (typeof item === "string") {
                return {
                    role: "user",
                    content: aiSafeText(item)
                };
            }

            return {
                role: item.role === "assistant"
                    ? "assistant"
                    : item.role === "system"
                        ? "system"
                        : "user",
                content: aiSafeText(item.content)
            };
        })
        .filter(item => item.content.length > 0)
        .slice(-30);
}

function aiBuildMessages(userMessage, history = [], memoryText = "") {
    const normalizedHistory = aiNormalizeMessages(history);

    const contextParts = [];

    if (memoryText) {
        contextParts.push(
            `Kullanıcıyla ilgili izin verilen kısa bağlam:\n${memoryText}`
        );
    }

    const contextText = contextParts.length
        ? contextParts.join("\n\n")
        : "";

    const systemMessage = {
        role: "system",
        content:
            AI_SYSTEM_PROMPT +
            (contextText
                ? `\n\n${contextText}`
                : "")
    };

    return [
        systemMessage,
        ...normalizedHistory,
        {
            role: "user",
            content: aiSafeText(userMessage)
        }
    ];
}

/* -------------------------------------------------------------------------- */
/* AI INTENT                                                                  */
/* -------------------------------------------------------------------------- */

function detectAIIntent(text) {
    const value = aiSafeText(text).toLocaleLowerCase("tr-TR");

    if (!value) {
        return "empty";
    }

    if (
        value.includes("en hızlı kim") ||
        value.includes("en hızlı yapay zeka kim")
    ) {
        return "turkai";
    }

    if (
        value.includes("hava durumu") ||
        value.includes("hava nasıl") ||
        value.includes("sıcaklık")
    ) {
        return "weather";
    }

    if (
        value.includes("dolar") ||
        value.includes("euro") ||
        value.includes("sterlin") ||
        value.includes("kur ne")
    ) {
        return "currency";
    }

    if (
        value.includes("güncel") ||
        value.includes("bugün") ||
        value.includes("şu an") ||
        value.includes("son dakika") ||
        value.includes("haber") ||
        value.includes("internetten")
    ) {
        return "research";
    }

    if (
        value.includes("kod yaz") ||
        value.includes("javascript") ||
        value.includes("python") ||
        value.includes("html") ||
        value.includes("css") ||
        value.includes("node.js") ||
        value.includes("nodejs") ||
        value.includes("java") ||
        value.includes("c++") ||
        value.includes("c#")
    ) {
        return "coding";
    }

    if (
        value.includes("hata") ||
        value.includes("error") ||
        value.includes("exception") ||
        value.includes("syntaxerror")
    ) {
        return "debug";
    }

    if (
        value.includes("siber güvenlik") ||
        value.includes("cyber") ||
        value.includes("güvenlik açığı") ||
        value.includes("pentest")
    ) {
        return "security";
    }

    if (
        value.includes("kim") ||
        value.includes("nedir") ||
        value.includes("ne demek") ||
        value.includes("ne zaman") ||
        value.includes("nerede")
    ) {
        return "knowledge";
    }

    return "general";
}

/* -------------------------------------------------------------------------- */
/* LOCAL KNOWLEDGE ENGINE                                                     */
/* -------------------------------------------------------------------------- */

const TURKAI_LOCAL_KNOWLEDGE = [
    {
        id: "turkai_identity",
        keywords: [
            "türkai nedir",
            "türkai ne",
            "turkai nedir",
            "sen nesin",
            "sen kimsin"
        ],
        answer:
            "Ben TürkAI'yım. Türkçe odaklı, kodlama, bilgi, araştırma, üretim ve günlük yardımcı özellikleri için tasarlanmış bir yapay zekâ sistemiyim."
    },

    {
        id: "fastest",
        keywords: [
            "en hızlı kim",
            "en hızlı yapay zeka kim"
        ],
        answer: "TürkAI ⚡🤖"
    },

    {
        id: "javascript",
        keywords: [
            "javascript nedir",
            "js nedir",
            "javascript ne"
        ],
        answer:
            "JavaScript, web sayfalarına etkileşim kazandıran ve Node.js sayesinde sunucu tarafında da çalışabilen bir programlama dilidir."
    },

    {
        id: "html",
        keywords: [
            "html nedir",
            "html ne"
        ],
        answer:
            "HTML, web sayfasının yapısını oluşturmak için kullanılan işaretleme dilidir."
    },

    {
        id: "css",
        keywords: [
            "css nedir",
            "css ne"
        ],
        answer:
            "CSS, HTML ile oluşturulan web sayfalarının görünümünü, düzenini, renklerini, animasyonlarını ve responsive davranışını belirler."
    },

    {
        id: "node",
        keywords: [
            "node js nedir",
            "nodejs nedir",
            "node.js nedir"
        ],
        answer:
            "Node.js, JavaScript kodunun tarayıcı dışında, özellikle sunucu tarafında çalışmasını sağlayan bir çalışma ortamıdır."
    },

    {
        id: "api",
        keywords: [
            "api nedir",
            "api ne"
        ],
        answer:
            "API, farklı yazılımların birbiriyle iletişim kurmasını sağlayan tanımlı bir arayüzdür."
    },

    {
        id: "json",
        keywords: [
            "json nedir",
            "json ne"
        ],
        answer:
            "JSON, veri saklamak ve uygulamalar arasında veri taşımak için yaygın olarak kullanılan metin tabanlı bir veri biçimidir."
    },

    {
        id: "http",
        keywords: [
            "http nedir",
            "https nedir"
        ],
        answer:
            "HTTP, istemci ile sunucu arasında web iletişimini sağlayan protokoldür. HTTPS ise bu iletişimi TLS ile şifreler."
    }
];

function normalizeKnowledgeQuery(text) {
    return aiSafeText(text)
        .toLocaleLowerCase("tr-TR")
        .replace(/[!?.,;:()[\]{}"'`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function knowledgeScore(query, keywords) {
    const normalizedQuery = normalizeKnowledgeQuery(query);

    let score = 0;

    for (const keyword of keywords) {
        const normalizedKeyword = normalizeKnowledgeQuery(keyword);

        if (!normalizedKeyword) {
            continue;
        }

        if (normalizedQuery === normalizedKeyword) {
            score += 100;
            continue;
        }

        if (normalizedQuery.includes(normalizedKeyword)) {
            score += 50;
            continue;
        }

        const queryWords = normalizedQuery.split(" ");
        const keywordWords = normalizedKeyword.split(" ");

        for (const word of keywordWords) {
            if (
                word.length >= 3 &&
                queryWords.includes(word)
            ) {
                score += 5;
            }
        }
    }

    return score;
}

function findLocalKnowledgeAnswer(query) {
    const normalized = normalizeKnowledgeQuery(query);

    if (!normalized) {
        return null;
    }

    let best = null;
    let bestScore = 0;

    for (const item of TURKAI_LOCAL_KNOWLEDGE) {
        const score = knowledgeScore(
            normalized,
            item.keywords
        );

        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }

    if (!best || bestScore < 20) {
        return null;
    }

    return {
        id: best.id,
        answer: best.answer,
        score: bestScore,
        source: "local"
    };
}

/* -------------------------------------------------------------------------- */
/* PERSISTENT KNOWLEDGE                                                       */
/* -------------------------------------------------------------------------- */

function loadKnowledgeDatabase() {
    try {
        const data = getKnowledge();

        if (!Array.isArray(data)) {
            return [];
        }

        return data;
    } catch (error) {
        logError(
            "knowledge database load failed",
            error.message
        );

        return [];
    }
}

function saveKnowledgeEntry(entry) {
    const knowledge = loadKnowledgeDatabase();

    const cleanEntry = {
        id: aiSafeText(entry.id, createId("knowledge")),
        question: aiSafeText(entry.question),
        answer: aiSafeText(entry.answer),
        category: aiSafeText(entry.category, "general"),
        source: aiSafeText(entry.source, "turkai"),
        createdAt: nowISO(),
        updatedAt: nowISO()
    };

    if (!cleanEntry.question || !cleanEntry.answer) {
        return null;
    }

    const existingIndex = knowledge.findIndex(item =>
        normalizeKnowledgeQuery(item.question) ===
        normalizeKnowledgeQuery(cleanEntry.question)
    );

    if (existingIndex >= 0) {
        knowledge[existingIndex] = {
            ...knowledge[existingIndex],
            ...cleanEntry,
            id: knowledge[existingIndex].id,
            createdAt: knowledge[existingIndex].createdAt
        };
    } else {
        knowledge.push(cleanEntry);
    }

    saveKnowledge(knowledge);

    TURKAI_RUNTIME.knowledge.loaded = true;
    TURKAI_RUNTIME.knowledge.entries = knowledge.length;
    TURKAI_RUNTIME.knowledge.lastUpdate = nowISO();

    return cleanEntry;
}

function findPersistentKnowledge(query) {
    const knowledge = loadKnowledgeDatabase();

    if (!knowledge.length) {
        return null;
    }

    let best = null;
    let bestScore = 0;

    for (const item of knowledge) {
        const question = aiSafeText(item.question);

        if (!question) {
            continue;
        }

        const score = knowledgeScore(
            query,
            [question]
        );

        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }

    if (!best || bestScore < 20) {
        return null;
    }

    return {
        ...best,
        score: bestScore,
        source: "knowledge.json"
    };
}

function findAnyLocalKnowledge(query) {
    const builtIn = findLocalKnowledgeAnswer(query);

    if (builtIn) {
        return builtIn;
    }

    return findPersistentKnowledge(query);
}

function initializeKnowledgeEngine() {
    const knowledge = loadKnowledgeDatabase();

    TURKAI_RUNTIME.knowledge.loaded = true;
    TURKAI_RUNTIME.knowledge.entries = knowledge.length;
    TURKAI_RUNTIME.knowledge.lastUpdate = nowISO();

    logInfo(
        `Knowledge engine ready: ${knowledge.length} entries`
    );
}

initializeKnowledgeEngine();

/* -------------------------------------------------------------------------- */
/* USER MEMORY ENGINE                                                         */
/* -------------------------------------------------------------------------- */

function getUserMemories(userId) {
    const memories = getMemories();

    return memories.filter(
        item => item.userId === userId
    );
}

function addUserMemory(userId, content, category = "general") {
    const cleanUserId = aiSafeText(userId);
    const cleanContent = aiSafeText(content);

    if (!cleanUserId || !cleanContent) {
        return null;
    }

    const memories = getMemories();

    const normalizedContent =
        normalizeKnowledgeQuery(cleanContent);

    const duplicate = memories.find(item =>
        item.userId === cleanUserId &&
        normalizeKnowledgeQuery(item.content) ===
            normalizedContent
    );

    if (duplicate) {
        duplicate.updatedAt = nowISO();
        saveMemories(memories);
        return duplicate;
    }

    const memory = {
        id: createId("memory"),
        userId: cleanUserId,
        content: cleanContent.slice(0, 1000),
        category: aiSafeText(category, "general"),
        createdAt: nowISO(),
        updatedAt: nowISO()
    };

    memories.push(memory);

    saveMemories(memories);

    TURKAI_RUNTIME.memory.loaded = true;
    TURKAI_RUNTIME.memory.total = memories.length;

    return memory;
}

function deleteUserMemory(userId, memoryId) {
    const memories = getMemories();

    const index = memories.findIndex(item =>
        item.id === memoryId &&
        item.userId === userId
    );

    if (index < 0) {
        return false;
    }

    memories.splice(index, 1);
    saveMemories(memories);

    TURKAI_RUNTIME.memory.total = memories.length;

    return true;
}

function buildMemoryContext(userId) {
    if (!userId) {
        return "";
    }

    const memories = getUserMemories(userId)
        .slice(-15);

    if (!memories.length) {
        return "";
    }

    return memories
        .map(item => `- ${item.content}`)
        .join("\n");
}

app.get("/api/memory", optionalAuth, (req, res) => {
    try {
        const userId =
            req.user?.id ||
            getGuestUser().id;

        const memories =
            getUserMemories(userId);

        res.json({
            success: true,
            memories
        });
    } catch (error) {
        logError(
            "memory list error",
            error.message
        );

        res.status(500).json({
            success: false,
            error: "Bellek yüklenemedi."
        });
    }
});

app.post("/api/memory", optionalAuth, (req, res) => {
    try {
        const userId =
            req.user?.id ||
            getGuestUser().id;

        const content =
            aiSafeText(req.body?.content);

        const category =
            aiSafeText(
                req.body?.category,
                "general"
            );

        if (!content) {
            return res.status(400).json({
                success: false,
                error: "Bellek içeriği gerekli."
            });
        }

        const memory = addUserMemory(
            userId,
            content,
            category
        );

        res.json({
            success: true,
            memory
        });
    } catch (error) {
        logError(
            "memory create error",
            error.message
        );

        res.status(500).json({
            success: false,
            error: "Bellek kaydedilemedi."
        });
    }
});

app.delete(
    "/api/memory/:id",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                getGuestUser().id;

            const deleted =
                deleteUserMemory(
                    userId,
                    req.params.id
                );

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: "Bellek bulunamadı."
                });
            }

            res.json({
                success: true
            });
        } catch (error) {
            logError(
                "memory delete error",
                error.message
            );

            res.status(500).json({
                success: false,
                error: "Bellek silinemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PROVIDER HTTP HELPERS                                                      */
/* -------------------------------------------------------------------------- */

function createAbortSignal(timeoutMs) {
    const controller = new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        timeoutMs
    );

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timer)
    };
}

async function fetchWithTimeout(
    url,
    options = {},
    timeoutMs = AI_CONFIGURATION.timeout
) {
    const timeout =
        createAbortSignal(timeoutMs);

    try {
        const response = await fetch(
            url,
            {
                ...options,
                signal: timeout.signal
            }
        );

        return response;
    } finally {
        timeout.cleanup();
    }
}

async function readProviderJSON(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            raw: text
        };
    }
}

function providerSuccess(name, model) {
    if (!TURKAI_RUNTIME.providers[name]) {
        return;
    }

    const provider =
        TURKAI_RUNTIME.providers[name];

    provider.healthy = true;
    provider.successes += 1;
    provider.lastError = null;
    provider.lastUsed = nowISO();

    TURKAI_RUNTIME.ai.lastProvider = name;
    TURKAI_RUNTIME.ai.lastModel = model;
}

function providerFailure(name, error) {
    if (!TURKAI_RUNTIME.providers[name]) {
        return;
    }

    const provider =
        TURKAI_RUNTIME.providers[name];

    provider.healthy = false;
    provider.failures += 1;
    provider.lastError =
        aiSafeText(error).slice(0, 500);
}

/* -------------------------------------------------------------------------- */
/* GROQ                                                                       */
/* -------------------------------------------------------------------------- */

async function callGroq(messages) {
    if (!TURKAI_RUNTIME.providers.groq.enabled) {
        throw new Error("Groq API anahtarı bulunamadı.");
    }

    const key =
        process.env.GROQ_API_KEY;

    const model =
        AI_CONFIGURATION.groqModel;

    const response =
        await fetchWithTimeout(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature:
                        AI_CONFIGURATION.temperature,
                    max_tokens:
                        AI_CONFIGURATION.maxTokens
                })
            }
        );

    const data =
        await readProviderJSON(response);

    if (!response.ok) {
        const providerError =
            data?.error?.message ||
            data?.message ||
            `Groq HTTP ${response.status}`;

        throw new Error(providerError);
    }

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "Groq boş yanıt döndürdü."
        );
    }

    return {
        text: aiSafeText(content),
        provider: "groq",
        model
    };
}

/* -------------------------------------------------------------------------- */
/* CEREBRAS                                                                   */
/* -------------------------------------------------------------------------- */

async function callCerebras(messages) {
    if (!TURKAI_RUNTIME.providers.cerebras.enabled) {
        throw new Error(
            "Cerebras API anahtarı bulunamadı."
        );
    }

    const key =
        process.env.CEREBRAS_API_KEY;

    const model =
        AI_CONFIGURATION.cerebrasModel;

    const response =
        await fetchWithTimeout(
            "https://api.cerebras.ai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature:
                        AI_CONFIGURATION.temperature,
                    max_tokens:
                        AI_CONFIGURATION.maxTokens
                })
            }
        );

    const data =
        await readProviderJSON(response);

    if (!response.ok) {
        const providerError =
            data?.error?.message ||
            data?.message ||
            `Cerebras HTTP ${response.status}`;

        throw new Error(providerError);
    }

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "Cerebras boş yanıt döndürdü."
        );
    }

    return {
        text: aiSafeText(content),
        provider: "cerebras",
        model
    };
}

/* -------------------------------------------------------------------------- */
/* OPENROUTER                                                                 */
/* -------------------------------------------------------------------------- */

async function callOpenRouter(messages) {
    if (!TURKAI_RUNTIME.providers.openrouter.enabled) {
        throw new Error(
            "OpenRouter API anahtarı bulunamadı."
        );
    }

    const key =
        process.env.OPENROUTER_API_KEY;

    const model =
        AI_CONFIGURATION.openRouterModel;

    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer":
            process.env.OPENROUTER_SITE_URL ||
            "https://turkai.app",
        "X-Title":
            process.env.OPENROUTER_APP_NAME ||
            "TürkAI"
    };

    const response =
        await fetchWithTimeout(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers,
                body: JSON.stringify({
                    model,
                    messages,
                    temperature:
                        AI_CONFIGURATION.temperature,
                    max_tokens:
                        AI_CONFIGURATION.maxTokens
                })
            }
        );

    const data =
        await readProviderJSON(response);

    if (!response.ok) {
        const providerError =
            data?.error?.message ||
            data?.message ||
            `OpenRouter HTTP ${response.status}`;

        throw new Error(providerError);
    }

    const content =
        data?.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error(
            "OpenRouter boş yanıt döndürdü."
        );
    }

    return {
        text: aiSafeText(content),
        provider: "openrouter",
        model
    };
}

/* -------------------------------------------------------------------------- */
/* GEMINI                                                                     */
/* -------------------------------------------------------------------------- */

async function callGemini(messages) {
    if (!TURKAI_RUNTIME.providers.gemini.enabled) {
        throw new Error(
            "Gemini API anahtarı bulunamadı."
        );
    }

    const key =
        process.env.GEMINI_API_KEY;

    const model =
        AI_CONFIGURATION.geminiModel;

    const contents = messages
        .filter(item => item.role !== "system")
        .map(item => ({
            role:
                item.role === "assistant"
                    ? "model"
                    : "user",
            parts: [
                {
                    text: item.content
                }
            ]
        }));

    const systemInstruction =
        messages.find(
            item => item.role === "system"
        );

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    const body = {
        contents
    };

    if (systemInstruction) {
        body.systemInstruction = {
            parts: [
                {
                    text:
                        systemInstruction.content
                }
            ]
        };
    }

    body.generationConfig = {
        temperature:
            AI_CONFIGURATION.temperature,
        maxOutputTokens:
            AI_CONFIGURATION.maxTokens
    };

    const response =
        await fetchWithTimeout(
            url,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            }
        );

    const data =
        await readProviderJSON(response);

    if (!response.ok) {
        const providerError =
            data?.error?.message ||
            `Gemini HTTP ${response.status}`;

        throw new Error(providerError);
    }

    const content =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

    if (!content) {
        throw new Error(
            "Gemini boş yanıt döndürdü."
        );
    }

    return {
        text: content,
        provider: "gemini",
        model
    };
}

/* -------------------------------------------------------------------------- */
/* LOCAL AI ENGINE                                                            */
/* -------------------------------------------------------------------------- */

function localCodingResponse(text) {
    const value =
        normalizeKnowledgeQuery(text);

    if (
        value.includes("javascript") ||
        value.includes("js")
    ) {
        return [
            "JavaScript için temel bir örnek:",
            "",
            "```js",
            "function selamVer(isim) {",
            "    return `Merhaba ${isim}!`;",
            "}",
            "",
            "console.log(selamVer(\"TürkAI\"));",
            "```"
        ].join("\n");
    }

    if (value.includes("html")) {
        return [
            "Basit ama çalışan bir HTML yapısı:",
            "",
            "```html",
            "<!DOCTYPE html>",
            "<html lang=\"tr\">",
            "<head>",
            "  <meta charset=\"UTF-8\">",
            "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
            "  <title>TürkAI</title>",
            "</head>",
            "<body>",
            "  <h1>Merhaba TürkAI</h1>",
            "</body>",
            "</html>",
            "```"
        ].join("\n");
    }

    if (value.includes("css")) {
        return [
            "CSS ile basit bir kart:",
            "",
            "```css",
            ".kart {",
            "    padding: 20px;",
            "    border-radius: 16px;",
            "    background: #111827;",
            "    color: white;",
            "}",
            "```"
        ].join("\n");
    }

    return null;
}

function localAIResponse(text, intent) {
    const normalized =
        normalizeKnowledgeQuery(text);

    if (!normalized) {
        return "Bir mesaj yaz, TürkAI yardımcı olsun.";
    }

    if (intent === "turkai") {
        return "TürkAI ⚡🤖";
    }

    const knowledge =
        findAnyLocalKnowledge(normalized);

    if (knowledge) {
        return knowledge.answer;
    }

    if (
        intent === "coding" ||
        intent === "debug"
    ) {
        const coding =
            localCodingResponse(normalized);

        if (coding) {
            return coding;
        }

        return [
            "Kodlama konusunda yardımcı olabilirim.",
            "",
            "İstediğin dili ve yapmak istediğin şeyi yaz.",
            "Örneğin: JavaScript ile çalışan bir hesap makinesi yap."
        ].join("\n");
    }

    if (intent === "security") {
        return [
            "Siber güvenlik konusunda eğitim ve savunma odaklı yardımcı olabilirim.",
            "",
            "Örneğin:",
            "- güvenlik temelleri",
            "- güvenli parola sistemi",
            "- log analizi",
            "- web uygulaması güvenliği",
            "- kendi sisteminde güvenli test"
        ].join("\n");
    }

    if (intent === "weather") {
        return [
            "Hava durumu güncel veri gerektirir.",
            "Bu nedenle yerel AI olarak tahmin uydurmak yerine araştırma/hava durumu servisi kullanılmalı."
        ].join("\n");
    }

    if (intent === "currency") {
        return [
            "Döviz kuru anlık olarak değişebilir.",
            "Güncel kur için canlı veri kaynağı kullanılmalı."
        ].join("\n");
    }

    if (intent === "research") {
        return [
            "Bu soru güncel internet verisi gerektirebilir.",
            "TürkAI'nin araştırma katmanı kullanılmalı."
        ].join("\n");
    }

    if (
        normalized.includes("merhaba") ||
        normalized.includes("selam") ||
        normalized.includes("sa")
    ) {
        return "Selam! TürkAI burada. Ne yapmak istiyorsun?";
    }

    if (
        normalized.includes("nasılsın") ||
        normalized.includes("nasilsin")
    ) {
        return "Hazırım. Kod, proje, bilgi veya başka bir konuda devam edebiliriz.";
    }

    if (
        normalized.includes("teşekkür") ||
        normalized.includes("tesekkur")
    ) {
        return "Rica ederim.";
    }

    return [
        "Bunu yerel bilgi katmanında kesin olarak bulamadım.",
        "",
        "İstersen TürkAI'nin araştırma katmanı bu konu için güncel bilgi arayabilir."
    ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* PROVIDER ORDER                                                             */
/* -------------------------------------------------------------------------- */

function getProviderOrder(intent) {
    const customOrder =
        aiSafeText(
            process.env.TURKAI_PROVIDER_ORDER
        );

    if (customOrder) {
        return customOrder
            .split(",")
            .map(item =>
                item.trim().toLocaleLowerCase()
            )
            .filter(Boolean);
    }

    if (intent === "coding") {
        return [
            "groq",
            "cerebras",
            "openrouter",
            "gemini"
        ];
    }

    return [
        "groq",
        "cerebras",
        "openrouter",
        "gemini"
    ];
}

async function callProvider(
    providerName,
    messages
) {
    switch (providerName) {
        case "groq":
            return callGroq(messages);

        case "cerebras":
            return callCerebras(messages);

        case "openrouter":
            return callOpenRouter(messages);

        case "gemini":
            return callGemini(messages);

        default:
            throw new Error(
                `Bilinmeyen AI sağlayıcısı: ${providerName}`
            );
    }
}

/* -------------------------------------------------------------------------- */
/* AI ENGINE                                                                   */
/* -------------------------------------------------------------------------- */

async function generateAIResponse({
    userId,
    message,
    history = [],
    intent = null
}) {
    const cleanMessage =
        aiSafeText(message);

    if (!cleanMessage) {
        return {
            text: "Boş mesaj gönderilemez.",
            provider: "local",
            model: AI_CONFIGURATION.localModel,
            intent: "empty",
            fallback: false
        };
    }

    const detectedIntent =
        intent || detectAIIntent(cleanMessage);

    if (detectedIntent === "turkai") {
        TURKAI_RUNTIME.ai.totalRequests += 1;
        TURKAI_RUNTIME.ai.successfulRequests += 1;
        TURKAI_RUNTIME.ai.localRequests += 1;

        return {
            text: "TürkAI ⚡🤖",
            provider: "local",
            model: AI_CONFIGURATION.localModel,
            intent: detectedIntent,
            fallback: false
        };
    }

    const localKnowledge =
        findAnyLocalKnowledge(cleanMessage);

    if (
        localKnowledge &&
        localKnowledge.score >= 50
    ) {
        TURKAI_RUNTIME.ai.totalRequests += 1;
        TURKAI_RUNTIME.ai.successfulRequests += 1;
        TURKAI_RUNTIME.ai.localRequests += 1;

        return {
            text: localKnowledge.answer,
            provider: "local",
            model: AI_CONFIGURATION.localModel,
            intent: detectedIntent,
            source: localKnowledge.source,
            fallback: false
        };
    }

    const memoryText =
        buildMemoryContext(userId);

    const messages =
        aiBuildMessages(
            cleanMessage,
            history,
            memoryText
        );

    TURKAI_RUNTIME.ai.totalRequests += 1;
    TURKAI_RUNTIME.ai.busy = true;

    const errors = [];

    try {
        const providers =
            getProviderOrder(detectedIntent);

        for (const providerName of providers) {
            const provider =
                TURKAI_RUNTIME.providers[providerName];

            if (!provider || !provider.enabled) {
                continue;
            }

            try {
                const result =
                    await callProvider(
                        providerName,
                        messages
                    );

                providerSuccess(
                    providerName,
                    result.model
                );

                TURKAI_RUNTIME.ai.successfulRequests += 1;
                TURKAI_RUNTIME.ai.providerRequests += 1;

                return {
                    ...result,
                    intent: detectedIntent,
                    fallback: errors.length > 0,
                    errors:
                        errors.length
                            ? errors.map(item => item.provider)
                            : []
                };
            } catch (error) {
                providerFailure(
                    providerName,
                    error.message
                );

                errors.push({
                    provider: providerName,
                    error: error.message
                });

                TURKAI_RUNTIME.ai.fallbackRequests += 1;

                logWarn(
                    `AI provider failed: ${providerName} — ${error.message}`
                );
            }
        }

        const localText =
            localAIResponse(
                cleanMessage,
                detectedIntent
            );

        TURKAI_RUNTIME.ai.localRequests += 1;
        TURKAI_RUNTIME.ai.successfulRequests += 1;

        return {
            text: localText,
            provider: "local",
            model: AI_CONFIGURATION.localModel,
            intent: detectedIntent,
            fallback: true,
            errors
        };
    } catch (error) {
        TURKAI_RUNTIME.ai.failedRequests += 1;

        logError(
            "AI engine failure",
            error.message
        );

        throw error;
    } finally {
        TURKAI_RUNTIME.ai.busy = false;
    }
}

/* -------------------------------------------------------------------------- */
/* AI STATUS                                                                   */
/* -------------------------------------------------------------------------- */

app.get("/api/ai/status", optionalAuth, (req, res) => {
    const providers = {};

    for (
        const [name, provider]
        of Object.entries(
            TURKAI_RUNTIME.providers
        )
    ) {
        providers[name] = {
            enabled: provider.enabled,
            healthy: provider.healthy,
            failures: provider.failures,
            successes: provider.successes,
            lastError: provider.lastError,
            lastUsed: provider.lastUsed
        };
    }

    res.json({
        success: true,
        runtime: {
            busy: TURKAI_RUNTIME.ai.busy,
            totalRequests:
                TURKAI_RUNTIME.ai.totalRequests,
            successfulRequests:
                TURKAI_RUNTIME.ai.successfulRequests,
            failedRequests:
                TURKAI_RUNTIME.ai.failedRequests,
            fallbackRequests:
                TURKAI_RUNTIME.ai.fallbackRequests,
            localRequests:
                TURKAI_RUNTIME.ai.localRequests,
            providerRequests:
                TURKAI_RUNTIME.ai.providerRequests,
            lastProvider:
                TURKAI_RUNTIME.ai.lastProvider,
            lastModel:
                TURKAI_RUNTIME.ai.lastModel
        },
        models: AI_CONFIGURATION,
        providers
    });
});

/* -------------------------------------------------------------------------- */
/* AI TEST                                                                     */
/* -------------------------------------------------------------------------- */

app.get("/api/ai/test", async (req, res) => {
    try {
        const result =
            await generateAIResponse({
                userId: "test-user",
                message: "Merhaba TürkAI",
                history: []
            });

        res.json({
            success: true,
            result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/* -------------------------------------------------------------------------- */
/* MAIN CHAT API                                                              */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/chat",
    optionalAuth,
    async (req, res) => {
        const startedAt =
            Date.now();

        try {
            const userId =
                req.user?.id ||
                getGuestUser().id;

            const message =
                aiSafeText(
                    req.body?.message ||
                    req.body?.content
                );

            const history =
                Array.isArray(req.body?.history)
                    ? req.body.history
                    : [];

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: "Mesaj gerekli."
                });
            }

            if (message.length > 20000) {
                return res.status(413).json({
                    success: false,
                    error:
                        "Mesaj çok uzun."
                });
            }

            const intent =
                detectAIIntent(message);

            const result =
                await generateAIResponse({
                    userId,
                    message,
                    history,
                    intent
                });

            const responseTime =
                Date.now() - startedAt;

            incrementStatistic(
                "chat_requests",
                1
            );

            incrementStatistic(
                "chat_response_ms",
                responseTime
            );

            const chatId =
                aiSafeText(
                    req.body?.chatId
                );

            if (chatId) {
                try {
                    const chat =
                        findChatById(
                            chatId
                        );

                    if (chat) {
                        addMessage(
                            chat.id,
                            userId,
                            "user",
                            message
                        );

                        addMessage(
                            chat.id,
                            userId,
                            "assistant",
                            result.text
                        );
                    }
                } catch (storageError) {
                    logWarn(
                        `Chat storage failed: ${storageError.message}`
                    );
                }
            }

            res.json({
                success: true,
                message: result.text,
                text: result.text,
                provider: result.provider,
                model: result.model,
                intent: result.intent,
                fallback:
                    Boolean(result.fallback),
                responseTime,
                timestamp: nowISO()
            });
        } catch (error) {
            logError(
                "POST /api/chat failed",
                error.stack || error.message
            );

            TURKAI_RUNTIME.ai.failedRequests += 1;

            res.status(500).json({
                success: false,
                error:
                    "TürkAI yanıt oluştururken bir hata oluştu.",
                details:
                    IS_PRODUCTION
                        ? undefined
                        : error.message
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* SIMPLE MESSAGE API                                                         */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/ai/message",
    optionalAuth,
    async (req, res) => {
        try {
            const message =
                aiSafeText(
                    req.body?.message
                );

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error: "Mesaj gerekli."
                });
            }

            const userId =
                req.user?.id ||
                getGuestUser().id;

            const result =
                await generateAIResponse({
                    userId,
                    message,
                    history:
                        req.body?.history || []
                });

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logError(
                "AI message error",
                error.message
            );

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* KNOWLEDGE API                                                              */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/knowledge",
    optionalAuth,
    (req, res) => {
        try {
            const knowledge =
                loadKnowledgeDatabase();

            res.json({
                success: true,
                count: knowledge.length,
                knowledge
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Bilgi veritabanı okunamadı."
            });
        }
    }
);

app.post(
    "/api/knowledge",
    optionalAuth,
    (req, res) => {
        try {
            const question =
                aiSafeText(
                    req.body?.question
                );

            const answer =
                aiSafeText(
                    req.body?.answer
                );

            const category =
                aiSafeText(
                    req.body?.category,
                    "general"
                );

            if (!question || !answer) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Soru ve cevap gerekli."
                });
            }

            const entry =
                saveKnowledgeEntry({
                    question,
                    answer,
                    category,
                    source: "api"
                });

            res.json({
                success: true,
                entry
            });
        } catch (error) {
            logError(
                "knowledge create error",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Bilgi kaydedilemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* AI PROVIDER DIAGNOSTICS                                                    */
/* -------------------------------------------------------------------------- */

function getAIProviderSummary() {
    return Object.entries(
        TURKAI_RUNTIME.providers
    ).map(([name, provider]) => ({
        name,
        enabled: provider.enabled,
        healthy: provider.healthy,
        failures: provider.failures,
        successes: provider.successes,
        lastError: provider.lastError,
        lastUsed: provider.lastUsed
    }));
}

app.get(
    "/api/ai/providers",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            providers:
                getAIProviderSummary()
        });
    }
);

/* -------------------------------------------------------------------------- */
/* PROVIDER HEALTH CHECKS                                                     */
/* -------------------------------------------------------------------------- */

async function testGroqProvider() {
    if (
        !TURKAI_RUNTIME.providers.groq.enabled
    ) {
        return {
            provider: "groq",
            enabled: false,
            healthy: false
        };
    }

    try {
        const result =
            await callGroq([
                {
                    role: "system",
                    content:
                        "Respond with OK only."
                },
                {
                    role: "user",
                    content: "OK"
                }
            ]);

        providerSuccess(
            "groq",
            result.model
        );

        return {
            provider: "groq",
            enabled: true,
            healthy: true,
            model: result.model
        };
    } catch (error) {
        providerFailure(
            "groq",
            error.message
        );

        return {
            provider: "groq",
            enabled: true,
            healthy: false,
            error: error.message
        };
    }
}

async function testCerebrasProvider() {
    if (
        !TURKAI_RUNTIME.providers.cerebras.enabled
    ) {
        return {
            provider: "cerebras",
            enabled: false,
            healthy: false
        };
    }

    try {
        const result =
            await callCerebras([
                {
                    role: "system",
                    content:
                        "Respond with OK only."
                },
                {
                    role: "user",
                    content: "OK"
                }
            ]);

        providerSuccess(
            "cerebras",
            result.model
        );

        return {
            provider: "cerebras",
            enabled: true,
            healthy: true,
            model: result.model
        };
    } catch (error) {
        providerFailure(
            "cerebras",
            error.message
        );

        return {
            provider: "cerebras",
            enabled: true,
            healthy: false,
            error: error.message
        };
    }
}

async function testOpenRouterProvider() {
    if (
        !TURKAI_RUNTIME.providers.openrouter.enabled
    ) {
        return {
            provider: "openrouter",
            enabled: false,
            healthy: false
        };
    }

    try {
        const result =
            await callOpenRouter([
                {
                    role: "system",
                    content:
                        "Respond with OK only."
                },
                {
                    role: "user",
                    content: "OK"
                }
            ]);

        providerSuccess(
            "openrouter",
            result.model
        );

        return {
            provider: "openrouter",
            enabled: true,
            healthy: true,
            model: result.model
        };
    } catch (error) {
        providerFailure(
            "openrouter",
            error.message
        );

        return {
            provider: "openrouter",
            enabled: true,
            healthy: false,
            error: error.message
        };
    }
}

async function testGeminiProvider() {
    if (
        !TURKAI_RUNTIME.providers.gemini.enabled
    ) {
        return {
            provider: "gemini",
            enabled: false,
            healthy: false
        };
    }

    try {
        const result =
            await callGemini([
                {
                    role: "system",
                    content:
                        "Respond with OK only."
                },
                {
                    role: "user",
                    content: "OK"
                }
            ]);

        providerSuccess(
            "gemini",
            result.model
        );

        return {
            provider: "gemini",
            enabled: true,
            healthy: true,
            model: result.model
        };
    } catch (error) {
        providerFailure(
            "gemini",
            error.message
        );

        return {
            provider: "gemini",
            enabled: true,
            healthy: false,
            error: error.message
        };
    }
}

app.post(
    "/api/ai/diagnostics",
    optionalAuth,
    async (req, res) => {
        const results = [];

        results.push(
            await testGroqProvider()
        );

        results.push(
            await testCerebrasProvider()
        );

        results.push(
            await testOpenRouterProvider()
        );

        results.push(
            await testGeminiProvider()
        );

        res.json({
            success: true,
            timestamp: nowISO(),
            results
        });
    }
);

/* -------------------------------------------------------------------------- */
/* AI CONFIGURATION                                                           */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/ai/config",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            config: {
                localModel:
                    AI_CONFIGURATION.localModel,
                groqModel:
                    AI_CONFIGURATION.groqModel,
                cerebrasModel:
                    AI_CONFIGURATION.cerebrasModel,
                openRouterModel:
                    AI_CONFIGURATION.openRouterModel,
                geminiModel:
                    AI_CONFIGURATION.geminiModel,
                temperature:
                    AI_CONFIGURATION.temperature,
                maxTokens:
                    AI_CONFIGURATION.maxTokens
            }
        });
    }
);

/* -------------------------------------------------------------------------- */
/* END OF PART 2                                                              */
/* PART 3: RESEARCH • WEATHER • CURRENCY • FILES • UPLOADS • SOCKET.IO       */
/* -------------------------------------------------------------------------- */
/* ========================================================================== */
/* TÜRKAI SERVER.JS — PART 3                                                  */
/* RESEARCH • WEATHER • CURRENCY • FILES • UPLOADS • SOCKET.IO               */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* RESEARCH ENGINE                                                            */
/* -------------------------------------------------------------------------- */

const TURKAI_RESEARCH = {
    enabled: true,

    configuration: {
        timeout:
            Number(
                process.env.RESEARCH_TIMEOUT ||
                15000
            ),

        maxResults:
            Number(
                process.env.RESEARCH_MAX_RESULTS ||
                8
            ),

        maxQueryLength: 500,

        userAgent:
            process.env.RESEARCH_USER_AGENT ||
            "TurkAI/15.0 Research Engine"
    },

    statistics: {
        requests: 0,
        successful: 0,
        failed: 0,
        cached: 0
    },

    cache: new Map()
};

function researchNormalizeQuery(query) {
    return aiSafeText(query)
        .replace(/\s+/g, " ")
        .trim()
        .slice(
            0,
            TURKAI_RESEARCH.configuration.maxQueryLength
        );
}

function researchCacheKey(query) {
    return researchNormalizeQuery(query)
        .toLocaleLowerCase("tr-TR");
}

function researchGetCache(query) {
    const key =
        researchCacheKey(query);

    const cached =
        TURKAI_RESEARCH.cache.get(key);

    if (!cached) {
        return null;
    }

    const age =
        Date.now() - cached.timestamp;

    const maxAge =
        Number(
            process.env.RESEARCH_CACHE_TTL ||
            300000
        );

    if (age > maxAge) {
        TURKAI_RESEARCH.cache.delete(key);
        return null;
    }

    TURKAI_RESEARCH.statistics.cached += 1;

    return cached.data;
}

function researchSetCache(query, data) {
    const key =
        researchCacheKey(query);

    TURKAI_RESEARCH.cache.set(
        key,
        {
            timestamp: Date.now(),
            data
        }
    );

    if (
        TURKAI_RESEARCH.cache.size > 200
    ) {
        const first =
            TURKAI_RESEARCH.cache.keys().next();

        if (!first.done) {
            TURKAI_RESEARCH.cache.delete(
                first.value
            );
        }
    }
}

function researchDecodeHTML(html) {
    return aiSafeText(html)
        .replace(
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            " "
        )
        .replace(
            /<style\b[^>]*>[\s\S]*?<\/style>/gi,
            " "
        )
        .replace(
            /<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,
            " "
        )
        .replace(
            /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
            " "
        )
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function researchExtractTitle(html) {
    const match =
        aiSafeText(html).match(
            /<title[^>]*>([\s\S]*?)<\/title>/i
        );

    if (!match) {
        return "";
    }

    return researchDecodeHTML(
        match[1]
    ).slice(0, 300);
}

function researchExtractDescription(html) {
    const description =
        aiSafeText(html).match(
            /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
        );

    if (description) {
        return researchDecodeHTML(
            description[1]
        ).slice(0, 500);
    }

    const ogDescription =
        aiSafeText(html).match(
            /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
        );

    if (ogDescription) {
        return researchDecodeHTML(
            ogDescription[1]
        ).slice(0, 500);
    }

    return "";
}

function researchExtractLinks(
    html,
    baseURL
) {
    const links = [];

    const source =
        aiSafeText(html);

    const regex =
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
        (match = regex.exec(source)) &&
        links.length < 100
    ) {
        const href =
            aiSafeText(match[1]);

        const title =
            researchDecodeHTML(
                match[2]
            );

        if (!href) {
            continue;
        }

        try {
            const absolute =
                new URL(
                    href,
                    baseURL
                ).toString();

            links.push({
                url: absolute,
                title:
                    title.slice(0, 300)
            });
        } catch {
            continue;
        }
    }

    return links;
}

async function researchFetchURL(url) {
    const response =
        await fetchWithTimeout(
            url,
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        TURKAI_RESEARCH.configuration.userAgent,
                    "Accept":
                        "text/html,application/xhtml+xml"
                },
                redirect: "follow"
            },
            TURKAI_RESEARCH.configuration.timeout
        );

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}`
        );
    }

    const contentType =
        response.headers.get(
            "content-type"
        ) || "";

    const text =
        await response.text();

    return {
        url:
            response.url || url,
        status:
            response.status,
        contentType,
        text
    };
}

function researchCreateResult(
    page,
    query
) {
    const cleanText =
        researchDecodeHTML(
            page.text
        );

    return {
        query,
        url: page.url,
        title:
            researchExtractTitle(
                page.text
            ),
        description:
            researchExtractDescription(
                page.text
            ),
        content:
            cleanText.slice(
                0,
                5000
            ),
        links:
            researchExtractLinks(
                page.text,
                page.url
            ).slice(0, 30),
        retrievedAt:
            nowISO()
    };
}

async function performResearch(
    query,
    options = {}
) {
    const cleanQuery =
        researchNormalizeQuery(query);

    if (!cleanQuery) {
        throw new Error(
            "Araştırma sorgusu boş."
        );
    }

    const cached =
        researchGetCache(
            cleanQuery
        );

    if (cached) {
        return {
            ...cached,
            cached: true
        };
    }

    TURKAI_RESEARCH.statistics.requests += 1;

    const directURL =
        aiSafeText(
            options.url
        );

    if (directURL) {
        try {
            const parsed =
                new URL(directURL);

            if (
                parsed.protocol !== "https:" &&
                parsed.protocol !== "http:"
            ) {
                throw new Error(
                    "Desteklenmeyen URL protokolü."
                );
            }

            const page =
                await researchFetchURL(
                    parsed.toString()
                );

            const result =
                researchCreateResult(
                    page,
                    cleanQuery
                );

            researchSetCache(
                cleanQuery,
                result
            );

            TURKAI_RESEARCH.statistics.successful += 1;

            return result;
        } catch (error) {
            TURKAI_RESEARCH.statistics.failed += 1;

            throw error;
        }
    }

    /*
     * Harici arama motoru API anahtarı verilmişse
     * buradaki yapı genişletilebilir.
     *
     * Anahtar yoksa sistem uydurma arama sonucu üretmez.
     */

    const searchURL =
        process.env.RESEARCH_SEARCH_URL;

    if (!searchURL) {
        const fallback =
            {
                query: cleanQuery,
                title:
                    "Araştırma servisi yapılandırılmadı",
                description:
                    "Canlı araştırma için bir arama sağlayıcısı yapılandırılmalı.",
                content:
                    "TürkAI araştırma motoru hazır durumda ancak harici arama sağlayıcısı için RESEARCH_SEARCH_URL yapılandırılmamış.",
                results: [],
                retrievedAt:
                    nowISO(),
                configured: false
            };

        researchSetCache(
            cleanQuery,
            fallback
        );

        return fallback;
    }

    try {
        const url =
            new URL(searchURL);

        url.searchParams.set(
            "q",
            cleanQuery
        );

        const page =
            await researchFetchURL(
                url.toString()
            );

        const result =
            researchCreateResult(
                page,
                cleanQuery
            );

        researchSetCache(
            cleanQuery,
            result
        );

        TURKAI_RESEARCH.statistics.successful += 1;

        return result;
    } catch (error) {
        TURKAI_RESEARCH.statistics.failed += 1;

        logWarn(
            `Research failed: ${error.message}`
        );

        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/* RESEARCH SUMMARY                                                           */
/* -------------------------------------------------------------------------- */

function researchBuildSummary(
    result
) {
    if (!result) {
        return "Araştırma sonucu bulunamadı.";
    }

    const parts = [];

    if (result.title) {
        parts.push(
            `Başlık: ${result.title}`
        );
    }

    if (result.description) {
        parts.push(
            `Özet: ${result.description}`
        );
    }

    if (result.content) {
        parts.push(
            `İçerik: ${result.content.slice(0, 2500)}`
        );
    }

    if (
        Array.isArray(result.results) &&
        result.results.length
    ) {
        parts.push(
            result.results
                .slice(0, 5)
                .map(
                    (item, index) =>
                        `${index + 1}. ${item.title || item.url}`
                )
                .join("\n")
        );
    }

    return parts.join("\n\n");
}

/* -------------------------------------------------------------------------- */
/* RESEARCH API                                                               */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/research/status",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            enabled:
                TURKAI_RESEARCH.enabled,
            statistics:
                TURKAI_RESEARCH.statistics,
            cacheSize:
                TURKAI_RESEARCH.cache.size,
            configuration: {
                timeout:
                    TURKAI_RESEARCH.configuration.timeout,
                maxResults:
                    TURKAI_RESEARCH.configuration.maxResults
            }
        });
    }
);

app.get(
    "/api/research",
    optionalAuth,
    async (req, res) => {
        try {
            const query =
                researchNormalizeQuery(
                    req.query?.q ||
                    req.query?.query
                );

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Araştırma sorgusu gerekli."
                });
            }

            const result =
                await performResearch(
                    query,
                    {
                        url:
                            req.query?.url
                    }
                );

            incrementStatistic(
                "research_requests",
                1
            );

            res.json({
                success: true,
                result
            });
        } catch (error) {
            logError(
                "GET /api/research failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırma gerçekleştirilemedi."
            });
        }
    }
);

app.post(
    "/api/research",
    optionalAuth,
    async (req, res) => {
        try {
            const query =
                researchNormalizeQuery(
                    req.body?.query ||
                    req.body?.q
                );

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Araştırma sorgusu gerekli."
                });
            }

            const result =
                await performResearch(
                    query,
                    {
                        url:
                            req.body?.url
                    }
                );

            incrementStatistic(
                "research_requests",
                1
            );

            res.json({
                success: true,
                query,
                result,
                summary:
                    researchBuildSummary(
                        result
                    )
            });
        } catch (error) {
            logError(
                "POST /api/research failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırma gerçekleştirilemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* WEATHER ENGINE                                                             */
/* -------------------------------------------------------------------------- */

const TURKAI_WEATHER = {
    provider:
        process.env.WEATHER_PROVIDER ||
        "open-meteo",

    timeout:
        Number(
            process.env.WEATHER_TIMEOUT ||
            12000
        ),

    cache:
        new Map(),

    cacheTTL:
        Number(
            process.env.WEATHER_CACHE_TTL ||
            300000
        )
};

function weatherCacheKey(
    latitude,
    longitude
) {
    return [
        Number(latitude).toFixed(3),
        Number(longitude).toFixed(3)
    ].join(":");
}

function weatherGetCached(
    latitude,
    longitude
) {
    const key =
        weatherCacheKey(
            latitude,
            longitude
        );

    const item =
        TURKAI_WEATHER.cache.get(key);

    if (!item) {
        return null;
    }

    if (
        Date.now() - item.timestamp >
        TURKAI_WEATHER.cacheTTL
    ) {
        TURKAI_WEATHER.cache.delete(key);
        return null;
    }

    return item.data;
}

function weatherSetCached(
    latitude,
    longitude,
    data
) {
    const key =
        weatherCacheKey(
            latitude,
            longitude
        );

    TURKAI_WEATHER.cache.set(
        key,
        {
            timestamp: Date.now(),
            data
        }
    );

    if (
        TURKAI_WEATHER.cache.size > 100
    ) {
        const first =
            TURKAI_WEATHER.cache.keys().next();

        if (!first.done) {
            TURKAI_WEATHER.cache.delete(
                first.value
            );
        }
    }
}

function weatherValidateCoordinates(
    latitude,
    longitude
) {
    const lat =
        Number(latitude);

    const lon =
        Number(longitude);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
    ) {
        return null;
    }

    if (
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
    ) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lon
    };
}

async function fetchOpenMeteoWeather(
    latitude,
    longitude
) {
    const url =
        new URL(
            "https://api.open-meteo.com/v1/forecast"
        );

    url.searchParams.set(
        "latitude",
        String(latitude)
    );

    url.searchParams.set(
        "longitude",
        String(longitude)
    );

    url.searchParams.set(
        "current",
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "rain",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m"
        ].join(",")
    );

    url.searchParams.set(
        "hourly",
        [
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m"
        ].join(",")
    );

    url.searchParams.set(
        "timezone",
        "auto"
    );

    const response =
        await fetchWithTimeout(
            url.toString(),
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "TurkAI Weather Engine"
                }
            },
            TURKAI_WEATHER.timeout
        );

    const data =
        await readProviderJSON(
            response
        );

    if (!response.ok) {
        throw new Error(
            data?.reason ||
            `Weather HTTP ${response.status}`
        );
    }

    return data;
}

function weatherCodeText(code) {
    const map = {
        0: "Açık",
        1: "Çoğunlukla açık",
        2: "Parçalı bulutlu",
        3: "Kapalı",
        45: "Sisli",
        48: "Kırağılı sis",
        51: "Hafif çisenti",
        53: "Çisenti",
        55: "Yoğun çisenti",
        61: "Hafif yağmur",
        63: "Yağmur",
        65: "Kuvvetli yağmur",
        71: "Hafif kar",
        73: "Kar",
        75: "Yoğun kar",
        80: "Hafif sağanak",
        81: "Sağanak",
        82: "Kuvvetli sağanak",
        95: "Gök gürültülü fırtına",
        96: "Dolu ihtimalli fırtına",
        99: "Kuvvetli dolu ihtimalli fırtına"
    };

    return (
        map[Number(code)] ||
        "Bilinmeyen hava durumu"
    );
}

async function getWeather(
    latitude,
    longitude
) {
    const coordinates =
        weatherValidateCoordinates(
            latitude,
            longitude
        );

    if (!coordinates) {
        throw new Error(
            "Geçersiz koordinatlar."
        );
    }

    const cached =
        weatherGetCached(
            coordinates.latitude,
            coordinates.longitude
        );

    if (cached) {
        return {
            ...cached,
            cached: true
        };
    }

    const data =
        await fetchOpenMeteoWeather(
            coordinates.latitude,
            coordinates.longitude
        );

    const result = {
        latitude:
            coordinates.latitude,
        longitude:
            coordinates.longitude,
        timezone:
            data.timezone,
        current: {
            temperature:
                data.current?.temperature_2m,
            humidity:
                data.current?.relative_humidity_2m,
            apparentTemperature:
                data.current?.apparent_temperature,
            precipitation:
                data.current?.precipitation,
            rain:
                data.current?.rain,
            windSpeed:
                data.current?.wind_speed_10m,
            windDirection:
                data.current?.wind_direction_10m,
            weatherCode:
                data.current?.weather_code,
            description:
                weatherCodeText(
                    data.current?.weather_code
                ),
            isDay:
                Boolean(
                    data.current?.is_day
                ),
            time:
                data.current?.time
        },
        hourly:
            data.hourly || {},
        retrievedAt:
            nowISO()
    };

    weatherSetCached(
        coordinates.latitude,
        coordinates.longitude,
        result
    );

    return result;
}

app.get(
    "/api/weather",
    optionalAuth,
    async (req, res) => {
        try {
            const latitude =
                req.query?.lat ||
                req.query?.latitude;

            const longitude =
                req.query?.lon ||
                req.query?.lng ||
                req.query?.longitude;

            const result =
                await getWeather(
                    latitude,
                    longitude
                );

            incrementStatistic(
                "weather_requests",
                1
            );

            res.json({
                success: true,
                weather: result
            });
        } catch (error) {
            logError(
                "weather request failed",
                error.message
            );

            res.status(400).json({
                success: false,
                error:
                    "Hava durumu alınamadı."
            });
        }
    }
);

app.post(
    "/api/weather",
    optionalAuth,
    async (req, res) => {
        try {
            const result =
                await getWeather(
                    req.body?.latitude,
                    req.body?.longitude
                );

            incrementStatistic(
                "weather_requests",
                1
            );

            res.json({
                success: true,
                weather: result
            });
        } catch (error) {
            logError(
                "weather POST failed",
                error.message
            );

            res.status(400).json({
                success: false,
                error:
                    "Hava durumu alınamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* CURRENCY ENGINE                                                            */
/* -------------------------------------------------------------------------- */

const TURKAI_CURRENCY = {
    timeout:
        Number(
            process.env.CURRENCY_TIMEOUT ||
            12000
        ),

    cache:
        new Map(),

    cacheTTL:
        Number(
            process.env.CURRENCY_CACHE_TTL ||
            300000
        )
};

function currencyCacheGet(
    base
) {
    const key =
        aiSafeText(
            base,
            "TRY"
        ).toUpperCase();

    const item =
        TURKAI_CURRENCY.cache.get(
            key
        );

    if (!item) {
        return null;
    }

    if (
        Date.now() - item.timestamp >
        TURKAI_CURRENCY.cacheTTL
    ) {
        TURKAI_CURRENCY.cache.delete(key);
        return null;
    }

    return item.data;
}

function currencyCacheSet(
    base,
    data
) {
    const key =
        aiSafeText(
            base,
            "TRY"
        ).toUpperCase();

    TURKAI_CURRENCY.cache.set(
        key,
        {
            timestamp: Date.now(),
            data
        }
    );
}

async function getCurrencyRates(
    base = "TRY"
) {
    const cleanBase =
        aiSafeText(
            base,
            "TRY"
        ).toUpperCase();

    const cached =
        currencyCacheGet(
            cleanBase
        );

    if (cached) {
        return {
            ...cached,
            cached: true
        };
    }

    const url =
        new URL(
            "https://open.er-api.com/v6/latest/"
            +
            encodeURIComponent(
                cleanBase
            )
        );

    const response =
        await fetchWithTimeout(
            url.toString(),
            {
                method: "GET",
                headers: {
                    "User-Agent":
                        "TurkAI Currency Engine"
                }
            },
            TURKAI_CURRENCY.timeout
        );

    const data =
        await readProviderJSON(
            response
        );

    if (!response.ok) {
        throw new Error(
            data?.error_type ||
            `Currency HTTP ${response.status}`
        );
    }

    if (
        data.result &&
        data.result !== "success"
    ) {
        throw new Error(
            "Döviz servisi başarısız yanıt verdi."
        );
    }

    const result = {
        base:
            data.base_code ||
            cleanBase,
        rates:
            data.rates || {},
        timeLastUpdate:
            data.time_last_update_utc ||
            null,
        timeNextUpdate:
            data.time_next_update_utc ||
            null,
        retrievedAt:
            nowISO()
    };

    currencyCacheSet(
        cleanBase,
        result
    );

    return result;
}

app.get(
    "/api/currency",
    optionalAuth,
    async (req, res) => {
        try {
            const base =
                aiSafeText(
                    req.query?.base,
                    "TRY"
                );

            const data =
                await getCurrencyRates(
                    base
                );

            incrementStatistic(
                "currency_requests",
                1
            );

            res.json({
                success: true,
                currency: data
            });
        } catch (error) {
            logError(
                "currency request failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Döviz verisi alınamadı."
            });
        }
    }
);

app.get(
    "/api/currency/rate",
    optionalAuth,
    async (req, res) => {
        try {
            const from =
                aiSafeText(
                    req.query?.from,
                    "USD"
                ).toUpperCase();

            const to =
                aiSafeText(
                    req.query?.to,
                    "TRY"
                ).toUpperCase();

            const data =
                await getCurrencyRates(
                    from
                );

            const rate =
                data.rates?.[to];

            if (
                !Number.isFinite(
                    Number(rate)
                )
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Kur bulunamadı."
                });
            }

            res.json({
                success: true,
                from,
                to,
                rate: Number(rate),
                retrievedAt:
                    data.retrievedAt
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Kur alınamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* FILE SERVICE                                                               */
/* -------------------------------------------------------------------------- */

const TURKAI_FILES = {
    maxSize:
        Number(
            process.env.MAX_UPLOAD_SIZE ||
            10 * 1024 * 1024
        ),

    allowedExtensions: new Set([
        ".txt",
        ".md",
        ".json",
        ".js",
        ".ts",
        ".html",
        ".css",
        ".py",
        ".java",
        ".cs",
        ".cpp",
        ".c",
        ".h",
        ".xml",
        ".csv",
        ".log"
    ])
};

function fileSafeName(
    name
) {
    return aiSafeText(
        name,
        "file"
    )
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )
        .slice(
            0,
            180
        );
}

function fileExtension(
    name
) {
    return path
        .extname(
            aiSafeText(name)
        )
        .toLowerCase();
}

function fileIsAllowed(
    name
) {
    return TURKAI_FILES.allowedExtensions.has(
        fileExtension(name)
    );
}

function fileCreateMetadata({
    id,
    originalName,
    storedName,
    size,
    mimeType,
    userId
}) {
    return {
        id,
        userId:
            aiSafeText(
                userId,
                "guest"
            ),
        originalName:
            aiSafeText(
                originalName
            ),
        storedName:
            aiSafeText(
                storedName
            ),
        size:
            Number(size) || 0,
        mimeType:
            aiSafeText(
                mimeType,
                "application/octet-stream"
            ),
        extension:
            fileExtension(
                originalName
            ),
        createdAt:
            nowISO(),
        updatedAt:
            nowISO()
    };
}

function saveFileMetadata(
    metadata
) {
    const files =
        getFiles();

    files.push(
        metadata
    );

    saveFiles(
        files
    );

    return metadata;
}

function findFileById(
    id
) {
    return getFiles().find(
        item =>
            item.id === id
    );
}

function deleteStoredFile(
    metadata
) {
    if (!metadata) {
        return false;
    }

    const storedPath =
        path.join(
            UPLOADS_DIR,
            metadata.storedName
        );

    if (
        fs.existsSync(
            storedPath
        )
    ) {
        fs.unlinkSync(
            storedPath
        );
    }

    const files =
        getFiles();

    const filtered =
        files.filter(
            item =>
                item.id !== metadata.id
        );

    saveFiles(
        filtered
    );

    return true;
}

app.get(
    "/api/files",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const files =
                getFiles().filter(
                    item =>
                        item.userId === userId
                );

            res.json({
                success: true,
                files
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Dosyalar okunamadı."
            });
        }
    }
);

app.get(
    "/api/files/:id",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const metadata =
                findFileById(
                    req.params.id
                );

            if (!metadata) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya bulunamadı."
                });
            }

            if (
                metadata.userId !== userId
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Bu dosyaya erişim izniniz yok."
                });
            }

            res.json({
                success: true,
                file: metadata
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Dosya okunamadı."
            });
        }
    }
);

app.delete(
    "/api/files/:id",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const metadata =
                findFileById(
                    req.params.id
                );

            if (!metadata) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya bulunamadı."
                });
            }

            if (
                metadata.userId !== userId
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Yetkisiz işlem."
                });
            }

            deleteStoredFile(
                metadata
            );

            res.json({
                success: true
            });
        } catch (error) {
            logError(
                "file delete failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya silinemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* RAW FILE UPLOAD API                                                        */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/upload",
    optionalAuth,
    express.raw({
        type: "*/*",
        limit:
            TURKAI_FILES.maxSize
    }),
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const originalName =
                fileSafeName(
                    req.headers[
                        "x-file-name"
                    ] ||
                    req.query?.name ||
                    "upload.txt"
                );

            const extension =
                fileExtension(
                    originalName
                );

            if (
                !TURKAI_FILES.allowedExtensions.has(
                    extension
                )
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Bu dosya türüne izin verilmiyor."
                });
            }

            const body =
                Buffer.isBuffer(req.body)
                    ? req.body
                    : Buffer.from(
                        String(
                            req.body || ""
                        )
                    );

            if (
                body.length >
                TURKAI_FILES.maxSize
            ) {
                return res.status(413).json({
                    success: false,
                    error:
                        "Dosya boyutu çok büyük."
                });
            }

            const id =
                createId(
                    "file"
                );

            const storedName =
                `${id}${extension}`;

            const storedPath =
                path.join(
                    UPLOADS_DIR,
                    storedName
                );

            fs.writeFileSync(
                storedPath,
                body
            );

            const metadata =
                fileCreateMetadata({
                    id,
                    originalName,
                    storedName,
                    size:
                        body.length,
                    mimeType:
                        req.headers[
                            "content-type"
                        ],
                    userId
                });

            saveFileMetadata(
                metadata
            );

            incrementStatistic(
                "uploads",
                1
            );

            res.json({
                success: true,
                file: metadata
            });
        } catch (error) {
            logError(
                "upload failed",
                error.stack ||
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya yüklenemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* FILE CONTENT                                                               */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/files/:id/content",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const metadata =
                findFileById(
                    req.params.id
                );

            if (!metadata) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya bulunamadı."
                });
            }

            if (
                metadata.userId !== userId
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Yetkisiz erişim."
                });
            }

            const filePath =
                path.join(
                    UPLOADS_DIR,
                    metadata.storedName
                );

            if (
                !fs.existsSync(
                    filePath
                )
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya diskte bulunamadı."
                });
            }

            const content =
                fs.readFileSync(
                    filePath,
                    "utf8"
                );

            res.json({
                success: true,
                file: {
                    ...metadata,
                    content:
                        content.slice(
                            0,
                            200000
                        )
                }
            });
        } catch (error) {
            logError(
                "file content failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya içeriği okunamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* FILE DOWNLOAD                                                              */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/files/:id/download",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const metadata =
                findFileById(
                    req.params.id
                );

            if (!metadata) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya bulunamadı."
                });
            }

            if (
                metadata.userId !== userId
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        "Yetkisiz erişim."
                });
            }

            const filePath =
                path.join(
                    UPLOADS_DIR,
                    metadata.storedName
                );

            if (
                !fs.existsSync(
                    filePath
                )
            ) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Dosya diskte bulunamadı."
                });
            }

            res.download(
                filePath,
                metadata.originalName
            );
        } catch (error) {
            logError(
                "file download failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Dosya indirilemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PROJECT STORAGE                                                            */
/* -------------------------------------------------------------------------- */

function getUserProjects(
    userId
) {
    return getProjects().filter(
        project =>
            project.userId === userId
    );
}

function createProject(
    userId,
    name,
    description = ""
) {
    const projects =
        getProjects();

    const project = {
        id:
            createId(
                "project"
            ),
        userId,
        name:
            aiSafeText(
                name,
                "Yeni Proje"
            ).slice(0, 150),
        description:
            aiSafeText(
                description
            ).slice(0, 1000),
        files: [],
        createdAt:
            nowISO(),
        updatedAt:
            nowISO()
    };

    projects.push(
        project
    );

    saveProjects(
        projects
    );

    return project;
}

function findProject(
    projectId
) {
    return getProjects().find(
        project =>
            project.id ===
            projectId
    );
}

app.get(
    "/api/projects",
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        res.json({
            success: true,
            projects:
                getUserProjects(
                    userId
                )
        });
    }
);

app.post(
    "/api/projects",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const project =
                createProject(
                    userId,
                    req.body?.name,
                    req.body?.description
                );

            res.json({
                success: true,
                project
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Proje oluşturulamadı."
            });
        }
    }
);

app.get(
    "/api/projects/:id",
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

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
            project.userId !== userId
        ) {
            return res.status(403).json({
                success: false,
                error:
                    "Yetkisiz erişim."
            });
        }

        res.json({
            success: true,
            project
        });
    }
);

app.delete(
    "/api/projects/:id",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const projects =
                getProjects();

            const index =
                projects.findIndex(
                    project =>
                        project.id ===
                            req.params.id &&
                        project.userId ===
                            userId
                );

            if (index < 0) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Proje bulunamadı."
                });
            }

            projects.splice(
                index,
                1
            );

            saveProjects(
                projects
            );

            res.json({
                success: true
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Proje silinemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* SOCKET.IO                                                                  */
/* -------------------------------------------------------------------------- */

const TURKAI_SOCKET = {
    connected: 0,
    totalConnections: 0,
    totalMessages: 0,
    startedAt: nowISO()
};

io.on(
    "connection",
    socket => {
        TURKAI_SOCKET.connected += 1;
        TURKAI_SOCKET.totalConnections += 1;

        logInfo(
            `Socket connected: ${socket.id}`
        );

        socket.emit(
            "turkai:connected",
            {
                success: true,
                socketId:
                    socket.id,
                serverTime:
                    nowISO()
            }
        );

        socket.on(
            "turkai:ping",
            payload => {
                socket.emit(
                    "turkai:pong",
                    {
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
                            aiSafeText(
                                payload?.userId
                            ),
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
            async payload => {
                TURKAI_SOCKET.totalMessages += 1;

                const message =
                    aiSafeText(
                        payload?.message
                    );

                if (!message) {
                    socket.emit(
                        "chat:error",
                        {
                            error:
                                "Mesaj boş."
                        }
                    );

                    return;
                }

                try {
                    const result =
                        await generateAIResponse({
                            userId:
                                aiSafeText(
                                    payload?.userId,
                                    "guest"
                                ),
                            message,
                            history:
                                Array.isArray(
                                    payload?.history
                                )
                                    ? payload.history
                                    : []
                        });

                    socket.emit(
                        "chat:response",
                        {
                            success: true,
                            message:
                                result.text,
                            provider:
                                result.provider,
                            model:
                                result.model,
                            intent:
                                result.intent,
                            timestamp:
                                nowISO()
                        }
                    );
                } catch (error) {
                    socket.emit(
                        "chat:error",
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
            "research:request",
            async payload => {
                try {
                    const query =
                        researchNormalizeQuery(
                            payload?.query
                        );

                    if (!query) {
                        throw new Error(
                            "Araştırma sorgusu gerekli."
                        );
                    }

                    const result =
                        await performResearch(
                            query,
                            {
                                url:
                                    payload?.url
                            }
                        );

                    socket.emit(
                        "research:response",
                        {
                            success: true,
                            query,
                            result
                        }
                    );
                } catch (error) {
                    socket.emit(
                        "research:error",
                        {
                            success: false,
                            error:
                                error.message
                        }
                    );
                }
            }
        );

        socket.on(
            "disconnect",
            reason => {
                TURKAI_SOCKET.connected =
                    Math.max(
                        0,
                        TURKAI_SOCKET.connected - 1
                    );

                logInfo(
                    `Socket disconnected: ${socket.id} (${reason})`
                );
            }
        );
    }
);

/* -------------------------------------------------------------------------- */
/* SOCKET STATUS                                                              */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/socket/status",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            connected:
                TURKAI_SOCKET.connected,
            totalConnections:
                TURKAI_SOCKET.totalConnections,
            totalMessages:
                TURKAI_SOCKET.totalMessages,
            startedAt:
                TURKAI_SOCKET.startedAt
        });
    }
);

/* -------------------------------------------------------------------------- */
/* AI + RESEARCH COMBINED ENDPOINT                                            */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/ai/research",
    optionalAuth,
    async (req, res) => {
        const startedAt =
            Date.now();

        try {
            const userId =
                req.user?.id ||
                "guest";

            const message =
                aiSafeText(
                    req.body?.message ||
                    req.body?.query
                );

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Soru gerekli."
                });
            }

            const research =
                await performResearch(
                    message,
                    {
                        url:
                            req.body?.url
                    }
                );

            const summary =
                researchBuildSummary(
                    research
                );

            const answer =
                await generateAIResponse({
                    userId,
                    message:
                        [
                            "Aşağıdaki araştırma sonucunu kullanarak soruyu yanıtla:",
                            "",
                            `SORU: ${message}`,
                            "",
                            "ARAŞTIRMA:",
                            summary
                        ].join("\n"),
                    history: []
                });

            res.json({
                success: true,
                question:
                    message,
                research,
                answer:
                    answer.text,
                provider:
                    answer.provider,
                model:
                    answer.model,
                responseTime:
                    Date.now() - startedAt
            });
        } catch (error) {
            logError(
                "AI research failed",
                error.stack ||
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Araştırmalı AI yanıtı oluşturulamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* SERVER RUNTIME EXTENSION                                                   */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/runtime",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            app: {
                name: APP_NAME,
                version: APP_VERSION,
                environment:
                    NODE_ENV
            },
            ai: {
                ...TURKAI_RUNTIME.ai
            },
            research: {
                enabled:
                    TURKAI_RESEARCH.enabled,
                cacheSize:
                    TURKAI_RESEARCH.cache.size,
                statistics:
                    TURKAI_RESEARCH.statistics
            },
            weather: {
                cacheSize:
                    TURKAI_WEATHER.cache.size
            },
            currency: {
                cacheSize:
                    TURKAI_CURRENCY.cache.size
            },
            socket:
                TURKAI_SOCKET,
            memory:
                TURKAI_RUNTIME.memory,
            knowledge:
                TURKAI_RUNTIME.knowledge
        });
    }
);

/* -------------------------------------------------------------------------- */
/* PERIODIC CACHE CLEANUP                                                     */
/* -------------------------------------------------------------------------- */

const TURKAI_CLEANUP_INTERVAL =
    setInterval(
        () => {
            try {
                const now =
                    Date.now();

                for (
                    const [
                        key,
                        item
                    ]
                    of TURKAI_RESEARCH.cache.entries()
                ) {
                    if (
                        now -
                        item.timestamp >
                        Number(
                            process.env.RESEARCH_CACHE_TTL ||
                            300000
                        )
                    ) {
                        TURKAI_RESEARCH.cache.delete(
                            key
                        );
                    }
                }

                for (
                    const [
                        key,
                        item
                    ]
                    of TURKAI_WEATHER.cache.entries()
                ) {
                    if (
                        now -
                        item.timestamp >
                        TURKAI_WEATHER.cacheTTL
                    ) {
                        TURKAI_WEATHER.cache.delete(
                            key
                        );
                    }
                }

                for (
                    const [
                        key,
                        item
                    ]
                    of TURKAI_CURRENCY.cache.entries()
                ) {
                    if (
                        now -
                        item.timestamp >
                        TURKAI_CURRENCY.cacheTTL
                    ) {
                        TURKAI_CURRENCY.cache.delete(
                            key
                        );
                    }
                }
            } catch (error) {
                logWarn(
                    `Cache cleanup failed: ${error.message}`
                );
            }
        },
        60000
    );

if (
    typeof TURKAI_CLEANUP_INTERVAL?.unref ===
    "function"
) {
    TURKAI_CLEANUP_INTERVAL.unref();
}

/* -------------------------------------------------------------------------- */
/* GRACEFUL SOCKET SHUTDOWN                                                   */
/* -------------------------------------------------------------------------- */

function shutdownPart3Resources() {
    try {
        clearInterval(
            TURKAI_CLEANUP_INTERVAL
        );
    } catch {
        /* intentionally ignored */
    }

    try {
        TURKAI_RESEARCH.cache.clear();
    } catch {
        /* intentionally ignored */
    }

    try {
        TURKAI_WEATHER.cache.clear();
    } catch {
        /* intentionally ignored */
    }

    try {
        TURKAI_CURRENCY.cache.clear();
    } catch {
        /* intentionally ignored */
    }
}

process.once(
    "SIGINT",
    () => {
        shutdownPart3Resources();
    }
);

process.once(
    "SIGTERM",
    () => {
        shutdownPart3Resources();
    }
);

/* ========================================================================== */
/* END OF PART 3                                                              */
/* PART 4: PRO • PLUS • ULTRA • PAYMENTS • SECURITY • ADMIN • SETTINGS       */
/* ========================================================================== */
/* ========================================================================== */
/* TÜRKAI SERVER.JS — PART 4                                                  */
/* PLANS • PRO • PLUS • ULTRA • PAYMENTS • SECURITY • ADMIN • SETTINGS        */
/* ========================================================================== */

/* -------------------------------------------------------------------------- */
/* PLAN ENGINE                                                                */
/* -------------------------------------------------------------------------- */

const TURKAI_PLAN_ENGINE = {
    version: "15.0",

    defaults: {
        free: {
            id: "free",
            name: "Free",
            price: 0,
            currency: "TRY",
            dailyMessages: 50,
            imageDaily: 0,
            videoDaily: 0,
            research: true,
            memory: true,
            fileUpload: true,
            maxFileSize:
                5 * 1024 * 1024,
            priority: 1
        },

        pro: {
            id: "pro",
            name: "Pro",
            price: 250,
            currency: "TRY",
            dailyMessages: 100,
            imageDaily: 2,
            videoDaily: 0,
            research: true,
            memory: true,
            fileUpload: true,
            maxFileSize:
                10 * 1024 * 1024,
            priority: 2
        },

        plus: {
            id: "plus",
            name: "Plus",
            price: 500,
            currency: "TRY",
            dailyMessages: 200,
            imageDaily: 4,
            videoDaily: 2,
            research: true,
            memory: true,
            fileUpload: true,
            maxFileSize:
                20 * 1024 * 1024,
            priority: 3
        },

        ultra: {
            id: "ultra",
            name: "Ultra",
            price: 1000,
            currency: "TRY",
            dailyMessages: 1000,
            imageDaily: 10,
            videoDaily: 5,
            research: true,
            memory: true,
            fileUpload: true,
            maxFileSize:
                50 * 1024 * 1024,
            priority: 4,
            comingSoon: true
        },

        developer: {
            id: "developer",
            name: "Developer",
            price: 0,
            currency: "TRY",
            dailyMessages: 400,
            imageDaily: 20,
            videoDaily: 20,
            research: true,
            memory: true,
            fileUpload: true,
            maxFileSize:
                100 * 1024 * 1024,
            priority: 99,
            internal: true
        }
    }
};

function getPlanDefinition(
    planId
) {
    const normalized =
        aiSafeText(
            planId,
            "free"
        ).toLowerCase();

    return (
        TURKAI_PLAN_ENGINE
            .defaults[
                normalized
            ] ||
        TURKAI_PLAN_ENGINE
            .defaults
            .free
    );
}

function normalizePlanId(
    planId
) {
    const value =
        aiSafeText(
            planId,
            "free"
        ).toLowerCase();

    if (
        !TURKAI_PLAN_ENGINE
            .defaults[value]
    ) {
        return "free";
    }

    return value;
}

function getUserPlan(
    user
) {
    if (!user) {
        return getPlanDefinition(
            "free"
        );
    }

    return getPlanDefinition(
        normalizePlanId(
            user.plan
        )
    );
}

function userHasPlan(
    user,
    minimumPlan
) {
    const current =
        getUserPlan(
            user
        );

    const required =
        getPlanDefinition(
            minimumPlan
        );

    return (
        current.priority >=
        required.priority
    );
}

/* -------------------------------------------------------------------------- */
/* USAGE ENGINE                                                               */
/* -------------------------------------------------------------------------- */

const TURKAI_USAGE_ENGINE = {
    timezone:
        process.env.TURKAI_USAGE_TIMEZONE ||
        "Europe/Istanbul",

    dateKey() {
        const date =
            new Intl.DateTimeFormat(
                "en-CA",
                {
                    timeZone:
                        this.timezone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }
            ).format(
                new Date()
            );

        return date;
    }
};

function getUsageDatabase() {
    const usage =
        getUsage();

    return Array.isArray(
        usage
    )
        ? usage
        : [];
}

function findUsageRecord(
    userId,
    date = TURKAI_USAGE_ENGINE.dateKey()
) {
    const usage =
        getUsageDatabase();

    return usage.find(
        item =>
            item.userId === userId &&
            item.date === date
    );
}

function createUsageRecord(
    userId
) {
    const usage =
        getUsageDatabase();

    const record = {
        id:
            createId(
                "usage"
            ),
        userId,
        date:
            TURKAI_USAGE_ENGINE.dateKey(),
        messages: 0,
        imageGenerations: 0,
        videoGenerations: 0,
        researchRequests: 0,
        uploads: 0,
        tokens: 0,
        updatedAt:
            nowISO()
    };

    usage.push(
        record
    );

    saveUsage(
        usage
    );

    return record;
}

function getOrCreateUsage(
    userId
) {
    return (
        findUsageRecord(
            userId
        ) ||
        createUsageRecord(
            userId
        )
    );
}

function incrementUsage(
    userId,
    field,
    amount = 1
) {
    const usage =
        getUsageDatabase();

    let record =
        usage.find(
            item =>
                item.userId === userId &&
                item.date ===
                    TURKAI_USAGE_ENGINE.dateKey()
        );

    if (!record) {
        record = {
            id:
                createId(
                    "usage"
                ),
            userId,
            date:
                TURKAI_USAGE_ENGINE.dateKey(),
            messages: 0,
            imageGenerations: 0,
            videoGenerations: 0,
            researchRequests: 0,
            uploads: 0,
            tokens: 0,
            updatedAt:
                nowISO()
        };

        usage.push(
            record
        );
    }

    if (
        typeof record[field] !==
        "number"
    ) {
        record[field] = 0;
    }

    record[field] +=
        Number(amount) || 0;

    record.updatedAt =
        nowISO();

    saveUsage(
        usage
    );

    return record;
}

function getUserUsage(
    userId
) {
    return getOrCreateUsage(
        userId
    );
}

function getUsageLimit(
    user,
    field
) {
    const plan =
        getUserPlan(
            user
        );

    if (
        field === "messages"
    ) {
        return plan.dailyMessages;
    }

    if (
        field ===
        "imageGenerations"
    ) {
        return plan.imageDaily;
    }

    if (
        field ===
        "videoGenerations"
    ) {
        return plan.videoDaily;
    }

    return Number.MAX_SAFE_INTEGER;
}

function canUseFeature(
    user,
    feature
) {
    const plan =
        getUserPlan(
            user
        );

    if (
        feature === "research"
    ) {
        return Boolean(
            plan.research
        );
    }

    if (
        feature === "memory"
    ) {
        return Boolean(
            plan.memory
        );
    }

    if (
        feature === "fileUpload"
    ) {
        return Boolean(
            plan.fileUpload
        );
    }

    if (
        feature === "image"
    ) {
        return (
            plan.imageDaily > 0
        );
    }

    if (
        feature === "video"
    ) {
        return (
            plan.videoDaily > 0
        );
    }

    return false;
}

function checkUsageLimit(
    user,
    field
) {
    const userId =
        user?.id ||
        "guest";

    const usage =
        getUserUsage(
            userId
        );

    const limit =
        getUsageLimit(
            user,
            field
        );

    const current =
        Number(
            usage[field]
        ) || 0;

    return {
        allowed:
            current < limit,
        current,
        limit,
        remaining:
            Math.max(
                0,
                limit - current
            )
    };
}

/* -------------------------------------------------------------------------- */
/* USAGE MIDDLEWARE                                                           */
/* -------------------------------------------------------------------------- */

async function resolveRequestUser(
    req
) {
    if (req.user) {
        return req.user;
    }

    return getGuestUser();
}

async function enforceMessageLimit(
    req,
    res,
    next
) {
    try {
        const user =
            await resolveRequestUser(
                req
            );

        const result =
            checkUsageLimit(
                user,
                "messages"
            );

        if (!result.allowed) {
            return res.status(429).json({
                success: false,
                code:
                    "DAILY_MESSAGE_LIMIT",
                error:
                    "Günlük mesaj limitine ulaştın.",
                usage: result
            });
        }

        req.turkaiUsage =
            result;

        next();
    } catch (error) {
        next(error);
    }
}

/* -------------------------------------------------------------------------- */
/* PATCH CHAT LIMIT                                                           */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/chat/limited",
    optionalAuth,
    enforceMessageLimit,
    async (req, res) => {
        const startedAt =
            Date.now();

        try {
            const user =
                await resolveRequestUser(
                    req
                );

            const message =
                aiSafeText(
                    req.body?.message
                );

            if (!message) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Mesaj gerekli."
                });
            }

            const result =
                await generateAIResponse({
                    userId:
                        user.id,
                    message,
                    history:
                        Array.isArray(
                            req.body?.history
                        )
                            ? req.body.history
                            : []
                });

            const usage =
                incrementUsage(
                    user.id,
                    "messages",
                    1
                );

            res.json({
                success: true,
                message:
                    result.text,
                provider:
                    result.provider,
                model:
                    result.model,
                usage,
                responseTime:
                    Date.now() -
                    startedAt
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Mesaj işlenemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PLAN API                                                                   */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/plans",
    (req, res) => {
        const plans =
            Object.values(
                TURKAI_PLAN_ENGINE
                    .defaults
            );

        res.json({
            success: true,
            plans
        });
    }
);

app.get(
    "/api/plans/:id",
    (req, res) => {
        const plan =
            TURKAI_PLAN_ENGINE
                .defaults[
                    normalizePlanId(
                        req.params.id
                    )
                ];

        res.json({
            success: true,
            plan
        });
    }
);

/* -------------------------------------------------------------------------- */
/* USER PLAN STATUS                                                           */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/account/plan",
    optionalAuth,
    async (req, res) => {
        try {
            const user =
                await resolveRequestUser(
                    req
                );

            const plan =
                getUserPlan(
                    user
                );

            const usage =
                getUserUsage(
                    user.id
                );

            res.json({
                success: true,
                user: {
                    id:
                        user.id,
                    email:
                        user.email,
                    name:
                        user.name
                },
                plan,
                usage,
                limits: {
                    messages:
                        checkUsageLimit(
                            user,
                            "messages"
                        ),
                    image:
                        checkUsageLimit(
                            user,
                            "imageGenerations"
                        ),
                    video:
                        checkUsageLimit(
                            user,
                            "videoGenerations"
                        )
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Plan bilgisi alınamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PRO CODE SYSTEM                                                            */
/* -------------------------------------------------------------------------- */

const TURKAI_PRO_SYSTEM = {
    environmentCode:
        process.env.TURKAI_PRO_CODE ||
        "",

    prefix:
        "TURKAI",

    maxActivations:
        Number(
            process.env.MAX_PRO_ACTIVATIONS ||
            10000
        )
};

function getPaymentsDatabase() {
    const payments =
        getPayments();

    return Array.isArray(
        payments
    )
        ? payments
        : [];
}

function createPaymentRecord(
    data
) {
    const payments =
        getPaymentsDatabase();

    const record = {
        id:
            createId(
                "payment"
            ),
        userId:
            aiSafeText(
                data.userId,
                "guest"
            ),
        plan:
            normalizePlanId(
                data.plan
            ),
        amount:
            Number(
                data.amount
            ) || 0,
        currency:
            aiSafeText(
                data.currency,
                "TRY"
            ),
        status:
            aiSafeText(
                data.status,
                "pending"
            ),
        provider:
            aiSafeText(
                data.provider,
                "manual"
            ),
        reference:
            aiSafeText(
                data.reference
            ),
        createdAt:
            nowISO(),
        updatedAt:
            nowISO()
    };

    payments.push(
        record
    );

    savePayments(
        payments
    );

    return record;
}

function updatePaymentRecord(
    paymentId,
    updates
) {
    const payments =
        getPaymentsDatabase();

    const record =
        payments.find(
            item =>
                item.id ===
                paymentId
        );

    if (!record) {
        return null;
    }

    Object.assign(
        record,
        updates,
        {
            updatedAt:
                nowISO()
        }
    );

    savePayments(
        payments
    );

    return record;
}

function findPayment(
    paymentId
) {
    return getPaymentsDatabase()
        .find(
            item =>
                item.id ===
                paymentId
        );
}

/* -------------------------------------------------------------------------- */
/* PRO ACTIVATION                                                             */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/pro/activate",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const code =
                aiSafeText(
                    req.body?.code
                );

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Aktivasyon kodu gerekli."
                });
            }

            if (
                !TURKAI_PRO_SYSTEM
                    .environmentCode
            ) {
                return res.status(503).json({
                    success: false,
                    error:
                        "Aktivasyon sistemi yapılandırılmamış."
                });
            }

            if (
                code !==
                TURKAI_PRO_SYSTEM
                    .environmentCode
            ) {
                logSecurity(
                    `Invalid Pro code attempt: ${userId}`
                );

                return res.status(403).json({
                    success: false,
                    error:
                        "Aktivasyon kodu geçersiz."
                });
            }

            const users =
                getUsers();

            const user =
                users.find(
                    item =>
                        item.id ===
                        userId
                );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Kullanıcı bulunamadı."
                });
            }

            user.plan =
                "pro";

            user.planActivatedAt =
                nowISO();

            user.updatedAt =
                nowISO();

            saveUsers(
                users
            );

            const payment =
                createPaymentRecord({
                    userId,
                    plan: "pro",
                    amount: 250,
                    currency: "TRY",
                    status: "activated",
                    provider:
                        "activation-code",
                    reference:
                        "PRO-CODE"
                });

            incrementStatistic(
                "pro_activations",
                1
            );

            res.json({
                success: true,
                message:
                    "Pro plan aktif edildi.",
                plan:
                    getPlanDefinition(
                        "pro"
                    ),
                payment
            });
        } catch (error) {
            logError(
                "pro activation failed",
                error.message
            );

            res.status(500).json({
                success: false,
                error:
                    "Pro aktivasyonu başarısız."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PAYMENT TEST                                                               */
/* -------------------------------------------------------------------------- */

app.post(
    "/api/test-payment",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const requestedPlan =
                normalizePlanId(
                    req.body?.plan ||
                    "pro"
                );

            const plan =
                getPlanDefinition(
                    requestedPlan
                );

            const payment =
                createPaymentRecord({
                    userId,
                    plan:
                        requestedPlan,
                    amount:
                        plan.price,
                    currency:
                        plan.currency,
                    status:
                        "test-pending",
                    provider:
                        "test"
                });

            res.json({
                success: true,
                test: true,
                payment,
                message:
                    "Test ödeme kaydı oluşturuldu."
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Test ödeme oluşturulamadı."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* PAYMENT API                                                                */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/payments",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const payments =
                getPaymentsDatabase()
                    .filter(
                        item =>
                            item.userId ===
                            userId
                    );

            res.json({
                success: true,
                payments
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Ödeme geçmişi alınamadı."
            });
        }
    }
);

app.get(
    "/api/payments/:id",
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        const payment =
            findPayment(
                req.params.id
            );

        if (!payment) {
            return res.status(404).json({
                success: false,
                error:
                    "Ödeme bulunamadı."
            });
        }

        if (
            payment.userId !==
            userId
        ) {
            return res.status(403).json({
                success: false,
                error:
                    "Yetkisiz erişim."
            });
        }

        res.json({
            success: true,
            payment
        });
    }
);

/* -------------------------------------------------------------------------- */
/* ADMIN AUTH                                                                 */
/* -------------------------------------------------------------------------- */

const TURKAI_ADMIN_SYSTEM = {
    enabled:
        Boolean(
            process.env.TURKAI_ADMIN_KEY
        ),

    key:
        process.env.TURKAI_ADMIN_KEY ||
        "",

    header:
        "x-turkai-admin-key"
};

function isAdminRequest(
    req
) {
    if (
        !TURKAI_ADMIN_SYSTEM.enabled
    ) {
        return false;
    }

    const provided =
        aiSafeText(
            req.headers[
                TURKAI_ADMIN_SYSTEM.header
            ]
        );

    if (!provided) {
        return false;
    }

    const expected =
        TURKAI_ADMIN_SYSTEM.key;

    if (
        provided.length !==
        expected.length
    ) {
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(
                provided
            ),
            Buffer.from(
                expected
            )
        );
    } catch {
        return false;
    }
}

function requireAdmin(
    req,
    res,
    next
) {
    if (
        !isAdminRequest(
            req
        )
    ) {
        logSecurity(
            `Admin access denied: ${req.ip}`
        );

        return res.status(403).json({
            success: false,
            error:
                "Yönetici yetkisi gerekli."
        });
    }

    next();
}

/* -------------------------------------------------------------------------- */
/* ADMIN DASHBOARD DATA                                                       */
/* -------------------------------------------------------------------------- */

function getAdminSummary() {
    const users =
        getUsers();

    const chats =
        getChats();

    const messages =
        getMessages();

    const memories =
        getMemories();

    const files =
        getFiles();

    const projects =
        getProjects();

    const payments =
        getPayments();

    return {
        generatedAt:
            nowISO(),

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

        projects:
            projects.length,

        payments:
            payments.length,

        server: {
            uptime:
                process.uptime(),
            memory:
                process.memoryUsage(),
            pid:
                process.pid
        },

        ai: {
            ...TURKAI_RUNTIME.ai
        },

        sockets: {
            ...TURKAI_SOCKET
        }
    };
}

app.get(
    "/api/admin/summary",
    requireAdmin,
    (req, res) => {
        res.json({
            success: true,
            summary:
                getAdminSummary()
        });
    }
);

/* -------------------------------------------------------------------------- */
/* ADMIN USERS                                                                */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/admin/users",
    requireAdmin,
    (req, res) => {
        const users =
            getUsers();

        res.json({
            success: true,
            users:
                users.map(
                    user => ({
                        id:
                            user.id,
                        name:
                            user.name,
                        email:
                            user.email,
                        plan:
                            user.plan,
                        createdAt:
                            user.createdAt,
                        updatedAt:
                            user.updatedAt
                    })
                )
        });
    }
);

app.post(
    "/api/admin/users/:id/plan",
    requireAdmin,
    (req, res) => {
        try {
            const plan =
                normalizePlanId(
                    req.body?.plan
                );

            const users =
                getUsers();

            const user =
                users.find(
                    item =>
                        item.id ===
                        req.params.id
                );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Kullanıcı bulunamadı."
                });
            }

            user.plan =
                plan;

            user.updatedAt =
                nowISO();

            saveUsers(
                users
            );

            logSecurity(
                `Admin changed plan: ${user.id} -> ${plan}`
            );

            res.json({
                success: true,
                user: {
                    id:
                        user.id,
                    plan:
                        user.plan
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Plan değiştirilemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* ADMIN STATISTICS                                                           */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/admin/statistics",
    requireAdmin,
    (req, res) => {
        res.json({
            success: true,
            statistics:
                getStatistics()
        });
    }
);

/* -------------------------------------------------------------------------- */
/* SETTINGS ENGINE                                                            */
/* -------------------------------------------------------------------------- */

const TURKAI_SETTINGS = {
    defaults: {
        appName:
            "TürkAI",

        language:
            "tr-TR",

        theme:
            "dark",

        accent:
            "#7c5cff",

        animations:
            true,

        sound:
            false,

        notifications:
            true,

        research:
            true,

        memory:
            true,

        autoSaveKnowledge:
            true,

        safeMode:
            true,

        compactMode:
            false
    }
};

function getSettingsDatabase() {
    const settings =
        getSettings();

    if (
        !settings ||
        typeof settings !==
            "object" ||
        Array.isArray(settings)
    ) {
        return {};
    }

    return settings;
}

function getUserSettings(
    userId
) {
    const settings =
        getSettingsDatabase();

    return {
        ...TURKAI_SETTINGS.defaults,
        ...(settings[userId] || {})
    };
}

function saveUserSettings(
    userId,
    updates
) {
    const settings =
        getSettingsDatabase();

    const current =
        getUserSettings(
            userId
        );

    settings[userId] = {
        ...current,
        ...updates,
        updatedAt:
            nowISO()
    };

    saveSettings(
        settings
    );

    return settings[userId];
}

function sanitizeSettings(
    input
) {
    if (
        !input ||
        typeof input !==
            "object"
    ) {
        return {};
    }

    const allowed = [
        "language",
        "theme",
        "accent",
        "animations",
        "sound",
        "notifications",
        "research",
        "memory",
        "autoSaveKnowledge",
        "safeMode",
        "compactMode"
    ];

    const output = {};

    for (
        const key of allowed
    ) {
        if (
            Object.prototype.hasOwnProperty.call(
                input,
                key
            )
        ) {
            output[key] =
                input[key];
        }
    }

    if (
        typeof output.language ===
        "string"
    ) {
        output.language =
            output.language
                .slice(0, 20);
    }

    if (
        typeof output.theme ===
        "string"
    ) {
        output.theme =
            output.theme
                .slice(0, 30);
    }

    if (
        typeof output.accent ===
        "string"
    ) {
        output.accent =
            output.accent
                .slice(0, 30);
    }

    return output;
}

app.get(
    "/api/settings",
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        res.json({
            success: true,
            settings:
                getUserSettings(
                    userId
                )
        });
    }
);

app.put(
    "/api/settings",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id ||
                "guest";

            const updates =
                sanitizeSettings(
                    req.body
                );

            const settings =
                saveUserSettings(
                    userId,
                    updates
                );

            res.json({
                success: true,
                settings
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Ayarlar kaydedilemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* USER PROFILE                                                               */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/profile",
    optionalAuth,
    (req, res) => {
        const user =
            req.user ||
            getGuestUser();

        res.json({
            success: true,
            profile: {
                id:
                    user.id,
                name:
                    user.name,
                email:
                    user.email,
                plan:
                    user.plan ||
                    "free",
                createdAt:
                    user.createdAt
            }
        });
    }
);

app.put(
    "/api/profile",
    optionalAuth,
    (req, res) => {
        try {
            const userId =
                req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error:
                        "Giriş gerekli."
                });
            }

            const users =
                getUsers();

            const user =
                users.find(
                    item =>
                        item.id ===
                        userId
                );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Kullanıcı bulunamadı."
                });
            }

            if (
                typeof req.body?.name ===
                "string"
            ) {
                user.name =
                    req.body.name
                        .trim()
                        .slice(
                            0,
                            100
                        );
            }

            user.updatedAt =
                nowISO();

            saveUsers(
                users
            );

            res.json({
                success: true,
                profile: {
                    id:
                        user.id,
                    name:
                        user.name,
                    email:
                        user.email,
                    plan:
                        user.plan
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error:
                    "Profil güncellenemedi."
            });
        }
    }
);

/* -------------------------------------------------------------------------- */
/* SECURITY STATUS                                                            */
/* -------------------------------------------------------------------------- */

const TURKAI_SECURITY = {
    startedAt:
        nowISO(),

    counters: {
        blockedRequests: 0,
        invalidTokens: 0,
        adminFailures: 0,
        suspiciousRequests: 0
    },

    configuration: {
        maxBody:
            "10mb",

        rateWindow:
            60000,

        rateLimit:
            120
    }
};

const TURKAI_RATE_LIMIT = new Map();

function rateLimitKey(
    req
) {
    return (
        aiSafeText(
            req.ip,
            "unknown"
        ) +
        ":" +
        aiSafeText(
            req.path,
            "unknown"
        )
    );
}

function securityRateLimiter(
    req,
    res,
    next
) {
    const key =
        rateLimitKey(
            req
        );

    const now =
        Date.now();

    const current =
        TURKAI_RATE_LIMIT.get(
            key
        );

    if (!current) {
        TURKAI_RATE_LIMIT.set(
            key,
            {
                count: 1,
                startedAt:
                    now
            }
        );

        return next();
    }

    if (
        now -
        current.startedAt >
        TURKAI_SECURITY
            .configuration
            .rateWindow
    ) {
        current.count = 1;
        current.startedAt = now;

        return next();
    }

    current.count += 1;

    if (
        current.count >
        TURKAI_SECURITY
            .configuration
            .rateLimit
    ) {
        TURKAI_SECURITY
            .counters
            .blockedRequests += 1;

        res.setHeader(
            "Retry-After",
            "60"
        );

        return res.status(429).json({
            success: false,
            error:
                "Çok fazla istek gönderildi."
        });
    }

    next();
}

app.use(
    "/api",
    securityRateLimiter
);

/* -------------------------------------------------------------------------- */
/* SECURITY STATUS API                                                        */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/security/status",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            security: {
                ...TURKAI_SECURITY.counters
            },
            configuration: {
                rateWindow:
                    TURKAI_SECURITY
                        .configuration
                        .rateWindow,
                rateLimit:
                    TURKAI_SECURITY
                        .configuration
                        .rateLimit
            }
        });
    }
);

/* -------------------------------------------------------------------------- */
/* AUDIT LOG                                                                  */
/* -------------------------------------------------------------------------- */

function addAuditEvent(
    type,
    data = {}
) {
    const audit =
        getAudit();

    const event = {
        id:
            createId(
                "audit"
            ),
        type:
            aiSafeText(
                type,
                "event"
            ),
        data:
            data &&
            typeof data ===
                "object"
                ? data
                : {
                    value:
                        String(data)
                },
        createdAt:
            nowISO()
    };

    audit.push(
        event
    );

    if (
        audit.length >
        10000
    ) {
        audit.splice(
            0,
            audit.length -
                10000
        );
    }

    saveAudit(
        audit
    );

    return event;
}

app.get(
    "/api/admin/audit",
    requireAdmin,
    (req, res) => {
        const audit =
            getAudit();

        res.json({
            success: true,
            audit:
                audit.slice(
                    -500
                )
        });
    }
);

/* -------------------------------------------------------------------------- */
/* NOTIFICATIONS                                                              */
/* -------------------------------------------------------------------------- */

function getUserNotifications(
    userId
) {
    return getNotifications()
        .filter(
            item =>
                item.userId ===
                userId
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
            createId(
                "notification"
            ),
        userId,
        title:
            aiSafeText(
                title,
                "TürkAI"
            ).slice(
                0,
                150
            ),
        message:
            aiSafeText(
                message
            ).slice(
                0,
                1000
            ),
        type:
            aiSafeText(
                type,
                "info"
            ),
        read: false,
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
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        res.json({
            success: true,
            notifications:
                getUserNotifications(
                    userId
                )
        });
    }
);

app.post(
    "/api/notifications/:id/read",
    optionalAuth,
    (req, res) => {
        const userId =
            req.user?.id ||
            "guest";

        const notifications =
            getNotifications();

        const notification =
            notifications.find(
                item =>
                    item.id ===
                        req.params.id &&
                    item.userId ===
                        userId
            );

        if (!notification) {
            return res.status(404).json({
                success: false,
                error:
                    "Bildirim bulunamadı."
            });
        }

        notification.read =
            true;

        notification.readAt =
            nowISO();

        saveNotifications(
            notifications
        );

        res.json({
            success: true,
            notification
        });
    }
);

/* -------------------------------------------------------------------------- */
/* SYSTEM CONFIGURATION                                                       */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/system/config",
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            config: {
                appName:
                    APP_NAME,
                version:
                    APP_VERSION,
                environment:
                    NODE_ENV,
                production:
                    IS_PRODUCTION,
                host:
                    HOST,
                port:
                    PORT,
                features: {
                    ai: true,
                    localAI: true,
                    research: true,
                    weather: true,
                    currency: true,
                    memory: true,
                    files: true,
                    projects: true,
                    sockets: true,
                    plans: true,
                    payments: true
                }
            }
        });
    }
);

/* -------------------------------------------------------------------------- */
/* ADMIN HEALTH                                                               */
/* -------------------------------------------------------------------------- */

app.get(
    "/api/admin/health",
    requireAdmin,
    (req, res) => {
        res.json({
            success: true,
            timestamp:
                nowISO(),
            process: {
                pid:
                    process.pid,
                uptime:
                    process.uptime(),
                memory:
                    process.memoryUsage(),
                node:
                    process.version
            },
            ai:
                TURKAI_RUNTIME.ai,
            providers:
                getAIProviderSummary(),
            socket:
                TURKAI_SOCKET
        });
    }
);

/* -------------------------------------------------------------------------- */
/* CLEAN OLD RATE LIMIT DATA                                                  */
/* -------------------------------------------------------------------------- */

const TURKAI_RATE_CLEANUP =
    setInterval(
        () => {
            const now =
                Date.now();

            for (
                const [
                    key,
                    item
                ]
                of TURKAI_RATE_LIMIT.entries()
            ) {
                if (
                    now -
                    item.startedAt >
                    TURKAI_SECURITY
                        .configuration
                        .rateWindow *
                        2
                ) {
                    TURKAI_RATE_LIMIT.delete(
                        key
                    );
                }
            }
        },
        120000
    );

if (
    typeof TURKAI_RATE_CLEANUP?.unref ===
    "function"
) {
    TURKAI_RATE_CLEANUP.unref();
}

/* -------------------------------------------------------------------------- */
/* PART 4 RESOURCE SHUTDOWN                                                   */
/* -------------------------------------------------------------------------- */

function shutdownPart4Resources() {
    try {
        clearInterval(
            TURKAI_RATE_CLEANUP
        );
    } catch {
        /* ignored */
    }

    try {
        TURKAI_RATE_LIMIT.clear();
    } catch {
        /* ignored */
    }
}

/* -------------------------------------------------------------------------- */
/* END OF PART 4                                                              */
/* PART 5: FINAL ROUTES • ERROR HANDLING • SPA • START SERVER • SHUTDOWN      */
/* ========================================================================== *
/
/* ============================================================
   TÜRKAI SERVER.JS — PART 5
   FINAL ROUTES • ERROR HANDLING • SPA • SOCKETS
   • START SERVER • SHUTDOWN • EXPORTS
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   FINAL RUNTIME STATE
   ------------------------------------------------------------ */

const TURKAI_FINAL_RUNTIME = {
    started: false,
    startedAt: null,
    shuttingDown: false,
    httpServerReady: false,
    socketReady: false,
    lastError: null,
    lastErrorAt: null,
    shutdownReason: null
};

/*
 * ÖNEMLİ:
 * Burada SERVER_STATE gibi başka parçalarda kullanılan isimleri
 * tekrar tanımlamıyoruz.
 */

function getFinalRuntimeStatus() {
    return {
        started: TURKAI_FINAL_RUNTIME.started,
        startedAt: TURKAI_FINAL_RUNTIME.startedAt,
        shuttingDown: TURKAI_FINAL_RUNTIME.shuttingDown,
        httpServerReady: TURKAI_FINAL_RUNTIME.httpServerReady,
        socketReady: TURKAI_FINAL_RUNTIME.socketReady,
        lastError: TURKAI_FINAL_RUNTIME.lastError,
        lastErrorAt: TURKAI_FINAL_RUNTIME.lastErrorAt,
        shutdownReason: TURKAI_FINAL_RUNTIME.shutdownReason,
        uptime: Math.floor(process.uptime())
    };
}

/* ------------------------------------------------------------
   ROOT / BASIC ROUTES
   ------------------------------------------------------------ */

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        name: APP_NAME,
        version: APP_VERSION,
        description: APP_DESCRIPTION,
        status: "online",
        message: "TürkAI sunucusu çalışıyor.",
        endpoints: {
            health: "/api/health",
            status: "/api/status",
            plans: "/api/plans",
            chat: "/api/chat",
            research: "/api/research",
            weather: "/api/weather",
            me: "/api/me",
            metrics: "/api/metrics"
        },
        timestamp: nowISO()
    });
});

app.get("/api", (req, res) => {
    res.json({
        success: true,
        name: APP_NAME,
        version: APP_VERSION,
        status: "online",
        api: "TürkAI API",
        timestamp: nowISO()
    });
});

app.get("/api/version", (req, res) => {
    res.json({
        success: true,
        name: APP_NAME,
        version: APP_VERSION,
        node: process.version,
        environment: NODE_ENV,
        timestamp: nowISO()
    });
});

app.get("/api/ping", (req, res) => {
    res.json({
        success: true,
        pong: true,
        timestamp: nowISO()
    });
});

/* ------------------------------------------------------------
   API CAPABILITIES
   ------------------------------------------------------------ */

app.get("/api/capabilities", (req, res) => {
    res.json({
        success: true,
        capabilities: {
            chat: true,
            localAI: true,
            memory: true,
            knowledge: true,
            research: true,
            weather: true,
            currency: true,
            coding: true,
            cybersecurity: true,
            fileUpload: true,
            projects: true,
            plans: true,
            payments: true,
            notifications: true,
            sockets: true,
            statistics: true,
            admin: true,
            settings: true
        },
        providers: typeof getAIProviderSummary === "function"
            ? getAIProviderSummary()
            : {
                local: true,
                groq: Boolean(process.env.GROQ_API_KEY),
                cerebras: Boolean(process.env.CEREBRAS_API_KEY),
                openrouter: Boolean(process.env.OPENROUTER_API_KEY),
                gemini: Boolean(process.env.GEMINI_API_KEY)
            },
        timestamp: nowISO()
    });
});

/* ------------------------------------------------------------
   AI STATUS
   ------------------------------------------------------------ */

app.get("/api/ai/status", (req, res) => {
    let providers = {};

    try {
        if (typeof getAIProviderSummary === "function") {
            providers = getAIProviderSummary();
        }
    } catch (error) {
        providers = {};
    }

    res.json({
        success: true,
        ai: {
            online: true,
            local: true,
            providers,
            runtime: getFinalRuntimeStatus()
        },
        timestamp: nowISO()
    });
});

app.get("/api/ai/providers", (req, res) => {
    let providers = {};

    try {
        if (typeof getAIProviderSummary === "function") {
            providers = getAIProviderSummary();
        }
    } catch (error) {
        providers = {};
    }

    res.json({
        success: true,
        providers,
        timestamp: nowISO()
    });
});

/* ------------------------------------------------------------
   SIMPLE LOCAL COMMAND ROUTES
   ------------------------------------------------------------ */

function normalizeCommandInput(value) {
    return cleanText(
        typeof value === "string"
            ? value
            : ""
    ).slice(0, 10000);
}

function localCommandResponse(message) {
    const text = normalizeText(message);

    if (!text) {
        return {
            success: false,
            answer: "Bir mesaj yazmalısın."
        };
    }

    if (
        text === "en hızlı kim" ||
        text === "en hizli kim"
    ) {
        return {
            success: true,
            answer: "TürkAI ⚡🤖",
            source: "local"
        };
    }

    if (
        text === "merhaba" ||
        text === "selam" ||
        text === "hello"
    ) {
        return {
            success: true,
            answer: "Merhaba! Ben TürkAI. Sana nasıl yardımcı olabilirim?",
            source: "local"
        };
    }

    if (
        text.includes("hangi model") ||
        text.includes("hangi yapay zeka")
    ) {
        return {
            success: true,
            answer: "TürkAI'nin yerel AI sistemi ve yapılandırılmış AI sağlayıcıları birlikte kullanılabilir.",
            source: "local"
        };
    }

    if (
        text.includes("sunucu çalışıyor mu") ||
        text.includes("server çalışıyor mu")
    ) {
        return {
            success: true,
            answer: "Evet. TürkAI sunucusu çalışıyor.",
            source: "local"
        };
    }

    return null;
}

/* ------------------------------------------------------------
   LOCAL COMMAND API
   ------------------------------------------------------------ */

app.post("/api/command", optionalAuth, async (req, res) => {
    try {
        const message = normalizeCommandInput(
            req.body?.message ||
            req.body?.text ||
            ""
        );

        const result = localCommandResponse(message);

        if (!result) {
            return res.json({
                success: true,
                handled: false,
                message,
                timestamp: nowISO()
            });
        }

        return res.json({
            ...result,
            handled: true,
            timestamp: nowISO()
        });
    } catch (error) {
        logError("Command API error", error);

        return res.status(500).json({
            success: false,
            error: "Komut işlenemedi.",
            timestamp: nowISO()
        });
    }
});

/* ------------------------------------------------------------
   FINAL CHAT ROUTE
   ------------------------------------------------------------ */

app.post("/api/chat/final", optionalAuth, async (req, res) => {
    const requestStarted = Date.now();

    try {
        const message = normalizeCommandInput(
            req.body?.message ||
            req.body?.prompt ||
            req.body?.text ||
            ""
        );

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Mesaj boş olamaz.",
                timestamp: nowISO()
            });
        }

        if (message.length > 30000) {
            return res.status(413).json({
                success: false,
                error: "Mesaj çok uzun.",
                timestamp: nowISO()
            });
        }

        const localResult = localCommandResponse(message);

        if (localResult) {
            incrementStatistic("chat_local_answers", 1);

            return res.json({
                ...localResult,
                model: "turkai-local",
                latency: Date.now() - requestStarted,
                timestamp: nowISO()
            });
        }

        if (typeof generateAIResponse !== "function") {
            return res.status(503).json({
                success: false,
                error: "AI motoru henüz hazır değil.",
                fallback: true,
                timestamp: nowISO()
            });
        }

        const user = req.user || null;

        const result = await generateAIResponse({
            message,
            user,
            request: req,
            conversationId:
                req.body?.conversationId ||
                req.body?.chatId ||
                null,
            model:
                req.body?.model ||
                null,
            temperature:
                safeNumber(req.body?.temperature, 0.7),
            maxTokens:
                safeNumber(req.body?.maxTokens, 2000)
        });

        incrementStatistic("chat_requests", 1);

        return res.json({
            success: true,
            ...(
                result &&
                typeof result === "object"
                    ? result
                    : {
                        answer: String(result || "")
                    }
            ),
            latency: Date.now() - requestStarted,
            timestamp: nowISO()
        });

    } catch (error) {
        logError("Final chat route error", error);

        incrementStatistic("chat_errors", 1);

        return res.status(500).json({
            success: false,
            error: "AI yanıtı oluşturulurken bir hata oluştu.",
            fallback: true,
            latency: Date.now() - requestStarted,
            timestamp: nowISO()
        });
    }
});

/* ------------------------------------------------------------
   RESEARCH FALLBACK
   ------------------------------------------------------------ */

app.post("/api/research/query", optionalAuth, async (req, res) => {
    try {
        const query = normalizeCommandInput(
            req.body?.query ||
            req.body?.question ||
            req.body?.message ||
            ""
        );

        if (!query) {
            return res.status(400).json({
                success: false,
                error: "Araştırma sorgusu gerekli."
            });
        }

        const researchResult = {
            id: createId("research"),
            query,
            status: "queued",
            createdAt: nowISO()
        };

        try {
            const research = getResearch();

            research.unshift(researchResult);

            saveResearch(
                research.slice(0, 500)
            );
        } catch (error) {
            logWarn("Research database save failed", error.message);
        }

        incrementStatistic("research_requests", 1);

        return res.json({
            success: true,
            research: researchResult,
            message: "Araştırma isteği alındı.",
            timestamp: nowISO()
        });

    } catch (error) {
        logError("Research query error", error);

        return res.status(500).json({
            success: false,
            error: "Araştırma başlatılamadı."
        });
    }
});

/* ------------------------------------------------------------
   MEMORY ROUTES
   ------------------------------------------------------------ */

function getMemoryArray() {
    try {
        const data = getMemories();

        return Array.isArray(data)
            ? data
            : [];
    } catch (error) {
        return [];
    }
}

app.get("/api/memory", optionalAuth, (req, res) => {
    try {
        const userId =
            req.user?.id ||
            req.query.userId ||
            "guest";

        const memories = getMemoryArray()
            .filter(item => {
                if (!item || typeof item !== "object") {
                    return false;
                }

                return (
                    item.userId === userId ||
                    item.userId === "guest"
                );
            })
            .slice(0, 200);

        res.json({
            success: true,
            memories,
            count: memories.length,
            timestamp: nowISO()
        });
    } catch (error) {
        logError("Memory GET error", error);

        res.status(500).json({
            success: false,
            error: "Hafıza alınamadı."
        });
    }
});

app.post("/api/memory", optionalAuth, (req, res) => {
    try {
        const content = cleanText(
            req.body?.content ||
            req.body?.text ||
            ""
        ).slice(0, 5000);

        if (!content) {
            return res.status(400).json({
                success: false,
                error: "Hafıza içeriği gerekli."
            });
        }

        const memories = getMemoryArray();

        const memory = {
            id: createId("memory"),
            userId: req.user?.id || "guest",
            content,
            category:
                cleanText(req.body?.category || "general")
                    .slice(0, 100),
            importance:
                clamp(
                    safeNumber(req.body?.importance, 5),
                    1,
                    10
                ),
            createdAt: nowISO(),
            updatedAt: nowISO()
        };

        memories.unshift(memory);

        saveMemories(
            memories.slice(0, 5000)
        );

        incrementStatistic("memory_created", 1);

        res.json({
            success: true,
            memory
        });
    } catch (error) {
        logError("Memory POST error", error);

        res.status(500).json({
            success: false,
            error: "Hafıza kaydedilemedi."
        });
    }
});

app.delete("/api/memory/:id", optionalAuth, (req, res) => {
    try {
        const id = cleanText(req.params.id);

        const memories = getMemoryArray();

        const before = memories.length;

        const filtered = memories.filter(item => {
            if (!item) return false;

            if (item.id !== id) {
                return true;
            }

            if (!req.user?.id) {
                return item.userId !== "guest";
            }

            return item.userId !== req.user.id;
        });

        saveMemories(filtered);

        res.json({
            success: true,
            deleted: before !== filtered.length
        });
    } catch (error) {
        logError("Memory DELETE error", error);

        res.status(500).json({
            success: false,
            error: "Hafıza silinemedi."
        });
    }
});

/* ------------------------------------------------------------
   KNOWLEDGE ROUTES
   ------------------------------------------------------------ */

app.get("/api/knowledge", (req, res) => {
    try {
        const knowledge = getKnowledge();

        const list = Array.isArray(knowledge)
            ? knowledge
            : [];

        res.json({
            success: true,
            count: list.length,
            knowledge: list.slice(0, 500),
            timestamp: nowISO()
        });
    } catch (error) {
        logError("Knowledge GET error", error);

        res.status(500).json({
            success: false,
            error: "Bilgi veritabanı okunamadı."
        });
    }
});

app.post("/api/knowledge", optionalAuth, (req, res) => {
    try {
        const question = cleanText(
            req.body?.question ||
            ""
        ).slice(0, 3000);

        const answer = cleanText(
            req.body?.answer ||
            ""
        ).slice(0, 10000);

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                error: "Soru ve cevap gerekli."
            });
        }

        const knowledge = getKnowledge();

        const item = {
            id: createId("knowledge"),
            question,
            answer,
            source:
                cleanText(req.body?.source || "turkai-local")
                    .slice(0, 200),
            createdAt: nowISO(),
            updatedAt: nowISO()
        };

        knowledge.unshift(item);

        saveKnowledge(
            knowledge.slice(0, 10000)
        );

        incrementStatistic("knowledge_created", 1);

        res.json({
            success: true,
            item
        });
    } catch (error) {
        logError("Knowledge POST error", error);

        res.status(500).json({
            success: false,
            error: "Bilgi kaydedilemedi."
        });
    }
});

/* ------------------------------------------------------------
   PROJECT ROUTES
   ------------------------------------------------------------ */

app.get("/api/projects", optionalAuth, (req, res) => {
    try {
        const projects = getProjects();

        const userId =
            req.user?.id ||
            "guest";

        const result = (
            Array.isArray(projects)
                ? projects
                : []
        ).filter(project => {
            if (!project) return false;

            return (
                project.userId === userId ||
                project.userId === "guest"
            );
        });

        res.json({
            success: true,
            projects: result,
            count: result.length
        });
    } catch (error) {
        logError("Projects GET error", error);

        res.status(500).json({
            success: false,
            error: "Projeler alınamadı."
        });
    }
});

app.post("/api/projects", optionalAuth, (req, res) => {
    try {
        const name = cleanText(
            req.body?.name ||
            req.body?.title ||
            ""
        ).slice(0, 200);

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Proje adı gerekli."
            });
        }

        const projects = getProjects();

        const project = {
            id: createId("project"),
            userId: req.user?.id || "guest",
            name,
            description:
                cleanText(req.body?.description || "")
                    .slice(0, 2000),
            language:
                cleanText(req.body?.language || "text")
                    .slice(0, 100),
            code:
                typeof req.body?.code === "string"
                    ? req.body.code.slice(0, 200000)
                    : "",
            createdAt: nowISO(),
            updatedAt: nowISO()
        };

        projects.unshift(project);

        saveProjects(
            projects.slice(0, 1000)
        );

        incrementStatistic("projects_created", 1);

        res.status(201).json({
            success: true,
            project
        });
    } catch (error) {
        logError("Projects POST error", error);

        res.status(500).json({
            success: false,
            error: "Proje oluşturulamadı."
        });
    }
});

app.put("/api/projects/:id", optionalAuth, (req, res) => {
    try {
        const id = cleanText(req.params.id);

        const projects = getProjects();

        const index = projects.findIndex(
            project => project && project.id === id
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: "Proje bulunamadı."
            });
        }

        const project = projects[index];

        if (
            req.user?.id &&
            project.userId !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: "Bu projeye erişim izniniz yok."
            });
        }

        if (typeof req.body?.name === "string") {
            project.name =
                cleanText(req.body.name).slice(0, 200);
        }

        if (typeof req.body?.description === "string") {
            project.description =
                cleanText(req.body.description).slice(0, 2000);
        }

        if (typeof req.body?.language === "string") {
            project.language =
                cleanText(req.body.language).slice(0, 100);
        }

        if (typeof req.body?.code === "string") {
            project.code =
                req.body.code.slice(0, 200000);
        }

        project.updatedAt = nowISO();

        projects[index] = project;

        saveProjects(projects);

        res.json({
            success: true,
            project
        });
    } catch (error) {
        logError("Project PUT error", error);

        res.status(500).json({
            success: false,
            error: "Proje güncellenemedi."
        });
    }
});

app.delete("/api/projects/:id", optionalAuth, (req, res) => {
    try {
        const id = cleanText(req.params.id);

        const projects = getProjects();

        const index = projects.findIndex(
            project => project && project.id === id
        );

        if (index === -1) {
            return res.status(404).json({
                success: false,
                error: "Proje bulunamadı."
            });
        }

        const project = projects[index];

        if (
            req.user?.id &&
            project.userId !== req.user.id
        ) {
            return res.status(403).json({
                success: false,
                error: "Bu projeyi silemezsiniz."
            });
        }

        projects.splice(index, 1);

        saveProjects(projects);

        incrementStatistic("projects_deleted", 1);

        res.json({
            success: true,
            deleted: true
        });
    } catch (error) {
        logError("Project DELETE error", error);

        res.status(500).json({
            success: false,
            error: "Proje silinemedi."
        });
    }
});

/* ------------------------------------------------------------
   FILE / UPLOAD ROUTES
   ------------------------------------------------------------ */

app.get("/api/files", optionalAuth, (req, res) => {
    try {
        const files = getFiles();

        const userId =
            req.user?.id ||
            "guest";

        const result = (
            Array.isArray(files)
                ? files
                : []
        ).filter(file => {
            return (
                file &&
                (
                    file.userId === userId ||
                    file.userId === "guest"
                )
            );
        });

        res.json({
            success: true,
            files: result,
            count: result.length
        });
    } catch (error) {
        logError("Files GET error", error);

        res.status(500).json({
            success: false,
            error: "Dosyalar alınamadı."
        });
    }
});

app.post("/api/files/register", optionalAuth, (req, res) => {
    try {
        const name = cleanText(
            req.body?.name ||
            ""
        ).slice(0, 255);

        if (!name) {
            return res.status(400).json({
                success: false,
                error: "Dosya adı gerekli."
            });
        }

        const files = getFiles();

        const file = {
            id: createId("file"),
            userId: req.user?.id || "guest",
            name,
            type:
                cleanText(req.body?.type || "application/octet-stream")
                    .slice(0, 200),
            size:
                clamp(
                    safeNumber(req.body?.size, 0),
                    0,
                    100 * 1024 * 1024
                ),
            path:
                cleanText(req.body?.path || "")
                    .slice(0, 1000),
            createdAt: nowISO()
        };

        files.unshift(file);

        saveFiles(
            files.slice(0, 5000)
        );

        incrementStatistic("files_registered", 1);

        res.status(201).json({
            success: true,
            file
        });
    } catch (error) {
        logError("File register error", error);

        res.status(500).json({
            success: false,
            error: "Dosya kaydedilemedi."
        });
    }
});

/* ------------------------------------------------------------
   WEATHER PROXY
   ------------------------------------------------------------ */

app.get("/api/weather/current", optionalAuth, async (req, res) => {
    try {
        const city = cleanText(
            req.query.city ||
            req.query.location ||
            "Konya"
        ).slice(0, 100);

        /*
         * Harici servis zorunlu değil.
         * API anahtarı yoksa kontrollü fallback döndürülür.
         */

        const weatherApiKey =
            process.env.OPENWEATHER_API_KEY ||
            process.env.WEATHER_API_KEY ||
            "";

        if (!weatherApiKey) {
            return res.json({
                success: true,
                source: "fallback",
                city,
                available: false,
                message:
                    "Hava durumu sağlayıcısı yapılandırılmamış.",
                timestamp: nowISO()
            });
        }

        const https = require("https");

        const url =
            "https://api.openweathermap.org/data/2.5/weather" +
            "?q=" +
            encodeURIComponent(city) +
            "&appid=" +
            encodeURIComponent(weatherApiKey) +
            "&units=metric" +
            "&lang=tr";

        const data = await new Promise((resolve, reject) => {
            const request = https.get(
                url,
                {
                    timeout: 10000,
                    headers: {
                        "User-Agent": "TurkAI/15"
                    }
                },
                response => {
                    let body = "";

                    response.on(
                        "data",
                        chunk => {
                            body += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {
                            try {
                                resolve({
                                    status: response.statusCode,
                                    data: JSON.parse(body)
                                });
                            } catch (error) {
                                reject(error);
                            }
                        }
                    );
                }
            );

            request.on(
                "timeout",
                () => {
                    request.destroy(
                        new Error("Weather API timeout")
                    );
                }
            );

            request.on(
                "error",
                reject
            );
        });

        if (
            !data ||
            data.status < 200 ||
            data.status >= 300
        ) {
            return res.status(502).json({
                success: false,
                error: "Hava durumu servisi yanıt vermedi."
            });
        }

        return res.json({
            success: true,
            source: "openweathermap",
            city: data.data.name,
            country:
                data.data.sys?.country || "",
            temperature:
                data.data.main?.temp ?? null,
            feelsLike:
                data.data.main?.feels_like ?? null,
            humidity:
                data.data.main?.humidity ?? null,
            pressure:
                data.data.main?.pressure ?? null,
            wind:
                data.data.wind?.speed ?? null,
            description:
                data.data.weather?.[0]?.description || "",
            icon:
                data.data.weather?.[0]?.icon || null,
            raw: data.data,
            timestamp: nowISO()
        });

    } catch (error) {
        logError("Weather API error", error);

        return res.status(500).json({
            success: false,
            error: "Hava durumu alınamadı."
        });
    }
});

/* ------------------------------------------------------------
   CURRENCY ROUTE
   ------------------------------------------------------------ */

app.get("/api/currency", async (req, res) => {
    try {
        const base = cleanText(
            req.query.base || "USD"
        ).toUpperCase();

        const target = cleanText(
            req.query.target || "TRY"
        ).toUpperCase();

        const allowed = /^[A-Z]{3}$/;

        if (
            !allowed.test(base) ||
            !allowed.test(target)
        ) {
            return res.status(400).json({
                success: false,
                error: "Geçersiz para birimi."
            });
        }

        if (base === target) {
            return res.json({
                success: true,
                base,
                target,
                rate: 1,
                source: "local"
            });
        }

        const https = require("https");

        const url =
            "https://api.frankfurter.app/latest" +
            "?from=" +
            encodeURIComponent(base) +
            "&to=" +
            encodeURIComponent(target);

        const data = await new Promise((resolve, reject) => {
            const request = https.get(
                url,
                {
                    timeout: 10000,
                    headers: {
                        "User-Agent": "TurkAI/15"
                    }
                },
                response => {
                    let body = "";

                    response.on(
                        "data",
                        chunk => {
                            body += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {
                            try {
                                resolve({
                                    status: response.statusCode,
                                    data: JSON.parse(body)
                                });
                            } catch (error) {
                                reject(error);
                            }
                        }
                    );
                }
            );

            request.on(
                "timeout",
                () => {
                    request.destroy(
                        new Error("Currency timeout")
                    );
                }
            );

            request.on(
                "error",
                reject
            );
        });

        if (
            data.status < 200 ||
            data.status >= 300
        ) {
            return res.status(502).json({
                success: false,
                error: "Döviz servisi yanıt vermedi."
            });
        }

        const rate =
            data.data?.rates?.[target] ?? null;

        return res.json({
            success: rate !== null,
            base,
            target,
            rate,
            date: data.data?.date || null,
            source: "frankfurter",
            timestamp: nowISO()
        });

    } catch (error) {
        logError("Currency error", error);

        return res.status(500).json({
            success: false,
            error: "Döviz bilgisi alınamadı."
        });
    }
});

/* ------------------------------------------------------------
   SYSTEM INFO
   ------------------------------------------------------------ */

app.get("/api/system/info", (req, res) => {
    try {
        const memory = process.memoryUsage();

        res.json({
            success: true,
            system: {
                platform: process.platform,
                architecture: process.arch,
                node: process.version,
                pid: process.pid,
                uptime: process.uptime(),
                cpuCount:
                    require("os").cpus()?.length || 1,
                memory: {
                    rss: memory.rss,
                    heapTotal: memory.heapTotal,
                    heapUsed: memory.heapUsed,
                    external: memory.external,
                    arrayBuffers:
                        memory.arrayBuffers || 0
                }
            },
            app: {
                name: APP_NAME,
                version: APP_VERSION,
                environment: NODE_ENV
            },
            runtime: getFinalRuntimeStatus(),
            timestamp: nowISO()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Sistem bilgisi alınamadı."
        });
    }
});

/* ------------------------------------------------------------
   SOCKET.IO
   ------------------------------------------------------------ */

try {
    if (io) {
        io.on("connection", socket => {
            TURKAI_FINAL_RUNTIME.socketReady = true;

            logInfo(
                "Socket connected",
                socket.id
            );

            socket.emit(
                "turkai:connected",
                {
                    success: true,
                    socketId: socket.id,
                    server: APP_NAME,
                    version: APP_VERSION,
                    timestamp: nowISO()
                }
            );

            socket.on(
                "turkai:ping",
                payload => {
                    socket.emit(
                        "turkai:pong",
                        {
                            success: true,
                            payload:
                                payload ?? null,
                            timestamp: nowISO()
                        }
                    );
                }
            );

            socket.on(
                "turkai:status",
                () => {
                    socket.emit(
                        "turkai:status",
                        {
                            success: true,
                            runtime:
                                getFinalRuntimeStatus(),
                            timestamp: nowISO()
                        }
                    );
                }
            );

            socket.on(
                "disconnect",
                reason => {
                    logInfo(
                        "Socket disconnected",
                        {
                            socketId: socket.id,
                            reason
                        }
                    );
                }
            );
        });
    }
} catch (error) {
    logError(
        "Socket initialization error",
        error
    );
}

/* ------------------------------------------------------------
   404 API HANDLER
   ------------------------------------------------------------ */

app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        error: "API endpoint bulunamadı.",
        path: req.originalUrl,
        method: req.method,
        timestamp: nowISO()
    });
});

/* ------------------------------------------------------------
   STATIC FILES
   ------------------------------------------------------------ */

if (fs.existsSync(PUBLIC_DIR)) {
    app.use(
        express.static(
            PUBLIC_DIR,
            {
                maxAge:
                    IS_PRODUCTION
                        ? "1h"
                        : 0,
                index: "index.html"
            }
        )
    );
}

/* ------------------------------------------------------------
   SPA FALLBACK
   ------------------------------------------------------------ */

app.use((req, res, next) => {
    try {
        if (
            req.method !== "GET" ||
            req.path.startsWith("/api/")
        ) {
            return next();
        }

        const indexPath =
            path.join(
                PUBLIC_DIR,
                "index.html"
            );

        if (fs.existsSync(indexPath)) {
            return res.sendFile(indexPath);
        }

        return next();

    } catch (error) {
        return next(error);
    }
});

/* ------------------------------------------------------------
   FINAL ERROR HANDLER
   ------------------------------------------------------------ */

app.use((error, req, res, next) => {
    void next;

    TURKAI_FINAL_RUNTIME.lastError =
        error?.message ||
        String(error);

    TURKAI_FINAL_RUNTIME.lastErrorAt =
        nowISO();

    logError(
        "Unhandled Express error",
        {
            message:
                error?.message ||
                String(error),
            stack:
                error?.stack ||
                null,
            path:
                req.originalUrl ||
                req.url ||
                "",
            method:
                req.method ||
                ""
        }
    );

    if (res.headersSent) {
        return;
    }

    const status =
        Number.isInteger(error?.status)
            ? error.status
            : 500;

    return res.status(status).json({
        success: false,
        error:
            IS_PRODUCTION
                ? "Sunucu tarafında bir hata oluştu."
                : (
                    error?.message ||
                    "Sunucu hatası."
                ),
        timestamp: nowISO()
    });
});

/* ------------------------------------------------------------
   PROCESS ERROR HANDLERS
   ------------------------------------------------------------ */

process.on(
    "uncaughtException",
    error => {
        TURKAI_FINAL_RUNTIME.lastError =
            error?.message ||
            String(error);

        TURKAI_FINAL_RUNTIME.lastErrorAt =
            nowISO();

        logError(
            "UNCAUGHT EXCEPTION",
            {
                message:
                    error?.message ||
                    String(error),
                stack:
                    error?.stack ||
                    null
            }
        );

        /*
         * Kritik durumda process'i anında öldürmek yerine
         * kontrollü shutdown başlatıyoruz.
         */
        shutdownServer(
            "uncaughtException"
        ).catch(shutdownError => {
            logError(
                "Shutdown after uncaughtException failed",
                shutdownError
            );

            process.exit(1);
        });
    }
);

process.on(
    "unhandledRejection",
    reason => {
        TURKAI_FINAL_RUNTIME.lastError =
            reason?.message ||
            String(reason);

        TURKAI_FINAL_RUNTIME.lastErrorAt =
            nowISO();

        logError(
            "UNHANDLED REJECTION",
            {
                reason:
                    reason?.message ||
                    String(reason),
                stack:
                    reason?.stack ||
                    null
            }
        );
    }
);

/* ------------------------------------------------------------
   GRACEFUL SHUTDOWN
   ------------------------------------------------------------ */

let TURKAI_SHUTDOWN_PROMISE = null;

async function shutdownServer(reason = "manual") {
    if (TURKAI_SHUTDOWN_PROMISE) {
        return TURKAI_SHUTDOWN_PROMISE;
    }

    TURKAI_SHUTDOWN_PROMISE =
        (async () => {
            if (TURKAI_FINAL_RUNTIME.shuttingDown) {
                return;
            }

            TURKAI_FINAL_RUNTIME.shuttingDown = true;
            TURKAI_FINAL_RUNTIME.shutdownReason =
                reason;

            logInfo(
                "TürkAI graceful shutdown başlıyor",
                {
                    reason
                }
            );

            try {
                if (
                    typeof shutdownPart4Resources ===
                    "function"
                ) {
                    await shutdownPart4Resources();
                }
            } catch (error) {
                logError(
                    "Part 4 shutdown error",
                    error
                );
            }

            try {
                if (io) {
                    await new Promise(resolve => {
                        try {
                            io.close(() => {
                                resolve();
                            });
                        } catch (error) {
                            resolve();
                        }
                    });
                }
            } catch (error) {
                logError(
                    "Socket shutdown error",
                    error
                );
            }

            try {
                if (httpServer) {
                    await new Promise(resolve => {
                        try {
                            httpServer.close(() => {
                                resolve();
                            });
                        } catch (error) {
                            resolve();
                        }
                    });
                }
            } catch (error) {
                logError(
                    "HTTP shutdown error",
                    error
                );
            }

            try {
                incrementStatistic(
                    "server_shutdowns",
                    1
                );
            } catch (error) {
                /* ignore */
            }

            TURKAI_FINAL_RUNTIME.httpServerReady =
                false;

            TURKAI_FINAL_RUNTIME.socketReady =
                false;

            TURKAI_FINAL_RUNTIME.started =
                false;

            logInfo(
                "TürkAI server shutdown tamamlandı"
            );
        })();

    return TURKAI_SHUTDOWN_PROMISE;
}

/* ------------------------------------------------------------
   START SERVER
   ------------------------------------------------------------ */

async function startServer() {
    if (TURKAI_FINAL_RUNTIME.started) {
        return httpServer;
    }

    if (
        !httpServer ||
        typeof httpServer.listen !== "function"
    ) {
        throw new Error(
            "HTTP server oluşturulamadı."
        );
    }

    /*
     * Veritabanlarını son kez garanti ediyoruz.
     */

    try {
        Object.values(DB_FILES).forEach(fileName => {
            ensureDatabaseFile(fileName);
        });
    } catch (error) {
        logError(
            "Database initialization failed",
            error
        );
    }

    /*
     * Render / Railway / Docker gibi ortamlarda
     * PORT environment değişkeni önceliklidir.
     */

    const listenPort =
        Number(process.env.PORT) ||
        Number(PORT) ||
        10000;

    const listenHost =
        process.env.HOST ||
        HOST ||
        "0.0.0.0";

    return new Promise((resolve, reject) => {
        let settled = false;

        const onError = error => {
            TURKAI_FINAL_RUNTIME.lastError =
                error?.message ||
                String(error);

            TURKAI_FINAL_RUNTIME.lastErrorAt =
                nowISO();

            logError(
                "HTTP server start error",
                error
            );

            if (!settled) {
                settled = true;
                reject(error);
            }
        };

        httpServer.once(
            "error",
            onError
        );

        httpServer.listen(
            listenPort,
            listenHost,
            () => {
                if (settled) {
                    return;
                }

                settled = true;

                TURKAI_FINAL_RUNTIME.started =
                    true;

                TURKAI_FINAL_RUNTIME.startedAt =
                    nowISO();

                TURKAI_FINAL_RUNTIME.httpServerReady =
                    true;

                TURKAI_FINAL_RUNTIME.socketReady =
                    Boolean(io);

                incrementStatistic(
                    "server_started",
                    1
                );

                console.log("");
                console.log(
                    "=============================================="
                );
                console.log(
                    "              TÜRKAI SERVER"
                );
                console.log(
                    "=============================================="
                );
                console.log(
                    `Version    : ${APP_VERSION}`
                );
                console.log(
                    `Environment: ${NODE_ENV}`
                );
                console.log(
                    `Host       : ${listenHost}`
                );
                console.log(
                    `Port       : ${listenPort}`
                );
                console.log(
                    `Server ID  : ${SERVER_ID}`
                );
                console.log(
                    `Node       : ${process.version}`
                );
                console.log(
                    "Local AI   : READY"
                );
                console.log(
                    `Groq       : ${
                        process.env.GROQ_API_KEY
                            ? "READY"
                            : "OFF"
                    }`
                );
                console.log(
                    `Cerebras   : ${
                        process.env.CEREBRAS_API_KEY
                            ? "READY"
                            : "OFF"
                    }`
                );
                console.log(
                    `OpenRouter : ${
                        process.env.OPENROUTER_API_KEY
                            ? "READY"
                            : "OFF"
                    }`
                );
                console.log(
                    `Gemini     : ${
                        process.env.GEMINI_API_KEY
                            ? "READY"
                            : "OFF"
                    }`
                );
                console.log(
                    "Health     : /api/health"
                );
                console.log(
                    "Status     : /api/status"
                );
                console.log(
                    "API        : /api"
                );
                console.log(
                    "Plans      : /api/plans"
                );
                console.log(
                    "AI Status  : /api/ai/status"
                );
                console.log(
                    "=============================================="
                );
                console.log("");

                logInfo(
                    "TürkAI server started",
                    {
                        port: listenPort,
                        host: listenHost,
                        version: APP_VERSION,
                        serverId: SERVER_ID
                    }
                );

                resolve(httpServer);
            }
        );
    });
}

/* ------------------------------------------------------------
   SIGNAL HANDLERS
   ------------------------------------------------------------ */

process.once(
    "SIGTERM",
    async () => {
        logInfo("SIGTERM received");

        try {
            await shutdownServer("SIGTERM");
        } finally {
            process.exit(0);
        }
    }
);

process.once(
    "SIGINT",
    async () => {
        logInfo("SIGINT received");

        try {
            await shutdownServer("SIGINT");
        } finally {
            process.exit(0);
        }
    }
);

/* ------------------------------------------------------------
   OPTIONAL NODE WARNING HANDLER
   ------------------------------------------------------------ */

process.on(
    "warning",
    warning => {
        logWarn(
            "Node warning",
            {
                name:
                    warning?.name ||
                    "",
                message:
                    warning?.message ||
                    "",
                stack:
                    warning?.stack ||
                    ""
            }
        );
    }
);

/* ------------------------------------------------------------
   SERVER INSTANCE ACCESS
   ------------------------------------------------------------ */

function getServerInstance() {
    return httpServer;
}

function getSocketInstance() {
    return io;
}

/* ------------------------------------------------------------
   FINAL HEALTH SNAPSHOT
   ------------------------------------------------------------ */

function getFinalHealthSnapshot() {
    let providers = {};

    try {
        if (
            typeof getAIProviderSummary ===
            "function"
        ) {
            providers =
                getAIProviderSummary();
        }
    } catch (error) {
        providers = {};
    }

    return {
        success: true,
        service: APP_NAME,
        version: APP_VERSION,
        environment: NODE_ENV,
        status:
            TURKAI_FINAL_RUNTIME.started
                ? "online"
                : "offline",
        runtime:
            getFinalRuntimeStatus(),
        ai: {
            local: true,
            providers
        },
        timestamp: nowISO()
    };
}

app.get(
    "/api/health/full",
    (req, res) => {
        res.status(200).json(
            getFinalHealthSnapshot()
        );
    }
);

/* ------------------------------------------------------------
   FINAL EXPORTS
   ------------------------------------------------------------ */

module.exports = {
    app,
    httpServer,
    io,
    startServer,
    shutdownServer,
    getServerInstance,
    getSocketInstance,
    getFinalRuntimeStatus,
    getFinalHealthSnapshot
};

/* ------------------------------------------------------------
   START ONLY WHEN EXECUTED DIRECTLY
   ------------------------------------------------------------ */

if (require.main === module) {
    startServer()
        .catch(error => {
            logError(
                "TürkAI failed to start",
                {
                    message:
                        error?.message ||
                        String(error),
                    stack:
                        error?.stack ||
                        null
                }
            );

            process.exitCode = 1;
        });
}

/* ============================================================
   END OF TÜRKAI SERVER.JS — PART 5
   ============================================================ */
