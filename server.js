"use strict";

/*
╔══════════════════════════════════════════════════════════════════════╗
║                         TÜRKAI SERVER                              ║
║                         VERSION 14.0                              ║
║                                                                      ║
║  PARÇA 1 / 3                                                       ║
║                                                                      ║
║  Bu dosya PARÇA 2 ve PARÇA 3 ile birlikte tek server.js oluşturur. ║
║                                                                      ║
║  Uyum:                                                             ║
║  - Render                                                          ║
║  - GitHub                                                          ║
║  - Node.js                                                         ║
║  - Express                                                         ║
║  - Socket.IO                                                       ║
║  - JSON database                                                   ║
║  - TürkAI AI API                                                   ║
╚══════════════════════════════════════════════════════════════════════╝
*/

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const http = require("http");
const os = require("os");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Server } = require("socket.io");

/* ================================================================
   01 — APPLICATION CONFIGURATION
================================================================ */

const APP_NAME = "TürkAI";
const APP_VERSION = "14.0.0";
const APP_DESCRIPTION = "Türkçe yapay zekâ platformu";

const NODE_ENV =
    process.env.NODE_ENV ||
    "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

const PORT =
    Number(process.env.PORT) ||
    10000;

const HOST =
    process.env.HOST ||
    "0.0.0.0";

const START_TIME =
    Date.now();

const SERVER_ID =
    process.env.RENDER_INSTANCE_ID ||
    crypto.randomBytes(12).toString("hex");

const SERVER_NAME =
    process.env.SERVER_NAME ||
    "TürkAI Render Server";

const MAX_JSON_SIZE =
    process.env.MAX_JSON_SIZE ||
    "25mb";

const MAX_URLENCODED_SIZE =
    process.env.MAX_URLENCODED_SIZE ||
    "25mb";

const DEFAULT_LANGUAGE =
    "tr-TR";

const DEFAULT_TIMEZONE =
    "Europe/Istanbul";

/* ================================================================
   02 — EXPRESS / HTTP / SOCKET.IO
================================================================ */

const app =
    express();

const httpServer =
    http.createServer(app);

const io =
    new Server(
        httpServer,
        {
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
            },

            transports: [
                "websocket",
                "polling"
            ],

            pingInterval:
                25000,

            pingTimeout:
                20000,

            maxHttpBufferSize:
                25 * 1024 * 1024
        }
    );

/* ================================================================
   03 — DIRECTORY STRUCTURE
================================================================ */

const ROOT_DIR =
    __dirname;

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

const PROJECTS_DIR =
    path.join(
        STORAGE_DIR,
        "projects"
    );

const PUBLIC_DIR =
    path.join(
        ROOT_DIR,
        "public"
    );

const ALL_DIRECTORIES = [
    DATA_DIR,
    DATABASE_DIR,
    STORAGE_DIR,
    USERS_DIR,
    UPLOADS_DIR,
    GENERATED_DIR,
    LOGS_DIR,
    CACHE_DIR,
    TEMP_DIR,
    BACKUP_DIR,
    PROJECTS_DIR,
    PUBLIC_DIR
];

/* ================================================================
   04 — DIRECTORY INITIALIZATION
================================================================ */

function ensureDirectory(
    directory
) {
    try {
        fs.mkdirSync(
            directory,
            {
                recursive: true
            }
        );

        return true;
    } catch (error) {
        console.error(
            "[DIRECTORY ERROR]",
            directory,
            error.message
        );

        return false;
    }
}

for (
    const directory
    of ALL_DIRECTORIES
) {
    ensureDirectory(
        directory
    );
}

/* ================================================================
   05 — DATABASE FILE PATHS
================================================================ */

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

    apiKeys:
        path.join(
            DATABASE_DIR,
            "api_keys.json"
        ),

    rateLimits:
        path.join(
            DATABASE_DIR,
            "rate_limits.json"
        ),

    statistics:
        path.join(
            DATABASE_DIR,
            "statistics.json"
        )
};

/* ================================================================
   06 — DEFAULT DATABASE STRUCTURE
================================================================ */

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

        maintenance:
            false,

        allowRegistration:
            true,

        allowGuest:
            true,

        defaultModel:
            "fast",

        defaultLanguage:
            DEFAULT_LANGUAGE,

        timezone:
            DEFAULT_TIMEZONE,

        maxUploadMB:
            25,

        maxMessageLength:
            30000,

        enableMemory:
            true,

        enableResearch:
            true,

        enableCode:
            true,

        enableImage:
            true,

        enableVideo:
            true,

        enableSocket:
            true,

        version:
            APP_VERSION,

        updatedAt:
            null
    },

    apiKeys: [],

    rateLimits: {},

    statistics: {

        totalRequests:
            0,

        totalMessages:
            0,

        totalUsers:
            0,

        totalChats:
            0,

        totalErrors:
            0,

        totalResearch:
            0,

        totalFiles:
            0,

        startedAt:
            new Date().toISOString()
    }
};

/* ================================================================
   07 — JSON HELPERS
================================================================ */

function cloneDefault(
    value
) {
    return JSON.parse(
        JSON.stringify(
            value
        )
    );
}

function ensureDatabaseFile(
    filePath,
    fallback
) {
    try {

        if (
            !fs.existsSync(
                filePath
            )
        ) {

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    fallback,
                    null,
                    2
                ),
                "utf8"
            );

            return;
        }

        const content =
            fs.readFileSync(
                filePath,
                "utf8"
            ).trim();

        if (
            !content
        ) {

            fs.writeFileSync(
                filePath,
                JSON.stringify(
                    fallback,
                    null,
                    2
                ),
                "utf8"
            );
        }

    } catch (error) {

        console.error(
            "[DATABASE INIT ERROR]",
            filePath,
            error.message
        );

    }
}

/* ================================================================
   08 — DATABASE INITIALIZATION
================================================================ */

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
    DB_FILES.settings,
    DEFAULT_DATABASE.settings
);

ensureDatabaseFile(
    DB_FILES.apiKeys,
    DEFAULT_DATABASE.apiKeys
);

ensureDatabaseFile(
    DB_FILES.rateLimits,
    DEFAULT_DATABASE.rateLimits
);

ensureDatabaseFile(
    DB_FILES.statistics,
    DEFAULT_DATABASE.statistics
);

/* ================================================================
   09 — SAFE JSON READ
================================================================ */

function readJSON(
    filePath,
    fallback
) {

    try {

        if (
            !fs.existsSync(
                filePath
            )
        ) {

            return cloneDefault(
                fallback
            );
        }

        const raw =
            fs.readFileSync(
                filePath,
                "utf8"
            );

        if (
            !raw.trim()
        ) {

            return cloneDefault(
                fallback
            );
        }

        return JSON.parse(
            raw
        );

    } catch (error) {

        console.error(
            "[JSON READ ERROR]",
            filePath,
            error.message
        );

        return cloneDefault(
            fallback
        );
    }
}

/* ================================================================
   10 — SAFE JSON WRITE
================================================================ */

function writeJSON(
    filePath,
    data
) {

    try {

        const directory =
            path.dirname(
                filePath
            );

        ensureDirectory(
            directory
        );

        const temporary =
            `${filePath}.tmp`;

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
            filePath
        );

        return true;

    } catch (error) {

        console.error(
            "[JSON WRITE ERROR]",
            filePath,
            error.message
        );

        return false;
    }
}

/* ================================================================
   11 — DATABASE ACCESS FUNCTIONS
================================================================ */

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
        users
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
        sessions
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
        chats
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
        messages
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
        memories
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
        knowledge
    );
}

function getUsage() {
    return readJSON(
        DB_FILES.usage,
        {}
    );
}

function saveUsage(
    usage
) {
    return writeJSON(
        DB_FILES.usage,
        usage
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
        files
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
        projects
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
        research
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
        payments
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
        notifications
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
        logs
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
        events
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
        settings
    );
}

function getStatistics() {
    return readJSON(
        DB_FILES.statistics,
        DEFAULT_DATABASE.statistics
    );
}

function saveStatistics(
    statistics
) {
    return writeJSON(
        DB_FILES.statistics,
        statistics
    );
}

/* ================================================================
   12 — BASIC UTILITIES
================================================================ */

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

function createToken(
    prefix = "tk"
) {

    return (
        `${prefix}_` +
        crypto
            .randomBytes(32)
            .toString("hex")
    );
}

function hashText(
    text
) {

    return crypto
        .createHash("sha256")
        .update(
            String(text)
        )
        .digest("hex");
}

function cleanText(
    value,
    maxLength = 30000
) {

    if (
        value === null ||
        value === undefined
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
        30000
    )
        .toLocaleLowerCase(
            "tr-TR"
        )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}

function isObject(
    value
) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(
            value
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

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        max,
        Math.max(
            min,
            safeNumber(
                value,
                min
            )
        )
    );
}

function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}

/* ================================================================
   13 — LOGGING SYSTEM
================================================================ */

const LOG_FILE =
    path.join(
        LOGS_DIR,
        "server.log"
    );

const ERROR_LOG_FILE =
    path.join(
        LOGS_DIR,
        "error.log"
    );

const SECURITY_LOG_FILE =
    path.join(
        LOGS_DIR,
        "security.log"
    );

const AI_LOG_FILE =
    path.join(
        LOGS_DIR,
        "ai.log"
    );

function appendLog(
    file,
    level,
    message,
    meta = {}
) {

    const line =
        JSON.stringify({
            time:
                nowISO(),

            level,

            message:

                cleanText(
                    message,
                    5000
                ),

            meta
        }) +
        os.EOL;

    try {

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

function logInfo(
    message,
    meta = {}
) {

    console.log(
        `[INFO] ${message}`
    );

    appendLog(
        LOG_FILE,
        "INFO",
        message,
        meta
    );
}

function logWarn(
    message,
    meta = {}
) {

    console.warn(
        `[WARN] ${message}`
    );

    appendLog(
        LOG_FILE,
        "WARN",
        message,
        meta
    );
}

function logError(
    message,
    meta = {}
) {

    console.error(
        `[ERROR] ${message}`
    );

    appendLog(
        ERROR_LOG_FILE,
        "ERROR",
        message,
        meta
    );
}

function logSecurity(
    message,
    meta = {}
) {

    console.warn(
        `[SECURITY] ${message}`
    );

    appendLog(
        SECURITY_LOG_FILE,
        "SECURITY",
        message,
        meta
    );
}

function logAI(
    message,
    meta = {}
) {

    appendLog(
        AI_LOG_FILE,
        "AI",
        message,
        meta
    );
}

/* ================================================================
   14 — REQUEST ID
================================================================ */

function createRequestId() {

    return (
        "req_" +
        Date.now().toString(36) +
        "_" +
        crypto
            .randomBytes(6)
            .toString("hex")
    );
}

/* ================================================================
   15 — PLAN SYSTEM
================================================================ */

const PLANS = {

    free: {

        id:
            "free",

        name:
            "Free",

        price:
            0,

        currency:
            "TRY",

        messages:
            50,

        research:
            5,

        images:
            0,

        videos:
            0,

        maxUploadMB:
            10,

        memory:
            true,

        coding:
            true,

        priority:
            1
    },

    pro: {

        id:
            "pro",

        name:
            "Pro",

        price:
            250,

        currency:
            "TRY",

        messages:
            100,

        research:
            25,

        images:
            2,

        videos:
            0,

        maxUploadMB:
            25,

        memory:
            true,

        coding:
            true,

        priority:
            2
    },

    plus: {

        id:
            "plus",

        name:
            "Plus",

        price:
            500,

        currency:
            "TRY",

        messages:
            200,

        research:
            75,

        images:
            4,

        videos:
            5,

        maxUploadMB:
            50,

        memory:
            true,

        coding:
            true,

        priority:
            3
    },

    ultra: {

        id:
            "ultra",

        name:
            "Ultra",

        price:
            1000,

        currency:
            "TRY",

        messages:
            1000,

        research:
            250,

        images:
            10,

        videos:
            15,

        maxUploadMB:
            100,

        memory:
            true,

        coding:
            true,

        priority:
            4
    },

    developer: {

        id:
            "developer",

        name:
            "Developer",

        price:
            0,

        currency:
            "TRY",

        messages:
            400,

        research:
            500,

        images:
            50,

        videos:
            50,

        maxUploadMB:
            200,

        memory:
            true,

        coding:
            true,

        priority:
            99
    }
};

/* ================================================================
   16 — PLAN HELPERS
================================================================ */

function getPlan(
    planId
) {

    return (
        PLANS[
            String(
                planId || "free"
            ).toLowerCase()
        ] ||
        PLANS.free
    );
}

function getPlanForUser(
    user
) {

    if (
        !user
    ) {
        return PLANS.free;
    }

    return getPlan(
        user.plan
    );
}

function isDeveloper(
    user
) {

    return Boolean(
        user &&
        (
            user.plan ===
                "developer" ||
            user.role ===
                "developer"
        )
    );
}

function isAdminUser(
    user
) {

    const adminEmail =
        process.env.ADMIN_EMAIL;

    return Boolean(
        user &&
        (
            isDeveloper(
                user
            ) ||
            (
                adminEmail &&
                user.email &&
                user.email
                    .toLowerCase() ===
                    adminEmail
                        .toLowerCase()
            )
        )
    );
}

/* ================================================================
   17 — USER SYSTEM
================================================================ */

function findUserById(
    userId
) {

    const users =
        getUsers();

    return users.find(
        user =>
            user.id ===
            userId
    ) || null;
}

function findUserByEmail(
    email
) {

    const normalized =
        cleanText(
            email,
            320
        ).toLowerCase();

    if (
        !normalized
    ) {
        return null;
    }

    const users =
        getUsers();

    return users.find(
        user =>
            String(
                user.email || ""
            ).toLowerCase() ===
            normalized
    ) || null;
}

function createUser(
    input = {}
) {

    const email =
        cleanText(
            input.email,
            320
        ).toLowerCase();

    const existing =
        email
            ? findUserByEmail(
                email
            )
            : null;

    if (
        existing
    ) {
        return existing;
    }

    const users =
        getUsers();

    const user = {

        id:
            createId(
                "usr"
            ),

        email:
            email ||
            null,

        name:
            cleanText(
                input.name ||
                "TürkAI Kullanıcısı",
                120
            ),

        avatar:
            cleanText(
                input.avatar,
                2000
            ) ||
            null,

        plan:
            cleanText(
                input.plan ||
                "free",
                30
            ),

        role:
            cleanText(
                input.role ||
                "user",
                30
            ),

        provider:
            cleanText(
                input.provider ||
                "local",
                50
            ),

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        lastSeenAt:
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

    const statistics =
        getStatistics();

    statistics.totalUsers =
        users.length;

    saveStatistics(
        statistics
    );

    return user;
}

function getGuestUser() {

    return {

        id:
            "guest",

        email:
            null,

        name:
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

/* ================================================================
   18 — SESSION SYSTEM
================================================================ */

function createSession(
    userId
) {

    const sessions =
        getSessions();

    const token =
        createToken(
            "session"
        );

    const session = {

        id:
            createId(
                "ses"
            ),

        userId,

        token,

        createdAt:
            nowISO(),

        expiresAt:
            new Date(
                Date.now() +
                1000 *
                60 *
                60 *
                24 *
                30
            ).toISOString(),

        lastUsedAt:
            nowISO(),

        active:
            true
    };

    sessions.push(
        session
    );

    saveSessions(
        sessions
    );

    return session;
}

function getSessionByToken(
    token
) {

    const clean =
        cleanText(
            token,
            1000
        );

    if (
        !clean
    ) {
        return null;
    }

    const sessions =
        getSessions();

    const session =
        sessions.find(
            item =>
                item.token ===
                    clean &&
                item.active !==
                    false
        );

    if (
        !session
    ) {
        return null;
    }

    if (
        session.expiresAt &&
        Date.now() >
            new Date(
                session.expiresAt
            ).getTime()
    ) {

        session.active =
            false;

        saveSessions(
            sessions
        );

        return null;
    }

    session.lastUsedAt =
        nowISO();

    saveSessions(
        sessions
    );

    return session;
}

/* ================================================================
   19 — TOKEN EXTRACTION
================================================================ */

function extractToken(
    req
) {

    const authorization =
        req.headers
            .authorization;

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

    const headerToken =
        req.headers[
            "x-turkai-token"
        ];

    if (
        headerToken
    ) {
        return String(
            headerToken
        ).trim();
    }

    if (
        req.query &&
        req.query.token
    ) {
        return String(
            req.query.token
        ).trim();
    }

    if (
        req.body &&
        req.body.token
    ) {
        return String(
            req.body.token
        ).trim();
    }

    return "";
}

/* ================================================================
   20 — REQUEST USER
================================================================ */

function getRequestUser(
    req
) {

    if (
        req.user
    ) {
        return req.user;
    }

    const token =
        extractToken(
            req
        );

    if (
        !token
    ) {
        return getGuestUser();
    }

    const session =
        getSessionByToken(
            token
        );

    if (
        !session
    ) {
        return getGuestUser();
    }

    const user =
        findUserById(
            session.userId
        );

    return (
        user ||
        getGuestUser()
    );
}

/* ================================================================
   21 — AUTH MIDDLEWARE
================================================================ */

function optionalAuth(
    req,
    res,
    next
) {

    try {

        req.user =
            getRequestUser(
                req
            );

        next();

    } catch (error) {

        logError(
            "optionalAuth error",
            {
                error:
                    error.message
            }
        );

        req.user =
            getGuestUser();

        next();
    }
}

function requireAuth(
    req,
    res,
    next
) {

    try {

        const token =
            extractToken(
                req
            );

        if (
            !token
        ) {

            return res
                .status(401)
                .json({
                    success:
                        false,

                    error:
                        "Oturum gerekli."
                });
        }

        const session =
            getSessionByToken(
                token
            );

        if (
            !session
        ) {

            return res
                .status(401)
                .json({
                    success:
                        false,

                    error:
                        "Oturum geçersiz veya süresi dolmuş."
                });
        }

        const user =
            findUserById(
                session.userId
            );

        if (
            !user
        ) {

            return res
                .status(401)
                .json({
                    success:
                        false,

                    error:
                        "Kullanıcı bulunamadı."
                });
        }

        req.session =
            session;

        req.user =
            user;

        next();

    } catch (error) {

        logError(
            "requireAuth error",
            {
                error:
                    error.message
            }
        );

        return res
            .status(500)
            .json({
                success:
                    false,

                error:
                    "Kimlik doğrulama sırasında hata oluştu."
            });
    }
}

/* ================================================================
   22 — ADMIN MIDDLEWARE
================================================================ */

function requireAdmin(
    req,
    res,
    next
) {

    if (
        !req.user
    ) {

        return res
            .status(401)
            .json({
                success:
                    false,

                error:
                    "Kimlik doğrulama gerekli."
            });
    }

    if (
        !isAdminUser(
            req.user
        )
    ) {

        logSecurity(
            "Yetkisiz admin erişimi",
            {
                userId:
                    req.user.id,

                path:
                    req.path
            }
        );

        return res
            .status(403)
            .json({
                success:
                    false,

                error:
                    "Yönetici yetkisi gerekli."
            });
    }

    next();
}

/* ================================================================
   23 — EXPRESS SECURITY CONFIG
================================================================ */

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);

app.use(
    helmet({
        contentSecurityPolicy:
            false,

        crossOriginEmbedderPolicy:
            false,

        crossOriginResourcePolicy:
            false
    })
);

app.use(
    cors({
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
            "X-TürkAI-Token",
            "X-Request-ID"
        ]
    })
);

app.use(
    express.json({
        limit:
            MAX_JSON_SIZE
    })
);

app.use(
    express.urlencoded({
        extended:
            true,

        limit:
            MAX_URLENCODED_SIZE
    })
);

/* ================================================================
   24 — REQUEST TRACKING
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

        res.setHeader(
            "X-Request-ID",
            requestId
        );

        const started =
            Date.now();

        res.on(
            "finish",
            () => {

                const duration =
                    Date.now() -
                    started;

                logInfo(
                    `${req.method} ${req.originalUrl} ${res.statusCode}`,
                    {
                        requestId,
                        duration,
                        ip:
                            req.ip
                    }
                );
            }
        );

        next();
    }
);

/* ================================================================
   25 — GLOBAL STATISTICS MIDDLEWARE
================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {

        try {

            const statistics =
                getStatistics();

            statistics.totalRequests =
                safeNumber(
                    statistics.totalRequests
                ) + 1;

            saveStatistics(
                statistics
            );

        } catch (
            error
        ) {

            logError(
                "Statistics middleware error",
                {
                    error:
                        error.message
                }
            );
        }

        next();
    }
);

/* ================================================================
   26 — BASIC HEALTH ROUTES
================================================================ */

app.get(
    "/api/health",
    (
        req,
        res
    ) => {

        const uptime =
            Date.now() -
            START_TIME;

        res.json({

            success:
                true,

            status:
                "ok",

            service:
                APP_NAME,

            version:
                APP_VERSION,

            environment:
                NODE_ENV,

            serverId:
                SERVER_ID,

            uptime:

                Math.floor(
                    uptime /
                    1000
                ),

            uptimeMs:
                uptime,

            timestamp:
                nowISO(),

            node:
                process.version,

            platform:
                process.platform,

            memory: {

                rss:
                    process
                        .memoryUsage()
                        .rss,

                heapUsed:
                    process
                        .memoryUsage()
                        .heapUsed,

                heapTotal:
                    process
                        .memoryUsage()
                        .heapTotal
            }
        });
    }
);

app.get(
    "/api/status",
    optionalAuth,
    (
        req,
        res
    ) => {

        const settings =
            getSettings();

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

                host:
                    HOST,

                port:
                    PORT,

                uptime:
                    Date.now() -
                    START_TIME
            },

            user: {

                authenticated:
                    req.user &&
                    req.user.role !==
                        "guest",

                id:
                    req.user.id,

                plan:
                    req.user.plan
            },

            features: {

                chat:
                    true,

                memory:
                    settings.enableMemory,

                research:
                    settings.enableResearch,

                coding:
                    settings.enableCode,

                image:
                    settings.enableImage,

                video:
                    settings.enableVideo,

                socket:
                    settings.enableSocket
            }
        });
    }
);

/* ================================================================
   27 — PLAN API
================================================================ */

app.get(
    "/api/plans",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            plans:
                Object.values(
                    PLANS
                )
        });
    }
);

/* ================================================================
   28 — CURRENT USER API
================================================================ */

app.get(
    "/api/me",
    optionalAuth,
    (
        req,
        res
    ) => {

        const user =
            req.user;

        const plan =
            getPlanForUser(
                user
            );

        res.json({

            success:
                true,

            authenticated:
                user.role !==
                    "guest",

            user: {

                id:
                    user.id,

                email:
                    user.email,

                name:
                    user.name,

                avatar:
                    user.avatar,

                plan:
                    user.plan,

                role:
                    user.role,

                provider:
                    user.provider
            },

            plan
        });
    }
);

/* ================================================================
   29 — LOGIN / REGISTER
================================================================ */

app.post(
    "/api/auth/register",
    (
        req,
        res
    ) => {

        try {

            const settings =
                getSettings();

            if (
                settings.allowRegistration ===
                false
            ) {

                return res
                    .status(403)
                    .json({
                        success:
                            false,

                        error:
                            "Kayıt işlemleri şu anda kapalı."
                    });
            }

            const name =
                cleanText(
                    req.body.name,
                    120
                );

            const email =
                cleanText(
                    req.body.email,
                    320
                ).toLowerCase();

            if (
                !email
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "E-posta gerekli."
                    });
            }

            const existing =
                findUserByEmail(
                    email
                );

            if (
                existing
            ) {

                return res
                    .status(409)
                    .json({
                        success:
                            false,

                        error:
                            "Bu e-posta zaten kayıtlı."
                    });
            }

            const user =
                createUser({
                    name:
                        name ||
                        "TürkAI Kullanıcısı",

                    email,

                    provider:
                        "local"
                });

            const session =
                createSession(
                    user.id
                );

            res.status(
                201
            ).json({

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
            });

        } catch (
            error
        ) {

            logError(
                "Register error",
                {
                    error:
                        error.message
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Kayıt sırasında hata oluştu."
            });
        }
    }
);

app.post(
    "/api/auth/login",
    (
        req,
        res
    ) => {

        try {

            const email =
                cleanText(
                    req.body.email,
                    320
                ).toLowerCase();

            if (
                !email
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "E-posta gerekli."
                    });
            }

            const user =
                findUserByEmail(
                    email
                );

            if (
                !user
            ) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        error:
                            "Kullanıcı bulunamadı."
                    });
            }

            user.lastSeenAt =
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
                index >= 0
            ) {

                users[index] =
                    user;

                saveUsers(
                    users
                );
            }

            const session =
                createSession(
                    user.id
                );

            res.json({

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
            });

        } catch (
            error
        ) {

            logError(
                "Login error",
                {
                    error:
                        error.message
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Giriş sırasında hata oluştu."
            });
        }
    }
);

app.post(
    "/api/auth/logout",
    optionalAuth,
    (
        req,
        res
    ) => {

        try {

            const token =
                extractToken(
                    req
                );

            if (
                token
            ) {

                const sessions =
                    getSessions();

                const index =
                    sessions.findIndex(
                        session =>
                            session.token ===
                            token
                    );

                if (
                    index >= 0
                ) {

                    sessions[
                        index
                    ].active =
                        false;

                    sessions[
                        index
                    ].lastUsedAt =
                        nowISO();

                    saveSessions(
                        sessions
                    );
                }
            }

            res.json({

                success:
                    true,

                message:
                    "Oturum kapatıldı."
            });

        } catch (
            error
        ) {

            logError(
                "Logout error",
                {
                    error:
                        error.message
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Çıkış sırasında hata oluştu."
            });
        }
    }
);

/* ================================================================
   30 — GUEST SESSION
================================================================ */

app.post(
    "/api/auth/guest",
    (
        req,
        res
    ) => {

        const settings =
            getSettings();

        if (
            settings.allowGuest ===
            false
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Misafir kullanımı kapalı."
                });
        }

        const guestId =
            createId(
                "guest"
            );

        const token =
            createToken(
                "guest"
            );

        res.json({

            success:
                true,

            guest: {

                id:
                    guestId,

                name:
                    "Misafir",

                plan:
                    "free",

                role:
                    "guest"
            },

            token
        });
    }
);

/* ================================================================
   31 — CHAT DATABASE FUNCTIONS
================================================================ */

function findChatById(
    chatId
) {

    const chats =
        getChats();

    return chats.find(
        chat =>
            chat.id ===
            chatId
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

        userId,

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
            false,

        pinned:
            false,

        model:
            "fast",

        messageCount:
            0
    };

    chats.push(
        chat
    );

    saveChats(
        chats
    );

    const statistics =
        getStatistics();

    statistics.totalChats =
        chats.length;

    saveStatistics(
        statistics
    );

    return chat;
}

function addMessage(
    chatId,
    userId,
    role,
    content,
    metadata = {}
) {

    const messages =
        getMessages();

    const message = {

        id:
            createId(
                "msg"
            ),

        chatId,

        userId,

        role:
            cleanText(
                role,
                30
            ),

        content:
            cleanText(
                content,
                30000
            ),

        metadata:
            isObject(
                metadata
            )
                ? metadata
                : {},

        createdAt:
            nowISO()
    };

    messages.push(
        message
    );

    saveMessages(
        messages
    );

    const chats =
        getChats();

    const chatIndex =
        chats.findIndex(
            chat =>
                chat.id ===
                chatId
        );

    if (
        chatIndex >= 0
    ) {

        chats[
            chatIndex
        ].updatedAt =
            nowISO();

        chats[
            chatIndex
        ].messageCount =
            safeNumber(
                chats[
                    chatIndex
                ].messageCount
            ) + 1;

        saveChats(
            chats
        );
    }

    return message;
}

function getChatMessages(
    chatId,
    limit = 100
) {

    const messages =
        getMessages();

    return messages
        .filter(
            message =>
                message.chatId ===
                chatId
        )
        .slice(
            -clamp(
                limit,
                1,
                500
            )
        );
}

/* ================================================================
   32 — CHAT API
================================================================ */

app.get(
    "/api/chats",
    optionalAuth,
    (
        req,
        res
    ) => {

        const user =
            req.user;

        const chats =
            getChats()
                .filter(
                    chat =>
                        chat.userId ===
                        user.id
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

        res.json({

            success:
                true,

            chats
        });
    }
);

app.post(
    "/api/chats",
    optionalAuth,
    (
        req,
        res
    ) => {

        const title =
            cleanText(
                req.body.title ||
                "Yeni sohbet",
                200
            );

        const chat =
            createChat(
                req.user.id,
                title
            );

        res.status(
            201
        ).json({

            success:
                true,

            chat
        });
    }
);

app.get(
    "/api/chats/:id",
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
                .json({
                    success:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        if (
            chat.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Bu sohbete erişemezsiniz."
                });
        }

        res.json({

            success:
                true,

            chat,

            messages:
                getChatMessages(
                    chat.id
                )
        });
    }
);

/* ================================================================
   33 — CHAT DELETE
================================================================ */

app.delete(
    "/api/chats/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const chatId =
            req.params.id;

        const chats =
            getChats();

        const chatIndex =
            chats.findIndex(
                chat =>
                    chat.id ===
                    chatId
            );

        if (
            chatIndex < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        const chat =
            chats[
                chatIndex
            ];

        if (
            chat.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Yetkiniz yok."
                });
        }

        chats.splice(
            chatIndex,
            1
        );

        saveChats(
            chats
        );

        const messages =
            getMessages()
                .filter(
                    message =>
                        message.chatId !==
                        chatId
                );

        saveMessages(
            messages
        );

        res.json({

            success:
                true,

            message:
                "Sohbet silindi."
        });
    }
);

/* ================================================================
   34 — AI CONFIGURATION
================================================================ */

const AI_CONFIG = {

    groq: {

        enabled:
            Boolean(
                process.env.GROQ_API_KEY
            ),

        apiKey:
            process.env.GROQ_API_KEY ||
            "",

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

        apiKey:
            process.env.CEREBRAS_API_KEY ||
            "",

        endpoint:
            "https://api.cerebras.ai/v1/chat/completions",

        model:
            process.env.CEREBRAS_MODEL ||
            "gpt-oss-120b"
    },

    openrouter: {

        enabled:
            Boolean(
                process.env.OPENROUTER_API_KEY
            ),

        apiKey:
            process.env.OPENROUTER_API_KEY ||
            "",

        endpoint:
            "https://openrouter.ai/api/v1/chat/completions",

        model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-oss-20b"
    },

    gemini: {

        enabled:
            Boolean(
                process.env.GEMINI_API_KEY
            ),

        apiKey:
            process.env.GEMINI_API_KEY ||
            "",

        model:
            process.env.GEMINI_MODEL ||
            "gemini-2.0-flash"
    }
};

/* ================================================================
   35 — AI SYSTEM PROMPT
================================================================ */

const TURKAI_SYSTEM_PROMPT = `
Sen TürkAI adlı Türkçe yapay zekâ platformunun asistanısın.

Temel kurallar:

1. Kullanıcı Türkçe yazıyorsa Türkçe cevap ver.
2. Gereksiz yere uzun konuşma.
3. Kullanıcı kod isterse çalışan ve düzenli kod ver.
4. Kod isterse gerekli dosya yapısını açıkça belirt.
5. Bilmediğin güncel bilgileri uydurma.
6. Güncel bilgi gerekiyorsa araştırma sisteminin kullanılabileceğini belirt.
7. Kullanıcı bir hata mesajı verirse doğrudan hatayı analiz et.
8. Programlama sorularında mümkün olduğunca pratik çözüm sun.
9. Kullanıcı "En hızlı kim?" diye sorarsa tam olarak:
TürkAI ⚡🤖
cevabını ver.
10. Zararlı veya tehlikeli isteklerde güvenli alternatif sun.
11. Kullanıcının verdiği kodda gereksiz değişiklik yapma.
12. Bir dosyayı baştan yazman istenirse eksiksiz ve tutarlı yaz.
13. Yanıtları gereksiz başlıklarla doldurma.
14. Kullanıcı "knk" gibi samimi bir dil kullanıyorsa doğal ve samimi olabilirsin.
15. Asla API anahtarlarını veya gizli ortam değişkenlerini kullanıcıya gösterme.
`;

/* ================================================================
   36 — SIMPLE LOCAL ANSWERS
================================================================ */

function solveSimpleMath(
    text
) {

    const normalized =
        normalizeText(
            text
        );

    const expressionMatch =
        normalized.match(
            /^[\d\s+\-*/().,%]+$/
        );

    if (
        !expressionMatch
    ) {
        return null;
    }

    try {

        let expression =
            normalized
                .replace(
                    /,/g,
                    "."
                )
                .replace(
                    /%/g,
                    "/100"
                );

        if (
            !/^[0-9+\-*/().\s]+$/
                .test(
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
            typeof result !==
                "number" ||
            !Number.isFinite(
                result
            )
        ) {
            return null;
        }

        return String(
            result
        );

    } catch (
        error
    ) {

        return null;
    }
}

function localResponse(
    text
) {

    const normalized =
        normalizeText(
            text
        );

    if (
        normalized.includes(
            "en hizli kim"
        )
    ) {

        return "TürkAI ⚡🤖";
    }

    if (
        normalized ===
        "merhaba" ||
        normalized ===
        "selam" ||
        normalized.includes(
            "merhaba turkai"
        )
    ) {

        return "Selam knk! TürkAI hazır. Ne yapıyoruz?";
    }

    if (
        normalized.includes(
            "sen kimsin"
        )
    ) {

        return "Ben TürkAI. Türkçe odaklı yapay zekâ asistanıyım.";
    }

    const math =
        solveSimpleMath(
            text
        );

    if (
        math !== null
    ) {

        return math;
    }

    return null;
}

/* ================================================================
   37 — AI FETCH HELPER
================================================================ */

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 30000
) {

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () =>
                controller.abort(),
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
   38 — GROQ
================================================================ */

async function callGroq(
    messages
) {

    const config =
        AI_CONFIG.groq;

    if (
        !config.enabled
    ) {
        throw new Error(
            "Groq API anahtarı bulunamadı."
        );
    }

    const response =
        await fetchWithTimeout(
            config.endpoint,
            {
                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${config.apiKey}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        model:
                            config.model,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            45000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data?.error?.message ||
            `Groq HTTP ${response.status}`
        );
    }

    const content =
        data?.choices?.[0]
            ?.message
            ?.content;

    if (
        !content
    ) {

        throw new Error(
            "Groq boş cevap döndürdü."
        );
    }

    return {

        text:
            String(
                content
            ),

        provider:
            "groq",

        model:
            config.model
    };
}

/* ================================================================
   39 — CEREBRAS
================================================================ */

async function callCerebras(
    messages
) {

    const config =
        AI_CONFIG.cerebras;

    if (
        !config.enabled
    ) {
        throw new Error(
            "Cerebras API anahtarı bulunamadı."
        );
    }

    const response =
        await fetchWithTimeout(
            config.endpoint,
            {
                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${config.apiKey}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        model:
                            config.model,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            45000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data?.error?.message ||
            `Cerebras HTTP ${response.status}`
        );
    }

    const content =
        data?.choices?.[0]
            ?.message
            ?.content;

    if (
        !content
    ) {

        throw new Error(
            "Cerebras boş cevap döndürdü."
        );
    }

    return {

        text:
            String(
                content
            ),

        provider:
            "cerebras",

        model:
            config.model
    };
}

/* ================================================================
   40 — OPENROUTER
================================================================ */

async function callOpenRouter(
    messages
) {

    const config =
        AI_CONFIG.openrouter;

    if (
        !config.enabled
    ) {
        throw new Error(
            "OpenRouter API anahtarı bulunamadı."
        );
    }

    const response =
        await fetchWithTimeout(
            config.endpoint,
            {
                method:
                    "POST",

                headers: {

                    "Authorization":
                        `Bearer ${config.apiKey}`,

                    "Content-Type":
                        "application/json",

                    "HTTP-Referer":
                        process.env.APP_URL ||
                        "https://turkai-6.onrender.com",

                    "X-Title":
                        APP_NAME
                },

                body:
                    JSON.stringify({

                        model:
                            config.model,

                        messages,

                        temperature:
                            0.7,

                        max_tokens:
                            4096
                    })
            },
            45000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data?.error?.message ||
            `OpenRouter HTTP ${response.status}`
        );
    }

    const content =
        data?.choices?.[0]
            ?.message
            ?.content;

    if (
        !content
    ) {

        throw new Error(
            "OpenRouter boş cevap döndürdü."
        );
    }

    return {

        text:
            String(
                content
            ),

        provider:
            "openrouter",

        model:
            config.model
    };
}

/* ================================================================
   41 — GEMINI
================================================================ */

async function callGemini(
    messages
) {

    const config =
        AI_CONFIG.gemini;

    if (
        !config.enabled
    ) {
        throw new Error(
            "Gemini API anahtarı bulunamadı."
        );
    }

    const contents =
        messages
            .filter(
                message =>
                    message.role !==
                    "system"
            )
            .map(
                message => ({

                    role:
                        message.role ===
                        "assistant"
                            ? "model"
                            : "user",

                    parts: [
                        {
                            text:
                                String(
                                    message.content
                                )
                        }
                    ]
                })
            );

    const system =
        messages.find(
            message =>
                message.role ===
                "system"
        );

    const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            config.model
        )}:generateContent?key=${encodeURIComponent(
            config.apiKey
        )}`;

    const body = {

        contents,

        generationConfig: {

            temperature:
                0.7,

            maxOutputTokens:
                4096
        }
    };

    if (
        system
    ) {

        body.systemInstruction = {

            parts: [
                {
                    text:
                        String(
                            system.content
                        )
                }
            ]
        };
    }

    const response =
        await fetchWithTimeout(
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
                        body
                    )
            },
            45000
        );

    const data =
        await response.json();

    if (
        !response.ok
    ) {

        throw new Error(
            data?.error?.message ||
            `Gemini HTTP ${response.status}`
        );
    }

    const content =
        data?.candidates?.[0]
            ?.content
            ?.parts
            ?.map(
                part =>
                    part.text || ""
            )
            .join("");

    if (
        !content
    ) {

        throw new Error(
            "Gemini boş cevap döndürdü."
        );
    }

    return {

        text:
            String(
                content
            ),

        provider:
            "gemini",

        model:
            config.model
    };
}

/* ================================================================
   42 — AI MESSAGE BUILDER
================================================================ */

function buildMessages(
    userText,
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

    if (
        Array.isArray(
            history
        )
    ) {

        for (
            const item
            of history.slice(-20)
        ) {

            if (
                !item ||
                !item.role ||
                !item.content
            ) {
                continue;
            }

            const role =
                (
                    item.role ===
                    "assistant" ||
                    item.role ===
                    "user" ||
                    item.role ===
                    "system"
                )
                    ? item.role
                    : "user";

            messages.push({

                role,

                content:
                    cleanText(
                        item.content,
                        12000
                    )
            });
        }
    }

    messages.push({

        role:
            "user",

        content:
            cleanText(
                userText,
                30000
            )
    });

    return messages;
}

/* ================================================================
   43 — AI PROVIDER CHAIN
================================================================ */

async function callAI(
    userText,
    history = []
) {

    const local =
        localResponse(
            userText
        );

    if (
        local !== null
    ) {

        return {

            text:
                local,

            provider:
                "local",

            model:
                "turkai-local"
        };
    }

    const messages =
        buildMessages(
            userText,
            history
        );

    const providers = [

        {
            name:
                "groq",

            enabled:
                AI_CONFIG.groq
                    .enabled,

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
                AI_CONFIG.cerebras
                    .enabled,

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
                AI_CONFIG.openrouter
                    .enabled,

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
                AI_CONFIG.gemini
                    .enabled,

            call:
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

            logAI(
                `AI provider deneniyor: ${provider.name}`
            );

            const result =
                await provider.call();

            logAI(
                `AI provider başarılı: ${provider.name}`
            );

            return result;

        } catch (
            error
        ) {

            errors.push({

                provider:
                    provider.name,

                error:
                    error.message
            });

            logWarn(
                `AI provider başarısız: ${provider.name}`,
                {
                    error:
                        error.message
                }
            );
        }
    }

    return {

        text:
            "Şu anda yapay zekâ servislerine ulaşılamıyor. Biraz sonra tekrar deneyebilirsin.",

        provider:
            "fallback",

        model:
            "turkai-fallback",

        errors
    };
}

/* ================================================================
   44 — CHAT AI ENDPOINT
================================================================ */

app.post(
    "/api/chat",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const text =
                cleanText(
                    req.body.message ||
                    req.body.prompt ||
                    req.body.text,
                    30000
                );

            if (
                !text
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Mesaj boş olamaz."
                    });
            }

            const user =
                req.user;

            let chatId =
                cleanText(
                    req.body.chatId,
                    200
                );

            let chat =
                chatId
                    ? findChatById(
                        chatId
                    )
                    : null;

            if (
                chat &&
                chat.userId !==
                    user.id &&
                !isAdminUser(
                    user
                )
            ) {

                chat = null;
            }

            if (
                !chat
            ) {

                chat =
                    createChat(
                        user.id,
                        text.slice(
                            0,
                            60
                        )
                    );

                chatId =
                    chat.id;
            }

            const history =
                getChatMessages(
                    chatId,
                    20
                );

            addMessage(
                chatId,
                user.id,
                "user",
                text
            );

            const result =
                await callAI(
                    text,
                    history
                );

            const assistantMessage =
                addMessage(
                    chatId,
                    user.id,
                    "assistant",
                    result.text,
                    {
                        provider:
                            result.provider,

                        model:
                            result.model
                    }
                );

            const statistics =
                getStatistics();

            statistics.totalMessages =
                safeNumber(
                    statistics.totalMessages
                ) + 2;

            saveStatistics(
                statistics
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

                message:
                    result.text,

                chatId,

                provider:
                    result.provider,

                model:
                    result.model,

                messageId:
                    assistantMessage.id
            });

        } catch (
            error
        ) {

            const statistics =
                getStatistics();

            statistics.totalErrors =
                safeNumber(
                    statistics.totalErrors
                ) + 1;

            saveStatistics(
                statistics
            );

            logError(
                "Chat API error",
                {
                    error:
                        error.message,

                    requestId:
                        req.requestId
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "AI yanıtı oluşturulurken bir hata oluştu.",

                requestId:
                    req.requestId
            });
        }
    }
);

/* ================================================================
   45 — AI STATUS
================================================================ */

app.get(
    "/api/ai/status",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            providers: {

                groq:
                    AI_CONFIG.groq
                        .enabled,

                cerebras:
                    AI_CONFIG.cerebras
                        .enabled,

                openrouter:
                    AI_CONFIG.openrouter
                        .enabled,

                gemini:
                    AI_CONFIG.gemini
                        .enabled
            },

            local:
                true,

            fallback:
                true
        });
    }
);

/* ================================================================
   46 — SOCKET STATE
================================================================ */

const connectedUsers =
    new Map();

const connectedSockets =
    new Map();

const activeChatRooms =
    new Map();

const SERVER_STATE = {

    startedAt:
        nowISO(),

    shuttingDown:
        false,

    connections:
        0,

    activeUsers:
        0,

    activeRooms:
        0
};

/* ================================================================
   47 — SOCKET AUTH HELPER
================================================================ */

function getSocketToken(
    socket
) {

    const auth =
        socket.handshake &&
        socket.handshake.auth
            ? socket.handshake.auth
            : {};

    const query =
        socket.handshake &&
        socket.handshake.query
            ? socket.handshake.query
            : {};

    return cleanText(
        auth.token ||
        auth.sessionToken ||
        query.token ||
        "",
        2000
    );
}

function getSocketUser(
    socket
) {

    const token =
        getSocketToken(
            socket
        );

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

            const user =
                findUserById(
                    session.userId
                );

            if (
                user
            ) {
                return user;
            }
        }
    }

    return getGuestUser();
}

/* ================================================================
   48 — SOCKET.IO CONNECTION
================================================================ */

io.on(
    "connection",
    socket => {

        SERVER_STATE.connections++;

        const user =
            getSocketUser(
                socket
            );

        const userId =
            user.id;

        connectedSockets.set(
            socket.id,
            {
                userId,
                connectedAt:
                    nowISO()
            }
        );

        if (
            !connectedUsers.has(
                userId
            )
        ) {

            connectedUsers.set(
                userId,
                {
                    userId,

                    name:
                        user.name,

                    plan:
                        user.plan,

                    sockets:
                        new Set(),

                    connectedAt:
                        nowISO(),

                    lastSeenAt:
                        nowISO()
                }
            );
        }

        connectedUsers
            .get(
                userId
            )
            .sockets
            .add(
                socket.id
            );

        SERVER_STATE.activeUsers =
            connectedUsers.size;

        socket.emit(
            "turkai:ready",
            {
                success:
                    true,

                server:
                    APP_NAME,

                version:
                    APP_VERSION,

                socketId:
                    socket.id,

                user: {

                    id:
                        user.id,

                    name:
                        user.name,

                    plan:
                        user.plan,

                    role:
                        user.role
                }
            }
        );

        socket.on(
            "turkai:ping",
            payload => {

                socket.emit(
                    "turkai:pong",
                    {
                        success:
                            true,

                        received:
                            payload ||
                            null,

                        timestamp:
                            nowISO()
                    }
                );
            }
        );

        socket.on(
            "chat:join",
            payload => {

                const chatId =
                    cleanText(
                        payload?.chatId,
                        200
                    );

                if (
                    !chatId
                ) {
                    return;
                }

                socket.join(
                    `chat:${chatId}`
                );

                if (
                    !activeChatRooms.has(
                        chatId
                    )
                ) {

                    activeChatRooms.set(
                        chatId,
                        new Set()
                    );
                }

                activeChatRooms
                    .get(
                        chatId
                    )
                    .add(
                        socket.id
                    );

                SERVER_STATE.activeRooms =
                    activeChatRooms.size;

                socket.emit(
                    "chat:joined",
                    {
                        success:
                            true,

                        chatId
                    }
                );
            }
        );

        socket.on(
            "chat:leave",
            payload => {

                const chatId =
                    cleanText(
                        payload?.chatId,
                        200
                    );

                if (
                    !chatId
                ) {
                    return;
                }

                socket.leave(
                    `chat:${chatId}`
                );

                const room =
                    activeChatRooms.get(
                        chatId
                    );

                if (
                    room
                ) {

                    room.delete(
                        socket.id
                    );

                    if (
                        room.size ===
                        0
                    ) {

                        activeChatRooms.delete(
                            chatId
                        );
                    }
                }

                SERVER_STATE.activeRooms =
                    activeChatRooms.size;

                socket.emit(
                    "chat:left",
                    {
                        success:
                            true,

                        chatId
                    }
                );
            }
        );

        socket.on(
            "chat:typing",
            payload => {

                const chatId =
                    cleanText(
                        payload?.chatId,
                        200
                    );

                if (
                    !chatId
                ) {
                    return;
                }

                socket
                    .to(
                        `chat:${chatId}`
                    )
                    .emit(
                        "chat:typing",
                        {
                            userId,

                            name:
                                user.name,

                            typing:
                                Boolean(
                                    payload?.typing
                                )
                        }
                    );
            }
        );

        socket.on(
            "chat:presence",
            () => {

                socket.emit(
                    "chat:presence",
                    {
                        users:
                            Array.from(
                                connectedUsers.values()
                            ).map(
                                item => ({

                                    userId:
                                        item.userId,

                                    name:
                                        item.name,

                                    plan:
                                        item.plan,

                                    online:
                                        true
                                })
                            )
                    }
                );
            }
        );

        socket.on(
            "disconnect",
            reason => {

                connectedSockets.delete(
                    socket.id
                );

                const connection =
                    connectedUsers.get(
                        userId
                    );

                if (
                    connection
                ) {

                    connection.sockets.delete(
                        socket.id
                    );

                    connection.lastSeenAt =
                        nowISO();

                    if (
                        connection.sockets.size ===
                        0
                    ) {

                        connectedUsers.delete(
                            userId
                        );
                    }
                }

                for (
                    const [
                        chatId,
                        room
                    ]
                    of activeChatRooms
                ) {

                    room.delete(
                        socket.id
                    );

                    if (
                        room.size ===
                        0
                    ) {

                        activeChatRooms.delete(
                            chatId
                        );
                    }
                }

                SERVER_STATE.activeUsers =
                    connectedUsers.size;

                SERVER_STATE.activeRooms =
                    activeChatRooms.size;

                logInfo(
                    "Socket disconnected",
                    {
                        socketId:
                            socket.id,

                        userId,

                        reason
                    }
                );
            }
        );
    }
);

/* ================================================================
   49 — SOCKET STATUS
================================================================ */

app.get(
    "/api/socket/status",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            socket: {

                connections:
                    SERVER_STATE.connections,

                activeUsers:
                    SERVER_STATE.activeUsers,

                activeRooms:
                    SERVER_STATE.activeRooms
            }
        });
    }
);

/* ================================================================
   50 — SERVER INFO
================================================================ */

app.get(
    "/api/server/info",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            application: {

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

                name:
                    SERVER_NAME,

                environment:
                    NODE_ENV,

                host:
                    HOST,

                port:
                    PORT,

                node:
                    process.version,

                platform:
                    process.platform,

                architecture:
                    process.arch,

                startedAt:
                    SERVER_STATE.startedAt,

                uptime:
                    Date.now() -
                    START_TIME
            },

            runtime: {

                memory:
                    process.memoryUsage(),

                cpu:
                    os.cpus().length,

                hostname:
                    os.hostname()
            }
        });
    }
);

/* ================================================================
   PARÇA 1 SONU
================================================================ */

/*
   ÖNEMLİ:

   Burada server.js'i çalıştırma.

   PARÇA 2 bu kodun hemen ALTINA gelecek.

   Sonrasında PARÇA 3 gelecek.

   startServer() ve module.exports
   PARÇA 3'ün sonunda bulunacak.

   Böylece:

   PARÇA 1
       ↓
   PARÇA 2
       ↓
   PARÇA 3
       ↓
   TEK server.js
*/
/* ================================================================
   TÜRKAI SERVER — PARÇA 2 / 3
   AI • MEMORY • RESEARCH • FILES • PROJECTS • ADMIN • USAGE
================================================================ */

/* ================================================================
   51 — USAGE SYSTEM
================================================================ */

function getTodayKey() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

function createEmptyUsage() {

    return {

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

        apiRequests:
            0,

        errors:
            0,

        date:
            getTodayKey(),

        updatedAt:
            nowISO()
    };
}

function getUserUsage(
    userId
) {

    const usage =
        getUsage();

    const today =
        getTodayKey();

    if (
        !usage[userId]
    ) {

        usage[userId] =
            {};
    }

    if (
        usage[userId].date !==
        today
    ) {

        usage[userId] =
            createEmptyUsage();
    }

    return usage[userId];
}

function saveUserUsage(
    userId,
    data
) {

    const usage =
        getUsage();

    usage[userId] = {

        ...createEmptyUsage(),

        ...data,

        date:
            getTodayKey(),

        updatedAt:
            nowISO()
    };

    return saveUsage(
        usage
    );
}

function incrementUsage(
    userId,
    type,
    amount = 1
) {

    const current =
        getUserUsage(
            userId
        );

    current[type] =
        safeNumber(
            current[type]
        ) +
        safeNumber(
            amount,
            1
        );

    current.updatedAt =
        nowISO();

    saveUserUsage(
        userId,
        current
    );

    return current;
}

function getUsageLimit(
    user,
    type
) {

    const plan =
        getPlanForUser(
            user
        );

    return safeNumber(
        plan[type],
        0
    );
}

function usageAvailable(
    user,
    type,
    amount = 1
) {

    const limit =
        getUsageLimit(
            user,
            type
        );

    if (
        limit <= 0
    ) {

        return false;
    }

    const usage =
        getUserUsage(
            user.id
        );

    const current =
        safeNumber(
            usage[type],
            0
        );

    return (
        current +
        amount <=
        limit
    );
}

/* ================================================================
   52 — USAGE API
================================================================ */

app.get(
    "/api/usage",
    optionalAuth,
    (
        req,
        res
    ) => {

        const user =
            req.user;

        const usage =
            getUserUsage(
                user.id
            );

        const plan =
            getPlanForUser(
                user
            );

        res.json({

            success:
                true,

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
                    plan.messages,

                research:
                    plan.research,

                images:
                    plan.images,

                videos:
                    plan.videos,

                maxUploadMB:
                    plan.maxUploadMB
            }
        });
    }
);

/* ================================================================
   53 — MEMORY SYSTEM
================================================================ */

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

    if (
        !normalizedQuery
    ) {
        return [];
    }

    return memories
        .filter(
            memory =>
                memory.userId ===
                userId
        )
        .filter(
            memory => {

                const content =
                    normalizeText(
                        memory.content
                    );

                const title =
                    normalizeText(
                        memory.title ||
                        ""
                    );

                return (
                    content.includes(
                        normalizedQuery
                    ) ||
                    title.includes(
                        normalizedQuery
                    )
                );
            }
        )
        .slice(
            -clamp(
                limit,
                1,
                100
            )
        );
}

function addMemory(
    userId,
    content,
    metadata = {}
) {

    const memories =
        getMemories();

    const memory = {

        id:
            createId(
                "mem"
            ),

        userId,

        title:
            cleanText(
                metadata.title ||
                "Hatırlanan bilgi",
                200
            ),

        content:
            cleanText(
                content,
                5000
            ),

        type:
            cleanText(
                metadata.type ||
                "general",
                50
            ),

        source:
            cleanText(
                metadata.source ||
                "chat",
                50
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

function detectMemoryCandidate(
    text
) {

    const normalized =
        normalizeText(
            text
        );

    const patterns = [

        "benim adim",

        "adim",

        "ben",

        "hatirla",

        "unutma",

        "aklinda tut",

        "bunu hatirla",

        "favorim",

        "sevdigim",

        "projem"
    ];

    return patterns.some(
        pattern =>
            normalized.includes(
                pattern
            )
    );
}

function processMemoryCandidate(
    userId,
    text
) {

    if (
        !detectMemoryCandidate(
            text
        )
    ) {

        return null;
    }

    const normalized =
        normalizeText(
            text
        );

    if (
        normalized.includes(
            "hatirla"
        ) ||
        normalized.includes(
            "unutma"
        ) ||
        normalized.includes(
            "aklinda tut"
        )
    ) {

        return addMemory(
            userId,
            text,
            {
                type:
                    "explicit",

                source:
                    "chat"
            }
        );
    }

    return null;
}

/* ================================================================
   54 — MEMORY ROUTES
================================================================ */

app.get(
    "/api/memory",
    optionalAuth,
    (
        req,
        res
    ) => {

        const memories =
            getMemories()
                .filter(
                    memory =>
                        memory.userId ===
                        req.user.id
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            b.updatedAt ||
                            b.createdAt
                        ) -
                        new Date(
                            a.updatedAt ||
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
    optionalAuth,
    (
        req,
        res
    ) => {

        const query =
            cleanText(
                req.query.q,
                1000
            );

        const memories =
            searchMemories(
                req.user.id,
                query,
                20
            );

        res.json({

            success:
                true,

            query,

            memories
        });
    }
);

app.post(
    "/api/memory",
    optionalAuth,
    (
        req,
        res
    ) => {

        const content =
            cleanText(
                req.body.content ||
                req.body.text,
                5000
            );

        if (
            !content
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Hafızaya kaydedilecek bilgi boş."
                });
        }

        const memory =
            addMemory(
                req.user.id,
                content,
                {
                    title:
                        req.body.title,

                    type:
                        req.body.type ||
                        "manual",

                    source:
                        "manual"
                }
            );

        res.status(
            201
        ).json({

            success:
                true,

            memory
        });
    }
);

app.delete(
    "/api/memory/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const memories =
            getMemories();

        const index =
            memories.findIndex(
                memory =>
                    memory.id ===
                    req.params.id &&
                    memory.userId ===
                    req.user.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Hafıza kaydı bulunamadı."
                });
        }

        memories.splice(
            index,
            1
        );

        saveMemories(
            memories
        );

        res.json({

            success:
                true,

            message:
                "Hafıza kaydı silindi."
        });
    }
);

/* ================================================================
   55 — KNOWLEDGE SYSTEM
================================================================ */

function findKnowledgeAnswer(
    question
) {

    const knowledge =
        getKnowledge();

    const normalized =
        normalizeText(
            question
        );

    if (
        !normalized
    ) {
        return null;
    }

    let best =
        null;

    let bestScore =
        0;

    for (
        const item
        of knowledge
    ) {

        const questionText =
            normalizeText(
                item.question ||
                ""
            );

        const answerText =
            normalizeText(
                item.answer ||
                ""
            );

        if (
            !questionText
        ) {
            continue;
        }

        if (
            normalized ===
            questionText
        ) {

            return item;
        }

        const words =
            normalized
                .split(
                    /\s+/
                )
                .filter(
                    word =>
                        word.length >
                        2
                );

        let score =
            0;

        for (
            const word
            of words
        ) {

            if (
                questionText.includes(
                    word
                )
            ) {

                score++;
            }

            if (
                answerText.includes(
                    word
                )
            ) {

                score +=
                    0.25;
            }
        }

        if (
            score >
            bestScore
        ) {

            bestScore =
                score;

            best =
                item;
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

function saveKnowledgeAnswer(
    question,
    answer,
    metadata = {}
) {

    const knowledge =
        getKnowledge();

    const normalized =
        normalizeText(
            question
        );

    const existing =
        knowledge.find(
            item =>
                normalizeText(
                    item.question
                ) ===
                normalized
        );

    if (
        existing
    ) {

        existing.answer =
            cleanText(
                answer,
                20000
            );

        existing.updatedAt =
            nowISO();

        saveKnowledge(
            knowledge
        );

        return existing;
    }

    const item = {

        id:
            createId(
                "know"
            ),

        question:
            cleanText(
                question,
                5000
            ),

        answer:
            cleanText(
                answer,
                20000
            ),

        source:
            metadata.source ||
            "ai",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()
    };

    knowledge.push(
        item
    );

    saveKnowledge(
        knowledge
    );

    return item;
}

/* ================================================================
   56 — KNOWLEDGE ROUTES
================================================================ */

app.get(
    "/api/knowledge",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            knowledge:
                getKnowledge()
        });
    }
);

app.post(
    "/api/knowledge",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const question =
            cleanText(
                req.body.question,
                5000
            );

        const answer =
            cleanText(
                req.body.answer,
                20000
            );

        if (
            !question ||
            !answer
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Soru ve cevap gerekli."
                });
        }

        const item =
            saveKnowledgeAnswer(
                question,
                answer,
                {
                    source:
                        "admin"
                }
            );

        res.status(
            201
        ).json({

            success:
                true,

            item
        });
    }
);

/* ================================================================
   57 — RESEARCH SYSTEM
================================================================ */

async function performResearch(
    query,
    user
) {

    const question =
        cleanText(
            query,
            12000
        );

    if (
        !question
    ) {

        throw new Error(
            "Araştırma sorgusu boş."
        );
    }

    if (
        !usageAvailable(
            user,
            "research"
        )
    ) {

        throw new Error(
            "Günlük araştırma limitin doldu."
        );
    }

    incrementUsage(
        user.id,
        "research"
    );

    const statistics =
        getStatistics();

    statistics.totalResearch =
        safeNumber(
            statistics.totalResearch
        ) + 1;

    saveStatistics(
        statistics
    );

    const localKnowledge =
        findKnowledgeAnswer(
            question
        );

    if (
        localKnowledge
    ) {

        return {

            query:
                question,

            answer:
                localKnowledge.answer,

            source:
                "knowledge",

            provider:
                "local",

            timestamp:
                nowISO()
        };
    }

    const researchPrompt = `
Aşağıdaki konu hakkında kullanıcıya Türkçe,
düzenli ve mümkün olduğunca doğru bir araştırma
cevabı hazırla.

Konu:
${question}

Kurallar:
- Bilmediğin bilgiyi kesin gerçek gibi yazma.
- Tarihsel veya güncel bilgi ayrımını belirt.
- Gereksiz tekrar yapma.
- Sonuç bölümünde kısa özet ver.
`;

    const result =
        await callAI(
            researchPrompt,
            []
        );

    const record = {

        query:
            question,

        answer:
            result.text,

        source:
            "ai",

        provider:
            result.provider,

        model:
            result.model,

        timestamp:
            nowISO()
    };

    return record;
}

/* ================================================================
   58 — RESEARCH ROUTE
================================================================ */

app.post(
    "/api/research",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const query =
                cleanText(
                    req.body.query ||
                    req.body.question ||
                    req.body.text,
                    12000
                );

            if (
                !query
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Araştırma konusu gerekli."
                    });
            }

            const result =
                await performResearch(
                    query,
                    req.user
                );

            const research =
                getResearch();

            const record = {

                id:
                    createId(
                        "research"
                    ),

                userId:
                    req.user.id,

                ...result
            };

            research.push(
                record
            );

            saveResearch(
                research
            );

            res.json({

                success:
                    true,

                result:
                    record
            });

        } catch (
            error
        ) {

            logError(
                "Research error",
                {
                    error:
                        error.message
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    error.message ||
                    "Araştırma sırasında hata oluştu."
            });
        }
    }
);

app.get(
    "/api/research",
    optionalAuth,
    (
        req,
        res
    ) => {

        const records =
            getResearch()
                .filter(
                    record =>
                        record.userId ===
                        req.user.id
                )
                .slice(
                    -100
                )
                .reverse();

        res.json({

            success:
                true,

            research:
                records
        });
    }
);

/* ================================================================
   59 — UNIVERSAL SEARCH
================================================================ */

app.get(
    "/api/search",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const query =
                cleanText(
                    req.query.q ||
                    req.query.query,
                    10000
                );

            if (
                !query
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Arama sorgusu gerekli."
                    });
            }

            const knowledge =
                findKnowledgeAnswer(
                    query
                );

            if (
                knowledge
            ) {

                return res.json({

                    success:
                        true,

                    source:
                        "knowledge",

                    result:
                        knowledge.answer
                });
            }

            const result =
                await performResearch(
                    query,
                    req.user
                );

            res.json({

                success:
                    true,

                source:
                    result.source,

                result:
                    result.answer
            });

        } catch (
            error
        ) {

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

/* ================================================================
   60 — FILE STORAGE
================================================================ */

function sanitizeFileName(
    filename
) {

    let name =
        cleanText(
            filename,
            255
        );

    name =
        name
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                "_"
            )
            .replace(
                /\.\./g,
                "_"
            );

    if (
        !name
    ) {

        name =
            "dosya.txt";
    }

    return name;
}

function getFileExtension(
    filename
) {

    return path
        .extname(
            filename
        )
        .toLowerCase();
}

function getFileSizeMB(
    bytes
) {

    return (
        safeNumber(
            bytes
        ) /
        1024 /
        1024
    );
}

/* ================================================================
   61 — FILE UPLOAD API
================================================================ */

app.post(
    "/api/upload",
    optionalAuth,
    (
        req,
        res
    ) => {

        try {

            const user =
                req.user;

            const filename =
                sanitizeFileName(
                    req.body.filename ||
                    req.body.name ||
                    "dosya.txt"
                );

            const content =
                req.body.content;

            if (
                !content
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Dosya içeriği gerekli."
                    });
            }

            let buffer;

            try {

                if (
                    typeof content ===
                    "string" &&
                    content.startsWith(
                        "data:"
                    )
                ) {

                    const base64 =
                        content.split(
                            ","
                        )[1] ||
                        "";

                    buffer =
                        Buffer.from(
                            base64,
                            "base64"
                        );

                } else {

                    buffer =
                        Buffer.from(
                            String(
                                content
                            ),
                            "base64"
                        );
                }

            } catch (
                error
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Dosya verisi geçersiz."
                    });
            }

            const plan =
                getPlanForUser(
                    user
                );

            const maxBytes =
                plan.maxUploadMB *
                1024 *
                1024;

            if (
                buffer.length >
                maxBytes
            ) {

                return res
                    .status(413)
                    .json({
                        success:
                            false,

                        error:
                            `Dosya limiti ${plan.maxUploadMB} MB.`
                    });
            }

            const fileId =
                createId(
                    "file"
                );

            const storedName =
                `${fileId}_${filename}`;

            const fullPath =
                path.join(
                    UPLOADS_DIR,
                    storedName
                );

            fs.writeFileSync(
                fullPath,
                buffer
            );

            const files =
                getFiles();

            const file = {

                id:
                    fileId,

                userId:
                    user.id,

                originalName:
                    filename,

                storedName,

                path:
                    fullPath,

                size:
                    buffer.length,

                sizeMB:
                    getFileSizeMB(
                        buffer.length
                    ),

                extension:
                    getFileExtension(
                        filename
                    ),

                createdAt:
                    nowISO()
            };

            files.push(
                file
            );

            saveFiles(
                files
            );

            incrementUsage(
                user.id,
                "uploads"
            );

            const statistics =
                getStatistics();

            statistics.totalFiles =
                files.length;

            saveStatistics(
                statistics
            );

            res.status(
                201
            ).json({

                success:
                    true,

                file: {

                    id:
                        file.id,

                    name:
                        file.originalName,

                    size:
                        file.size,

                    sizeMB:
                        file.sizeMB,

                    extension:
                        file.extension,

                    createdAt:
                        file.createdAt
                }
            });

        } catch (
            error
        ) {

            logError(
                "Upload error",
                {
                    error:
                        error.message
                }
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    "Dosya yüklenirken hata oluştu."
            });
        }
    }
);

/* ================================================================
   62 — FILE LIST
================================================================ */

app.get(
    "/api/files",
    optionalAuth,
    (
        req,
        res
    ) => {

        const files =
            getFiles()
                .filter(
                    file =>
                        file.userId ===
                        req.user.id
                )
                .map(
                    file => ({

                        id:
                            file.id,

                        name:
                            file.originalName,

                        size:
                            file.size,

                        sizeMB:
                            file.sizeMB,

                        extension:
                            file.extension,

                        createdAt:
                            file.createdAt
                    })
                )
                .reverse();

        res.json({

            success:
                true,

            files
        });
    }
);

/* ================================================================
   63 — FILE DELETE
================================================================ */

app.delete(
    "/api/files/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const files =
            getFiles();

        const index =
            files.findIndex(
                file =>
                    file.id ===
                    req.params.id &&
                    file.userId ===
                    req.user.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Dosya bulunamadı."
                });
        }

        const file =
            files[
                index
            ];

        try {

            if (
                file.path &&
                fs.existsSync(
                    file.path
                )
            ) {

                fs.unlinkSync(
                    file.path
                );
            }

        } catch (
            error
        ) {

            logWarn(
                "Dosya fiziksel olarak silinemedi",
                {
                    error:
                        error.message
                }
            );
        }

        files.splice(
            index,
            1
        );

        saveFiles(
            files
        );

        res.json({

            success:
                true,

            message:
                "Dosya silindi."
        });
    }
);

/* ================================================================
   64 — PROJECT SYSTEM
================================================================ */

function findProjectById(
    projectId
) {

    return getProjects()
        .find(
            project =>
                project.id ===
                projectId
        ) || null;
}

function createProject(
    userId,
    input = {}
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
            cleanText(
                input.name ||
                "Yeni proje",
                200
            ),

        description:
            cleanText(
                input.description ||
                "",
                5000
            ),

        language:
            cleanText(
                input.language ||
                "javascript",
                50
            ),

        code:
            cleanText(
                input.code ||
                "",
                100000
            ),

        files:
            Array.isArray(
                input.files
            )
                ? input.files
                : [],

        createdAt:
            nowISO(),

        updatedAt:
            nowISO(),

        starred:
            false
    };

    projects.push(
        project
    );

    saveProjects(
        projects
    );

    return project;
}

/* ================================================================
   65 — PROJECT LIST
================================================================ */

app.get(
    "/api/projects",
    optionalAuth,
    (
        req,
        res
    ) => {

        const projects =
            getProjects()
                .filter(
                    project =>
                        project.userId ===
                        req.user.id
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

        res.json({

            success:
                true,

            projects
        });
    }
);

/* ================================================================
   66 — PROJECT CREATE
================================================================ */

app.post(
    "/api/projects",
    optionalAuth,
    (
        req,
        res
    ) => {

        const project =
            createProject(
                req.user.id,
                req.body
            );

        res.status(
            201
        ).json({

            success:
                true,

            project
        });
    }
);

/* ================================================================
   67 — PROJECT GET
================================================================ */

app.get(
    "/api/projects/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const project =
            findProjectById(
                req.params.id
            );

        if (
            !project
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Proje bulunamadı."
                });
        }

        if (
            project.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Bu projeye erişemezsiniz."
                });
        }

        res.json({

            success:
                true,

            project
        });
    }
);

/* ================================================================
   68 — PROJECT UPDATE
================================================================ */

app.put(
    "/api/projects/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const projects =
            getProjects();

        const index =
            projects.findIndex(
                project =>
                    project.id ===
                    req.params.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Proje bulunamadı."
                });
        }

        const project =
            projects[
                index
            ];

        if (
            project.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Yetkiniz yok."
                });
        }

        if (
            req.body.name !==
            undefined
        ) {

            project.name =
                cleanText(
                    req.body.name,
                    200
                );
        }

        if (
            req.body.description !==
            undefined
        ) {

            project.description =
                cleanText(
                    req.body.description,
                    5000
                );
        }

        if (
            req.body.language !==
            undefined
        ) {

            project.language =
                cleanText(
                    req.body.language,
                    50
                );
        }

        if (
            req.body.code !==
            undefined
        ) {

            project.code =
                cleanText(
                    req.body.code,
                    100000
                );
        }

        if (
            Array.isArray(
                req.body.files
            )
        ) {

            project.files =
                req.body.files;
        }

        project.updatedAt =
            nowISO();

        projects[
            index
        ] =
            project;

        saveProjects(
            projects
        );

        res.json({

            success:
                true,

            project
        });
    }
);

/* ================================================================
   69 — PROJECT DELETE
================================================================ */

app.delete(
    "/api/projects/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const projects =
            getProjects();

        const index =
            projects.findIndex(
                project =>
                    project.id ===
                    req.params.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Proje bulunamadı."
                });
        }

        const project =
            projects[
                index
            ];

        if (
            project.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Yetkiniz yok."
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

            success:
                true,

            message:
                "Proje silindi."
        });
    }
);

/* ================================================================
   70 — CODE ANALYSIS
================================================================ */

function detectCodeLanguage(
    code,
    requested
) {

    if (
        requested
    ) {

        return cleanText(
            requested,
            50
        );
    }

    const text =
        String(
            code || ""
        );

    if (
        /<html|<div|<script/i
            .test(
                text
            )
    ) {
        return "html";
    }

    if (
        /function\s+\w+|console\.log|const\s+\w+|let\s+\w+/i
            .test(
                text
            )
    ) {
        return "javascript";
    }

    if (
        /def\s+\w+\(|import\s+\w+|print\s*\(/i
            .test(
                text
            )
    ) {
        return "python";
    }

    if (
        /#include\s*<|std::|int\s+main\s*\(/i
            .test(
                text
            )
    ) {
        return "cpp";
    }

    if (
        /using\s+System|namespace\s+\w+/i
            .test(
                text
            )
    ) {
        return "csharp";
    }

    if (
        /public\s+static\s+void\s+main|class\s+\w+/i
            .test(
                text
            )
    ) {
        return "java";
    }

    return "unknown";
}

function basicCodeChecks(
    code,
    language
) {

    const issues = [];

    const text =
        String(
            code || ""
        );

    if (
        !text.trim()
    ) {

        issues.push({

            severity:
                "warning",

            message:
                "Kod boş."
        });

        return issues;
    }

    if (
        language ===
        "javascript"
    ) {

        const opens =
            (
                text.match(
                    /{/g
                ) || []
            ).length;

        const closes =
            (
                text.match(
                    /}/g
                ) || []
            ).length;

        if (
            opens !==
            closes
        ) {

            issues.push({

                severity:
                    "error",

                message:
                    "Süslü parantez sayıları eşleşmiyor."
            });
        }

        if (
            text.includes(
                "eval("
            )
        ) {

            issues.push({

                severity:
                    "warning",

                message:
                    "eval() kullanımı güvenlik açısından dikkat gerektirir."
            });
        }
    }

    if (
        language ===
        "html"
    ) {

        if (
            !/<html/i.test(
                text
            ) &&
            !/<body/i.test(
                text
            )
        ) {

            issues.push({

                severity:
                    "info",

                message:
                    "Tam HTML belgesi yerine parça HTML kullanılıyor olabilir."
            });
        }
    }

    return issues;
}

app.post(
    "/api/code/analyze",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const code =
                cleanText(
                    req.body.code,
                    100000
                );

            const language =
                detectCodeLanguage(
                    code,
                    req.body.language
                );

            const issues =
                basicCodeChecks(
                    code,
                    language
                );

            let aiAnalysis =
                null;

            if (
                req.body.ai === true ||
                req.body.ai ===
                    "true"
            ) {

                const prompt = `
Aşağıdaki kodu analiz et.

Dil:
${language}

Kod:
${code}

Şunları kısa ve teknik şekilde belirt:
- Hatalar
- Güvenlik sorunları
- Performans sorunları
- İyileştirme önerileri
`;

                const result =
                    await callAI(
                        prompt,
                        []
                    );

                aiAnalysis =
                    result.text;
            }

            res.json({

                success:
                    true,

                language,

                issues,

                aiAnalysis
            });

        } catch (
            error
        ) {

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

/* ================================================================
   71 — PRO CODE SYSTEM
================================================================ */

const TURKAI_PRO_CODE =
    process.env.TURKAI_PRO_CODE ||
    "";

app.post(
    "/api/pro/activate",
    optionalAuth,
    (
        req,
        res
    ) => {

        const code =
            cleanText(
                req.body.code,
                500
            );

        if (
            !TURKAI_PRO_CODE
        ) {

            return res
                .status(503)
                .json({
                    success:
                        false,

                    error:
                        "Pro aktivasyon sistemi yapılandırılmamış."
                });
        }

        if (
            !code ||
            code !==
                TURKAI_PRO_CODE
        ) {

            logSecurity(
                "Geçersiz Pro kodu",
                {
                    userId:
                        req.user.id
                }
            );

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Pro kodu geçersiz."
                });
        }

        const users =
            getUsers();

        const index =
            users.findIndex(
                user =>
                    user.id ===
                    req.user.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Kullanıcı bulunamadı."
                });
        }

        users[
            index
        ].plan =
            "pro";

        users[
            index
        ].updatedAt =
            nowISO();

        saveUsers(
            users
        );

        const payments =
            getPayments();

        payments.push({

            id:
                createId(
                    "payment"
                ),

            userId:
                req.user.id,

            type:
                "pro_activation",

            plan:
                "pro",

            amount:
                0,

            currency:
                "TRY",

            status:
                "activated",

            createdAt:
                nowISO()
        });

        savePayments(
            payments
        );

        res.json({

            success:
                true,

            message:
                "TürkAI Pro aktif edildi.",

            plan:
                "pro"
        });
    }
);

/* ================================================================
   72 — ADMIN STATUS
================================================================ */

app.get(
    "/api/admin/status",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const users =
            getUsers();

        const statistics =
            getStatistics();

        res.json({

            success:
                true,

            admin:
                true,

            statistics,

            counts: {

                users:
                    users.length,

                chats:
                    getChats()
                        .length,

                messages:
                    getMessages()
                        .length,

                memories:
                    getMemories()
                        .length,

                files:
                    getFiles()
                        .length,

                projects:
                    getProjects()
                        .length,

                research:
                    getResearch()
                        .length
            }
        });
    }
);

/* ================================================================
   73 — ADMIN USERS
================================================================ */

app.get(
    "/api/admin/users",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

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

                        role:
                            user.role,

                        provider:
                            user.provider,

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

            users
        });
    }
);

/* ================================================================
   74 — ADMIN USER UPDATE
================================================================ */

app.patch(
    "/api/admin/users/:id",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const users =
            getUsers();

        const index =
            users.findIndex(
                user =>
                    user.id ===
                    req.params.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Kullanıcı bulunamadı."
                });
        }

        const user =
            users[
                index
            ];

        if (
            req.body.plan
        ) {

            const requestedPlan =
                cleanText(
                    req.body.plan,
                    30
                );

            if (
                PLANS[
                    requestedPlan
                ]
            ) {

                user.plan =
                    requestedPlan;
            }
        }

        if (
            req.body.role
        ) {

            user.role =
                cleanText(
                    req.body.role,
                    30
                );
        }

        if (
            req.body.name !==
            undefined
        ) {

            user.name =
                cleanText(
                    req.body.name,
                    120
                );
        }

        if (
            req.body.active !==
            undefined
        ) {

            user.active =
                Boolean(
                    req.body.active
                );
        }

        user.updatedAt =
            nowISO();

        users[
            index
        ] =
            user;

        saveUsers(
            users
        );

        addAuditLog(
            req.user.id,
            "admin_user_update",
            {
                targetUserId:
                    user.id
            }
        );

        res.json({

            success:
                true,

            user
        });
    }
);

/* ================================================================
   75 — ADMIN USER DELETE
================================================================ */

app.delete(
    "/api/admin/users/:id",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const users =
            getUsers();

        const index =
            users.findIndex(
                user =>
                    user.id ===
                    req.params.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Kullanıcı bulunamadı."
                });
        }

        const target =
            users[
                index
            ];

        users.splice(
            index,
            1
        );

        saveUsers(
            users
        );

        const sessions =
            getSessions()
                .filter(
                    session =>
                        session.userId !==
                        target.id
                );

        saveSessions(
            sessions
        );

        addAuditLog(
            req.user.id,
            "admin_user_delete",
            {
                targetUserId:
                    target.id
            }
        );

        res.json({

            success:
                true,

            message:
                "Kullanıcı silindi."
        });
    }
);

/* ================================================================
   76 — AUDIT LOG SYSTEM
================================================================ */

function addAuditLog(
    userId,
    action,
    metadata = {}
) {

    const logs =
        getAuditLogs();

    const entry = {

        id:
            createId(
                "audit"
            ),

        userId,

        action:
            cleanText(
                action,
                200
            ),

        metadata:
            isObject(
                metadata
            )
                ? metadata
                : {},

        createdAt:
            nowISO()
    };

    logs.push(
        entry
    );

    if (
        logs.length >
        5000
    ) {

        logs.splice(
            0,
            logs.length -
                5000
        );
    }

    saveAuditLogs(
        logs
    );

    return entry;
}

app.get(
    "/api/admin/audit",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            logs:
                getAuditLogs()
                    .slice(
                        -500
                    )
                    .reverse()
        });
    }
);

/* ================================================================
   77 — SECURITY EVENTS
================================================================ */

function addSecurityEvent(
    type,
    metadata = {}
) {

    const events =
        getSecurityEvents();

    const event = {

        id:
            createId(
                "sec"
            ),

        type:
            cleanText(
                type,
                100
            ),

        metadata:
            isObject(
                metadata
            )
                ? metadata
                : {},

        createdAt:
            nowISO()
    };

    events.push(
        event
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

    return event;
}

app.get(
    "/api/security/status",
    optionalAuth,
    (
        req,
        res
    ) => {

        const events =
            getSecurityEvents();

        res.json({

            success:
                true,

            security: {

                enabled:
                    true,

                helmet:
                    true,

                cors:
                    true,

                requestIds:
                    true,

                recentEvents:
                    events
                        .slice(
                            -20
                        )
                        .reverse()
            }
        });
    }
);

/* ================================================================
   78 — SETTINGS
================================================================ */

app.get(
    "/api/settings",
    optionalAuth,
    (
        req,
        res
    ) => {

        const settings =
            getSettings();

        res.json({

            success:
                true,

            settings: {

                maintenance:
                    settings.maintenance,

                allowRegistration:
                    settings.allowRegistration,

                allowGuest:
                    settings.allowGuest,

                defaultModel:
                    settings.defaultModel,

                defaultLanguage:
                    settings.defaultLanguage,

                timezone:
                    settings.timezone,

                maxUploadMB:
                    settings.maxUploadMB,

                maxMessageLength:
                    settings.maxMessageLength,

                enableMemory:
                    settings.enableMemory,

                enableResearch:
                    settings.enableResearch,

                enableCode:
                    settings.enableCode,

                enableImage:
                    settings.enableImage,

                enableVideo:
                    settings.enableVideo,

                enableSocket:
                    settings.enableSocket
            }
        });
    }
);

/* ================================================================
   79 — ADMIN SETTINGS UPDATE
================================================================ */

app.patch(
    "/api/settings",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const settings =
            getSettings();

        const allowedBoolean =
            [
                "maintenance",
                "allowRegistration",
                "allowGuest",
                "enableMemory",
                "enableResearch",
                "enableCode",
                "enableImage",
                "enableVideo",
                "enableSocket"
            ];

        for (
            const key
            of allowedBoolean
        ) {

            if (
                req.body[key] !==
                undefined
            ) {

                settings[key] =
                    Boolean(
                        req.body[key]
                    );
            }
        }

        if (
            req.body.defaultModel
        ) {

            settings.defaultModel =
                cleanText(
                    req.body.defaultModel,
                    100
                );
        }

        if (
            req.body.defaultLanguage
        ) {

            settings.defaultLanguage =
                cleanText(
                    req.body.defaultLanguage,
                    50
                );
        }

        if (
            req.body.maxUploadMB !==
            undefined
        ) {

            settings.maxUploadMB =
                clamp(
                    req.body.maxUploadMB,
                    1,
                    1000
                );
        }

        if (
            req.body.maxMessageLength !==
            undefined
        ) {

            settings.maxMessageLength =
                clamp(
                    req.body.maxMessageLength,
                    100,
                    1000000
                );
        }

        settings.updatedAt =
            nowISO();

        saveSettings(
            settings
        );

        addAuditLog(
            req.user.id,
            "settings_update",
            {
                changed:
                    Object.keys(
                        req.body || {}
                    )
            }
        );

        res.json({

            success:
                true,

            settings
        });
    }
);

/* ================================================================
   80 — NOTIFICATIONS
================================================================ */

function createNotification(
    userId,
    input = {}
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
            cleanText(
                input.title ||
                "TürkAI",
                200
            ),

        message:
            cleanText(
                input.message ||
                "",
                5000
            ),

        type:
            cleanText(
                input.type ||
                "info",
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
    optionalAuth,
    (
        req,
        res
    ) => {

        const notifications =
            getNotifications()
                .filter(
                    item =>
                        item.userId ===
                        req.user.id
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        new Date(
                            b.createdAt
                        ) -
                        new Date(
                            a.createdAt
                        )
                )
                .slice(
                    0,
                    100
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
    optionalAuth,
    (
        req,
        res
    ) => {

        const notifications =
            getNotifications();

        const index =
            notifications.findIndex(
                item =>
                    item.id ===
                    req.params.id &&
                    item.userId ===
                    req.user.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Bildirim bulunamadı."
                });
        }

        notifications[
            index
        ].read =
            true;

        saveNotifications(
            notifications
        );

        res.json({

            success:
                true,

            notification:
                notifications[
                    index
                ]
        });
    }
);

/* ================================================================
   81 — IMAGE JOB SYSTEM
================================================================ */

const IMAGE_JOBS =
    new Map();

function createImageJob(
    user,
    prompt
) {

    const job = {

        id:
            createId(
                "image"
            ),

        userId:
            user.id,

        prompt:
            cleanText(
                prompt,
                10000
            ),

        status:
            "queued",

        provider:
            "pending",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()
    };

    IMAGE_JOBS.set(
        job.id,
        job
    );

    return job;
}

app.post(
    "/api/generate/image",
    optionalAuth,
    (
        req,
        res
    ) => {

        if (
            !usageAvailable(
                req.user,
                "images"
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Günlük görsel üretim limitin doldu veya planın görsel üretimini desteklemiyor."
                });
        }

        const prompt =
            cleanText(
                req.body.prompt ||
                req.body.description,
                10000
            );

        if (
            !prompt
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Görsel açıklaması gerekli."
                });
        }

        incrementUsage(
            req.user.id,
            "images"
        );

        const job =
            createImageJob(
                req.user,
                prompt
            );

        /*
         * Gerçek görsel sağlayıcısı
         * PARÇA 3 tarafında genişletilebilir.
         *
         * Burada bilinçli olarak sahte
         * görsel URL'si üretilmez.
         */

        job.status =
            "queued";

        job.message =
            "Görsel üretim kuyruğuna alındı.";

        job.updatedAt =
            nowISO();

        IMAGE_JOBS.set(
            job.id,
            job
        );

        res.status(
            202
        ).json({

            success:
                true,

            job
        });
    }
);

/* ================================================================
   82 — VIDEO JOB SYSTEM
================================================================ */

const VIDEO_JOBS =
    new Map();

function createVideoJob(
    user,
    prompt
) {

    const job = {

        id:
            createId(
                "video"
            ),

        userId:
            user.id,

        prompt:
            cleanText(
                prompt,
                10000
            ),

        status:
            "queued",

        provider:
            "pending",

        createdAt:
            nowISO(),

        updatedAt:
            nowISO()
    };

    VIDEO_JOBS.set(
        job.id,
        job
    );

    return job;
}

app.post(
    "/api/generate/video",
    optionalAuth,
    (
        req,
        res
    ) => {

        if (
            !usageAvailable(
                req.user,
                "videos"
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Günlük video üretim limitin doldu veya planın video üretimini desteklemiyor."
                });
        }

        const prompt =
            cleanText(
                req.body.prompt ||
                req.body.description,
                10000
            );

        if (
            !prompt
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Video açıklaması gerekli."
                });
        }

        incrementUsage(
            req.user.id,
            "videos"
        );

        const job =
            createVideoJob(
                req.user,
                prompt
            );

        job.status =
            "queued";

        job.message =
            "Video üretim kuyruğuna alındı.";

        job.updatedAt =
            nowISO();

        VIDEO_JOBS.set(
            job.id,
            job
        );

        res.status(
            202
        ).json({

            success:
                true,

            job
        });
    }
);

/* ================================================================
   83 — GENERATION JOB STATUS
================================================================ */

app.get(
    "/api/generate/jobs",
    optionalAuth,
    (
        req,
        res
    ) => {

        const images =
            Array.from(
                IMAGE_JOBS.values()
            )
            .filter(
                job =>
                    job.userId ===
                    req.user.id
            );

        const videos =
            Array.from(
                VIDEO_JOBS.values()
            )
            .filter(
                job =>
                    job.userId ===
                    req.user.id
            );

        res.json({

            success:
                true,

            images,

            videos
        });
    }
);

/* ================================================================
   84 — AI MODEL ROUTE
================================================================ */

app.post(
    "/api/chat/model",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const text =
                cleanText(
                    req.body.message ||
                    req.body.prompt ||
                    req.body.text,
                    30000
                );

            if (
                !text
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        error:
                            "Mesaj gerekli."
                    });
            }

            if (
                !usageAvailable(
                    req.user,
                    "messages"
                )
            ) {

                return res
                    .status(403)
                    .json({
                        success:
                            false,

                        error:
                            "Günlük mesaj limitin doldu."
                    });
            }

            incrementUsage(
                req.user.id,
                "messages"
            );

            const history =
                Array.isArray(
                    req.body.history
                )
                    ? req.body.history
                    : [];

            const result =
                await callAI(
                    text,
                    history
                );

            res.json({

                success:
                    true,

                reply:
                    result.text,

                response:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model
            });

        } catch (
            error
        ) {

            incrementUsage(
                req.user.id,
                "errors"
            );

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

/* ================================================================
   85 — DOCUMENTATION API
================================================================ */

app.get(
    "/api/docs",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            application:
                APP_NAME,

            version:
                APP_VERSION,

            endpoints: {

                health:
                    "GET /api/health",

                status:
                    "GET /api/status",

                plans:
                    "GET /api/plans",

                me:
                    "GET /api/me",

                chat:
                    "POST /api/chat",

                chats:
                    "GET /api/chats",

                memory:
                    "GET /api/memory",

                research:
                    "POST /api/research",

                search:
                    "GET /api/search?q=...",

                upload:
                    "POST /api/upload",

                files:
                    "GET /api/files",

                projects:
                    "GET /api/projects",

                code:
                    "POST /api/code/analyze",

                image:
                    "POST /api/generate/image",

                video:
                    "POST /api/generate/video",

                usage:
                    "GET /api/usage",

                socket:
                    "GET /api/socket/status"
            }
        });
    }
);

/* ================================================================
   86 — DATABASE BACKUP
================================================================ */

function backupDatabase() {

    const timestamp =
        new Date()
            .toISOString()
            .replace(
                /[:.]/g,
                "-"
            );

    const target =
        path.join(
            BACKUP_DIR,
            `backup-${timestamp}`
        );

    ensureDirectory(
        target
    );

    for (
        const [
            key,
            filePath
        ]
        of Object.entries(
            DB_FILES
        )
    ) {

        try {

            if (
                fs.existsSync(
                    filePath
                )
            ) {

                fs.copyFileSync(
                    filePath,
                    path.join(
                        target,
                        `${key}.json`
                    )
                );
            }

        } catch (
            error
        ) {

            logError(
                "Backup file error",
                {
                    key,
                    error:
                        error.message
                }
            );
        }
    }

    return target;
}

/* ================================================================
   87 — TEMP CLEANUP
================================================================ */

function cleanupTemp() {

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
        1000 *
        60 *
        60 *
        24;

    for (
        const file
        of files
    ) {

        const fullPath =
            path.join(
                TEMP_DIR,
                file
            );

        try {

            const stat =
                fs.statSync(
                    fullPath
                );

            if (
                stat.mtimeMs <
                cutoff
            ) {

                fs.rmSync(
                    fullPath,
                    {
                        recursive:
                            true,
                        force:
                            true
                    }
                );
            }

        } catch (
            error
        ) {

            logWarn(
                "Temp cleanup error",
                {
                    file,
                    error:
                        error.message
                }
            );
        }
    }
}

/* ================================================================
   88 — SESSION CLEANUP
================================================================ */

function cleanupSessions() {

    const sessions =
        getSessions();

    const now =
        Date.now();

    const valid =
        sessions.filter(
            session => {

                if (
                    session.active ===
                    false
                ) {
                    return false;
                }

                if (
                    session.expiresAt &&
                    now >
                        new Date(
                            session.expiresAt
                        ).getTime()
                ) {

                    return false;
                }

                return true;
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
}

/* ================================================================
   89 — AUTO MEMORY IN CHAT
================================================================ */

function autoProcessChatMemory(
    user,
    text
) {

    try {

        const settings =
            getSettings();

        if (
            settings.enableMemory ===
            false
        ) {
            return null;
        }

        return processMemoryCandidate(
            user.id,
            text
        );

    } catch (
        error
    ) {

        logWarn(
            "Auto memory error",
            {
                error:
                    error.message
            }
        );

        return null;
    }
}

/* ================================================================
   90 — MEMORY TEST API
================================================================ */

app.post(
    "/api/memory/process",
    optionalAuth,
    (
        req,
        res
    ) => {

        const text =
            cleanText(
                req.body.text ||
                req.body.message,
                10000
            );

        if (
            !text
        ) {

            return res
                .status(400)
                .json({
                    success:
                        false,

                    error:
                        "Metin gerekli."
                });
        }

        const memory =
            autoProcessChatMemory(
                req.user,
                text
            );

        res.json({

            success:
                true,

            saved:
                Boolean(
                    memory
                ),

            memory:
                memory || null
        });
    }
);

/* ================================================================
   91 — RATE LIMIT STORAGE
================================================================ */

function getRateLimits() {

    return readJSON(
        DB_FILES.rateLimits,
        {}
    );
}

function saveRateLimits(
    limits
) {

    return writeJSON(
        DB_FILES.rateLimits,
        limits
    );
}

function rateLimitKey(
    req
) {

    const ip =
        req.ip ||
        "unknown";

    return hashText(
        ip
    ).slice(
        0,
        32
    );
}

function checkRateLimit(
    req,
    options = {}
) {

    const windowMs =
        safeNumber(
            options.windowMs,
            60 * 1000
        );

    const max =
        safeNumber(
            options.max,
            60
        );

    const limits =
        getRateLimits();

    const key =
        rateLimitKey(
            req
        );

    const now =
        Date.now();

    const item =
        limits[key];

    if (
        !item ||
        now -
            item.startedAt >
            windowMs
    ) {

        limits[key] = {

            startedAt:
                now,

            count:
                1
        };

        saveRateLimits(
            limits
        );

        return {

            allowed:
                true,

            remaining:
                max - 1
        };
    }

    item.count =
        safeNumber(
            item.count
        ) + 1;

    saveRateLimits(
        limits
    );

    return {

        allowed:
            item.count <=
            max,

        remaining:
            Math.max(
                0,
                max -
                    item.count
            )
    };
}

/* ================================================================
   92 — RATE LIMIT MIDDLEWARE
================================================================ */

function publicRateLimit(
    req,
    res,
    next
) {

    const result =
        checkRateLimit(
            req,
            {
                windowMs:
                    60 * 1000,

                max:
                    120
            }
        );

    res.setHeader(
        "X-RateLimit-Remaining",
        String(
            result.remaining
        )
    );

    if (
        !result.allowed
    ) {

        addSecurityEvent(
            "rate_limit",
            {
                ip:
                    req.ip,

                path:
                    req.path
            }
        );

        return res
            .status(429)
            .json({
                success:
                    false,

                error:
                    "Çok fazla istek gönderildi. Biraz bekle."
            });
    }

    next();
}

/* ================================================================
   93 — APPLY RATE LIMIT TO API
================================================================ */

app.use(
    "/api",
    publicRateLimit
);

/* ================================================================
   94 — HEALTH OF DATABASE
================================================================ */

app.get(
    "/api/database/status",
    optionalAuth,
    (
        req,
        res
    ) => {

        const files = {};

        for (
            const [
                key,
                filePath
            ]
            of Object.entries(
                DB_FILES
            )
        ) {

            files[key] = {

                exists:
                    fs.existsSync(
                        filePath
                    ),

                size:
                    fs.existsSync(
                        filePath
                    )
                        ? fs.statSync(
                            filePath
                        ).size
                        : 0
            };
        }

        res.json({

            success:
                true,

            database:
                files
        });
    }
);

/* ================================================================
   95 — SERVER METRICS
================================================================ */

app.get(
    "/api/metrics",
    optionalAuth,
    requireAdmin,
    (
        req,
        res
    ) => {

        const memory =
            process.memoryUsage();

        const cpu =
            process.cpuUsage();

        res.json({

            success:
                true,

            uptime:
                process.uptime(),

            memory,

            cpu,

            connections:
                SERVER_STATE
                    .connections,

            activeUsers:
                SERVER_STATE
                    .activeUsers,

            activeRooms:
                SERVER_STATE
                    .activeRooms,

            imageJobs:
                IMAGE_JOBS.size,

            videoJobs:
                VIDEO_JOBS.size,

            timestamp:
                nowISO()
        });
    }
);

/* ================================================================
   96 — API TEST
================================================================ */

app.get(
    "/api/test",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "TürkAI API çalışıyor.",

            server:
                APP_NAME,

            version:
                APP_VERSION,

            timestamp:
                nowISO(),

            requestId:
                req.requestId
        });
    }
);

/* ================================================================
   97 — PAYMENT RECORD API
================================================================ */

app.get(
    "/api/payments",
    optionalAuth,
    (
        req,
        res
    ) => {

        const payments =
            getPayments()
                .filter(
                    payment =>
                        payment.userId ===
                        req.user.id
                )
                .reverse();

        res.json({

            success:
                true,

            payments
        });
    }
);

/* ================================================================
   98 — CHAT MESSAGE HISTORY API
================================================================ */

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
                .json({
                    success:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        if (
            chat.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Yetkiniz yok."
                });
        }

        const limit =
            clamp(
                req.query.limit ||
                100,
                1,
                500
            );

        res.json({

            success:
                true,

            chatId:
                chat.id,

            messages:
                getChatMessages(
                    chat.id,
                    limit
                )
        });
    }
);

/* ================================================================
   99 — CHAT TITLE UPDATE
================================================================ */

app.patch(
    "/api/chats/:id",
    optionalAuth,
    (
        req,
        res
    ) => {

        const chats =
            getChats();

        const index =
            chats.findIndex(
                chat =>
                    chat.id ===
                    req.params.id
            );

        if (
            index < 0
        ) {

            return res
                .status(404)
                .json({
                    success:
                        false,

                    error:
                        "Sohbet bulunamadı."
                });
        }

        const chat =
            chats[
                index
            ];

        if (
            chat.userId !==
            req.user.id &&
            !isAdminUser(
                req.user
            )
        ) {

            return res
                .status(403)
                .json({
                    success:
                        false,

                    error:
                        "Yetkiniz yok."
                });
        }

        if (
            req.body.title !==
            undefined
        ) {

            chat.title =
                cleanText(
                    req.body.title,
                    200
                );
        }

        if (
            req.body.pinned !==
            undefined
        ) {

            chat.pinned =
                Boolean(
                    req.body.pinned
                );
        }

        if (
            req.body.archived !==
            undefined
        ) {

            chat.archived =
                Boolean(
                    req.body.archived
                );
        }

        chat.updatedAt =
            nowISO();

        chats[
            index
        ] =
            chat;

        saveChats(
            chats
        );

        res.json({

            success:
                true,

            chat
        });
    }
);

/* ================================================================
   100 — AI HEALTH TEST
================================================================ */

app.get(
    "/api/ai/test",
    optionalAuth,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await callAI(
                    "Kısaca TürkAI çalışıyor mu?",
                    []
                );

            res.json({

                success:
                    true,

                reply:
                    result.text,

                provider:
                    result.provider,

                model:
                    result.model
            });

        } catch (
            error
        ) {

            res.status(
                500
            ).json({

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

/* ================================================================
   101 — AUTO BACKUP / CLEANUP SCHEDULER
================================================================ */

const BACKUP_INTERVAL =
    setInterval(
        () => {

            try {

                backupDatabase();

                logInfo(
                    "Otomatik database backup tamamlandı."
                );

            } catch (
                error
            ) {

                logError(
                    "Automatic backup error",
                    {
                        error:
                            error.message
                    }
                );
            }

        },
        1000 *
        60 *
        60 *
        6
    );

if (
    BACKUP_INTERVAL &&
    typeof BACKUP_INTERVAL.unref ===
        "function"
) {

    BACKUP_INTERVAL.unref();
}

const TEMP_CLEANUP_INTERVAL =
    setInterval(
        () => {

            try {

                cleanupTemp();

            } catch (
                error
            ) {

                logError(
                    "Temp cleanup scheduler error",
                    {
                        error:
                            error.message
                    }
                );
            }

        },
        1000 *
        60 *
        60
    );

if (
    TEMP_CLEANUP_INTERVAL &&
    typeof TEMP_CLEANUP_INTERVAL.unref ===
        "function"
) {

    TEMP_CLEANUP_INTERVAL.unref();
}

const SESSION_CLEANUP_INTERVAL =
    setInterval(
        () => {

            try {

                cleanupSessions();

            } catch (
                error
            ) {

                logError(
                    "Session cleanup scheduler error",
                    {
                        error:
                            error.message
                    }
                );
            }

        },
        1000 *
        60 *
        30
    );

if (
    SESSION_CLEANUP_INTERVAL &&
    typeof SESSION_CLEANUP_INTERVAL.unref ===
        "function"
) {

    SESSION_CLEANUP_INTERVAL.unref();
}

/* ================================================================
   102 — FINAL DATABASE INITIALIZATION CHECK
================================================================ */

function verifyDatabase() {

    const missing = [];

    for (
        const [
            key,
            filePath
        ]
        of Object.entries(
            DB_FILES
        )
    ) {

        if (
            !fs.existsSync(
                filePath
            )
        ) {

            missing.push(
                key
            );
        }
    }

    if (
        missing.length
    ) {

        logWarn(
            "Eksik database dosyaları bulundu.",
            {
                missing
            }
        );

        return false;
    }

    return true;
}

verifyDatabase();

/* ================================================================
   PARÇA 2 SONU
================================================================ */

/*
   ŞİMDİ BURADA DUR.

   PARÇA 3 bunun hemen altına gelecek.

   PARÇA 3'te:

   - static frontend
   - / route
   - SPA fallback
   - 404
   - global error handler
   - server startup
   - Render uyumluluğu
   - graceful shutdown
   - SIGINT / SIGTERM
   - uncaughtException
   - unhandledRejection
   - module.exports
   - startServer()

   gelecek.

   ÖNEMLİ:
   Burada startServer() ÇAĞIRMA.
*/
/* ================================================================
   TÜRKAI SERVER 13.0
   PARÇA 3 / 3
   RENDER • GITHUB • SOCKET.IO • FRONTEND • STARTUP • SHUTDOWN
================================================================ */

"use strict";

/* ================================================================
   103 — SERVER RUNTIME STATE
================================================================ */

const SERVER_STATE =
    global.__TURKAI_SERVER_STATE ||
    {

        startedAt:
            Date.now(),

        connections:
            0,

        activeUsers:
            0,

        activeRooms:
            0,

        requests:
            0,

        errors:
            0,

        lastRequestAt:
            null,

        lastErrorAt:
            null,

        lastError:
            null,

        shuttingDown:
            false
    };

global.__TURKAI_SERVER_STATE =
    SERVER_STATE;

/* ================================================================
   104 — SOCKET USER MAPS
================================================================ */

const connectedUsers =
    global.__TURKAI_CONNECTED_USERS ||
    new Map();

const connectedSockets =
    global.__TURKAI_CONNECTED_SOCKETS ||
    new Map();

const activeChatRooms =
    global.__TURKAI_CHAT_ROOMS ||
    new Map();

global.__TURKAI_CONNECTED_USERS =
    connectedUsers;

global.__TURKAI_CONNECTED_SOCKETS =
    connectedSockets;

global.__TURKAI_CHAT_ROOMS =
    activeChatRooms;

/* ================================================================
   105 — SERVER INSTANCE
================================================================ */

/*
 * SERVER_INSTANCE mutlaka burada,
 * startServer() fonksiyonundan ÖNCE
 * tanımlanır.
 *
 * Böylece:
 *
 * ReferenceError:
 * Cannot access 'SERVER_INSTANCE'
 * before initialization
 *
 * problemi oluşmaz.
 */

let SERVER_INSTANCE =
    global.__TURKAI_HTTP_SERVER ||
    null;

global.__TURKAI_HTTP_SERVER =
    SERVER_INSTANCE;

/* ================================================================
   106 — SERVER START INFORMATION
================================================================ */

const SERVER_BOOT_ID =
    createId(
        "boot"
    );

const SERVER_STARTED_AT =
    new Date();

const SERVER_RUNTIME_VERSION =
    process.version;

const SERVER_PLATFORM =
    process.platform;

const SERVER_ARCH =
    process.arch;

/* ================================================================
   107 — SOCKET AUTH HELPER
================================================================ */

function getSocketToken(
    socket
) {

    try {

        const auth =
            socket.handshake &&
            socket.handshake.auth
                ? socket.handshake.auth
                : {};

        const headers =
            socket.handshake &&
            socket.handshake.headers
                ? socket.handshake.headers
                : {};

        const query =
            socket.handshake &&
            socket.handshake.query
                ? socket.handshake.query
                : {};

        return (
            auth.token ||
            auth.accessToken ||
            auth.userToken ||
            headers.authorization ||
            query.token ||
            null
        );

    } catch (
        error
    ) {

        return null;
    }
}

/* ================================================================
   108 — SOCKET USER RESOLUTION
================================================================ */

function getSocketUser(
    socket
) {

    try {

        const auth =
            socket.handshake &&
            socket.handshake.auth
                ? socket.handshake.auth
                : {};

        const token =
            getSocketToken(
                socket
            );

        if (
            token
        ) {

            const cleanedToken =
                String(
                    token
                )
                .replace(
                    /^Bearer\s+/i,
                    ""
                )
                .trim();

            const session =
                getSessionByToken(
                    cleanedToken
                );

            if (
                session
            ) {

                const users =
                    getUsers();

                const user =
                    users.find(
                        item =>
                            item.id ===
                            session.userId
                    );

                if (
                    user
                ) {

                    return user;
                }
            }
        }

        const userId =
            auth.userId ||
            socket.handshake.query.userId;

        if (
            userId
        ) {

            const users =
                getUsers();

            const user =
                users.find(
                    item =>
                        item.id ===
                        String(
                            userId
                        )
                );

            if (
                user
            ) {

                return user;
            }
        }

        return getGuestUser();

    } catch (
        error
    ) {

        logWarn(
            "Socket user resolution failed",
            {
                error:
                    error.message
            }
        );

        return getGuestUser();
    }
}

/* ================================================================
   109 — SOCKET ROOM HELPERS
================================================================ */

function joinChatRoom(
    socket,
    chatId,
    user
) {

    const id =
        cleanText(
            chatId,
            200
        );

    if (
        !id
    ) {

        return false;
    }

    const room =
        `chat:${id}`;

    socket.join(
        room
    );

    if (
        !activeChatRooms.has(
            id
        )
    ) {

        activeChatRooms.set(
            id,
            new Set()
        );
    }

    const members =
        activeChatRooms.get(
            id
        );

    members.add(
        socket.id
    );

    SERVER_STATE.activeRooms =
        activeChatRooms.size;

    socket.data.chatId =
        id;

    socket.data.userId =
        user.id;

    socket.emit(
        "chat:joined",
        {
            chatId:
                id,

            room,

            members:
                members.size,

            timestamp:
                nowISO()
        }
    );

    socket.to(
        room
    ).emit(
        "chat:presence",
        {
            type:
                "join",

            chatId:
                id,

            userId:
                user.id,

            members:
                members.size,

            timestamp:
                nowISO()
        }
    );

    return true;
}

function leaveChatRoom(
    socket,
    chatId
) {

    const id =
        cleanText(
            chatId,
            200
        );

    if (
        !id
    ) {

        return false;
    }

    const room =
        `chat:${id}`;

    socket.leave(
        room
    );

    const members =
        activeChatRooms.get(
            id
        );

    if (
        members
    ) {

        members.delete(
            socket.id
        );

        if (
            members.size ===
            0
        ) {

            activeChatRooms.delete(
                id
            );
        }
    }

    SERVER_STATE.activeRooms =
        activeChatRooms.size;

    socket.to(
        room
    ).emit(
        "chat:presence",
        {
            type:
                "leave",

            chatId:
                id,

            userId:
                socket.data.userId ||
                null,

            members:
                members
                    ? members.size
                    : 0,

            timestamp:
                nowISO()
        }
    );

    if (
        socket.data.chatId ===
        id
    ) {

        socket.data.chatId =
            null;
    }

    return true;
}

/* ================================================================
   110 — SOCKET.IO CONNECTION
================================================================ */

io.on(
    "connection",
    (
        socket
    ) => {

        SERVER_STATE.connections++;

        SERVER_STATE.activeUsers =
            connectedUsers.size;

        const user =
            getSocketUser(
                socket
            );

        socket.data.userId =
            user.id;

        socket.data.user =
            user;

        connectedSockets.set(
            socket.id,
            socket
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
            .get(
                user.id
            )
            .add(
                socket.id
            );

        SERVER_STATE.activeUsers =
            connectedUsers.size;

        logInfo(
            "Socket bağlantısı",
            {
                socketId:
                    socket.id,

                userId:
                    user.id
            }
        );

        socket.emit(
            "turkai:ready",
            {

                success:
                    true,

                app:
                    APP_NAME,

                version:
                    APP_VERSION,

                socketId:
                    socket.id,

                userId:
                    user.id,

                timestamp:
                    nowISO()
            }
        );

        socket.on(
            "turkai:ping",
            (
                payload = {}
            ) => {

                socket.emit(
                    "turkai:pong",
                    {

                        success:
                            true,

                        received:
                            payload,

                        timestamp:
                            nowISO()
                    }
                );
            }
        );

        socket.on(
            "chat:join",
            (
                payload = {}
            ) => {

                try {

                    const chatId =
                        payload.chatId ||
                        payload.id;

                    if (
                        !chatId
                    ) {

                        return socket.emit(
                            "turkai:error",
                            {
                                error:
                                    "chatId gerekli."
                            }
                        );
                    }

                    joinChatRoom(
                        socket,
                        chatId,
                        user
                    );

                } catch (
                    error
                ) {

                    logError(
                        "chat:join error",
                        {
                            error:
                                error.message
                        }
                    );

                    socket.emit(
                        "turkai:error",
                        {
                            error:
                                "Sohbete katılırken hata oluştu."
                        }
                    );
                }
            }
        );

        socket.on(
            "chat:leave",
            (
                payload = {}
            ) => {

                try {

                    const chatId =
                        payload.chatId ||
                        payload.id ||
                        socket.data.chatId;

                    if (
                        chatId
                    ) {

                        leaveChatRoom(
                            socket,
                            chatId
                        );
                    }

                } catch (
                    error
                ) {

                    logWarn(
                        "chat:leave error",
                        {
                            error:
                                error.message
                        }
                    );
                }
            }
        );

        socket.on(
            "chat:typing",
            (
                payload = {}
            ) => {

                const chatId =
                    payload.chatId ||
                    socket.data.chatId;

                if (
                    !chatId
                ) {

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

                        typing:
                            Boolean(
                                payload.typing
                            ),

                        timestamp:
                            nowISO()
                    }
                );
            }
        );

        socket.on(
            "chat:presence",
            (
                payload = {}
            ) => {

                const chatId =
                    payload.chatId ||
                    socket.data.chatId;

                if (
                    !chatId
                ) {

                    return;
                }

                socket.to(
                    `chat:${chatId}`
                ).emit(
                    "chat:presence",
                    {

                        type:
                            payload.type ||
                            "update",

                        chatId,

                        userId:
                            user.id,

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

                try {

                    const chatId =
                        socket.data.chatId;

                    if (
                        chatId
                    ) {

                        leaveChatRoom(
                            socket,
                            chatId
                        );
                    }

                    const sockets =
                        connectedUsers.get(
                            user.id
                        );

                    if (
                        sockets
                    ) {

                        sockets.delete(
                            socket.id
                        );

                        if (
                            sockets.size ===
                            0
                        ) {

                            connectedUsers.delete(
                                user.id
                            );
                        }
                    }

                    connectedSockets.delete(
                        socket.id
                    );

                    SERVER_STATE.connections =
                        Math.max(
                            0,
                            SERVER_STATE.connections -
                            1
                        );

                    SERVER_STATE.activeUsers =
                        connectedUsers.size;

                    logInfo(
                        "Socket bağlantısı kapandı",
                        {
                            socketId:
                                socket.id,

                            userId:
                                user.id,

                            reason
                        }
                    );

                } catch (
                    error
                ) {

                    logError(
                        "Socket disconnect cleanup error",
                        {
                            error:
                                error.message
                        }
                    );
                }
            }
        );
    }
);

/* ================================================================
   111 — SOCKET STATUS API
================================================================ */

app.get(
    "/api/socket/status",
    optionalAuth,
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            socket: {

                enabled:
                    true,

                connected:
                    connectedSockets.size,

                users:
                    connectedUsers.size,

                rooms:
                    activeChatRooms.size,

                connections:
                    SERVER_STATE.connections
            }
        });
    }
);

/* ================================================================
   112 — SERVER INFO API
================================================================ */

app.get(
    "/api/server/info",
    (
        req,
        res
    ) => {

        const memory =
            process.memoryUsage();

        res.json({

            success:
                true,

            application: {

                name:
                    APP_NAME,

                version:
                    APP_VERSION,

                description:
                    APP_DESCRIPTION
            },

            server: {

                bootId:
                    SERVER_BOOT_ID,

                startedAt:
                    SERVER_STARTED_AT,

                uptime:
                    process.uptime(),

                node:
                    SERVER_RUNTIME_VERSION,

                platform:
                    SERVER_PLATFORM,

                architecture:
                    SERVER_ARCH,

                environment:
                    NODE_ENV
            },

            runtime: {

                memory,

                connections:
                    SERVER_STATE.connections,

                activeUsers:
                    SERVER_STATE.activeUsers,

                activeRooms:
                    SERVER_STATE.activeRooms,

                requests:
                    SERVER_STATE.requests,

                errors:
                    SERVER_STATE.errors
            },

            timestamp:
                nowISO()
        });
    }
);

/* ================================================================
   113 — REQUEST MONITOR
================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {

        SERVER_STATE.requests++;

        SERVER_STATE.lastRequestAt =
            nowISO();

        if (
            req.path.startsWith(
                "/api"
            )
        ) {

            res.setHeader(
                "X-TurkAI-Version",
                APP_VERSION
            );
        }

        next();
    }
);

/* ================================================================
   114 — MAINTENANCE GUARD
================================================================ */

app.use(
    (
        req,
        res,
        next
    ) => {

        if (
            !req.path.startsWith(
                "/api"
            )
        ) {

            return next();
        }

        if (
            req.path ===
            "/api/health"
        ) {

            return next();
        }

        if (
            req.path ===
            "/api/status"
        ) {

            return next();
        }

        const settings =
            getSettings();

        if (
            settings.maintenance !==
            true
        ) {

            return next();
        }

        if (
            req.path.startsWith(
                "/api/admin"
            )
        ) {

            return next();
        }

        res.status(
            503
        ).json({

            success:
                false,

            maintenance:
                true,

            error:
                "TürkAI şu anda bakım modunda."
        });
    }
);

/* ================================================================
   115 — ROOT API
================================================================ */

app.get(
    "/api",
    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            name:
                APP_NAME,

            version:
                APP_VERSION,

            description:
                APP_DESCRIPTION,

            status:
                "online",

            message:
                "TürkAI API aktif.",

            endpoints: {

                health:
                    "/api/health",

                status:
                    "/api/status",

                ai:
                    "/api/ai/status",

                chat:
                    "/api/chat",

                plans:
                    "/api/plans",

                memory:
                    "/api/memory",

                research:
                    "/api/research",

                upload:
                    "/api/upload",

                projects:
                    "/api/projects",

                socket:
                    "/api/socket/status"
            },

            timestamp:
                nowISO()
        });
    }
);

/* ================================================================
   116 — STATIC FRONTEND
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

/* ================================================================
   117 — FRONTEND HTML FALLBACK
================================================================ */

function getFrontendFile() {

    const candidates = [

        path.join(
            PUBLIC_DIR,
            "index.html"
        ),

        path.join(
            ROOT_DIR,
            "index.html"
        ),

        path.join(
            ROOT_DIR,
            "public",
            "index.htm"
        )
    ];

    for (
        const file
        of candidates
    ) {

        if (
            fs.existsSync(
                file
            )
        ) {

            return file;
        }
    }

    return null;
}

/* ================================================================
   118 — FRONTEND FALLBACK HTML
================================================================ */

function fallbackHTML() {

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME}</title>
<style>
*{
box-sizing:border-box;
}
html,body{
margin:0;
min-height:100%;
font-family:Inter,Arial,sans-serif;
background:#080b12;
color:#f5f7fb;
}
body{
display:flex;
align-items:center;
justify-content:center;
padding:24px;
}
.container{
width:min(720px,100%);
border:1px solid rgba(255,255,255,.1);
background:rgba(255,255,255,.045);
border-radius:24px;
padding:32px;
box-shadow:0 24px 80px rgba(0,0,0,.35);
}
.logo{
width:58px;
height:58px;
border-radius:18px;
display:grid;
place-items:center;
background:linear-gradient(135deg,#20c7d6,#7c5cff);
font-weight:900;
font-size:22px;
margin-bottom:20px;
}
h1{
margin:0 0 8px;
font-size:32px;
}
p{
color:#aeb6c5;
line-height:1.65;
}
.status{
display:flex;
align-items:center;
gap:10px;
margin-top:20px;
padding:14px 16px;
border-radius:14px;
background:rgba(32,199,214,.08);
border:1px solid rgba(32,199,214,.2);
}
.dot{
width:9px;
height:9px;
border-radius:50%;
background:#20c7d6;
box-shadow:0 0 16px #20c7d6;
}
a{
color:#20c7d6;
text-decoration:none;
}
</style>
</head>
<body>
<div class="container">
<div class="logo">T</div>
<h1>TürkAI</h1>
<p>
TürkAI sunucusu çalışıyor.
Frontend dosyanı <b>public/index.html</b>
içine koyduğunda uygulama otomatik olarak burada açılır.
</p>
<div class="status">
<span class="dot"></span>
<span>Sunucu çevrimiçi • ${APP_VERSION}</span>
</div>
<p>
API: <a href="/api">/api</a><br>
Health: <a href="/api/health">/api/health</a>
</p>
</div>
</body>
</html>`;
}

/* ================================================================
   119 — ROOT ROUTE
================================================================ */

app.get(
    "/",
    (
        req,
        res
    ) => {

        const frontend =
            getFrontendFile();

        if (
            frontend
        ) {

            return res.sendFile(
                frontend
            );
        }

        res
            .type(
                "html"
            )
            .send(
                fallbackHTML()
            );
    }
);

/* ================================================================
   120 — FAVICON SILENT RESPONSE
================================================================ */

app.get(
    "/favicon.ico",
    (
        req,
        res
    ) => {

        const favicon =
            path.join(
                PUBLIC_DIR,
                "favicon.ico"
            );

        if (
            fs.existsSync(
                favicon
            )
        ) {

            return res.sendFile(
                favicon
            );
        }

        res.status(
            204
        ).end();
    }
);

/* ================================================================
   121 — SPA FALLBACK
================================================================ */

/*
 * Express 5'te:
 *
 * app.get("*", ...)
 *
 * bazı sürümlerde
 * PathError üretebilir.
 *
 * Bu nedenle wildcard route
 * yerine middleware kullanıyoruz.
 */

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
            req.path.startsWith(
                "/api/"
            )
        ) {

            return next();
        }

        if (
            req.path ===
            "/api"
        ) {

            return next();
        }

        const frontend =
            getFrontendFile();

        if (
            frontend
        ) {

            return res.sendFile(
                frontend
            );
        }

        next();
    }
);

/* ================================================================
   122 — API 404
================================================================ */

app.use(
    "/api",
    (
        req,
        res
    ) => {

        res.status(
            404
        ).json({

            success:
                false,

            error:
                "API endpoint bulunamadı.",

            method:
                req.method,

            path:
                req.path,

            requestId:
                req.requestId,

            timestamp:
                nowISO()
        });
    }
);

/* ================================================================
   123 — GLOBAL 404
================================================================ */

app.use(
    (
        req,
        res
    ) => {

        const acceptsJSON =
            req.headers.accept &&
            req.headers.accept.includes(
                "application/json"
            );

        if (
            acceptsJSON
        ) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    error:
                        "Sayfa bulunamadı.",

                    path:
                        req.path,

                    requestId:
                        req.requestId
                });
        }

        res.status(
            404
        )
        .type(
            "html"
        )
        .send(
            `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 • TürkAI</title>
<style>
body{
margin:0;
min-height:100vh;
display:grid;
place-items:center;
background:#080b12;
color:#fff;
font-family:Arial,sans-serif;
padding:20px;
}
.box{
text-align:center;
padding:35px;
border:1px solid #252b38;
border-radius:24px;
background:#11151e;
max-width:520px;
}
h1{
font-size:72px;
margin:0;
}
p{
color:#9ca6b7;
line-height:1.6;
}
a{
color:#20c7d6;
text-decoration:none;
}
</style>
</head>
<body>
<div class="box">
<h1>404</h1>
<h2>Sayfa bulunamadı</h2>
<p>
Aradığın adres TürkAI sunucusunda mevcut değil.
</p>
<a href="/">TürkAI ana sayfasına dön</a>
</div>
</body>
</html>`
        );
    }
);

/* ================================================================
   124 — GLOBAL ERROR HANDLER
================================================================ */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        SERVER_STATE.errors++;

        SERVER_STATE.lastErrorAt =
            nowISO();

        SERVER_STATE.lastError =
            error.message ||
            String(
                error
            );

        logError(
            "Global server error",
            {

                requestId:
                    req.requestId,

                method:
                    req.method,

                path:
                    req.path,

                error:
                    error.message,

                stack:
                    IS_PRODUCTION
                        ? undefined
                        : error.stack
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
            clamp(
                error.status ||
                error.statusCode ||
                500,
                400,
                599
            );

        res.status(
            status
        ).json({

            success:
                false,

            error:
                IS_PRODUCTION
                    ? "Sunucu hatası oluştu."
                    : (
                        error.message ||
                        "Sunucu hatası."
                    ),

            requestId:
                req.requestId,

            timestamp:
                nowISO()
        });
    }
);

/* ================================================================
   125 — STARTUP BANNER
================================================================ */

function printStartupBanner() {

    const line =
        "═".repeat(
            64
        );

    console.log("");
    console.log(
        line
    );
    console.log(
        "                 TÜRKAI SERVER"
    );
    console.log(
        line
    );
    console.log(
        `  Uygulama      : ${APP_NAME}`
    );
    console.log(
        `  Sürüm         : ${APP_VERSION}`
    );
    console.log(
        `  Ortam         : ${NODE_ENV}`
    );
    console.log(
        `  Node.js       : ${process.version}`
    );
    console.log(
        `  Platform      : ${process.platform}`
    );
    console.log(
        `  Mimari        : ${process.arch}`
    );
    console.log(
        `  Host          : ${HOST}`
    );
    console.log(
        `  Port          : ${PORT}`
    );
    console.log(
        `  Server ID     : ${SERVER_ID}`
    );
    console.log(
        `  Boot ID       : ${SERVER_BOOT_ID}`
    );
    console.log(
        `  Socket.IO     : AKTİF`
    );
    console.log(
        `  API           : AKTİF`
    );
    console.log(
        `  Frontend      : ${
            getFrontendFile()
                ? "BULUNDU"
                : "FALLBACK"
        }`
    );
    console.log(
        `  AI Groq       : ${
            process.env.GROQ_API_KEY
                ? "HAZIR"
                : "YOK"
        }`
    );
    console.log(
        `  AI Cerebras   : ${
            process.env.CEREBRAS_API_KEY
                ? "HAZIR"
                : "YOK"
        }`
    );
    console.log(
        `  AI OpenRouter : ${
            process.env.OPENROUTER_API_KEY
                ? "HAZIR"
                : "YOK"
        }`
    );
    console.log(
        `  AI Gemini     : ${
            process.env.GEMINI_API_KEY
                ? "HAZIR"
                : "YOK"
        }`);
    console.log(
        line
    );
    console.log(
        `  Local URL     : http://localhost:${PORT}`
    );
    console.log(
        `  Health        : http://localhost:${PORT}/api/health`
    );
    console.log(
        `  API           : http://localhost:${PORT}/api`
    );
    console.log(
        line
    );
    console.log("");
}

/* ================================================================
   126 — START SERVER
================================================================ */

async function startServer() {

    if (
        SERVER_INSTANCE
    ) {

        logWarn(
            "Server zaten başlatılmış."
        );

        return SERVER_INSTANCE;
    }

    SERVER_STATE.shuttingDown =
        false;

    SERVER_STATE.startedAt =
        Date.now();

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let settled =
                false;

            const onError =
                (
                    error
                ) => {

                    if (
                        settled
                    ) {

                        return;
                    }

                    settled =
                        true;

                    logError(
                        "HTTP server startup error",
                        {
                            error:
                                error.message,

                            code:
                                error.code
                        }
                    );

                    SERVER_INSTANCE =
                        null;

                    global.__TURKAI_HTTP_SERVER =
                        null;

                    reject(
                        error
                    );
                };

            const server =
                httpServer;

            server.once(
                "error",
                onError
            );

            server.listen(
                PORT,
                HOST,
                () => {

                    if (
                        settled
                    ) {

                        return;
                    }

                    settled =
                        true;

                    server.removeListener(
                        "error",
                        onError
                    );

                    SERVER_INSTANCE =
                        server;

                    global.__TURKAI_HTTP_SERVER =
                        server;

                    SERVER_STATE.startedAt =
                        Date.now();

                    printStartupBanner();

                    logInfo(
                        "TürkAI server başarıyla başlatıldı.",
                        {

                            port:
                                PORT,

                            host:
                                HOST,

                            serverId:
                                SERVER_ID
                        }
                    );

                    resolve(
                        server
                    );
                }
            );
        }
    );
}

/* ================================================================
   127 — GRACEFUL SHUTDOWN
================================================================ */

let shutdownPromise =
    null;

async function shutdown(
    signal = "UNKNOWN"
) {

    if (
        shutdownPromise
    ) {

        return shutdownPromise;
    }

    shutdownPromise =
        (async () => {

            SERVER_STATE.shuttingDown =
                true;

            console.log("");

            console.log(
                `TürkAI kapanıyor... Signal: ${signal}`
            );

            logInfo(
                "Graceful shutdown başlatıldı.",
                {
                    signal
                }
            );

            try {

                for (
                    const socket
                    of connectedSockets.values()
                ) {

                    try {

                        socket.emit(
                            "turkai:shutdown",
                            {
                                message:
                                    "Sunucu kapanıyor.",

                                timestamp:
                                    nowISO()
                            }
                        );

                    } catch (
                        error
                    ) {

                        logWarn(
                            "Socket shutdown notification error",
                            {
                                error:
                                    error.message
                            }
                        );
                    }
                }

                connectedUsers.clear();

                activeChatRooms.clear();

                connectedSockets.clear();

                SERVER_STATE.activeUsers =
                    0;

                SERVER_STATE.activeRooms =
                    0;

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
                                    () => {

                                        finish();
                                    }
                                );

                                setTimeout(
                                    finish,
                                    5000
                                );

                            } catch (
                                error
                            ) {

                                logWarn(
                                    "HTTP close error",
                                    {
                                        error:
                                            error.message
                                    }
                                );

                                finish();
                            }
                        }
                    );
                }

                SERVER_INSTANCE =
                    null;

                global.__TURKAI_HTTP_SERVER =
                    null;

                console.log(
                    "TürkAI server güvenli şekilde kapatıldı."
                );

            } catch (
                error
            ) {

                logError(
                    "Shutdown error",
                    {
                        error:
                            error.message
                    }
                );

            } finally {

                shutdownPromise =
                    null;
            }
        })();

    return shutdownPromise;
}

/* ================================================================
   128 — PROCESS SIGNALS
================================================================ */

process.once(
    "SIGINT",
    async () => {

        await shutdown(
            "SIGINT"
        );

        process.exit(
            0
        );
    }
);

process.once(
    "SIGTERM",
    async () => {

        await shutdown(
            "SIGTERM"
        );

        process.exit(
            0
        );
    }
);

/* ================================================================
   129 — UNCAUGHT EXCEPTION
================================================================ */

process.on(
    "uncaughtException",
    async (
        error
    ) => {

        SERVER_STATE.errors++;

        SERVER_STATE.lastErrorAt =
            nowISO();

        SERVER_STATE.lastError =
            error.message;

        logError(
            "UNCAUGHT EXCEPTION",
            {

                error:
                    error.message,

                stack:
                    error.stack
            }
        );

        /*
         * Kritik exception durumunda
         * process'in sessizce bozulmasına
         * izin vermiyoruz.
         */

        if (
            IS_PRODUCTION
        ) {

            await shutdown(
                "uncaughtException"
            );

            process.exit(
                1
            );
        }
    }
);

/* ================================================================
   130 — UNHANDLED REJECTION
================================================================ */

process.on(
    "unhandledRejection",
    async (
        reason
    ) => {

        SERVER_STATE.errors++;

        SERVER_STATE.lastErrorAt =
            nowISO();

        SERVER_STATE.lastError =
            String(
                reason
            );

        logError(
            "UNHANDLED REJECTION",
            {

                error:
                    String(
                        reason
                    )
            }
        );

        if (
            IS_PRODUCTION
        ) {

            await shutdown(
                "unhandledRejection"
            );

            process.exit(
                1
            );
        }
    }
);

/* ================================================================
   131 — BEFORE EXIT
================================================================ */

process.on(
    "beforeExit",
    () => {

        logInfo(
            "Node beforeExit tetiklendi.",
            {
                uptime:
                    process.uptime()
            }
        );
    }
);

/* ================================================================
   132 — EXIT
================================================================ */

process.on(
    "exit",
    (
        code
    ) => {

        console.log(
            `TürkAI process kapandı. Kod: ${code}`
        );
    }
);

/* ================================================================
   133 — MODULE EXPORTS
================================================================ */

module.exports = {

    app,

    httpServer,

    io,

    startServer,

    shutdown,

    getServerState:
        () => ({
            ...SERVER_STATE
        }),

    getConnectedUsers:
        () =>
            connectedUsers,

    getConnectedSockets:
        () =>
            connectedSockets,

    getActiveChatRooms:
        () =>
            activeChatRooms,

    APP_NAME,

    APP_VERSION,

    PORT,

    HOST
};

/* ================================================================
   134 — START ONLY WHEN EXECUTED DIRECTLY
================================================================ */

/*
 * ÇOK ÖNEMLİ:
 *
 * require("./server")
 *
 * yapıldığında server otomatik başlamaz.
 *
 * Ama:
 *
 * node server.js
 *
 * çalıştırıldığında başlar.
 *
 * Bu yapı testleri ve Render'ı
 * daha düzgün hale getirir.
 */

if (
    require.main ===
    module
) {

    startServer()
        .catch(
            error => {

                logError(
                    "Server startup failed",
                    {

                        error:
                            error.message,

                        stack:
                            error.stack
                    }
                );

                process.exit(
                    1
                );
            }
        );
}

/* ================================================================
   TÜRKAI SERVER — PARÇA 3/3 SONU
================================================================ */
